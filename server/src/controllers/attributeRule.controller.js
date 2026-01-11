import AttributeRule from "../models/AttributeRuleSchema.js";
import AttributeType from "../models/attributeTypeModal.js";
import Product from "../models/productModal.js";
import Category from "../models/categoryModal.js";

/**
 * POST /admin/attribute-rules
 * Create a new attribute rule
 */
export const createAttributeRule = async (req, res) => {
  try {
    const { name, when, then, applicableCategory, applicableProduct, priority, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Rule name is required" });
    }

    if (!when || !when.attribute || !when.value) {
      return res.status(400).json({ error: "WHEN condition (attribute and value) is required" });
    }

    if (!then || !Array.isArray(then) || then.length === 0) {
      return res.status(400).json({ error: "THEN actions array is required and must not be empty" });
    }

    // Validate when.attribute exists
    const whenAttribute = await AttributeType.findById(when.attribute);
    if (!whenAttribute) {
      return res.status(400).json({ error: "WHEN attribute not found" });
    }

    // Validate then actions
    for (const action of then) {
      if (!action.action || !action.targetAttribute) {
        return res.status(400).json({
          error: "Each THEN action must have 'action' and 'targetAttribute' fields",
        });
      }

      if (!["SHOW", "HIDE", "SHOW_ONLY", "SET_DEFAULT"].includes(action.action)) {
        return res.status(400).json({
          error: `Invalid action type: ${action.action}. Must be one of: SHOW, HIDE, SHOW_ONLY, SET_DEFAULT`,
        });
      }

      // Validate targetAttribute exists
      const targetAttribute = await AttributeType.findById(action.targetAttribute);
      if (!targetAttribute) {
        return res.status(400).json({
          error: `Target attribute not found for action: ${action.action}`,
        });
      }

      // Validate SHOW_ONLY has allowedValues
      if (action.action === "SHOW_ONLY" && (!action.allowedValues || !Array.isArray(action.allowedValues))) {
        return res.status(400).json({
          error: "SHOW_ONLY action requires 'allowedValues' array",
        });
      }

      // Validate SET_DEFAULT has defaultValue
      if (action.action === "SET_DEFAULT" && !action.defaultValue) {
        return res.status(400).json({
          error: "SET_DEFAULT action requires 'defaultValue'",
        });
      }
    }

    // Validate applicableCategory if provided
    if (applicableCategory) {
      const category = await Category.findById(applicableCategory);
      if (!category) {
        return res.status(400).json({ error: "Applicable category not found" });
      }
    }

    // Validate applicableProduct if provided
    if (applicableProduct) {
      const product = await Product.findById(applicableProduct);
      if (!product) {
        return res.status(400).json({ error: "Applicable product not found" });
      }
    }

    // Cannot have both applicableCategory and applicableProduct
    if (applicableCategory && applicableProduct) {
      return res.status(400).json({
        error: "Rule cannot be applicable to both category and product. Choose one.",
      });
    }

    const rule = await AttributeRule.create({
      name,
      when: {
        attribute: when.attribute,
        value: when.value,
      },
      then: then.map((action) => ({
        action: action.action,
        targetAttribute: action.targetAttribute,
        allowedValues: action.allowedValues || [],
        defaultValue: action.defaultValue || null,
      })),
      applicableCategory: applicableCategory || null,
      applicableProduct: applicableProduct || null,
      priority: priority !== undefined ? priority : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    // Populate references
    const populatedRule = await AttributeRule.findById(rule._id)
      .populate({
        path: "when.attribute",
        select: "_id attributeName",
      })
      .populate({
        path: "then.targetAttribute",
        select: "_id attributeName",
      })
      .populate({
        path: "applicableCategory",
        select: "_id name",
      })
      .populate({
        path: "applicableProduct",
        select: "_id name",
      })
      .lean();

    return res.status(201).json({
      success: true,
      message: "Attribute rule created successfully",
      data: populatedRule,
    });
  } catch (err) {
    console.error("Error creating attribute rule:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    return res.status(500).json({ error: err.message || "Failed to create attribute rule" });
  }
};

/**
 * GET /admin/attribute-rules
 * Get all attribute rules (with optional filters)
 */
export const getAllAttributeRules = async (req, res) => {
  try {
    const { categoryId, productId, isActive } = req.query;

    const query = {};

    if (categoryId) {
      query.applicableCategory = categoryId;
    }

    if (productId) {
      query.applicableProduct = productId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    const rules = await AttributeRule.find(query)
      .populate({
        path: "when.attribute",
        select: "_id attributeName",
      })
      .populate({
        path: "then.targetAttribute",
        select: "_id attributeName",
      })
      .populate({
        path: "applicableCategory",
        select: "_id name",
      })
      .populate({
        path: "applicableProduct",
        select: "_id name",
      })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.json(rules);
  } catch (err) {
    console.error("Error fetching attribute rules:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch attribute rules" });
  }
};

/**
 * PUT /admin/attribute-rules/:id
 * Update an attribute rule
 */
export const updateAttributeRule = async (req, res) => {
  try {
    const ruleId = req.params.id;
    const { name, when, then, applicableCategory, applicableProduct, priority, isActive } = req.body;

    if (!ruleId) {
      return res.status(400).json({ error: "Rule ID is required" });
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID format" });
    }

    const existingRule = await AttributeRule.findById(ruleId);
    if (!existingRule) {
      return res.status(404).json({ error: "Attribute rule not found" });
    }

    if (!name) {
      return res.status(400).json({ error: "Rule name is required" });
    }

    if (!when || !when.attribute || !when.value) {
      return res.status(400).json({ error: "WHEN condition (attribute and value) is required" });
    }

    if (!then || !Array.isArray(then) || then.length === 0) {
      return res.status(400).json({ error: "THEN actions array is required and must not be empty" });
    }

    // Validate when.attribute exists
    const whenAttribute = await AttributeType.findById(when.attribute);
    if (!whenAttribute) {
      return res.status(400).json({ error: "WHEN attribute not found" });
    }

    // Validate then actions
    for (const action of then) {
      if (!action.action || !action.targetAttribute) {
        return res.status(400).json({
          error: "Each THEN action must have 'action' and 'targetAttribute' fields",
        });
      }

      if (!["SHOW", "HIDE", "SHOW_ONLY", "SET_DEFAULT"].includes(action.action)) {
        return res.status(400).json({
          error: `Invalid action type: ${action.action}. Must be one of: SHOW, HIDE, SHOW_ONLY, SET_DEFAULT`,
        });
      }

      // Validate targetAttribute exists
      const targetAttribute = await AttributeType.findById(action.targetAttribute);
      if (!targetAttribute) {
        return res.status(400).json({
          error: `Target attribute not found for action: ${action.action}`,
        });
      }

      // Validate SHOW_ONLY has allowedValues
      if (action.action === "SHOW_ONLY" && (!action.allowedValues || !Array.isArray(action.allowedValues))) {
        return res.status(400).json({
          error: "SHOW_ONLY action requires 'allowedValues' array",
        });
      }

      // Validate SET_DEFAULT has defaultValue
      if (action.action === "SET_DEFAULT" && !action.defaultValue) {
        return res.status(400).json({
          error: "SET_DEFAULT action requires 'defaultValue'",
        });
      }
    }

    // Validate applicableCategory if provided
    if (applicableCategory) {
      const category = await Category.findById(applicableCategory);
      if (!category) {
        return res.status(400).json({ error: "Applicable category not found" });
      }
    }

    // Validate applicableProduct if provided
    if (applicableProduct) {
      const product = await Product.findById(applicableProduct);
      if (!product) {
        return res.status(400).json({ error: "Applicable product not found" });
      }
    }

    // Cannot have both applicableCategory and applicableProduct
    if (applicableCategory && applicableProduct) {
      return res.status(400).json({
        error: "Rule cannot be applicable to both category and product. Choose one.",
      });
    }

    const updatedRule = await AttributeRule.findByIdAndUpdate(
      ruleId,
      {
        name,
        when: {
          attribute: when.attribute,
          value: when.value,
        },
        then: then.map((action) => ({
          action: action.action,
          targetAttribute: action.targetAttribute,
          allowedValues: action.allowedValues || [],
          defaultValue: action.defaultValue || null,
        })),
        applicableCategory: applicableCategory || null,
        applicableProduct: applicableProduct || null,
        priority: priority !== undefined ? priority : 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      { new: true }
    );

    // Populate references
    const populatedRule = await AttributeRule.findById(updatedRule._id)
      .populate({
        path: "when.attribute",
        select: "_id attributeName",
      })
      .populate({
        path: "then.targetAttribute",
        select: "_id attributeName",
      })
      .populate({
        path: "applicableCategory",
        select: "_id name",
      })
      .populate({
        path: "applicableProduct",
        select: "_id name",
      })
      .lean();

    return res.json({
      success: true,
      message: "Attribute rule updated successfully",
      data: populatedRule,
    });
  } catch (err) {
    console.error("Error updating attribute rule:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    return res.status(500).json({ error: err.message || "Failed to update attribute rule" });
  }
};

/**
 * DELETE /admin/attribute-rules/:id
 * Delete an attribute rule
 */
export const deleteAttributeRule = async (req, res) => {
  try {
    const ruleId = req.params.id;

    if (!ruleId) {
      return res.status(400).json({ error: "Rule ID is required" });
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID format" });
    }

    const rule = await AttributeRule.findById(ruleId);

    if (!rule) {
      return res.status(404).json({ error: "Attribute rule not found" });
    }

    await AttributeRule.findByIdAndDelete(ruleId);

    return res.json({
      success: true,
      message: "Attribute rule deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting attribute rule:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid rule ID format" });
    }
    return res.status(500).json({ error: err.message || "Failed to delete attribute rule" });
  }
};
