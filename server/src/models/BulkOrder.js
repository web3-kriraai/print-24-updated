import mongoose from "mongoose";

/**
 * BulkOrder Schema
 * 
 * Tracks bulk order processing where a single composite PDF is split
 * into multiple individual orders (e.g., 30-in-1 business cards).
 */
const BulkOrderSchema = new mongoose.Schema(
    {
        /* =====================
           BASIC INFO
        ====================== */
        orderNumber: {
            type: String,
            unique: true,
            index: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        userSegment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserSegment",
            index: true,
        },

        /* =====================
           CONFIGURATION
        ====================== */
        totalCopies: {
            type: Number,
            required: true,
            min: 1,
            max: 100000,
        },

        distinctDesigns: {
            type: Number,
            required: true,
            min: 1,
            max: 100,
        },

        pagesPerDesign: {
            type: Number,
            required: true,
            enum: [1, 2, 4], // Single-sided, double-sided, or multi-page
        },

        /* =====================
           FILE MANAGEMENT
        ====================== */
        compositeFile: {
            url: {
                type: String,
                required: true,
            },
            publicId: String, // Cloudinary public ID for deletion
            filename: String,
            size: Number, // File size in bytes
            pageCount: Number, // Total pages in PDF
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        },

        // Generated design files after splitting
        splitAssets: [
            {
                designIndex: {
                    type: Number,
                    required: true,
                },
                url: String,
                publicId: String,
                thumbnail: String,
                pageRange: {
                    start: Number,
                    end: Number,
                },
                copiesAssigned: Number,
            },
        ],

        /* =====================
           PRODUCT INFO
        ====================== */
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        productType: {
            type: String,
            required: true,
            // e.g., "VISITING_CARD", "FLYER", "BROCHURE"
        },

        /* =====================
           ORDER HIERARCHY
        ====================== */
        parentOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            // Main tracking order created after processing
        },

        childOrderIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
                // Individual orders (one per design)
            },
        ],

        /* =====================
           DESIGNER SERVICE
        ====================== */
        hireDesigner: {
            type: Boolean,
            default: false,
        },

        designFee: {
            basePerDesign: {
                type: Number,
                default: 500, // ₹500 per design
            },
            totalFee: Number, // basePerDesign × distinctDesigns
        },

        /* =====================
           STATUS TRACKING
        ====================== */
        status: {
            type: String,
            enum: [
                "UPLOADED",
                "VALIDATING",
                "PROCESSING",
                "SPLIT_COMPLETE",
                "ORDER_CREATED",
                "FAILED",
                "CANCELLED",
            ],
            default: "UPLOADED",
            index: true,
        },

        progress: {
            percentage: {
                type: Number,
                min: 0,
                max: 100,
                default: 0,
            },
            currentStep: String,
            message: String,
        },

        /* =====================
           ERROR HANDLING
        ====================== */
        validationErrors: [
            {
                field: String,
                message: String,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        failureReason: String,

        /* =====================
           PROCESSING LOGS
        ====================== */
        processingLogs: [
            {
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                stage: String,
                status: String,
                message: String,
                metadata: mongoose.Schema.Types.Mixed,
            },
        ],

        /* =====================
           RETRY LOGIC
        ====================== */
        retryCount: {
            type: Number,
            default: 0,
            max: 3,
        },

        lastRetryAt: Date,

        /* =====================
           TIMESTAMPS
        ====================== */
        processedAt: Date,
        completedAt: Date,
    },
    { timestamps: true }
);

/* =====================
   INDEXES
====================== */
BulkOrderSchema.index({ user: 1, createdAt: -1 });
BulkOrderSchema.index({ status: 1 });
BulkOrderSchema.index({ orderNumber: 1 });
BulkOrderSchema.index({ parentOrderId: 1 });

/* =====================
   INDEX CLEANUP
   Drop obsolete indexes from old schema versions
====================== */
BulkOrderSchema.post('init', async function () {
    try {
        const collection = this.db.collection('bulkorders');
        const indexes = await collection.indexes();

        // Check for obsolete poNumber index
        const hasPoNumberIndex = indexes.some(index => index.name === 'poNumber_1');
        if (hasPoNumberIndex) {
            console.log('🗑️  Dropping obsolete poNumber_1 index...');
            await collection.dropIndex('poNumber_1');
            console.log('✅ Dropped poNumber_1 index successfully');
        }
    } catch (err) {
        // Ignore errors - index might not exist
        if (err.code !== 27) { // 27 = IndexNotFound
            console.warn('Warning: Could not clean up obsolete indexes:', err.message);
        }
    }
});

/* =====================
   PRE-SAVE HOOKS
====================== */
BulkOrderSchema.pre("save", function (next) {
    // Generate order number if not exists
    if (!this.orderNumber) {
        const ts = Date.now();
        const rand = Math.floor(Math.random() * 10000);
        this.orderNumber = `BULK-${ts}-${rand.toString().padStart(4, "0")}`;
    }

    // Calculate total design fee
    if (this.hireDesigner && this.designFee) {
        this.designFee.totalFee =
            this.designFee.basePerDesign * this.distinctDesigns;
    }

    next();
});

/* =====================
   INSTANCE METHODS
====================== */

/**
 * Add processing log entry
 */
BulkOrderSchema.methods.addLog = function (stage, status, message, metadata = {}) {
    this.processingLogs.push({
        timestamp: new Date(),
        stage,
        status,
        message,
        metadata,
    });
    return this;
};

/**
 * Update progress
 */
BulkOrderSchema.methods.updateProgress = function (percentage, currentStep, message) {
    this.progress = {
        percentage,
        currentStep,
        message,
    };
    return this;
};

/**
 * Mark as failed
 */
BulkOrderSchema.methods.markFailed = function (reason) {
    this.status = "FAILED";
    this.failureReason = reason;
    this.addLog("FAILURE", "ERROR", reason);
    return this.save();
};

/**
 * Mark as completed
 */
BulkOrderSchema.methods.markCompleted = function () {
    this.status = "ORDER_CREATED";
    this.completedAt = new Date();
    this.updateProgress(100, "COMPLETED", "All orders created successfully");
    this.addLog("COMPLETION", "SUCCESS", "Bulk order processing completed");
    return this.save();
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Get bulk orders by user
 */
BulkOrderSchema.statics.getByUser = async function (userId, options = {}) {
    const { limit = 20, skip = 0, status } = options;

    const query = { user: userId };
    if (status) query.status = status;

    return await this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate("product", "name category")
        .populate("parentOrderId", "orderNumber status")
        .lean();
};

/**
 * Get statistics for admin dashboard
 */
BulkOrderSchema.statics.getStats = async function (filters = {}) {
    const stats = await this.aggregate([
        { $match: filters },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalDesigns: { $sum: "$distinctDesigns" },
                totalCopies: { $sum: "$totalCopies" },
            },
        },
    ]);

    const result = {
        total: 0,
        uploaded: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalDesigns: 0,
        totalCopies: 0,
    };

    stats.forEach((stat) => {
        const statusKey = stat._id.toLowerCase();
        result[statusKey] = stat.count;
        result.total += stat.count;
        result.totalDesigns += stat.totalDesigns;
        result.totalCopies += stat.totalCopies;
    });

    return result;
};

export default mongoose.model("BulkOrder", BulkOrderSchema);
