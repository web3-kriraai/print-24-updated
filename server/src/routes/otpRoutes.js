import express from 'express';
import { sendEmailOTP, verifyEmailOTP, checkEmailVerification } from '../controllers/otpController.js';

const router = express.Router();

// Send OTP to email
router.post('/send-email', sendEmailOTP);

// Verify email OTP
router.post('/verify-email', verifyEmailOTP);

// Check if email is verified
router.get('/check-verification/:email', checkEmailVerification);

export default router;
