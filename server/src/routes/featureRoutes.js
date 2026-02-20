import express from 'express';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';
import featureController from '../controllers/featureController.js';

const router = express.Router();

/* =====================
   FEATURE READ OPERATIONS (Admin Only)
====================== */

/**
 * List all features
 * GET /api/admin/features
 * Query params: category, isActive, isPremium, isBeta
 */
router.get(
    '/',
    authMiddleware,
    requireAdmin,
    featureController.listFeatures
);

/**
 * Get single feature by key
 * GET /api/admin/features/:key
 */
router.get(
    '/:key',
    authMiddleware,
    requireAdmin,
    featureController.getFeature
);

/**
 * Get features by category
 * GET /api/admin/features/category/:category
 */
router.get(
    '/category/:category',
    authMiddleware,
    requireAdmin,
    featureController.getFeaturesByCategory
);

/* =====================
   SEGMENT FEATURE ASSIGNMENT
====================== */

/**
 * Get features for a specific segment
 * GET /api/admin/segments/:segmentId/features
 */
router.get(
    '/segments/:segmentId',
    authMiddleware,
    requireAdmin,
    featureController.getSegmentFeatures
);

/**
 * Assign/Update feature to segment
 * POST /api/admin/segments/:segmentId/features
 * Body: { featureKey, isEnabled, config }
 */
router.post(
    '/segments/:segmentId',
    authMiddleware,
    requireAdmin,
    featureController.assignFeatureToSegment
);

/**
 * Remove feature from segment
 * DELETE /api/admin/segments/:segmentId/features/:featureKey
 */
router.delete(
    '/segments/:segmentId/:featureKey',
    authMiddleware,
    requireAdmin,
    featureController.removeFeatureFromSegment
);

/**
 * Bulk Assign/Update features to segment
 * POST /api/admin/segments/:segmentId/bulk
 */
router.post(
    '/segments/:segmentId/bulk',
    authMiddleware,
    requireAdmin,
    featureController.bulkAssignFeaturesToSegment
);

/**
 * Bulk Remove features from segment
 * DELETE /api/admin/segments/:segmentId/bulk
 */
router.delete(
    '/segments/:segmentId/bulk',
    authMiddleware,
    requireAdmin,
    featureController.bulkRemoveSegmentFeatures
);

/* =====================
   USER FEATURE OVERRIDES
====================== */

/**
 * Get all features for a user (segment + overrides)
 * GET /api/admin/users/:userId/features
 */
router.get(
    '/users/:userId',
    authMiddleware,
    requireAdmin,
    featureController.getUserFeatures
);

/**
 * Add/Update user feature override
 * POST /api/admin/users/:userId/features
 * Body: { featureKey, isEnabled, config, notes }
 */
router.post(
    '/users/:userId',
    authMiddleware,
    requireAdmin,
    featureController.setUserFeatureOverride
);

/**
 * Remove user feature override
 * DELETE /api/admin/users/:userId/features/:featureKey
 */
router.delete(
    '/users/:userId/:featureKey',
    authMiddleware,
    requireAdmin,
    featureController.removeUserFeatureOverride
);

/**
 * Bulk Add/Update user feature overrides
 * POST /api/admin/users/:userId/bulk
 */
router.post(
    '/users/:userId/bulk',
    authMiddleware,
    requireAdmin,
    featureController.bulkSetUserFeatureOverrides
);

/**
 * Bulk Remove user feature overrides
 * DELETE /api/admin/users/:userId/bulk
 */
router.delete(
    '/users/:userId/bulk',
    authMiddleware,
    requireAdmin,
    featureController.bulkRemoveUserOverrides
);

export default router;
