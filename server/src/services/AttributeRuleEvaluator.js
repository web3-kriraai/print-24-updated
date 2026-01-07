import AttributeRule from "../models/AttributeRuleSchema.js";
import Product from "../models/productModal.js";

/**
 * =========================================================================
 * ATTRIBUTE RULE EVALUATOR SERVICE
 * =========================================================================
 * 
 * Business logic for evaluating attribute rules at runtime.
 * Separated from controller to maintain clean architecture.
 * 
 * Used by:
 * - PDP (Product Detail Page) for dynamic attribute display
 * - Cart for rule-based validations
 * - Pricing engine for conditional pricing
 */

export default class AttributeRuleEvaluator {
    /**
     * Evaluate rules for a given context
     * 
     * @param {Object} context - Evaluation context
     * @param {string} context.productId - Product ID (optional)
     * @param {string} context.categoryId - Category ID (optional)
     * @param {Array} context.selectedAttributes - Array of { attributeId, value } (optional)
     * @returns {Promise<Object>} Evaluation result with applicable rules and effects
     */
    static async evaluate({ productId, categoryId, selectedAttributes = [] }) {
        try {
            // Validate input
            if (!productId && !categoryId) {
                throw new Error("Either productId or categoryId is required");
            }

            // If productId is provided, get the category from the product
            let effectiveCategoryId = categoryId;
            if (productId) {
                const product = await Product.findById(productId).select('category');
                if (product && product.category) {
                    effectiveCategoryId = typeof product.category === 'object'
                        ? product.category._id
                        : product.category;
                }
            }

            // Fetch applicable rules
            // Priority: Product-specific > Category-specific > Global
            const query = {
                isActive: true,
                $or: []
            };

            // Product-specific rules
            if (productId) {
                query.$or.push({ applicableProduct: productId });
            }

            // Category-specific rules
            if (effectiveCategoryId) {
                query.$or.push({ applicableCategory: effectiveCategoryId });
            }

            // Global rules (no product or category specified)
            query.$or.push({
                $and: [
                    { applicableProduct: null },
                    { applicableCategory: null }
                ]
            });

            const rules = await AttributeRule.find(query)
                .populate('when.attribute', 'attributeName')
                .populate('then.targetAttribute', 'attributeName')
                .sort({ priority: -1 }) // Higher priority first
                .lean();

            // Evaluate each rule against selected attributes
            const evaluatedRules = [];
            const effects = {
                show: [], // Attributes to show
                hide: [], // Attributes to hide
                setDefault: [], // Attributes with default values
                restrict: [], // Attributes with restricted values
                triggerPricing: [] // Pricing signals
            };

            for (const rule of rules) {
                // Check if WHEN condition is met
                const whenAttributeId = typeof rule.when.attribute === 'object'
                    ? rule.when.attribute._id.toString()
                    : rule.when.attribute.toString();

                const selectedAttr = selectedAttributes.find(
                    sa => sa.attributeId === whenAttributeId
                );

                const conditionMet = selectedAttr && selectedAttr.value === rule.when.value;

                if (conditionMet) {
                    evaluatedRules.push({
                        ruleId: rule._id,
                        ruleName: rule.name,
                        priority: rule.priority,
                        conditionMet: true
                    });

                    // Apply THEN actions
                    for (const action of rule.then) {
                        const targetAttrId = typeof action.targetAttribute === 'object'
                            ? action.targetAttribute._id.toString()
                            : action.targetAttribute?.toString();

                        switch (action.action) {
                            case 'SHOW':
                                if (targetAttrId && !effects.show.includes(targetAttrId)) {
                                    effects.show.push(targetAttrId);
                                }
                                break;

                            case 'HIDE':
                                if (targetAttrId && !effects.hide.includes(targetAttrId)) {
                                    effects.hide.push(targetAttrId);
                                }
                                break;

                            case 'SET_DEFAULT':
                                if (targetAttrId) {
                                    effects.setDefault.push({
                                        attributeId: targetAttrId,
                                        defaultValue: action.defaultValue
                                    });
                                }
                                break;

                            case 'RESTRICT_VALUES':
                                if (targetAttrId) {
                                    effects.restrict.push({
                                        attributeId: targetAttrId,
                                        allowedValues: action.allowedValues || []
                                    });
                                }
                                break;

                            case 'TRIGGER_PRICING':
                                if (action.pricingSignal) {
                                    effects.triggerPricing.push({
                                        pricingKey: action.pricingSignal.pricingKey,
                                        scope: action.pricingSignal.scope,
                                        priority: action.pricingSignal.priority || 0
                                    });
                                }
                                break;

                            default:
                                console.warn(`Unknown action type: ${action.action}`);
                        }
                    }
                }
            }

            return {
                success: true,
                evaluatedRules,
                effects,
                context: {
                    productId,
                    categoryId: effectiveCategoryId,
                    selectedAttributesCount: selectedAttributes.length
                }
            };
        } catch (error) {
            console.error("❌ Rule evaluation error:", error);
            throw error;
        }
    }

    /**
     * Get all applicable rules for a product/category (without evaluation)
     * Useful for frontend to know which rules exist
     * 
     * @param {Object} context - Context
     * @param {string} context.productId - Product ID (optional)
     * @param {string} context.categoryId - Category ID (optional)
     * @returns {Promise<Array>} List of applicable rules
     */
    static async getApplicableRules({ productId, categoryId }) {
        const query = {
            isActive: true,
            $or: []
        };

        if (productId) {
            query.$or.push({ applicableProduct: productId });
        }

        if (categoryId) {
            query.$or.push({ applicableCategory: categoryId });
        }

        query.$or.push({
            $and: [
                { applicableProduct: null },
                { applicableCategory: null }
            ]
        });

        const rules = await AttributeRule.find(query)
            .populate('when.attribute', 'attributeName')
            .populate('then.targetAttribute', 'attributeName')
            .sort({ priority: -1 })
            .lean();

        return rules;
    }
}
