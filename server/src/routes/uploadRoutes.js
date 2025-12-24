import express from "express";
import { uploadDesignFiles } from "../middlewares/upload.js";
import { uploadDesign } from "../controllers/uploadController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getMyUploads, deleteMyUpload } from "../controllers/userUploadController.js";

const router = express.Router();

router.post(
  "/upload",
  uploadDesignFiles,   // Handle multiple files
  uploadDesign
);

// User's own uploads routes (require authentication)
router.get("/my-uploads", authMiddleware, getMyUploads);
router.delete("/:id", authMiddleware, deleteMyUpload);

export default router;