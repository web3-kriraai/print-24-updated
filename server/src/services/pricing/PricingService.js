import PricingResolver from "./PricingResolver.js";
import PricingCalculationLog from "../../models/PricingCalculationLogschema.js";
import { User } from "../../models/User.js";
import Product from "../../models/productModal.js";
import UserSegment from "../../models/UserSegment.js";
import { PricingCache } from "../../config/redis.js";
import ModifierEngine from "../ModifierEngine.js";
import VirtualPriceBookService from "../VirtualPriceBookService.js";
import CurrencyConversionService from "../CurrencyConversionService.js";

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
 * - Use Redis for caching (format: PRICE::{PRODUCT_ID}::{USER_SEGMENT}::{GEO_ZONE}::{QUANTITY})
 */

class PricingService {
    constructor() {
        this.virtualPriceBookService = new VirtualPriceBookService();
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
        userPreferredCurrency = null, // NEW: Optional currency conversion
        needDesigner = false,
        designerType = null,
        visitType = 'Office',
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

            // Step 2: Resolve GeoZone AND Zone Hierarchy
            // Import GeoZoneHierarchyService at the top if not already imported
            const GeoZoneHierarchyService = (await import('../GeoZoneHierarchyService.js')).default;

            // NEW: Resolve full zone hierarchy for hierarchical pricing FIRST
            let geoZoneHierarchy = [];
            if (pincode) {
                geoZoneHierarchy = await GeoZoneHierarchyService.resolveZoneHierarchy(pincode);
            }

            // Use most specific zone from hierarchy (index 0) for currency and zone info
            // This ensures SURAT (more specific) is used instead of West Zone (broader)
            const geoZone = geoZoneHierarchy[0] || await PricingResolver.getGeoZoneByPincode(pincode);
            const geoZoneId = geoZone?._id || null;

            // Step 3: Check Redis Cache
            if (cacheResults) {
                const cacheKey = PricingCache.generateKey(
                    productId,
                    resolvedUserSegmentId,
                    geoZoneId,
                    quantity
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
                product: product, // pass full product to avoid re-fetch
                geoZoneHierarchy: geoZoneHierarchy // NEW: Pass hierarchy for hierarchical pricing
            };

            const virtualResult = await this.virtualPriceBookService.calculateVirtualPrice(
                productId,
                geoZoneId,
                resolvedUserSegmentId,
                contextOverride
            );

            if (!virtualResult.isAvailable) {
                return {
                    success: false,
                    isAvailable: false,
                    availabilityReason: virtualResult.availabilityReason || "Product not available in this region",
                    message: virtualResult.availabilityReason || "Price not set",
                    productId,
                    calculatedAt: new Date()
                };
            }

            // Step 6: Calculate Totals
            const unitPrice = virtualResult.finalPrice;
            const baseSubtotal = this.roundPrice(unitPrice * quantity);

            // Step 6.5: Add attribute-level priceAdd charges
            // `priceAdd` on each selectedDynamicAttribute is a per-unit charge (set in product config).
            // The frontend multiplies priceAdd × quantity for each attribute.  We match that here.
            const attrChargesTotal = Array.isArray(selectedDynamicAttributes)
                ? this.roundPrice(
                    selectedDynamicAttributes.reduce(
                        (sum, attr) => sum + ((parseFloat(attr.priceAdd) || 0) * quantity),
                        0
                    )
                )
                : 0;
            let subtotal = this.roundPrice(baseSubtotal + attrChargesTotal);

            // Step 6.6: Add Designer Fee if requested
            if (needDesigner) {
                let designerFee = 0;

                if (designerType === 'visual') {
                    designerFee = product.additionalDesignCharge || 500;
                } else if (designerType === 'physical') {
                    // Physical Visit Pricing
                    const baseVisitCharge = 500;
                    const homeVisitTravelCharge = 500;

                    if (visitType === 'Home') {
                        designerFee = baseVisitCharge + homeVisitTravelCharge; // ₹1000
                    } else {
                        designerFee = baseVisitCharge; // ₹500
                    }
                }

                subtotal = this.roundPrice(subtotal + designerFee);
                console.log(`🎨 Added Designer Fee: ${designerFee} (Type: ${designerType}, Visit: ${visitType})`);
            }

            // Step 7: Calculate GST
            const gstAmount = this.roundPrice((subtotal * gstPercentage) / 100);
            const totalPayable = this.roundPrice(subtotal + gstAmount);

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
                    source: adj.appliesTo || adj.type || 'MODIFIER',
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
                date: new Date(),
                isVirtual: true,
                // NEW: Propagate hierarchy metadata from VirtualPriceBookService
                usedZoneId: virtualResult.usedZoneId,
                usedZoneName: virtualResult.usedZoneName,
                usedZoneLevel: virtualResult.usedZoneLevel,
                geoZoneHierarchy: virtualResult.geoZoneHierarchy || contextOverride.geoZoneHierarchy || []
            };


            // Step 8.5: Automatic Currency Conversion (PriceBook → GeoZone)
            console.log(`🌍 GeoZone for currency conversion:`, {
                zoneName: geoZone?.name,
                zoneLevel: geoZone?.level,
                currency: geoZone?.currency,
                currency_code: geoZone?.currency_code,
                fullZone: geoZone
            });

            const zoneCurrency = geoZone?.currency_code || geoZone?.currency || "INR";
            console.log(`💱 Zone Currency extracted: ${zoneCurrency}`);

            // Fetch the used PriceBook to get its currency
            let priceBookCurrency = "INR"; // Default to INR (base currency for most price books)
            if (virtualResult.masterBook) {
                try {
                    const { default: PriceBook } = await import('../../models/PriceBook.js');
                    const priceBook = await PriceBook.findById(virtualResult.masterBook);
                    if (priceBook && priceBook.currency) {
                        priceBookCurrency = priceBook.currency;
                    }
                    console.log(`📚 PriceBook Currency: ${priceBookCurrency} | Zone Currency: ${zoneCurrency}`);
                } catch (err) {
                    console.error('⚠️ Failed to fetch PriceBook currency:', err.message);
                }
            }


            // Convert if PriceBook currency differs from Zone currency
            if (priceBookCurrency !== zoneCurrency) {
                try {
                    console.log(`💱 Converting price: ${priceBookCurrency} → ${zoneCurrency}`);

                    const conversion = await CurrencyConversionService.convertPrice(
                        result.totalPayable,
                        priceBookCurrency,
                        zoneCurrency
                    );

                    // Convert ALL amounts to zone currency
                    const rate = conversion.exchangeRate;
                    result.basePrice = this.roundPrice(result.basePrice * rate);
                    result.unitPrice = this.roundPrice(result.unitPrice * rate);
                    result.subtotal = this.roundPrice(result.subtotal * rate);
                    result.gstAmount = this.roundPrice(result.gstAmount * rate);
                    result.totalPayable = this.roundPrice(result.totalPayable * rate);

                    // Store conversion info for transparency
                    result.currencyConversion = {
                        originalCurrency: priceBookCurrency,
                        convertedCurrency: zoneCurrency,
                        exchangeRate: conversion.exchangeRate,
                        timestamp: conversion.timestamp,
                        source: conversion.source
                    };

                    console.log(`✅ Converted: ${priceBookCurrency} ${(result.totalPayable / rate).toFixed(2)} → ${zoneCurrency} ${result.totalPayable.toFixed(2)} (Rate: ${rate})  `);
                } catch (error) {
                    console.error('❌ Currency conversion failed:', error.message);
                    // Continue with original currency if conversion fails
                    result.currencyConversionError = error.message;
                }
            }

            // Update result currency to zone currency (after conversion)
            result.currency = zoneCurrency;


            // Step 9: Cache Result
            if (cacheResults) {
                const cacheKey = PricingCache.generateKey(
                    productId,
                    resolvedUserSegmentId,
                    geoZoneId,
                    quantity
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
        needDesigner = false,
        designerType = null,
        visitType = 'Office',
        shippingCost = 0,
    }) {
        const pricingResult = await this.resolvePrice({
            userId,
            productId,
            pincode,
            selectedDynamicAttributes,
            quantity,
            needDesigner,
            designerType,
            visitType,
            cacheResults: false, // Don't cache snapshots
        });

        if (pricingResult.success === false) {
            throw new Error(pricingResult.message || "Pricing unavailable for snapshot");
        }

        // Create immutable snapshot object
        const snapshot = {
            basePrice: pricingResult.basePrice,
            unitPrice: pricingResult.unitPrice,
            quantity: pricingResult.quantity,
            appliedModifiers: pricingResult.appliedModifiers.map((mod) => ({
                pricingKey: mod.pricingKey || `MOD-${mod.modifierId || (Math.random().toString(36).substring(7))}`,
                modifierType: mod.modifierType,
                value: mod.value,
                source: mod.source,
                modifierId: mod.modifierId || null,
                beforeAmount: mod.beforeAmount || 0,
                afterAmount: mod.afterAmount || 0,
                reason: mod.reason || "",
            })),
            subtotal: pricingResult.subtotal,
            gstPercentage: pricingResult.gstPercentage,
            gstAmount: pricingResult.gstAmount,
            shippingCost: shippingCost,
            totalPayable: pricingResult.totalPayable + shippingCost,
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
                pricingKey: mod.pricingKey || `MOD-${mod.modifierId || (Math.random().toString(36).substring(7))}`,
                modifier: mod.modifierId || null,
                scope: mod.source || "GLOBAL",
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

        if (pricingResult.success === false) {
            return {
                success: false,
                breakdown: [],
                message: pricingResult.message || "Breakdown unavailable",
                isAvailable: false
            };
        }

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

    /**
     * Helper to round price to 2 decimal places
     */
    roundPrice(price) {
        return Math.round((price + Number.EPSILON) * 100) / 100;
    }
}

export default new PricingService();
