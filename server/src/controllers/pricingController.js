import PricingService from "../services/pricing/PricingService.js";
import UserContextService from "../services/UserContextService.js";

/**
 * =========================================================================
 * PRICING CONTROLLER
 * =========================================================================
 * 
 * This controller exposes pricing APIs for:
 * 1. Getting real-time price quotes
 * 2. Getting detailed price breakdowns (for UI)
 * 3. Batch pricing for product listings
 * 4. User pricing context information
 * 5. Admin: Detecting pricing conflicts before saving changes
 * 6. Admin: Invalidating cache after price changes
 * 
 * IMPORTANT:
 * - Do NOT use this controller for order creation
 * - Order creation should call PricingService.createPriceSnapshot() directly
 * - These endpoints are for FRONTEND DISPLAY and ADMIN TOOLS only
 */

/**
 * ========================================
 * GET PRICE QUOTE
 * ========================================
 * 
 * Returns calculated pricing for a product configuration.
 * Used by frontend to show real-time price updates.
 * 
 * POST /api/pricing/quote
 * 
 * Body:
 * {
 *   productId: "...",
 *   pincode: "123456",
 *   selectedDynamicAttributes: [
 *     { attributeType: "...", value: "...", pricingKey: "..." }
 *   ],
 *   quantity: 100
 * }
 * 
 * Auth: Optional (uses RETAIL segment if not authenticated)
 */
export const getPriceQuote = async (req, res) => {
    try {
        const { productId, pincode, selectedDynamicAttributes = [], quantity = 1 } = req.body;

        // Validation
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required",
            });
        }

        // Pincode is now optional - will fallback to IP detection

        // Get user ID if authenticated (req.user is set by optionalAuthMiddleware)
        const userId = req.user?._id || req.user?.id || null;

        // Build pricing context from request (handles pincode fallback: request → profile → IP)
        const pricingContext = await UserContextService.buildContextFromRequest(req);

        // Use pincode from context (IP-detected if not explicitly provided)
        const resolvedPincode = pricingContext.pincode;

        // Resolve price
        const pricingResult = await PricingService.resolvePrice({
            userId,
            productId,
            pincode: resolvedPincode,
            selectedDynamicAttributes,
            quantity: parseInt(quantity),
            cacheResults: true,
        });

        return res.status(200).json({
            success: true,
            pricing: {
                basePrice: pricingResult.basePrice,
                compareAtPrice: pricingResult.compareAtPrice,
                quantity: pricingResult.quantity,
                subtotal: pricingResult.subtotal,
                gstPercentage: pricingResult.gstPercentage,
                gstAmount: pricingResult.gstAmount,
                totalPayable: pricingResult.totalPayable,
                currency: pricingResult.currency,
                // Include applied modifiers for transparency
                appliedModifiers: pricingResult.appliedModifiers || [],
            },
            meta: {
                geoZone: pricingContext.geoZoneName || null,
                pincode: resolvedPincode,
                modifiersApplied: pricingResult.appliedModifiers.length,
                calculatedAt: pricingResult.calculatedAt,
                // User context for display
                userSegment: pricingContext.userSegmentCode || "RETAIL",
                userSegmentName: pricingContext.userSegmentName || "Retail Customer",
                pricingTier: pricingContext.pricingTier || 0,
                isAuthenticated: pricingContext.isAuthenticated || false,
                isGuest: !pricingContext.isAuthenticated,
                // Location transparency
                detectedBy: !pincode ? 'IP_DETECTION' : 'REQUEST',
                // Zone hierarchy data for frontend display
                geoZoneHierarchy: pricingContext.geoZoneHierarchy || [],
                usedZoneId: pricingResult.usedZoneId || pricingContext.geoZoneId,
                usedZoneName: pricingResult.usedZoneName || pricingContext.geoZoneName,
                usedZoneLevel: pricingResult.usedZoneLevel || null,
            },
        });
    } catch (error) {
        console.error("Get price quote error:", error);

        // Check if this is a product availability error
        const errorMessage = error.message || "";
        const isAvailabilityError =
            errorMessage.includes("not available") ||
            errorMessage.includes("Product not available") ||
            errorMessage.includes("not sellable") ||
            errorMessage.includes("block for") ||
            errorMessage.includes("restricted");

        if (isAvailabilityError) {
            // Return a proper response for unavailable products (not 500)
            return res.status(200).json({
                success: false,
                isAvailable: false,
                errorCode: "PRODUCT_NOT_AVAILABLE",
                message: errorMessage.replace("PricingService.resolvePrice failed: ", ""),
                displayMessage: "This product is not available in your region",
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to calculate price",
            error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

/**
 * ========================================
 * GET BATCH PRICE QUOTES
 * ========================================
 * 
 * Returns pricing for multiple products in a single request.
 * Used by frontend for product listing pages.
 * 
 * POST /api/pricing/batch-quote
 * 
 * Body:
 * {
 *   productIds: ["id1", "id2", "id3"],
 *   pincode: "123456",
 *   quantity: 1
 * }
 * 
 * Auth: Optional
 */
export const getBatchPriceQuote = async (req, res) => {
    try {
        const { productIds, pincode, quantity = 1 } = req.body;

        // Validation
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "productIds array is required",
            });
        }

        if (productIds.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Maximum 50 products per batch request",
            });
        }

        if (!pincode) {
            return res.status(400).json({
                success: false,
                message: "pincode is required for pricing calculation",
            });
        }

        const userId = req.user?._id || req.user?.id || null;

        // Build pricing context once for all products
        const pricingContext = await UserContextService.buildContextFromRequest(req);

        // Resolve prices for all products in parallel
        const pricingPromises = productIds.map((productId) =>
            PricingService.resolvePrice({
                userId,
                productId,
                pincode,
                selectedDynamicAttributes: [],
                quantity: parseInt(quantity),
                cacheResults: true,
            }).catch((error) => ({
                error: true,
                message: error.message,
                productId,
            }))
        );

        const results = await Promise.all(pricingPromises);

        // Format response
        const prices = results.map((result, index) => {
            if (result.error) {
                return {
                    productId: productIds[index],
                    success: false,
                    error: result.message,
                };
            }

            return {
                productId: productIds[index],
                success: true,
                basePrice: result.basePrice,
                compareAtPrice: result.compareAtPrice,
                totalPayable: result.totalPayable,
                currency: result.currency,
                modifiersApplied: result.appliedModifiers.length,
            };
        });

        return res.status(200).json({
            success: true,
            count: prices.length,
            prices,
            context: {
                userSegment: pricingContext.userSegmentCode || "RETAIL",
                pricingTier: pricingContext.pricingTier || 0,
                geoZone: pricingContext.geoZoneName || null,
            },
        });
    } catch (error) {
        console.error("Get batch price quote error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to calculate batch prices",
            error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

/**
 * ========================================
 * GET MY PRICING CONTEXT
 * ========================================
 * 
 * Returns the current user's pricing context.
 * Used by frontend to display badges, tier info, etc.
 * 
 * GET /api/pricing/my-context
 * 
 * Auth: Optional (returns guest context if not authenticated)
 */
export const getMyPricingContext = async (req, res) => {
    try {
        const pincode = req.query.pincode || null;

        // Build context from user
        const context = await UserContextService.buildUserContext(req.user, pincode);

        return res.status(200).json({
            success: true,
            context: {
                isAuthenticated: context.isAuthenticated,
                userSegment: {
                    code: context.userSegmentCode,
                    name: context.userSegmentName,
                },
                userType: context.userType,
                pricingTier: context.pricingTier,
                geoZone: context.geoZoneName ? {
                    name: context.geoZoneName,
                    pincode: context.pincode,
                } : null,
                paymentTerms: context.paymentTerms,
                creditLimit: context.creditLimit,
            },
        });
    } catch (error) {
        console.error("Get my pricing context error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get pricing context",
        });
    }
};

/**
 * ========================================
 * GET PRICE BREAKDOWN
 * ========================================
 * 
 * Returns detailed price breakdown for UI display.
 * Shows base price, each modifier, GST, and total.
 * 
 * POST /api/pricing/breakdown
 * 
 * Body: Same as getPriceQuote
 * 
 * Auth: Optional
 */
export const getPriceBreakdown = async (req, res) => {
    try {
        const { productId, pincode, selectedDynamicAttributes = [], quantity = 1 } = req.body;

        // Validation
        if (!productId || !pincode) {
            return res.status(400).json({
                success: false,
                message: "productId and pincode are required",
            });
        }

        const userId = req.user?._id || req.user?.id || null;

        // Get detailed breakdown
        const breakdown = await PricingService.getPriceBreakdown({
            userId,
            productId,
            pincode,
            selectedDynamicAttributes,
            quantity: parseInt(quantity),
        });

        return res.status(200).json({
            success: true,
            breakdown: breakdown.breakdown,
            currency: breakdown.currency,
            totalPayable: breakdown.totalPayable,
        });
    } catch (error) {
        console.error("Get price breakdown error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get price breakdown",
            error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

/**
 * ========================================
 * DETECT PRICING CONFLICTS (Admin Only)
 * ========================================
 * 
 * Called before admin saves a price change to check impact.
 * 
 * POST /api/pricing/admin/detect-conflicts
 * 
 * Body:
 * {
 *   modifierId: "..." // OR
 *   priceBookEntryId: "..."
 * }
 * 
 * Auth: Admin only
 */
export const detectPricingConflicts = async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }

        const { modifierId, priceBookEntryId } = req.body;

        if (!modifierId && !priceBookEntryId) {
            return res.status(400).json({
                success: false,
                message: "Either modifierId or priceBookEntryId is required",
            });
        }

        const conflictData = await PricingService.detectPricingConflicts({
            modifierId,
            priceBookEntryId,
        });

        return res.status(200).json({
            success: true,
            conflicts: conflictData,
        });
    } catch (error) {
        console.error("Detect pricing conflicts error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to detect conflicts",
            error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

/**
 * ========================================
 * INVALIDATE PRICE CACHE (Admin Only)
 * ========================================
 * 
 * Invalidates Redis cache after price changes.
 * 
 * POST /api/pricing/admin/invalidate-cache
 * 
 * Body:
 * {
 *   productId: "..." // Optional - clear specific product
 *   userSegmentId: "..." // Optional - clear specific segment
 *   geoZoneId: "..." // Optional - clear specific zone
 * }
 * 
 * If all optional, clears entire pricing cache.
 * 
 * Auth: Admin only
 */
export const invalidatePriceCache = async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }

        const { productId, userSegmentId, geoZoneId } = req.body;

        const result = await PricingService.invalidateCache({
            productId,
            userSegmentId,
            geoZoneId,
        });

        return res.status(200).json({
            success: true,
            message: "Cache invalidation triggered",
            result,
        });
    } catch (error) {
        console.error("Invalidate cache error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to invalidate cache",
            error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};

/**
 * ========================================
 * GET PRICING LOGS (Admin Only)
 * ========================================
 * 
 * Gets pricing calculation logs for an order.
 * Used for debugging and audit trail.
 * 
 * GET /api/pricing/admin/logs/:orderId
 * 
 * Auth: Admin only
 */
export const getPricingLogs = async (req, res) => {
    try {
        // Check admin role
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }

        const { orderId } = req.params;

        const PricingCalculationLog = (await import("../models/PricingCalculationLogschema.js")).default;

        const logs = await PricingCalculationLog.find({ order: orderId })
            .populate("modifier")
            .sort({ appliedAt: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            logs,
            count: logs.length,
        });
    } catch (error) {
        console.error("Get pricing logs error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get pricing logs",
            error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
    }
};
