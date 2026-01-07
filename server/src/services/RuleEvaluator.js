import AttributeRule from "../models/AttributeRuleSchema.js";

/**
 * =========================================================================
 * RULE EVALUATOR SERVICE
 * =========================================================================
 * 
 * Evaluates attribute rules based on current selection context
 * 
 * Flow:
 * 1. Get applicable rules (by product/category)
 * 2. Check WHEN conditions against selected attributes
 * 3. Execute THEN actions for matching rules
 * 4. Return actions to apply (SHOW, HIDE, SET_DEFAULT, etc.)
 */

class RuleEvaluator {
    /**
     * Evaluate all applicable rules for given context
     * 
     * @param {Object} context
     * @param {String} context.productId - Product ID
     * @param {String} context.categoryId - Category ID
     * @param {Array} context.selectedAttributes - Currently selected attributes
     * @returns {Object} Actions to apply
     */
    async evaluate({ productId, categoryId, selectedAttributes = [] }) {
        try {
            // Step 1: Get applicable rules
            const rules = await this._getApplicableRules(productId, categoryId);

            if (rules.length === 0) {
                return {
                    attributesToShow: [],
                    attributesToHide: [],
                    defaultValues: {},
                    pricingSignals: []
                };
            }

            // Step 2: Evaluate each rule
            const actions = {
                attributesToShow: new Set(),
                attributesToHide: new Set(),
                showOnly: new Set(),
                defaultValues: {},
                pricingSignals: []
            };

            for (const rule of rules) {
                const matches = this._checkCondition(rule.when, selectedAttributes);

                if (matches) {
                    // Execute THEN actions
                    for (const action of rule.then) {
                        this._executeAction(action, actions);
                    }
                }
            }

            // Step 3: Process SHOW_ONLY (exclusive show)
            if (actions.showOnly.size > 0) {
                // If SHOW_ONLY is used, hide everything except those
                actions.attributesToShow = actions.showOnly;
                actions.attributesToHide.clear();
            }

            // Convert Sets to Arrays for response
            return {
                attributesToShow: Array.from(actions.attributesToShow),
                attributesToHide: Array.from(actions.attributesToHide),
                defaultValues: actions.defaultValues,
                pricingSignals: actions.pricingSignals
            };
        } catch (error) {
            console.error("Rule evaluation error:", error);
            throw error;
        }
    }

    /**
     * Get rules applicable to product or category
     */
    async _getApplicableRules(productId, categoryId) {
        const query = {
            isActive: true,
            $or: []
        };

        // Product-specific rules
        if (productId) {
            query.$or.push({ applicableProduct: productId });
        }

        // Category-specific rules
        if (categoryId) {
            query.$or.push({ applicableCategory: categoryId });
        }

        // Global rules (no product/category specified)
        query.$or.push({
            applicableProduct: { $exists: false },
            applicableCategory: { $exists: false }
        });

        const rules = await AttributeRule.find(query)
            .populate('when.attribute')
            .populate('then.targetAttribute')
            .sort({ priority: -1 }); // Higher priority first

        return rules;
    }

    /**
     * Check if WHEN condition matches current selection
     * 
     * @param {Object} when - { attribute: ObjectId, value: String }
     * @param {Array} selectedAttributes - [{ attributeType: ObjectId, value: String }]
     * @returns {Boolean}
     */
    _checkCondition(when, selectedAttributes) {
        if (!when || !when.attribute || !when.value) {
            return false;
        }

        const whenAttributeId = when.attribute._id
            ? when.attribute._id.toString()
            : when.attribute.toString();

        // Find if this attribute is selected
        const selected = selectedAttributes.find(attr => {
            const attrId = attr.attributeType?._id
                ? attr.attributeType._id.toString()
                : attr.attributeType?.toString();

            return attrId === whenAttributeId;
        });

        if (!selected) {
            return false;
        }

        // Check if value matches
        const selectedValue = selected.value || selected.pricingKey || "";
        const whenValue = when.value.toLowerCase();

        return selectedValue.toLowerCase() === whenValue;
    }

    /**
     * Execute a THEN action
     * 
     * @param {Object} action - { action: String, targetAttribute: ObjectId, ... }
     * @param {Object} actions - Accumulator object
     */
    _executeAction(action, actions) {
        const targetId = action.targetAttribute?._id
            ? action.targetAttribute._id.toString()
            : action.targetAttribute?.toString();

        switch (action.action) {
            case "SHOW":
                if (targetId) {
                    actions.attributesToShow.add(targetId);
                    actions.attributesToHide.delete(targetId);
                }
                break;

            case "HIDE":
                if (targetId) {
                    actions.attributesToHide.add(targetId);
                    actions.attributesToShow.delete(targetId);
                }
                break;

            case "SHOW_ONLY":
                // Add to showOnly set (will be processed later)
                if (action.allowedValues && Array.isArray(action.allowedValues)) {
                    action.allowedValues.forEach(attrId => {
                        actions.showOnly.add(attrId);
                    });
                }
                break;

            case "SET_DEFAULT":
                if (targetId && action.defaultValue) {
                    actions.defaultValues[targetId] = action.defaultValue;
                }
                break;

            case "TRIGGER_PRICING":
                if (action.pricingSignal) {
                    actions.pricingSignals.push({
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

    /**
     * Validate rule before saving
     * 
     * @param {Object} rule - Rule object to validate
     * @returns {Object} { valid: Boolean, errors: Array }
     */
    validateRule(rule) {
        const errors = [];

        if (!rule.name) {
            errors.push("Rule name is required");
        }

        if (!rule.when || !rule.when.attribute || !rule.when.value) {
            errors.push("WHEN condition must have attribute and value");
        }

        if (!rule.then || !Array.isArray(rule.then) || rule.then.length === 0) {
            errors.push("THEN actions are required");
        }

        // Validate each action
        if (rule.then && Array.isArray(rule.then)) {
            rule.then.forEach((action, index) => {
                if (!action.action) {
                    errors.push(`Action ${index + 1}: action type is required`);
                }

                const validActions = ["SHOW", "HIDE", "SHOW_ONLY", "SET_DEFAULT", "TRIGGER_PRICING"];
                if (action.action && !validActions.includes(action.action)) {
                    errors.push(`Action ${index + 1}: invalid action type "${action.action}"`);
                }

                // Validate action-specific requirements
                if (["SHOW", "HIDE"].includes(action.action) && !action.targetAttribute) {
                    errors.push(`Action ${index + 1}: targetAttribute is required for ${action.action}`);
                }

                if (action.action === "SET_DEFAULT" && !action.defaultValue) {
                    errors.push(`Action ${index + 1}: defaultValue is required for SET_DEFAULT`);
                }

                if (action.action === "TRIGGER_PRICING" && !action.pricingSignal) {
                    errors.push(`Action ${index + 1}: pricingSignal is required for TRIGGER_PRICING`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

export default new RuleEvaluator();
