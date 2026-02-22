import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/emailService.js';

/**
 * OTP Controller
 * Handles email OTP generation, storage, and verification
 * Uses in-memory storage (for development/testing)
 * In production, consider using Redis or database
 */

// In-memory OTP storage
const otpStore = new Map(); // key: email, value: { otpHash, expiresAt, purpose }

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

// Clean expired OTPs  every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// @desc    Send OTP to email
// @route   POST /api/otp/send-email
// @access  Public
export const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store hashed OTP
    otpStore.set(email.toLowerCase(), {
      otpHash,
      expiresAt,
      purpose: 'email_verification',
    });

    // Send OTP via email
    const emailResult = await sendEmail({
      to: email,
      subject: 'Email Verification - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
            <p style="color: #666; line-height: 1.6;">Your verification code is:</p>
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 13px;">If you didn't request this, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
      });
    }

    console.log(`[OTP] Sent to ${email}: ${otp}`); // Remove in production

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      ...(process.env.NODE_ENV === 'development' && { otp }), // Only in dev
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: error.message,
    });
  }
};

// @desc    Verify email OTP
// @route   POST /api/otp/verify-email
// @access  Public
export const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const emailLower = email.toLowerCase();
    const storedOtpData = otpStore.get(emailLower);

    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.',
      });
    }

    if (storedOtpData.expiresAt < Date.now()) {
      otpStore.delete(emailLower);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    const isValid = await verifyOTP(otp, storedOtpData.otpHash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    // Don't delete OTP yet - wait for final submission
    // Just mark as verified
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.',
      error: error.message,
    });
  }
};

// @desc    Check if email is verified
// @route   GET /api/otp/check-verification/:email
// @access  Public
export const checkEmailVerification = async (req, res) => {
  try {
    const { email } = req.params;
    const emailLower = email.toLowerCase();
    const storedOtpData = otpStore.get(emailLower);

    // Email is considered verified if OTP exists and hasn't expired
    const isVerified = storedOtpData && storedOtpData.expiresAt > Date.now();

    return res.status(200).json({
      success: true,
      verified: !!isVerified,
    });
  } catch (error) {
    console.error('Check email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
      error: error.message,
    });
  }
};

// Helper function to clear verified OTP (called after successful signup)
export const clearOTP = (email) => {
  otpStore.delete(email.toLowerCase());
};
