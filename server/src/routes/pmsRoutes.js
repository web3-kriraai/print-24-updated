import express from "express";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";
import UserTypeController from "../controllers/pms/UserTypeController.js";
import PrivilegeBundleController from "../controllers/pms/PrivilegeBundleController.js";
import ViewStyleController from "../controllers/pms/ViewStyleController.js";
import UserTypeAssignmentController from "../controllers/pms/UserTypeAssignmentController.js";
import PMSAuditController from "../controllers/pms/PMSAuditController.js";
import ResourceRegistryController from "../controllers/pms/ResourceRegistryController.js";
import FeatureFlagController from "../controllers/pms/FeatureFlagController.js";
import PrivilegeVerificationService from "../services/PrivilegeVerificationService.js";

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.post("/user-types", UserTypeController.create);
router.get("/user-types", UserTypeController.list);
router.get("/user-types/:id", UserTypeController.getById);
router.put("/user-types/:id", UserTypeController.update);
router.delete("/user-types/:id", UserTypeController.delete);
router.post("/user-types/:id/duplicate", UserTypeController.duplicate);
router.post("/user-types/:id/assign-privilege-bundle", UserTypeController.assignPrivilegeBundle);

router.post("/privilege-bundles", PrivilegeBundleController.create);
router.get("/privilege-bundles", PrivilegeBundleController.list);
router.get("/privilege-bundles/:id", PrivilegeBundleController.getById);
router.put("/privilege-bundles/:id", PrivilegeBundleController.update);
router.delete("/privilege-bundles/:id", PrivilegeBundleController.delete);

router.post("/view-styles", ViewStyleController.create);
router.get("/view-styles", ViewStyleController.list);
router.get("/view-styles/:id", ViewStyleController.getById);
router.put("/view-styles/:id", ViewStyleController.update);
router.post("/view-styles/:id/clone", ViewStyleController.clone);
router.get("/view-styles/:id/preview", ViewStyleController.getPreview);

router.post("/assignments/assign", UserTypeAssignmentController.assign);
router.post("/assignments/bulk-assign", UserTypeAssignmentController.bulkAssign);
router.get("/assignments", UserTypeAssignmentController.listAssignments);
router.post("/view-styles/assign", UserTypeAssignmentController.assignViewStyle); // Changed path slightly for clarity

router.get("/audit-logs", PMSAuditController.getLogs);
router.get("/audit-logs/export", PMSAuditController.exportLogs);
router.get("/audit-logs/:id", PMSAuditController.getLogDetails);

router.get("/resources", ResourceRegistryController.listResources);
router.get("/resources/:name/actions", ResourceRegistryController.getActions);
router.post("/resources/custom", ResourceRegistryController.createCustomResource);

router.get("/feature-flags", FeatureFlagController.list);
router.post("/feature-flags", FeatureFlagController.create);
router.put("/feature-flags/:key", FeatureFlagController.update);
router.put("/feature-flags/:key/toggle", FeatureFlagController.toggleForType);

// Debug Routes
router.get("/debug/privileges/:userId", async (req, res) => {
   try {
      const privileges = await PrivilegeVerificationService.getUserPrivileges(req.params.userId);
      res.json(privileges);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

router.post("/debug/invalidate-cache", async (req, res) => {
   try {
      const { userId, typeId } = req.body;
      if (userId) await PrivilegeVerificationService.invalidateUserCache(userId);
      if (typeId) await PrivilegeVerificationService.invalidateTypeCache(typeId);
      res.json({ message: "Cache invalidated" });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

export default router;
