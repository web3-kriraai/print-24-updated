import express from 'express';
import { optionalAuthMiddleware, pricingContextMiddleware } from '../middlewares/pricingContextMiddleware.js';
import { getUserContext, updateUserLocation } from '../controllers/userContextController.js';

const router = express.Router();

/**
 * =========================================================================
 * USER CONTEXT ROUTES
 * =========================================================================
 * 
 * Routes for fetching and updating user context (segment, location, etc.)
 * Used by frontend to get all information needed for pricing
 */

// GET /api/user/context - Get complete user context
// Works for both guest and authenticated users
// Automatically detects location from IP if not provided
router.get('/context', optionalAuthMiddleware, pricingContextMiddleware, getUserContext);

// POST /api/user/update-location - Update user's location preference
// Body: { pincode: "560001", lat?: number, lng?: number }
router.post('/update-location', optionalAuthMiddleware, updateUserLocation);

export default router;
