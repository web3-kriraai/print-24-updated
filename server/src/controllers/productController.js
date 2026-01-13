import Product from "../models/productModal.js";
import Category from "../models/categoryModal.js";
import SubCategory from "../models/subcategoryModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      basePrice,
      category,
      subcategory,
      description,
      descriptionArray,
      productType,
      options,
      filters,
      dynamicAttributes,
      quantityDiscounts,
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

    if (!name) {
      return res.status(400).json({ error: "Product name is required." });
    }

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

    // Validate and process slug
    let productSlug = slug ? slug.trim().toLowerCase() : null;

    // Auto-generate slug from name if not provided
    if (!productSlug && name) {
      productSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (!productSlug) {
      return res.status(400).json({ error: "Product slug is required or could not be generated from name." });
    }

    // Check for slug uniqueness within the same subcategory/category scope
    const slugQuery = subcategoryValue
      ? { slug: productSlug, subcategory: subcategoryValue }
      : { slug: productSlug, category: finalCategoryId, subcategory: null };

    const existingProduct = await Product.findOne(slugQuery);
    if (existingProduct) {
      const scope = subcategoryValue ? "subcategory" : "category";
      return res.status(400).json({
        error: `A product with slug "${productSlug}" already exists in this ${scope}. Please use a different slug.`
      });
    }

    const data = await Product.create({
      name,
      slug: productSlug,
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

        // Set response.subcategory = parent subcategory
        // Set response.nestedSubcategory = current subcategory
        response.subcategory = parentSubcategory;
        response.nestedSubcategory = item.subcategory;
      } else {
        // Subcategory has no parent - it's a top-level subcategory
        console.log("Subcategory has no parent - treating as top-level subcategory");
        // Set response.subcategory = current subcategory
        // Set response.nestedSubcategory = null
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

// UPDATE product
export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      basePrice,
      category,
      subcategory,
      description,
      descriptionArray,
      productType,
      options,
      filters,
      dynamicAttributes,
      quantityDiscounts,
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

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

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

    // Handle slug update with scoped uniqueness validation
    let slugUpdate = product.slug;
    if (slug !== undefined && slug !== product.slug) {
      const productSlug = slug ? slug.trim().toLowerCase() : null;

      if (!productSlug) {
        return res.status(400).json({ error: "Product slug cannot be empty." });
      }

      // Check for slug uniqueness within the same subcategory/category scope
      const finalSubcategoryId = subcategoryUpdate !== undefined ? subcategoryUpdate : product.subcategory;
      const finalCategoryId = categoryUpdate || product.category;

      const slugQuery = finalSubcategoryId
        ? { slug: productSlug, subcategory: finalSubcategoryId, _id: { $ne: productId } }
        : { slug: productSlug, category: finalCategoryId, subcategory: null, _id: { $ne: productId } };

      const duplicateProduct = await Product.findOne(slugQuery);
      if (duplicateProduct) {
        const scope = finalSubcategoryId ? "subcategory" : "category";
        return res.status(400).json({
          error: `A product with slug "${productSlug}" already exists in this ${scope}. Please use a different slug.`
        });
      }

      slugUpdate = productSlug;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name !== undefined ? name : product.name,
        slug: slugUpdate,
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
      { new: true }
    )
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
        model: "AttributeType",
        select: "_id attributeName inputStyle primaryEffectType isPricingAttribute attributeValues"
      });

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    console.log("PRODUCT UPDATE ERROR ===>", err);
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
