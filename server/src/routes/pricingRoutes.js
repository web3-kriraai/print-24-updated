import express from 'express';
import {
  getAllUserSegments,
  createUserSegment,
  updateUserSegment,
  deleteUserSegment,
} from '../controllers/userSegmentPricingController.js';

const router = express.Router();

// All routes require admin authentication (handled by main router)

// Get all user segments
router.get('/user-segments', getAllUserSegments);

// Create user segment
router.post('/user-segments', createUserSegment);

// Update user segment
router.put('/user-segments/:id', updateUserSegment);

// Delete user segment
router.delete('/user-segments/:id', deleteUserSegment);

export default router;
