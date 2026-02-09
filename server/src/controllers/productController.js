import Product from "../models/productModal.js";
import Category from "../models/categoryModal.js";
import SubCategory from "../models/subcategoryModal.js";
import Sequence from "../models/sequenceModal.js";
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
      productionSequence,
      assignedSequence,  // NEW: Sequence assignment
      productionDays,  // NEW: Production timeline
      productionTimeline  // NEW: Quantity-based production ranges
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
    let parsedProductionSequence = Array.isArray(prodSeqResult.data)
      ? prodSeqResult.data.filter(id => validateObjectId(id))
      : [];

    // ========== HANDLE SEQUENCE ASSIGNMENT ==========

    // If assignedSequence is provided, auto-populate productionSequence from sequence
    let assignedSequenceId = null;
    if (assignedSequence && validateObjectId(assignedSequence)) {
      const sequence = await Sequence.findById(assignedSequence);
      if (sequence) {
        assignedSequenceId = assignedSequence;
        // Auto-populate productionSequence from sequence departments (in order)
        parsedProductionSequence = sequence.departments
          .sort((a, b) => a.order - b.order)
          .map(d => d.department);
        console.log(`✅ Sequence assigned: ${sequence.name}, departments: ${parsedProductionSequence.length}`);
      } else {
        console.warn(`⚠️ Assigned sequence ${assignedSequence} not found, ignoring`);
      }
    }

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

    // Auto-generate slug from name if not provided (keeping this logic consistent with basic flow)
    let productSlug = req.body.slug ? req.body.slug.trim().toLowerCase() : null;
    if (!productSlug && name) {
      productSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const productData = {
      name,
      slug: productSlug,
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
      assignedSequence: assignedSequenceId,  // NEW: Store sequence reference
      productionDays: productionDays ? parseInt(productionDays) : 7,  // NEW: Production days with default
    };

    // Parse and add production timeline (quantity-based ranges)
    if (productionTimeline) {
      try {
        const parsedTimeline = typeof productionTimeline === 'string' ? JSON.parse(productionTimeline) : productionTimeline;
        console.log('[ProductController] Parsed productionTimeline:', parsedTimeline);
        if (Array.isArray(parsedTimeline) && parsedTimeline.length > 0) {
          productData.productionTimeline = parsedTimeline.map(range => ({
            minQuantity: parseInt(range.minQuantity) || 1,
            maxQuantity: range.maxQuantity ? parseInt(range.maxQuantity) : null,
            productionDays: parseInt(range.productionDays) || 7
          })).filter(range => range.minQuantity > 0 && range.productionDays > 0);
          console.log('[ProductController] ✅ ProductionTimeline set:', productData.productionTimeline);
        } else {
          productData.productionTimeline = [];
          console.log('[ProductController] ⚠️ ProductionTimeline is empty array');
        }
      } catch (err) {
        console.error('[ProductController] ❌ Error parsing productionTimeline:', err);
        productData.productionTimeline = [];
      }
    } else {
      productData.productionTimeline = [];
      console.log('[ProductController] ⚠️ No productionTimeline provided, using empty array');
    }

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
      })
      .populate({
        path: "assignedSequence",
        select: "_id name category subcategory departments",
        populate: {
          path: "departments.department",
          model: "Department",
          select: "_id name sequence"
        }
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
    // Unique key error handling for slug
    if (err.code === 11000 && err.keyPattern && err.keyPattern.slug) {
      return res.status(400).json({ error: "A product with this name/slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

// GET all products
export const getAllProducts = async (req, res) => {
  try {
    const list = await Product.find()
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
        populate: [
          {
            path: "category",
            model: "Category",
            select: "_id name description type image"
          },
          {
            path: "parent",
            model: "SubCategory",
            select: "_id name description image slug category"
          }
        ]
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

    console.log(`Fetched ${list.length} product(s) total`);

    // Restructure each product's subcategory hierarchy
    const restructuredList = await Promise.all(list.map(async (item) => {
      let response = item.toObject();

      if (item.subcategory) {
        // If subcategory has a parent, it's a nested subcategory
        if (item.subcategory.parent) {
          // Fetch the parent subcategory to get full details
          const parentSubcategory = await SubCategory.findById(item.subcategory.parent)
            .populate({
              path: "category",
              model: "Category",
              select: "_id name description type image"
            });

          // Set response.subcategory = parent subcategory
          // Set response.nestedSubcategory = current subcategory
          response.subcategory = parentSubcategory;
          response.nestedSubcategory = item.subcategory;
        } else {
          // Subcategory has no parent - it's a top-level subcategory
          response.subcategory = item.subcategory;
          response.nestedSubcategory = null;
        }
      } else {
        // No subcategory at all
        response.subcategory = null;
        response.nestedSubcategory = null;
      }

      return response;
    }));

    console.log("=== ALL PRODUCTS DATA (RESTRUCTURED) ===");
    console.log(JSON.stringify(restructuredList, null, 2));
    res.json(restructuredList);
  } catch (err) {
    console.error("Error fetching all products:", err);
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
};

// GET product by ID
export const getSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(productId);

    let item;
    if (isObjectId) {
      // Try to find by ID first
      console.log("Fetching product with ID:", productId);
      item = await Product.findById(productId)
        .populate({
          path: "category",
          select: "_id name description image type parent slug",
          populate: {
            path: "parent",
            select: "_id name type",
            options: { recursive: true }
          }
        })
        .populate({
          path: "subcategory",
          select: "_id name description image slug category parent",
          populate: [
            {
              path: "category",
              model: "Category",
              select: "_id name description type image"
            },
            {
              path: "parent",
              model: "SubCategory",
              select: "_id name description image slug category"
            }
          ]
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
    } else {
      // Not a valid ObjectId format - try to fetch by slug
      console.log("Fetching product with slug:", productId);
      item = await Product.findOne({ slug: productId })
        .populate({
          path: "category",
          select: "_id name description image type parent slug",
          populate: {
            path: "parent",
            select: "_id name type",
            options: { recursive: true }
          }
        })
        .populate({
          path: "subcategory",
          select: "_id name description image slug category parent",
          populate: [
            {
              path: "category",
              model: "Category",
              select: "_id name description type image"
            },
            {
              path: "parent",
              model: "SubCategory",
              select: "_id name description image slug category"
            }
          ]
        })
        .populate({
          path: "dynamicAttributes.attributeType",
          model: "AttributeType"
        })
        .populate({
          path: "productionSequence",
          model: "Department",
          select: "_id name description sequence isEnabled"
        })
        .populate({
          path: "assignedSequence",
          select: "_id name category subcategory departments",
          populate: {
            path: "departments.department",
            model: "Department",
            select: "_id name sequence"
          }
        });
    }

    if (!item) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("Product found:", item.name);
    console.log("Product subcategory ID:", item.subcategory?._id);
    console.log("Product subcategory parent:", item.subcategory?.parent);

    // Restructure the response based on subcategory hierarchy
    let response = item.toObject();

    if (item.subcategory) {
      // If subcategory has a parent, it's a nested subcategory
      if (item.subcategory.parent) {
        console.log("Subcategory has a parent - treating as nested subcategory");
        // Fetch the parent subcategory to get full details
        const parentSubcategory = await SubCategory.findById(item.subcategory.parent)
          .populate({
            path: "category",
            model: "Category",
            select: "_id name description type image"
          });

        response.subcategory = parentSubcategory;
        response.nestedSubcategory = item.subcategory;
      } else {
        // Subcategory has no parent - it's a top-level subcategory
        console.log("Subcategory has no parent - treating as top-level subcategory");
        response.subcategory = item.subcategory;
        response.nestedSubcategory = null;
      }
    } else {
      // No subcategory at all
      response.subcategory = null;
      response.nestedSubcategory = null;
    }

    console.log("=== RESTRUCTURED PRODUCT DATA ===");
    console.log("Category:", response.category?._id);
    console.log("Subcategory:", response.subcategory?._id);
    console.log("Nested Subcategory:", response.nestedSubcategory?._id);
    console.log(JSON.stringify(response, null, 2));

    res.json(response);
  } catch (err) {
    console.error("Error fetching product:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch product" });
  }
};

// GET products by category (works with any level in hierarchy)
export const getProductsByCategory = async (req, res) => {
  try {
    const categoryIdentifier = req.params.categoryId;

    if (!categoryIdentifier) {
      return res.status(400).json({ error: "Category ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryIdentifier);

    let categoryId = categoryIdentifier;

    // If not an ObjectId, try to find category by slug
    if (!isObjectId) {
      const Category = (await import("../models/categoryModal.js")).default;
      const category = await Category.findOne({ slug: categoryIdentifier });
      if (!category) {
        // Also check if it's a subcategory slug
        const SubCategory = (await import("../models/subcategoryModal.js")).default;
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

    // Check if categoryId is a category or subcategory
    // First check if it's a subcategory in SubCategory collection
    const SubCategory = (await import("../models/subcategoryModal.js")).default;
    const Category = (await import("../models/categoryModal.js")).default;

    const isSubcategory = await SubCategory.findById(categoryId);

    // If it's not a subcategory, verify it's a valid category
    if (!isSubcategory) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ error: "Category not found" });
      }
    }

    // Find products by category or subcategory
    // If categoryId is a subcategory, find products where subcategory = categoryId
    // If categoryId is a category, find products where:
    //   - category = categoryId (direct category products)
    //   - subcategory.category = categoryId (products in subcategories of this category)
    let query;

    if (isSubcategory) {
      // It's a subcategory - find products with this subcategory
      query = { subcategory: categoryId };
    } else {
      // It's a category - find products directly under this category OR in its subcategories (including nested)
      // Helper function to recursively get all subcategory IDs (including nested ones)
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
          // Find nested subcategories (children of this subcategory)
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

      // Build query: products directly under category OR products in subcategories (including nested)
      if (subcategoryIds.length > 0) {
        query = {
          $or: [
            // Direct category products: category matches AND subcategory is null/undefined
            {
              category: categoryId,
              $or: [
                { subcategory: null },
                { subcategory: { $exists: false } }
              ]
            },
            // Products in subcategories of this category (including nested subcategories)
            { subcategory: { $in: subcategoryIds } }
          ]
        };
      } else {
        // No subcategories exist, so only look for direct category products
        // Products where category matches AND subcategory is null or doesn't exist
        query = {
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        };
      }
    }

    console.log("Query for category products:", JSON.stringify(query, null, 2));
    const list = await Product.find(query)
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
        populate: [
          {
            path: "category",
            model: "Category",
            select: "_id name description type image"
          },
          {
            path: "parent",
            model: "SubCategory",
            select: "_id name"
          }
        ]
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

    console.log(`=== PRODUCTS BY CATEGORY (${categoryId}) ===`);
    console.log(`Fetched ${list.length} product(s)`);

    // Restructure each product's subcategory hierarchy
    const restructuredList = await Promise.all(list.map(async (item) => {
      let response = item.toObject();

      if (item.subcategory) {
        // If subcategory has a parent, it's a nested subcategory
        if (item.subcategory.parent) {
          // Fetch the parent subcategory to get full details
          const parentSubcategory = await SubCategory.findById(item.subcategory.parent)
            .populate({
              path: "category",
              model: "Category",
              select: "_id name description type image"
            });

          response.subcategory = parentSubcategory;
          response.nestedSubcategory = item.subcategory;
        } else {
          response.subcategory = item.subcategory;
          response.nestedSubcategory = null;
        }
      } else {
        response.subcategory = null;
        response.nestedSubcategory = null;
      }

      return response;
    }));

    console.log(JSON.stringify(restructuredList, null, 2));
    res.json(restructuredList);
  } catch (err) {
    console.error("Error in getProductsByCategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    // If it's a validation error or other known error, return 400
    if (err.name === 'ValidationError' || err.message.includes('Cast to ObjectId')) {
      return res.status(400).json({ error: err.message || "Invalid category ID" });
    }
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

// GET products by subcategory (explicit endpoint)
// Priority: First find products with subcategory, if none found, fall back to category products
export const getProductsBySubcategory = async (req, res) => {
  try {
    const subcategoryIdentifier = req.params.subcategoryId;

    if (!subcategoryIdentifier) {
      return res.status(400).json({ error: "Subcategory ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryIdentifier);

    let subcategoryId = subcategoryIdentifier;

    // If not an ObjectId, try to find subcategory by slug
    if (!isObjectId) {
      const SubCategory = (await import("../models/subcategoryModal.js")).default;
      const subcategory = await SubCategory.findOne({ slug: subcategoryIdentifier });
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      subcategoryId = subcategory._id.toString();
    }

    console.log("Fetching products for subcategory ID:", subcategoryId);

    // Helper function to recursively get all IDs
    const getAllNestedSubcategoryIds = async (parentSubcategoryId) => {
      const allIds = [parentSubcategoryId];
      const nestedSubcategories = await SubCategory.find({ parent: parentSubcategoryId }).select('_id');
      for (const nested of nestedSubcategories) {
        const nestedIds = await getAllNestedSubcategoryIds(nested._id);
        allIds.push(...nestedIds);
      }
      return allIds;
    };

    // Get all nested subcategory IDs (including the current one)
    const allSubcategoryIds = await getAllNestedSubcategoryIds(subcategoryId);

    // First priority: Find products where subcategory matches the provided ID or any nested subcategory
    let list = await Product.find({
      subcategory: { $in: allSubcategoryIds },
    })
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
        populate: [
          {
            path: "category",
            model: "Category",
            select: "_id name description type image"
          },
          {
            path: "parent",
            model: "SubCategory",
            select: "_id name"
          }
        ]
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

    console.log(`Found ${list.length} product(s) with subcategory ${subcategoryId}`);

    // If no products found with subcategory, fall back to category products
    if (list.length === 0) {
      // Get the parent category ID from the subcategory
      const SubCategory = (await import("../models/subcategoryModal.js")).default;
      const subcategory = await SubCategory.findById(subcategoryId).populate('category');

      if (subcategory && subcategory.category) {
        const categoryId = typeof subcategory.category === 'object'
          ? subcategory.category._id
          : subcategory.category;

        console.log(`No products found with subcategory, falling back to category ${categoryId}`);

        // Find products directly under the parent category
        list = await Product.find({
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        })
          .populate({
            path: "category",
            select: "_id name description image type parent slug",
            populate: {
              path: "parent",
              select: "_id name type",
              options: { recursive: true }
            }
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

        console.log(`Found ${list.length} product(s) in parent category ${categoryId}`);
      }
    }

    console.log(`=== PRODUCTS BY SUBCATEGORY (${subcategoryId}) ===`);
    console.log(`Fetched ${list.length} product(s)`);

    // Restructure each product's subcategory hierarchy
    const restructuredList = await Promise.all(list.map(async (item) => {
      let response = item.toObject();

      if (item.subcategory) {
        // If subcategory has a parent, it's a nested subcategory
        if (item.subcategory.parent) {
          // Fetch the parent subcategory to get full details
          const parentSubcategory = await SubCategory.findById(item.subcategory.parent)
            .populate({
              path: "category",
              model: "Category",
              select: "_id name description type image"
            });

          response.subcategory = parentSubcategory;
          response.nestedSubcategory = item.subcategory;
        } else {
          response.subcategory = item.subcategory;
          response.nestedSubcategory = null;
        }
      } else {
        response.subcategory = null;
        response.nestedSubcategory = null;
      }

      return response;
    }));

    console.log(JSON.stringify(restructuredList, null, 2));
    // Return the list of products
    res.json(restructuredList);
  } catch (err) {
    console.error("Error fetching products by subcategory:", err);
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
      slug,
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
      productionSequence,
      assignedSequence,  // NEW: Sequence assignment
      productionDays,  // NEW: Production timeline
      productionTimeline  // NEW: Quantity-based production ranges
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

    // Handle category update
    if (category) {
      if (!validateObjectId(category)) {
        return res.status(400).json({ error: "Invalid category ID format. Expected MongoDB ObjectId." });
      }

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: "Category not found. Please select a valid category." });
      }
      categoryUpdate = category;
    }

    // Handle subcategory update
    if (subcategory !== undefined) {
      const subcategoryStr = subcategory ? String(subcategory).trim() : '';
      if (subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null') {
        if (!validateObjectId(subcategoryStr)) {
          return res.status(400).json({ error: "Invalid subcategory ID format. Expected MongoDB ObjectId." });
        }

        const SubCategory = (await import("../models/subcategoryModal.js")).default;
        const subcategoryExists = await SubCategory.findById(subcategoryStr).populate('category');
        if (!subcategoryExists) {
          return res.status(400).json({ error: "Subcategory not found. Please select a valid subcategory." });
        }

        // Validate that subcategory belongs to the category
        const finalCategoryId = categoryUpdate || product.category;
        if (finalCategoryId) {
          const subcategoryCategoryId = subcategoryExists.category
            ? (typeof subcategoryExists.category === 'object' ? subcategoryExists.category._id.toString() : subcategoryExists.category.toString())
            : null;

          if (!subcategoryCategoryId || subcategoryCategoryId !== finalCategoryId.toString()) {
            return res.status(400).json({
              error: "Selected subcategory does not belong to the selected category. Please select a valid subcategory."
            });
          }
        }
        subcategoryUpdate = subcategoryStr;
      } else {
        subcategoryUpdate = null;
      }
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
    let parsedProductionSequence = productionSequence !== undefined
      ? (Array.isArray(prodSeqResult.data) ? prodSeqResult.data.filter(id => validateObjectId(id)) : [])
      : product.productionSequence;

    // ========== HANDLE SEQUENCE ASSIGNMENT ==========

    // If assignedSequence is provided, auto-populate productionSequence from sequence
    let assignedSequenceId = product.assignedSequence; // Default to existing value
    if (assignedSequence !== undefined) {
      if (assignedSequence && validateObjectId(assignedSequence)) {
        const sequence = await Sequence.findById(assignedSequence);
        if (sequence) {
          assignedSequenceId = assignedSequence;
          // Auto-populate productionSequence from sequence departments (in order)
          parsedProductionSequence = sequence.departments
            .sort((a, b) => a.order - b.order)
            .map(d => d.department);
          console.log(`✅ Sequence updated: ${sequence.name}, departments: ${parsedProductionSequence.length}`);
        } else {
          console.warn(`⚠️ Assigned sequence ${assignedSequence} not found, keeping previous value`);
        }
      } else if (assignedSequence === "" || assignedSequence === null) {
        // Explicitly clearing the sequence
        assignedSequenceId = null;
        console.log(`✅ Sequence cleared for product update`);
      }
    }

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

    // Handle slug update if provided
    let slugUpdate = product.slug;
    if (slug !== undefined && slug !== product.slug) {
      const productSlug = slug ? slug.trim().toLowerCase() : null;
      if (!productSlug) {
        return res.status(400).json({ error: "Product slug cannot be empty." });
      }
      // Check Uniqueness
      const fullSubcategoryId = subcategoryUpdate !== undefined ? subcategoryUpdate : product.subcategory;
      const fullCategoryId = categoryUpdate || product.category;
      const slugQuery = fullSubcategoryId
        ? { slug: productSlug, subcategory: fullSubcategoryId, _id: { $ne: productId } }
        : { slug: productSlug, category: fullCategoryId, subcategory: null, _id: { $ne: productId } };

      const duplicate = await Product.findOne(slugQuery);
      if (duplicate) {
        return res.status(400).json({ error: `Slug "${productSlug}" already exists in this category scope.` });
      }
      slugUpdate = productSlug;
    }

    // ========== UPDATE PRODUCT ==========

    const updateData = {
      name: name !== undefined ? name : product.name,
      slug: slugUpdate,
      // basePrice: removed - managed via Price Books
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
      assignedSequence: assignedSequenceId,  // NEW: Store sequence reference
      productionDays: productionDays !== undefined ? parseInt(productionDays) : product.productionDays,  // NEW: Production days
    };

    // Parse and update production timeline (quantity-based ranges)
    if (productionTimeline !== undefined) {
      try {
        const parsedTimeline = typeof productionTimeline === 'string' ? JSON.parse(productionTimeline) : productionTimeline;
        console.log('[ProductController UPDATE] Parsed productionTimeline:', parsedTimeline);
        if (Array.isArray(parsedTimeline) && parsedTimeline.length > 0) {
          updateData.productionTimeline = parsedTimeline.map(range => ({
            minQuantity: parseInt(range.minQuantity) || 1,
            maxQuantity: range.maxQuantity ? parseInt(range.maxQuantity) : null,
            productionDays: parseInt(range.productionDays) || 7
          })).filter(range => range.minQuantity > 0 && range.productionDays > 0);
          console.log('[ProductController UPDATE] ✅ ProductionTimeline set:', updateData.productionTimeline);
        } else {
          updateData.productionTimeline = [];
          console.log('[ProductController UPDATE] ⚠️ ProductionTimeline is empty array');
        }
      } catch (err) {
        console.error('[ProductController UPDATE] ❌ Error parsing productionTimeline:', err);
        updateData.productionTimeline = product.productionTimeline;  // Keep existing on error
      }
    }

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
      })
      .populate({
        path: "assignedSequence",
        select: "_id name category subcategory departments",
        populate: {
          path: "departments.department",
          model: "Department",
          select: "_id name sequence"
        }
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

// DELETE product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};

// Reorder products
export const reorderProducts = async (req, res) => {
  try {
    const { draggedId, targetId } = req.body;

    if (!draggedId || !targetId) {
      return res.status(400).json({ error: "Dragged ID and Target ID are required" });
    }

    const draggedProduct = await Product.findById(draggedId);
    const targetProduct = await Product.findById(targetId);

    if (!draggedProduct || !targetProduct) {
      return res.status(404).json({ error: "One or more products not found" });
    }

    // Determine scope (Category or Subcategory)
    let query = {};
    if (draggedProduct.subcategory) {
      // Scope: Same Subcategory
      query.subcategory = draggedProduct.subcategory;
    } else if (draggedProduct.category) {
      // Scope: Same Category (and no subcategory)
      query.category = draggedProduct.category;
      query.subcategory = null;
    }

    // Get all items in this scope, sorted by sortOrder
    const items = await Product.find(query).sort({ sortOrder: 1, createdAt: -1 });

    const draggedIndex = items.findIndex(p => p._id.toString() === draggedId);
    const targetIndex = items.findIndex(p => p._id.toString() === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return res.status(400).json({ error: "Products not found in the expected scope" });
    }

    // Move item in array
    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    // Update sortOrder for all affected items
    const updatePromises = newItems.map((item, index) => {
      // Only update if sortOrder changed
      if (item.sortOrder !== index + 1) {
        return Product.findByIdAndUpdate(item._id, { sortOrder: index + 1 });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    return res.json({
      success: true,
      message: "Products reordered successfully"
    });

  } catch (err) {
    console.error("Error reordering products:", err);
    return res.status(500).json({ error: err.message });
  }
};
