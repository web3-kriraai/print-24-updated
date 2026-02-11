import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";
import { optionalAuthMiddleware } from "../middlewares/optionalAuthMiddleware.js";
import upload from "../middlewares/upload.js";

/* CATEGORY CONTROLLERS */
import {
  createCategory,
  getAllCategories,
  getCategoriesTree,
  getAvailableParents,
  getTopLevelCategories,
  getCategoriesByParent,
  getCategory,
  getDigitalCategories,
  getBulkCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

/* PRODUCT CONTROLLERS */
import {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getProductsByCategory,
  getProductsBySubcategory,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

/* PRODUCT DETAIL CONTROLLER */
import { getProductDetail } from "../controllers/productDetail.controller.js";

/* ADMIN CONTROLLERS */
import {
  getAllUploads,
  getUploadById,
  createAdmin,
  createEmployee,
  getAllAdmins,
  getAllUsers,
  getAllEmployees,
  updateUserRole,
  deleteUpload,
} from "../controllers/adminController.js";

/* REVIEW CONTROLLERS */
import {
  createReview,
  getAllReviews,
} from "../controllers/reviewController.js";

/* IMAGE UPLOAD CONTROLLER */
import { uploadImage } from "../controllers/imageUploadController.js";

/* ORDER CONTROLLERS */
import {
  createOrder,
  createOrderWithAccount,
  getMyOrders,
  getSingleOrder,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  generateInvoice,
  getOrdersWithFilters,
  getOrderStats,
  bulkUpdateOrders,
  bulkDeleteOrders,
  exportOrders,
  getFilterOptions,
} from "../controllers/orderController.js";

/* ORDER APPROVAL CONTROLLERS */
import {
  approveOrderForProduction,
  checkOrderDepartmentStatus,
} from "../controllers/orderApprovalController.js";

/* SUBCATEGORY CONTROLLERS */
import {
  createSubCategory,
  getAllSubCategories,
  getSubCategory,
  getSubCategoriesByCategory,
  getSubCategoriesByParent,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subcategoryController.js";

/* ATTRIBUTE TYPE CONTROLLERS */
import {
  createAttributeType,
  getAllAttributeTypes,
  getUnusedAttributeTypes,
  getSingleAttributeType,
  updateAttributeType,
  deleteAttributeType,
} from "../controllers/attributeTypeController.js";

/* ATTRIBUTE RULE CONTROLLERS */
import {
  createAttributeRule,
  getAllAttributeRules,
  getSingleAttributeRule,
  updateAttributeRule,
  deleteAttributeRule,
  // ❌ evaluateRules REMOVED - now in service layer
} from "../controllers/attributeRuleController.js";

/* SUB-ATTRIBUTE CONTROLLERS */
import {
  createSubAttribute,
  getAllSubAttributes,
  updateSubAttribute,
  deleteSubAttribute,
} from "../controllers/subAttribute.controller.js";

/* DEPARTMENT CONTROLLERS */
import {
  createDepartment,
  getAllDepartments,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";

/* SEQUENCE CONTROLLERS */
import {
  createSequence,
  getAllSequences,
  getSingleSequence,
  getSequenceBySubcategory,
  updateSequence,
  deleteSequence,
} from "../controllers/sequenceController.js";

/* DEPARTMENT ACTION CONTROLLERS */
import {
  getDepartmentOrders,
  departmentAction,
} from "../controllers/departmentActionController.js";

/* GEOCODING CONTROLLERS */
import {
  reverseGeocode,
  searchGeocode,
} from "../controllers/geocodingController.js";

/* MODIFIER ROUTES */
import modifierRoutes from "./modifierRoutes.js";

/* PRICING ROUTES */
import pricingRoutes from "./pricingRoutes.js";

/* PAYMENT ROUTES */
import paymentRoutes from "./payment.routes.js";
import paymentGatewayRoutes from "./admin/payment-gateways.routes.js";


const router = express.Router();

/* =====================================
   CATEGORY ROUTES
===================================== */

router.post(
  "/categories",
  authMiddleware,
  requireAdmin,
  upload.single("image"), // enable file upload
  createCategory
);

router.get("/categories", getAllCategories);
router.get("/categories/tree", getCategoriesTree);
router.get("/categories/available-parents", getAvailableParents);
router.get("/categories/top-level", getTopLevelCategories);
router.get("/categories/parent/:parentId", getCategoriesByParent);
router.get("/categories/digital", getDigitalCategories);
router.get("/categories/bulk", getBulkCategories);
router.get("/categories/:id", getCategory);
router.put(
  "/categories/:id",
  authMiddleware,
  requireAdmin,
  upload.single("image"),
  updateCategory
);
router.delete("/categories/:id", authMiddleware, requireAdmin, deleteCategory);

/* =====================================
   SUBCATEGORY ROUTES
===================================== */

router.post(
  "/subcategories",
  authMiddleware,
  requireAdmin,
  upload.single("image"),
  createSubCategory
);

router.get("/subcategories", getAllSubCategories);
router.get("/subcategories/category/:categoryId", getSubCategoriesByCategory);
router.get("/subcategories/parent/:parentId", getSubCategoriesByParent);
router.get("/subcategories/:id", getSubCategory);
router.put(
  "/subcategories/:id",
  authMiddleware,
  requireAdmin,
  upload.single("image"),
  updateSubCategory
);
router.delete(
  "/subcategories/:id",
  authMiddleware,
  requireAdmin,
  deleteSubCategory
);

/* =====================================
   PRODUCT ROUTES
===================================== */

router.post(
  "/products",
  authMiddleware,
  requireAdmin,
  upload.single("image"), // enable file upload
  createProduct
);

router.get("/products", getAllProducts);
router.get("/products/category/:categoryId", getProductsByCategory);
router.get("/products/subcategory/:subcategoryId", getProductsBySubcategory);
router.get("/products/:id/detail", getProductDetail); // PDP endpoint - must be before /products/:id
router.get("/products/:id", getSingleProduct);
router.put(
  "/products/:id",
  authMiddleware,
  requireAdmin,
  upload.single("image"),
  updateProduct
);
router.delete("/products/:id", authMiddleware, requireAdmin, deleteProduct);

/* =====================================
   ADMIN ROUTES
===================================== */

router.get("/admin/uploads", authMiddleware, requireAdmin, getAllUploads);

router.get("/admin/uploads/:id", authMiddleware, requireAdmin, getUploadById);

router.delete("/admin/uploads/:id", authMiddleware, requireAdmin, deleteUpload);

router.post("/admin/create-admin", authMiddleware, requireAdmin, createAdmin);

router.post("/admin/create-employee", authMiddleware, requireAdmin, createEmployee);

router.get("/admin/admins", authMiddleware, requireAdmin, getAllAdmins);

router.get("/admin/users", authMiddleware, requireAdmin, getAllUsers);

router.get("/admin/employees", authMiddleware, requireAdmin, getAllEmployees);

router.put(
  "/admin/update-user-role",
  authMiddleware,
  requireAdmin,
  updateUserRole
);

/* =====================================
   REVIEW ROUTES
===================================== */

// Reviews route - authentication is optional (handled in controller)
router.post("/reviews", optionalAuthMiddleware, createReview);
router.get("/reviews", getAllReviews);

/* =====================================
   IMAGE UPLOAD ROUTES (for CKEditor)
===================================== */
router.post("/upload-image", authMiddleware, upload.single("image"), uploadImage);

/* =====================================
   ORDER ROUTES
===================================== */

// User order routes
router.post("/orders", authMiddleware, createOrder);
router.post("/orders/create-with-account", createOrderWithAccount); // No auth required - creates account if needed
router.get("/orders/my-orders", authMiddleware, getMyOrders);
router.get("/orders/:orderId", authMiddleware, getSingleOrder);
router.get("/orders/:orderId/invoice", generateInvoice); // Download invoice PDF
router.put("/orders/:orderId/cancel", authMiddleware, cancelOrder);

// Admin order routes
router.get("/admin/orders", authMiddleware, requireAdmin, getAllOrders);
router.put(
  "/admin/orders/:orderId",
  authMiddleware,
  requireAdmin,
  updateOrderStatus
);

// Enhanced order management routes (added 2026-02-05)
router.get("/admin/orders/list", authMiddleware, requireAdmin, getOrdersWithFilters); // Advanced filtering
router.get("/admin/orders/stats", authMiddleware, requireAdmin, getOrderStats); // Statistics
router.get("/admin/orders/filter-options", authMiddleware, requireAdmin, getFilterOptions); // Dynamic filter options
router.post("/admin/orders/bulk-update", authMiddleware, requireAdmin, bulkUpdateOrders); // Bulk update
router.post("/admin/orders/bulk-delete", authMiddleware, requireAdmin, bulkDeleteOrders); // Bulk delete
router.post("/admin/orders/export", authMiddleware, requireAdmin, exportOrders); // Export CSV

// New: Admin order approval route (ensures proper department assignment)
router.post(
  "/orders/:orderId/approve",
  authMiddleware,
  requireAdmin,
  approveOrderForProduction
);

// New: Diagnostic route to check why order isn't showing in employee dashboard
router.get(
  "/orders/:orderId/department-status",
  authMiddleware,
  checkOrderDepartmentStatus
);

/* =====================================
   ATTRIBUTE TYPE ROUTES
===================================== */

router.post("/attribute-types", authMiddleware, requireAdmin, createAttributeType);

router.get("/attribute-types", getAllAttributeTypes);
router.get("/attribute-types/unused/list", getUnusedAttributeTypes);
router.get("/attribute-types/:id", getSingleAttributeType);
router.put(
  "/attribute-types/:id",
  authMiddleware,
  requireAdmin,
  updateAttributeType
);
router.delete(
  "/attribute-types/:id",
  authMiddleware,
  requireAdmin,
  deleteAttributeType
);

/* =====================================
   ATTRIBUTE RULE ROUTES (Admin)
===================================== */

router.post("/admin/attribute-rules", authMiddleware, requireAdmin, createAttributeRule);
router.get("/admin/attribute-rules", authMiddleware, requireAdmin, getAllAttributeRules);
router.get("/admin/attribute-rules/:id", authMiddleware, requireAdmin, getSingleAttributeRule);
router.put("/admin/attribute-rules/:id", authMiddleware, requireAdmin, updateAttributeRule);
router.delete("/admin/attribute-rules/:id", authMiddleware, requireAdmin, deleteAttributeRule);

/* =====================================
   RULE EVALUATION (Public)
===================================== */

// Public endpoint for rule evaluation (used by PDP, cart, pricing engine)
// No authentication required - this is configuration data, not sensitive
router.post("/rules/evaluate", async (req, res) => {
  try {
    const AttributeRuleEvaluator = (await import("../services/AttributeRuleEvaluator.js")).default;
    const result = await AttributeRuleEvaluator.evaluate(req.body);
    return res.json(result);
  } catch (err) {
    console.error("❌ Rule evaluation error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* =====================================
   SUB-ATTRIBUTE ROUTES (Admin)
===================================== */

router.post("/admin/sub-attributes", authMiddleware, requireAdmin, upload.single("image"), createSubAttribute);
router.get("/admin/sub-attributes", authMiddleware, requireAdmin, getAllSubAttributes);
router.put("/admin/sub-attributes/:id", authMiddleware, requireAdmin, upload.single("image"), updateSubAttribute);
router.delete("/admin/sub-attributes/:id", authMiddleware, requireAdmin, deleteSubAttribute);

/* =====================================
   DEPARTMENT ROUTES
===================================== */

router.post("/departments", authMiddleware, requireAdmin, createDepartment);

router.get("/departments", getAllDepartments);
router.get("/departments/:id", getSingleDepartment);
router.put("/departments/:id", authMiddleware, requireAdmin, updateDepartment);
router.delete("/departments/:id", authMiddleware, requireAdmin, deleteDepartment);

// Department orders route (for employees)
router.get(
  "/departments/:departmentId/orders",
  authMiddleware,
  getDepartmentOrders
);

// Department action route (for employees to perform actions on orders)
router.post(
  "/orders/:orderId/departments/:departmentId/action",
  authMiddleware,
  departmentAction
);

/* =====================================
   SEQUENCE ROUTES
===================================== */

router.post("/sequences", authMiddleware, requireAdmin, createSequence);

router.get("/sequences", getAllSequences);
router.get("/sequences/subcategory/:subcategoryId", getSequenceBySubcategory);
router.get("/sequences/:id", getSingleSequence);
router.put("/sequences/:id", authMiddleware, requireAdmin, updateSequence);
router.delete("/sequences/:id", authMiddleware, requireAdmin, deleteSequence);

/* =====================================
   GEOCODING ROUTES (Nominatim Proxy)
===================================== */

// Reverse geocoding - get address from coordinates
router.get("/geocoding/reverse", reverseGeocode);

// Forward geocoding - search by postalcode/address
router.get("/geocoding/search", searchGeocode);

/* =====================================
   MODIFIER ADMIN ROUTES
===================================== */

// All modifier routes require admin authentication
router.use("/modifiers", authMiddleware, requireAdmin, modifierRoutes);

/* =====================================
   PRICING ROUTES (PUBLIC)
===================================== */

// Pricing routes (optional auth - uses RETAIL segment if not logged in)
router.use("/pricing", pricingRoutes);

/* =====================================
   PAYMENT ROUTES
===================================== */

// Payment routes (initialize, verify, status, webhook)
router.use("/payment", paymentRoutes);

// Payment gateway admin routes
router.use("/admin/payment-gateways", authMiddleware, requireAdmin, paymentGatewayRoutes);

/* =====================================
   🔧 COMPLAINT MANAGEMENT SYSTEM
   Added: 2026-02-04
===================================== */

// Import complaint routes
import complaintRoutes from "./complaintRoutes.js";
import webhookRoutes from "./webhooks.js";

// Complaint routes (requires authentication)
router.use("/complaints", complaintRoutes);

// Webhook routes (for multi-channel complaint registration)
router.use("/webhooks", webhookRoutes);

/* =====================================
   OTP VERIFICATION ROUTES
   Added: 2026-02-10
===================================== */

// Import OTP routes
import otpRoutes from "./otpRoutes.js";

// OTP routes (public - for email verification during signup)
router.use("/otp", otpRoutes);

/* =====================================
   USER FEATURE CHECK ROUTES
   Added: 2026-02-11
===================================== */

// Import user routes
import userRoutes from "./userRoutes.js";

// User routes (requires authentication)
router.use("/user", userRoutes);

/* =====================================
   BULK ORDER ROUTES
   Added: 2026-02-11
===================================== */

// Import bulk order routes
import bulkOrderRoutes from "./bulkOrderRoutes.js";

// Bulk order routes (requires authentication + feature permission)
router.use("/bulk-orders", bulkOrderRoutes);

export default router;
