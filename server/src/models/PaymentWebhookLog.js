/**
 * Payment Webhook Log Model
 * Audit log for all incoming payment webhooks
 * @module models/PaymentWebhookLog
 */

import mongoose from 'mongoose';

const PaymentWebhookLogSchema = new mongoose.Schema({
    // Source identification
    gateway: {
        type: String,
        enum: ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYU', 'CASHFREE', 'UNKNOWN'],
        required: true,
        index: true
    },

    // Event details
    event_type: {
        type: String,
        required: true,
        index: true
    },
    event_id: String,  // Gateway's event ID if provided

    // Raw data
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    headers: mongoose.Schema.Types.Mixed,

    // Security
    signature: String,
    signature_verified: {
        type: Boolean,
        default: false
    },

    // Processing status
    processing_status: {
        type: String,
        enum: ['RECEIVED', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED', 'DUPLICATE'],
        default: 'RECEIVED',
        index: true
    },

    // Related entities
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentTransaction'
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },

    // Processing details
    processing_attempts: {
        type: Number,
        default: 0
    },
    processed_at: Date,
    processing_duration_ms: Number,

    // Error tracking
    error_message: String,
    error_stack: String,

    // Timestamps
    received_at: {
        type: Date,
        default: Date.now,
        index: true
    },

    // IP tracking for security
    source_ip: String,
    user_agent: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/* =====================
   INDEXES
====================== */
PaymentWebhookLogSchema.index({ received_at: -1 });
PaymentWebhookLogSchema.index({ gateway: 1, event_type: 1, received_at: -1 });
PaymentWebhookLogSchema.index({ processing_status: 1, received_at: 1 });
PaymentWebhookLogSchema.index({ event_id: 1, gateway: 1 });

/* =====================
   STATIC METHODS
====================== */

/**
 * Check if webhook is duplicate (already processed)
 * @param {string} gateway - Gateway name
 * @param {string} eventId - Gateway's event ID
 * @returns {Promise<boolean>} True if duplicate
 */
PaymentWebhookLogSchema.statics.isDuplicate = async function (gateway, eventId) {
    if (!eventId) return false;

    const existing = await this.findOne({
        gateway,
        event_id: eventId,
        processing_status: { $in: ['PROCESSED', 'PROCESSING'] }
    });

    return !!existing;
};

/**
 * Find failed webhooks for retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<Array>} Failed webhooks
 */
PaymentWebhookLogSchema.statics.findForRetry = function (maxAttempts = 3) {
    return this.find({
        processing_status: 'FAILED',
        processing_attempts: { $lt: maxAttempts }
    }).sort({ received_at: 1 }).limit(50);
};

/**
 * Get webhook statistics
 * @param {Date} since - Start date
 * @returns {Promise<Object>} Stats by gateway and status
 */
PaymentWebhookLogSchema.statics.getStats = function (since = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    return this.aggregate([
        { $match: { received_at: { $gte: since } } },
        {
            $group: {
                _id: { gateway: '$gateway', status: '$processing_status' },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.gateway',
                statuses: {
                    $push: { status: '$_id.status', count: '$count' }
                },
                total: { $sum: '$count' }
            }
        }
    ]);
};

/* =====================
   INSTANCE METHODS
====================== */

/**
 * Mark as successfully processed
 * @param {Object} refs - Related entity references
 */
PaymentWebhookLogSchema.methods.markProcessed = function (refs = {}) {
    this.processing_status = 'PROCESSED';
    this.processed_at = new Date();
    this.processing_duration_ms = Date.now() - this.received_at.getTime();

    if (refs.transaction) this.transaction = refs.transaction;
    if (refs.order) this.order = refs.order;

    return this.save();
};

/**
 * Mark as failed
 * @param {Error} error - Error object
 */
PaymentWebhookLogSchema.methods.markFailed = function (error) {
    this.processing_status = 'FAILED';
    this.error_message = error.message;
    this.error_stack = error.stack;
    this.processing_attempts += 1;

    return this.save();
};

const PaymentWebhookLog = mongoose.model('PaymentWebhookLog', PaymentWebhookLogSchema);

export default PaymentWebhookLog;
