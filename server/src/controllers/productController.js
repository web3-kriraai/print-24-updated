import Product from "../models/productModal.js";
import Category from "../models/categoryModal.js";
import SubCategory from "../models/subcategoryModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/* =====================================
   HELPER FUNCTIONS
===================================== */

/**
 * Safely parse JSON field from request body
 * @param {string|object} field - Field to parse
 * @param {string} fieldName - Name of field for error messages
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {object} { success: boolean, data: any, error: string }
 */
const parseJSONField = (field, fieldName, defaultValue = null) => {
  if (field === undefined || field === null) {
    return { success: true, data: defaultValue };
  }

  try {
    const parsed = typeof field === 'string' ? JSON.parse(field) : field;
    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: `Invalid JSON in ${fieldName}`,
      data: defaultValue
    };
  }
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate category and subcategory relationship
 * @param {string} categoryId - Category ID
 * @param {string} subcategoryId - Subcategory ID (optional)
 * @returns {Promise<object>} { valid: boolean, error: string, categoryId: string, subcategoryId: string|null }
 */
const validateCategorySubcategory = async (categoryId, subcategoryId) => {
  // Validate category is required
  if (!categoryId) {
    return { valid: false, error: "Category is required." };
  }

  // Validate category ID format
  if (!validateObjectId(categoryId)) {
    return { valid: false, error: "Invalid category ID format. Expected MongoDB ObjectId." };
  }

  // Check if category exists
  const categoryExists = await Category.findById(categoryId);
  if (!categoryExists) {
    return { valid: false, error: "Category not found. Please select a valid category." };
  }

  // If no subcategory provided, return valid
  const subcategoryStr = subcategoryId ? String(subcategoryId).trim() : '';
  if (!subcategoryStr || subcategoryStr === '' || subcategoryStr === 'null') {
    return { valid: true, categoryId, subcategoryId: null };
  }

  // Validate subcategory ID format
  if (!validateObjectId(subcategoryStr)) {
    return { valid: false, error: "Invalid subcategory ID format. Expected MongoDB ObjectId." };
  }

  // Check if subcategory exists
  const subcategoryExists = await SubCategory.findById(subcategoryStr).populate('category');
  if (!subcategoryExists) {
    return { valid: false, error: "Subcategory not found. Please select a valid subcategory." };
  }

  // Validate subcategory belongs to category
  const subcategoryCategoryId = subcategoryExists.category
    ? (typeof subcategoryExists.category === 'object'
      ? subcategoryExists.category._id.toString()
      : subcategoryExists.category.toString())
    : null;

  if (subcategoryCategoryId !== categoryId) {
    return {
      valid: false,
      error: "Selected subcategory does not belong to the selected category. Please select a valid subcategory."
    };
  }

  return { valid: true, categoryId, subcategoryId: subcategoryStr };
};

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} Cloudinary secure URL
 */
const uploadImageToCloudinary = async (fileBuffer, folder = "products") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error || new Error("Image upload failed"));
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

/**
 * Validate and sanitize dynamic attributes
 * ⚠️ CRITICAL: Dynamic attributes MUST NOT contain pricing logic
 * Pricing is managed via PriceBooks & PriceBookEntry only
 * 
 * @param {Array} attributes - Dynamic attributes array
 * @returns {Array} Validated attributes
 */
const validateDynamicAttributes = (attributes) => {
  if (!Array.isArray(attributes)) {
    return [];
  }

  return attributes
    .filter((da) => da && da.attributeType) // Filter out null/undefined entries
    .map((da) => {
      const attribute = {
        attributeType: da.attributeType,
        isEnabled: da.isEnabled !== undefined ? Boolean(da.isEnabled) : true,
        isRequired: da.isRequired !== undefined ? Boolean(da.isRequired) : false,
        displayOrder: da.displayOrder !== undefined ? Number(da.displayOrder) : 0,
      };

      // Add conditional display logic (dependsOn)
      if (da.dependsOn && da.dependsOn.attribute && da.dependsOn.value) {
        attribute.dependsOn = {
          attribute: da.dependsOn.attribute,
          value: String(da.dependsOn.value)
        };
      }

      // ❌ REJECT any pricing fields that shouldn't be here
      // Prices, multipliers, sub-values come from AttributeType & SubAttribute collections
      return attribute;
    });
};

/**
 * Build fileRules object from individual fields
 * @param {object} fields - Object containing file rule fields
 * @returns {object} fileRules object
 */
const buildFileRules = (fields) => {
  const fileRules = {};

  if (fields.maxFileSizeMB !== undefined && fields.maxFileSizeMB !== null) {
    fileRules.maxFileSizeMB = parseFloat(fields.maxFileSizeMB);
  }
  if (fields.minFileWidth !== undefined && fields.minFileWidth !== null) {
    fileRules.minWidth = parseInt(fields.minFileWidth);
  }
  if (fields.maxFileWidth !== undefined && fields.maxFileWidth !== null) {
    fileRules.maxWidth = parseInt(fields.maxFileWidth);
  }
  if (fields.minFileHeight !== undefined && fields.minFileHeight !== null) {
    fileRules.minHeight = parseInt(fields.minFileHeight);
  }
  if (fields.maxFileHeight !== undefined && fields.maxFileHeight !== null) {
    fileRules.maxHeight = parseInt(fields.maxFileHeight);
  }
  if (fields.blockCDRandJPG !== undefined) {
    const blocked = fields.blockCDRandJPG === "true" || fields.blockCDRandJPG === true;
    if (blocked) {
      fileRules.blockedFormats = ["cdr", "jpg", "jpeg"];
    }
  }

  return Object.keys(fileRules).length > 0 ? fileRules : undefined;
};

/* =====================================
   PRODUCT CONTROLLERS
===================================== */

/**
 * CREATE PRODUCT
 * 
 * ⚠️ PRICING ARCHITECTURE:
 * - Products are created WITHOUT basePrice
 * - Pricing is managed via PriceBooks & PriceBookEntry ONLY
 * - Admin must set prices in "Price Books" tab after product creation
 * 
 * POST /products
 */
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      description,
      descriptionArray,
      productType,
      options,
      filters, // ⚠️ Legacy compatibility only - READ-ONLY
      dynamicAttributes,
      maxFileSizeMB,
      minFileWidth,
      maxFileWidth,
      minFileHeight,
      maxFileHeight,
      blockCDRandJPG,
      additionalDesignCharge,
      gstPercentage,
      showPriceIncludingGst,
      instructions,
      productionSequence
    } = req.body;

    // ========== VALIDATION ==========

    if (!name) {
      return res.status(400).json({ error: "Product name is required." });
    }

    // Validate category and subcategory
    const validation = await validateCategorySubcategory(category, subcategory);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // ========== PARSE JSON FIELDS ==========

    // Parse options (UI display only - no pricing)
    const optionsResult = parseJSONField(options, "options", []);
    if (!optionsResult.success) {
      return res.status(400).json({ error: optionsResult.error });
    }

    // Parse filters (⚠️ LEGACY ONLY - DO NOT USE FOR PRICING)
    // Keep for backward compatibility but DO NOT validate prices
    const filtersResult = parseJSONField(filters, "filters", null);
    if (!filtersResult.success) {
      return res.status(400).json({ error: filtersResult.error });
    }

    // Parse descriptionArray
    const descArrayResult = parseJSONField(descriptionArray, "descriptionArray", []);
    let parsedDescriptionArray = descArrayResult.data;
    if (!descArrayResult.success) {
      // If not JSON, treat as string and split by newlines
      parsedDescriptionArray = descriptionArray
        ? String(descriptionArray).split('\n').filter(line => line.trim())
        : [];
    }

    // Parse and validate dynamic attributes
    const dynamicAttrsResult = parseJSONField(dynamicAttributes, "dynamicAttributes", []);
    if (!dynamicAttrsResult.success) {
      return res.status(400).json({ error: dynamicAttrsResult.error });
    }
    const parsedDynamicAttributes = validateDynamicAttributes(dynamicAttrsResult.data);

    // Parse productionSequence
    const prodSeqResult = parseJSONField(productionSequence, "productionSequence", []);
    if (!prodSeqResult.success) {
      return res.status(400).json({ error: prodSeqResult.error });
    }
    const parsedProductionSequence = Array.isArray(prodSeqResult.data)
      ? prodSeqResult.data.filter(id => validateObjectId(id))
      : [];

    // ========== IMAGE UPLOAD ==========

    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadImageToCloudinary(req.file.buffer);
      } catch (error) {
        console.error("Image upload error:", error);
        return res.status(500).json({ error: "Failed to upload image to Cloudinary" });
      }
    }

    // ========== BUILD FILE RULES ==========

    const fileRules = buildFileRules({
      maxFileSizeMB,
      minFileWidth,
      maxFileWidth,
      minFileHeight,
      maxFileHeight,
      blockCDRandJPG
    });

    // ========== CREATE PRODUCT ==========

    const productData = {
      name,
      category: validation.categoryId,
      subcategory: validation.subcategoryId,
      description: description || "",
      descriptionArray: parsedDescriptionArray,
      productType: productType || "",
      image: imageUrl,
      options: optionsResult.data,
      filters: filtersResult.data, // Legacy compatibility only
      dynamicAttributes: parsedDynamicAttributes,
      additionalDesignCharge: additionalDesignCharge ? parseFloat(additionalDesignCharge) : 0,
      gstPercentage: gstPercentage ? parseFloat(gstPercentage) : 0,
      showPriceIncludingGst: showPriceIncludingGst === true || showPriceIncludingGst === 'true',
      instructions: instructions || "",
      productionSequence: parsedProductionSequence,
    };

    // Add fileRules only if defined
    if (fileRules) {
      productData.fileRules = fileRules;
    }

    const product = await Product.create(productData);

    // ========== POPULATE AND RETURN ==========

    const populatedProduct = await Product.findById(product._id)
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType",
        select: "_id attributeName inputStyle primaryEffectType isPricingAttribute attributeValues defaultValue isRequired isFilterable displayOrder isStepQuantity isRangeQuantity stepQuantities rangeQuantities"
      });

    console.log(`✅ Product created: ${product.name} (ID: ${product._id})`);
    console.log(`   Category: ${validation.categoryId}, Subcategory: ${validation.subcategoryId || 'None'}`);
    console.log(`   Dynamic Attributes: ${parsedDynamicAttributes.length}`);

    return res.json({
      success: true,
      message: "Product created successfully. Set pricing in Price Books.",
      data: populatedProduct || product,
    });
  } catch (err) {
    console.error("❌ PRODUCT CREATE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET ALL PRODUCTS
 * GET /products
 */
export const getAllProducts = async (req, res) => {
  try {
    const list = await Product.find()
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

    console.log(`✅ Fetched ${list.length} product(s)`);
    res.json(list);
  } catch (err) {
    console.error("❌ Error fetching all products:", err);
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
};

/**
 * GET SINGLE PRODUCT BY ID
 * GET /products/:id
 */
export const getSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (!validateObjectId(productId)) {
      return res.status(400).json({
        error: "Invalid product ID format. Expected MongoDB ObjectId (24 hex characters).",
        received: productId
      });
    }

    const item = await Product.findById(productId)
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .populate({
        path: "productionSequence",
        model: "Department",
        select: "_id name description sequence isEnabled"
      });

    if (!item) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`✅ Product found: ${item.name}`);
    res.json(item);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch product" });
  }
};

/**
 * GET PRODUCTS BY CATEGORY
 * Supports both category ID and subcategory ID
 * Includes nested subcategory support
 * 
 * GET /products/category/:categoryId
 */
export const getProductsByCategory = async (req, res) => {
  try {
    const categoryIdentifier = req.params.categoryId;

    if (!categoryIdentifier) {
      return res.status(400).json({ error: "Category ID or slug is required" });
    }

    const isObjectId = validateObjectId(categoryIdentifier);
    let categoryId = categoryIdentifier;

    // If not an ObjectId, try to find by slug
    if (!isObjectId) {
      const category = await Category.findOne({ slug: categoryIdentifier });
      if (!category) {
        // Check if it's a subcategory slug
        const subcategory = await SubCategory.findOne({ slug: categoryIdentifier });
        if (subcategory) {
          categoryId = subcategory._id.toString();
        } else {
          return res.status(404).json({ error: "Category or subcategory not found" });
        }
      } else {
        categoryId = category._id.toString();
      }
    }

    // Check if it's a subcategory
    const isSubcategory = await SubCategory.findById(categoryId);

    let query;

    if (isSubcategory) {
      // It's a subcategory - find products with this subcategory
      query = { subcategory: categoryId };
    } else {
      // Verify it's a valid category
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Get all subcategory IDs under this category (including nested)
      const getAllSubcategoryIds = async (parentCategoryId) => {
        const allIds = [];
        const topLevelSubcategories = await SubCategory.find({
          category: parentCategoryId,
          $or: [
            { parent: null },
            { parent: { $exists: false } }
          ]
        }).select('_id');

        const processSubcategory = async (subcategoryId) => {
          allIds.push(subcategoryId);
          const nestedSubcategories = await SubCategory.find({ parent: subcategoryId }).select('_id');
          for (const nested of nestedSubcategories) {
            await processSubcategory(nested._id);
          }
        };

        for (const subcat of topLevelSubcategories) {
          await processSubcategory(subcat._id);
        }

        return allIds;
      };

      const subcategoryIds = await getAllSubcategoryIds(categoryId);

      // Build query: products directly under category OR in subcategories
      if (subcategoryIds.length > 0) {
        query = {
          $or: [
            {
              category: categoryId,
              $or: [
                { subcategory: null },
                { subcategory: { $exists: false } }
              ]
            },
            { subcategory: { $in: subcategoryIds } }
          ]
        };
      } else {
        query = {
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        };
      }
    }

    const list = await Product.find(query)
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

    console.log(`✅ Fetched ${list.length} product(s) for category ${categoryId}`);
    res.json(list);
  } catch (err) {
    console.error("❌ Error in getProductsByCategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

/**
 * GET PRODUCTS BY SUBCATEGORY
 * Includes nested subcategory support
 * Falls back to category products if no subcategory products found
 * 
 * GET /products/subcategory/:subcategoryId
 */
export const getProductsBySubcategory = async (req, res) => {
  try {
    const subcategoryIdentifier = req.params.subcategoryId;

    if (!subcategoryIdentifier) {
      return res.status(400).json({ error: "Subcategory ID or slug is required" });
    }

    const isObjectId = validateObjectId(subcategoryIdentifier);
    let subcategoryId = subcategoryIdentifier;

    // If not an ObjectId, try to find by slug
    if (!isObjectId) {
      const subcategory = await SubCategory.findOne({ slug: subcategoryIdentifier });
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      subcategoryId = subcategory._id.toString();
    }

    // Get all nested subcategory IDs
    const getAllNestedSubcategoryIds = async (parentSubcategoryId) => {
      const allIds = [parentSubcategoryId];
      const nestedSubcategories = await SubCategory.find({ parent: parentSubcategoryId }).select('_id');
      for (const nested of nestedSubcategories) {
        const nestedIds = await getAllNestedSubcategoryIds(nested._id);
        allIds.push(...nestedIds);
      }
      return allIds;
    };

    const allSubcategoryIds = await getAllNestedSubcategoryIds(subcategoryId);

    // Find products with subcategory
    let list = await Product.find({
      subcategory: { $in: allSubcategoryIds },
    })
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${list.length} product(s) with subcategory ${subcategoryId}`);

    // Fallback to category products if none found
    if (list.length === 0) {
      const subcategory = await SubCategory.findById(subcategoryId).populate('category');

      if (subcategory && subcategory.category) {
        const categoryId = typeof subcategory.category === 'object'
          ? subcategory.category._id
          : subcategory.category;

        console.log(`   Falling back to category ${categoryId}`);

        list = await Product.find({
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        })
          .populate({
            path: "category",
            select: "_id name description image type parent slug"
          })
          .populate({
            path: "subcategory",
            select: "_id name description image slug category",
            populate: {
              path: "category",
              model: "Category",
              select: "_id name description type image"
            }
          })
          .populate({
            path: "dynamicAttributes.attributeType",
            model: "AttributeType"
          })
          .sort({ createdAt: -1 });

        console.log(`   Found ${list.length} product(s) in parent category`);
      }
    }

    res.json(list);
  } catch (err) {
    console.error("❌ Error fetching products by subcategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch products by subcategory" });
  }
};

/**
 * UPDATE PRODUCT
 * 
 * ⚠️ PRICING ARCHITECTURE:
 * - Products CANNOT have basePrice updated here
 * - Pricing is managed via PriceBooks & PriceBookEntry ONLY
 * - Use Price Books API to update pricing
 * 
 * PUT /products/:id
 */
export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      description,
      descriptionArray,
      productType,
      options,
      filters, // ⚠️ Legacy compatibility only - READ-ONLY
      dynamicAttributes,
      maxFileSizeMB,
      minFileWidth,
      maxFileWidth,
      minFileHeight,
      maxFileHeight,
      blockCDRandJPG,
      additionalDesignCharge,
      gstPercentage,
      showPriceIncludingGst,
      instructions,
      productionSequence
    } = req.body;
    const productId = req.params.id;

    // ========== VALIDATION ==========

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (!validateObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ========== CATEGORY/SUBCATEGORY VALIDATION ==========

    let categoryUpdate = product.category;
    let subcategoryUpdate = product.subcategory;

    if (category !== undefined) {
      const validation = await validateCategorySubcategory(
        category || product.category,
        subcategory !== undefined ? subcategory : product.subcategory
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      categoryUpdate = validation.categoryId;
      subcategoryUpdate = validation.subcategoryId;
    } else if (subcategory !== undefined) {
      // Only subcategory is being updated
      const validation = await validateCategorySubcategory(
        product.category,
        subcategory
      );
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      subcategoryUpdate = validation.subcategoryId;
    }

    // ========== PARSE JSON FIELDS ==========

    const optionsResult = parseJSONField(options, "options", product.options);
    if (!optionsResult.success) {
      return res.status(400).json({ error: optionsResult.error });
    }

    // ⚠️ FILTERS: Legacy compatibility only - DO NOT validate prices
    const filtersResult = parseJSONField(filters, "filters", product.filters);
    if (!filtersResult.success) {
      return res.status(400).json({ error: filtersResult.error });
    }

    const descArrayResult = parseJSONField(descriptionArray, "descriptionArray", product.descriptionArray);
    let parsedDescriptionArray = descArrayResult.data;
    if (!descArrayResult.success && descriptionArray) {
      parsedDescriptionArray = String(descriptionArray).split('\n').filter(line => line.trim());
    }

    const dynamicAttrsResult = parseJSONField(dynamicAttributes, "dynamicAttributes", product.dynamicAttributes);
    if (!dynamicAttrsResult.success) {
      return res.status(400).json({ error: dynamicAttrsResult.error });
    }
    const parsedDynamicAttributes = dynamicAttributes !== undefined
      ? validateDynamicAttributes(dynamicAttrsResult.data)
      : product.dynamicAttributes;

    const prodSeqResult = parseJSONField(productionSequence, "productionSequence", product.productionSequence);
    if (!prodSeqResult.success) {
      return res.status(400).json({ error: prodSeqResult.error });
    }
    const parsedProductionSequence = productionSequence !== undefined
      ? (Array.isArray(prodSeqResult.data) ? prodSeqResult.data.filter(id => validateObjectId(id)) : [])
      : product.productionSequence;

    // ========== IMAGE UPLOAD ==========

    let imageUrl = product.image;
    if (req.file) {
      try {
        imageUrl = await uploadImageToCloudinary(req.file.buffer);
      } catch (error) {
        console.error("Image upload error:", error);
        return res.status(500).json({ error: "Failed to upload image to Cloudinary" });
      }
    }

    // ========== BUILD FILE RULES ==========

    let fileRulesUpdate = product.fileRules;
    if (maxFileSizeMB !== undefined || minFileWidth !== undefined || maxFileWidth !== undefined ||
      minFileHeight !== undefined || maxFileHeight !== undefined || blockCDRandJPG !== undefined) {
      fileRulesUpdate = buildFileRules({
        maxFileSizeMB: maxFileSizeMB !== undefined ? maxFileSizeMB : product.fileRules?.maxFileSizeMB,
        minFileWidth: minFileWidth !== undefined ? minFileWidth : product.fileRules?.minWidth,
        maxFileWidth: maxFileWidth !== undefined ? maxFileWidth : product.fileRules?.maxWidth,
        minFileHeight: minFileHeight !== undefined ? minFileHeight : product.fileRules?.minHeight,
        maxFileHeight: maxFileHeight !== undefined ? maxFileHeight : product.fileRules?.maxHeight,
        blockCDRandJPG: blockCDRandJPG !== undefined ? blockCDRandJPG : (product.fileRules?.blockedFormats?.length > 0)
      });
    }

    // ========== UPDATE PRODUCT ==========

    const updateData = {
      name: name !== undefined ? name : product.name,
      category: categoryUpdate,
      subcategory: subcategoryUpdate,
      description: description !== undefined ? description : product.description,
      descriptionArray: parsedDescriptionArray,
      productType: productType !== undefined ? productType : product.productType,
      image: imageUrl,
      options: optionsResult.data,
      filters: filtersResult.data, // Legacy compatibility only
      dynamicAttributes: parsedDynamicAttributes,
      additionalDesignCharge: additionalDesignCharge !== undefined ? parseFloat(additionalDesignCharge) : product.additionalDesignCharge,
      gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : product.gstPercentage,
      showPriceIncludingGst: showPriceIncludingGst !== undefined ? (showPriceIncludingGst === true || showPriceIncludingGst === 'true') : product.showPriceIncludingGst,
      instructions: instructions !== undefined ? instructions : product.instructions,
      productionSequence: parsedProductionSequence,
    };

    if (fileRulesUpdate) {
      updateData.fileRules = fileRulesUpdate;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    )
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType",
        select: "_id attributeName inputStyle primaryEffectType isPricingAttribute attributeValues"
      });

    console.log(`✅ Product updated: ${updatedProduct.name} (ID: ${productId})`);

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
    console.error("❌ PRODUCT UPDATE ERROR:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE PRODUCT
 * DELETE /products/:id
 */
export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!validateObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await Product.findByIdAndDelete(productId);

    console.log(`✅ Product deleted: ${product.name} (ID: ${productId})`);

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error("❌ PRODUCT DELETE ERROR:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};