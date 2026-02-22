/**
 * Courier Webhook Controller
 * 
 * Receives real-time status updates from 3PL courier partners (Shiprocket).
 * Endpoint: POST /api/webhooks/courier-update
 * 
 * Maps 3PL statuses to system statuses so customers can track
 * shipment progress on the website without visiting the courier's site.
 * 
 * @module controllers/courierWebhook.controller
 */

import Order from '../models/orderModal.js';

/**
 * 3PL Status → System Status Mapping
 * 
 * Shiprocket sends various status strings. We normalize them
 * into our system's courierStatus enum values.
 */
const STATUS_MAP = {
    // Shiprocket pickup statuses
    'pickup scheduled': 'pickup_scheduled',
    'pickup generated': 'pickup_scheduled',
    'pickup queued': 'pickup_scheduled',
    'out for pickup': 'pickup_scheduled',
    'pickup completed': 'pickup_completed',
    'picked up': 'pickup_completed',

    // In transit statuses
    'shipped': 'in_transit',
    'in transit': 'in_transit',
    'in_transit': 'in_transit',
    'reached at destination hub': 'in_transit',
    'reached destination hub': 'in_transit',

    // Out for delivery
    'out for delivery': 'out_for_delivery',
    'out_for_delivery': 'out_for_delivery',

    // Delivered
    'delivered': 'delivered',
    'dl': 'delivered',

    // Return to origin
    'rto initiated': 'return_to_origin',
    'rto_initiated': 'return_to_origin',
    'rto in transit': 'return_to_origin',
    'rto delivered': 'return_to_origin',
    'return to origin': 'return_to_origin',

    // Cancelled
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'undelivered': 'cancelled',
};

/**
 * Normalize a 3PL status string to our system status
 * @param {string} thirdPartyStatus - Raw status from 3PL
 * @returns {string|null} Mapped system status or null if unknown
 */
function mapCourierStatus(thirdPartyStatus) {
    if (!thirdPartyStatus) return null;
    const normalized = thirdPartyStatus.toLowerCase().trim();
    return STATUS_MAP[normalized] || null;
}

/**
 * POST /api/webhooks/courier-update
 * 
 * Handles incoming webhook from Shiprocket / 3PL courier partners.
 * 
 * Shiprocket webhook payload format:
 * {
 *   "awb": "AWB_CODE",
 *   "current_status": "Delivered",
 *   "shipment_id": "12345",
 *   "order_id": "ORD-xxx",
 *   "current_timestamp": "2026-02-21 10:30:00",
 *   "scans": [{ "location": "Mumbai", "date": "2026-02-21", "activity": "Delivered" }],
 *   "etd": "2026-02-22 18:00:00"
 * }
 */
export const handleCourierWebhook = async (req, res) => {
    try {
        const payload = req.body;

        console.log('[CourierWebhook] ═══════════════════════════════════════');
        console.log('[CourierWebhook] 📬 Received courier status update');
        console.log('[CourierWebhook] Payload:', JSON.stringify(payload, null, 2));

        // Extract fields from Shiprocket webhook format
        const awbCode = payload.awb || payload.awb_code;
        const shiprocketOrderId = payload.order_id;
        const currentStatus = payload.current_status;
        const shipmentId = payload.shipment_id;
        const currentTimestamp = payload.current_timestamp;
        const scans = payload.scans || [];
        const etd = payload.etd;

        if (!awbCode && !shiprocketOrderId) {
            console.warn('[CourierWebhook] ⚠️  No AWB or order_id in payload');
            return res.status(400).json({
                success: false,
                error: 'Missing awb or order_id in webhook payload'
            });
        }

        if (!currentStatus) {
            console.warn('[CourierWebhook] ⚠️  No current_status in payload');
            return res.status(400).json({
                success: false,
                error: 'Missing current_status in webhook payload'
            });
        }

        // Map 3PL status to system status
        const systemStatus = mapCourierStatus(currentStatus);
        if (!systemStatus) {
            console.warn(`[CourierWebhook] ⚠️  Unknown 3PL status: "${currentStatus}"`);
            // Still process it by storing as-is in timeline, but don't update courierStatus
        }

        // Find order by AWB code or Shiprocket order ID
        let order = null;

        if (awbCode) {
            order = await Order.findOne({ awbCode: awbCode });
        }

        if (!order && shiprocketOrderId) {
            order = await Order.findOne({ shiprocketOrderId: String(shiprocketOrderId) });
        }

        // Also try matching by orderNumber (Shiprocket stores our orderNumber as order_id)
        if (!order && shiprocketOrderId) {
            order = await Order.findOne({ orderNumber: String(shiprocketOrderId) });
        }

        if (!order) {
            console.warn(`[CourierWebhook] ⚠️  No matching order found for AWB: ${awbCode}, Order ID: ${shiprocketOrderId}`);
            // Return 200 to prevent 3PL from retrying (they might send updates for old/test orders)
            return res.status(200).json({
                success: false,
                message: 'No matching order found, ignoring webhook'
            });
        }

        console.log(`[CourierWebhook] ✅ Found order: ${order.orderNumber} (${order._id})`);
        console.log(`[CourierWebhook] 🔄 Status: "${currentStatus}" → "${systemStatus || 'unknown'}"`);

        // Update courier status if we have a valid mapping
        if (systemStatus) {
            order.courierStatus = systemStatus;
        }

        // Add to courier timeline
        if (!order.courierTimeline) {
            order.courierTimeline = [];
        }

        // Add the main status update
        order.courierTimeline.push({
            status: currentStatus,
            location: scans?.[0]?.location || '',
            timestamp: currentTimestamp ? new Date(currentTimestamp) : new Date(),
            notes: `3PL Update: ${currentStatus}${systemStatus ? ` → System: ${systemStatus}` : ''}`
        });

        // Add individual scan activities if present
        if (scans && scans.length > 1) {
            for (let i = 1; i < scans.length; i++) {
                const scan = scans[i];
                order.courierTimeline.push({
                    status: scan.activity || scan.status || currentStatus,
                    location: scan.location || '',
                    timestamp: scan.date ? new Date(scan.date) : new Date(),
                    notes: `Scan: ${scan.activity || scan.status || ''}`
                });
            }
        }

        // Handle special status transitions
        if (systemStatus === 'delivered') {
            order.deliveredAt = currentTimestamp ? new Date(currentTimestamp) : new Date();
            // Mark order as completed if not already
            if (order.status !== 'completed') {
                console.log(`[CourierWebhook] 🎉 Order delivered! Marking as completed.`);
                order.status = 'completed';
            }
        }

        // Update ETD if provided
        if (etd) {
            order.estimatedDeliveryDate = new Date(etd);
        }

        await order.save();

        console.log(`[CourierWebhook] ✅ Order ${order.orderNumber} updated successfully`);
        console.log('[CourierWebhook] ═══════════════════════════════════════');

        return res.status(200).json({
            success: true,
            message: `Order ${order.orderNumber} updated: ${currentStatus} → ${systemStatus || 'logged'}`,
            orderNumber: order.orderNumber,
            courierStatus: order.courierStatus
        });

    } catch (error) {
        console.error('[CourierWebhook] ❌ Error processing webhook:', error);
        // Return 200 even on error to prevent 3PL retry loops
        // Log the error for debugging but acknowledge receipt
        return res.status(200).json({
            success: false,
            error: 'Internal error processing webhook, logged for review'
        });
    }
};
