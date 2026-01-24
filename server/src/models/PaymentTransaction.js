/**
 * Payment Transaction Model
 * Tracks every payment attempt with full lifecycle
 * @module models/PaymentTransaction
 */

import mongoose from 'mongoose';

const PaymentTransactionSchema = new mongoose.Schema({
    // Core references
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    payment_gateway: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentGateway',
        required: true
    },

    // Gateway identifiers (duplicated for faster queries)
    gateway_name: {
        type: String,
        enum: ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYU', 'CASHFREE'],
        required: true,
        index: true
    },
    gateway_order_id: {
        type: String,
        index: true
    },
    gateway_payment_id: {
        type: String,
        sparse: true,
        index: true
    },
    gateway_transaction_id: String,

    // Payment details
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: [
            'CREATED',           // Transaction record created
            'ATTEMPTED',         // User attempted payment
            'PENDING',           // Payment processing
            'SUCCESS',           // Payment successful
            'FAILED',            // Payment failed
            'REFUNDED',          // Fully refunded
            'PARTIALLY_REFUNDED',// Partial refund issued
            'CANCELLED',         // User/system cancelled
            'EXPIRED'            // Payment link expired
        ],
        default: 'CREATED',
        index: true
    },

    // Payment method details (populated after payment)
    payment_method: {
        type: String,
        enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'QR', 'BANK_TRANSFER', 'EMI', 'OTHER']
    },
    payment_method_details: {
        type: mongoose.Schema.Types.Mixed,
        // Structure varies by payment method:
        // Card: { last4, network, issuer, type }
        // UPI: { vpa }
        // NetBanking: { bank }
        // Wallet: { provider }
    },

    // Split payment tracking (future-proofing)
    is_split_payment: {
        type: Boolean,
        default: false
    },
    split_details: [{
        recipient_id: mongoose.Schema.Types.ObjectId,
        recipient_type: {
            type: String,
            enum: ['AGENT', 'DISTRIBUTOR', 'VENDOR', 'PARTNER']
        },
        account_id: String,  // Gateway-specific account ID
        amount: Number,
        percentage: Number,
        status: {
            type: String,
            enum: ['PENDING', 'TRANSFERRED', 'FAILED'],
            default: 'PENDING'
        },
        transferred_at: Date
    }],

    // Refund tracking
    refunds: [{
        refund_id: String,           // Gateway refund ID
        amount: Number,
        reason: {
            type: String,
            enum: ['CUSTOMER_REQUEST', 'ORDER_CANCELLED', 'DUPLICATE_PAYMENT', 'PRODUCT_ISSUE', 'OTHER']
        },
        notes: String,
        status: {
            type: String,
            enum: ['INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED'],
            default: 'INITIATED'
        },
        initiated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        initiated_at: {
            type: Date,
            default: Date.now
        },
        processed_at: Date,
        gateway_response: mongoose.Schema.Types.Mixed
    }],
    total_refunded: {
        type: Number,
        default: 0
    },

    // Reconciliation
    reconciliation_status: {
        type: String,
        enum: ['PENDING', 'MATCHED', 'MISMATCH', 'RESOLVED', 'NOT_APPLICABLE'],
        default: 'PENDING'
    },
    reconciliation_notes: String,
    reconciled_at: Date,

    // Timestamps
    initiated_at: {
        type: Date,
        default: Date.now
    },
    captured_at: Date,
    expires_at: Date,

    // Gateway response storage
    gateway_response: mongoose.Schema.Types.Mixed,
    webhook_received: {
        type: Boolean,
        default: false
    },

    // Retry tracking
    is_retry: {
        type: Boolean,
        default: false
    },
    original_transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PaymentTransaction'
    },
    retry_count: {
        type: Number,
        default: 0
    },

    // Error details
    error_code: String,
    error_message: String,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    notes: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/* =====================
   INDEXES
====================== */
PaymentTransactionSchema.index({ created_at: -1 });
PaymentTransactionSchema.index({ user: 1, created_at: -1 });
PaymentTransactionSchema.index({ status: 1, created_at: 1 });
PaymentTransactionSchema.index({ reconciliation_status: 1, created_at: 1 });
PaymentTransactionSchema.index({ gateway_order_id: 1, gateway_name: 1 });

/* =====================
   VIRTUALS
====================== */

// Net amount after refunds
PaymentTransactionSchema.virtual('net_amount').get(function () {
    return this.amount - this.total_refunded;
});

// Is fully refundable
PaymentTransactionSchema.virtual('is_refundable').get(function () {
    return this.status === 'SUCCESS' && this.total_refunded < this.amount;
});

// Max refundable amount
PaymentTransactionSchema.virtual('max_refundable').get(function () {
    return this.amount - this.total_refunded;
});

/* =====================
   INSTANCE METHODS
====================== */

/**
 * Add a refund record
 * @param {Object} refundData - Refund details
 */
PaymentTransactionSchema.methods.addRefund = function (refundData) {
    this.refunds.push({
        ...refundData,
        initiated_at: new Date()
    });
    this.total_refunded += refundData.amount;

    // Update status
    if (this.total_refunded >= this.amount) {
        this.status = 'REFUNDED';
    } else if (this.total_refunded > 0) {
        this.status = 'PARTIALLY_REFUNDED';
    }

    return this.save();
};

/**
 * Mark payment as successful
 * @param {Object} paymentDetails - Details from gateway
 */
PaymentTransactionSchema.methods.markSuccess = function (paymentDetails) {
    this.status = 'SUCCESS';
    this.gateway_payment_id = paymentDetails.payment_id;
    this.gateway_transaction_id = paymentDetails.transaction_id || paymentDetails.payment_id;
    this.payment_method = paymentDetails.method;
    this.payment_method_details = paymentDetails.method_details;
    this.captured_at = new Date();
    this.gateway_response = paymentDetails.raw_response;
    this.reconciliation_status = 'MATCHED';
    this.reconciled_at = new Date();

    return this.save();
};

/**
 * Mark payment as failed
 * @param {Object} errorDetails - Error information
 */
PaymentTransactionSchema.methods.markFailed = function (errorDetails) {
    this.status = 'FAILED';
    this.error_code = errorDetails.code;
    this.error_message = errorDetails.message;
    this.gateway_response = errorDetails.raw_response;
    this.reconciliation_status = 'MATCHED';

    return this.save();
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Find pending transactions for reconciliation
 * @param {number} minutesOld - Minimum age in minutes
 * @returns {Promise<Array>} Pending transactions
 */
PaymentTransactionSchema.statics.findPendingForReconciliation = function (minutesOld = 10) {
    const cutoff = new Date(Date.now() - minutesOld * 60 * 1000);

    return this.find({
        status: { $in: ['CREATED', 'PENDING', 'ATTEMPTED'] },
        created_at: { $lt: cutoff },
        reconciliation_status: 'PENDING'
    }).populate('payment_gateway');
};

/**
 * Get transaction by gateway order ID
 * @param {string} gatewayOrderId - Gateway's order identifier
 * @param {string} gatewayName - Gateway name
 */
PaymentTransactionSchema.statics.findByGatewayOrder = function (gatewayOrderId, gatewayName) {
    return this.findOne({
        gateway_order_id: gatewayOrderId,
        gateway_name: gatewayName
    });
};

/**
 * Get transaction by gateway payment ID
 * @param {string} gatewayPaymentId - Gateway's payment identifier
 */
PaymentTransactionSchema.statics.findByGatewayPayment = function (gatewayPaymentId) {
    return this.findOne({ gateway_payment_id: gatewayPaymentId });
};

// Include virtuals in JSON
PaymentTransactionSchema.set('toJSON', { virtuals: true });
PaymentTransactionSchema.set('toObject', { virtuals: true });

const PaymentTransaction = mongoose.model('PaymentTransaction', PaymentTransactionSchema);

export default PaymentTransaction;
