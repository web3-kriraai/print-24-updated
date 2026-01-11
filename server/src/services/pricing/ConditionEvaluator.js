import mongoose from "mongoose";

/**
 * =========================================================================
 * CONDITION EVALUATOR
 * =========================================================================
 * 
 * Evaluates complex JSON-based conditions for price modifiers.
 * Supports AND/OR logic with nested conditions.
 * 
 * Example condition structure:
 * {
 *   "AND": [
 *     { "field": "geo_zone", "operator": "IN", "value": ["zone_id_1"] },
 *     { "field": "category", "operator": "EQUALS", "value": "cat_id" },
 *     {
 *       "OR": [
 *         { "field": "user_segment", "operator": "EQUALS", "value": "vip_id" },
 *         { "field": "quantity", "operator": "GREATER_THAN", "value": 100 }
 *       ]
 *     }
 *   ]
 * }
 */

class ConditionEvaluator {
    /**
     * Main evaluation method
     * @param {Object} conditions - JSON condition structure
     * @param {Object} context - Current pricing context
     * @returns {Boolean} - Whether conditions are met
     */
    static evaluate(conditions, context) {
        if (!conditions) return true; // No conditions = always match

        // Handle AND logic
        if (conditions.AND && Array.isArray(conditions.AND)) {
            return conditions.AND.every(condition => this.evaluate(condition, context));
        }

        // Handle OR logic
        if (conditions.OR && Array.isArray(conditions.OR)) {
            return conditions.OR.some(condition => this.evaluate(condition, context));
        }

        // Handle NOT logic
        if (conditions.NOT) {
            return !this.evaluate(conditions.NOT, context);
        }

        // Single condition
        return this.evaluateSingle(conditions, context);
    }

    /**
     * Evaluate a single condition
     * @param {Object} condition - Single condition object
     * @param {Object} context - Current pricing context
     * @returns {Boolean}
     */
    static evaluateSingle(condition, context) {
        const { field, operator, value } = condition;

        if (!field || !operator) {
            console.warn('Invalid condition structure:', condition);
            return false;
        }

        const contextValue = this.getContextValue(field, context);

        return this.applyOperator(contextValue, operator, value);
    }

    /**
     * Get value from context by field name
     * @param {String} field - Field name (supports dot notation)
     * @param {Object} context - Context object
     * @returns {*} - Field value
     */
    static getContextValue(field, context) {
        // Support dot notation (e.g., "product.category")
        const parts = field.split('.');
        let value = context;

        for (const part of parts) {
            if (value === null || value === undefined) return null;
            value = value[part];
        }

        return value;
    }

    /**
     * Apply comparison operator
     * @param {*} contextValue - Value from context
     * @param {String} operator - Comparison operator
     * @param {*} conditionValue - Value to compare against
     * @returns {Boolean}
     */
    static applyOperator(contextValue, operator, conditionValue) {
        // Handle null/undefined
        if (contextValue === null || contextValue === undefined) {
            return operator === 'IS_NULL' || operator === 'NOT_EXISTS';
        }

        // Convert ObjectIds to strings for comparison
        const normalizedContext = this.normalizeValue(contextValue);
        const normalizedCondition = this.normalizeValue(conditionValue);

        switch (operator) {
            // Equality
            case 'EQUALS':
            case 'EQ':
                return normalizedContext === normalizedCondition;

            case 'NOT_EQUALS':
            case 'NEQ':
                return normalizedContext !== normalizedCondition;

            // Numeric comparisons
            case 'GREATER_THAN':
            case 'GT':
                return Number(contextValue) > Number(conditionValue);

            case 'GREATER_THAN_OR_EQUAL':
            case 'GTE':
                return Number(contextValue) >= Number(conditionValue);

            case 'LESS_THAN':
            case 'LT':
                return Number(contextValue) < Number(conditionValue);

            case 'LESS_THAN_OR_EQUAL':
            case 'LTE':
                return Number(contextValue) <= Number(conditionValue);

            // Array operations
            case 'IN':
                if (!Array.isArray(conditionValue)) {
                    console.warn('IN operator requires array value');
                    return false;
                }
                return conditionValue.map(v => this.normalizeValue(v)).includes(normalizedContext);

            case 'NOT_IN':
                if (!Array.isArray(conditionValue)) {
                    console.warn('NOT_IN operator requires array value');
                    return false;
                }
                return !conditionValue.map(v => this.normalizeValue(v)).includes(normalizedContext);

            case 'CONTAINS':
                if (Array.isArray(contextValue)) {
                    return contextValue.some(v => this.normalizeValue(v) === normalizedCondition);
                }
                return String(contextValue).includes(String(conditionValue));

            case 'NOT_CONTAINS':
                if (Array.isArray(contextValue)) {
                    return !contextValue.some(v => this.normalizeValue(v) === normalizedCondition);
                }
                return !String(contextValue).includes(String(conditionValue));

            // String operations
            case 'STARTS_WITH':
                return String(contextValue).startsWith(String(conditionValue));

            case 'ENDS_WITH':
                return String(contextValue).endsWith(String(conditionValue));

            case 'MATCHES':
                try {
                    const regex = new RegExp(conditionValue);
                    return regex.test(String(contextValue));
                } catch (e) {
                    console.warn('Invalid regex pattern:', conditionValue);
                    return false;
                }

            // Existence checks
            case 'EXISTS':
                return contextValue !== null && contextValue !== undefined;

            case 'NOT_EXISTS':
            case 'IS_NULL':
                return contextValue === null || contextValue === undefined;

            // Boolean
            case 'IS_TRUE':
                return contextValue === true;

            case 'IS_FALSE':
                return contextValue === false;

            // Range
            case 'BETWEEN':
                if (!Array.isArray(conditionValue) || conditionValue.length !== 2) {
                    console.warn('BETWEEN operator requires array of 2 values');
                    return false;
                }
                const numValue = Number(contextValue);
                return numValue >= Number(conditionValue[0]) && numValue <= Number(conditionValue[1]);

            default:
                console.warn('Unknown operator:', operator);
                return false;
        }
    }

    /**
     * Normalize value for comparison (convert ObjectIds to strings)
     * @param {*} value - Value to normalize
     * @returns {*} - Normalized value
     */
    static normalizeValue(value) {
        if (value === null || value === undefined) return value;

        // Convert ObjectId to string
        if (value instanceof mongoose.Types.ObjectId || value._bsontype === 'ObjectId') {
            return value.toString();
        }

        // Convert array of ObjectIds
        if (Array.isArray(value)) {
            return value.map(v => this.normalizeValue(v));
        }

        return value;
    }

    /**
     * Validate condition structure
     * @param {Object} conditions - Condition object to validate
     * @returns {Object} - { valid: Boolean, errors: Array }
     */
    static validate(conditions) {
        const errors = [];

        if (!conditions) {
            return { valid: true, errors: [] };
        }

        const validateRecursive = (cond, path = 'root') => {
            // Check for AND/OR/NOT
            if (cond.AND || cond.OR || cond.NOT) {
                if (cond.AND && !Array.isArray(cond.AND)) {
                    errors.push(`${path}.AND must be an array`);
                }
                if (cond.OR && !Array.isArray(cond.OR)) {
                    errors.push(`${path}.OR must be an array`);
                }

                // Recursively validate children
                if (cond.AND) {
                    cond.AND.forEach((c, i) => validateRecursive(c, `${path}.AND[${i}]`));
                }
                if (cond.OR) {
                    cond.OR.forEach((c, i) => validateRecursive(c, `${path}.OR[${i}]`));
                }
                if (cond.NOT) {
                    validateRecursive(cond.NOT, `${path}.NOT`);
                }
            } else {
                // Single condition - must have field and operator
                if (!cond.field) {
                    errors.push(`${path}: Missing 'field' property`);
                }
                if (!cond.operator) {
                    errors.push(`${path}: Missing 'operator' property`);
                }
            }
        };

        validateRecursive(conditions);

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Build context object from pricing parameters
     * @param {Object} params - Pricing parameters
     * @returns {Object} - Context object for evaluation
     */
    static buildContext(params) {
        const {
            productId,
            product,
            categoryId,
            category,
            userSegmentId,
            userSegment,
            geoZoneId,
            geoZone,
            userId,
            quantity,
            selectedAttributes,
            productType,
            subtotal,
            customFields
        } = params;

        return {
            // IDs (normalized to strings)
            product_id: this.normalizeValue(productId),
            category_id: this.normalizeValue(categoryId),
            user_segment_id: this.normalizeValue(userSegmentId),
            geo_zone_id: this.normalizeValue(geoZoneId),
            user_id: this.normalizeValue(userId),

            // Objects (for nested access)
            product,
            category,
            user_segment: userSegment,
            geo_zone: geoZone,

            // Numeric values
            quantity: Number(quantity) || 0,
            subtotal: Number(subtotal) || 0,

            // Product type
            product_type: productType,

            // Selected attributes (array)
            selected_attributes: selectedAttributes || [],

            // Custom fields
            ...(customFields || {})
        };
    }
}

export default ConditionEvaluator;
