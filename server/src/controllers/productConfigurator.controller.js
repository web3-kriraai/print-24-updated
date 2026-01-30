/**
 * Product Configurator Controller
 * 
 * Handles all API operations for the Matrix Strategy visual configurator:
 * - Initialize configurator for a product (generate asset matrix)
 * - Get asset matrix with upload status
 * - Upload single/bulk assets
 * - Resolve image URL for current selection (O(1) lookup)
 */

import Product from "../models/productModal.js";
import ProductConfiguratorAsset from "../models/ProductConfiguratorAsset.js";
import AttributeType from "../models/attributeTypeModal.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import {
    generateCartesianProduct,
    generateCombinationHash,
    generateExpectedFilename,
    validateCombinationCount,
    extractAttributeData,
} from "../utils/cartesianProductCalculator.js";

/**
 * POST /api/product-configurator/:productId/initialize
 * 
 * Initialize the visual configurator for a product.
 * Generates the asset matrix with all possible attribute combinations.
 */
export const initializeProductConfigurator = async (req, res) => {
    try {
        const { productId } = req.params;
        const { configuratorAttributeIds, maxCombinations = 1000 } = req.body;

        if (!configuratorAttributeIds || !Array.isArray(configuratorAttributeIds)) {
            return res.status(400).json({
                error: "configuratorAttributeIds array is required",
            });
        }

        if (configuratorAttributeIds.length === 0) {
            return res.status(400).json({
                error: "At least one configurator attribute is required",
            });
        }

        // Find the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Fetch attribute definitions
        const attributes = await AttributeType.find({
            _id: { $in: configuratorAttributeIds },
        }).sort({ displayOrder: 1 });

        if (attributes.length !== configuratorAttributeIds.length) {
            return res.status(400).json({
                error: "Some attribute IDs are invalid",
            });
        }

        // Extract attribute data for Cartesian calculation
        const attributeData = extractAttributeData(attributes);
        const attributeOrder = attributeData.map((a) => a.systemName);

        // Validate combination count
        const validation = validateCombinationCount(attributeData, maxCombinations);

        if (!validation.isValid) {
            return res.status(400).json({
                error: validation.warning,
                totalCombinations: validation.totalCombinations,
                breakdown: validation.breakdown,
                formula: validation.formula,
            });
        }

        // Generate all combinations
        const combinations = generateCartesianProduct(attributeData);

        console.log(
            `Generating asset matrix for product ${product.name}: ${combinations.length} combinations`
        );

        // Create asset records for each combination
        const assetRecords = combinations.map((combo, index) => {
            const hash = generateCombinationHash(combo, attributeOrder);
            const expectedFilename = generateExpectedFilename(
                product.configuratorSettings?.imageNamingPattern || "prod",
                hash
            );

            return {
                updateOne: {
                    filter: { product: productId, combinationHash: hash },
                    update: {
                        $setOnInsert: {
                            product: productId,
                            attributeCombination: combo,
                            combinationHash: hash,
                            expectedFilename,
                            status: "pending",
                            displayOrder: index,
                            isActive: true,
                        },
                    },
                    upsert: true,
                },
            };
        });

        // Bulk upsert (won't overwrite existing assets)
        const bulkResult = await ProductConfiguratorAsset.bulkWrite(assetRecords);

        // Update product configurator settings
        product.configuratorSettings = {
            ...product.configuratorSettings,
            isConfiguratorEnabled: true,
            configuratorAttributes: configuratorAttributeIds,
            attributeOrder,
            configuratorImageFolder: `configurator/${product.slug || product._id}`,
            maxCombinations,
            totalCombinations: combinations.length,
            uploadedCombinations: 0,
            lastMatrixGeneration: new Date(),
        };

        await product.save();

        // Get updated stats
        const stats = await ProductConfiguratorAsset.getCompletionStats(productId);

        return res.json({
            success: true,
            message: "Product configurator initialized successfully",
            data: {
                productId: product._id,
                productName: product.name,
                totalCombinations: combinations.length,
                attributes: attributeData,
                attributeOrder,
                stats,
                formula: validation.formula,
                warning: validation.warning,
            },
        });
    } catch (err) {
        console.error("Initialize configurator error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/product-configurator/:productId/asset-matrix
 * 
 * Get the complete asset matrix with upload status for admin dashboard
 */
export const getAssetMatrix = async (req, res) => {
    try {
        const { productId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;

        // Build query
        const query = { product: productId, isActive: true };
        if (status) {
            query.status = status;
        }

        // Get paginated assets
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const assets = await ProductConfiguratorAsset.find(query)
            .sort({ displayOrder: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count
        const totalAssets = await ProductConfiguratorAsset.countDocuments(query);

        // Get completion stats
        const stats = await ProductConfiguratorAsset.getCompletionStats(productId);

        // Get product info
        const product = await Product.findById(productId).select(
            "name slug configuratorSettings"
        );

        return res.json({
            success: true,
            data: {
                product: {
                    id: product?._id,
                    name: product?.name,
                    slug: product?.slug,
                    configuratorSettings: product?.configuratorSettings,
                },
                assets,
                stats,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalAssets,
                    totalPages: Math.ceil(totalAssets / parseInt(limit)),
                },
            },
        });
    } catch (err) {
        console.error("Get asset matrix error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/product-configurator/:productId/upload-asset
 * 
 * Upload a single image for a specific combination
 */
export const uploadConfiguratorAsset = async (req, res) => {
    try {
        const { productId } = req.params;
        const { combinationHash } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        if (!combinationHash) {
            return res.status(400).json({ error: "combinationHash is required" });
        }

        // Find the asset
        const asset = await ProductConfiguratorAsset.findOne({
            product: productId,
            combinationHash,
            isActive: true,
        });

        if (!asset) {
            return res.status(404).json({
                error: `Asset with hash "${combinationHash}" not found for this product`,
            });
        }

        // Get product for folder path
        const product = await Product.findById(productId);
        const folder =
            product?.configuratorSettings?.configuratorImageFolder ||
            `configurator/${product?.slug || productId}`;

        // Delete old image if exists
        if (asset.cloudinaryPublicId) {
            try {
                await cloudinary.uploader.destroy(asset.cloudinaryPublicId);
            } catch (deleteErr) {
                console.warn("Failed to delete old image:", deleteErr.message);
            }
        }

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: combinationHash,
                    overwrite: true,
                    resource_type: "image",
                },
                (error, result) => {
                    if (result) resolve(result);
                    else reject(error);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

        // Update asset record
        asset.imageUrl = uploadResult.secure_url;
        asset.cloudinaryPublicId = uploadResult.public_id;
        asset.status = "uploaded";
        asset.fileSize = uploadResult.bytes;
        asset.imageWidth = uploadResult.width;
        asset.imageHeight = uploadResult.height;
        asset.uploadedAt = new Date();
        asset.uploadedBy = req.user?._id;

        await asset.save();

        // Update product stats
        const stats = await ProductConfiguratorAsset.getCompletionStats(productId);
        await Product.findByIdAndUpdate(productId, {
            "configuratorSettings.uploadedCombinations": stats.uploaded,
        });

        return res.json({
            success: true,
            message: "Asset uploaded successfully",
            data: {
                asset,
                stats,
            },
        });
    } catch (err) {
        console.error("Upload asset error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/product-configurator/:productId/bulk-upload
 * 
 * Bulk upload images - auto-match by filename
 * Filename format: prod_{hash}.jpg or just {hash}.jpg
 */
export const bulkUploadAssets = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        // Get product and all pending assets
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const assets = await ProductConfiguratorAsset.find({
            product: productId,
            isActive: true,
        });

        const folder =
            product.configuratorSettings?.configuratorImageFolder ||
            `configurator/${product.slug || productId}`;
        const prefix = product.configuratorSettings?.imageNamingPattern || "prod";

        const results = {
            success: [],
            failed: [],
            skipped: [],
        };

        for (const file of req.files) {
            // Extract hash from filename
            let filenameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");

            // Remove prefix if present (e.g., "prod_leather_red" -> "leather_red")
            if (filenameWithoutExt.startsWith(prefix + "_")) {
                filenameWithoutExt = filenameWithoutExt.slice(prefix.length + 1);
            }

            // Find matching asset
            const asset = assets.find(
                (a) =>
                    a.combinationHash === filenameWithoutExt ||
                    a.expectedFilename === file.originalname
            );

            if (!asset) {
                results.skipped.push({
                    filename: file.originalname,
                    reason: "No matching combination found",
                });
                continue;
            }

            try {
                // Delete old image if exists
                if (asset.cloudinaryPublicId) {
                    try {
                        await cloudinary.uploader.destroy(asset.cloudinaryPublicId);
                    } catch (deleteErr) {
                        console.warn("Failed to delete old image:", deleteErr.message);
                    }
                }

                // Upload to Cloudinary
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder,
                            public_id: asset.combinationHash,
                            overwrite: true,
                            resource_type: "image",
                        },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(file.buffer).pipe(stream);
                });

                // Update asset
                asset.imageUrl = uploadResult.secure_url;
                asset.cloudinaryPublicId = uploadResult.public_id;
                asset.status = "uploaded";
                asset.fileSize = uploadResult.bytes;
                asset.imageWidth = uploadResult.width;
                asset.imageHeight = uploadResult.height;
                asset.uploadedAt = new Date();
                asset.uploadedBy = req.user?._id;

                await asset.save();

                results.success.push({
                    filename: file.originalname,
                    combinationHash: asset.combinationHash,
                    imageUrl: uploadResult.secure_url,
                });
            } catch (uploadErr) {
                results.failed.push({
                    filename: file.originalname,
                    error: uploadErr.message,
                });
            }
        }

        // Update product stats
        const stats = await ProductConfiguratorAsset.getCompletionStats(productId);
        await Product.findByIdAndUpdate(productId, {
            "configuratorSettings.uploadedCombinations": stats.uploaded,
        });

        return res.json({
            success: true,
            message: `Bulk upload complete: ${results.success.length} uploaded, ${results.failed.length} failed, ${results.skipped.length} skipped`,
            data: {
                results,
                stats,
            },
        });
    } catch (err) {
        console.error("Bulk upload error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/product-configurator/:productId/resolve-image
 * 
 * Resolve image URL for current attribute selection (O(1) lookup)
 * This is the main endpoint called by the frontend configurator
 */
export const resolveConfiguratorImage = async (req, res) => {
    try {
        const { productId } = req.params;
        const selections = req.query; // e.g., { material: "leather", color: "red" }

        // Get product with configurator settings
        const product = await Product.findById(productId).select(
            "name image configuratorSettings"
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        if (!product.configuratorSettings?.isConfiguratorEnabled) {
            // Configurator not enabled - return default product image
            return res.json({
                success: true,
                data: {
                    imageUrl: product.image,
                    isFallback: true,
                    reason: "Configurator not enabled",
                },
            });
        }

        // Generate hash from selections
        const attributeOrder = product.configuratorSettings.attributeOrder || [];
        const hash = generateCombinationHash(selections, attributeOrder);

        if (!hash) {
            return res.json({
                success: true,
                data: {
                    imageUrl:
                        product.configuratorSettings.defaultConfiguratorImage ||
                        product.image,
                    isFallback: true,
                    reason: "Invalid or incomplete selection",
                },
            });
        }

        // O(1) lookup by hash
        const asset = await ProductConfiguratorAsset.findOne({
            product: productId,
            combinationHash: hash,
            isActive: true,
        }).select("imageUrl status");

        if (!asset || asset.status !== "uploaded" || !asset.imageUrl) {
            // Return fallback image
            return res.json({
                success: true,
                data: {
                    imageUrl:
                        product.configuratorSettings.defaultConfiguratorImage ||
                        product.image,
                    isFallback: true,
                    requestedHash: hash,
                    reason: asset ? "Image not yet uploaded" : "Combination not found",
                },
            });
        }

        return res.json({
            success: true,
            data: {
                imageUrl: asset.imageUrl,
                isFallback: false,
                hash,
            },
        });
    } catch (err) {
        console.error("Resolve image error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /api/product-configurator/:productId/asset/:assetId
 * 
 * Delete a specific asset
 */
export const deleteConfiguratorAsset = async (req, res) => {
    try {
        const { productId, assetId } = req.params;

        const asset = await ProductConfiguratorAsset.findOne({
            _id: assetId,
            product: productId,
        });

        if (!asset) {
            return res.status(404).json({ error: "Asset not found" });
        }

        // Delete from Cloudinary if exists
        if (asset.cloudinaryPublicId) {
            try {
                await cloudinary.uploader.destroy(asset.cloudinaryPublicId);
            } catch (deleteErr) {
                console.warn("Failed to delete from Cloudinary:", deleteErr.message);
            }
        }

        // Soft delete (mark as inactive) or reset to pending
        asset.imageUrl = null;
        asset.cloudinaryPublicId = null;
        asset.status = "pending";
        asset.fileSize = 0;
        asset.uploadedAt = null;
        asset.uploadedBy = null;

        await asset.save();

        // Update stats
        const stats = await ProductConfiguratorAsset.getCompletionStats(productId);
        await Product.findByIdAndUpdate(productId, {
            "configuratorSettings.uploadedCombinations": stats.uploaded,
        });

        return res.json({
            success: true,
            message: "Asset deleted successfully",
            data: { stats },
        });
    } catch (err) {
        console.error("Delete asset error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE /api/product-configurator/:productId/reset
 * 
 * Reset (disable) the configurator for a product
 */
export const resetProductConfigurator = async (req, res) => {
    try {
        const { productId } = req.params;
        const { deleteAssets = false } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        if (deleteAssets) {
            // Delete all assets from Cloudinary
            const assets = await ProductConfiguratorAsset.find({
                product: productId,
                cloudinaryPublicId: { $exists: true, $ne: null },
            });

            for (const asset of assets) {
                try {
                    await cloudinary.uploader.destroy(asset.cloudinaryPublicId);
                } catch (err) {
                    console.warn("Failed to delete:", asset.cloudinaryPublicId);
                }
            }

            // Delete all asset records
            await ProductConfiguratorAsset.deleteMany({ product: productId });
        } else {
            // Just mark as inactive
            await ProductConfiguratorAsset.updateMany(
                { product: productId },
                { isActive: false }
            );
        }

        // Reset product configurator settings
        product.configuratorSettings = {
            isConfiguratorEnabled: false,
            configuratorAttributes: [],
            attributeOrder: [],
            totalCombinations: 0,
            uploadedCombinations: 0,
        };

        await product.save();

        return res.json({
            success: true,
            message: deleteAssets
                ? "Configurator reset and all assets deleted"
                : "Configurator disabled",
        });
    } catch (err) {
        console.error("Reset configurator error:", err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/product-configurator/:productId/preload-urls
 * 
 * Get URLs for adjacent combinations (for frontend preloading)
 */
export const getPreloadUrls = async (req, res) => {
    try {
        const { productId } = req.params;
        const selections = req.query;

        const product = await Product.findById(productId)
            .select("configuratorSettings")
            .populate("configuratorSettings.configuratorAttributes");

        if (!product?.configuratorSettings?.isConfiguratorEnabled) {
            return res.json({ success: true, data: { urls: [] } });
        }

        const attributeOrder = product.configuratorSettings.attributeOrder || [];

        // Generate hashes for adjacent combinations
        const adjacentHashes = new Set();

        // For each attribute, generate a hash with each alternative value
        for (const attr of product.configuratorSettings.configuratorAttributes || []) {
            const systemName =
                attr.systemName ||
                attr.attributeName?.toLowerCase().replace(/[^a-z0-9]+/g, "_");

            for (const val of attr.attributeValues || []) {
                if (val.value !== selections[systemName]) {
                    const adjacentSelection = { ...selections, [systemName]: val.value };
                    const hash = generateCombinationHash(adjacentSelection, attributeOrder);
                    adjacentHashes.add(hash);
                }
            }
        }

        // Fetch URLs for adjacent combinations
        const assets = await ProductConfiguratorAsset.find({
            product: productId,
            combinationHash: { $in: [...adjacentHashes] },
            status: "uploaded",
            isActive: true,
        }).select("combinationHash imageUrl");

        const urls = assets.map((a) => ({
            hash: a.combinationHash,
            url: a.imageUrl,
        }));

        return res.json({
            success: true,
            data: { urls },
        });
    } catch (err) {
        console.error("Get preload URLs error:", err);
        return res.status(500).json({ error: err.message });
    }
};
