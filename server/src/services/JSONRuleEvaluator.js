import FieldResolver from './FieldResolver.js';

/**
 * JSON Rule Evaluator Service
 * Evaluates complex conditions for combination price modifiers
 * 
 * Example condition structure:
 * {
 *   "AND": [
 *     { "field": "geo_zone", "operator": "EQUALS", "value": "FLORIDA_ZONE_ID" },
 *     { "field": "category", "operator": "EQUALS", "value": "VISITING_CARDS_ID" },
 *     {
 *       "OR": [
 *         { "field": "user_segment", "operator": "IN", "value": ["VIP", "PREMIUM"] },
 *         { "field": "quantity", "operator": "GT", "value": 1000 }
 *       ]
 *     }
 *   ]
 * }
 */

class JSONRuleEvaluator {
  constructor() {
    this.fieldResolver = new FieldResolver();
  }

  /**
   * Main evaluation method
   * @param {Object} conditions - JSON conditions (AND/OR structure)
   * @param {Object} context - Evaluation context (user, product, location, cart)
   * @returns {boolean} - Whether conditions match context
   */
  evaluate(conditions, context) {
    if (!conditions || typeof conditions !== 'object') {
      return true; // No conditions means always true
    }

    console.log(`🔍 Evaluating conditions:`, JSON.stringify(conditions, null, 2));
    console.log(`📋 Against context:`, JSON.stringify(this.sanitizeContext(context), null, 2));

    const result = this.evaluateNode(conditions, context);

    console.log(`📊 Evaluation result: ${result ? '✅ MATCHES' : '❌ NO MATCH'}`);
    return result;
  }

  /**
   * Recursively evaluate condition nodes
   */
  evaluateNode(node, context) {
    // Handle logical operators
    if (node.AND) {
      return this.evaluateAND(node.AND, context);
    }

    if (node.OR) {
      return this.evaluateOR(node.OR, context);
    }

    if (node.NOT) {
      return this.evaluateNOT(node.NOT, context);
    }

    // Handle single condition
    if (node.field && node.operator) {
      return this.evaluateSingleCondition(node, context);
    }

    // Handle nested structures
    if (typeof node === 'object') {
      // Assume it's a condition object without AND/OR wrapper
      return this.evaluateSingleCondition(node, context);
    }

    console.warn(`⚠️ Unknown condition node structure:`, node);
    return false;
  }

  /**
   * Evaluate AND conditions (all must be true)
   */
  evaluateAND(conditions, context) {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return true;
    }

    return conditions.every(condition => this.evaluateNode(condition, context));
  }

  /**
   * Evaluate OR conditions (at least one must be true)
   */
  evaluateOR(conditions, context) {
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return false;
    }

    return conditions.some(condition => this.evaluateNode(condition, context));
  }

  /**
   * Evaluate NOT condition (negation)
   */
  evaluateNOT(condition, context) {
    return !this.evaluateNode(condition, context);
  }

  /**
   * Evaluate single condition (field + operator + value)
   */
  evaluateSingleCondition(condition, context) {
    const { field, operator, value } = condition;

    // Get actual value from context
    const actualValue = this.fieldResolver.resolve(field, context);

    // Handle null/undefined actual values
    if (actualValue === null || actualValue === undefined) {
      return this.handleNullValue(operator, value);
    }

    // Evaluate based on operator
    return this.evaluateOperator(operator, actualValue, value);
  }

  /**
   * Evaluate operator comparisons
   */
  evaluateOperator(operator, actualValue, expectedValue) {
    const actual = actualValue;
    const expected = expectedValue;

    switch (operator.toUpperCase()) {
      case 'EQUALS':
        return String(actual) === String(expected);

      case 'NOT_EQUALS':
        return String(actual) !== String(expected);

      case 'IN':
        if (!Array.isArray(expected)) {
          console.warn(`⚠️ Expected value for IN operator must be array, got:`, expected);
          return false;
        }
        return expected.includes(String(actual));

      case 'NOT_IN':
        if (!Array.isArray(expected)) {
          console.warn(`⚠️ Expected value for NOT_IN operator must be array, got:`, expected);
          return false;
        }
        return !expected.includes(String(actual));

      case 'GT':
        return Number(actual) > Number(expected);

      case 'LT':
        return Number(actual) < Number(expected);

      case 'GTE':
        return Number(actual) >= Number(expected);

      case 'LTE':
        return Number(actual) <= Number(expected);

      case 'CONTAINS':
        return String(actual).includes(String(expected));

      case 'STARTS_WITH':
        return String(actual).startsWith(String(expected));

      case 'ENDS_WITH':
        return String(actual).endsWith(String(expected));

      case 'REGEX':
        try {
          const regex = new RegExp(expected);
          return regex.test(String(actual));
        } catch (error) {
          console.error(`⚠️ Invalid regex pattern:`, expected, error);
          return false;
        }

      case 'BETWEEN':
        if (!Array.isArray(expected) || expected.length !== 2) {
          console.warn(`⚠️ BETWEEN operator requires array of [min, max]`);
          return false;
        }
        return Number(actual) >= Number(expected[0]) && Number(actual) <= Number(expected[1]);

      case 'IS_NULL':
        return actual === null || actual === undefined;

      case 'IS_NOT_NULL':
        return actual !== null && actual !== undefined;

      default:
        console.warn(`⚠️ Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Handle null/undefined actual values
   */
  handleNullValue(operator, expectedValue) {
    switch (operator.toUpperCase()) {
      case 'IS_NULL':
        return true;
      case 'IS_NOT_NULL':
        return false;
      default:
        return false; // Most operators require a value
    }
  }

  /**
   * Sanitize context for logging (remove sensitive data)
   */
  sanitizeContext(context) {
    const sanitized = { ...context };

    // Remove potentially sensitive fields
    delete sanitized.user;
    delete sanitized.ipAddress;
    delete sanitized.authToken;

    // Truncate large arrays
    if (sanitized.selectedAttributes && Array.isArray(sanitized.selectedAttributes)) {
      sanitized.selectedAttributes = sanitized.selectedAttributes.slice(0, 5);
    }

    return sanitized;
  }

  /**
   * Validate condition structure (for admin UI)
   */
  validateConditions(conditions) {
    const errors = [];

    const validateNode = (node, path = '') => {
      if (!node || typeof node !== 'object') {
        errors.push(`Invalid condition at ${path}: must be an object`);
        return;
      }

      // Check for logical operators
      if (node.AND || node.OR) {
        const operator = node.AND ? 'AND' : 'OR';
        const conditions = node[operator];

        if (!Array.isArray(conditions) || conditions.length === 0) {
          errors.push(`${operator} at ${path} must have non-empty array of conditions`);
          return;
        }

        conditions.forEach((cond, index) => {
          validateNode(cond, `${path}.${operator}[${index}]`);
        });
      }
      // Check for NOT operator
      else if (node.NOT) {
        validateNode(node.NOT, `${path}.NOT`);
      }
      // Check for single condition
      else {
        // Validate field
        if (!node.field || typeof node.field !== 'string') {
          errors.push(`Missing or invalid 'field' at ${path}`);
        }

        // Validate operator
        const validOperators = [
          'EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN',
          'GT', 'LT', 'GTE', 'LTE', 'CONTAINS',
          'STARTS_WITH', 'ENDS_WITH', 'REGEX',
          'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'
        ];

        if (!node.operator || !validOperators.includes(node.operator.toUpperCase())) {
          errors.push(`Invalid operator at ${path}: ${node.operator}. Must be one of: ${validOperators.join(', ')}`);
        }

        // Validate value based on operator
        if (node.operator && ['IN', 'NOT_IN', 'BETWEEN'].includes(node.operator.toUpperCase())) {
          if (!Array.isArray(node.value)) {
            errors.push(`Operator ${node.operator} at ${path} requires array value`);
          }
        } else if (!['IS_NULL', 'IS_NOT_NULL'].includes(node.operator.toUpperCase())) {
          if (node.value === undefined || node.value === null) {
            errors.push(`Missing value for operator ${node.operator} at ${path}`);
          }
        }
      }
    };

    validateNode(conditions, 'root');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default JSONRuleEvaluator;
