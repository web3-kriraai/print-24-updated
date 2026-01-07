import express from "express";
<<<<<<< HEAD
import {
  registerUser,
  loginUser,
  updateUserEmail,
  sendOtp,
=======
import { 
  registerUser, 
  loginUser, 
  updateUserEmail, 
  sendOtp, 
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
  verifyOtpAndRegister,
  forgotPassword,
  verifyOtpForPasswordReset,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  sendOtpForMobileUpdate,
<<<<<<< HEAD
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
=======
  submitPrintPartnerRequest,
  getAllPrintPartnerRequests,
  approvePrintPartnerRequest,
  rejectPrintPartnerRequest
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
} from "../controllers/auth/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/roleMiddleware.js";
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
router.get("/admin-access", authMiddleware, adminAuth, (req, res) => {
  res.status(200).json({ message: "Admin access granted." });
});

// Print Partner Request Routes
router.post("/submit-print-partner-request", upload.single("proofFile"), submitPrintPartnerRequest);
router.get("/print-partner-requests", authMiddleware, adminAuth, getAllPrintPartnerRequests);
router.post("/print-partner-requests/:requestId/approve", authMiddleware, adminAuth, approvePrintPartnerRequest);
router.post("/print-partner-requests/:requestId/reject", authMiddleware, adminAuth, rejectPrintPartnerRequest);

<<<<<<< HEAD
// Corporate Request Routes
router.post("/submit-corporate-request", upload.single("proofFile"), submitCorporateRequest);
router.get("/corporate-requests", authMiddleware, adminAuth, getAllCorporateRequests);
router.post("/corporate-requests/:requestId/approve", authMiddleware, adminAuth, approveCorporateRequest);
router.post("/corporate-requests/:requestId/reject", authMiddleware, adminAuth, rejectCorporateRequest);

// Email Verification Routes
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/complete-customer-signup", completeCustomerSignup);

=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export default router;
