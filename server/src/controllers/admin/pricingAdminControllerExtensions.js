import mongoose from "mongoose";
import PriceBook from "../../models/PriceBook.js";
import PriceBookEntry from "../../models/PriceBookEntry.js";
import PriceModifier from "../../models/PriceModifier.js";
import GeoZone from "../../models/GeoZon.js";
import UserSegment from "../../models/UserSegment.js";
import AttributeType from "../../models/attributeTypeModal.js";
import Product from "../../models/productModal.js";
import PricingService from "../../services/pricing/PricingService.js";
import PriceBookViewGenerator from "../../services/pricing/PriceBookViewGenerator.js";
import ConditionEvaluator from "../../services/pricing/ConditionEvaluator.js";

/**
 * =========================================================================
 * NEW ENDPOINTS - ADVANCED PRICING FEATURES
 * =========================================================================
 */

/**
 * Generate virtual price book view with filters
 * POST /api/admin/price-books/view
 */
export const generatePriceBookView = async (req, res) => {
    try {
        const { zoneId, segmentId, productId, categoryId, priceBookId } = req.body;

        const view = await PriceBookViewGenerator.generateView({
            zoneId,
            segmentId,
            productId,
            categoryId,
            priceBookId
        });

        res.json({
            success: true,
            view,
            filters: { zoneId, segmentId, productId, categoryId, priceBookId },
            count: view.length
        });
    } catch (error) {
        console.error('Generate price book view error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Check for conflicts before updating price
 * POST /api/admin/price-books/check-conflicts
 */
export const checkPriceConflicts = async (req, res) => {
    try {
        const { zoneId, segmentId, productId, newPrice, updateLevel } = req.body;

        if (!productId || !newPrice) {
            return res.status(400).json({
                success: false,
                message: 'productId and newPrice are required'
            });
        }

        const conflicts = await PriceBookViewGenerator.detectConflicts({
            zoneId,
            segmentId,
            productId,
            newPrice,
            updateLevel: updateLevel || 'ZONE'
        });

        res.json({
            success: true,
            ...conflicts
        });
    } catch (error) {
        console.error('Check price conflicts error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Resolve price conflict
 * POST /api/admin/price-books/resolve-conflict
 */
export const resolvePriceConflict = async (req, res) => {
    try {
        const { zoneId, segmentId, productId, oldPrice, newPrice, resolution, updateLevel } = req.body;

        if (!productId || !newPrice || !resolution) {
            return res.status(400).json({
                success: false,
                message: 'productId, newPrice, and resolution are required'
            });
        }

        const result = await PriceBookViewGenerator.resolveConflict({
            zoneId,
            segmentId,
            productId,
            oldPrice,
            newPrice,
            resolution,
            updateLevel: updateLevel || 'ZONE'
        });

        res.json({
            success: result.success,
            message: result.message,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Resolve price conflict error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get price hierarchy for a product
 * GET /api/admin/price-books/hierarchy/:productId
 */
export const getPriceHierarchy = async (req, res) => {
    try {
        const { productId } = req.params;
        const { zoneId, segmentId } = req.query;

        const hierarchy = await PriceBookViewGenerator.getPriceHierarchy({
            productId,
            zoneId,
            segmentId
        });

        res.json({
            success: true,
            hierarchy,
            productId,
            context: { zoneId, segmentId }
        });
    } catch (error) {
        console.error('Get price hierarchy error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Validate modifier conditions
 * POST /api/admin/modifiers/validate-conditions
 */
export const validateModifierConditions = async (req, res) => {
    try {
        const { conditions } = req.body;

        const validation = ConditionEvaluator.validate(conditions);

        res.json({
            success: true,
            ...validation
        });
    } catch (error) {
        console.error('Validate conditions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Test modifier conditions against context
 * POST /api/admin/modifiers/test-conditions
 */
export const testModifierConditions = async (req, res) => {
    try {
        const { conditions, context } = req.body;

        if (!conditions || !context) {
            return res.status(400).json({
                success: false,
                message: 'conditions and context are required'
            });
        }

        // Build proper context
        const evaluationContext = ConditionEvaluator.buildContext(context);

        // Evaluate
        const result = ConditionEvaluator.evaluate(conditions, evaluationContext);

        res.json({
            success: true,
            matches: result,
            conditions,
            context: evaluationContext
        });
    } catch (error) {
        console.error('Test conditions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Standardized pricing resolution API (as per specification)
 * POST /api/v1/pricing/resolve
 */
export const resolvePricing = async (req, res) => {
    try {
        const { product_ids, context } = req.body;

        if (!product_ids || !Array.isArray(product_ids)) {
            return res.status(400).json({
                success: false,
                message: 'product_ids array is required'
            });
        }

        const results = await Promise.all(
            product_ids.map(async (productId) => {
                try {
                    // Step 1: Check availability
                    const product = await Product.findById(productId).lean();
                    if (!product) {
                        return {
                            product_id: productId,
                            is_available: false,
                            restriction_reason: "Product not found"
                        };
                    }

                    // Step 2: Resolve pricing
                    const pricing = await PricingService.resolvePrice({
                        productId,
                        userId: context.user_id,
                        userSegmentId: context.user_segment_id,
                        pincode: context.zip_code || context.pincode,
                        quantity: context.quantity || 1,
                        selectedDynamicAttributes: context.selected_attributes || []
                    });

                    return {
                        product_id: productId,
                        is_available: true,
                        currency: context.currency || pricing.currency || 'INR',
                        price_breakdown: {
                            base_price: pricing.basePrice,
                            price_book_source: pricing.priceBookName || 'Default',
                            modifiers_applied: pricing.appliedModifiers.map(m => ({
                                reason: m.name,
                                type: m.modifierType,
                                value: m.value,
                                impact: m.adjustment
                            })),
                            subtotal: pricing.subtotal,
                            gst: pricing.gst,
                            final_price: pricing.finalPrice
                        }
                    };
                } catch (error) {
                    console.error(`Error resolving price for ${productId}:`, error);
                    return {
                        product_id: productId,
                        is_available: false,
                        restriction_reason: error.message
                    };
                }
            })
        );

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Resolve pricing error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get hierarchical geo zones
 * GET /api/admin/geo-zones/hierarchy
 */
export const getGeoZoneHierarchy = async (req, res) => {
    try {
        const { parentId } = req.query;

        const query = {
            isActive: true
        };

        if (parentId) {
            query.parentZone = parentId;
        } else {
            query.parentZone = null; // Top-level zones
        }

        const zones = await GeoZone.find(query)
            .sort({ priority: -1, name: 1 })
            .lean();

        // For each zone, get child count
        const enrichedZones = await Promise.all(
            zones.map(async (zone) => {
                const childCount = await GeoZone.countDocuments({
                    parentZone: zone._id,
                    isActive: true
                });

                return {
                    ...zone,
                    hasChildren: childCount > 0,
                    childCount
                };
            })
        );

        res.json({
            success: true,
            zones: enrichedZones,
            parentId: parentId || null
        });
    } catch (error) {
        console.error('Get geo zone hierarchy error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get full path for a geo zone
 * GET /api/admin/geo-zones/:id/path
 */
export const getGeoZonePath = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await GeoZone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Geo zone not found'
            });
        }

        const path = await zone.getHierarchyPath();
        const ancestors = await zone.getAncestors();

        res.json({
            success: true,
            zone: {
                _id: zone._id,
                name: zone.name,
                level: zone.level,
                priority: zone.priority
            },
            path,
            ancestors: ancestors.map(a => ({
                _id: a._id,
                name: a.name,
                level: a.level
            }))
        });
    } catch (error) {
        console.error('Get geo zone path error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
