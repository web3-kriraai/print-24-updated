import JSONRuleEvaluator from '../services/JSONRuleEvaluator.js';

/**
 * Validation Middleware for Combination Modifiers
 * Add this to your admin price modifier routes
 */

/**
 * Validate COMBINATION modifier conditions
 */
export const validateCombinationModifier = (req, res, next) => {
  if (req.body.appliesTo === 'COMBINATION') {
    const { conditions } = req.body;
    
    // Check if conditions exist
    if (!conditions) {
      return res.status(400).json({ 
        success: false,
        error: 'COMBINATION modifiers require conditions field',
        hint: 'Provide a JSON object with AND/OR/NOT logic'
      });
    }

    // Validate conditions structure
    const evaluator = new JSONRuleEvaluator();
    const validation = evaluator.validateConditions(conditions);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conditions structure',
        errors: validation.errors,
        hint: 'Check the condition format. Example: { AND: [{ field: "geo_zone", operator: "EQUALS", value: "ZONE_ID" }] }'
      });
    }

    console.log('✅ COMBINATION modifier conditions validated');
  }
  
  next();
};

/**
 * Validate modifier type and value
 */
export const validateModifierData = (req, res, next) => {
  const { appliesTo, modifierType, value, geoZone, userSegment, product, attributeType, attributeValue } = req.body;

  // Validate appliesTo
  const validAppliesTo = ['GLOBAL', 'ZONE', 'SEGMENT', 'PRODUCT', 'ATTRIBUTE', 'COMBINATION'];
  if (!appliesTo || !validAppliesTo.includes(appliesTo)) {
    return res.status(400).json({
      success: false,
      error: `appliesTo must be one of: ${validAppliesTo.join(', ')}`
    });
  }

  // Validate modifierType
  const validModifierTypes = ['PERCENT_INC', 'PERCENT_DEC', 'FLAT_INC', 'FLAT_DEC'];
  if (!modifierType || !validModifierTypes.includes(modifierType)) {
    return res.status(400).json({
      success: false,
      error: `modifierType must be one of: ${validModifierTypes.join(', ')}`
    });
  }

  // Validate value
  if (value === undefined || value === null || value < 0) {
    return res.status(400).json({
      success: false,
      error: 'value is required and must be >= 0'
    });
  }

  // Percentage validation
  if (modifierType.startsWith('PERCENT') && value > 100) {
    return res.status(400).json({
      success: false,
      error: 'Percentage value cannot exceed 100'
    });
  }

  // Scope-specific validations
  if (appliesTo === 'ZONE' && !geoZone) {
    return res.status(400).json({
      success: false,
      error: 'geoZone is required when appliesTo is ZONE'
    });
  }

  if (appliesTo === 'SEGMENT' && !userSegment) {
    return res.status(400).json({
      success: false,
      error: 'userSegment is required when appliesTo is SEGMENT'
    });
  }

  if (appliesTo === 'PRODUCT' && !product) {
    return res.status(400).json({
      success: false,
      error: 'product is required when appliesTo is PRODUCT'
    });
  }

  if (appliesTo === 'ATTRIBUTE' && (!attributeType || !attributeValue)) {
    return res.status(400).json({
      success: false,
      error: 'attributeType and attributeValue are required when appliesTo is ATTRIBUTE'
    });
  }

  next();
};

/**
 * Example usage in routes:
 * 
 * import { validateCombinationModifier, validateModifierData } from './validators/modifierValidation.js';
 * 
 * router.post('/price-modifiers', 
 *   validateModifierData,
 *   validateCombinationModifier, 
 *   createPriceModifier
 * );
 * 
 * router.put('/price-modifiers/:id', 
 *   validateModifierData,
 *   validateCombinationModifier, 
 *   updatePriceModifier
 * );
 */
