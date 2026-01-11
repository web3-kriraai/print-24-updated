import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../models/User.js";
import PrintPartnerProfile from "../../models/PrintPartnerProfile.js";
import CorporateProfile from "../../models/CorporateProfile.js";
import UserSegment from "../../models/UserSegment.js";
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";
import { sendOtpEmail } from "../../utils/emailService.js";

// In-memory OTP storage (for development/testing)
// In production, use Redis or a database
const otpStore = new Map(); // key: mobileNumber, value: { otpHash, expiresAt, email, firstName, lastName, countryCode, password, purpose }

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP using bcrypt for security
const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

// Verify OTP
const verifyOTP = async (otp, hashedOtp) => {
  return await bcrypt.compare(otp, hashedOtp);
};

// Clean expired OTPs (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashed,
      role: "user",
      userType: "customer", // Default to customer for regular signup
    });

    // Create JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, mobileNumber, password } = req.body;

    // Validate fields
    if (!password) {
      return res.status(400).json({
        message: "Password is required.",
      });
    }

    if (!email && !mobileNumber) {
      return res.status(400).json({
        message: "Email or mobile number is required.",
      });
    }

    // Find user by email or mobile number
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (mobileNumber) {
      // Extract digits from mobile number to handle different formats
      const mobileDigits = mobileNumber.replace(/\D/g, "");

      // Try to find user with different mobile number formats
      // 1. Try exact match
      user = await User.findOne({ mobileNumber });

      // 2. If not found, try with country code variations
      if (!user) {
        // If input has country code, try without it
        if (mobileNumber.startsWith("+")) {
          // For India (+91), try without country code
          if (mobileNumber.startsWith("+91") && mobileDigits.length >= 12) {
            const numberWithoutCode = mobileDigits.slice(2); // Remove +91
            user = await User.findOne({ mobileNumber: numberWithoutCode });
          }
          // Also try with just the digits
          if (!user) {
            user = await User.findOne({ mobileNumber: mobileDigits });
          }
        } else {
          // If input doesn't have country code, try with country codes
          // Try with +91 prefix (India)
          user = await User.findOne({ mobileNumber: `+91${mobileNumber}` });
          // Try with just digits
          if (!user) {
            user = await User.findOne({ mobileNumber: mobileDigits });
          }
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // Log for debugging (remove in production or make it conditional)
      if (process.env.NODE_ENV === 'development') {
        console.log("Password comparison failed for user:", user.email || user.mobileNumber);
        console.log("User password hash exists:", !!user.password);
      }
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ message: "Server configuration error. Please contact administrator." });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        userType: user.userType || "customer", // Include userType in response
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// SEND OTP
export const sendOtp = async (req, res) => {
  try {
    const { mobileNumber, email } = req.body;

    // Validate fields
    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

    // Email is optional, but if provided, validate format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format.",
        });
      }
    }

    // Check if email is already registered (only if email is provided)
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered.",
        });
      }
    }

    // Check if mobile number is already registered
    const existingMobileUser = await User.findOne({ mobileNumber });
    if (existingMobileUser) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered. Please use a different number or login.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store hashed OTP (will be used during verification)
    otpStore.set(mobileNumber, {
      otpHash,
      expiresAt,
      email: email || null, // Email is optional
      purpose: "signup", // Purpose: signup, password_reset, mobile_update
    });

    // Log OTP to console for testing (remove in production)
    console.log("=".repeat(50));
    console.log(`OTP for ${mobileNumber}: ${otp}`);
    console.log(`Email: ${email}`);
    console.log(`Expires at: ${new Date(expiresAt).toLocaleString()}`);
    console.log("=".repeat(50));

    // In production, send OTP via SMS service (Twilio, AWS SNS, etc.)
    // Send OTP via email if email is provided
    if (email) {
      await sendOtpEmail(email, otp);
    }

    // For now, we'll just return success

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your mobile number.",
      // In development, you might want to return OTP for testing
      // Remove this in production!
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// VERIFY OTP AND REGISTER (Customer signup)
export const verifyOtpAndRegister = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      countryCode,
      mobileNumber,
      email,
      password,
      otp
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !countryCode || !mobileNumber || !password || !otp) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, country code, mobile number, password, and OTP are required.",
      });
    }

    // Email is optional, but if provided, validate format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format.",
        });
      }
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check if email is already registered (only if email is provided)
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered.",
        });
      }
    }

    // Check if mobile number is already registered
    const existingMobileUser = await User.findOne({ mobileNumber });
    if (existingMobileUser) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered. Please use a different number or login.",
      });
    }

    // Verify OTP
    const storedOtpData = otpStore.get(mobileNumber);
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
    }

    if (storedOtpData.expiresAt < Date.now()) {
      otpStore.delete(mobileNumber);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Verify OTP using bcrypt
    const isValidOtp = await verifyOTP(otp, storedOtpData.otpHash);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Validate email match only if email was provided during OTP request
    if (storedOtpData.email && email && storedOtpData.email !== email) {
      return res.status(400).json({
        success: false,
        message: "Email does not match the one used for OTP request.",
      });
    }

    // OTP verified, create user
    const hashed = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName}`;

    const newUser = await User.create({
      name: fullName,
      firstName,
      lastName,
      email,
      mobileNumber,
      countryCode,
      password: hashed,
      role: "user",
      userType: "customer", // Set user type as customer
    });

    // Delete OTP after successful registration
    otpStore.delete(mobileNumber);

    // Create JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful!",
      user: {
        id: newUser._id,
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Verify OTP and Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// UPDATE USER EMAIL
export const updateUserEmail = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; // From authMiddleware
    const { email } = req.body;

    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({
        success: false,
        message: "Email already registered.",
      });
    }

    // Update user email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.email = email.trim();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update email error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// FORGOT PASSWORD - SEND OTP (EMAIL-BASED)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email address.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store hashed OTP for password reset
    otpStore.set(email.trim().toLowerCase(), {
      otpHash,
      expiresAt,
      purpose: "password_reset",
    });

    // Send OTP via email
    const emailResult = await sendOtpEmail(email.trim(), otp);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    // Log OTP to console for testing
    console.log("=".repeat(50));
    console.log(`Password Reset OTP for ${email}: ${otp}`);
    console.log(`Expires at: ${new Date(expiresAt).toLocaleString()}`);
    console.log("=".repeat(50));

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email address.",
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// VERIFY OTP FOR PASSWORD RESET (EMAIL-BASED)
export const verifyOtpForPasswordReset = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Get stored OTP data
    const storedOtpData = otpStore.get(emailLower);
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
    }

    // Check purpose
    if (storedOtpData.purpose !== "password_reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP purpose.",
      });
    }

    // Check expiry
    if (storedOtpData.expiresAt < Date.now()) {
      otpStore.delete(emailLower);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Verify OTP
    const isValidOtp = await verifyOTP(otp, storedOtpData.otpHash);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // OTP verified - return success (don't delete OTP yet, need it for password reset)
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
    });
  } catch (error) {
    console.error("Verify OTP for password reset error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// RESET PASSWORD (EMAIL-BASED)
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required.",
      });
    }

    // Validate password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const emailLower = email.trim().toLowerCase();

    // Get stored OTP data
    const storedOtpData = otpStore.get(emailLower);
    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
    }

    // Check purpose
    if (storedOtpData.purpose !== "password_reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP purpose.",
      });
    }

    // Check expiry
    if (storedOtpData.expiresAt < Date.now()) {
      otpStore.delete(emailLower);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Verify OTP
    const isValidOtp = await verifyOTP(otp, storedOtpData.otpHash);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Find user
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Delete OTP after successful password reset
    otpStore.delete(emailLower);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId)
      .select("-password -emailOtp -emailOtpExpiresAt")
      .populate("userSegment", "name code description");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Base user data
    const userData = {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      countryCode: user.countryCode,
      role: user.role,
      userType: user.userType || "customer",
      signupIntent: user.signupIntent,
      approvalStatus: user.approvalStatus,
      isEmailVerified: user.isEmailVerified,
      userSegment: user.userSegment,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Fetch additional profile data based on userType
    console.log("[getUserProfile] User type:", user.userType, "User ID:", user._id);

    if (user.userType === "print partner") {
      const printPartnerProfile = await PrintPartnerProfile.findOne({ user: user._id });
      console.log("[getUserProfile] PrintPartnerProfile found:", printPartnerProfile ? "YES" : "NO");
      if (printPartnerProfile) {
        userData.profile = {
          businessName: printPartnerProfile.businessName,
          ownerName: printPartnerProfile.ownerName,
          mobileNumber: printPartnerProfile.mobileNumber,
          whatsappNumber: printPartnerProfile.whatsappNumber,
          email: printPartnerProfile.email,
          gstNumber: printPartnerProfile.gstNumber,
          address: printPartnerProfile.address,
          proofDocument: printPartnerProfile.proofDocument,
          verificationStatus: printPartnerProfile.verificationStatus,
          verifiedAt: printPartnerProfile.verifiedAt,
        };
      }
    } else if (user.userType === "corporate") {
      const corporateProfile = await CorporateProfile.findOne({ user: user._id });
      console.log("[getUserProfile] CorporateProfile found:", corporateProfile ? "YES" : "NO", corporateProfile);
      if (corporateProfile) {
        userData.profile = {
          organizationName: corporateProfile.organizationName,
          organizationType: corporateProfile.organizationType,
          authorizedPersonName: corporateProfile.authorizedPersonName,
          designation: corporateProfile.designation,
          mobileNumber: corporateProfile.mobileNumber,
          whatsappNumber: corporateProfile.whatsappNumber,
          officialEmail: corporateProfile.officialEmail,
          gstNumber: corporateProfile.gstNumber,
          address: corporateProfile.address,
          proofDocument: corporateProfile.proofDocument,
          verificationStatus: corporateProfile.verificationStatus,
          verifiedAt: corporateProfile.verifiedAt,
        };
      }
    }

    return res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { firstName, lastName, email, mobileNumber, countryCode, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // If mobile number is being changed, verify OTP
    if (mobileNumber && mobileNumber !== user.mobileNumber) {
      if (!otp) {
        return res.status(400).json({
          success: false,
          message: "OTP is required to change mobile number.",
        });
      }

      // Check if new mobile number already exists
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile && existingMobile._id.toString() !== userId) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already registered.",
        });
      }

      // Verify OTP for mobile update
      const storedOtpData = otpStore.get(mobileNumber);
      if (!storedOtpData) {
        return res.status(400).json({
          success: false,
          message: "OTP not found or expired. Please request a new OTP.",
        });
      }

      if (storedOtpData.purpose !== "mobile_update") {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP purpose.",
        });
      }

      if (storedOtpData.expiresAt < Date.now()) {
        otpStore.delete(mobileNumber);
        return res.status(400).json({
          success: false,
          message: "OTP has expired. Please request a new OTP.",
        });
      }

      const isValidOtp = await verifyOTP(otp, storedOtpData.otpHash);
      if (!isValidOtp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP. Please try again.",
        });
      }

      // Delete OTP after successful verification
      otpStore.delete(mobileNumber);
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) {
      // Check if email is already taken
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== userId) {
        return res.status(409).json({
          success: false,
          message: "Email already registered.",
        });
      }
      user.email = email;
    }
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (countryCode !== undefined) user.countryCode = countryCode;
    // Update name if firstName or lastName changed
    if (firstName || lastName) {
      user.name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.name;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        countryCode: user.countryCode,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// SEND OTP FOR MOBILE UPDATE
export const sendOtpForMobileUpdate = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

    // Check if mobile number already exists
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile && existingMobile._id.toString() !== userId) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store hashed OTP for mobile update
    otpStore.set(mobileNumber, {
      otpHash,
      expiresAt,
      purpose: "mobile_update",
      userId: userId.toString(),
    });

    // Log OTP to console for testing
    console.log("=".repeat(50));
    console.log(`Mobile Update OTP for ${mobileNumber}: ${otp}`);
    console.log(`User ID: ${userId}`);
    console.log(`Expires at: ${new Date(expiresAt).toLocaleString()}`);
    console.log("=".repeat(50));

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your mobile number.",
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error("Send OTP for mobile update error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// SUBMIT PRINT PARTNER REQUEST
export const submitPrintPartnerRequest = async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      mobileNumber,
      whatsappNumber,
      emailAddress,
      password,
      gstNumber,
      fullBusinessAddress,
      city,
      state,
      pincode,
    } = req.body;

    // Validate required fields
    if (!businessName || !ownerName || !mobileNumber || !whatsappNumber || !emailAddress || !password ||
      !fullBusinessAddress || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format.",
      });
    }

    // Validate mobile numbers (can include country code like +919876543210)
    const mobileDigits = mobileNumber.replace(/\D/g, "");
    const whatsappDigits = whatsappNumber.replace(/\D/g, "");

    if (mobileDigits.length < 10 || mobileDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be between 10-15 digits.",
      });
    }
    if (whatsappDigits.length < 10 || whatsappDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp number must be between 10-15 digits.",
      });
    }

    // Validate pincode (6 digits)
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be 6 digits.",
      });
    }

    // Check if proof file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Proof file (visiting card or shop photo) is required.",
      });
    }

    // Check if email already exists
    let existingUser = await User.findOne({ email: emailAddress.toLowerCase() });

    // If user exists and is fully registered (has password and is verified or approved), reject
    if (existingUser && existingUser.password && existingUser.password.length > 0 &&
      (existingUser.isEmailVerified || existingUser.approvalStatus === 'approved')) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login or use a different email.",
      });
    }

    // Check if mobile number already exists (and is a complete account, excluding current user)
    const mobileQuery = {
      mobileNumber: { $in: [mobileNumber.trim(), `+91${mobileNumber.trim()}`] },
      password: { $exists: true, $ne: '' }
    };
    if (existingUser) {
      mobileQuery._id = { $ne: existingUser._id };
    }
    const existingMobile = await User.findOne(mobileQuery);
    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered. Please use a different number.",
      });
    }

    // Check if GST number already exists (if provided)
    if (gstNumber && gstNumber.trim()) {
      const gstQuery = { gstNumber: gstNumber.trim() };
      if (existingUser) {
        gstQuery.user = { $ne: existingUser._id };
      }
      const existingGst = await PrintPartnerProfile.findOne(gstQuery);
      if (existingGst) {
        return res.status(409).json({
          success: false,
          message: "GST number already registered.",
        });
      }
    }

    // Upload proof file to Cloudinary
    let proofFileUrl = null;
    try {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "print-partner-proofs",
              resource_type: "image",
              transformation: [
                { quality: "auto" },
                { fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const uploadResult = await uploadStream();
      proofFileUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error("File upload error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload proof file. Please try again.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get PRINT_PARTNER segment (not RETAIL!)
    const printPartnerSegment = await UserSegment.findOne({ code: 'PRINT_PARTNER' });
    if (!printPartnerSegment) {
      return res.status(500).json({
        success: false,
        message: 'System configuration error: PRINT_PARTNER segment not found. Please contact support.',
      });
    }

    // Create or update user account
    let newUser;
    if (existingUser) {
      // Update the existing placeholder user using findByIdAndUpdate to avoid validation issues
      newUser = await User.findByIdAndUpdate(
        existingUser._id,
        {
          name: ownerName,
          mobileNumber: mobileNumber.trim(),
          password: hashedPassword,
          role: "user",
          userType: "print partner",
          userSegment: printPartnerSegment._id,
          approvalStatus: 'pending',
          signupIntent: 'PRINT_PARTNER',
          isEmailVerified: false,
        },
        { new: true, runValidators: false }
      );
    } else {
      // Create new user account
      newUser = await User.create({
        name: ownerName,
        email: emailAddress.toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        password: hashedPassword,
        role: "user",
        userType: "print partner",
        userSegment: printPartnerSegment._id,
        approvalStatus: 'pending',
        signupIntent: 'PRINT_PARTNER',
        isEmailVerified: false,
      });
    }

    // Create or update print partner profile
    await PrintPartnerProfile.findOneAndUpdate(
      { user: newUser._id },
      {
        user: newUser._id,
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        mobileNumber: mobileNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
        email: emailAddress.toLowerCase(),
        gstNumber: gstNumber ? gstNumber.trim() : null,
        address: {
          fullAddress: fullBusinessAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        proofDocument: proofFileUrl,
        verificationStatus: "PENDING",
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Print partner request submitted successfully. Our team will review your application.",
    });
  } catch (error) {
    console.error("Submit print partner request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// GET ALL PRINT PARTNER REQUESTS (Admin only)
// GET ALL PRINT PARTNER REQUESTS (Admin only)
// Now uses PrintPartnerProfile model with verificationStatus
export const getAllPrintPartnerRequests = async (req, res) => {
  try {
    const { status } = req.query; // Optional filter by status: PENDING, APPROVED, REJECTED

    const query = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status.toUpperCase())) {
      query.verificationStatus = status.toUpperCase();
    }

    const requests = await PrintPartnerProfile.find(query)
      .populate("user", "name email mobileNumber approvalStatus createdAt")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get all print partner requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// APPROVE PRINT PARTNER REQUEST (Admin only)
// Updates PrintPartnerProfile verificationStatus and User approvalStatus
export const approvePrintPartnerRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user._id || req.user.id;

    // Find the print partner profile
    const profile = await PrintPartnerProfile.findById(requestId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Print partner request not found.",
      });
    }

    if (profile.verificationStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${profile.verificationStatus.toLowerCase()}.`,
      });
    }

    // Update profile
    profile.verificationStatus = "APPROVED";
    profile.verifiedBy = adminId;
    profile.verifiedAt = new Date();
    await profile.save();

    // Update user approvalStatus
    await User.findByIdAndUpdate(profile.user, {
      approvalStatus: "approved",
    });

    // Get updated user info
    const user = await User.findById(profile.user).select("name email mobileNumber userType");

    return res.status(200).json({
      success: true,
      message: "Print partner request approved successfully.",
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        userType: user.userType,
      } : null,
    });
  } catch (error) {
    console.error("Approve print partner request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// REJECT PRINT PARTNER REQUEST (Admin only)
// Updates PrintPartnerProfile verificationStatus and User approvalStatus
export const rejectPrintPartnerRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user._id || req.user.id;

    // Find the print partner profile
    const profile = await PrintPartnerProfile.findById(requestId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Print partner request not found.",
      });
    }

    if (profile.verificationStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${profile.verificationStatus.toLowerCase()}.`,
      });
    }

    // Update profile
    profile.verificationStatus = "REJECTED";
    profile.verifiedBy = adminId;
    profile.verifiedAt = new Date();
    // Note: rejectionReason field removed from schema per user request
    await profile.save();

    // Update user approvalStatus
    await User.findByIdAndUpdate(profile.user, {
      approvalStatus: "rejected",
    });

    return res.status(200).json({
      success: true,
      message: "Print partner request rejected successfully.",
    });
  } catch (error) {
    console.error("Reject print partner request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ========================================
// CORPORATE REQUEST ADMIN ENDPOINTS
// ========================================

// GET ALL CORPORATE REQUESTS (Admin only)
export const getAllCorporateRequests = async (req, res) => {
  try {
    const { status } = req.query; // Optional filter by status: PENDING, APPROVED, REJECTED

    const query = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status.toUpperCase())) {
      query.verificationStatus = status.toUpperCase();
    }

    const requests = await CorporateProfile.find(query)
      .populate("user", "name email mobileNumber approvalStatus createdAt")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Get all corporate requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// APPROVE CORPORATE REQUEST (Admin only)
export const approveCorporateRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user._id || req.user.id;

    // Find the corporate profile
    const profile = await CorporateProfile.findById(requestId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Corporate request not found.",
      });
    }

    if (profile.verificationStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${profile.verificationStatus.toLowerCase()}.`,
      });
    }

    // Update profile
    profile.verificationStatus = "APPROVED";
    profile.verifiedBy = adminId;
    profile.verifiedAt = new Date();
    await profile.save();

    // Update user approvalStatus
    await User.findByIdAndUpdate(profile.user, {
      approvalStatus: "approved",
    });

    // Get updated user info
    const user = await User.findById(profile.user).select("name email mobileNumber userType");

    return res.status(200).json({
      success: true,
      message: "Corporate request approved successfully.",
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        userType: user.userType,
      } : null,
    });
  } catch (error) {
    console.error("Approve corporate request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// REJECT CORPORATE REQUEST (Admin only)
export const rejectCorporateRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user._id || req.user.id;

    // Find the corporate profile
    const profile = await CorporateProfile.findById(requestId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Corporate request not found.",
      });
    }

    if (profile.verificationStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${profile.verificationStatus.toLowerCase()}.`,
      });
    }

    // Update profile
    profile.verificationStatus = "REJECTED";
    profile.verifiedBy = adminId;
    profile.verifiedAt = new Date();
    await profile.save();

    // Update user approvalStatus
    await User.findByIdAndUpdate(profile.user, {
      approvalStatus: "rejected",
    });

    return res.status(200).json({
      success: true,
      message: "Corporate request rejected successfully.",
    });
  } catch (error) {
    console.error("Reject corporate request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// ========================================
// EMAIL VERIFICATION ENDPOINTS
// ========================================

// SEND EMAIL OTP
export const sendEmailOtp = async (req, res) => {
  try {
    const { email, signupIntent } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format.',
      });
    }

    const emailLower = email.trim().toLowerCase();
    let user = await User.findOne({ email: emailLower });

    // If user doesn't exist, create a placeholder user
    if (!user) {
      const retailSegment = await UserSegment.findOne({ code: 'RETAIL' });
      if (!retailSegment) {
        return res.status(500).json({
          success: false,
          message: 'System configuration error. Please contact support.',
        });
      }

      user = await User.create({
        email: emailLower,
        signupIntent: signupIntent || 'CUSTOMER',
        approvalStatus: 'pending',
        userSegment: retailSegment._id,
        isEmailVerified: false,
        password: '',
        role: 'user',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.emailOtp = otpHash;
    user.emailOtpExpiresAt = expiresAt;
    await user.save();

    const emailResult = await sendOtpEmail(email.trim(), otp);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('='.repeat(50));
      console.log(`Email OTP for ${email}: ${otp}`);
      console.log(`Expires at: ${expiresAt.toLocaleString()}`);
      console.log('='.repeat(50));
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email address.',
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// VERIFY EMAIL OTP
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.',
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits.',
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
    }

    if (!user.emailOtp || !user.emailOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.',
      });
    }

    if (user.emailOtpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    const isValid = await verifyOTP(otp.trim(), user.emailOtp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        approvalStatus: user.approvalStatus,
        signupIntent: user.signupIntent,
      },
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// COMPLETE CUSTOMER SIGNUP
export const completeCustomerSignup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please start signup process again.',
      });
    }

    // Skip email verification in development mode
    // if (!user.isEmailVerified) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Please verify your email first.',
    //   });
    // }

    if (user.password && user.password.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Account already completed. Please login.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isEmailVerified = true; // Auto-verify for development
    user.approvalStatus = 'approved'; // Auto-approve customers
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Account created successfully! You can now login.',
    });
  } catch (error) {
    console.error('Complete customer signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// SUBMIT CORPORATE REQUEST
export const submitCorporateRequest = async (req, res) => {
  try {
    const {
      organizationName,
      organizationType,
      authorizedPersonName,
      designation,
      mobileNumber,
      whatsappNumber,
      officialEmail,
      gstNumber,
      fullAddress,
      city,
      state,
      pincode,
      password,
    } = req.body;

    // Validate required fields
    if (!organizationName || !organizationType || !authorizedPersonName || !designation ||
      !mobileNumber || !officialEmail || !gstNumber || !fullAddress || !city || !state || !pincode || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(officialEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format.",
      });
    }

    // Validate pincode (6 digits)
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be 6 digits.",
      });
    }

    // Check if proof file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Proof document (Letterhead/PO/ID) is required.",
      });
    }

    // Check if email already exists
    let existingUser = await User.findOne({ email: officialEmail.toLowerCase() });

    // If user exists and is fully registered (has password and is verified or approved), reject
    if (existingUser && existingUser.password && existingUser.password.length > 0 &&
      (existingUser.isEmailVerified || existingUser.approvalStatus === 'approved')) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login or use a different email.",
      });
    }

    // Check if mobile number already exists (and is a complete account, excluding current user)
    const mobileQuery = {
      mobileNumber: { $in: [mobileNumber.trim(), `+91${mobileNumber.trim()}`] },
      password: { $exists: true, $ne: '' }
    };
    if (existingUser) {
      mobileQuery._id = { $ne: existingUser._id };
    }
    const existingMobile = await User.findOne(mobileQuery);
    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Mobile number already registered. Please use a different number.",
      });
    }

    // Check if GST number already exists (excluding current user if resubmitting)
    const gstQuery = { gstNumber: gstNumber.trim() };
    if (existingUser) {
      gstQuery.user = { $ne: existingUser._id };
    }
    const existingGst = await CorporateProfile.findOne(gstQuery);
    if (existingGst) {
      return res.status(409).json({
        success: false,
        message: "GST number already registered.",
      });
    }

    // Upload proof file to Cloudinary
    let proofFileUrl = null;
    try {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "corporate-proofs",
              resource_type: "image",
              transformation: [
                { quality: "auto" },
                { fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const uploadResult = await uploadStream();
      proofFileUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error("File upload error:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload proof file. Please try again.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get CORPORATE segment (not RETAIL!)
    const corporateSegment = await UserSegment.findOne({ code: 'CORPORATE' });
    if (!corporateSegment) {
      return res.status(500).json({
        success: false,
        message: 'System configuration error: CORPORATE segment not found. Please contact support.',
      });
    }

    // Create or update user account
    let newUser;
    if (existingUser) {
      // Update the existing placeholder user using findByIdAndUpdate to avoid validation issues
      newUser = await User.findByIdAndUpdate(
        existingUser._id,
        {
          name: authorizedPersonName,
          mobileNumber: mobileNumber.trim(),
          password: hashedPassword,
          role: "user",
          userType: "corporate",
          userSegment: corporateSegment._id,
          approvalStatus: 'pending',
          signupIntent: 'CORPORATE',
          isEmailVerified: false,
        },
        { new: true, runValidators: false }
      );
    } else {
      // Create new user account
      newUser = await User.create({
        name: authorizedPersonName,
        email: officialEmail.toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        password: hashedPassword,
        role: "user",
        userType: "corporate",
        userSegment: corporateSegment._id,
        approvalStatus: 'pending',
        signupIntent: 'CORPORATE',
        isEmailVerified: false,
      });
    }

    // Create or update corporate profile
    await CorporateProfile.findOneAndUpdate(
      { user: newUser._id },
      {
        user: newUser._id,
        organizationName: organizationName.trim(),
        organizationType,
        authorizedPersonName: authorizedPersonName.trim(),
        designation,
        mobileNumber: mobileNumber.trim(),
        whatsappNumber: whatsappNumber ? whatsappNumber.trim() : mobileNumber.trim(),
        officialEmail: officialEmail.toLowerCase(),
        gstNumber: gstNumber.trim(),
        address: {
          fullAddress: fullAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        proofDocument: proofFileUrl,
        verificationStatus: "PENDING",
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Corporate registration request submitted successfully. Our team will review your application.",
    });
  } catch (error) {
    console.error("Submit corporate request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
