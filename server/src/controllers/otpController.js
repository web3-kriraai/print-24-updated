import crypto from 'crypto';
import redis from '../config/redis.js';
import { sendEmail } from '../utils/emailService.js';

/**
 * OTP Controller
 * Handles email OTP generation, storage, and verification
 */

// Generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

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
    
    // Store OTP in Redis with 10-minute expiry
    const otpKey = `otp:email:${email}`;
    await redis.setEx(otpKey, 600, otp); // 600 seconds = 10 minutes

    // Send OTP via email using existing email service
    await sendEmail({
      to: email,
      subject: 'Email Verification - OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">Email Verification</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hello,</p>
            <p style="font-size: 16px; color: #333;">Your verification code is:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h2>
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Prints24. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log(`[OTP] Sent to ${email}: ${otp}`); // For development - remove in production

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
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

    // Get OTP from Redis
    const otpKey = `otp:email:${email}`;
    const storedOTP = await redis.get(otpKey);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    // Verify OTP
    if (storedOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
    }

    // OTP is valid - delete it from Redis
    await redis.del(otpKey);

    // Store verification status for 1 hour
    const verifiedKey = `email:verified:${email}`;
    await redis.setEx(verifiedKey, 3600, 'true'); // 1 hour

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

    const verifiedKey = `email:verified:${email}`;
    const isVerified = await redis.get(verifiedKey);

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
