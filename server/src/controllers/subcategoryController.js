import SubCategory from "../models/subcategoryModal.js";
import Category from "../models/categoryModal.js";
import Product from "../models/productModal.js";
import Sequence from "../models/sequenceModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Helper function to generate a unique slug by appending increment numbers
const generateUniqueSubCategorySlug = async (baseSlug, excludeId = null) => {
  let uniqueSlug = baseSlug;
  let counter = 1;

  // Check if slug exists (excluding current subcategory if updating)
  let existingSubCategory = await SubCategory.findOne({ slug: uniqueSlug });
  if (excludeId && existingSubCategory && existingSubCategory._id.toString() === excludeId) {
    // If it's the same subcategory being updated, the slug is already unique
    return uniqueSlug;
  }

  // Keep incrementing until we find a unique slug
  while (existingSubCategory) {
    uniqueSlug = `${baseSlug}-${counter}`;
    existingSubCategory = await SubCategory.findOne({ slug: uniqueSlug });
    if (excludeId && existingSubCategory && existingSubCategory._id.toString() === excludeId) {
      // If it's the same subcategory being updated, the slug is already unique
      break;
    }
    counter++;
  }

  return uniqueSlug;
};

export const createSubCategory = async (req, res) => {
  try {
    const { name, description, category, parent, slug, sortOrder } = req.body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Subcategory name is required." });
    }

    // Validate parent subcategory if provided
    let parentSubcategory = null;
    let categoryId;

    if (parent && parent !== "" && parent !== "null") {
      // If parent is provided, validate it exists and get its category
      parentSubcategory = await SubCategory.findById(parent).populate("category");
      if (!parentSubcategory) {
        return res.status(400).json({ error: "Parent subcategory not found." });
      }
      // Use the parent subcategory's category
      categoryId = typeof parentSubcategory.category === 'object'
        ? parentSubcategory.category._id
        : parentSubcategory.category;
    } else {
      // No parent - validate category directly
      if (!category) {
        return res.status(400).json({ error: "Category is required when creating a top-level subcategory." });
      }
      // Validate that the category exists and get its ObjectId
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: "Parent category not found." });
      }
      categoryId = categoryExists._id;
    }

    // Image is required for subcategory creation
    if (!req.file) {
      return res.status(400).json({
        error: "Subcategory image is required. Please upload an image."
      });
    }

    // Validate image file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: "Invalid image format. Please upload JPG, PNG, or WebP image."
      });
    }

    // Generate slug from name if not provided
    let subCategorySlug;
    if (slug) {
      // Slug was manually provided - use it as-is (will show error if duplicate)
      subCategorySlug = slug;
    } else {
      // Slug was auto-generated - make it unique by appending numbers if needed
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      subCategorySlug = await generateUniqueSubCategorySlug(baseSlug);
    }

    let imageUrl = null;

    if (req.file) {
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "subcategories" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await streamUpload();
      imageUrl = result.secure_url;
    }

    // Parse sortOrder (default to 0 if not provided or invalid)
    const parsedSortOrder = sortOrder !== undefined && sortOrder !== null && sortOrder !== ''
      ? parseInt(sortOrder, 10)
      : 0;

    if (isNaN(parsedSortOrder)) {
      return res.status(400).json({ error: "Sort order must be a valid number." });
    }

    const data = await SubCategory.create({
      name,
      description,
      category: categoryId, // Use the validated category ObjectId
      parent: parentSubcategory ? parentSubcategory._id : null, // Set parent if provided
      slug: subCategorySlug,
      image: imageUrl,
      sortOrder: parsedSortOrder,
    });

    return res.json({
      success: true,
      message: "Subcategory created successfully",
      data,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Subcategory with this slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

export const getAllSubCategories = async (req, res) => {
  try {
    const list = await SubCategory.find()
      .populate("category")
      .populate("parent")
      .sort({ sortOrder: 1, createdAt: -1 });

    // Filter out subcategories with deleted parent categories and add warning
    const validSubCategories = list.map(subCat => {
      if (subCat.category === null || subCat.category === undefined) {
        return {
          ...subCat.toObject(),
          _warning: "Parent category has been deleted. Please reassign this subcategory to a valid category."
        };
      }
      return subCat;
    });

    res.json(validSubCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSubCategory = async (req, res) => {
  try {
    const identifier = req.params.id;

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

    let item;
    if (isObjectId) {
      // Try to find by ID first
      item = await SubCategory.findById(identifier)
        .populate("category")
        .populate("parent");
    }

    // If not found by ID or not an ObjectId, try to find by slug
    if (!item) {
      item = await SubCategory.findOne({ slug: identifier })
        .populate("category")
        .populate("parent");
    }

    if (!item) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    res.json(item);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getSubCategoriesByCategory = async (req, res) => {
  try {
    const categoryIdentifier = req.params.categoryId;
    const includeChildren = req.query.includeChildren === 'true';

    if (!categoryIdentifier) {
      return res.status(400).json({ error: "Category ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(categoryIdentifier);

    let categoryId = categoryIdentifier;
    let category;

    if (isObjectId) {
      category = await Category.findById(categoryId);
    } else {
      // Try to find by slug
      category = await Category.findOne({ slug: categoryIdentifier });
      if (category) {
        categoryId = category._id.toString();
      }
    }

    if (!category) {
      return res.status(404).json({ error: "Parent category not found. It may have been deleted." });
    }

    // Get top-level subcategories (those without a parent) for this category
    let list;
    if (includeChildren) {
      list = await getSubCategoriesWithChildren(null, category._id);
    } else {
      list = await SubCategory.find({
        category: category._id,
        $or: [
          { parent: null },
          { parent: { $exists: false } }
        ]
      })
        .populate("category")
        .populate("parent")
        .sort({ sortOrder: 1, createdAt: -1 });
    }

    res.json(list);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    res.status(500).json({ error: err.message });
  }
};

// Helper function to recursively get subcategories with their children
const getSubCategoriesWithChildren = async (parentId = null, categoryId = null) => {
  const query = {};
  if (parentId) {
    query.parent = parentId;
  } else if (categoryId) {
    query.category = categoryId;
    query.$or = [
      { parent: null },
      { parent: { $exists: false } }
    ];
  } else {
    query.$or = [
      { parent: null },
      { parent: { $exists: false } }
    ];
  }

  const subcategories = await SubCategory.find(query)
    .populate("category")
    .populate("parent")
    .sort({ sortOrder: 1, createdAt: -1 });

  // Recursively get children for each subcategory
  const subcategoriesWithChildren = await Promise.all(
    subcategories.map(async (subcat) => {
      const children = await getSubCategoriesWithChildren(subcat._id);
      return {
        ...subcat.toObject(),
        children: children.length > 0 ? children : undefined,
      };
    })
  );

  return subcategoriesWithChildren;
};

// GET subcategories by parent subcategory (nested subcategories)
export const getSubCategoriesByParent = async (req, res) => {
  try {
    const parentIdentifier = req.params.parentId;
    const includeChildren = req.query.includeChildren === 'true';

    if (!parentIdentifier) {
      return res.status(400).json({ error: "Parent subcategory ID or slug is required" });
    }

    // Check if identifier is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(parentIdentifier);

    let parentId = parentIdentifier;
    let parentSubcategory;

    if (isObjectId) {
      parentSubcategory = await SubCategory.findById(parentId);
    } else {
      // Try to find by slug
      parentSubcategory = await SubCategory.findOne({ slug: parentIdentifier });
      if (parentSubcategory) {
        parentId = parentSubcategory._id.toString();
      }
    }

    if (!parentSubcategory) {
      return res.status(404).json({ error: "Parent subcategory not found." });
    }

    // Get nested subcategories (children of this parent subcategory)
    let list;
    if (includeChildren) {
      list = await getSubCategoriesWithChildren(parentSubcategory._id);
    } else {
      list = await SubCategory.find({
        parent: parentSubcategory._id,
      })
        .populate("category")
        .populate("parent")
        .sort({ sortOrder: 1, createdAt: -1 });
    }

    res.json(list);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid parent subcategory ID" });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const { name, description, category, parent, slug, sortOrder } = req.body;
    const subCategoryId = req.params.id;

    if (!subCategoryId) {
      return res.status(400).json({ error: "Subcategory ID is required" });
    }

    const subCategory = await SubCategory.findById(subCategoryId);

    if (!subCategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Validate name if provided
    if (name !== undefined && (!name || name.trim() === "")) {
      return res.status(400).json({ error: "Subcategory name cannot be empty." });
    }

    // Validate parent subcategory if provided
    let parentSubcategory = null;
    let categoryId = subCategory.category; // Default to existing category

    if (parent !== undefined) {
      if (parent && parent !== "" && parent !== "null") {
        // Parent is provided - validate it exists
        parentSubcategory = await SubCategory.findById(parent).populate("category");
        if (!parentSubcategory) {
          return res.status(400).json({ error: "Parent subcategory not found." });
        }
        // Prevent circular reference (parent cannot be itself or its descendant)
        if (parentSubcategory._id.toString() === subCategoryId) {
          return res.status(400).json({ error: "A subcategory cannot be its own parent." });
        }
        // Check for circular references by checking if the parent is a descendant
        let currentParent = parentSubcategory.parent;
        while (currentParent) {
          if (currentParent.toString() === subCategoryId) {
            return res.status(400).json({ error: "Circular reference detected. Cannot set parent that would create a loop." });
          }
          const parentDoc = await SubCategory.findById(currentParent);
          if (!parentDoc) break;
          currentParent = parentDoc.parent;
        }
        // Use the parent subcategory's category
        categoryId = typeof parentSubcategory.category === 'object'
          ? parentSubcategory.category._id
          : parentSubcategory.category;
      } else {
        // Parent is being removed - use category if provided, otherwise keep existing
        if (category !== undefined && category) {
          const categoryExists = await Category.findById(category);
          if (!categoryExists) {
            return res.status(400).json({ error: "Parent category not found." });
          }
          categoryId = categoryExists._id;
        }
      }
    } else if (category !== undefined && category) {
      // Category is being updated but parent is not provided
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ error: "Parent category not found." });
      }
      categoryId = categoryExists._id;
    }

    // Generate slug from name if not provided
    let subCategorySlug;
    if (slug) {
      // Slug was manually provided
      // If it's the same as current slug, no need to update
      if (slug === subCategory.slug) {
        subCategorySlug = subCategory.slug; // Keep existing, no update needed
      } else {
        // Different slug - use it as-is (MongoDB will show error if duplicate)
        subCategorySlug = slug;
      }
    } else if (name) {
      // Slug was auto-generated - make it unique by appending numbers if needed
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      subCategorySlug = await generateUniqueSubCategorySlug(baseSlug, subCategoryId);
    } else {
      // Keep existing slug if name didn't change
      subCategorySlug = subCategory.slug;
    }

    // Validate image file type if new image is uploaded
    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: "Invalid image format. Please upload JPG, PNG, or WebP image."
        });
      }
    }

    let imageUrl = subCategory.image; // Keep existing image if no new one uploaded

    if (req.file) {
      const streamUpload = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "subcategories" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await streamUpload();
      imageUrl = result.secure_url;
    }

    // Parse sortOrder if provided
    let parsedSortOrder = subCategory.sortOrder || 0;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
      const parsed = parseInt(sortOrder, 10);
      if (!isNaN(parsed)) {
        parsedSortOrder = parsed;
      }
    }

    // Build update object
    const updateData = {
      name: name !== undefined ? name : subCategory.name,
      description: description !== undefined ? description : subCategory.description,
      category: categoryId, // Use the validated category ObjectId
      parent: parent !== undefined ? (parentSubcategory ? parentSubcategory._id : null) : subCategory.parent,
      image: imageUrl,
      sortOrder: parsedSortOrder,
    };

    // Only update slug if it's different from the current one
    if (subCategorySlug && subCategorySlug !== subCategory.slug) {
      updateData.slug = subCategorySlug;
    }

    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      subCategoryId,
      updateData,
      { new: true }
    )
      .populate("category")
      .populate("parent");

    return res.json({
      success: true,
      message: "Subcategory updated successfully",
      data: updatedSubCategory,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Subcategory with this slug already exists." });
    }
    return res.status(500).json({ error: err.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const subCategoryId = req.params.id;
    const subCategory = await SubCategory.findById(subCategoryId);

    if (!subCategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }

    // Check for nested subcategories (children)
    const childSubcategories = await SubCategory.find({ parent: subCategoryId });
    if (childSubcategories.length > 0) {
      return res.status(400).json({
        error: `Cannot delete subcategory. There are ${childSubcategories.length} nested subcategory(ies) under this subcategory. Please delete or reassign the nested subcategories first.`
      });
    }

    // Check for related products
    const relatedProducts = await Product.find({ subcategory: subCategoryId });
    if (relatedProducts.length > 0) {
      return res.status(400).json({
        error: `Cannot delete subcategory. There are ${relatedProducts.length} product(s) associated with this subcategory. Please delete or reassign the products first.`
      });
    }

    // Check for related sequences
    const relatedSequences = await Sequence.find({ subcategory: subCategoryId });
    if (relatedSequences.length > 0) {
      return res.status(400).json({
        error: `Cannot delete subcategory. There are ${relatedSequences.length} production sequence(s) associated with this subcategory. Please delete or reassign the sequences first.`
      });
    }

    // Safe to delete - no related data
    await SubCategory.findByIdAndDelete(subCategoryId);

    return res.json({
      success: true,
      message: "Subcategory deleted successfully",
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: "Invalid subcategory ID" });
    }
    return res.status(500).json({ error: err.message });
  }
};


