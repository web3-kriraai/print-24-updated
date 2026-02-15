import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireFeature } from "../middlewares/featureMiddleware.js";
import {
    getMyClients,
    addClient,
    createClient,
    removeClient,
    getClientOrders,
    getDashboardStats,
    searchUsers,
} from "../controllers/agentClientController.js";

const router = express.Router();

/**
 * Agent Client Management Routes
 * 
 * All routes require authentication + client_management feature.
 * Mounted at /api/agent in server.js
 */

// Apply auth + feature check to all routes
router.use(authMiddleware);
router.use(requireFeature("client_management", { attachConfig: true }));

// Dashboard
router.get("/dashboard-stats", getDashboardStats);

// Client CRUD
router.get("/my-clients", getMyClients);
router.post("/add-client", addClient);
router.post("/create-client", createClient);
router.delete("/remove-client/:clientId", removeClient);

// Client orders
router.get("/client/:clientId/orders", getClientOrders);

// User search (for adding existing users as clients)
router.get("/search-users", searchUsers);

export default router;
