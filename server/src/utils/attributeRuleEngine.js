/**
 * Pure function to evaluate attribute rules and apply actions
 * 
 * @param {Object} params
 * @param {Array} params.attributes - Array of attribute objects with _id, attributeName, etc.
 * @param {Array} params.rules - Array of rule objects with when/then structure
 * @param {Object} params.selectedValues - Object mapping attributeId -> selected value
 * @returns {Object} - Attributes with isVisible, allowedValues, and defaultValue overrides
 * 
 * Actions supported:
 * - SHOW: Make attribute visible
 * - HIDE: Hide attribute
 * - SHOW_ONLY: Show only specific values (restrict allowedValues)
 * - SET_DEFAULT: Set default value for attribute
 */
export const applyAttributeRules = ({ attributes, rules, selectedValues = {} }) => {
  // Initialize result: all attributes start visible with all values allowed
  const result = attributes.reduce((acc, attr) => {
    acc[attr._id.toString()] = {
      ...attr,
      isVisible: true,
      allowedValues: attr.attributeValues
        ? attr.attributeValues.map((av) => av.value)
        : [],
      defaultValue: attr.defaultValue || null,
      // Track if visibility was explicitly set by a rule
      visibilitySetByRule: false,
      // Track if allowedValues was restricted by a rule
      valuesRestrictedByRule: false,
      // Track quantity constraints set by rules
      quantityConstraints: null,
    };
    return acc;
  }, {});

  // Sort rules by priority (higher priority first)
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Evaluate each rule
  for (const rule of sortedRules) {
    // Check if WHEN condition is met
    const whenAttributeId =
      typeof rule.when.attribute === "object"
        ? rule.when.attribute._id.toString()
        : rule.when.attribute.toString();

    const selectedValue = selectedValues[whenAttributeId];

    // Skip if condition attribute is not selected or value doesn't match
    if (!selectedValue || selectedValue !== rule.when.value) {
      continue;
    }

    // Condition is met - apply THEN actions
    for (const action of rule.then) {
      const targetAttributeId =
        typeof action.targetAttribute === "object"
          ? action.targetAttribute._id.toString()
          : action.targetAttribute.toString();

      // Skip if target attribute doesn't exist in result
      if (!result[targetAttributeId]) {
        continue;
      }

      const targetAttr = result[targetAttributeId];

      switch (action.action) {
        case "SHOW":
          targetAttr.isVisible = true;
          targetAttr.visibilitySetByRule = true;
          break;

        case "HIDE":
          targetAttr.isVisible = false;
          targetAttr.visibilitySetByRule = true;
          break;

        case "SHOW_ONLY":
          // Restrict allowedValues to only the specified values
          if (Array.isArray(action.allowedValues) && action.allowedValues.length > 0) {
            // Filter to only include values that exist in attribute's original values
            const originalValues = targetAttr.attributeValues
              ? targetAttr.attributeValues.map((av) => av.value)
              : [];
            targetAttr.allowedValues = action.allowedValues.filter((val) =>
              originalValues.includes(val)
            );
            targetAttr.valuesRestrictedByRule = true;
          }
          break;

        case "SET_DEFAULT":
          // Set default value if provided
          if (action.defaultValue) {
            // Verify the default value exists in allowedValues
            if (
              targetAttr.allowedValues.length === 0 ||
              targetAttr.allowedValues.includes(action.defaultValue)
            ) {
              targetAttr.defaultValue = action.defaultValue;
            }
          }
          break;

        case "QUANTITY":
          // Set quantity constraints if provided
          if (action.minQuantity !== undefined ||
            action.maxQuantity !== undefined ||
            action.stepQuantity !== undefined) {
            targetAttr.quantityConstraints = {
              min: action.minQuantity,
              max: action.maxQuantity,
              step: action.stepQuantity
            };
          }
          break;

        default:
          console.warn(`Unknown action type: ${action.action}`);
      }
    }
  }

  // Handle cascading: if an attribute is hidden, reset its selected value
  // Also ensure allowedValues are properly filtered
  Object.keys(result).forEach((attrId) => {
    const attr = result[attrId];

    // If attribute is hidden, clear any selected value
    if (!attr.isVisible && selectedValues[attrId]) {
      delete selectedValues[attrId];
    }

    // If values were restricted, ensure current selection is still valid
    if (
      attr.valuesRestrictedByRule &&
      selectedValues[attrId] &&
      !attr.allowedValues.includes(selectedValues[attrId])
    ) {
      // Clear invalid selection
      delete selectedValues[attrId];
    }

    // If no allowedValues restriction, use all original values
    if (!attr.valuesRestrictedByRule && attr.attributeValues) {
      attr.allowedValues = attr.attributeValues.map((av) => av.value);
    }
  });

  return {
    attributes: Object.values(result),
    selectedValues,
  };
};
