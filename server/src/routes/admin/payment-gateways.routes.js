/**
 * Payment Gateway Admin Routes
 * @module routes/admin/payment-gateways.routes
 */

import express from 'express';
import {
    getAllGateways,
    getGateway,
    createGateway,
    updateGateway,
    toggleGateway,
    deleteGateway,
    getCredentials,
    testGateway,
    getGatewayStats
} from '../../controllers/admin/payment-gateways.controller.js';
import {
    initiateRefund,
    getRefundStatus,
    getOrderRefunds
} from '../../controllers/refund.controller.js';
import reconciliationService from '../../services/reconciliation.service.js';

const router = express.Router();

/* =====================================
   GATEWAY CRUD
===================================== */

// List all gateways
router.get('/', getAllGateways);

// Get single gateway
router.get('/:id', getGateway);

// Create gateway
router.post('/', createGateway);

// Update gateway
router.patch('/:id', updateGateway);

// Toggle active status
router.post('/:id/toggle', toggleGateway);

// Delete gateway
router.delete('/:id', deleteGateway);

/* =====================================
   CREDENTIALS & TESTING
===================================== */

// Get masked credentials
router.get('/:id/credentials', getCredentials);

// Test gateway connectivity
router.post('/:id/test', testGateway);

// Get gateway statistics
router.get('/:id/stats', getGatewayStats);

/* =====================================
   RECONCILIATION
===================================== */

// Get reconciliation status
router.get('/reconciliation/status', async (req, res) => {
    try {
        const status = await reconciliationService.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger manual reconciliation
router.post('/reconciliation/trigger', async (req, res) => {
    try {
        const { hoursBack = 24 } = req.body;
        const result = await reconciliationService.triggerManual({
            hoursBack,
            initiatedBy: req.user?._id
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* =====================================
   REFUND ROUTES
===================================== */

// Initiate refund for an order
router.post('/orders/:orderId/refund', initiateRefund);

// Get refunds for an order
router.get('/orders/:orderId/refunds', getOrderRefunds);

// Get refund status
router.get('/refunds/:refundId', getRefundStatus);

export default router;
