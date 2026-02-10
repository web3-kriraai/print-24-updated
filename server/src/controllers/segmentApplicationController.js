import SegmentApplication from "../models/SegmentApplication.js";
import UserSegment from "../models/UserSegment.js";
import SignupForm from "../models/SignupForm.js";
import { User } from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * Segment Application Controller
 * Handles application submissions and admin review
 */

// @desc    Get publicly visible segments with forms
// @route   GET /api/user-segments/public
// @access  Public
export const getPublicSegments = async (req, res) => {
  try {
    const segments = await UserSegment.find({
      isActive: true,
      isPubliclyVisible: true,
    })
      .populate("signupForm", "name description instructions")
      .sort({ priority: -1 });

    return res.status(200).json({
      success: true,
      segments,
    });
  } catch (error) {
    console.error("Get public segments error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get signup form for a specific segment
// @route   GET /api/user-segments/:code/form
// @access  Public
export const getSegmentForm = async (req, res) => {
  try {
    const segment = await UserSegment.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
    }).populate("signupForm");

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "User segment not found",
      });
    }

    if (!segment.signupForm) {
      return res.status(404).json({
        success: false,
        message: "No signup form assigned to this segment",
      });
    }

    return res.status(200).json({
      success: true,
      segment: {
        _id: segment._id,
        name: segment.name,
        code: segment.code,
        description: segment.description,
        icon: segment.icon,
        color: segment.color,
        requiresApproval: segment.requiresApproval,
      },
      form: segment.signupForm,
    });
  } catch (error) {
    console.error("Get segment form error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Helper function to upload file to Cloudinary
const uploadToCloudinary = (buffer, folder = "segment-applications") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// @desc    Submit segment application
// @route   POST /api/segment-applications
// @access  Public
export const submitApplication = async (req, res) => {
  try {
    const { userSegmentCode, email, formData } = req.body;

    if (!userSegmentCode || !email || !formData) {
      return res.status(400).json({
        success: false,
        message: "User segment code, email, and form data are required",
      });
    }

    // Find segment
    const segment = await UserSegment.findOne({
      code: userSegmentCode.toUpperCase(),
      isActive: true,
    }).populate("signupForm");

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "User segment not found",
      });
    }

    if (!segment.signupForm) {
      return res.status(400).json({
        success: false,
        message: "No signup form assigned to this segment",
      });
    }

    // Parse formData (it may be a JSON string)
    let parsedFormData;
    try {
      parsedFormData = typeof formData === 'string' ? JSON.parse(formData) : formData;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid form data format",
      });
    }

    // Extract password from form data
    const password = parsedFormData.password || parsedFormData.confirmPassword;
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required for signup",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already has an application for this segment
    const existingApplication = await SegmentApplication.findOne({
      email: email.toLowerCase(),
      userSegment: segment._id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: existingApplication.status === 'approved' 
          ? "You already have an approved application for this segment"
          : "You already have a pending application for this segment. Please wait for review.",
        application: existingApplication,
      });
    }

    // Handle file uploads
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, `segment-applications/${segment.code}`);
          uploadedFiles.push({
            fieldId: file.fieldname,
            fieldLabel: parsedFormData[file.fieldname + '_label'] || file.fieldname,
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
            fileSize: file.size,
            cloudinaryPublicId: result.public_id,
          });
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          return res.status(500).json({
            success: false,
            message: "Failed to upload file: " + file.originalname,
          });
        }
      }
    }

    // Convert formData to Map
    const formDataMap = new Map(Object.entries(parsedFormData));

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;
    let token;

    if (!user) {
      // Create new user account
      console.log(`🔐 Creating new user account for: ${email}`);
      console.log(`   - Password received (first 3 chars): ${password.substring(0, 3)}***`);
      console.log(`   - Password length: ${password.length}`);
      
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log(`   - Password hashed successfully`);
      console.log(`   - Hash starts with: ${hashedPassword.substring(0, 7)}`);
      
      // Extract name from form data (try different field names)
      const userName = parsedFormData.name || 
                      parsedFormData.fullName || 
                      parsedFormData.firstName && parsedFormData.lastName 
                        ? `${parsedFormData.firstName} ${parsedFormData.lastName}`.trim()
                        : email.split('@')[0];

      user = await User.create({
        name: userName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
        userType: segment.code.toLowerCase().replace('_', ' '),
        approvalStatus: segment.requiresApproval ? 'pending' : 'approved',
        userSegment: segment._id,
        isEmailVerified: true, // Mark as verified since they completed email OTP
      });

      isNewUser = true;

      // Generate JWT token for immediate login
      token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log(`✅ Created new user account for: ${email}`);
      console.log(`   - User ID: ${user._id}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Token generated for auto-login`);
    } else {
      console.log(`ℹ️  User already exists: ${email}`);
    }

    // Create application
    const application = await SegmentApplication.create({
      user: user._id,
      email: email.toLowerCase(),
      userSegment: segment._id,
      signupForm: segment.signupForm._id,
      formData: formDataMap,
      uploadedFiles,
      status: 'pending',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        submissionSource: 'web',
      },
    });

    // Increment form submission stats
    await segment.signupForm.incrementSubmissions();

    // Prepare response
    const response = {
      success: true,
      message: segment.requiresApproval
        ? "Application submitted successfully. You will be notified once it's reviewed."
        : "Application submitted successfully.",
      application: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        createdAt: application.createdAt,
      },
    };

    // Add token and user info for new users
    if (isNewUser && token) {
      response.token = token;
      response.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
      };
      response.message += " Your account has been created and you are now logged in.";
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error("Submit application error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get user's own applications
// @route   GET /api/segment-applications/my-applications
// @access  Private
export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const applications = await SegmentApplication.find({
      $or: [
        { user: userId },
        { email: user.email },
      ],
    })
      .populate("userSegment", "name code description icon color")
      .populate("signupForm", "name")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get my applications error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all applications (Admin)
// @route   GET /api/admin/segment-applications
// @access  Private/Admin
export const getAllApplications = async (req, res) => {
  try {
    const { status, segment, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (segment) query.userSegment = segment;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { applicationNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      SegmentApplication.find(query)
        .populate("userSegment", "name code description icon color")
        .populate("signupForm", "name")
        .populate("user", "name email")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SegmentApplication.countDocuments(query),
    ]);

    // Get stats
    const stats = await SegmentApplication.getStats();

    return res.status(200).json({
      success: true,
      applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
      stats,
    });
  } catch (error) {
    console.error("Get all applications error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get application by ID (Admin)
// @route   GET /api/admin/segment-applications/:id
// @access  Private/Admin
export const getApplicationById = async (req, res) => {
  try {
    const application = await SegmentApplication.findById(req.params.id)
      .populate("userSegment", "name code description icon color")
      .populate("signupForm")
      .populate("user", "name email mobileNumber")
      .populate("reviewedBy", "name email");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error("Get application by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Approve application (Admin)
// @route   POST /api/admin/segment-applications/:id/approve
// @access  Private/Admin
export const approveApplication = async (req, res) => {
  try {
    const application = await SegmentApplication.findById(req.params.id)
      .populate("userSegment")
      .populate("signupForm");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Application is already approved",
      });
    }

    const { notes } = req.body;
    const adminId = req.user._id || req.user.id;

    // Approve the application
    await application.approve(adminId, notes);

    // If user exists, update their segment
    if (application.user) {
      await User.findByIdAndUpdate(application.user, {
        userSegment: application.userSegment._id,
        approvalStatus: 'approved',
        segmentApplication: application._id,
      });
    }

    // Increment form approval stats
    if (application.signupForm) {
      await application.signupForm.incrementApprovals();
    }

    // TODO: Send email notification to applicant

    return res.status(200).json({
      success: true,
      message: "Application approved successfully",
      application,
    });
  } catch (error) {
    console.error("Approve application error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Reject application (Admin)
// @route   POST /api/admin/segment-applications/:id/reject
// @access  Private/Admin
export const rejectApplication = async (req, res) => {
  try {
    const application = await SegmentApplication.findById(req.params.id)
      .populate("signupForm");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: "Application is already rejected",
      });
    }

    const { reason, notes } = req.body;
    const adminId = req.user._id || req.user.id;

    // Reject the application
    await application.reject(adminId, reason, notes);

    // If user exists, update their approval status
    if (application.user) {
      await User.findByIdAndUpdate(application.user, {
        approvalStatus: 'rejected',
      });
    }

    // Increment form rejection stats
    if (application.signupForm) {
      await application.signupForm.incrementRejections();
    }

    // TODO: Send email notification to applicant

    return res.status(200).json({
      success: true,
      message: "Application rejected",
      application,
    });
  } catch (error) {
    console.error("Reject application error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get application statistics (Admin)
// @route   GET /api/admin/segment-applications/stats
// @access  Private/Admin
export const getApplicationStats = async (req, res) => {
  try {
    const { segment, dateFrom, dateTo } = req.query;

    // Build filters
    const filters = {};
    if (segment) filters.userSegment = segment;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    const stats = await SegmentApplication.getStats(filters);

    // Get stats by segment
    const bySegment = await SegmentApplication.aggregate([
      { $match: filters },
      {
        $lookup: {
          from: 'usersegments',
          localField: 'userSegment',
          foreignField: '_id',
          as: 'segment',
        },
      },
      { $unwind: '$segment' },
      {
        $group: {
          _id: '$segment.code',
          segmentName: { $first: '$segment.name' },
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        overall: stats,
        bySegment,
      },
    });
  } catch (error) {
    console.error("Get application stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
