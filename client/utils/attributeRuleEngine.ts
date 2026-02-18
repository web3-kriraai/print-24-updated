/**
 * Pure function to evaluate attribute rules and apply actions
 * Client-side version of backend rule engine
 */

export interface AttributeRule {
  _id: string;
  name: string;
  when: {
    isQuantityCondition?: boolean;
    attribute?: string | { _id: string; attributeName: string };
    value?: string;
    minQuantity?: number;
    maxQuantity?: number;
  };
  then: Array<{
    action: "SHOW" | "HIDE" | "SHOW_ONLY" | "SET_DEFAULT" | "QUANTITY";
    targetAttribute: string | { _id: string; attributeName: string };
    allowedValues?: string[];
    defaultValue?: string;
    minQuantity?: number;
    maxQuantity?: number;
    stepQuantity?: number;
  }>;
  priority: number;
}

export interface Attribute {
  _id: string;
  attributeName: string;
  attributeValues?: Array<{
    value: string;
    label: string;
    priceMultiplier?: number;
    image?: string;
    hasSubAttributes?: boolean;
  }>;
  defaultValue?: string;
  placeholder?: string;
  [key: string]: any;
}

export const applyAttributeRules = ({
  attributes,
  rules,
  selectedValues = {},
  quantity = 0,
}: {
  attributes: Attribute[];
  rules: AttributeRule[];
  selectedValues?: Record<string, string | number | boolean | File | any[] | null>;
  quantity?: number;
}): {
  attributes: Array<Attribute & { isVisible: boolean; allowedValues: string[] | null; defaultValue: string | null; quantityConstraints?: { min?: number; max?: number; step?: number } | null }>;
  selectedValues: Record<string, string | number | boolean | File | any[] | null>;
} => {
  // Initialize result: all attributes start visible with all values allowed
  const result = attributes.reduce((acc, attr) => {
    acc[attr._id.toString()] = {
      ...attr,
      isVisible: true,
      allowedValues: attr.attributeValues
        ? attr.attributeValues.map((av) => av.value)
        : [],
      defaultValue: attr.defaultValue || null,
      visibilitySetByRule: false,
      valuesRestrictedByRule: false,
      quantityConstraints: null,
    };
    return acc;
  }, {} as Record<string, any>);

  // Sort rules by priority (higher priority first)
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Evaluate each rule
  for (const rule of sortedRules) {
    // Skip if rule or when condition is invalid
    if (!rule || !rule.when) {
      console.warn('Skipping invalid rule:', rule);
      continue;
    }

    let conditionMet = false;

    if (rule.when.isQuantityCondition) {
      const min = rule.when.minQuantity !== undefined ? rule.when.minQuantity : 0;
      const max = rule.when.maxQuantity !== undefined ? rule.when.maxQuantity : Infinity;
      if (quantity >= min && quantity <= max) {
        conditionMet = true;
      }
    } else {
      // Check if attribute-based condition attribute exists
      if (rule.when.attribute) {
        const whenAttributeId =
          typeof rule.when.attribute === "object"
            ? rule.when.attribute._id?.toString()
            : rule.when.attribute.toString();

        if (whenAttributeId) {
          const selectedValue = selectedValues[whenAttributeId];
          // Check if condition value matches selected value
          if (selectedValue && String(selectedValue) === rule.when.value) {
            conditionMet = true;
          }
        }
      }
    }

    // Skip if condition is not met
    if (!conditionMet) {
      continue;
    }

    // Condition is met - apply THEN actions
    for (const action of rule.then) {
      // Skip if action or targetAttribute is invalid
      if (!action || !action.targetAttribute) {
        console.warn('Skipping invalid action:', action);
        continue;
      }

      const targetAttributeId =
        typeof action.targetAttribute === "object"
          ? action.targetAttribute._id?.toString()
          : action.targetAttribute.toString();

      // Skip if target attribute doesn't exist in result or ID couldn't be resolved
      if (!targetAttributeId || !result[targetAttributeId]) {
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
              ? targetAttr.attributeValues.map((av: any) => av.value)
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
      !attr.allowedValues.includes(String(selectedValues[attrId]))
    ) {
      // Clear invalid selection
      delete selectedValues[attrId];
    }

    // If no allowedValues restriction, use all original values
    if (!attr.valuesRestrictedByRule && attr.attributeValues) {
      attr.allowedValues = attr.attributeValues.map((av: any) => av.value);
    }
  });

  return {
    attributes: Object.values(result),
    selectedValues,
  };
};
