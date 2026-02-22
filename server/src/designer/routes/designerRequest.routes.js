import express from 'express';
import {
    createDesignerRequest,
    getDesignerRequests,
    getDesignerRequestById,
    updateDesignerRequest,
} from '../controllers/designerRequest.controller.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Create new designer request (authenticated users)
router.post('/', authMiddleware, createDesignerRequest);

// Get all designer requests (for designer dashboard)
router.get('/', authMiddleware, getDesignerRequests);

// Get single designer request by ID
router.get('/:id', authMiddleware, getDesignerRequestById);

// Update designer request status
router.patch('/:id', authMiddleware, updateDesignerRequest);

export default router;
