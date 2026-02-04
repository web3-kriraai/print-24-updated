import express from "express";
import {
  registerUser,
  loginUser,
  updateUserEmail,
  sendOtp,
  verifyOtpAndRegister,
  forgotPassword,
  verifyOtpForPasswordReset,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  sendOtpForMobileUpdate,
  sendEmailOtp,
  verifyEmailOtp,
  completeCustomerSignup,
  submitCorporateRequest,
  submitPrintPartnerRequest,
  getAllPrintPartnerRequests,
  approvePrintPartnerRequest,
  rejectPrintPartnerRequest,
  getAllCorporateRequests,
  approveCorporateRequest,
  rejectCorporateRequest
} from "../controllers/auth/authController.js";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", sendOtp);
router.post("/verify-otp-and-register", verifyOtpAndRegister);
router.put("/update-email", authMiddleware, updateUserEmail);

// Forgot password routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp-password-reset", verifyOtpForPasswordReset);
router.post("/reset-password", resetPassword);

// Profile routes
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateUserProfile);
router.post("/send-otp-mobile-update", authMiddleware, sendOtpForMobileUpdate);

// Test admin-only access
router.get("/admin-access", authMiddleware, requireAdmin, (req, res) => {
  res.status(200).json({ message: "Admin access granted." });
});

// Print Partner Request Routes
router.post("/submit-print-partner-request", upload.single("proofFile"), submitPrintPartnerRequest);
router.get("/print-partner-requests", authMiddleware, requireAdmin, getAllPrintPartnerRequests);
router.post("/print-partner-requests/:requestId/approve", authMiddleware, requireAdmin, approvePrintPartnerRequest);
router.post("/print-partner-requests/:requestId/reject", authMiddleware, requireAdmin, rejectPrintPartnerRequest);

// Corporate Request Routes
router.post("/submit-corporate-request", upload.single("proofFile"), submitCorporateRequest);
router.get("/corporate-requests", authMiddleware, requireAdmin, getAllCorporateRequests);
router.post("/corporate-requests/:requestId/approve", authMiddleware, requireAdmin, approveCorporateRequest);
router.post("/corporate-requests/:requestId/reject", authMiddleware, requireAdmin, rejectCorporateRequest);

// Email Verification Routes
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/complete-customer-signup", completeCustomerSignup);

export default router;
