/**
 * Product Configurator Routes
 * 
 * All routes for the Matrix Strategy visual configurator.
 * These routes are separate from existing product routes to ensure no interference.
 */

import express from "express";
import multer from "multer";
import {
    initializeProductConfigurator,
    getAssetMatrix,
    uploadConfiguratorAsset,
    bulkUploadAssets,
    resolveConfiguratorImage,
    deleteConfiguratorAsset,
    resetProductConfigurator,
    getPreloadUrls,
} from "../controllers/productConfigurator.controller.js";

const router = express.Router();

// Configure multer for memory storage (same as existing upload middleware)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"), false);
        }
    },
});

// ============================================================================
// ADMIN ROUTES (require authentication in production)
// ============================================================================

/**
 * POST /api/product-configurator/:productId/initialize
 * Initialize configurator for a product - generates asset matrix
 * Body: { configuratorAttributeIds: string[], maxCombinations?: number }
 */
router.post("/:productId/initialize", initializeProductConfigurator);

/**
 * GET /api/product-configurator/:productId/asset-matrix
 * Get asset matrix with upload status for admin dashboard
 * Query: { status?: 'pending'|'uploaded'|'missing', page?: number, limit?: number }
 */
router.get("/:productId/asset-matrix", getAssetMatrix);

/**
 * POST /api/product-configurator/:productId/upload-asset
 * Upload single image for a specific combination
 * Body: FormData with 'image' file and 'combinationHash' string
 */
router.post(
    "/:productId/upload-asset",
    upload.single("image"),
    uploadConfiguratorAsset
);

/**
 * POST /api/product-configurator/:productId/bulk-upload
 * Bulk upload images - auto-match by filename
 * Body: FormData with multiple 'images' files
 * Filename format: {prefix}_{hash}.jpg (e.g., prod_leather_red_matte.jpg)
 */
router.post(
    "/:productId/bulk-upload",
    upload.array("images", 200), // Max 200 files per batch
    bulkUploadAssets
);

/**
 * DELETE /api/product-configurator/:productId/asset/:assetId
 * Delete/reset a specific asset
 */
router.delete("/:productId/asset/:assetId", deleteConfiguratorAsset);

/**
 * DELETE /api/product-configurator/:productId/reset
 * Reset (disable) the configurator for a product
 * Body: { deleteAssets?: boolean }
 */
router.delete("/:productId/reset", resetProductConfigurator);

// ============================================================================
// PUBLIC ROUTES (for frontend configurator)
// ============================================================================

/**
 * GET /api/product-configurator/:productId/resolve-image
 * Resolve image URL for current selection (O(1) lookup)
 * Query: { [attributeSystemName]: value, ... }
 * Example: /resolve-image?material=leather&color=red&finish=matte
 */
router.get("/:productId/resolve-image", resolveConfiguratorImage);

/**
 * GET /api/product-configurator/:productId/preload-urls
 * Get URLs for adjacent combinations (for preloading optimization)
 * Query: { [attributeSystemName]: currentValue, ... }
 */
router.get("/:productId/preload-urls", getPreloadUrls);

export default router;
