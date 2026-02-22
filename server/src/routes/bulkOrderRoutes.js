import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/roleMiddleware.js";
import { requireFeature } from "../middlewares/featureMiddleware.js";
import { uploadPDF } from "../middlewares/upload.js";
import bulkOrderController from "../controllers/bulkOrderController.js";

const router = express.Router();

// ========================================
// PUBLIC/USER ENDPOINTS
// Requires: bulk_order_upload feature for all user-facing routes
// ========================================

/**
 * Upload bulk order with composite PDF
 * Requires: bulk_order_upload feature
 */
router.post(
    "/upload",
    authMiddleware,
    requireFeature("bulk_order_upload"),
    uploadPDF.single("compositeFile"),
    bulkOrderController.uploadBulkOrder
);

/**
 * Get bulk order status (for polling)
 * Requires: bulk_order_upload feature
 */
router.get(
    "/:id/status",
    authMiddleware,
    requireFeature("bulk_order_upload"),
    bulkOrderController.getBulkOrderStatus
);

/**
 * Get full bulk order details
 * Requires: bulk_order_upload feature
 */
router.get(
    "/:id",
    authMiddleware,
    requireFeature("bulk_order_upload"),
    bulkOrderController.getBulkOrderDetails
);

/**
 * List user's bulk orders
 * Requires: bulk_order_upload feature
 */
router.get(
    "/",
    authMiddleware,
    requireFeature("bulk_order_upload"),
    bulkOrderController.listUserBulkOrders
);

/**
 * Cancel bulk order
 * Requires: bulk_order_upload feature
 */
router.delete(
    "/:id",
    authMiddleware,
    requireFeature("bulk_order_upload"),
    bulkOrderController.cancelBulkOrder
);

// ========================================
// ADMIN ENDPOINTS (no feature gate needed for admins)
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
 * List all bulk orders
 */
router.get(
    "/admin/list",
    authMiddleware,
    adminAuth,
    bulkOrderController.listAllBulkOrders
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
