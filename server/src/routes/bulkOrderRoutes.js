import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/roleMiddleware.js";
import { requireFeature } from "../middlewares/featureMiddleware.js";
import { uploadPDF } from "../middlewares/upload.js";
import bulkOrderController from "../controllers/bulkOrderController.js";

const router = express.Router();

// ========================================
// PUBLIC/USER ENDPOINTS
// ========================================

/**
 * Upload bulk order with composite PDF
 * Requires: bulk_order_upload feature
 */
router.post(
    "/upload",
    authMiddleware,
    requireFeature("bulk_order_upload", { attachConfig: true }),
    uploadPDF.single("compositeFile"),
    bulkOrderController.uploadBulkOrder
);

/**
 * Get bulk order status (for polling)
 */
router.get(
    "/:id/status",
    authMiddleware,
    bulkOrderController.getBulkOrderStatus
);

/**
 * Get full bulk order details
 */
router.get(
    "/:id",
    authMiddleware,
    bulkOrderController.getBulkOrderDetails
);

/**
 * List user's bulk orders
 */
router.get(
    "/",
    authMiddleware,
    bulkOrderController.listUserBulkOrders
);

/**
 * Cancel bulk order
 */
router.delete(
    "/:id",
    authMiddleware,
    bulkOrderController.cancelBulkOrder
);

// ========================================
// ADMIN ENDPOINTS
// ========================================

/**
 * Get bulk order statistics
 */
router.get(
    "/admin/stats",
    authMiddleware,
    adminAuth,
    bulkOrderController.getBulkOrderStats
);

/**
 * Retry failed bulk order
 */
router.post(
    "/admin/:id/retry",
    authMiddleware,
    adminAuth,
    bulkOrderController.retryBulkOrder
);

export default router;
