import Product from "../models/productModal.js";
import Category from "../models/categoryModal.js";
import SubCategory from "../models/subcategoryModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

<<<<<<< HEAD
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
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export const createProduct = async (req, res) => {
  try {
    const {
      name,
<<<<<<< HEAD
=======
      basePrice,
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      category,
      subcategory,
      description,
      descriptionArray,
      productType,
      options,
<<<<<<< HEAD
      filters, // ⚠️ Legacy compatibility only - READ-ONLY
      dynamicAttributes,
=======
      filters,
      dynamicAttributes,
      quantityDiscounts,
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
    // ========== VALIDATION ==========

=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (!name) {
      return res.status(400).json({ error: "Product name is required." });
    }

<<<<<<< HEAD
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
=======
    // Category is now required (subcategory is for backward compatibility)
    const categoryId = category || subcategory;
    if (!categoryId) {
      return res.status(400).json({ error: "Category is required." });
    }

    // Validate category ID format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID format. Expected MongoDB ObjectId." });
    }

    // Validate that the category exists in the database
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({ error: "Category not found. Please select a valid category." });
    }

    // If subcategory is provided, validate it exists and belongs to the category
    const subcategoryStr = subcategory ? String(subcategory).trim() : '';
    if (subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null') {
      // Validate subcategory ID format
      if (!/^[0-9a-fA-F]{24}$/.test(subcategoryStr)) {
        return res.status(400).json({ error: "Invalid subcategory ID format. Expected MongoDB ObjectId." });
      }

      // Check if subcategory exists in SubCategory collection
      const subcategoryExists = await SubCategory.findById(subcategoryStr).populate('category');
      if (!subcategoryExists) {
        return res.status(400).json({ error: "Subcategory not found. Please select a valid subcategory." });
      }

      // Validate that subcategory belongs to the selected category
      const subcategoryCategoryId = subcategoryExists.category
        ? (typeof subcategoryExists.category === 'object'
          ? subcategoryExists.category._id.toString()
          : subcategoryExists.category.toString())
        : null;

      if (subcategoryCategoryId !== categoryId) {
        return res.status(400).json({
          error: "Selected subcategory does not belong to the selected category. Please select a valid subcategory."
        });
      }
    }

    // Parse options JSON
    let parsedOptions = [];
    if (options) {
      try {
        parsedOptions = JSON.parse(options);
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in options" });
      }
    }

    // Parse filters JSON
    let parsedFilters = null;
    if (filters) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;

        // Ensure filter prices are properly structured
        if (parsedFilters) {
          // Ensure filterPricesEnabled is a boolean
          if (parsedFilters.filterPricesEnabled !== undefined) {
            parsedFilters.filterPricesEnabled = parsedFilters.filterPricesEnabled === true || parsedFilters.filterPricesEnabled === 'true';
          } else {
            parsedFilters.filterPricesEnabled = false;
          }

          // Ensure price arrays are properly formatted
          if (parsedFilters.printingOptionPrices && Array.isArray(parsedFilters.printingOptionPrices)) {
            parsedFilters.printingOptionPrices = parsedFilters.printingOptionPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.printingOptionPrices = [];
          }

          if (parsedFilters.deliverySpeedPrices && Array.isArray(parsedFilters.deliverySpeedPrices)) {
            parsedFilters.deliverySpeedPrices = parsedFilters.deliverySpeedPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.deliverySpeedPrices = [];
          }

          if (parsedFilters.textureTypePrices && Array.isArray(parsedFilters.textureTypePrices)) {
            parsedFilters.textureTypePrices = parsedFilters.textureTypePrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.textureTypePrices = [];
          }

          console.log("Parsed filters with prices (create):", JSON.stringify(parsedFilters, null, 2));
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in filters" });
      }
    }

    // Parse descriptionArray JSON
    let parsedDescriptionArray = [];
    if (descriptionArray) {
      try {
        parsedDescriptionArray = typeof descriptionArray === 'string' ? JSON.parse(descriptionArray) : descriptionArray;
      } catch (err) {
        // If not JSON, treat as single string and convert to array
        parsedDescriptionArray = descriptionArray.split('\n').filter(line => line.trim());
      }
    }

    let imageUrl = null;

    if (req.file) {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      imageUrl = result.secure_url;
    }

    // Validate basePrice is a number
    const price = basePrice ? parseFloat(basePrice) : 0;
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: "Base price must be a valid positive number" });
    }

    // Parse dynamicAttributes JSON
    let parsedDynamicAttributes = [];
    if (dynamicAttributes) {
      try {
        parsedDynamicAttributes = typeof dynamicAttributes === 'string'
          ? JSON.parse(dynamicAttributes)
          : dynamicAttributes;

        // Validate and filter dynamicAttributes
        if (Array.isArray(parsedDynamicAttributes)) {
          parsedDynamicAttributes = parsedDynamicAttributes
            .filter((da) => da && da.attributeType) // Filter out null/undefined entries
            .map((da) => ({
              attributeType: da.attributeType,
              isEnabled: da.isEnabled !== undefined ? da.isEnabled : true,
              isRequired: da.isRequired !== undefined ? da.isRequired : false,
              displayOrder: da.displayOrder !== undefined ? da.displayOrder : 0,
              customValues: Array.isArray(da.customValues) ? da.customValues : [],
            }));
        } else {
          parsedDynamicAttributes = [];
        }
      } catch (err) {
        console.error("Error parsing dynamicAttributes:", err);
        return res.status(400).json({ error: "Invalid JSON in dynamicAttributes" });
      }
    }

    console.log("Parsed dynamicAttributes for product creation:", JSON.stringify(parsedDynamicAttributes, null, 2));

    // Parse quantityDiscounts JSON
    let parsedQuantityDiscounts = [];
    if (quantityDiscounts) {
      try {
        parsedQuantityDiscounts = typeof quantityDiscounts === 'string'
          ? JSON.parse(quantityDiscounts)
          : quantityDiscounts;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in quantityDiscounts" });
      }
    }

    // Parse file upload constraints
    const parsedMaxFileSizeMB = maxFileSizeMB ? parseFloat(maxFileSizeMB) : undefined;
    const parsedMinFileWidth = minFileWidth ? parseInt(minFileWidth) : undefined;
    const parsedMaxFileWidth = maxFileWidth ? parseInt(maxFileWidth) : undefined;
    const parsedMinFileHeight = minFileHeight ? parseInt(minFileHeight) : undefined;
    const parsedMaxFileHeight = maxFileHeight ? parseInt(maxFileHeight) : undefined;
    const parsedBlockCDRandJPG = blockCDRandJPG === "true" || blockCDRandJPG === true;

    // Parse additional charges and taxes
    const parsedAdditionalDesignCharge = additionalDesignCharge ? parseFloat(additionalDesignCharge) : 0;
    const parsedGstPercentage = gstPercentage ? parseFloat(gstPercentage) : 0;
    const parsedShowPriceIncludingGst = showPriceIncludingGst === true || showPriceIncludingGst === 'true';

    // Parse productionSequence JSON
    let parsedProductionSequence = [];
    if (productionSequence) {
      try {
        parsedProductionSequence = typeof productionSequence === 'string'
          ? JSON.parse(productionSequence)
          : productionSequence;
        // Ensure it's an array of valid ObjectIds
        if (Array.isArray(parsedProductionSequence)) {
          parsedProductionSequence = parsedProductionSequence.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        } else {
          parsedProductionSequence = [];
        }
      } catch (err) {
        console.log("Error parsing productionSequence:", err);
        parsedProductionSequence = [];
      }
    }

    // Ensure subcategory is properly set (not empty string)
    // If subcategory is provided, use it; otherwise use categoryId
    const subcategoryValue = subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null' ? subcategoryStr : null;
    // If subcategory is provided, category should be the parent category; otherwise use categoryId
    const finalCategoryId = subcategoryValue ? categoryId : categoryId;

    const data = await Product.create({
      name,
      basePrice: price,
      category: finalCategoryId, // Store parent category ID
      subcategory: subcategoryValue, // Store subcategory ID from SubCategory collection
      description,
      descriptionArray: parsedDescriptionArray,
      productType: productType || "",
      image: imageUrl,
      options: parsedOptions,
      filters: parsedFilters,
      dynamicAttributes: parsedDynamicAttributes,
      quantityDiscounts: parsedQuantityDiscounts,
      maxFileSizeMB: parsedMaxFileSizeMB,
      minFileWidth: parsedMinFileWidth,
      maxFileWidth: parsedMaxFileWidth,
      minFileHeight: parsedMinFileHeight,
      maxFileHeight: parsedMaxFileHeight,
      blockCDRandJPG: parsedBlockCDRandJPG,
      additionalDesignCharge: parsedAdditionalDesignCharge,
      gstPercentage: parsedGstPercentage,
      showPriceIncludingGst: parsedShowPriceIncludingGst,
      instructions: instructions || "",
      productionSequence: parsedProductionSequence,
    });

    // Populate category (and subcategory for backward compatibility) before returning
    const populatedProduct = await Product.findById(data._id)
      .populate({
        path: "category",
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true } // Populate parent hierarchy
        }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
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
=======
    console.log("Product created with subcategory ID:", subcategory);
    console.log("Populated product subcategory:", populatedProduct?.subcategory);
    console.log("Product created with dynamicAttributes count:", populatedProduct?.dynamicAttributes?.length || 0);
    if (populatedProduct?.dynamicAttributes && populatedProduct.dynamicAttributes.length > 0) {
      console.log("Dynamic attributes details:", populatedProduct.dynamicAttributes.map((da) => ({
        attributeTypeId: typeof da.attributeType === 'object' ? da.attributeType?._id : da.attributeType,
        attributeName: typeof da.attributeType === 'object' ? da.attributeType?.attributeName : 'N/A',
        isEnabled: da.isEnabled,
        isRequired: da.isRequired
      })));
    }

    return res.json({
      success: true,
      message: "Product created successfully",
      data: populatedProduct || data,
    });
  } catch (err) {
    console.log("PRODUCT ERROR ===>", err);
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    return res.status(500).json({ error: err.message });
  }
};

<<<<<<< HEAD
/**
 * GET ALL PRODUCTS
 * GET /products
 */
=======
// GET all products
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export const getAllProducts = async (req, res) => {
  try {
    const list = await Product.find()
      .populate({
        path: "category",
<<<<<<< HEAD
        select: "_id name description image type parent slug"
=======
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
    console.log(`✅ Fetched ${list.length} product(s)`);
    res.json(list);
  } catch (err) {
    console.error("❌ Error fetching all products:", err);
=======
    console.log(`Fetched ${list.length} product(s) total`);
    console.log("=== ALL PRODUCTS DATA ===");
    console.log(JSON.stringify(list, null, 2));
    res.json(list);
  } catch (err) {
    console.error("Error fetching all products:", err);
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
};

<<<<<<< HEAD
/**
 * GET SINGLE PRODUCT BY ID
 * GET /products/:id
 */
=======
// GET product by ID
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export const getSingleProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

<<<<<<< HEAD
    if (!validateObjectId(productId)) {
=======
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
    } else {
      // Not a valid ObjectId format
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      return res.status(400).json({
        error: "Invalid product ID format. Expected MongoDB ObjectId (24 hex characters).",
        received: productId
      });
    }

<<<<<<< HEAD
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

=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (!item) {
      return res.status(404).json({ error: "Product not found" });
    }

<<<<<<< HEAD
    console.log(`✅ Product found: ${item.name}`);
    res.json(item);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
=======
    console.log("Product found:", item.name);
    console.log("=== SINGLE PRODUCT DATA ===");
    console.log(JSON.stringify(item, null, 2));
    res.json(item);
  } catch (err) {
    console.error("Error fetching product:", err);
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch product" });
  }
};

<<<<<<< HEAD
/**
 * GET PRODUCTS BY CATEGORY
 * Supports both category ID and subcategory ID
 * Includes nested subcategory support
 * 
 * GET /products/category/:categoryId
 */
=======
// GET products by category (works with any level in hierarchy)
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export const getProductsByCategory = async (req, res) => {
  try {
    const categoryIdentifier = req.params.categoryId;

    if (!categoryIdentifier) {
      return res.status(400).json({ error: "Category ID or slug is required" });
    }

<<<<<<< HEAD
    const isObjectId = validateObjectId(categoryIdentifier);
    let categoryId = categoryIdentifier;

    // If not an ObjectId, try to find by slug
    if (!isObjectId) {
      const category = await Category.findOne({ slug: categoryIdentifier });
      if (!category) {
        // Check if it's a subcategory slug
=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
    // Check if it's a subcategory
    const isSubcategory = await SubCategory.findById(categoryId);

=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    let query;

    if (isSubcategory) {
      // It's a subcategory - find products with this subcategory
      query = { subcategory: categoryId };
    } else {
<<<<<<< HEAD
      // Verify it's a valid category
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Get all subcategory IDs under this category (including nested)
=======
      // It's a category - find products directly under this category OR in its subcategories (including nested)
      // Helper function to recursively get all subcategory IDs (including nested ones)
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
<<<<<<< HEAD
=======
          // Find nested subcategories (children of this subcategory)
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
      // Build query: products directly under category OR in subcategories
      if (subcategoryIds.length > 0) {
        query = {
          $or: [
=======
      // Build query: products directly under category OR products in subcategories (including nested)
      if (subcategoryIds.length > 0) {
        query = {
          $or: [
            // Direct category products: category matches AND subcategory is null/undefined
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
            {
              category: categoryId,
              $or: [
                { subcategory: null },
                { subcategory: { $exists: false } }
              ]
            },
<<<<<<< HEAD
=======
            // Products in subcategories of this category (including nested subcategories)
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
            { subcategory: { $in: subcategoryIds } }
          ]
        };
      } else {
<<<<<<< HEAD
=======
        // No subcategories exist, so only look for direct category products
        // Products where category matches AND subcategory is null or doesn't exist
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
        query = {
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        };
      }
    }

<<<<<<< HEAD
    const list = await Product.find(query)
      .populate({
        path: "category",
        select: "_id name description image type parent slug"
=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
<<<<<<< HEAD
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

<<<<<<< HEAD
    console.log(`✅ Fetched ${list.length} product(s) for category ${categoryId}`);
    res.json(list);
  } catch (err) {
    console.error("❌ Error in getProductsByCategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
=======
    console.log(`=== PRODUCTS BY CATEGORY (${categoryId}) ===`);
    console.log(`Fetched ${list.length} product(s)`);
    console.log(JSON.stringify(list, null, 2));
    res.json(list);
  } catch (err) {
    console.error("Error in getProductsByCategory:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    // If it's a validation error or other known error, return 400
    if (err.name === 'ValidationError' || err.message.includes('Cast to ObjectId')) {
      return res.status(400).json({ error: err.message || "Invalid category ID" });
    }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

<<<<<<< HEAD
/**
 * GET PRODUCTS BY SUBCATEGORY
 * Includes nested subcategory support
 * Falls back to category products if no subcategory products found
 * 
 * GET /products/subcategory/:subcategoryId
 */
=======
// GET products by subcategory (explicit endpoint)
// Priority: First find products with subcategory, if none found, fall back to category products
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export const getProductsBySubcategory = async (req, res) => {
  try {
    const subcategoryIdentifier = req.params.subcategoryId;

    if (!subcategoryIdentifier) {
      return res.status(400).json({ error: "Subcategory ID or slug is required" });
    }

<<<<<<< HEAD
    const isObjectId = validateObjectId(subcategoryIdentifier);
    let subcategoryId = subcategoryIdentifier;

    // If not an ObjectId, try to find by slug
    if (!isObjectId) {
=======
    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryIdentifier);

    let subcategoryId = subcategoryIdentifier;

    // If not an ObjectId, try to find subcategory by slug
    if (!isObjectId) {
      const SubCategory = (await import("../models/subcategoryModal.js")).default;
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      const subcategory = await SubCategory.findOne({ slug: subcategoryIdentifier });
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      subcategoryId = subcategory._id.toString();
    }

<<<<<<< HEAD
    // Get all nested subcategory IDs
=======
    console.log("Fetching products for subcategory ID:", subcategoryId);

    // Helper function to recursively get all nested subcategory IDs
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    const getAllNestedSubcategoryIds = async (parentSubcategoryId) => {
      const allIds = [parentSubcategoryId];
      const nestedSubcategories = await SubCategory.find({ parent: parentSubcategoryId }).select('_id');
      for (const nested of nestedSubcategories) {
        const nestedIds = await getAllNestedSubcategoryIds(nested._id);
        allIds.push(...nestedIds);
      }
      return allIds;
    };

<<<<<<< HEAD
    const allSubcategoryIds = await getAllNestedSubcategoryIds(subcategoryId);

    // Find products with subcategory
=======
    // Get all nested subcategory IDs (including the current one)
    const allSubcategoryIds = await getAllNestedSubcategoryIds(subcategoryId);

    // First priority: Find products where subcategory matches the provided ID or any nested subcategory
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    let list = await Product.find({
      subcategory: { $in: allSubcategoryIds },
    })
      .populate({
        path: "category",
<<<<<<< HEAD
        select: "_id name description image type parent slug"
=======
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
<<<<<<< HEAD
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType"
      })
      .sort({ createdAt: -1 });

<<<<<<< HEAD
    console.log(`✅ Found ${list.length} product(s) with subcategory ${subcategoryId}`);

    // Fallback to category products if none found
    if (list.length === 0) {
=======
    console.log(`Found ${list.length} product(s) with subcategory ${subcategoryId}`);

    // If no products found with subcategory, fall back to category products
    if (list.length === 0) {
      // Get the parent category ID from the subcategory
      const SubCategory = (await import("../models/subcategoryModal.js")).default;
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      const subcategory = await SubCategory.findById(subcategoryId).populate('category');

      if (subcategory && subcategory.category) {
        const categoryId = typeof subcategory.category === 'object'
          ? subcategory.category._id
          : subcategory.category;

<<<<<<< HEAD
        console.log(`   Falling back to category ${categoryId}`);

=======
        console.log(`No products found with subcategory, falling back to category ${categoryId}`);

        // Find products directly under the parent category
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
        list = await Product.find({
          category: categoryId,
          $or: [
            { subcategory: null },
            { subcategory: { $exists: false } }
          ]
        })
          .populate({
            path: "category",
<<<<<<< HEAD
            select: "_id name description image type parent slug"
=======
            select: "_id name description image type parent slug",
            populate: {
              path: "parent",
              select: "_id name type",
              options: { recursive: true }
            }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
        console.log(`   Found ${list.length} product(s) in parent category`);
      }
    }

    res.json(list);
  } catch (err) {
    console.error("❌ Error fetching products by subcategory:", err);
=======
        console.log(`Found ${list.length} product(s) in parent category ${categoryId}`);
      }
    }

    console.log(`=== PRODUCTS BY SUBCATEGORY (${subcategoryId}) ===`);
    console.log(`Fetched ${list.length} product(s)`);
    console.log(JSON.stringify(list, null, 2));
    // Return the list of products
    res.json(list);
  } catch (err) {
    console.error("Error fetching products by subcategory:", err);
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }
    res.status(500).json({ error: err.message || "Failed to fetch products by subcategory" });
  }
};

<<<<<<< HEAD
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
=======
// UPDATE product
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
export const updateProduct = async (req, res) => {
  try {
    const {
      name,
<<<<<<< HEAD
=======
      basePrice,
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      category,
      subcategory,
      description,
      descriptionArray,
      productType,
      options,
<<<<<<< HEAD
      filters, // ⚠️ Legacy compatibility only - READ-ONLY
      dynamicAttributes,
=======
      filters,
      dynamicAttributes,
      quantityDiscounts,
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
    // ========== VALIDATION ==========

=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

<<<<<<< HEAD
    if (!validateObjectId(productId)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Product.findById(productId);
=======
    const product = await Product.findById(productId);

>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

<<<<<<< HEAD
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
=======
    // Parse options JSON
    let parsedOptions = product.options || [];
    if (options) {
      try {
        parsedOptions = JSON.parse(options);
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in options" });
      }
    }

    // Parse filters JSON
    let parsedFilters = product.filters || null;
    if (filters !== undefined) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;

        // Ensure filter prices are properly structured
        if (parsedFilters) {
          // Ensure filterPricesEnabled is a boolean
          if (parsedFilters.filterPricesEnabled !== undefined) {
            parsedFilters.filterPricesEnabled = parsedFilters.filterPricesEnabled === true || parsedFilters.filterPricesEnabled === 'true';
          } else {
            parsedFilters.filterPricesEnabled = false;
          }

          // Ensure price arrays are properly formatted
          if (parsedFilters.printingOptionPrices && Array.isArray(parsedFilters.printingOptionPrices)) {
            parsedFilters.printingOptionPrices = parsedFilters.printingOptionPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.printingOptionPrices = [];
          }

          if (parsedFilters.deliverySpeedPrices && Array.isArray(parsedFilters.deliverySpeedPrices)) {
            parsedFilters.deliverySpeedPrices = parsedFilters.deliverySpeedPrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.deliverySpeedPrices = [];
          }

          if (parsedFilters.textureTypePrices && Array.isArray(parsedFilters.textureTypePrices)) {
            parsedFilters.textureTypePrices = parsedFilters.textureTypePrices.map((p) => ({
              name: String(p.name || '').trim(),
              priceAdd: typeof p.priceAdd === 'number' ? p.priceAdd : (p.priceAdd ? parseFloat(String(p.priceAdd)) : 0)
            })).filter(p => p.name.length > 0);
          } else if (parsedFilters.filterPricesEnabled) {
            parsedFilters.textureTypePrices = [];
          }
        }
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in filters" });
      }
    }

    // Parse descriptionArray JSON
    let parsedDescriptionArray = product.descriptionArray || [];
    if (descriptionArray !== undefined) {
      try {
        parsedDescriptionArray = typeof descriptionArray === 'string' ? JSON.parse(descriptionArray) : descriptionArray;
      } catch (err) {
        // If not JSON, treat as single string and convert to array
        parsedDescriptionArray = descriptionArray ? descriptionArray.split('\n').filter(line => line.trim()) : [];
      }
    }

    let imageUrl = product.image; // Keep existing image if no new one uploaded

    if (req.file) {
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "products" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadStream();
      imageUrl = result.secure_url;
    }

    // Validate subcategory if provided
    if (subcategory && !/^[0-9a-fA-F]{24}$/.test(subcategory)) {
      return res.status(400).json({ error: "Invalid subcategory ID format" });
    }

    // Validate basePrice if provided
    let validatedBasePrice = product.basePrice;
    if (basePrice !== undefined) {
      const price = parseFloat(basePrice);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Base price must be a valid positive number" });
      }
      validatedBasePrice = price;
    }

    // Parse dynamicAttributes JSON
    let parsedDynamicAttributes = product.dynamicAttributes || [];
    if (dynamicAttributes !== undefined) {
      try {
        parsedDynamicAttributes = typeof dynamicAttributes === 'string'
          ? JSON.parse(dynamicAttributes)
          : dynamicAttributes;

        // Validate and filter dynamicAttributes
        if (Array.isArray(parsedDynamicAttributes)) {
          parsedDynamicAttributes = parsedDynamicAttributes
            .filter((da) => da && da.attributeType) // Filter out null/undefined entries
            .map((da) => ({
              attributeType: da.attributeType,
              isEnabled: da.isEnabled !== undefined ? da.isEnabled : true,
              isRequired: da.isRequired !== undefined ? da.isRequired : false,
              displayOrder: da.displayOrder !== undefined ? da.displayOrder : 0,
              customValues: Array.isArray(da.customValues) ? da.customValues : [],
            }));
        } else {
          parsedDynamicAttributes = [];
        }
      } catch (err) {
        console.error("Error parsing dynamicAttributes:", err);
        return res.status(400).json({ error: "Invalid JSON in dynamicAttributes" });
      }
    }

    console.log("Parsed dynamicAttributes for product update:", JSON.stringify(parsedDynamicAttributes, null, 2));

    // Parse quantityDiscounts JSON
    let parsedQuantityDiscounts = product.quantityDiscounts || [];
    if (quantityDiscounts !== undefined) {
      try {
        parsedQuantityDiscounts = typeof quantityDiscounts === 'string'
          ? JSON.parse(quantityDiscounts)
          : quantityDiscounts;
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in quantityDiscounts" });
      }
    }

    // Parse file upload constraints
    const parsedMaxFileSizeMB = maxFileSizeMB !== undefined ? (maxFileSizeMB ? parseFloat(maxFileSizeMB) : undefined) : product.maxFileSizeMB;
    const parsedMinFileWidth = minFileWidth !== undefined ? (minFileWidth ? parseInt(minFileWidth) : undefined) : product.minFileWidth;
    const parsedMaxFileWidth = maxFileWidth !== undefined ? (maxFileWidth ? parseInt(maxFileWidth) : undefined) : product.maxFileWidth;
    const parsedMinFileHeight = minFileHeight !== undefined ? (minFileHeight ? parseInt(minFileHeight) : undefined) : product.minFileHeight;
    const parsedMaxFileHeight = maxFileHeight !== undefined ? (maxFileHeight ? parseInt(maxFileHeight) : undefined) : product.maxFileHeight;
    const parsedBlockCDRandJPG = blockCDRandJPG !== undefined ? (blockCDRandJPG === "true" || blockCDRandJPG === true) : product.blockCDRandJPG;

    // Parse additional charges and taxes
    const parsedAdditionalDesignCharge = additionalDesignCharge !== undefined ? (additionalDesignCharge ? parseFloat(additionalDesignCharge) : 0) : product.additionalDesignCharge;
    const parsedGstPercentage = gstPercentage !== undefined ? (gstPercentage ? parseFloat(gstPercentage) : 0) : product.gstPercentage;
    const parsedShowPriceIncludingGst = showPriceIncludingGst !== undefined ? (showPriceIncludingGst === true || showPriceIncludingGst === 'true') : (product.showPriceIncludingGst || false);

    // Parse productionSequence JSON
    let parsedProductionSequence = product.productionSequence || [];
    if (productionSequence !== undefined) {
      try {
        parsedProductionSequence = typeof productionSequence === 'string'
          ? JSON.parse(productionSequence)
          : productionSequence;
        // Ensure it's an array of valid ObjectIds
        if (Array.isArray(parsedProductionSequence)) {
          parsedProductionSequence = parsedProductionSequence.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
        } else {
          parsedProductionSequence = [];
        }
      } catch (err) {
        console.log("Error parsing productionSequence:", err);
        parsedProductionSequence = product.productionSequence || [];
      }
    }

    // Handle category and subcategory updates
    let categoryUpdate = product.category;
    let subcategoryUpdate = product.subcategory;

    // Validate category if provided
    if (category) {
      // Validate category ID format
      if (!/^[0-9a-fA-F]{24}$/.test(category)) {
        return res.status(400).json({ error: "Invalid category ID format. Expected MongoDB ObjectId." });
      }

      // Validate that the category exists
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: "Category not found. Please select a valid category." });
      }

      categoryUpdate = category;
    }

    // Always update subcategory if provided (even if empty string, set to null)
    if (subcategory !== undefined) {
      const subcategoryStr = subcategory ? String(subcategory).trim() : '';
      if (subcategoryStr && subcategoryStr !== '' && subcategoryStr !== 'null') {
        // Validate subcategory ID format
        if (!/^[0-9a-fA-F]{24}$/.test(subcategoryStr)) {
          return res.status(400).json({ error: "Invalid subcategory ID format. Expected MongoDB ObjectId." });
        }

        // Validate that subcategory exists in SubCategory collection
        const SubCategory = (await import("../models/subcategoryModal.js")).default;
        const subcategoryExists = await SubCategory.findById(subcategoryStr).populate('category');
        if (!subcategoryExists) {
          return res.status(400).json({ error: "Subcategory not found. Please select a valid subcategory." });
        }

        // Validate that subcategory belongs to the category (if category is also being updated or already set)
        const finalCategoryId = categoryUpdate || product.category;
        if (finalCategoryId) {
          // Get the parent category from the subcategory
          const subcategoryCategoryId = subcategoryExists.category
            ? (typeof subcategoryExists.category === 'object' ? subcategoryExists.category._id : subcategoryExists.category)
            : null;

          if (!subcategoryCategoryId || subcategoryCategoryId.toString() !== finalCategoryId.toString()) {
            return res.status(400).json({
              error: "Selected subcategory does not belong to the selected category. Please select a valid subcategory."
            });
          }
        }

        subcategoryUpdate = subcategoryStr;
      } else {
        // Empty subcategory - product will be directly under category
        subcategoryUpdate = null;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name !== undefined ? name : product.name,
        basePrice: validatedBasePrice,
        category: categoryUpdate,
        subcategory: subcategoryUpdate,
        description: description !== undefined ? description : product.description,
        descriptionArray: parsedDescriptionArray,
        // productType is deprecated - keep existing value for backward compatibility but don't update it
        productType: product.productType,
        image: imageUrl,
        options: parsedOptions,
        filters: parsedFilters,
        dynamicAttributes: parsedDynamicAttributes,
        quantityDiscounts: parsedQuantityDiscounts,
        maxFileSizeMB: parsedMaxFileSizeMB,
        minFileWidth: parsedMinFileWidth,
        maxFileWidth: parsedMaxFileWidth,
        minFileHeight: parsedMinFileHeight,
        maxFileHeight: parsedMaxFileHeight,
        blockCDRandJPG: parsedBlockCDRandJPG,
        additionalDesignCharge: parsedAdditionalDesignCharge,
        gstPercentage: parsedGstPercentage,
        showPriceIncludingGst: parsedShowPriceIncludingGst,
        instructions: instructions !== undefined ? instructions : product.instructions,
        productionSequence: parsedProductionSequence,
      },
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      { new: true }
    )
      .populate({
        path: "category",
<<<<<<< HEAD
        select: "_id name description image type parent slug"
=======
        select: "_id name description image type parent slug",
        populate: {
          path: "parent",
          select: "_id name type",
          options: { recursive: true }
        }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      })
      .populate({
        path: "subcategory",
        select: "_id name description image slug category parent",
<<<<<<< HEAD
        populate: {
          path: "category",
          model: "Category",
          select: "_id name description type image"
        }
=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      })
      .populate({
        path: "dynamicAttributes.attributeType",
        model: "AttributeType",
        select: "_id attributeName inputStyle primaryEffectType isPricingAttribute attributeValues"
      });

<<<<<<< HEAD
    console.log(`✅ Product updated: ${updatedProduct.name} (ID: ${productId})`);

=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    return res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
<<<<<<< HEAD
    console.error("❌ PRODUCT UPDATE ERROR:", err);
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
=======
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.log("PRODUCT UPDATE ERROR ===>", err);
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    return res.status(500).json({ error: err.message });
  }
};

<<<<<<< HEAD
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
=======
// DELETE product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

<<<<<<< HEAD
    await Product.findByIdAndDelete(productId);

    console.log(`✅ Product deleted: ${product.name} (ID: ${productId})`);
=======
    await Product.findByIdAndDelete(req.params.id);
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
<<<<<<< HEAD
    console.error("❌ PRODUCT DELETE ERROR:", err);
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};