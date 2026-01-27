/**
 * Courier Webhook Controller
 * 
 * Handles webhook callbacks from courier partners (Shiprocket)
 * for real-time shipment status updates.
 * 
 * @module controllers/courierWebhook.controller
 */

import Order from '../models/orderModal.js';

/**
 * Shiprocket status to internal status mapping
 */
const STATUS_MAP = {
    // Pickup statuses
    'Pickup Scheduled': 'pickup_scheduled',
    'Pickup Generated': 'pickup_scheduled',
    'Pickup Queued': 'pickup_scheduled',
    'Out For Pickup': 'pickup_scheduled',
    'Pickup Error': 'pickup_pending',
    'Pickup Rescheduled': 'pickup_scheduled',

    // Transit statuses
    'Shipped': 'in_transit',
    'In Transit': 'in_transit',
    'Reached at Destination Hub': 'in_transit',

    // Delivery statuses
    'Out For Delivery': 'out_for_delivery',
    'Delivered': 'delivered',

    // Return statuses
    'RTO Initiated': 'return_to_origin',
    'RTO In-Transit': 'return_to_origin',
    'RTO Delivered': 'rto_delivered',
    'RTO Acknowledged': 'rto_delivered',

    // Other statuses
    'Cancelled': 'cancelled',
    'Lost': 'cancelled',
    'Damaged': 'return_to_origin',
    'Disposed Off': 'cancelled',
    'Destroyed': 'cancelled',

    // Delay/Issue statuses
    'NDR': 'out_for_delivery', // Non-delivery report
    'Undelivered': 'out_for_delivery',
    'Misrouted': 'in_transit'
};

/**
 * Get internal status from Shiprocket status
 */
function mapStatus(shiprocketStatus) {
    return STATUS_MAP[shiprocketStatus] || 'in_transit';
}

/**
 * Handle courier webhook updates
 * POST /api/webhooks/courier-update
 */
export const handleCourierWebhook = async (req, res) => {
    const startTime = Date.now();

    try {
        console.log('[CourierWebhook] Received webhook:', JSON.stringify(req.body).substring(0, 500));

        const payload = req.body;

        // Extract shipment data based on Shiprocket webhook format
        // Shiprocket sends different formats for different events
        let awb, orderId, currentStatus, currentStatusId, location, scans;

        if (payload.awb) {
            // Direct tracking update format
            awb = payload.awb;
            orderId = payload.order_id;
            currentStatus = payload.current_status;
            currentStatusId = payload.current_status_id;
            location = payload.scans?.[0]?.location || payload.location;
            scans = payload.scans;
        } else if (payload.tracking_data) {
            // Nested tracking data format
            const trackingData = payload.tracking_data;
            awb = trackingData.awb_code;
            orderId = trackingData.order_id;
            currentStatus = trackingData.current_status;
            location = trackingData.scans?.[0]?.location;
            scans = trackingData.scans;
        } else if (payload.awb_code) {
            // Alternative format
            awb = payload.awb_code;
            orderId = payload.channel_order_id || payload.order_id;
            currentStatus = payload.current_status;
            location = payload.location;
        } else {
            console.log('[CourierWebhook] Unknown webhook format, skipping');
            return res.status(200).json({ received: true, processed: false, reason: 'Unknown format' });
        }

        if (!awb && !orderId) {
            console.log('[CourierWebhook] No AWB or order ID in webhook');
            return res.status(200).json({ received: true, processed: false, reason: 'No identifier' });
        }

        // Find the order by AWB or Shiprocket order ID
        let order;
        if (awb) {
            order = await Order.findOne({ awbCode: awb });
        }
        if (!order && orderId) {
            order = await Order.findOne({ shiprocketOrderId: String(orderId) });
        }
        // Also try matching by orderNumber (channel order ID)
        if (!order && orderId) {
            order = await Order.findOne({ orderNumber: String(orderId) });
        }

        if (!order) {
            console.log('[CourierWebhook] Order not found for AWB:', awb, 'or order ID:', orderId);
            return res.status(200).json({ received: true, processed: false, reason: 'Order not found' });
        }

        // Map status
        const internalStatus = mapStatus(currentStatus);
        const previousStatus = order.courierStatus;

        // Prepare update data
        const updateData = {
            courierStatus: internalStatus
        };

        // Handle specific statuses
        if (internalStatus === 'delivered') {
            updateData.deliveredAt = new Date();
            updateData.status = 'completed'; // Update main order status
        } else if (internalStatus === 'rto_delivered') {
            updateData.status = 'cancelled'; // Or a specific RTO status
        }

        // Add to courier timeline
        const timelineEntry = {
            status: currentStatus, // Keep original status for display
            location: location || 'Unknown',
            timestamp: new Date(),
            notes: `Status updated via webhook. Status ID: ${currentStatusId || 'N/A'}`
        };

        // Add scan history if available
        if (scans && Array.isArray(scans)) {
            // Only add new scans (avoid duplicates)
            const existingTimestamps = order.courierTimeline?.map(t => t.timestamp?.toISOString()) || [];

            for (const scan of scans) {
                const scanTime = new Date(scan.date + ' ' + (scan.time || '00:00'));
                if (!existingTimestamps.includes(scanTime.toISOString())) {
                    order.courierTimeline = order.courierTimeline || [];
                    order.courierTimeline.push({
                        status: scan.activity || scan.status,
                        location: scan.location || 'Unknown',
                        timestamp: scanTime,
                        notes: scan.remarks || ''
                    });
                }
            }
        }

        // Update order
        await Order.findByIdAndUpdate(order._id, {
            ...updateData,
            $push: { courierTimeline: timelineEntry }
        });

        console.log(`[CourierWebhook] Order ${order.orderNumber} updated: ${previousStatus} -> ${internalStatus}`);

        // Return 200 OK to acknowledge webhook
        res.status(200).json({
            received: true,
            processed: true,
            orderId: order._id,
            orderNumber: order.orderNumber,
            previousStatus,
            newStatus: internalStatus,
            processingTime: Date.now() - startTime
        });

    } catch (error) {
        console.error('[CourierWebhook] Error processing webhook:', error);

        // Still return 200 to prevent retries for non-transient errors
        res.status(200).json({
            received: true,
            processed: false,
            error: error.message
        });
    }
};

/**
 * Verify webhook authenticity (optional security)
 * Can be used as middleware if Shiprocket provides a security token
 */
export const verifyWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-shiprocket-signature'];
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

    // If no secret configured, skip verification
    if (!webhookSecret) {
        return next();
    }

    if (!signature) {
        console.warn('[CourierWebhook] No signature in webhook request');
        return next(); // Allow for now, but log warning
    }

    // Verify signature (implementation depends on Shiprocket's signature method)
    // For now, we're not enforcing since Shiprocket's webhook signature is optional
    next();
};

/**
 * Test webhook endpoint (for debugging)
 * POST /api/webhooks/courier-test
 */
export const testWebhook = async (req, res) => {
    console.log('[CourierWebhook] Test webhook received:', JSON.stringify(req.body, null, 2));
    res.json({
        received: true,
        timestamp: new Date().toISOString(),
        headers: req.headers,
        body: req.body
    });
};

export default {
    handleCourierWebhook,
    verifyWebhookSignature,
    testWebhook
};
