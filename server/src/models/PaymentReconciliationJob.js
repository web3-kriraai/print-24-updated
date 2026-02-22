/**
 * Payment Reconciliation Job Model
 * Tracks reconciliation job execution history
 * @module models/PaymentReconciliationJob
 */

import mongoose from 'mongoose';

const PaymentReconciliationJobSchema = new mongoose.Schema({
    // Job identification
    job_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Job type
    type: {
        type: String,
        enum: ['SCHEDULED', 'MANUAL', 'RETRY'],
        default: 'SCHEDULED'
    },

    // Execution status
    status: {
        type: String,
        enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        default: 'QUEUED',
        index: true
    },

    // Scope
    date_range: {
        start: Date,
        end: Date
    },
    gateways: [{
        type: String,
        enum: ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYU', 'CASHFREE']
    }],

    // Progress & Stats
    stats: {
        total_transactions: { type: Number, default: 0 },
        processed: { type: Number, default: 0 },
        matched: { type: Number, default: 0 },
        mismatched: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        auto_resolved: { type: Number, default: 0 },
        errors: { type: Number, default: 0 }
    },

    // Amount summary (for financial reconciliation)
    amount_summary: {
        total_expected: { type: Number, default: 0 },
        total_received: { type: Number, default: 0 },
        total_refunded: { type: Number, default: 0 },
        discrepancy: { type: Number, default: 0 }
    },

    // Timing
    started_at: Date,
    completed_at: Date,
    duration_seconds: Number,

    // Initiated by
    initiated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Mismatched transactions for review
    mismatches: [{
        transaction_id: mongoose.Schema.Types.ObjectId,
        issue: String,
        our_status: String,
        gateway_status: String,
        our_amount: Number,
        gateway_amount: Number,
        resolved: { type: Boolean, default: false },
        resolution_notes: String,
        resolved_at: Date,
        resolved_by: mongoose.Schema.Types.ObjectId
    }],

    // Error log
    errors: [{
        transaction_id: mongoose.Schema.Types.ObjectId,
        gateway: String,
        error: String,
        timestamp: Date
    }],

    // Notes
    notes: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/* =====================
   INDEXES
====================== */
PaymentReconciliationJobSchema.index({ created_at: -1 });
PaymentReconciliationJobSchema.index({ status: 1, created_at: -1 });

/* =====================
   VIRTUAL PROPERTIES
====================== */

PaymentReconciliationJobSchema.virtual('success_rate').get(function () {
    if (!this.stats.processed) return 0;
    return Math.round((this.stats.matched / this.stats.processed) * 100);
});

PaymentReconciliationJobSchema.virtual('has_discrepancy').get(function () {
    return this.amount_summary.discrepancy !== 0;
});

/* =====================
   INSTANCE METHODS
====================== */

/**
 * Start the job
 */
PaymentReconciliationJobSchema.methods.start = function () {
    this.status = 'RUNNING';
    this.started_at = new Date();
    return this.save();
};

/**
 * Update progress
 * @param {Object} progressStats - Current stats
 */
PaymentReconciliationJobSchema.methods.updateProgress = function (progressStats) {
    Object.assign(this.stats, progressStats);
    return this.save();
};

/**
 * Add a mismatch
 * @param {Object} mismatchData - Mismatch details
 */
PaymentReconciliationJobSchema.methods.addMismatch = function (mismatchData) {
    this.mismatches.push(mismatchData);
    this.stats.mismatched += 1;
    return this.save();
};

/**
 * Add an error
 * @param {Object} errorData - Error details
 */
PaymentReconciliationJobSchema.methods.addError = function (errorData) {
    this.errors.push({
        ...errorData,
        timestamp: new Date()
    });
    this.stats.errors += 1;
    return this.save();
};

/**
 * Complete the job
 * @param {Object} finalStats - Final statistics
 */
PaymentReconciliationJobSchema.methods.complete = function (finalStats = {}) {
    this.status = 'COMPLETED';
    this.completed_at = new Date();
    this.duration_seconds = Math.round((this.completed_at - this.started_at) / 1000);

    if (finalStats) {
        Object.assign(this.stats, finalStats);
        if (finalStats.amount_summary) {
            Object.assign(this.amount_summary, finalStats.amount_summary);
        }
    }

    // Calculate discrepancy
    this.amount_summary.discrepancy =
        this.amount_summary.total_expected -
        this.amount_summary.total_received -
        this.amount_summary.total_refunded;

    return this.save();
};

/**
 * Fail the job
 * @param {string} reason - Failure reason
 */
PaymentReconciliationJobSchema.methods.fail = function (reason) {
    this.status = 'FAILED';
    this.completed_at = new Date();
    this.duration_seconds = Math.round((this.completed_at - this.started_at) / 1000);
    this.notes = reason;
    return this.save();
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Get latest job
 * @returns {Promise<Document|null>} Latest reconciliation job
 */
PaymentReconciliationJobSchema.statics.getLatest = function () {
    return this.findOne().sort({ created_at: -1 });
};

/**
 * Check if a job is currently running
 * @returns {Promise<boolean>} True if running
 */
PaymentReconciliationJobSchema.statics.isRunning = async function () {
    const running = await this.findOne({ status: 'RUNNING' });
    return !!running;
};

/**
 * Get jobs needing attention (with unresolved mismatches)
 * @returns {Promise<Array>} Jobs with issues
 */
PaymentReconciliationJobSchema.statics.getNeedingAttention = function () {
    return this.find({
        status: 'COMPLETED',
        'mismatches.resolved': false
    }).sort({ created_at: -1 }).limit(10);
};

/**
 * Generate unique job ID
 * @param {string} type - Job type
 * @returns {string} Unique job ID
 */
PaymentReconciliationJobSchema.statics.generateJobId = function (type = 'SCHEDULED') {
    const prefix = type === 'MANUAL' ? 'MANUAL' : 'RECON';
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

// Include virtuals
PaymentReconciliationJobSchema.set('toJSON', { virtuals: true });
PaymentReconciliationJobSchema.set('toObject', { virtuals: true });

const PaymentReconciliationJob = mongoose.model('PaymentReconciliationJob', PaymentReconciliationJobSchema);

export default PaymentReconciliationJob;
