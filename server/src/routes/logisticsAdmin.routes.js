/**
 * Logistics Admin Routes
 * 
 * Admin endpoints for managing logistics providers.
 * All routes require admin authentication.
 * 
 * @module routes/logisticsAdmin.routes
 */

import express from 'express';
import {
    getAllProviders,
    updateProvider,
    updateCredentials,
    testProviderConnection
} from '../controllers/logisticsAdmin.controller.js';
import { authMiddleware, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/admin/logistics-providers
 * Get all logistics providers
 */
router.get('/logistics-providers', authMiddleware, requireAdmin, getAllProviders);

/**
 * PUT /api/admin/logistics-providers/:id
 * Update provider settings (toggle, priority, etc.)
 */
router.put('/logistics-providers/:id', authMiddleware, requireAdmin, updateProvider);

/**
 * PUT /api/admin/logistics-providers/:id/credentials
 * Update provider API credentials
 */
router.put('/logistics-providers/:id/credentials', authMiddleware, requireAdmin, updateCredentials);

/**
 * POST /api/admin/logistics-providers/:id/test
 * Test provider connection
 */
router.post('/logistics-providers/:id/test', authMiddleware, requireAdmin, testProviderConnection);

export default router;
