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
     * Enhanced with detailed impact analysis
     * @param {Object} params - { zoneId, segmentId, productId, newPrice, updateLevel }
     * @returns {Object} - Detailed conflict information with before/after preview
     */
    static async detectConflicts({ zoneId, segmentId, productId, newPrice, updateLevel }) {
        const conflicts = [];
        const affectedItems = [];
        let affectedCount = 0;

        // Get product details for context
        const product = await Product.findById(productId)
            .select('name sku image')
            .lean();

        if (!product) {
            return {
                hasConflict: false,
                message: 'Product not found'
            };
        }

        // Get master price for baseline
        const masterEntry = await PriceBookEntry.findOne({
            product: productId
        }).populate('priceBook', 'name isMaster').lean();

        const masterPrice = masterEntry?.basePrice || 0;

        // ===== NEW: Check for existing entries in other price books =====
        // This detects when the same product exists in multiple price books with different prices
        const existingEntries = await PriceBookEntry.find({
            product: productId
        }).populate({
            path: 'priceBook',
            select: 'name zone segment',
            populate: [
                { path: 'zone', select: 'name' },
                { path: 'segment', select: 'name code' }
            ]
        }).lean();

        // Check if product exists in other price books with different prices
        for (const entry of existingEntries) {
            if (!entry.priceBook) continue;
            
            const priceDiff = Math.abs(entry.basePrice - newPrice);
            const percentDiff = entry.basePrice ? ((priceDiff / entry.basePrice) * 100).toFixed(2) : '0';
            
            console.log(`🔍 Checking existing entry:`, {
                priceBook: entry.priceBook.name,
                currentPrice: entry.basePrice,
                newPrice,
                priceDiff,
                percentDiff: `${percentDiff}%`,
                willConflict: priceDiff > 0.01 && parseFloat(percentDiff) > 1
            });
            
            // Only flag as conflict if price difference is significant (more than 1%)
            if (priceDiff > 0.01 && parseFloat(percentDiff) > 1) {
                affectedItems.push({
                    type: 'PRICE_BOOK_ENTRY',
                    priceBook: {
                        _id: entry.priceBook._id,
                        name: entry.priceBook.name
                    },
                    zone: entry.priceBook.zone || null,
                    segment: entry.priceBook.segment || null,
                    pricing: {
                        masterPrice,
                        currentPrice: entry.basePrice,
                        newZonePrice: newPrice,
                        priceDifference: newPrice - entry.basePrice,
                        percentageDifference: ((newPrice - entry.basePrice) / entry.basePrice * 100).toFixed(2) + '%',
                        direction: newPrice > entry.basePrice ? 'increase' : 'decrease'
                    }
                });

                conflicts.push({
                    type: 'PRICE_BOOK_ENTRY_CONFLICT',
                    priceBook: entry.priceBook.name,
                    zoneName: entry.priceBook.zone?.name || 'Global',
                    segmentName: entry.priceBook.segment?.name || 'All Users',
                    currentPrice: entry.basePrice,
                    newPrice,
                    message: `Product already exists in "${entry.priceBook.name}" with price ₹${entry.basePrice}. New price ₹${newPrice} differs by ${percentDiff}%`
                });

                affectedCount++;
            }
        }


        // If updating zone price, check for segment overrides
        if (updateLevel === 'ZONE' && zoneId) {
            // Get zone info
            const zoneInfo = await mongoose.model('GeoZone').findById(zoneId).select('name level').lean();

            // Find all segment-specific modifiers in this zone
            const segmentModifiers = await PriceModifier.find({
                appliesTo: 'SEGMENT',
                geoZone: zoneId,
                product: productId,
                isActive: true
            }).populate('userSegment', 'name code');

            // Also check price book entries for segment overrides
            const segmentBooks = await PriceBook.find({
                zone: zoneId,
                segment: { $ne: null },
                isActive: true
            }).populate('segment', 'name code');

            for (const book of segmentBooks) {
                const entry = await PriceBookEntry.findOne({
                    priceBook: book._id,
                    product: productId
                }).lean();

                if (entry) {
                    const currentPrice = entry.basePrice;
                    const priceDifference = newPrice - currentPrice;
                    const percentageDifference = ((priceDifference / currentPrice) * 100).toFixed(2);

                    affectedItems.push({
                        type: 'SEGMENT_PRICE',
                        segment: {
                            _id: book.segment._id,
                            name: book.segment.name,
                            code: book.segment.code
                        },
                        product: {
                            _id: product._id,
                            name: product.name,
                            sku: product.sku
                        },
                        zone: {
                            _id: zoneInfo._id,
                            name: zoneInfo.name,
                            level: zoneInfo.level
                        },
                        pricing: {
                            masterPrice,
                            currentPrice,
                            newZonePrice: newPrice,
                            priceDifference,
                            percentageDifference,
                            direction: priceDifference > 0 ? 'increase' : 'decrease'
                        },
                        priceBook: {
                            _id: book._id,
                            name: book.name
                        }
                    });

                    conflicts.push({
                        type: 'SEGMENT_OVERRIDE',
                        segment: book.segment,
                        currentPrice,
                        newZonePrice: newPrice,
                        priceDifference,
                        message: `${book.segment.name} has custom price of ₹${currentPrice.toFixed(2)} (${percentageDifference}% different from new zone price)`
                    });

                    affectedCount++;
                }
            }

            // Check modifiers
            for (const modifier of segmentModifiers) {
                // Calculate what the current effective price is with this modifier
                const currentEffectivePrice = this.applyModifierToPrice(masterPrice, modifier);
                const priceDifference = newPrice - currentEffectivePrice;
                const percentageDifference = ((priceDifference / currentEffectivePrice) * 100).toFixed(2);

                affectedItems.push({
                    type: 'SEGMENT_MODIFIER',
                    segment: {
                        _id: modifier.userSegment._id,
                        name: modifier.userSegment.name,
                        code: modifier.userSegment.code
                    },
                    product: {
                        _id: product._id,
                        name: product.name,
                        sku: product.sku
                    },
                    zone: {
                        _id: zoneInfo._id,
                        name: zoneInfo.name
                    },
                    modifier: {
                        _id: modifier._id,
                        name: modifier.name,
                        type: modifier.modifierType,
                        value: modifier.value
                    },
                    pricing: {
                        masterPrice,
                        currentEffectivePrice,
                        newZonePrice: newPrice,
                        priceDifference,
                        percentageDifference,
                        direction: priceDifference > 0 ? 'increase' : 'decrease'
                    }
                });

                conflicts.push({
                    type: 'SEGMENT_OVERRIDE',
                    segment: modifier.userSegment,
                    modifierName: modifier.name,
                    currentAdjustment: modifier.value,
                    modifierType: modifier.modifierType,
                    currentEffectivePrice,
                    message: `${modifier.userSegment.name} has modifier "${modifier.name}" (${modifier.modifierType} ${modifier.value})`
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
                const currentEffectivePrice = this.applyModifierToPrice(masterPrice, modifier);
                const priceDifference = newPrice - currentEffectivePrice;

                affectedItems.push({
                    type: 'PRODUCT_MODIFIER',
                    product: {
                        _id: product._id,
                        name: product.name,
                        sku: product.sku
                    },
                    modifier: {
                        _id: modifier._id,
                        name: modifier.name,
                        type: modifier.modifierType,
                        value: modifier.value
                    },
                    pricing: {
                        masterPrice,
                        currentEffectivePrice,
                        newPrice,
                        priceDifference
                    }
                });

                conflicts.push({
                    type: 'PRODUCT_OVERRIDE',
                    modifierName: modifier.name,
                    currentAdjustment: modifier.value,
                    modifierType: modifier.modifierType,
                    message: `This product has a specific price adjustment "${modifier.name}"`
                });

                affectedCount++;
            }
        }

        // Build detailed impact summary
        const impactSummary = {
            product: {
                _id: product._id,
                name: product.name,
                sku: product.sku
            },
            updateLevel,
            currentMasterPrice: masterPrice,
            newPrice,
            totalAffectedItems: affectedCount,
            affectedSegments: [...new Set(affectedItems.map(item => item.segment?.name).filter(Boolean))],
            priceRangeImpact: affectedItems.length > 0 ? {
                lowest: Math.min(...affectedItems.map(item => item.pricing.currentPrice || item.pricing.currentEffectivePrice)),
                highest: Math.max(...affectedItems.map(item => item.pricing.currentPrice || item.pricing.currentEffectivePrice)),
                newPrice
            } : null
        };

        console.log(`\n✅ Conflict Detection Complete:`, {
            productId,
            newPrice,
            hasConflict: conflicts.length > 0,
            totalConflicts: conflicts.length,
            affectedItemsCount: affectedItems.length,
            conflictTypes: conflicts.map(c => c.type)
        });

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            affectedCount,
            affectedItems,
            impactSummary,
            resolutionOptions: conflicts.length > 0 ? [
                {
                    id: 'OVERWRITE',
                    label: 'Force Overwrite',
                    description: 'Delete all child overrides and apply new price globally',
                    impact: {
                        itemsDeleted: affectedCount,
                        newUniformPrice: newPrice,
                        warning: `Will delete ${affectedCount} existing override(s) and set ₹${newPrice.toFixed(2)} for all segments`
                    }
                },
                {
                    id: 'PRESERVE',
                    label: 'Preserve Child Overrides',
                    description: 'Set new base price but keep existing child-specific prices',
                    impact: {
                        itemsPreserved: affectedCount,
                        basePrice: newPrice,
                        warning: `Will create new override while preserving ${affectedCount} existing override(s). Segments will keep their custom prices.`
                    }
                },
                {
                    id: 'RELATIVE',
                    label: 'Apply Relative Adjustment',
                    description: 'Update child prices proportionally (maintain price differences)',
                    impact: {
                        itemsAdjusted: affectedCount,
                        adjustmentType: 'proportional',
                        preview: affectedItems.slice(0, 3).map(item => {
                            const current = item.pricing.currentPrice || item.pricing.currentEffectivePrice;
                            const difference = newPrice - masterPrice;
                            const newSegmentPrice = current + difference;
                            return {
                                segment: item.segment?.name || 'Product',
                                currentPrice: current,
                                newPrice: newSegmentPrice,
                                difference
                            };
                        }),
                        warning: `Will adjust ${affectedCount} override(s) proportionally based on price difference.`
                    }
                }
            ] : []
        };
    }

    /**
     * Helper: Apply modifier to price
     */
    static applyModifierToPrice(basePrice, modifier) {
        return basePrice + this.calculateAdjustment(basePrice, modifier);
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
