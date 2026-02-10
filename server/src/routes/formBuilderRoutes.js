import express from "express";
import {
  getAllForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  addFieldToForm,
  updateFormField,
  removeFormField,
  duplicateForm,
} from "../controllers/formBuilderController.js";
import { authMiddleware, requireAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, requireAdmin);

// Form CRUD
router.get("/", getAllForms);
router.post("/", createForm);
router.get("/:id", getFormById);
router.put("/:id", updateForm);
router.delete("/:id", deleteForm);

// Field management
router.post("/:id/fields", addFieldToForm);
router.put("/:id/fields/:fieldId", updateFormField);
router.delete("/:id/fields/:fieldId", removeFormField);

// Form utilities
router.post("/:id/duplicate", duplicateForm);

export default router;
