import PriceBook from "../../models/PriceBook.js";
import PriceBookEntry from "../../models/PriceBookEntry.js";
import PriceModifier from "../../models/PriceModifier.js";
import Product from "../../models/productModal.js";
import mongoose from "mongoose";

/**
 * =========================================================================
 * PRICE BOOK VIEW GENERATOR
 * =========================================================================
 * 
 * Generates virtual price book views based on filters:
 * - Zone filtering
 * - Segment filtering
 * - Product filtering
 * 
 * Handles:
 * - Master price + zone adjustments + segment adjustments
 * - Conflict detection (when parent price changes affect children)
 * - Relative price adjustments
 */

class PriceBookViewGenerator {
    /**
     * Generate a filtered view of prices
     * @param {Object} filters - { zoneId, segmentId, productId, categoryId }
     * @returns {Array} - Array of price entries with calculated prices
     */
    static async generateView(filters = {}) {
        const { zoneId, segmentId, productId, categoryId, priceBookId } = filters;

        // Step 1: Get base query
        let query = {};
        if (priceBookId) {
            query.priceBook = priceBookId;
        }
        if (productId) {
            query.product = productId;
        }

        // Step 2: Get base price entries
        let entries = await PriceBookEntry.find(query)
            .populate({
                path: 'product',
                select: 'name image category',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .populate('priceBook', 'name currency')
            .lean();

        // Filter by category if specified
        if (categoryId) {
            entries = entries.filter(entry =>
                entry.product?.category?._id?.toString() === categoryId.toString()
            );
        }

        // Step 3: Apply modifiers to calculate virtual prices
        const enrichedEntries = await Promise.all(
            entries.map(async (entry) => {
                const virtualPrice = await this.calculateVirtualPrice({
                    basePrice: entry.basePrice,
                    productId: entry.product._id,
                    zoneId,
                    segmentId
                });

                return {
                    ...entry,
                    virtualPrice: virtualPrice.finalPrice,
                    appliedModifiers: virtualPrice.modifiers,
                    priceSource: virtualPrice.source,
                    hasOverrides: virtualPrice.hasOverrides
                };
            })
        );

        return enrichedEntries;
    }

    /**
     * Calculate virtual price with modifiers
     * @param {Object} params - { basePrice, productId, zoneId, segmentId }
     * @returns {Object} - { finalPrice, modifiers, source, hasOverrides }
     */
    static async calculateVirtualPrice({ basePrice, productId, zoneId, segmentId }) {
        let currentPrice = basePrice;
        const appliedModifiers = [];
        let source = 'master';
        let hasOverrides = false;

        // Find applicable modifiers
        const modifiers = await PriceModifier.find({
            isActive: true,
            $or: [
                { appliesTo: 'GLOBAL' },
                { appliesTo: 'ZONE', geoZone: zoneId },
                { appliesTo: 'SEGMENT', userSegment: segmentId },
                { appliesTo: 'PRODUCT', product: productId }
            ]
        }).sort({ priority: 1 }); // Lower priority first

        // Apply each modifier
        for (const modifier of modifiers) {
            // Check if modifier matches context
            const matches = this.matchesContext(modifier, { zoneId, segmentId, productId });

            if (matches) {
                const adjustment = this.calculateAdjustment(currentPrice, modifier);
                currentPrice += adjustment;

                appliedModifiers.push({
                    name: modifier.name,
                    type: modifier.modifierType,
                    value: modifier.value,
                    adjustment,
                    priority: modifier.priority
                });

                // Track source
                if (modifier.appliesTo === 'ZONE') source = 'zone';
                if (modifier.appliesTo === 'SEGMENT') {
                    source = 'segment';
                    hasOverrides = true;
                }
            }
        }

        return {
            finalPrice: Math.round(currentPrice * 100) / 100,
            modifiers: appliedModifiers,
            source,
            hasOverrides
        };
    }

    /**
     * Check if modifier matches context
     */
    static matchesContext(modifier, context) {
        const { zoneId, segmentId, productId } = context;

        switch (modifier.appliesTo) {
            case 'GLOBAL':
                return true;

            case 'ZONE':
                return modifier.geoZone?.toString() === zoneId?.toString();

            case 'SEGMENT':
                return modifier.userSegment?.toString() === segmentId?.toString();

            case 'PRODUCT':
                return modifier.product?.toString() === productId?.toString();

            default:
                return false;
        }
    }

    /**
     * Calculate price adjustment from modifier
     */
    static calculateAdjustment(basePrice, modifier) {
        switch (modifier.modifierType) {
            case 'PERCENT_INC':
                return (basePrice * modifier.value) / 100;

            case 'PERCENT_DEC':
                return -(basePrice * modifier.value) / 100;

            case 'FLAT_INC':
                return modifier.value;

            case 'FLAT_DEC':
                return -modifier.value;

            default:
                return 0;
        }
    }

    /**
     * Detect conflicts when updating a price
     * @param {Object} params - { zoneId, segmentId, productId, newPrice }
     * @returns {Object} - { hasConflict, conflicts, affectedCount }
     */
    static async detectConflicts({ zoneId, segmentId, productId, newPrice, updateLevel }) {
        const conflicts = [];
        let affectedCount = 0;

        // If updating zone price, check for segment overrides
        if (updateLevel === 'ZONE' && zoneId) {
            const segmentModifiers = await PriceModifier.find({
                appliesTo: 'SEGMENT',
                geoZone: zoneId,
                product: productId,
                isActive: true
            }).populate('userSegment', 'name');

            for (const modifier of segmentModifiers) {
                conflicts.push({
                    type: 'SEGMENT_OVERRIDE',
                    segment: modifier.userSegment,
                    modifierName: modifier.name,
                    currentAdjustment: modifier.value,
                    modifierType: modifier.modifierType,
                    message: `${modifier.userSegment.name} has a custom price adjustment in this zone`
                });
                affectedCount++;
            }
        }

        // If updating segment price, check for product-specific overrides
        if (updateLevel === 'SEGMENT' && segmentId) {
            const productModifiers = await PriceModifier.find({
                appliesTo: 'PRODUCT',
                userSegment: segmentId,
                product: productId,
                isActive: true
            });

            for (const modifier of productModifiers) {
                conflicts.push({
                    type: 'PRODUCT_OVERRIDE',
                    modifierName: modifier.name,
                    currentAdjustment: modifier.value,
                    modifierType: modifier.modifierType,
                    message: `This product has a specific price adjustment for this segment`
                });
                affectedCount++;
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            affectedCount,
            suggestedActions: conflicts.length > 0 ? [
                {
                    action: 'OVERWRITE',
                    label: 'Force Update (Delete Overrides)',
                    description: 'Set new price and remove all conflicting modifiers'
                },
                {
                    action: 'PRESERVE',
                    label: 'Preserve Overrides',
                    description: 'Update base price but keep existing modifiers'
                },
                {
                    action: 'RELATIVE',
                    label: 'Relative Adjustment',
                    description: 'Adjust all modifiers proportionally to maintain price differences'
                }
            ] : []
        };
    }

    /**
     * Resolve conflict based on chosen action
     * @param {Object} params - { zoneId, segmentId, productId, newPrice, resolution }
     * @returns {Object} - { success, message, modifiedCount }
     */
    static async resolveConflict({ zoneId, segmentId, productId, oldPrice, newPrice, resolution, updateLevel }) {
        let modifiedCount = 0;

        switch (resolution) {
            case 'OVERWRITE':
                // Delete all conflicting modifiers
                const deleteQuery = {
                    product: productId,
                    isActive: true
                };

                if (updateLevel === 'ZONE') {
                    deleteQuery.appliesTo = 'SEGMENT';
                    deleteQuery.geoZone = zoneId;
                } else if (updateLevel === 'SEGMENT') {
                    deleteQuery.appliesTo = 'PRODUCT';
                    deleteQuery.userSegment = segmentId;
                }

                const deleteResult = await PriceModifier.deleteMany(deleteQuery);
                modifiedCount = deleteResult.deletedCount;

                return {
                    success: true,
                    message: `Deleted ${modifiedCount} conflicting modifiers`,
                    modifiedCount
                };

            case 'PRESERVE':
                // Do nothing - just update the base price
                return {
                    success: true,
                    message: 'Base price updated, overrides preserved',
                    modifiedCount: 0
                };

            case 'RELATIVE':
                // Calculate delta and adjust all modifiers
                const delta = newPrice - oldPrice;
                const percentChange = (delta / oldPrice) * 100;

                const updateQuery = {
                    product: productId,
                    isActive: true
                };

                if (updateLevel === 'ZONE') {
                    updateQuery.appliesTo = 'SEGMENT';
                    updateQuery.geoZone = zoneId;
                } else if (updateLevel === 'SEGMENT') {
                    updateQuery.appliesTo = 'PRODUCT';
                    updateQuery.userSegment = segmentId;
                }

                // Get modifiers to update
                const modifiersToUpdate = await PriceModifier.find(updateQuery);

                for (const modifier of modifiersToUpdate) {
                    if (modifier.modifierType.includes('PERCENT')) {
                        // For percentage modifiers, keep the same percentage
                        // No change needed
                    } else {
                        // For flat modifiers, adjust by delta
                        modifier.value += delta;
                        await modifier.save();
                        modifiedCount++;
                    }
                }

                return {
                    success: true,
                    message: `Adjusted ${modifiedCount} modifiers relatively`,
                    modifiedCount
                };

            default:
                return {
                    success: false,
                    message: 'Invalid resolution action',
                    modifiedCount: 0
                };
        }
    }

    /**
     * Get price hierarchy for a product
     * Shows: Master → Zone → Segment → Product specific
     */
    static async getPriceHierarchy({ productId, zoneId, segmentId }) {
        const hierarchy = [];

        // 1. Master price
        const masterEntry = await PriceBookEntry.findOne({
            product: productId
        }).populate('priceBook', 'name isDefault').lean();

        if (masterEntry) {
            hierarchy.push({
                level: 'MASTER',
                source: masterEntry.priceBook.name,
                price: masterEntry.basePrice,
                isDefault: masterEntry.priceBook.isDefault
            });
        }

        // 2. Zone adjustments
        if (zoneId) {
            const zoneModifiers = await PriceModifier.find({
                appliesTo: 'ZONE',
                geoZone: zoneId,
                product: productId,
                isActive: true
            }).lean();

            for (const mod of zoneModifiers) {
                hierarchy.push({
                    level: 'ZONE',
                    source: mod.name,
                    adjustment: mod.value,
                    type: mod.modifierType,
                    priority: mod.priority
                });
            }
        }

        // 3. Segment adjustments
        if (segmentId) {
            const segmentModifiers = await PriceModifier.find({
                appliesTo: 'SEGMENT',
                userSegment: segmentId,
                product: productId,
                isActive: true
            }).lean();

            for (const mod of segmentModifiers) {
                hierarchy.push({
                    level: 'SEGMENT',
                    source: mod.name,
                    adjustment: mod.value,
                    type: mod.modifierType,
                    priority: mod.priority
                });
            }
        }

        // 4. Product-specific
        const productModifiers = await PriceModifier.find({
            appliesTo: 'PRODUCT',
            product: productId,
            isActive: true
        }).lean();

        for (const mod of productModifiers) {
            hierarchy.push({
                level: 'PRODUCT',
                source: mod.name,
                adjustment: mod.value,
                type: mod.modifierType,
                priority: mod.priority
            });
        }

        return hierarchy;
    }
}

export default PriceBookViewGenerator;
