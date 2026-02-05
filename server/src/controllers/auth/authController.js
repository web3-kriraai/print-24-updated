import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../models/User.js";
import PrintPartnerRequest from "../../models/printPartnerRequestModal.js";
import cloudinary from "../../config/cloudinary.js";
import streamifier from "streamifier";

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

// FORGOT PASSWORD - Send OTP to mobile number
export const forgotPassword = async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    // Validate mobile number
    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

    // Check if user exists with this mobile number
    const user = await User.findOne({ mobileNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this mobile number.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store hashed OTP for password reset
    otpStore.set(mobileNumber, {
      otpHash,
      expiresAt,
      purpose: "password_reset",
      userId: user._id.toString(),
    });

    // Log OTP to console for testing
    console.log("=".repeat(50));
    console.log(`Password Reset OTP for ${mobileNumber}: ${otp}`);
    console.log(`Expires at: ${new Date(expiresAt).toLocaleString()}`);
    console.log("=".repeat(50));

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your mobile number.",
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

// VERIFY OTP FOR PASSWORD RESET
export const verifyOtpForPasswordReset = async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required.",
      });
    }

    // Get stored OTP data
    const storedOtpData = otpStore.get(mobileNumber);
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
      otpStore.delete(mobileNumber);
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

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { mobileNumber, otp, newPassword } = req.body;

    if (!mobileNumber || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Mobile number, OTP, and new password are required.",
      });
    }

    // Validate password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Get stored OTP data
    const storedOtpData = otpStore.get(mobileNumber);
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
      otpStore.delete(mobileNumber);
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
    const user = await User.findOne({ mobileNumber });
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
    otpStore.delete(mobileNumber);

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
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        countryCode: user.countryCode,
        role: user.role,
        userType: user.userType || "customer",
        // Print Partner specific fields
        businessName: user.businessName,
        ownerName: user.ownerName,
        whatsappNumber: user.whatsappNumber,
        gstNumber: user.gstNumber,
        fullBusinessAddress: user.fullBusinessAddress,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        proofFileUrl: user.proofFileUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
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
    // Extract just the digits for validation
    const mobileDigits = mobileNumber.replace(/\D/g, "");
    const whatsappDigits = whatsappNumber.replace(/\D/g, "");

    // Mobile number should be 10-15 digits (allowing for country codes)
    if (mobileDigits.length < 10 || mobileDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be between 10-15 digits.",
      });
    }

    // Extract the actual number (last 10 digits for India, or full number for other countries)
    let mobileNumberToStore = mobileNumber;
    // If it starts with a country code like +91, extract just the number part
    if (mobileNumber.startsWith("+")) {
      // For India (+91), extract the 10 digits after +91
      if (mobileNumber.startsWith("+91") && mobileDigits.length >= 12) {
        mobileNumberToStore = mobileDigits.slice(2); // Remove +91, keep the 10 digits
      } else {
        // For other countries, keep the full number with country code
        mobileNumberToStore = mobileNumber;
      }
    }

    // WhatsApp number validation
    if (whatsappDigits.length < 10 || whatsappDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "WhatsApp number must be between 10-15 digits.",
      });
    }

    // Extract the actual WhatsApp number
    let whatsappNumberToStore = whatsappNumber;
    // If it starts with a country code like +91, extract just the number part
    if (whatsappNumber.startsWith("+")) {
      // For India (+91), extract the 10 digits after +91
      if (whatsappNumber.startsWith("+91") && whatsappDigits.length >= 12) {
        whatsappNumberToStore = whatsappDigits.slice(2); // Remove +91, keep the 10 digits
      } else {
        // For other countries, keep the full number with country code
        whatsappNumberToStore = whatsappNumber;
      }
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

    // Check if email or mobile number already exists in User collection
    // Try both with and without country code
    const existingUser = await User.findOne({
      $or: [
        { email: emailAddress },
        { mobileNumber: mobileNumberToStore },
        { mobileNumber: `+91${mobileNumberToStore}` },
        { mobileNumber: mobileNumber },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or mobile number already registered. Please login or use different credentials.",
      });
    }

    // Check if GST number is provided and already exists in User collection
    if (gstNumber && gstNumber.trim()) {
      const existingGstUser = await User.findOne({ gstNumber: gstNumber.trim() });
      if (existingGstUser) {
        return res.status(409).json({
          success: false,
          message: "GST number already registered. Please use a different GST number or contact support.",
        });
      }

      // Also check in pending requests
      const existingGstRequest = await PrintPartnerRequest.findOne({
        gstNumber: gstNumber.trim(),
        status: { $in: ["pending", "approved"] },
      });
      if (existingGstRequest) {
        return res.status(409).json({
          success: false,
          message: "GST number already exists in a pending or approved request.",
        });
      }
    }

    // Check if there's already a pending request with same email or mobile
    const existingRequest = await PrintPartnerRequest.findOne({
      $or: [
        { emailAddress },
        { mobileNumber: mobileNumberToStore },
        { mobileNumber: mobileNumber },
      ],
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "A pending request already exists with this email or mobile number.",
      });
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

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create print partner request
    const printPartnerRequest = await PrintPartnerRequest.create({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      mobileNumber: mobileNumberToStore.trim(),
      whatsappNumber: whatsappNumberToStore.trim(),
      emailAddress: emailAddress.trim().toLowerCase(),
      password: hashedPassword,
      gstNumber: gstNumber ? gstNumber.trim() : "",
      fullBusinessAddress: fullBusinessAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      proofFileUrl,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Print partner request submitted successfully. Our team will review your application.",
      requestId: printPartnerRequest._id,
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
export const getAllPrintPartnerRequests = async (req, res) => {
  try {
    const { status } = req.query; // Optional filter by status

    const query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    const requests = await PrintPartnerRequest.find(query)
      .populate("approvedBy", "name email")
      .populate("userId", "name email mobileNumber")
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
export const approvePrintPartnerRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const adminId = req.user._id || req.user.id;

    const request = await PrintPartnerRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Print partner request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    // Check if email or mobile already exists in User collection
    const existingUser = await User.findOne({
      $or: [
        { email: request.emailAddress },
        { mobileNumber: request.mobileNumber },
        { mobileNumber: `+91${request.mobileNumber}` },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email or mobile number already exists.",
      });
    }

    // Use the password from the request (already hashed)
    if (!request.password) {
      return res.status(400).json({
        success: false,
        message: "Password not found in request. Please resubmit the form.",
      });
    }

    // Determine country code from mobile number
    let countryCode = "+91"; // Default
    if (request.mobileNumber.startsWith("+")) {
      // Extract country code if present
      const match = request.mobileNumber.match(/^(\+\d{1,3})/);
      if (match) {
        countryCode = match[1];
      }
    }

    // Create user account with stored password and userType
    const newUser = await User.create({
      name: request.ownerName,
      email: request.emailAddress,
      mobileNumber: request.mobileNumber,
      countryCode: countryCode,
      password: request.password, // Already hashed when stored in request
      role: "user",
      userType: "print partner", // Set user type as print partner
      // Print Partner specific fields
      businessName: request.businessName,
      ownerName: request.ownerName,
      whatsappNumber: request.whatsappNumber,
      gstNumber: request.gstNumber || null, // Store GST number if provided
      fullBusinessAddress: request.fullBusinessAddress,
      city: request.city,
      state: request.state,
      pincode: request.pincode,
      proofFileUrl: request.proofFileUrl,
    });

    // Update request status
    request.status = "approved";
    request.approvedBy = adminId;
    request.approvedAt = new Date();
    request.userId = newUser._id;
    await request.save();

    // TODO: Send email/SMS to user with login credentials
    // You can use the emailService here

    return res.status(200).json({
      success: true,
      message: "Print partner request approved successfully. User account created.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber,
        userType: newUser.userType,
      },
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
export const rejectPrintPartnerRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user._id || req.user.id;

    const request = await PrintPartnerRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Print partner request not found.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}.`,
      });
    }

    // Update request status
    request.status = "rejected";
    request.approvedBy = adminId;
    request.approvedAt = new Date();
    request.rejectionReason = rejectionReason || "Request rejected by admin";
    await request.save();

    // TODO: Send email/SMS to user about rejection

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