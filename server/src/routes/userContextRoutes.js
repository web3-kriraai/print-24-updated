import express from 'express';
import { optionalAuthMiddleware, pricingContextMiddleware } from '../middlewares/pricingContextMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getUserContext, updateUserLocation } from '../controllers/userContextController.js';
import { checkFeatureEndpoint } from '../middlewares/featureMiddleware.js';

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

// POST /api/user/context - Get context with pincode from request body
router.post('/context', optionalAuthMiddleware, pricingContextMiddleware, getUserContext);

// POST /api/user/update-location - Update user's location preference
// Body: { pincode: "560001", lat?: number, lng?: number }
router.post('/update-location', optionalAuthMiddleware, updateUserLocation);

// GET /api/user/check-feature - Check if user has a specific feature enabled
// Query: ?feature=feature_key
router.get('/check-feature', authMiddleware, checkFeatureEndpoint);

export default router;
