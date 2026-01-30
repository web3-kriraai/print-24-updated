/**
 * Cartesian Product Calculator
 * 
 * Core utility for the Matrix Strategy. Generates all possible combinations
 * of attribute values and creates consistent hashes for O(1) lookups.
 * 
 * Performance: O(n1 × n2 × ... × nk) where ni is the number of values for attribute i
 */

/**
 * Generates the Cartesian product of all attribute values
 * 
 * @param {Array} attributes - Array of attribute objects
 * @param {string} attributes[].systemName - Unique identifier for the attribute
 * @param {Array<string>} attributes[].values - Possible values for this attribute
 * @returns {Array<Object>} Array of all possible combinations
 * 
 * @example
 * Input:
 * [
 *   { systemName: "material", values: ["leather", "fabric"] },
 *   { systemName: "color", values: ["red", "blue"] }
 * ]
 * 
 * Output:
 * [
 *   { material: "leather", color: "red" },
 *   { material: "leather", color: "blue" },
 *   { material: "fabric", color: "red" },
 *   { material: "fabric", color: "blue" }
 * ]
 */
export function generateCartesianProduct(attributes) {
    if (!attributes || attributes.length === 0) {
        return [];
    }

    // Filter out attributes with no values
    const validAttributes = attributes.filter(
        (attr) => attr.values && attr.values.length > 0
    );

    if (validAttributes.length === 0) {
        return [];
    }

    // Start with first attribute's values as initial combinations
    let combinations = validAttributes[0].values.map((value) => ({
        [validAttributes[0].systemName]: value,
    }));

    // Iteratively combine with remaining attributes
    for (let i = 1; i < validAttributes.length; i++) {
        const currentAttr = validAttributes[i];
        const newCombinations = [];

        for (const existingCombo of combinations) {
            for (const value of currentAttr.values) {
                newCombinations.push({
                    ...existingCombo,
                    [currentAttr.systemName]: value,
                });
            }
        }

        combinations = newCombinations;
    }

    return combinations;
}

/**
 * Generates a consistent hash string from a combination object
 * 
 * @param {Object} combination - The attribute combination
 * @param {Array<string>} attributeOrder - Ordered list of attribute systemNames
 * @returns {string} Hash string like "leather_red_matte"
 * 
 * @example
 * generateCombinationHash(
 *   { material: "leather", color: "red", finish: "matte" },
 *   ["material", "color", "finish"]
 * )
 * // Returns: "leather_red_matte"
 */
export function generateCombinationHash(combination, attributeOrder) {
    if (!combination || !attributeOrder) {
        return "";
    }

    return attributeOrder
        .map((attrName) => {
            const value = combination[attrName];
            if (!value) return "none"; // Handle missing values
            // Normalize: lowercase, replace spaces with hyphens
            return String(value).toLowerCase().replace(/\s+/g, "-");
        })
        .join("_");
}

/**
 * Generates the expected filename for an asset
 * 
 * @param {string} prefix - Naming prefix (e.g., "prod")
 * @param {string} hash - Combination hash
 * @param {string} extension - File extension (default: "jpg")
 * @returns {string} Expected filename like "prod_leather_red_matte.jpg"
 */
export function generateExpectedFilename(prefix, hash, extension = "jpg") {
    return `${prefix}_${hash}.${extension}`;
}

/**
 * Validates the combination count and returns warnings if too high
 * 
 * @param {Array} attributes - Array of attribute objects with values
 * @param {number} maxAllowed - Maximum allowed combinations (default: 1000)
 * @returns {Object} Validation result
 */
export function validateCombinationCount(attributes, maxAllowed = 1000) {
    if (!attributes || attributes.length === 0) {
        return {
            isValid: true,
            totalCombinations: 0,
            warning: null,
            breakdown: [],
        };
    }

    const breakdown = attributes.map((attr) => ({
        name: attr.systemName || attr.name,
        valueCount: attr.values?.length || 0,
    }));

    const totalCombinations = breakdown.reduce(
        (acc, attr) => acc * (attr.valueCount || 1),
        1
    );

    let warning = null;
    let isValid = true;

    if (totalCombinations > maxAllowed) {
        isValid = false;
        warning = `WARNING: ${totalCombinations.toLocaleString()} combinations exceed the maximum of ${maxAllowed.toLocaleString()}. Consider reducing attribute options.`;
    } else if (totalCombinations > maxAllowed * 0.5) {
        warning = `NOTICE: ${totalCombinations.toLocaleString()} combinations is approaching the limit of ${maxAllowed.toLocaleString()}.`;
    }

    return {
        isValid,
        totalCombinations,
        warning,
        breakdown,
        formula: breakdown.map((b) => b.valueCount).join(" × ") + ` = ${totalCombinations}`,
    };
}

/**
 * Generates adjacent combinations for preloading optimization
 * Changes one attribute at a time from the current selection
 * 
 * @param {Object} currentSelection - Current attribute values
 * @param {Array} attributes - Full attribute definitions with all values
 * @param {Array<string>} attributeOrder - Order of attributes
 * @returns {Array<Object>} Adjacent combinations to preload
 */
export function generateAdjacentCombinations(
    currentSelection,
    attributes,
    attributeOrder
) {
    const adjacent = [];

    for (const attr of attributes) {
        const currentValue = currentSelection[attr.systemName];

        for (const value of attr.values) {
            if (value !== currentValue) {
                adjacent.push({
                    ...currentSelection,
                    [attr.systemName]: value,
                });
            }
        }
    }

    return adjacent;
}

/**
 * Parses a combination hash back into an object
 * 
 * @param {string} hash - The combination hash
 * @param {Array<string>} attributeOrder - Order of attributes
 * @returns {Object} The combination object
 */
export function parseCombinationHash(hash, attributeOrder) {
    if (!hash || !attributeOrder) {
        return {};
    }

    const values = hash.split("_");
    const combination = {};

    attributeOrder.forEach((attrName, index) => {
        combination[attrName] = values[index] || "none";
    });

    return combination;
}

/**
 * Extracts attribute data from AttributeType documents for Cartesian calculation
 * 
 * @param {Array} attributeTypes - Mongoose documents from AttributeType collection
 * @returns {Array} Simplified attribute objects for calculation
 */
export function extractAttributeData(attributeTypes) {
    return attributeTypes.map((attr) => ({
        id: attr._id,
        name: attr.attributeName,
        systemName:
            attr.systemName ||
            attr.attributeName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        values: (attr.attributeValues || []).map((v) => v.value),
        displayOrder: attr.displayOrder || 0,
    }));
}

export default {
    generateCartesianProduct,
    generateCombinationHash,
    generateExpectedFilename,
    validateCombinationCount,
    generateAdjacentCombinations,
    parseCombinationHash,
    extractAttributeData,
};
