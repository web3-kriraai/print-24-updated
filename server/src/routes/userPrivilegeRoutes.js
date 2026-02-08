import express from "express";
import UserPrivilegeController from "../controllers/UserPrivilegeController.js";

/**
 * User Privilege Routes
 * 
 * Frontend-facing endpoints for privilege and feature checking.
 * These routes require authentication but NOT admin privileges.
 */

const router = express.Router();

// Get current user's effective privileges
router.get("/privileges", UserPrivilegeController.getUserPrivileges);

// Get current user's enabled feature flags
router.get("/features", UserPrivilegeController.getUserFeatures);

// Check specific privilege (useful for conditional API calls)
router.get("/check-privilege", UserPrivilegeController.checkPrivilege);

export default router;
