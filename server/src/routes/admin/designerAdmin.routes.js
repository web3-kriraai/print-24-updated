import express from 'express';
import { adminAuth } from '../../middlewares/roleMiddleware.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import {
    getDesignerStats,
    getDesignersReport,
    getDesignerDetailedReport
} from '../../controllers/adminDesignerController.js';

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, adminAuth);

router.get('/stats', getDesignerStats);
router.get('/report', getDesignersReport);
router.get('/:id/details', getDesignerDetailedReport);

export default router;
