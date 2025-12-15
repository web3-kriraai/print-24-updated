import Design from "../models/uploadModal.js";
import { User } from "../models/User.js";
import bcrypt from "bcrypt";

// Get all uploaded images/designs - Optimized for performance
export const getAllUploads = async (req, res) => {
  try {
    // Check if images should be included (default: false to avoid timeout)
    const includeImages = req.query.includeImages === 'true';
    const limit = parseInt(req.query.limit) || 50; // Limit results to prevent timeout
    const skip = parseInt(req.query.skip) || 0;

    // Build query - exclude image buffers by default to prevent timeout
    let query = Design.find();
    
    if (!includeImages) {
      // Exclude image data buffers to prevent timeout and reduce payload
      query = query.select('-frontImage.data -backImage.data');
    }
    
    // Use lean() for faster queries and to avoid Mongoose document issues
    // Add timeout and limit to prevent connection issues
    const uploads = await query
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .maxTimeMS(30000); // 30 second timeout

    // Convert buffer data to base64 for frontend display (only if images were included)
    const uploadsWithImages = uploads.map((upload) => {
      let frontImageBase64 = null;
      let backImageBase64 = null;

      // Only convert images if they were included in the query
      if (includeImages) {
        // Safely convert front image buffer to base64
        if (upload.frontImage && upload.frontImage.data) {
          try {
            let buffer;
            if (Buffer.isBuffer(upload.frontImage.data)) {
              buffer = upload.frontImage.data;
            } else if (typeof upload.frontImage.data === 'string') {
              // If it's already a base64 string, use it directly
              if (upload.frontImage.data.startsWith('data:')) {
                frontImageBase64 = upload.frontImage.data;
              } else {
                buffer = Buffer.from(upload.frontImage.data, 'base64');
              }
            } else if (upload.frontImage.data instanceof Uint8Array) {
              buffer = Buffer.from(upload.frontImage.data);
            } else if (upload.frontImage.data && typeof upload.frontImage.data === 'object') {
              // Handle Mongoose Buffer wrapper
              buffer = Buffer.from(upload.frontImage.data);
            } else {
              // Skip if data is not in a valid format
              frontImageBase64 = null;
            }
            
            if (!frontImageBase64 && buffer && Buffer.isBuffer(buffer)) {
              frontImageBase64 = `data:${upload.frontImage.contentType || "image/png"};base64,${buffer.toString("base64")}`;
            }
          } catch (err) {
            console.error("Error converting front image to base64:", err);
            console.error("Front image data type:", typeof upload.frontImage.data);
            frontImageBase64 = null;
          }
        }

        // Safely convert back image buffer to base64
        if (upload.backImage && upload.backImage.data) {
          try {
            let buffer;
            if (Buffer.isBuffer(upload.backImage.data)) {
              buffer = upload.backImage.data;
            } else if (typeof upload.backImage.data === 'string') {
              // If it's already a base64 string, use it directly
              if (upload.backImage.data.startsWith('data:')) {
                backImageBase64 = upload.backImage.data;
              } else {
                buffer = Buffer.from(upload.backImage.data, 'base64');
              }
            } else if (upload.backImage.data instanceof Uint8Array) {
              buffer = Buffer.from(upload.backImage.data);
            } else if (upload.backImage.data && typeof upload.backImage.data === 'object') {
              // Handle Mongoose Buffer wrapper
              buffer = Buffer.from(upload.backImage.data);
            } else {
              // Skip if data is not in a valid format
              backImageBase64 = null;
            }
            
            if (!backImageBase64 && buffer && Buffer.isBuffer(buffer)) {
              backImageBase64 = `data:${upload.backImage.contentType || "image/png"};base64,${buffer.toString("base64")}`;
            }
          } catch (err) {
            console.error("Error converting back image to base64:", err);
            console.error("Back image data type:", typeof upload.backImage.data);
            backImageBase64 = null;
          }
        }
      }

      return {
        _id: upload._id,
        user: upload.user || null,
        height: upload.height || 0,
        width: upload.width || 0,
        description: upload.description || "",
        safeArea: upload.safeArea || { top: 0, bottom: 0, left: 0, right: 0 },
        bleedArea: upload.bleedArea || { top: 0, bottom: 0, left: 0, right: 0 },
        frontImage: includeImages && frontImageBase64 && upload.frontImage
          ? {
              data: frontImageBase64,
              filename: upload.frontImage.filename || "front-image.jpg",
              size: upload.frontImage.size || 0,
              contentType: upload.frontImage.contentType || "image/png",
            }
          : upload.frontImage
          ? {
              // Return metadata only (no image data)
              filename: upload.frontImage.filename || "front-image.jpg",
              size: upload.frontImage.size || 0,
              contentType: upload.frontImage.contentType || "image/png",
              hasData: true, // Indicate that image data exists but wasn't loaded
            }
          : null,
        backImage: includeImages && backImageBase64 && upload.backImage
          ? {
              data: backImageBase64,
              filename: upload.backImage.filename || "back-image.jpg",
              size: upload.backImage.size || 0,
              contentType: upload.backImage.contentType || "image/png",
            }
          : upload.backImage
          ? {
              // Return metadata only (no image data)
              filename: upload.backImage.filename || "back-image.jpg",
              size: upload.backImage.size || 0,
              contentType: upload.backImage.contentType || "image/png",
              hasData: true, // Indicate that image data exists but wasn't loaded
            }
          : null,
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt,
      };
    });

    res.json({
      uploads: uploadsWithImages,
      limit,
      skip,
      hasMore: uploads.length === limit, // Indicate if there might be more results
    });
  } catch (err) {
    console.error("Error in getAllUploads:", err);
    console.error("Error stack:", err.stack);
    
    // Handle MongoDB timeout errors specifically
    if (err.name === 'MongoNetworkTimeoutError' || err.name === 'MongoServerSelectionError') {
      return res.status(503).json({ 
        error: "Database connection timeout. Please try again or use ?includeImages=false to load without images.",
        retry: true
      });
    }
    
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
};

// Get single uploaded image by ID - Optimized for performance
export const getUploadById = async (req, res) => {
  try {
    const upload = await Design.findById(req.params.id)
      .populate("user", "name email")
      .lean()
      .maxTimeMS(30000); // 30 second timeout

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    let frontImageBase64 = null;
    let backImageBase64 = null;

    // Safely convert front image buffer to base64
    if (upload.frontImage && upload.frontImage.data) {
      try {
        let buffer;
        if (Buffer.isBuffer(upload.frontImage.data)) {
          buffer = upload.frontImage.data;
        } else if (typeof upload.frontImage.data === 'string') {
          // If it's already a base64 string, use it directly
          if (upload.frontImage.data.startsWith('data:')) {
            frontImageBase64 = upload.frontImage.data;
          } else {
            buffer = Buffer.from(upload.frontImage.data, 'base64');
          }
        } else if (upload.frontImage.data instanceof Uint8Array) {
          buffer = Buffer.from(upload.frontImage.data);
        } else if (upload.frontImage.data && typeof upload.frontImage.data === 'object') {
          // Handle Mongoose Buffer wrapper
          buffer = Buffer.from(upload.frontImage.data);
        } else {
          // Skip if data is not in a valid format
          frontImageBase64 = null;
        }
        
        if (!frontImageBase64 && buffer && Buffer.isBuffer(buffer)) {
          frontImageBase64 = `data:${upload.frontImage.contentType || "image/png"};base64,${buffer.toString("base64")}`;
        }
      } catch (err) {
        console.error("Error converting front image to base64:", err);
        console.error("Front image data type:", typeof upload.frontImage.data);
        frontImageBase64 = null;
      }
    }

    // Safely convert back image buffer to base64
    if (upload.backImage && upload.backImage.data) {
      try {
        let buffer;
        if (Buffer.isBuffer(upload.backImage.data)) {
          buffer = upload.backImage.data;
        } else if (typeof upload.backImage.data === 'string') {
          // If it's already a base64 string, use it directly
          if (upload.backImage.data.startsWith('data:')) {
            backImageBase64 = upload.backImage.data;
          } else {
            buffer = Buffer.from(upload.backImage.data, 'base64');
          }
        } else if (upload.backImage.data instanceof Uint8Array) {
          buffer = Buffer.from(upload.backImage.data);
        } else if (upload.backImage.data && typeof upload.backImage.data === 'object') {
          // Handle Mongoose Buffer wrapper
          buffer = Buffer.from(upload.backImage.data);
        } else {
          // Skip if data is not in a valid format
          backImageBase64 = null;
        }
        
        if (!backImageBase64 && buffer && Buffer.isBuffer(buffer)) {
          backImageBase64 = `data:${upload.backImage.contentType || "image/png"};base64,${buffer.toString("base64")}`;
        }
      } catch (err) {
        console.error("Error converting back image to base64:", err);
        console.error("Back image data type:", typeof upload.backImage.data);
        backImageBase64 = null;
      }
    }

    res.json({
      _id: upload._id,
      user: upload.user || null,
      height: upload.height || 0,
      width: upload.width || 0,
      description: upload.description || "",
      safeArea: upload.safeArea || { top: 0, bottom: 0, left: 0, right: 0 },
      bleedArea: upload.bleedArea || { top: 0, bottom: 0, left: 0, right: 0 },
      frontImage: frontImageBase64 && upload.frontImage
        ? {
            data: frontImageBase64,
            filename: upload.frontImage.filename || "front-image.jpg",
            size: upload.frontImage.size || 0,
            contentType: upload.frontImage.contentType || "image/png",
          }
        : null,
      backImage: backImageBase64 && upload.backImage
        ? {
            data: backImageBase64,
            filename: upload.backImage.filename || "back-image.jpg",
            size: upload.backImage.size || 0,
            contentType: upload.backImage.contentType || "image/png",
          }
        : null,
      createdAt: upload.createdAt,
      updatedAt: upload.updatedAt,
    });
  } catch (err) {
    console.error("Error in getUploadById:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
};

// Create admin user
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, isEmployee } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create admin user
    const newAdmin = await User.create({
      name,
      email,
      password: hashed,
      role: "admin",
      isEmployee: isEmployee === true || isEmployee === "true",
    });

    return res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        isEmployee: newAdmin.isEmployee,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all employees (users with role = "emp")
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: "emp" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user role by username (name field)
export const updateUserRole = async (req, res) => {
  try {
    const { username, role } = req.body;

    if (!username || !role) {
      return res.status(400).json({
        success: false,
        message: "Username and role are required.",
      });
    }

    if (!["user", "admin", "emp"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either 'user', 'admin', or 'emp'.",
      });
    }

    const user = await User.findOne({ name: username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.role = role;
    await user.save();

    // Note: Department assignment is handled separately in the department management section
    // When creating/editing departments, operators (employees) can be assigned there

    return res.json({
      success: true,
      message: "User role updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete uploaded image/design
export const deleteUpload = async (req, res) => {
  try {
    const upload = await Design.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({
        success: false,
        error: "Upload not found",
      });
    }

    await Design.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Upload deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

