/**
 * Courier Routes
 * 
 * Routes for courier operations and webhook handling.
 * 
 * @module routes/courierRoutes
 */

import express from 'express';
import {
   checkServiceability,
   createShipment,
   getTracking,
   getTrackingByOrder,
   cancelShipment,
   selectBestCourier,
   getPickupLocations,
   createUserShipment,
   triggerAutoShipment
} from '../controllers/courierController.js';
import {
   handleCourierWebhook,
   verifyWebhookSignature,
   testWebhook
} from '../controllers/courierWebhook.controller.js';
import { authMiddleware as protect, requireAdmin as adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

/* =======================
   PUBLIC ENDPOINTS
======================= */

/**
 * Check if a pincode is serviceable
 * POST /api/courier/check-serviceability
 * Body: { pickupPincode, deliveryPincode, weight?, paymentMode? }
 */
router.post('/check-serviceability', checkServiceability);

/**
 * Get tracking info by AWB code
 * GET /api/courier/tracking/:awbCode
 */
router.get('/tracking/:awbCode', getTracking);

/**
 * Select best courier for a delivery (smart routing)
 * POST /api/courier/select-best
 * Body: { deliveryPincode, weight?, paymentMode?, pickupPincode? }
 */
router.post('/select-best', selectBestCourier);

/* =======================
   PROTECTED ENDPOINTS (Logged in users)
======================= */

/**
 * Get tracking by order ID
 * GET /api/courier/tracking/order/:orderId
 */
router.get('/tracking/order/:orderId', protect, getTrackingByOrder);

/**
 * Create shipment for user's own order (authenticated users)
 * POST /api/courier/create-user-shipment/:orderId
 * Body: { courierId?, city?, state? }
 * This endpoint allows users to trigger external delivery for their orders
 */
router.post('/create-user-shipment/:orderId', protect, createUserShipment);

/* =======================
   ADMIN ENDPOINTS
======================= */

/**
 * Create shipment for an order
 * POST /api/courier/create-shipment/:orderId
 * Body: { courierId?, pickupPincode?, city?, state? }
 */
router.post('/create-shipment/:orderId', protect, adminOnly, createShipment);

/**
 * Trigger automatic shipment creation for an order
 * Uses the centralized ShipmentService
 * POST /api/courier/trigger-shipment/:orderId
 */
router.post('/trigger-shipment/:orderId', protect, adminOnly, triggerAutoShipment);

/**
 * Cancel shipment
 * POST /api/courier/cancel-shipment/:orderId
 */
router.post('/cancel-shipment/:orderId', protect, adminOnly, cancelShipment);

/**
 * Get pickup locations from Shiprocket
 * GET /api/courier/pickup-locations
 */
router.get('/pickup-locations', protect, adminOnly, getPickupLocations);


/* =======================
   WEBHOOK ENDPOINTS (No auth - called by 3PL)
======================= */

/**
 * Courier status update webhook
 * POST /api/courier/webhook OR /api/webhooks/webhook
 * Called by Shiprocket when shipment status changes
 */
router.post('/webhook', verifyWebhookSignature, handleCourierWebhook);

/**
 * Courier status update webhook (alias)
 * POST /api/webhooks/courier-update
 * This is the documented endpoint for courier updates
 */
router.post('/courier-update', verifyWebhookSignature, handleCourierWebhook);

/**
 * Test webhook endpoint (for debugging)
 * POST /api/courier/webhook-test
 */
router.post('/webhook-test', testWebhook);

export default router;
