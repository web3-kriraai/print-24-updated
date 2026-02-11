import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkFeatureEndpoint } from "../middlewares/featureMiddleware.js";

const router = express.Router();

/**
 * Check if user has a specific feature
 * GET /api/user/check-feature?feature=bulk_order_upload
 */
router.get("/check-feature", authMiddleware, checkFeatureEndpoint);

export default router;
