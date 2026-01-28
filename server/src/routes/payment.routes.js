/**
 * Payment Routes
 * Customer-facing payment endpoints
 * @module routes/payment.routes
 */

import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware.js';
import {
    initializePayment,
    initializeTestPayment,
    verifyPayment,
    getPaymentStatus,
    getPaymentHealth
} from '../controllers/payment.controller.js';
import { handleWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

/* =====================================
   PAYMENT ENDPOINTS
===================================== */

// Initialize payment (requires auth)
router.post('/initialize', authMiddleware, initializePayment);

// Test payment initialization (for testing payment UI - requires auth)
router.post('/test-initialize', authMiddleware, initializeTestPayment);

// Verify payment callback (optional auth - may come from redirect)
router.post('/verify', optionalAuthMiddleware, verifyPayment);

// Get transaction status
router.get('/status/:transactionId', optionalAuthMiddleware, getPaymentStatus);

// Health check (public)
router.get('/health', getPaymentHealth);

/* =====================================
   WEBHOOK ENDPOINT
   Note: Webhooks need raw body for signature verification
===================================== */

// Universal webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    // Parse raw body back to JSON but keep raw for signature verification
    if (req.body && Buffer.isBuffer(req.body)) {
        req.rawBody = req.body.toString();
        try {
            req.body = JSON.parse(req.rawBody);
        } catch (e) {
            // Keep as-is if not JSON
        }
    }
    next();
}, handleWebhook);

// Gateway-specific webhook endpoints (all route to same handler)
router.post('/webhook/razorpay', handleWebhook);
router.post('/webhook/stripe', handleWebhook);
router.post('/webhook/phonepe', handleWebhook);

export default router;
