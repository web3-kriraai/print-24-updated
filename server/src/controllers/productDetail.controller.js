import Product from "../models/productModal.js";
import AttributeRule from "../models/AttributeRuleSchema.js";
import SubAttribute from "../models/subAttributeSchema.js";

/**
 * GET /api/products/:id/detail
 * Returns complete PDP data including product, attributes, sub-attributes, and rules
 * Does NOT apply rule logic - only returns raw data for frontend
 */
export const getProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(productId);

    let product;
    if (isObjectId) {
      // Try to find by ID first, excluding deleted
      product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } })
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
    } else {
      // Not a valid ObjectId format
      return res.status(400).json({
        error: "Invalid product ID format. Expected MongoDB ObjectId (24 hex characters).",
        received: productId,
      });
    }

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Extract attribute type IDs from product's dynamicAttributes
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
      .sort({ displayOrder: 1 })
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

    // Build quantity configuration from product filters or QUANTITY_PRICING attribute
    let quantityConfig = null;

    // Check if product has filters.orderQuantity
    if (product.filters && product.filters.orderQuantity) {
      quantityConfig = {
        quantityType: product.filters.orderQuantity.quantityType || "SIMPLE",
        minQuantity: product.filters.orderQuantity.min,
        maxQuantity: product.filters.orderQuantity.max,
        quantityMultiples: product.filters.orderQuantity.multiples,
        stepWiseQuantities: product.filters.orderQuantity.stepWiseQuantities || [],
        rangeWiseQuantities: product.filters.orderQuantity.rangeWiseQuantities || [],
      };
    } else {
      // Look for QUANTITY_PRICING attribute type in dynamicAttributes
      const quantityAttribute = product.dynamicAttributes.find(
        (da) =>
          da.attributeType &&
          typeof da.attributeType === "object" &&
          da.attributeType.functionType === "QUANTITY_PRICING" &&
          da.isEnabled
      );

      if (quantityAttribute && quantityAttribute.attributeType.quantityConfig) {
        quantityConfig = quantityAttribute.attributeType.quantityConfig;
      }
    }

    // Build attributes array from dynamicAttributes
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
          placeholder: attrType.placeholder,
          isPricingAttribute: attrType.isPricingAttribute,
          primaryEffectType: attrType.primaryEffectType,
          isRequired: da.isRequired !== undefined ? da.isRequired : attrType.isRequired || false,
          displayOrder: da.displayOrder !== undefined ? da.displayOrder : attrType.displayOrder || 0,
          defaultValue: attrType.defaultValue,
          attributeValues: attrType.attributeValues || [],
          customValues: da.customValues || [],
          // Step and Range quantity settings
          isStepQuantity: attrType.isStepQuantity || false,
          isRangeQuantity: attrType.isRangeQuantity || false,
          stepQuantities: attrType.stepQuantities || [],
          rangeQuantities: attrType.rangeQuantities || [],
          // Price visibility control
          showPrice: da.showPrice !== undefined ? da.showPrice : true,
          // Product-specific overrides
          productConfig: {
            isEnabled: da.isEnabled,
            isRequired: da.isRequired,
            displayOrder: da.displayOrder,
            customValues: da.customValues || [],
          },
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);

    // Group sub-attributes by parentAttribute and parentValue
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
        priceAdd: subAttr.priceAdd || 0,
        parentValue: subAttr.parentValue,
      });
    });

    // Return PDP response
    return res.json({
      product: {
        _id: product._id,
        name: product.name,
        description: product.description,
        descriptionArray: product.descriptionArray,
        image: product.image,
        basePrice: product.basePrice,
        category: product.category,
        subcategory: product.subcategory,
        productType: product.productType,
        options: product.options,
        filters: product.filters,
        quantityDiscounts: product.quantityDiscounts,
        maxFileSizeMB: product.maxFileSizeMB,
        minFileWidth: product.minFileWidth,
        maxFileWidth: product.maxFileWidth,
        minFileHeight: product.minFileHeight,
        maxFileHeight: product.maxFileHeight,
        blockCDRandJPG: product.blockCDRandJPG,
        additionalDesignCharge: product.additionalDesignCharge,
        gstPercentage: product.gstPercentage,
        showPriceIncludingGst: product.showPriceIncludingGst,
        instructions: product.instructions,
        productionSequence: product.productionSequence,
        specialization: product.specialization,
        showAttributePrices: product.showAttributePrices !== undefined ? product.showAttributePrices : true, // Include showAttributePrices setting
      },
      quantityConfig,
      attributes,
      subAttributes: subAttributesMap,
      rules: rules.map((rule) => ({
        _id: rule._id,
        name: rule.name,
        when: {
          isQuantityCondition: rule.when.isQuantityCondition,
          attribute: rule.when.attribute,
          value: rule.when.value,
          minQuantity: rule.when.minQuantity,
          maxQuantity: rule.when.maxQuantity,
        },
        then: rule.then.map((action) => ({
          action: action.action,
          targetAttribute: action.targetAttribute,
          allowedValues: action.allowedValues || [],
          defaultValue: action.defaultValue,
          minQuantity: action.minQuantity,
          maxQuantity: action.maxQuantity,
          stepQuantity: action.stepQuantity,
        })),
        priority: rule.priority,
        applicableCategory: rule.applicableCategory,
        applicableProduct: rule.applicableProduct,
      })),
    });
  } catch (err) {
    console.error("Error fetching product detail:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    return res.status(500).json({
      error: err.message || "Failed to fetch product detail",
    });
  }
};
