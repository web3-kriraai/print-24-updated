import Product from "../models/productModal.js";
import AttributeRule from "../models/AttributeRuleSchema.js";
import SubAttribute from "../models/subAttributeSchema.js";

/**
 * GET /api/products/:id/detail
 * 
 * ⚠️ PDP CONTRACT (CONFIGURATION ONLY):
 * - Returns ONLY product configuration data
 * - NO pricing (basePrice, quantityDiscounts, priceAdd)
 * - NO price calculations or rule execution
 * - Frontend receives raw data for UI rendering
 * - Pricing is resolved separately via Pricing API
 * 
 * ✅ Returns:
 * - Product metadata
 * - Attributes (structure only)
 * - SubAttributes (structure only, with pricingKey)
 * - Rules (conditions + actions, no execution)
 * - Quantity config (driver only)
 */
export const getProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Validate MongoDB ObjectId format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(productId);

    if (!isObjectId) {
      return res.status(400).json({
        error: "Invalid product ID format. Expected MongoDB ObjectId (24 hex characters).",
        received: productId,
      });
    }

    // Fetch product with populated references
    const product = await Product.findById(productId)
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
        },
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image",
        },
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType",
      })
      .lean();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Extract enabled attribute type IDs
    const attributeTypeIds = product.dynamicAttributes
      .filter((da) => da.attributeType && da.isEnabled)
      .map((da) =>
        typeof da.attributeType === "object"
          ? da.attributeType._id
          : da.attributeType
      );

    // Fetch all SubAttributes for these attribute types
    const subAttributes = await SubAttribute.find({
      parentAttribute: { $in: attributeTypeIds },
      isEnabled: true,
    })
      .populate({
        path: "parentAttribute",
        select: "_id attributeName",
      })
      .lean();

    // Fetch active AttributeRules applicable to this product or its category
    const categoryId =
      typeof product.category === "object"
        ? product.category._id
        : product.category;

    const rules = await AttributeRule.find({
      isActive: true,
      $or: [
        { applicableProduct: productId },
        { applicableCategory: categoryId },
        { $and: [{ applicableProduct: null }, { applicableCategory: null }] }, // Global rules
      ],
    })
      .populate({
        path: "when.attribute",
        select: "_id attributeName",
      })
      .populate({
        path: "then.targetAttribute",
        select: "_id attributeName",
      })
      .sort({ priority: -1 }) // Higher priority first
      .lean();

    // ========== QUANTITY CONFIGURATION ==========
    // ✅ Use product.quantityConfig as primary source
    // ✅ Fallback to QUANTITY_DRIVER attribute type
    // ❌ DO NOT use filters (legacy/read-only)

    let quantityConfig = null;

    // Primary: Check product.quantityConfig
    if (product.quantityConfig) {
      quantityConfig = product.quantityConfig;
    } else {
      // Fallback: Look for QUANTITY_DRIVER attribute type
      const quantityAttribute = product.dynamicAttributes.find(
        (da) =>
          da.attributeType &&
          typeof da.attributeType === "object" &&
          (da.attributeType.functionType === "QUANTITY_PRICING" ||
            da.attributeType.functionType === "QUANTITY_DRIVER") &&
          da.isEnabled
      );

      if (quantityAttribute && quantityAttribute.attributeType.quantityConfig) {
        quantityConfig = quantityAttribute.attributeType.quantityConfig;
      }
    }

    // ========== BUILD ATTRIBUTES ARRAY ==========
    // ✅ Return only valid schema fields
    // ❌ Remove ghost fields: isPricingAttribute, isStepQuantity, isRangeQuantity, stepQuantities, rangeQuantities, customValues

    const attributes = product.dynamicAttributes
      .filter((da) => da.attributeType && da.isEnabled)
      .map((da) => {
        const attrType =
          typeof da.attributeType === "object"
            ? da.attributeType
            : { _id: da.attributeType };

        return {
          _id: attrType._id,
          attributeName: attrType.attributeName,
          functionType: attrType.functionType,
          inputStyle: attrType.inputStyle,
          pricingBehavior: attrType.pricingBehavior, // ✅ Correct field
          primaryEffectType: attrType.primaryEffectType,
          isRequired: da.isRequired !== undefined ? da.isRequired : attrType.isRequired || false,
          displayOrder: da.displayOrder !== undefined ? da.displayOrder : attrType.displayOrder || 0,
          defaultValue: attrType.defaultValue,
          attributeValues: attrType.attributeValues || [],
          // ✅ Include quantityConfig only if this is a QUANTITY_DRIVER
          ...(attrType.quantityConfig && { quantityConfig: attrType.quantityConfig }),
          // Product-specific overrides
          productConfig: {
            isEnabled: da.isEnabled,
            isRequired: da.isRequired,
            displayOrder: da.displayOrder,
          },
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);

    // ========== BUILD SUB-ATTRIBUTES MAP ==========
    // ✅ Group by parentAttribute and parentValue
    // ✅ Include pricingKey (NOT priceAdd)
    // ❌ Remove priceAdd field

    const subAttributesMap = {};
    subAttributes.forEach((subAttr) => {
      const parentAttrId =
        typeof subAttr.parentAttribute === "object"
          ? subAttr.parentAttribute._id.toString()
          : subAttr.parentAttribute.toString();
      const key = `${parentAttrId}:${subAttr.parentValue}`;
      if (!subAttributesMap[key]) {
        subAttributesMap[key] = [];
      }
      subAttributesMap[key].push({
        _id: subAttr._id,
        value: subAttr.value,
        label: subAttr.label,
        image: subAttr.image,
        parentValue: subAttr.parentValue,
        pricingKey: subAttr.pricingKey, // ✅ Correct field for pricing engine
      });
    });

    // ========== RETURN PDP RESPONSE ==========
    // ⚠️ CRITICAL: NO PRICING FIELDS
    // ❌ basePrice - REMOVED
    // ❌ quantityDiscounts - REMOVED
    // ❌ Legacy file fields - REPLACED with fileRules

    return res.json({
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        descriptionArray: product.descriptionArray,
        image: product.image,
        category: product.category,
        subcategory: product.subcategory,
        productType: product.productType,
        options: product.options,
        filters: product.filters, // ⚠️ Legacy compatibility only - read-only
        // ✅ Use fileRules object (aligned with schema)
        fileRules: product.fileRules,
        additionalDesignCharge: product.additionalDesignCharge,
        gstPercentage: product.gstPercentage,
        showPriceIncludingGst: product.showPriceIncludingGst,
        instructions: product.instructions,
        productionSequence: product.productionSequence,
      },
      quantityConfig,
      attributes,
      subAttributes: subAttributesMap,
      rules: rules.map((rule) => ({
        _id: rule._id,
        name: rule.name,
        when: {
          attribute: rule.when.attribute,
          value: rule.when.value,
        },
        then: rule.then.map((action) => ({
          action: action.action,
          targetAttribute: action.targetAttribute,
          allowedValues: action.allowedValues || [],
          defaultValue: action.defaultValue,
        })),
        priority: rule.priority,
        applicableCategory: rule.applicableCategory,
        applicableProduct: rule.applicableProduct,
      })),
    });
  } catch (err) {
    console.error("❌ Error fetching product detail:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    return res.status(500).json({
      error: err.message || "Failed to fetch product detail",
    });
  }
};
