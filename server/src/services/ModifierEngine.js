import PriceModifier from "../models/PriceModifier.js";
import JSONRuleEvaluator from "./JSONRuleEvaluator.js";

/**
 * =========================================================================
 * MODIFIER ENGINE SERVICE
 * =========================================================================
 * 
 * THE SINGLE SOURCE OF TRUTH for all pricing adjustments.
 * 
 * Handles:
 * - Auto-apply modifiers (ZONE, SEGMENT, PRODUCT, ATTRIBUTE) → UNIT price
 * - Promo code modifiers → SUBTOTAL
 * 
 * CRITICAL RULES:
 * - NEVER reads Product or PDP directly
 * - Only consumes resolved context
 * - Respects appliesOn field (UNIT vs SUBTOTAL)
 * - NEVER multiplies by quantity (already in subtotal)
 */

export default class ModifierEngine {
    constructor() {
        this.jsonEvaluator = new JSONRuleEvaluator();
    }
    /**
     * Evaluate and apply ALL modifiers for given context
     * 
     * @param {Object} context - Pricing context
     * @param {number} context.unitPrice - Price per unit (for UNIT modifiers)
     * @param {number} context.subtotal - Total price (unitPrice × quantity, for SUBTOTAL modifiers)
     * @param {string} context.productId - Product ID
     * @param {string} context.geoZoneId - Geo zone ID
     * @param {string} context.userSegmentId - User segment ID
     * @param {number} context.quantity - Order quantity (for context only, NOT for math)
     * @param {string[]} context.promoCodes - Promo codes to apply
     * @param {Array} context.selectedAttributes - Selected attributes
     * @returns {Promise<Object>} Applied modifiers and adjustments
     */
    static async evaluate(context) {
        try {
            // Validate required fields
            if (!context.unitPrice || context.unitPrice <= 0) {
                throw new Error("unitPrice is required and must be > 0");
            }
            if (!context.subtotal || context.subtotal <= 0) {
                throw new Error("subtotal is required and must be > 0");
            }

            const query = {
                isActive: true
            };

            // If promo codes provided, include them in query
            if (context.promoCodes && context.promoCodes.length > 0) {
                query.$or = [
                    { code: { $in: context.promoCodes.map(c => c.toUpperCase()) } },
                    { code: null }  // Auto-apply modifiers (no code required)
                ];
            } else {
                query.code = null;  // Only auto-apply modifiers
            }

            // Fetch applicable modifiers
            const modifiers = await PriceModifier.find(query)
                .sort({ priority: -1, createdAt: -1 })  // Higher priority first
                .lean();

            // Filter modifiers that match context
            const matchingModifiers = modifiers.filter(modifier => {
                const modifierDoc = new PriceModifier(modifier);
                return modifierDoc.matchesContext(context);
            });

            if (matchingModifiers.length === 0) {
                return {
                    appliedModifiers: [],
                    unitAdjustment: 0,      // Adjustment to unit price
                    subtotalAdjustment: 0,  // Adjustment to subtotal
                    totalAdjustment: 0      // Combined adjustment
                };
            }

            // Separate by application scope
            const unitModifiers = matchingModifiers.filter(m => m.appliesOn === 'UNIT');
            const subtotalModifiers = matchingModifiers.filter(m => m.appliesOn === 'SUBTOTAL');

            const appliedModifiers = [];
            let unitAdjustment = 0;
            let subtotalAdjustment = 0;

            // Apply UNIT modifiers (stackable and exclusive)
            const unitResult = this._applyModifiers(
                unitModifiers,
                context.unitPrice,
                'UNIT'
            );
            unitAdjustment = unitResult.adjustment;
            appliedModifiers.push(...unitResult.modifiers);

            // Apply SUBTOTAL modifiers (stackable and exclusive)
            const subtotalResult = this._applyModifiers(
                subtotalModifiers,
                context.subtotal,
                'SUBTOTAL'
            );
            subtotalAdjustment = subtotalResult.adjustment;
            appliedModifiers.push(...subtotalResult.modifiers);

            // Calculate total adjustment
            // Unit adjustments multiply by quantity, subtotal adjustments don't
            const totalAdjustment = (unitAdjustment * context.quantity) + subtotalAdjustment;

            return {
                appliedModifiers,
                unitAdjustment: Math.round(unitAdjustment * 100) / 100,
                subtotalAdjustment: Math.round(subtotalAdjustment * 100) / 100,
                totalAdjustment: Math.round(totalAdjustment * 100) / 100
            };
        } catch (error) {
            console.error("❌ Modifier evaluation error:", error);
            throw error;
        }
    }

    /**
     * Apply modifiers with stackable/exclusive logic
     * @private
     */
    static _applyModifiers(modifiers, baseAmount, appliesOn) {
        const stackableModifiers = modifiers.filter(m => m.isStackable);
        const exclusiveModifiers = modifiers.filter(m => !m.isStackable);

        let modifiersToApply = [...stackableModifiers];

        // Apply best exclusive modifier (highest absolute adjustment based on baseAmount)
        // Note: For exclusive selection, we still compare against baseAmount to determine "best"
        // This is a design choice: Pre-calculate potential values to pick winner.
        if (exclusiveModifiers.length > 0) {
            let bestExclusiveModifier = null;
            let bestExclusiveAdjustment = 0;

            for (const modifier of exclusiveModifiers) {
                const modifierDoc = new PriceModifier(modifier);
                // Calculate conceptual adjustment on baseAmount to determine "strength"
                const adjustment = modifierDoc.calculateAdjustment(baseAmount);

                if (Math.abs(adjustment) > Math.abs(bestExclusiveAdjustment)) {
                    bestExclusiveAdjustment = adjustment;
                    bestExclusiveModifier = modifier;
                }
            }

            if (bestExclusiveModifier) {
                modifiersToApply.push(bestExclusiveModifier);
            }
        }

        // Sort by priority (Ascending relative to application? Or Descending?)
        // Admin VPB Service sorts by (a.priority - b.priority) -> Ascending (0, 10, 20...)
        // ModifierEngine fetched with sort({ priority: -1 }) -> Descending (30, 20, 10...)
        // To match Admin calculation ORDER (10%, 30%, -50% => Priority 30, 20, 10?), 
        // If Admin sorts ASC, then Low Priority applies first.
        // If Model says "higher = stronger", usually that means Higher Priority OVERRIDES lower, or applies LAST?
        // Let's assume we want to apply in ASCENDING priority order for stability (Base -> Mod -> Stronger Mod).
        // Or if the Admin screenshot example (10% -> 30% -> -50%) implied a specific order.
        // Let's sort ASCENDING for application loop.

        modifiersToApply.sort((a, b) => (a.priority || 0) - (b.priority || 0));

        const appliedModifiers = [];
        let currentAmount = baseAmount;

        for (const modifier of modifiersToApply) {
            const modifierDoc = new PriceModifier(modifier);

            // Compounding: Calculate adjustment based on CURRENT amount
            const adjustment = modifierDoc.calculateAdjustment(currentAmount);

            appliedModifiers.push({
                _id: modifier._id,
                name: modifier.name || `${modifier.appliesTo} ${modifier.modifierType}`,
                code: modifier.code,
                type: modifier.modifierType,
                value: modifier.value,
                applied: adjustment,
                appliesOn,
                stackable: modifier.isStackable !== false,
                beforeAmount: currentAmount,
                afterAmount: currentAmount + adjustment
            });

            currentAmount += adjustment;
        }

        return {
            adjustment: currentAmount - baseAmount,
            modifiers: appliedModifiers
        };
    }

    /**
     * Get all active modifiers (for admin preview)
     */
    static async getActiveModifiers(filters = {}) {
        const query = {
            isActive: true,
            ...filters
        };

        return await PriceModifier.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .lean();
    }

    /**
     * Validate modifier before creation/update
     */
    static validateModifier(modifierData) {
        const errors = [];

        // Required fields
        if (!modifierData.appliesTo || !['GLOBAL', 'ZONE', 'SEGMENT', 'PRODUCT', 'ATTRIBUTE'].includes(modifierData.appliesTo)) {
            errors.push("appliesTo must be one of: GLOBAL, ZONE, SEGMENT, PRODUCT, ATTRIBUTE");
        }

        if (!modifierData.modifierType || !['PERCENT_INC', 'PERCENT_DEC', 'FLAT_INC', 'FLAT_DEC'].includes(modifierData.modifierType)) {
            errors.push("modifierType must be one of: PERCENT_INC, PERCENT_DEC, FLAT_INC, FLAT_DEC");
        }

        if (modifierData.value === undefined || modifierData.value < 0) {
            errors.push("value is required and must be >= 0");
        }

        // Percentage validation
        if (modifierData.modifierType && modifierData.modifierType.startsWith('PERCENT') && modifierData.value > 100) {
            errors.push("PERCENT value cannot exceed 100");
        }

        // Date validation
        if (modifierData.validFrom && modifierData.validTo) {
            const from = new Date(modifierData.validFrom);
            const to = new Date(modifierData.validTo);

            if (from >= to) {
                errors.push("validFrom must be before validTo");
            }
        }

        // Scope validation
        if (modifierData.appliesTo === 'ZONE' && !modifierData.geoZone) {
            errors.push("geoZone is required when appliesTo is ZONE");
        }

        if (modifierData.appliesTo === 'SEGMENT' && !modifierData.userSegment) {
            errors.push("userSegment is required when appliesTo is SEGMENT");
        }

        if (modifierData.appliesTo === 'PRODUCT' && !modifierData.product) {
            errors.push("product is required when appliesTo is PRODUCT");
        }

        if (modifierData.appliesTo === 'ATTRIBUTE' && (!modifierData.attributeType || !modifierData.attributeValue)) {
            errors.push("attributeType and attributeValue are required when appliesTo is ATTRIBUTE");
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Increment usage count for applied modifiers
     */
    static async incrementUsage(modifierIds) {
        if (!modifierIds || modifierIds.length === 0) return;

        await PriceModifier.updateMany(
            { _id: { $in: modifierIds } },
            { $inc: { usedCount: 1 } }
        );
    }
}
