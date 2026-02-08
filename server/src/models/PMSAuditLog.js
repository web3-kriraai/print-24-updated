import mongoose from "mongoose";

/**
 * PMSAuditLog Schema
 * 
 * Comprehensive audit trail for all Privilege Management System changes.
 * Tracks who made what changes, when, and provides before/after state.
 */

const PMSAuditLogSchema = new mongoose.Schema(
    {
        /* =====================
           ACTION INFO
        ====================== */
        action: {
            type: String,
            enum: ["created", "updated", "deleted", "assigned", "unassigned", "toggled"],
            required: true,
            index: true,
        },

        /* =====================
           RESOURCE INFO
        ====================== */
        resourceType: {
            type: String,
            enum: [
                "userType",
                "privilegeBundle",
                "viewStyle",
                "viewAssignment",
                "featureFlag",
                "resourceRegistry",
            ],
            required: true,
            index: true,
        },

        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
            // Reference to the modified resource
        },

        resourceName: {
            type: String,
            trim: true,
            // Human-readable name of the resource (for quick reference)
        },

        /* =====================
           CHANGES
        ====================== */
        changes: {
            before: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
                // State before the change (null for creation)
            },
            after: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
                // State after the change (null for deletion)
            },
            diff: {
                type: mongoose.Schema.Types.Mixed,
                default: {},
                // Specific fields that changed
            },
        },

        /* =====================
           ACTOR INFO
        ====================== */
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        changedByName: {
            type: String,
            trim: true,
            // Snapshot of user name at time of change
        },

        changedByEmail: {
            type: String,
            trim: true,
            // Snapshot of user email at time of change
        },

        /* =====================
           SESSION INFO
        ====================== */
        ipAddress: {
            type: String,
            trim: true,
            // IP address of the admin who made the change
        },

        userAgent: {
            type: String,
            trim: true,
            // Browser/client info
        },

        /* =====================
           METADATA
        ====================== */
        reason: {
            type: String,
            trim: true,
            // Optional reason for the change
        },

        impactedUsers: {
            type: Number,
            default: 0,
            // Number of users affected by this change
        },

        tags: [
            {
                type: String,
                trim: true,
            },
            // Custom tags for categorization and search
        ],

        /* =====================
           TIMESTAMP
        ====================== */
        timestamp: {
            type: Date,
            default: Date.now,
            required: true,
            index: true,
        },
    },
    { timestamps: false } // Using custom timestamp field
);

/* =====================
   INDEXES
====================== */
PMSAuditLogSchema.index({ timestamp: -1 }); // Latest first
PMSAuditLogSchema.index({ changedBy: 1, timestamp: -1 });
PMSAuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
PMSAuditLogSchema.index({ action: 1, resourceType: 1, timestamp: -1 });

/* =====================
   STATICS
====================== */

/**
 * Create audit log entry
 */
PMSAuditLogSchema.statics.createLog = async function ({
    action,
    resourceType,
    resourceId,
    resourceName,
    before = null,
    after = null,
    changedBy,
    changedByName,
    changedByEmail,
    ipAddress,
    userAgent,
    reason = null,
    impactedUsers = 0,
    tags = [],
}) {
    // Calculate diff
    const diff = {};
    if (before && after && typeof before === "object" && typeof after === "object") {
        for (const key in after) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                diff[key] = {
                    from: before[key],
                    to: after[key],
                };
            }
        }
    }

    const log = new this({
        action,
        resourceType,
        resourceId,
        resourceName,
        changes: { before, after, diff },
        changedBy,
        changedByName,
        changedByEmail,
        ipAddress,
        userAgent,
        reason,
        impactedUsers,
        tags,
        timestamp: new Date(),
    });

    await log.save();
    return log;
};

/**
 * Get logs with filters and pagination
 */
PMSAuditLogSchema.statics.getLogs = async function ({
    resourceType = null,
    action = null,
    changedBy = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50,
}) {
    const query = {};

    if (resourceType) query.resourceType = resourceType;
    if (action) query.action = action;
    if (changedBy) query.changedBy = changedBy;
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const total = await this.countDocuments(query);
    const logs = await this.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("changedBy", "name email");

    return {
        logs,
        total,
        page,
        pages: Math.ceil(total / limit),
    };
};

/**
 * Get logs for a specific resource
 */
PMSAuditLogSchema.statics.getLogsForResource = async function (resourceType, resourceId) {
    return await this.find({ resourceType, resourceId })
        .sort({ timestamp: -1 })
        .populate("changedBy", "name email");
};

/**
 * Get recent activity
 */
PMSAuditLogSchema.statics.getRecentActivity = async function (limit = 10) {
    return await this.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate("changedBy", "name email");
};

export default mongoose.model("PMSAuditLog", PMSAuditLogSchema);
