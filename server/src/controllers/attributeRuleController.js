import AttributeRule from "../models/AttributeRuleSchema.js";
import AttributeType from "../models/attributeTypeModal.js";
import Product from "../models/productModal.js";

/**
 * =========================================================================
 * ATTRIBUTE RULE CONTROLLER
 * =========================================================================
 * 
 * Manages conditional attribute rules (WHEN/THEN logic)
 * 
 * ⚠️ CRITICAL: This controller handles CRUD operations ONLY
 * Rule evaluation logic is in /services/AttributeRuleEvaluator.js
 * 
 * Example Rule:
 * WHEN Paper Type = "Glossy" THEN SHOW Lamination attribute
 * WHEN Paper Type = "Matte" THEN HIDE UV Coating attribute
 */

/**
 * Validate WHEN condition
 * Ensures when.value exists in the attribute's attributeValues
 */
const validateWhenCondition = async (when) => {
    const whenAttribute = await AttributeType.findById(when.attribute);
    if (!whenAttribute) {
        return { valid: false, error: "WHEN attribute not found" };
    }

    // Validate that when.value is a valid option for this attribute
    const validValues = whenAttribute.attributeValues.map(av => av.value);
    if (!validValues.includes(when.value)) {
        return {
            valid: false,
            error: `Invalid WHEN value "${when.value}" for attribute "${whenAttribute.attributeName}". Valid values are: ${validValues.join(', ')}`
        };
    }

    return { valid: true, attribute: whenAttribute };
};

/**
 * Validate THEN actions
 * Ensures all target attributes exist and TRIGGER_PRICING has required fields
 */
const validateThenActions = async (thenActions) => {
    for (const action of thenActions) {
        // Validate target attribute exists (if specified)
        if (action.targetAttribute) {
            const targetAttr = await AttributeType.findById(action.targetAttribute);
            if (!targetAttr) {
                return {
                    valid: false,
                    error: `Target attribute ${action.targetAttribute} not found`
                };
            }
        }

        // Validate TRIGGER_PRICING action
        if (action.action === "TRIGGER_PRICING") {
            if (!action.pricingSignal || !action.pricingSignal.pricingKey) {
                return {
                    valid: false,
                    error: "TRIGGER_PRICING action requires pricingSignal with pricingKey"
                };
            }

            const validScopes = ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE"];
            if (!validScopes.includes(action.pricingSignal.scope)) {
                return {
                    valid: false,
                    error: `Invalid pricingSignal.scope "${action.pricingSignal.scope}". Must be one of: ${validScopes.join(', ')}`
                };
            }
        }
    }

    return { valid: true };
};

/**
 * Validate rule scope
 * Prevents both category AND product from being set (ambiguous scope)
 */
const validateRuleScope = (applicableCategory, applicableProduct) => {
    if (applicableCategory && applicableProduct) {
        return {
            valid: false,
            error: "Rule can apply to either category or product, not both. Please choose one scope."
        };
    }
    return { valid: true };
};

// Create new attribute rule
export const createAttributeRule = async (req, res) => {
    try {
        const {
            name,
            when,
            then,
            applicableCategory,
            applicableProduct,
            priority,
            isActive
        } = req.body;

        // Basic validation
        if (!name) {
            return res.status(400).json({ error: "Rule name is required" });
        }

        if (!when || !when.attribute || !when.value) {
            return res.status(400).json({
                error: "WHEN condition is required (attribute and value)"
            });
        }

        if (!then || !Array.isArray(then) || then.length === 0) {
            return res.status(400).json({
                error: "THEN actions are required (at least one action)"
            });
        }

        // ✅ Validate rule scope (prevent category + product conflict)
        const scopeValidation = validateRuleScope(applicableCategory, applicableProduct);
        if (!scopeValidation.valid) {
            return res.status(400).json({ error: scopeValidation.error });
        }

        // ✅ Validate WHEN condition (check value exists in attributeValues)
        const whenValidation = await validateWhenCondition(when);
        if (!whenValidation.valid) {
            return res.status(400).json({ error: whenValidation.error });
        }

        // ✅ Validate THEN actions (check targets exist and TRIGGER_PRICING is valid)
        const thenValidation = await validateThenActions(then);
        if (!thenValidation.valid) {
            return res.status(400).json({ error: thenValidation.error });
        }

        // Create rule
        const rule = await AttributeRule.create({
            name,
            when,
            then,
            applicableCategory,
            applicableProduct,
            priority: priority || 0,
            isActive: isActive !== undefined ? isActive : true
        });

        const populatedRule = await AttributeRule.findById(rule._id)
            .populate('when.attribute', 'attributeName')
            .populate('then.targetAttribute', 'attributeName')
            .populate('applicableCategory', 'name')
            .populate('applicableProduct', 'name');

        console.log(`✅ Attribute rule created: ${rule.name} (ID: ${rule._id})`);

        return res.json({
            success: true,
            message: "Attribute rule created successfully",
            data: populatedRule
        });
    } catch (err) {
        console.error("❌ CREATE ATTRIBUTE RULE ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};

// Get all attribute rules
export const getAllAttributeRules = async (req, res) => {
    try {
        console.log("📋 GET ALL ATTRIBUTE RULES - Request received");
        const { categoryId, productId, isActive, page = 1, limit = 10 } = req.query;

        const query = {};

        if (categoryId) {
            query.applicableCategory = categoryId;
        }

        if (productId) {
            query.applicableProduct = productId;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        console.log("🔍 Query:", query);

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count
        const total = await AttributeRule.countDocuments(query);

        // Get paginated rules
        const rules = await AttributeRule.find(query)
            .populate('when.attribute', 'attributeName')
            .populate('then.targetAttribute', 'attributeName')
            .populate('applicableCategory', 'name')
            .populate('applicableProduct', 'name')
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        console.log(`✅ Found ${rules.length} of ${total} attribute rules (page ${pageNum})`);

        return res.json({
            success: true,
            data: rules,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) {
        console.error("❌ GET ATTRIBUTE RULES ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};

// Get single attribute rule
export const getSingleAttributeRule = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await AttributeRule.findById(id)
            .populate('when.attribute', 'attributeName')
            .populate('then.targetAttribute', 'attributeName')
            .populate('applicableCategory', 'name')
            .populate('applicableProduct', 'name');

        if (!rule) {
            return res.status(404).json({ error: "Attribute rule not found" });
        }

        return res.json({
            success: true,
            data: rule
        });
    } catch (err) {
        console.error("❌ GET ATTRIBUTE RULE ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};

// Update attribute rule
export const updateAttributeRule = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            when,
            then,
            applicableCategory,
            applicableProduct,
            priority,
            isActive
        } = req.body;

        const rule = await AttributeRule.findById(id);
        if (!rule) {
            return res.status(404).json({ error: "Attribute rule not found" });
        }

        // ✅ Validate rule scope if being updated
        if (applicableCategory !== undefined || applicableProduct !== undefined) {
            const newCategory = applicableCategory !== undefined ? applicableCategory : rule.applicableCategory;
            const newProduct = applicableProduct !== undefined ? applicableProduct : rule.applicableProduct;

            const scopeValidation = validateRuleScope(newCategory, newProduct);
            if (!scopeValidation.valid) {
                return res.status(400).json({ error: scopeValidation.error });
            }
        }

        // ✅ Validate WHEN condition if being updated
        if (when !== undefined) {
            const whenValidation = await validateWhenCondition(when);
            if (!whenValidation.valid) {
                return res.status(400).json({ error: whenValidation.error });
            }
        }

        // ✅ Validate THEN actions if being updated
        if (then !== undefined) {
            const thenValidation = await validateThenActions(then);
            if (!thenValidation.valid) {
                return res.status(400).json({ error: thenValidation.error });
            }
        }

        // Update fields
        if (name !== undefined) rule.name = name;
        if (when !== undefined) rule.when = when;
        if (then !== undefined) rule.then = then;
        if (applicableCategory !== undefined) rule.applicableCategory = applicableCategory;
        if (applicableProduct !== undefined) rule.applicableProduct = applicableProduct;
        if (priority !== undefined) rule.priority = priority;
        if (isActive !== undefined) rule.isActive = isActive;

        await rule.save();

        const updatedRule = await AttributeRule.findById(id)
            .populate('when.attribute', 'attributeName')
            .populate('then.targetAttribute', 'attributeName')
            .populate('applicableCategory', 'name')
            .populate('applicableProduct', 'name');

        console.log(`✅ Attribute rule updated: ${updatedRule.name} (ID: ${id})`);

        return res.json({
            success: true,
            message: "Attribute rule updated successfully",
            data: updatedRule
        });
    } catch (err) {
        console.error("❌ UPDATE ATTRIBUTE RULE ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};

// Delete attribute rule
export const deleteAttributeRule = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await AttributeRule.findById(id);
        if (!rule) {
            return res.status(404).json({ error: "Attribute rule not found" });
        }

        await AttributeRule.findByIdAndDelete(id);

        console.log(`✅ Attribute rule deleted: ${rule.name} (ID: ${id})`);

        return res.json({
            success: true,
            message: "Attribute rule deleted successfully"
        });
    } catch (err) {
        console.error("❌ DELETE ATTRIBUTE RULE ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
};

// ❌ REMOVED: evaluateRules function
// Rule evaluation is now handled by /services/AttributeRuleEvaluator.js
// Use POST /api/rules/evaluate endpoint instead
