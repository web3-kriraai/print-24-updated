import express from "express";
import multer from "multer";
import {
  getPublicSegments,
  getSegmentForm,
  submitApplication,
  getMyApplications,
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getApplicationStats,
} from "../controllers/segmentApplicationController.js";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images and common document types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.mimetype.startsWith('image/') || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Please upload an image or document (PDF, Word, Excel).'), false);
    }
  },
});

// Public routes
router.get("/user-segments/public", getPublicSegments);
router.get("/user-segments/:code/form", getSegmentForm);
router.post("/segment-applications", upload.array('files', 10), submitApplication);

// User routes (authenticated)
router.get("/segment-applications/my-applications", authMiddleware, getMyApplications);

// Admin routes
router.get("/admin/segment-applications/stats", authMiddleware, requireAdmin, getApplicationStats);
router.get("/admin/segment-applications", authMiddleware, requireAdmin, getAllApplications);
router.get("/admin/segment-applications/:id", authMiddleware, requireAdmin, getApplicationById);
router.post("/admin/segment-applications/:id/approve", authMiddleware, requireAdmin, approveApplication);
router.post("/admin/segment-applications/:id/reject", authMiddleware, requireAdmin, rejectApplication);

export default router;
