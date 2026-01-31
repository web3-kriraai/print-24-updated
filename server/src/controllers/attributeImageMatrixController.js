import AttributeImageMatrix from "../models/AttributeImageMatrix.js";
import Product from "../models/productModal.js";
import SubAttribute from "../models/subAttributeSchema.js";
import AttributeRule from "../models/AttributeRuleSchema.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/**
 * Attribute Image Matrix Controller
 * 
 * Manages pre-rendered product images for attribute combinations.
 * Uses the Matrix Strategy for O(1) image resolution.
 * 
 * Optimizations:
 * - Stream-based uploads to minimize memory usage
 * - Batch operations for large matrices
 * - Lean queries for faster reads
 * - Cloudinary transformations for responsive images
 * - Sub-attribute support for complete attribute combinations
 */

// ========== HELPER FUNCTIONS ==========

/**
 * Generate a semantic filename from combination key
 * Converts "attrId1:value1__subValue1|attrId2:value2" to "value1-subValue1_value2"
 * This creates SEO-friendly, human-readable image names
 * 
 * @param {string} combinationKey - Raw combination key
 * @returns {string} Semantic filename
 */
const generateSemanticFilename = (combinationKey) => {
    if (!combinationKey) return 'default';

    // Extract values from key:value pairs
    const parts = combinationKey.split('|');
    const values = parts.map(part => {
        const [, value] = part.split(':');
        if (!value) return '';
        // Handle sub-attribute values (parentValue__subValue format)
        return value.replace(/__/g, '-');
    }).filter(v => v.length > 0);

    // Join with underscores, sanitize for file naming
    return values
        .join('_')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .substring(0, 80); // Limit length
};

/**
 * Upload image buffer to Cloudinary via stream
 * @param {Buffer} buffer - Image buffer
 * @param {string} productId - Product ID for folder organization
 * @param {string} combinationKey - Used for semantic naming
 * @returns {Promise<{url, publicId, thumbnailUrl}>}
 */
const uploadToCloudinary = async (buffer, productId, combinationKey) => {
    return new Promise((resolve, reject) => {
        // Generate semantic filename from combination key
        const semanticName = generateSemanticFilename(combinationKey);
        const publicId = `prod_${productId}_${semanticName}_${Date.now()}`;

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `product-matrix/${productId}`,
                public_id: publicId,
                resource_type: "image",
                transformation: [
                    { quality: "auto" },
                    { fetch_format: "auto" }
                ],
                // Eager transformations for pre-generated thumbnails
                eager: [
                    { width: 150, height: 150, crop: "fill", quality: "auto" }
                ],
                eager_async: true
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
                        width: result.width,
                        height: result.height,
                        fileSize: result.bytes
                    });
                }
            }
        );

        streamifier.createReadStream(buffer).pipe(stream);
    });
};


/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (error) {
        console.warn("Failed to delete image from Cloudinary:", error.message);
    }
};

/**
 * Fetch applicable attribute rules for a product
 * @param {string} productId - Product ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Array>} Array of applicable rules
 */
const fetchApplicableRules = async (productId, categoryId) => {
    return await AttributeRule.find({
        isActive: true,
        $or: [
            { applicableProduct: productId },
            { applicableCategory: categoryId },
            { $and: [{ applicableProduct: null }, { applicableCategory: null }] } // Global rules
        ]
    })
        .populate('when.attribute', '_id attributeName')
        .populate('then.targetAttribute', '_id attributeName')
        .sort({ priority: -1 })
        .lean();
};

/**
 * Filter combinations based on attribute rules
 * Reduces the matrix by removing invalid combinations that violate rules
 * 
 * Rules supported:
 * - HIDE: When condition is met, hide target attribute (don't generate combinations for it)
 * - SHOW_ONLY: When condition is met, only allow specific values for target attribute
 * 
 * @param {Array} combinations - Array of combination objects {key, attributes}
 * @param {Array} rules - Array of attribute rules
 * @param {Array} attributes - Array of attribute definitions
 * @returns {Array} Filtered combinations
 */
const filterCombinationsWithRules = (combinations, rules, attributes) => {
    if (!rules || rules.length === 0) {
        return combinations;
    }

    // Create attribute ID to name mapping
    const attrIdToName = {};
    attributes.forEach(attr => {
        attrIdToName[attr.id] = attr.name;
    });

    return combinations.filter(combo => {
        // Parse the combination to get attribute values
        const comboValues = {};
        combo.key.split('|').forEach(part => {
            const [attrId, value] = part.split(':');
            // Handle sub-attribute values (strip the parentValue part)
            const baseValue = value.includes('__') ? value.split('__')[0] : value;
            comboValues[attrId] = { full: value, base: baseValue };
        });

        // Check each rule
        for (const rule of rules) {
            const whenAttrId = rule.when.attribute?._id?.toString();
            const whenValue = rule.when.value;

            // Check if the WHEN condition is met
            if (whenAttrId && comboValues[whenAttrId]) {
                const comboValueData = comboValues[whenAttrId];
                // Match either full value or base value (for sub-attributes)
                const conditionMet = comboValueData.base === whenValue ||
                    comboValueData.full === whenValue;

                if (conditionMet) {
                    // Apply THEN actions
                    for (const action of rule.then) {
                        const targetAttrId = action.targetAttribute?._id?.toString();

                        if (action.action === 'HIDE') {
                            // If HIDE, any combination with a value for target attribute is invalid
                            // (This means target attribute shouldn't appear when condition is met)
                            if (targetAttrId && comboValues[targetAttrId]) {
                                // Only hide if there's a non-empty value
                                // For HIDE action, we filter out combinations where the target has sub-attributes
                                // or specific values that shouldn't be shown
                                return false;
                            }
                        } else if (action.action === 'SHOW_ONLY') {
                            // If SHOW_ONLY, only allow specific values
                            if (targetAttrId && comboValues[targetAttrId]) {
                                const allowedValues = action.allowedValues || [];
                                const currentValue = comboValues[targetAttrId].base;
                                if (!allowedValues.includes(currentValue)) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }

        return true; // Combination passes all rules
    });
};

// ========== CONTROLLER METHODS ==========

/**
 * Get all matrix entries for a product
 * GET /products/:productId/image-matrix
 */
export const getProductMatrix = async (req, res) => {
    try {
        const { productId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;

        // Build query
        const query = { product: productId };
        if (status && ['MISSING', 'UPLOADED'].includes(status)) {
            query.status = status;
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch entries with pagination
        const [entries, total, stats] = await Promise.all([
            AttributeImageMatrix.find(query)
                .sort({ sortOrder: 1, createdAt: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            AttributeImageMatrix.countDocuments(query),
            AttributeImageMatrix.getProductStats(productId)
        ]);

        res.json({
            success: true,
            entries,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats
        });
    } catch (error) {
        console.error("Error fetching product matrix:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch product matrix"
        });
    }
};

/**
 * Generate matrix entries for a product (Cartesian product of attributes + sub-attributes)
 * POST /products/:productId/image-matrix/generate
 * 
 * Enhanced to include sub-attributes:
 * - Detects attribute values with hasSubAttributes: true
 * - Fetches corresponding sub-attributes from SubAttribute collection
 * - Expands matrix to include all sub-attribute combinations
 * - Uses semantic naming: parentValue + subValue for better organization
 */
export const generateProductMatrix = async (req, res) => {
    try {
        const { productId } = req.params;
        const { regenerate = false, includeSubAttributes = true } = req.body;

        // Fetch product with populated attributes
        const product = await Product.findById(productId)
            .populate('dynamicAttributes.attributeType')
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found"
            });
        }

        // Fetch applicable attribute rules for this product
        const categoryId = typeof product.category === 'object'
            ? product.category._id?.toString()
            : product.category?.toString();
        const rules = await fetchApplicableRules(productId, categoryId);
        console.log(`[ImageMatrix] Fetched ${rules.length} applicable rules for product ${productId}`);

        // Filter for eligible attributes (DROPDOWN, RADIO, POPUP with values)
        const eligibleInputStyles = ['DROPDOWN', 'RADIO', 'POPUP'];

        // IMPORTANT: Deduplicate attributes by attributeType ID
        // Products may have multiple dynamicAttribute entries pointing to the same attributeType
        const seenAttrIds = new Set();

        const eligibleAttrs = product.dynamicAttributes
            ?.filter(attr => {
                if (!attr.isEnabled) return false;
                const attrType = attr.attributeType;
                if (!attrType) return false;

                // Deduplicate by attribute type ID
                const attrId = attrType._id.toString();
                if (seenAttrIds.has(attrId)) {
                    return false; // Skip duplicate
                }
                seenAttrIds.add(attrId);

                if (!eligibleInputStyles.includes(attrType.inputStyle)) return false;
                const values = attrType.attributeValues || [];
                return values.length > 0;
            }) || [];

        if (eligibleAttrs.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No eligible attributes found for matrix generation. Product must have DROPDOWN, RADIO, or POPUP attributes with values."
            });
        }

        // Build attributes array with sub-attribute expansion
        const attributes = [];

        for (const attr of eligibleAttrs) {
            const attrType = attr.attributeType;
            const attrId = attrType._id.toString();
            const attrName = attrType.attributeName;

            // Always check SubAttribute collection for ALL values when includeSubAttributes is true
            // Don't rely solely on hasSubAttributes flag as it may not be set correctly
            const subAttrsByParentValue = new Map();

            if (includeSubAttributes) {
                for (const v of attrType.attributeValues) {
                    const subAttrs = await SubAttribute.find({
                        parentAttribute: attrType._id,
                        parentValue: v.value,
                        isEnabled: true
                    }).lean();

                    if (subAttrs.length > 0) {
                        subAttrsByParentValue.set(v.value, subAttrs);
                    }
                }
            }

            if (subAttrsByParentValue.size > 0) {
                // Build expanded values list with sub-attributes
                const expandedValues = [];

                for (const v of attrType.attributeValues) {
                    if (subAttrsByParentValue.has(v.value)) {
                        // Expand into sub-attribute combinations
                        const subAttrs = subAttrsByParentValue.get(v.value);
                        for (const subAttr of subAttrs) {
                            expandedValues.push({
                                // Composite value: parentValue__subValue for unique identification
                                value: `${v.value}__${subAttr.value}`,
                                // Semantic label for display: "Parent - SubAttribute"
                                label: `${v.label || v.value} - ${subAttr.label}`,
                                // Store metadata for naming
                                parentValue: v.value,
                                subValue: subAttr.value,
                                subLabel: subAttr.label,
                                isSubAttribute: true
                            });
                        }
                    } else {
                        // Regular value without sub-attributes
                        expandedValues.push({
                            value: v.value,
                            label: v.label || v.value,
                            isSubAttribute: false
                        });
                    }
                }

                attributes.push({
                    id: attrId,
                    name: attrName,
                    values: expandedValues,
                    hasSubAttributes: true
                });
            } else {
                // No sub-attributes found, use original values
                attributes.push({
                    id: attrId,
                    name: attrName,
                    values: attrType.attributeValues.map(v => ({
                        value: v.value,
                        label: v.label || v.value,
                        isSubAttribute: false
                    })),
                    hasSubAttributes: false
                });
            }
        }

        // Calculate total combinations for validation
        const totalCombinations = attributes.reduce((acc, attr) => acc * attr.values.length, 1);

        // Safety check - warn if matrix is very large
        if (totalCombinations > 1000) {
            console.warn(`Large matrix warning: ${totalCombinations} combinations for product ${productId}`);
        }

        // If regenerate is false and entries exist, skip
        if (!regenerate) {
            const existingCount = await AttributeImageMatrix.countDocuments({ product: productId });
            if (existingCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Matrix already exists with ${existingCount} entries. Use regenerate=true to recreate.`,
                    existingCount
                });
            }
        }

        // If regenerating, only delete MISSING entries to preserve uploaded images
        if (regenerate) {
            await AttributeImageMatrix.deleteMany({
                product: productId,
                status: 'MISSING'
            });
        }

        // Generate Cartesian product
        const allCombinations = AttributeImageMatrix.generateCartesianProduct(attributes);

        // Apply attribute rules to filter invalid combinations
        const combinations = filterCombinationsWithRules(allCombinations, rules, attributes);
        console.log(`[ImageMatrix] Rule filtering: ${allCombinations.length} → ${combinations.length} combinations (${allCombinations.length - combinations.length} removed)`);

        // Bulk upsert
        const result = await AttributeImageMatrix.bulkUpsertCombinations(productId, combinations);

        // Fetch stats
        const stats = await AttributeImageMatrix.getProductStats(productId);

        res.json({
            success: true,
            message: `Matrix generated successfully`,
            attributes: attributes.map(a => ({
                name: a.name,
                valuesCount: a.values.length,
                hasSubAttributes: a.hasSubAttributes
            })),
            totalCombinations,
            result,
            stats
        });
    } catch (error) {
        console.error("Error generating product matrix:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to generate product matrix"
        });
    }
};

/**
 * Upload image for a specific matrix entry
 * PUT /products/:productId/image-matrix/:entryId
 */
export const uploadMatrixImage = async (req, res) => {
    try {
        const { productId, entryId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No image file provided"
            });
        }

        // Validate file type
        if (!req.file.mimetype.startsWith("image/")) {
            return res.status(400).json({
                success: false,
                error: "Only image files are allowed"
            });
        }

        // Find the matrix entry
        const entry = await AttributeImageMatrix.findOne({
            _id: entryId,
            product: productId
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: "Matrix entry not found"
            });
        }

        // Delete old image if exists
        if (entry.cloudinaryPublicId) {
            await deleteFromCloudinary(entry.cloudinaryPublicId);
        }

        // Upload new image
        const uploadResult = await uploadToCloudinary(
            req.file.buffer,
            productId,
            entry.combinationKey
        );

        // Update entry
        entry.imageUrl = uploadResult.url;
        entry.thumbnailUrl = uploadResult.thumbnailUrl;
        entry.cloudinaryPublicId = uploadResult.publicId;
        entry.status = 'UPLOADED';
        entry.uploadedAt = new Date();
        entry.uploadedBy = req.user?._id;
        entry.fileMetadata = {
            originalFilename: req.file.originalname,
            fileSize: uploadResult.fileSize,
            mimeType: req.file.mimetype,
            width: uploadResult.width,
            height: uploadResult.height
        };

        await entry.save();

        res.json({
            success: true,
            entry: entry.toObject()
        });
    } catch (error) {
        console.error("Error uploading matrix image:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to upload image"
        });
    }
};

/**
 * Bulk upload images (match by filename convention)
 * POST /products/:productId/image-matrix/bulk-upload
 * 
 * Expected filename format: attrValue1_attrValue2_attrValue3.jpg
 * The system will attempt to match values in any order.
 */
export const bulkUploadMatrixImages = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No files provided"
            });
        }

        // Fetch all entries for the product
        const entries = await AttributeImageMatrix.find({ product: productId }).lean();

        if (entries.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No matrix entries found. Generate matrix first."
            });
        }

        // Build lookup map: normalized values -> entry
        const entryLookup = new Map();
        entries.forEach(entry => {
            // Create a sorted set of values for matching
            const values = Array.from(entry.attributeCombination.values())
                .map(v => v.toLowerCase().replace(/[^a-z0-9]/g, ''))
                .sort()
                .join('_');
            entryLookup.set(values, entry);
        });

        const results = {
            matched: [],
            unmatched: [],
            errors: []
        };

        // Process each file
        for (const file of req.files) {
            try {
                // Extract values from filename (remove extension)
                const basename = file.originalname.replace(/\.[^/.]+$/, "");
                const fileValues = basename
                    .split(/[_\-\s]+/)
                    .map(v => v.toLowerCase().replace(/[^a-z0-9]/g, ''))
                    .filter(v => v.length > 0)
                    .sort()
                    .join('_');

                // Find matching entry
                const matchedEntry = entryLookup.get(fileValues);

                if (matchedEntry) {
                    // Upload to Cloudinary
                    const uploadResult = await uploadToCloudinary(
                        file.buffer,
                        productId,
                        matchedEntry.combinationKey
                    );

                    // Delete old image if exists
                    if (matchedEntry.cloudinaryPublicId) {
                        await deleteFromCloudinary(matchedEntry.cloudinaryPublicId);
                    }

                    // Update entry
                    await AttributeImageMatrix.findByIdAndUpdate(matchedEntry._id, {
                        imageUrl: uploadResult.url,
                        thumbnailUrl: uploadResult.thumbnailUrl,
                        cloudinaryPublicId: uploadResult.publicId,
                        status: 'UPLOADED',
                        uploadedAt: new Date(),
                        uploadedBy: req.user?._id,
                        fileMetadata: {
                            originalFilename: file.originalname,
                            fileSize: uploadResult.fileSize,
                            mimeType: file.mimetype,
                            width: uploadResult.width,
                            height: uploadResult.height
                        }
                    });

                    results.matched.push({
                        filename: file.originalname,
                        entryId: matchedEntry._id,
                        combination: Object.fromEntries(matchedEntry.attributeCombination)
                    });
                } else {
                    results.unmatched.push({
                        filename: file.originalname,
                        extractedValues: fileValues
                    });
                }
            } catch (fileError) {
                results.errors.push({
                    filename: file.originalname,
                    error: fileError.message
                });
            }
        }

        // Get updated stats
        const stats = await AttributeImageMatrix.getProductStats(productId);

        res.json({
            success: true,
            message: `Processed ${req.files.length} files: ${results.matched.length} matched, ${results.unmatched.length} unmatched, ${results.errors.length} errors`,
            results,
            stats
        });
    } catch (error) {
        console.error("Error in bulk upload:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to process bulk upload"
        });
    }
};

/**
 * Resolve image for current attribute selection
 * GET /products/:productId/image-matrix/resolve
 * Query params: attributeId=value pairs
 * 
 * This is the main frontend integration point.
 * Optimized for speed with lean queries and caching-friendly responses.
 */
export const resolveMatrixImage = async (req, res) => {
    try {
        const { productId } = req.params;
        const selections = { ...req.query };

        // Remove any non-attribute query params
        delete selections.productId;

        if (Object.keys(selections).length === 0) {
            return res.json({
                success: true,
                imageUrl: null,
                message: "No attributes selected"
            });
        }

        // Use the static method for O(1) lookup
        const entry = await AttributeImageMatrix.findBySelection(productId, selections);

        // Set cache headers for CDN/browser caching
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes

        if (entry) {
            res.json({
                success: true,
                imageUrl: entry.imageUrl,
                thumbnailUrl: entry.thumbnailUrl,
                combinationKey: entry.combinationKey
            });
        } else {
            res.json({
                success: true,
                imageUrl: null,
                message: "No image found for this combination"
            });
        }
    } catch (error) {
        console.error("Error resolving matrix image:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to resolve image"
        });
    }
};

/**
 * Delete a single matrix entry
 * DELETE /products/:productId/image-matrix/:entryId
 */
export const deleteMatrixEntry = async (req, res) => {
    try {
        const { productId, entryId } = req.params;

        const entry = await AttributeImageMatrix.findOne({
            _id: entryId,
            product: productId
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: "Matrix entry not found"
            });
        }

        // Delete from Cloudinary if image exists
        if (entry.cloudinaryPublicId) {
            await deleteFromCloudinary(entry.cloudinaryPublicId);
        }

        await entry.deleteOne();

        res.json({
            success: true,
            message: "Entry deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting matrix entry:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete entry"
        });
    }
};

/**
 * Clear image from a matrix entry (keep entry, remove image)
 * DELETE /products/:productId/image-matrix/:entryId/image
 */
export const clearMatrixEntryImage = async (req, res) => {
    try {
        const { productId, entryId } = req.params;

        const entry = await AttributeImageMatrix.findOne({
            _id: entryId,
            product: productId
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: "Matrix entry not found"
            });
        }

        // Delete from Cloudinary if image exists
        if (entry.cloudinaryPublicId) {
            await deleteFromCloudinary(entry.cloudinaryPublicId);
        }

        // Reset image fields
        entry.imageUrl = null;
        entry.thumbnailUrl = null;
        entry.cloudinaryPublicId = null;
        entry.status = 'MISSING';
        entry.uploadedAt = null;
        entry.uploadedBy = null;
        entry.fileMetadata = null;

        await entry.save();

        res.json({
            success: true,
            entry: entry.toObject()
        });
    } catch (error) {
        console.error("Error clearing matrix entry image:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to clear image"
        });
    }
};

/**
 * Clear all matrix entries for a product
 * DELETE /products/:productId/image-matrix
 */
export const clearProductMatrix = async (req, res) => {
    try {
        const { productId } = req.params;
        const { keepUploaded = false } = req.query;

        // Build delete query
        const query = { product: productId };
        if (keepUploaded) {
            query.status = 'MISSING';
        }

        // Get entries to delete (for Cloudinary cleanup)
        const entriesToDelete = await AttributeImageMatrix.find(query)
            .select('cloudinaryPublicId')
            .lean();

        // Delete images from Cloudinary (in parallel, with error handling)
        const deletePromises = entriesToDelete
            .filter(e => e.cloudinaryPublicId)
            .map(e => deleteFromCloudinary(e.cloudinaryPublicId));

        await Promise.allSettled(deletePromises);

        // Delete entries from database
        const result = await AttributeImageMatrix.deleteMany(query);

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} entries`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Error clearing product matrix:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to clear product matrix"
        });
    }
};

/**
 * Get matrix generation preview (without creating)
 * GET /products/:productId/image-matrix/preview
 * 
 * Enhanced to show sub-attribute expansion preview
 */
export const previewProductMatrix = async (req, res) => {
    try {
        const { productId } = req.params;
        const { includeSubAttributes = 'true' } = req.query; // Changed default to string 'true' for query param handling

        // Fetch product with populated attributes
        const product = await Product.findById(productId)
            .populate('dynamicAttributes.attributeType')
            .select('name dynamicAttributes')
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found"
            });
        }

        // Fetch applicable attribute rules for this product
        const categoryId = typeof product.category === 'object'
            ? product.category._id?.toString()
            : product.category?.toString();
        const rules = await fetchApplicableRules(productId, categoryId);

        // Filter for eligible attributes
        const eligibleInputStyles = ['DROPDOWN', 'RADIO', 'POPUP'];

        // IMPORTANT: Deduplicate attributes by attributeType ID
        // Products may have multiple dynamicAttribute entries pointing to the same attributeType
        const seenAttrIds = new Set();

        const eligibleAttrs = product.dynamicAttributes
            ?.filter(attr => {
                if (!attr.isEnabled) return false;
                const attrType = attr.attributeType;
                if (!attrType) return false;

                // Deduplicate by attribute type ID
                const attrId = attrType._id.toString();
                if (seenAttrIds.has(attrId)) {
                    return false; // Skip duplicate
                }
                seenAttrIds.add(attrId);

                if (!eligibleInputStyles.includes(attrType.inputStyle)) return false;
                const values = attrType.attributeValues || [];
                return values.length > 0;
            }) || [];

        // Build attributes with sub-attribute info
        const attributes = [];

        for (const attr of eligibleAttrs) {
            const attrType = attr.attributeType;
            const attrId = attrType._id.toString();

            // Build detailed values list with sub-attribute counts for EACH value
            let expandedValuesCount = 0;
            const valuesWithDetails = [];

            for (const v of attrType.attributeValues) {
                // Query SubAttribute collection directly for this value
                // Don't rely solely on hasSubAttributes flag as it may not be set correctly
                let subAttrCount = 0;

                if (includeSubAttributes === 'true') {
                    // Check if any SubAttributes exist for this attribute/value combination
                    subAttrCount = await SubAttribute.countDocuments({
                        parentAttribute: attrType._id,
                        parentValue: v.value,
                        isEnabled: true
                    });
                }

                // Determine if this value actually has sub-attributes (based on DB data, not just flag)
                const actuallyHasSubAttributes = subAttrCount > 0;

                valuesWithDetails.push({
                    value: v.value,
                    label: v.label || v.value,
                    hasSubAttributes: actuallyHasSubAttributes || v.hasSubAttributes || false,
                    subAttributeCount: subAttrCount
                });

                // Use sub-attr count if exists, otherwise count as 1
                if (actuallyHasSubAttributes) {
                    expandedValuesCount += subAttrCount;
                } else {
                    expandedValuesCount += 1;
                }
            }

            attributes.push({
                id: attrId,
                name: attrType.attributeName,
                inputStyle: attrType.inputStyle,
                baseValuesCount: attrType.attributeValues.length,
                expandedValuesCount: expandedValuesCount,
                hasSubAttributes: valuesWithDetails.some(v => v.hasSubAttributes),
                values: valuesWithDetails
            });
        }

        // Calculate total combinations (using expanded counts)
        const totalCombinations = attributes.length > 0
            ? attributes.reduce((acc, attr) => acc * attr.expandedValuesCount, 1)
            : 0;

        // Also calculate base combinations (without sub-attribute expansion)
        const baseCombinations = attributes.length > 0
            ? attributes.reduce((acc, attr) => acc * attr.baseValuesCount, 1)
            : 0;

        // Get existing matrix stats
        const existingStats = await AttributeImageMatrix.getProductStats(productId);

        // For preview, estimate rule-reduced combinations by simulating 
        // Only do this if rules exist and there are not too many combinations
        let estimatedAfterRules = totalCombinations;
        let rulesApplied = [];

        if (rules.length > 0 && totalCombinations <= 5000) {
            // Build simple attributes for simulation (without sub-attr details)
            const simpleAttrs = attributes.map(a => ({
                id: a.id,
                name: a.name,
                values: a.values.map(v => ({ value: v.value, label: v.label }))
            }));

            // Generate and filter combinations to get accurate count
            const allCombinations = AttributeImageMatrix.generateCartesianProduct(simpleAttrs);
            const filteredCombinations = filterCombinationsWithRules(allCombinations, rules, simpleAttrs);
            estimatedAfterRules = filteredCombinations.length;

            // Collect rule names
            rulesApplied = rules.map(r => ({
                name: r.name,
                when: `${r.when.attribute?.attributeName || 'Unknown'} = "${r.when.value}"`,
                actions: r.then.map(a => a.action).join(', ')
            }));
        }

        res.json({
            success: true,
            product: {
                _id: product._id,
                name: product.name
            },
            attributes,
            baseCombinations,
            totalCombinations,
            estimatedAfterRules,
            rulesApplied,
            existingStats,
            hasSubAttributes: attributes.some(a => a.hasSubAttributes),
            warning: estimatedAfterRules > 500
                ? `Large matrix: ${estimatedAfterRules} images required. Consider limiting attribute values.`
                : null
        });
    } catch (error) {
        console.error("Error previewing product matrix:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to preview product matrix"
        });
    }
};
