import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import {
    submitDesignForm,
    getDesignerOrders,
    uploadFinalPDF,
    downloadSecureFile,
    pickupOrder
} from '../controllers/designerOrder.controller.js';

import { authorizeDesigner } from '../middlewares/authorizeDesigner.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// MULTER CONFIG (Secure Directory)
// ==========================================
const secureUploadDir = path.join(__dirname, '../../../uploads/secure_designs');

if (!fs.existsSync(secureUploadDir)) {
    fs.mkdirSync(secureUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, secureUploadDir);
    },
    filename: (req, file, cb) => {
        // Keep original name initially, validate later
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });


// ==========================================
// ROUTES
// ==========================================

// 1. Submit Design Form (Client)
router.post('/:orderId/design-form', authMiddleware, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), submitDesignForm);

// 2. FIFO Order List (Designers Only)
router.get('/', authMiddleware, authorizeDesigner, getDesignerOrders);

// 3. Upload Final Design (Designer)
router.post('/:orderId/upload-final', authMiddleware, authorizeDesigner, upload.single('design'), uploadFinalPDF);

// 4. Download Secure Design (Designer)
router.get('/:orderId/file', authMiddleware, downloadSecureFile);

// 6. Pick up Order (Designer)
router.patch('/:orderId/pickup', authMiddleware, authorizeDesigner, pickupOrder);

export default router;
