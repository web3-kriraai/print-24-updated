import express from "express";
import {
    getPriceQuote,
    getPriceBreakdown,
    getBatchPriceQuote,
    getMyPricingContext,
    detectPricingConflicts,
    invalidatePriceCache,
    getPricingLogs,
} from "../controllers/pricingController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { optionalAuthMiddleware, pricingContextMiddleware } from "../middlewares/pricingContextMiddleware.js";

const router = express.Router();

/**
 * =========================================================================
 * PRICING ROUTES
 * =========================================================================
 * 
 * These routes expose the pricing engine to the frontend and admin tools.
 * 
 * PUBLIC ROUTES (Optional Auth):
 * - POST /quote - Get real-time price quote
 * - POST /breakdown - Get detailed price breakdown
 * - POST /batch-quote - Get prices for multiple products
 * - GET /my-context - Get user's pricing context
 * 
 * ADMIN ROUTES:
 * - POST /admin/detect-conflicts - Check pricing change impact
 * - POST /admin/invalidate-cache - Clear pricing cache
 * - GET /admin/logs/:orderId - Get pricing calculation logs
 */

// ========================================
// PUBLIC ROUTES (Optional Auth)
// ========================================

/**
 * Get real-time price quote
 * Auth optional - uses RETAIL segment if not logged in
 */
router.post("/quote", optionalAuthMiddleware, pricingContextMiddleware, getPriceQuote);

/**
 * CANONICAL PRICING API - /resolve
 * This is the main endpoint for customer-facing pricing
 * Used by: Order forms, price preview, cart calculations
 * Auth optional - uses RETAIL segment if not logged in
 */
router.post("/resolve", optionalAuthMiddleware, pricingContextMiddleware, getPriceQuote); // Same as /quote

/**
 * Get detailed price breakdown for UI
 * Auth optional - uses RETAIL segment if not logged in
 */
router.post("/breakdown", optionalAuthMiddleware, pricingContextMiddleware, getPriceBreakdown);

/**
 * Get prices for multiple products in one request
 * Auth optional - optimized for product listing pages
 */
router.post("/batch-quote", optionalAuthMiddleware, pricingContextMiddleware, getBatchPriceQuote);

/**
 * Get current user's pricing context
 * Returns segment, tier, geo zone, etc.
 * Auth optional - returns guest context if not logged in
 */
router.get("/my-context", optionalAuthMiddleware, getMyPricingContext);

// ========================================
// ADMIN ROUTES (Auth Required)
// ========================================

/**
 * Detect pricing conflicts before saving price changes
 * Admin only
 */
router.post("/admin/detect-conflicts", authMiddleware, detectPricingConflicts);

/**
 * Invalidate pricing cache after price changes
 * Admin only
 */
router.post("/admin/invalidate-cache", authMiddleware, invalidatePriceCache);

/**
 * Get pricing logs for an order
 * Admin only
 */
router.get("/admin/logs/:orderId", authMiddleware, getPricingLogs);

export default router;
