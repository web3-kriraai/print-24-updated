import express from 'express';
import {
    generatePriceBookView,
    checkPriceConflicts,
    resolvePriceConflict,
    getPriceHierarchy,
    validateModifierConditions,
    testModifierConditions,
    resolvePricing,
    getGeoZoneHierarchy,
    getGeoZonePath
} from '../../controllers/admin/pricingAdminControllerExtensions.js';
import { authMiddleware as protect, requireAdmin as adminOnly } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * =========================================================================
 * ADVANCED PRICING ROUTES
 * =========================================================================
 * 
 * These routes provide advanced pricing features:
 * - Virtual price book views
 * - Conflict detection and resolution
 * - Price hierarchy visualization
 * - Condition validation and testing
 * - Standardized pricing API
 * - Hierarchical geo zones
 */

// ============================================
// PRICE BOOK VIEWS & CONFLICT MANAGEMENT
// ============================================

/**
 * Generate virtual price book view
 * POST /api/admin/price-books/view
 * Body: { zoneId, segmentId, productId, categoryId, priceBookId }
 */
router.post('/price-books/view', protect, adminOnly, generatePriceBookView);

/**
 * Check for price conflicts
 * POST /api/admin/price-books/check-conflicts
 * Body: { zoneId, segmentId, productId, newPrice, updateLevel }
 */
router.post('/price-books/check-conflicts', protect, adminOnly, checkPriceConflicts);

/**
 * Resolve price conflict
 * POST /api/admin/price-books/resolve-conflict
 * Body: { zoneId, segmentId, productId, oldPrice, newPrice, resolution, updateLevel }
 * resolution: 'OVERWRITE' | 'PRESERVE' | 'RELATIVE'
 */
router.post('/price-books/resolve-conflict', protect, adminOnly, resolvePriceConflict);

/**
 * Get price hierarchy for a product
 * GET /api/admin/price-books/hierarchy/:productId?zoneId=&segmentId=
 */
router.get('/price-books/hierarchy/:productId', protect, adminOnly, getPriceHierarchy);

// ============================================
// MODIFIER CONDITION MANAGEMENT
// ============================================

/**
 * Validate modifier conditions
 * POST /api/admin/modifiers/validate-conditions
 * Body: { conditions }
 */
router.post('/modifiers/validate-conditions', protect, adminOnly, validateModifierConditions);

/**
 * Test modifier conditions against context
 * POST /api/admin/modifiers/test-conditions
 * Body: { conditions, context }
 */
router.post('/modifiers/test-conditions', protect, adminOnly, testModifierConditions);

// ============================================
// HIERARCHICAL GEO ZONES
// ============================================

/**
 * Get geo zone hierarchy
 * GET /api/admin/geo-zones/hierarchy?parentId=
 */
router.get('/geo-zones/hierarchy', protect, adminOnly, getGeoZoneHierarchy);

/**
 * Get full path for a geo zone
 * GET /api/admin/geo-zones/:id/path
 */
router.get('/geo-zones/:id/path', protect, adminOnly, getGeoZonePath);

// ============================================
// PUBLIC PRICING API (Standardized)
// ============================================

/**
 * Resolve pricing for products (Public API)
 * POST /api/v1/pricing/resolve
 * Body: {
 *   product_ids: ["id1", "id2"],
 *   context: {
 *     user_id: "user123",
 *     country_code: "IN",
 *     currency: "INR",
 *     quantity: 1
 *   }
 * }
 */
router.post('/v1/pricing/resolve', resolvePricing);

export default router;
