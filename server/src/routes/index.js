import express from "express";
import { adminAuth } from "../middlewares/roleMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { optionalAuthMiddleware } from "../middlewares/optionalAuthMiddleware.js";
import upload, { uploadZip } from "../middlewares/upload.js";

// Payment Routes
import paymentRoutes from "./payment.routes.js";
import paymentGatewayRoutes from "./admin/payment-gateways.routes.js";

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
  reorderProducts,
  updateProductsSortOrder,
  toggleProductStatus,
  restoreProduct,
  duplicateProduct,
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
  updateReviewSettings,
  getReviewsByService,
  updateReviewOrder,
  toggleReviewVisibility,
  toggleReviewFeatured,
  deleteReview,
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
  duplicateAttributeType,
  checkAttributeUsage,
  reorderAttributeValues,
} from "../controllers/attributeTypeController.js";

/* ATTRIBUTE RULE CONTROLLERS */
import {
  createAttributeRule,
  getAllAttributeRules,
  updateAttributeRule,
  deleteAttributeRule,
} from "../controllers/attributeRule.controller.js";

/* SUB-ATTRIBUTE CONTROLLERS */
import {
  createSubAttribute,
  getAllSubAttributes,
  updateSubAttribute,
  deleteSubAttribute,
  reorderSubAttributes,
} from "../controllers/subAttribute.controller.js";

/* ATTRIBUTE IMAGE MATRIX CONTROLLERS */
import {
  getProductMatrix,
  generateProductMatrix,
  generateProductMatrixCustom,
  previewProductMatrix,
  uploadMatrixImage,
  bulkUploadMatrixImages,
  resolveMatrixImage,
  deleteMatrixEntry,
  clearMatrixEntryImage,
  clearProductMatrix,
  downloadTemplate,
  bulkUpload,
} from "../controllers/attributeImageMatrixController.js";

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

/* SERVICE CONTROLLERS */
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  updateServiceOrder,
  uploadBannerImage,
  toggleServiceStatus,
  uploadMultipleServiceBanners,
  deleteServiceBanner,
  reorderServiceBanners,
  updateAutoSlideDuration,
} from "../controllers/serviceController.js";

/* SITE SETTINGS CONTROLLERS */
import {
  getSiteSettings,
  updateSiteSettings,
  uploadLogo,
} from "../controllers/siteSettingsController.js";

/* DYNAMIC SIGNUP ROUTES */
import segmentApplicationRoutes from "./segmentApplicationRoutes.js";
import formBuilderRoutes from "./formBuilderRoutes.js";
import otpRoutes from "./otpRoutes.js";

/* PRICING & PMS ROUTES */
import pricingRoutes from "./pricingRoutes.js";
import pricingAdminRoutes from "./admin/pricingAdminRoutes.js";
import currencyRoutes from "./currencyRoutes.js";
import geolocationRoutes from "./geolocationRoutes.js";
import userContextRoutes from "./userContextRoutes.js";

/* MODIFIER ROUTES */
import modifierRoutes from "./modifierRoutes.js";

/* BULK ORDER ROUTES */
import bulkOrderRoutes from "./bulkOrderRoutes.js";

/* COMPLAINT ROUTES */
import complaintRoutes from "./complaintRoutes.js";

const router = express.Router();

/* =====================================
   CATEGORY ROUTES
===================================== */

router.post(
  "/categories",
  authMiddleware,
  adminAuth,
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
  adminAuth,
  upload.single("image"),
  updateCategory
);
router.delete("/categories/:id", authMiddleware, adminAuth, deleteCategory);

/* =====================================
   SUBCATEGORY ROUTES
===================================== */

router.post(
  "/subcategories",
  authMiddleware,
  adminAuth,
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
  adminAuth,
  upload.single("image"),
  updateSubCategory
);
router.delete(
  "/subcategories/:id",
  authMiddleware,
  adminAuth,
  deleteSubCategory
);

/* =====================================
   PRODUCT ROUTES
===================================== */

router.post(
  "/products",
  authMiddleware,
  adminAuth,
  upload.single("image"), // enable file upload
  createProduct
);

router.get("/products", getAllProducts);
router.get("/products/category/:categoryId", getProductsByCategory);
router.get("/products/subcategory/:subcategoryId", getProductsBySubcategory);
router.get("/products/:id/detail", getProductDetail); // PDP endpoint - must be before /products/:id
router.put(
  "/products/reorder",
  authMiddleware,
  adminAuth,
  reorderProducts
);
router.put(
  "/products/sort-order",
  authMiddleware,
  adminAuth,
  updateProductsSortOrder
);
router.get("/products/:id", getSingleProduct);
router.put(
  "/products/:id",
  authMiddleware,
  adminAuth,
  upload.single("image"),
  updateProduct
);
router.delete("/products/:id", authMiddleware, adminAuth, deleteProduct);
router.put(
  "/products/:id/toggle-status",
  authMiddleware,
  adminAuth,
  toggleProductStatus
);
router.put(
  "/products/:id/restore",
  authMiddleware,
  adminAuth,
  restoreProduct
);

router.post(
  "/products/:id/duplicate",
  authMiddleware,
  adminAuth,
  duplicateProduct
);

/* =====================================
   PRODUCT IMAGE MATRIX ROUTES
===================================== */

// Get product matrix configuration
router.get("/products/:productId/image-matrix", authMiddleware, adminAuth, getProductMatrix);

// Generate matrix combinations
router.post("/products/:productId/image-matrix/generate", authMiddleware, adminAuth, generateProductMatrix);

// Generate matrix with custom configurations
router.post("/products/:productId/image-matrix/generate-custom", authMiddleware, adminAuth, generateProductMatrixCustom);

// Preview matrix before generation
router.get("/products/:productId/image-matrix/preview", authMiddleware, adminAuth, previewProductMatrix);

// Upload image for a specific combination
router.post("/products/:productId/image-matrix/upload", authMiddleware, adminAuth, upload.single("image"), uploadMatrixImage);

// Bulk upload images for multiple combinations
router.post("/products/:productId/image-matrix/bulk", authMiddleware, adminAuth, upload.array("images", 50), bulkUploadMatrixImages);

// Download Excel template for bulk upload
router.get("/products/:productId/image-matrix/template", authMiddleware, adminAuth, downloadTemplate);

// Bulk upload via ZIP file (Excel + images)
router.post("/products/:productId/image-matrix/bulk-upload", authMiddleware, adminAuth, uploadZip.single("file"), bulkUpload);

// Resolve matrix image based on attribute selection (public endpoint for PDP)
router.get("/products/:productId/image-matrix/resolve", resolveMatrixImage);

// Delete a specific matrix entry
router.delete("/products/:productId/image-matrix/:entryId", authMiddleware, adminAuth, deleteMatrixEntry);

// Clear image from a matrix entry
router.delete("/products/:productId/image-matrix/:entryId/image", authMiddleware, adminAuth, clearMatrixEntryImage);

// Clear all matrix entries for a product
router.delete("/products/:productId/image-matrix", authMiddleware, adminAuth, clearProductMatrix);

/* =====================================
   ADMIN ROUTES
===================================== */

router.get("/admin/uploads", authMiddleware, adminAuth, getAllUploads);

router.get("/admin/uploads/:id", authMiddleware, adminAuth, getUploadById);

router.delete("/admin/uploads/:id", authMiddleware, adminAuth, deleteUpload);

router.post("/admin/create-admin", authMiddleware, adminAuth, createAdmin);

router.post("/admin/create-employee", authMiddleware, adminAuth, createEmployee);

router.get("/admin/admins", authMiddleware, adminAuth, getAllAdmins);

router.get("/admin/users", authMiddleware, adminAuth, getAllUsers);

router.get("/admin/employees", authMiddleware, adminAuth, getAllEmployees);

router.put(
  "/admin/update-user-role",
  authMiddleware,
  adminAuth,
  updateUserRole
);

/* =====================================
   REVIEW ROUTES
===================================== */

// Reviews route - authentication is optional (handled in controller)
router.post("/reviews", optionalAuthMiddleware, createReview);
router.get("/reviews", getAllReviews);
router.get("/reviews/service/:serviceId", getReviewsByService);

// Admin review management routes
router.patch("/reviews/:id/settings", authMiddleware, adminAuth, updateReviewSettings);
router.patch("/reviews/reorder", authMiddleware, adminAuth, updateReviewOrder);
router.patch("/reviews/:id/visibility", authMiddleware, adminAuth, toggleReviewVisibility);
router.patch("/reviews/:id/featured", authMiddleware, adminAuth, toggleReviewFeatured);
router.delete("/reviews/:id", authMiddleware, adminAuth, deleteReview);

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
router.put("/orders/:orderId/cancel", authMiddleware, cancelOrder);

// Admin order routes
router.get("/admin/orders", authMiddleware, adminAuth, getAllOrders);
router.put(
  "/admin/orders/:orderId",
  authMiddleware,
  adminAuth,
  updateOrderStatus
);

// New: Admin order approval route (ensures proper department assignment)
router.post(
  "/orders/:orderId/approve",
  authMiddleware,
  adminAuth,
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

router.post("/attribute-types", authMiddleware, adminAuth, createAttributeType);

router.get("/attribute-types", getAllAttributeTypes);
router.get("/attribute-types/unused/list", getUnusedAttributeTypes);
router.get("/attribute-types/:id/check-usage", authMiddleware, adminAuth, checkAttributeUsage);
router.get("/attribute-types/:id", getSingleAttributeType);
router.put(
  "/attribute-types/:id",
  authMiddleware,
  adminAuth,
  updateAttributeType
);
router.delete(
  "/attribute-types/:id",
  authMiddleware,
  adminAuth,
  deleteAttributeType
);
router.post(
  "/attribute-types/:id/duplicate",
  authMiddleware,
  adminAuth,
  duplicateAttributeType
);
router.put(
  "/attribute-types/:id/reorder-values",
  authMiddleware,
  adminAuth,
  reorderAttributeValues
);

/* =====================================
   ATTRIBUTE RULE ROUTES (Admin)
===================================== */

router.post("/admin/attribute-rules", authMiddleware, adminAuth, createAttributeRule);
router.get("/admin/attribute-rules", authMiddleware, adminAuth, getAllAttributeRules);
router.put("/admin/attribute-rules/:id", authMiddleware, adminAuth, updateAttributeRule);
router.delete("/admin/attribute-rules/:id", authMiddleware, adminAuth, deleteAttributeRule);

/* =====================================
   SUB-ATTRIBUTE ROUTES (Admin)
===================================== */

router.post("/admin/sub-attributes", authMiddleware, adminAuth, upload.single("image"), createSubAttribute);
router.get("/admin/sub-attributes", authMiddleware, adminAuth, getAllSubAttributes);
router.put("/admin/sub-attributes/reorder", authMiddleware, adminAuth, reorderSubAttributes);
router.put("/admin/sub-attributes/:id", authMiddleware, adminAuth, upload.single("image"), updateSubAttribute);
router.delete("/admin/sub-attributes/:id", authMiddleware, adminAuth, deleteSubAttribute);

/* =====================================
   ATTRIBUTE IMAGE MATRIX ROUTES (Admin)
   For managing pre-rendered product images
   based on attribute combinations
===================================== */

// Preview matrix generation (get attributes + combination count)
router.get("/products/:productId/image-matrix/preview", authMiddleware, adminAuth, previewProductMatrix);

// Generate matrix entries (Cartesian product)
router.post("/products/:productId/image-matrix/generate", authMiddleware, adminAuth, generateProductMatrix);

// Generate matrix entries with custom attribute/value selection
router.post("/products/:productId/image-matrix/generate-custom", authMiddleware, adminAuth, generateProductMatrixCustom);

// Get all matrix entries for a product (paginated)
router.get("/products/:productId/image-matrix", authMiddleware, adminAuth, getProductMatrix);

// Resolve image for current attribute selection (PUBLIC - used by frontend)
router.get("/products/:productId/image-matrix/resolve", resolveMatrixImage);

// Upload image for a specific matrix entry
router.put("/products/:productId/image-matrix/:entryId", authMiddleware, adminAuth, upload.single("image"), uploadMatrixImage);

// Bulk upload images (match by filename)
router.post("/products/:productId/image-matrix/bulk-upload", authMiddleware, adminAuth, upload.array("images", 200), bulkUploadMatrixImages);

// Clear image from an entry (keep entry, remove image)
router.delete("/products/:productId/image-matrix/:entryId/image", authMiddleware, adminAuth, clearMatrixEntryImage);

// Delete a single matrix entry
router.delete("/products/:productId/image-matrix/:entryId", authMiddleware, adminAuth, deleteMatrixEntry);

// Clear all matrix entries for a product
router.delete("/products/:productId/image-matrix", authMiddleware, adminAuth, clearProductMatrix);

/* =====================================
   DEPARTMENT ROUTES
===================================== */

router.post("/departments", authMiddleware, adminAuth, createDepartment);

router.get("/departments", getAllDepartments);
router.get("/departments/:id", getSingleDepartment);
router.put("/departments/:id", authMiddleware, adminAuth, updateDepartment);
router.delete("/departments/:id", authMiddleware, adminAuth, deleteDepartment);

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

router.post("/sequences", authMiddleware, adminAuth, createSequence);

router.get("/sequences", getAllSequences);
router.get("/sequences/subcategory/:subcategoryId", getSequenceBySubcategory);
router.get("/sequences/:id", getSingleSequence);
router.put("/sequences/:id", authMiddleware, adminAuth, updateSequence);
router.delete("/sequences/:id", authMiddleware, adminAuth, deleteSequence);

/* =====================================
   SERVICE ROUTES
===================================== */

// Public routes (with optional auth for segment detection)
router.get("/services", optionalAuthMiddleware, getAllServices);
router.get("/services/:id", optionalAuthMiddleware, getServiceById);

// Admin routes
router.post("/services", authMiddleware, adminAuth, createService);
router.put("/services/:id", authMiddleware, adminAuth, updateService);
router.delete("/services/:id", authMiddleware, adminAuth, deleteService);
router.patch("/services/reorder", authMiddleware, adminAuth, updateServiceOrder);
router.post("/services/:id/banner", authMiddleware, adminAuth, uploadBannerImage);
router.patch("/services/:id/toggle-status", authMiddleware, adminAuth, toggleServiceStatus);

// Multiple banner management routes
router.post("/services/:id/banners", authMiddleware, adminAuth, uploadMultipleServiceBanners);
router.delete("/services/:id/banners/:bannerId", authMiddleware, adminAuth, deleteServiceBanner);
router.put("/services/:id/banners/reorder", authMiddleware, adminAuth, reorderServiceBanners);
router.put("/services/:id/auto-slide-duration", authMiddleware, adminAuth, updateAutoSlideDuration);

/* =====================================
   GEOCODING ROUTES (Nominatim Proxy)
===================================== */

// Reverse geocoding - get address from coordinates
router.get("/geocoding/reverse", reverseGeocode);

// Forward geocoding - search by postalcode/address
router.get("/geocoding/search", searchGeocode);

/* =====================================
   SITE SETTINGS ROUTES
===================================== */

// Public route - get site settings (logo, site name, etc.)
router.get("/site-settings", getSiteSettings);

// Admin routes
router.put("/site-settings", authMiddleware, adminAuth, updateSiteSettings);
router.post("/site-settings/logo", authMiddleware, adminAuth, uploadLogo);

/* =====================================
   DYNAMIC SIGNUP ROUTES
===================================== */

// Segment application routes (public + admin)
router.use("/", segmentApplicationRoutes);

// Form builder routes (admin only)
router.use("/admin/forms", formBuilderRoutes);

// OTP routes (public)
router.use("/otp", otpRoutes);

/* =====================================
   PMS ROUTES (Pricing & Modifiers)
===================================== */

// Admin pricing routes: /api/admin/price-books, /api/admin/pricing/geo-zones, etc.
router.use("/admin", pricingAdminRoutes);

// Public pricing API
router.use("/pricing", pricingRoutes);
router.use("/currency", currencyRoutes);
router.use("/geolocation", geolocationRoutes);
router.use("/user", userContextRoutes);

// Modifier routes (alternative endpoint structure)
// Note: pricingAdminRoutes includes /price-modifiers, but modifierRoutes provides /admin/modifiers
router.use("/admin/modifiers", authMiddleware, adminAuth, modifierRoutes);

// Payment routes

router.use("/payment", paymentRoutes);
router.use("/admin/payment-gateways", authMiddleware, adminAuth, paymentGatewayRoutes);

/* =====================================
   BULK ORDER ROUTES
===================================== */
router.use("/bulk-orders", bulkOrderRoutes);

/* =====================================
   COMPLAINT ROUTES
===================================== */
router.use("/complaints", complaintRoutes);

export default router;
