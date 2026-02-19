import express from 'express';
import { getSessionSettings, updateSessionSettings, getPublicDesigners, updateOnlineStatus, updateDesignerProfile } from '../controllers/designer.controller.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Publicly accessible for clients
router.get('/designers', getPublicDesigners);

// All other settings routes require authentication (for designers to manage their own settings)
router.use(authMiddleware);

router.get('/', getSessionSettings);
router.patch('/', updateSessionSettings);
router.patch('/status', updateOnlineStatus);
router.patch('/profile', updateDesignerProfile);

export default router;

