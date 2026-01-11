import PricingResolver from "./PricingResolver.js";
import PricingCalculationLog from "../../models/PricingCalculationLogschema.js";
import { User } from "../../models/User.js";
import Product from "../../models/productModal.js";
import UserSegment from "../../models/UserSegment.js";
import { PricingCache } from "../../config/redis.js";
import ModifierEngine from "../ModifierEngine.js";
import VirtualPriceBookService from "../VirtualPriceBookService.js";

/**
 * =========================================================================
 * PRICING SERVICE
 * =========================================================================
 * 
 * This is the HIGH-LEVEL service that orchestrates pricing operations.
 * 
 * Key Responsibilities:
 * 1. Orchestrate price resolution via PricingResolver
 * 2. Log all pricing calculations to PricingCalculationLog
 * 3. Manage Redis caching (to be implemented)
 * 4. Create immutable price snapshots for orders
 * 5. Detect pricing conflicts
 * 
 * STRICT RULES:
 * - NEVER modify product schemas
 * - ALWAYS log pricing calculations
 * - Price snapshots in orders are IMMUTABLE once created
 * - Use Redis for caching (format: PRICE::{PRODUCT_ID}::{USER_SEGMENT}::{GEO_ZONE})
 */

class PricingService {
    constructor() {
        this.virtualPriceBookService = new VirtualPriceBookService();
        this.useVirtualPricing = process.env.USE_VIRTUAL_PRICING === 'true' || false;
    }
    /**
     * ========================================
     * METHOD: Resolve Price (Main Entry Point)
     * ========================================
     * 
     * ORCHESTRATES the complete pricing flow:
     * 1. Get pricing context (PricingResolver)
     * 2. Calculate subtotal (quantity × unitPrice)
     * 3. Apply modifiers (ModifierEngine)
     * 4. Calculate GST
     * 5. Return complete breakdown
     */
    async resolvePrice({
        userId = null,
        userSegmentId = null,
        productId,
        pincode,
        selectedDynamicAttributes = [],
        quantity = 1,
        cacheResults = true,
        promoCodes = [],
    }) {
        try {
            // Step 1: Resolve User Segment
            let resolvedUserSegmentId = userSegmentId;

            if (!resolvedUserSegmentId && userId) {
                const user = await User.findById(userId).populate("userSegment").lean();
                if (user?.userSegment?._id) {
                    resolvedUserSegmentId = user.userSegment._id;
                } else {
                    const defaultSegment = await UserSegment.findOne({ isDefault: true }).lean();
                    if (!defaultSegment) {
                        throw new Error("No default user segment found. Please configure user segments.");
                    }
                    resolvedUserSegmentId = defaultSegment._id;
                }
            }

            if (!resolvedUserSegmentId) {
                const retailSegment = await UserSegment.findOne({ code: "RETAIL" }).lean();
                if (!retailSegment) {
                    throw new Error("RETAIL user segment not found. Please run segment initialization.");
                }
                resolvedUserSegmentId = retailSegment._id;
            }

            // Step 2: Resolve GeoZone
            // We use PricingResolver helper just for GeoZone resolution context
            const geoZone = await PricingResolver.getGeoZoneByPincode(pincode);
            const geoZoneId = geoZone?._id || null;

            // Step 3: Check Redis Cache
            if (cacheResults) {
                const cacheKey = PricingCache.generateKey(
                    productId,
                    resolvedUserSegmentId,
                    geoZoneId
                );

                const cached = await PricingCache.get(cacheKey);
                if (cached) {
                    console.log(`✅ Cache HIT: ${cacheKey}`);
                    return cached;
                }
                console.log(`⚠️ Cache MISS: ${cacheKey}`);
            }

            // Step 4: Get Product Details (for GST & Metadata)
            const product = await Product.findById(productId).lean();
            if (!product) {
                throw new Error("Product not found");
            }
            const gstPercentage = product.gstPercentage || 0;

            // Step 5: CALCULATE VIRTUAL PRICE (The Core Waterfall Logic)
            // This replaces the disconnected PricingResolver + ModifierEngine flow
            const contextOverride = {
                selectedAttributes: selectedDynamicAttributes.map((attr) => ({
                    attributeType: attr.attributeType || attr.attributeTypeId,
                    value: attr.value || attr.attributeValue,
                    pricingKey: attr.pricingKey,
                    attributeName: attr.attributeName,
                })),
                promoCodes,
                product: product // pass full product to avoid re-fetch
            };

            const virtualResult = await this.virtualPriceBookService.calculateVirtualPrice(
                productId,
                geoZoneId,
                resolvedUserSegmentId,
                contextOverride
            );

            if (!virtualResult.isAvailable) {
                throw new Error(virtualResult.availabilityReason || "Product not available in this region");
            }

            // Step 6: Calculate Totals
            const unitPrice = virtualResult.finalPrice;
            const subtotal = unitPrice * quantity;

            // Step 7: Calculate GST
            const gstAmount = (subtotal * gstPercentage) / 100;
            const totalPayable = subtotal + gstAmount;

            // Step 8: Build Final Result
            const result = {
                basePrice: virtualResult.masterPrice,
                unitPrice: unitPrice,
                compareAtPrice: null, // Virtual service could be enhanced to return this
                quantity,
                subtotal,
                gstPercentage,
                gstAmount,
                totalPayable,
                appliedModifiers: virtualResult.adjustments.map(adj => ({
                    source: adj.type,
                    reason: adj.modifierName || adj.adjustmentType || adj.type,
                    modifierType: adj.modifierType || 'FIXED',
                    value: adj.value,
                    beforeAmount: adj.beforePrice || 0,
                    afterAmount: adj.afterPrice || 0,
                    pricingKey: adj.modifierId // for audit logs
                })),
                currency: geoZone?.currency || "INR",
                geoZone: geoZone,
                priceBookId: virtualResult.masterBook,
                calculatedAt: new Date(),
                isVirtual: true
            };

            // Step 9: Cache Result
            if (cacheResults) {
                const cacheKey = PricingCache.generateKey(
                    productId,
                    resolvedUserSegmentId,
                    geoZoneId
                );
                await PricingCache.set(cacheKey, result, 900); // 15 min TTL
                console.log(`💾 Cached: ${cacheKey}`);
            }

            return result;
        } catch (error) {
            throw new Error(`PricingService.resolvePrice failed: ${error.message}`);
        }
    }

    /**
     * ========================================
     * METHOD: Create Price Snapshot
     * ========================================
     * 
     * Creates an IMMUTABLE price snapshot for an order.
     * This snapshot is locked and cannot be changed after order creation.
     * 
     * Use Case: Called during order creation
     */
    async createPriceSnapshot({
        userId,
        productId,
        pincode,
        selectedDynamicAttributes,
        quantity,
    }) {
        const pricingResult = await this.resolvePrice({
            userId,
            productId,
            pincode,
            selectedDynamicAttributes,
            quantity,
            cacheResults: false, // Don't cache snapshots
        });

        // Create immutable snapshot object
        const snapshot = {
            basePrice: pricingResult.basePrice,
            quantity: pricingResult.quantity,
            appliedModifiers: pricingResult.appliedModifiers.map((mod) => ({
                pricingKey: mod.pricingKey,
                modifierType: mod.modifierType,
                value: mod.value,
                source: mod.source,
                modifierId: mod.modifierId,
            })),
            subtotal: pricingResult.subtotal,
            gstPercentage: pricingResult.gstPercentage,
            gstAmount: pricingResult.gstAmount,
            totalPayable: pricingResult.totalPayable,
            currency: pricingResult.currency,
            calculatedAt: pricingResult.calculatedAt,
        };

        return {
            priceSnapshot: snapshot,
            fullPricingResult: pricingResult, // Include full result for logging
        };
    }

    /**
     * ========================================
     * METHOD: Log Pricing Calculation
     * ========================================
     * 
     * Logs every applied modifier to PricingCalculationLog for audit trail.
     * 
     * Called after order creation to record pricing decisions.
     */
    async logPricingCalculation(orderId, appliedModifiers) {
        try {
            const logEntries = appliedModifiers.map((mod) => ({
                order: orderId,
                pricingKey: mod.pricingKey,
                modifier: mod.modifierId || null,
                scope: mod.source,
                beforeAmount: mod.beforeAmount || 0,
                afterAmount: mod.afterAmount || 0,
                reason: mod.reason || "",
                appliedAt: new Date(),
            }));

            if (logEntries.length > 0) {
                await PricingCalculationLog.insertMany(logEntries);
            }

            return { success: true, loggedCount: logEntries.length };
        } catch (error) {
            console.error("Failed to log pricing calculation:", error);
            // Don't throw - logging failure shouldn't break order creation
            return { success: false, error: error.message };
        }
    }

    /**
     * ========================================
     * METHOD: Detect Pricing Conflicts
     * ========================================
     * 
     * When admin edits a PriceModifier or PriceBookEntry, check if any
     * existing orders would have different pricing.
     * 
     * Use Case: Called before admin saves a price change
     * 
     * Returns:
     * - affectedOrders: Array of order IDs that would be impacted
     * - priceDeltas: Difference between old and new pricing
     */
    async detectPricingConflicts({ modifierId = null, priceBookEntryId = null }) {
        try {
            // This is a DETECTION method - it doesn't prevent changes
            // It WARNS admins about potential impacts

            if (modifierId) {
                // Find all orders that used this modifier
                const affectedLogs = await PricingCalculationLog.find({
                    modifier: modifierId,
                })
                    .populate("order")
                    .lean();

                const orderIds = [...new Set(affectedLogs.map((log) => log.order._id.toString()))];

                return {
                    affectedOrders: orderIds,
                    count: orderIds.length,
                    warning: `${orderIds.length} existing orders used this price modifier. Price snapshots will NOT change (they are immutable), but new orders will use the updated modifier.`,
                };
            }

            if (priceBookEntryId) {
                // Price book entries don't have direct logs, so we can't track easily
                // Return a generic warning
                return {
                    warning: "Base price changed. New orders will use the updated price. Existing order snapshots remain unchanged.",
                };
            }

            return { affectedOrders: [], count: 0 };
        } catch (error) {
            console.error("Failed to detect pricing conflicts:", error);
            return { error: error.message };
        }
    }

    /**
     * ========================================
     * METHOD: Invalidate Cache
     * ========================================
     * 
     * Invalidates Redis cache when pricing data changes.
     * 
     * Use Cases:
     * - Admin updates PriceModifier
     * - Admin updates PriceBookEntry
     * - Product attributes change
     */
    async invalidateCache({ productId = null, userSegmentId = null, geoZoneId = null }) {
        // TODO: Implement Redis cache invalidation
        // Pattern:
        // If productId: Delete all PRICE::{productId}::*
        // If userSegmentId: Delete all PRICE::*::{userSegmentId}::*
        // If all null: Flush all pricing cache

        console.log("Cache invalidation requested:", {
            productId,
            userSegmentId,
            geoZoneId,
        });

        return { success: true, message: "Cache invalidation pending (Redis not yet connected)" };
    }

    /**
     * ========================================
     * REDIS CACHE METHODS (Placeholder)
     * ========================================
     */
    async getCachedPrice(cacheKey) {
        // TODO: Implement Redis GET
        return null;
    }

    async setCachedPrice(cacheKey, value, ttl) {
        // TODO: Implement Redis SET with expiry
        return true;
    }

    /**
     * ========================================
     * METHOD: Get Price Breakdown (for UI)
     * ========================================
     * 
     * Returns a user-friendly price breakdown for display in frontend.
     * Shows base price, each modifier, GST, and total.
     */
    async getPriceBreakdown({ userId, productId, pincode, selectedDynamicAttributes, quantity }) {
        const pricingResult = await this.resolvePrice({
            userId,
            productId,
            pincode,
            selectedDynamicAttributes,
            quantity,
        });

        const breakdown = [
            {
                label: "Base Price",
                amount: pricingResult.basePrice,
                type: "base",
            },
        ];

        pricingResult.appliedModifiers.forEach((mod, index) => {
            breakdown.push({
                label: `${mod.source} Modifier: ${mod.reason || "Pricing Adjustment"}`,
                amount: mod.afterAmount - mod.beforeAmount,
                type: "modifier",
                modifierType: mod.modifierType,
            });
        });

        breakdown.push(
            {
                label: `Subtotal (${quantity}x)`,
                amount: pricingResult.subtotal,
                type: "subtotal",
            },
            {
                label: `GST (${pricingResult.gstPercentage}%)`,
                amount: pricingResult.gstAmount,
                type: "gst",
            },
            {
                label: "Total Payable",
                amount: pricingResult.totalPayable,
                type: "total",
            }
        );

        return {
            breakdown,
            currency: pricingResult.currency,
            totalPayable: pricingResult.totalPayable,
        };
    }
}

export default new PricingService();
