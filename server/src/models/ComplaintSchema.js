import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema({
    /* =====================
       CORE REFERENCES
    ====================== */
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true,
    },

    orderNumber: {
        type: String,
        unique: true, // 🔒 Enforces single complaint per order at DB level
        required: true,
        index: true,
    },

    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    raisedByEmail: String,
    raisedByMobile: String,

    /* =====================
       REGISTRATION SOURCE TRACKING
       Per Spec: Track who registered and through which channel
    ====================== */
    registerSource: {
        type: String,
        enum: ["CUSTOMER", "AGENT", "DISTRIBUTOR", "PRINTS24_STAFF"],
        required: true,
    },

    registeredByRole: {
        type: String,
        enum: ["CUSTOMER", "ADMIN", "EMP"],
        required: true,
    },

    staffLevel: {
        type: String,
        enum: ["SUPPORT_OFFICER", "SENIOR_SUPPORT", "TEAM_LEADER", "MANAGER", "ADMIN"],
        // Only set if registerSource is PRINTS24_STAFF
    },

    complaintSource: {
        type: String,
        enum: ["WEBSITE", "CHAT", "CALL", "WHATSAPP", "EMAIL", "PORTAL"],
        required: true,
    },

    /* =====================
       COMPLAINT DETAILS
    ====================== */
    type: {
        type: String,
        enum: [
            "PRINTING_QUALITY",
            "WRONG_CONTENT",
            "QUANTITY_ISSUE",
            "ORDER_DELAY",
            "WRONG_PRODUCT",
            "OTHER"
        ],
        required: true,
    },

    description: {
        type: String,
        required: true,
    },

    images: [{
        url: String,
        thumbnailUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    }],

    policyConfirmed: {
        type: Boolean,
        default: false,
        required: true,
        // Spec: "I understand that if the mistake is from my file or confirmed design, reprint will not be provided."
    },

    /* =====================
       PROOF OF MISTAKE
       Per Spec: For staff complaints, must verify order details and proof of mistake
    ====================== */
    proofOfMistake: {
        description: String,
        images: [String],
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        verifiedAt: Date,
    },

    /* =====================
       TIME LIMIT CONTROL
       Per Spec: 7 days (Customer), 15 days (Agent/Distributor), Staff levels vary
    ====================== */
    timeLimitApplied: {
        type: Number, // Days: 7, 15, 20, 25, 30, or null for Admin
    },

    deliveryDate: {
        type: Date,
        // NOT required - order might not be delivered yet (delay complaints)
    },

    complaintRegisteredAt: {
        type: Date,
        default: Date.now,
        index: true,
    },

    /* =====================
       STATUS WORKFLOW
       Per Spec: NEW → UNDER_REVIEW → ... → RESOLVED/CLOSED/REJECTED
    ====================== */
    status: {
        type: String,
        enum: [
            "NEW",
            "UNDER_REVIEW",
            "WAITING_FOR_CUSTOMER",
            "APPROVED_FOR_REPRINT",
            "RESOLVED",
            "CLOSED",
            "REJECTED",
            "REOPENED"
        ],
        default: "NEW",
        index: true,
    },

    previousStatus: String,
    reopenedFromStatus: String, // Track what status it was reopened from

    /* =====================
       REOPEN TRACKING
       Per Spec: Staff can reopen closed complaints
    ====================== */
    reopenSource: {
        type: String,
        enum: ["CUSTOMER", "AGENT", "DISTRIBUTOR", "PRINTS24_STAFF", null],
        default: null,
    },

    reopenedCount: {
        type: Number,
        default: 0,
    },

    lastReopenedAt: Date,

    lastReopenedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    /* =====================
       EXISTING COMPLAINT VIEW TRACKING
       Per Spec: Track when user views existing complaint
    ====================== */
    lastViewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    lastViewedAt: Date,

    /* =====================
       EMAIL SYNC
       Per Spec: Every status update sends email with complaint link
    ====================== */
    emailSyncEnabled: {
        type: Boolean,
        default: true,
    },

    /* =====================
       RESPONSE TIMING
       Per Spec: First response within 1 hour
    ====================== */
    firstResponseTime: Date,

    firstResponseBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    resolutionTime: Date,

    resolutionType: {
        type: String,
        enum: ["REPRINT", "PRIORITY_PROCESSING", "NO_ACTION", "OTHER"],
        // Per Spec: Only REPRINT allowed, no refund
    },

    /* =====================
       RESOLUTION DETAILS
    ====================== */
    resolutionNotes: String,

    internalNotes: String, // Staff-only notes

    mistakeType: {
        type: String,
        enum: ["CUSTOMER_MISTAKE", "COMPANY_MISTAKE", "UNDETERMINED"],
        // Per Spec: Customer file mistake = no reprint, Company mistake = reprint allowed
    },

    reprintOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        // Link to reprint order if approved
    },

    priorityProcessing: {
        isPrioritized: Boolean,
        prioritizedAt: Date,
        prioritizedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        // Per Spec: For delay complaints - fast processing, no reprint
    },

    /* =====================
       ASSIGNMENT & ESCALATION
    ====================== */
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },

    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
    },

    escalationLevel: {
        type: Number,
        default: 0,
    },

    /* =====================
       CONVERSATION THREAD
       Per Spec: Chat-like interface with message history
    ====================== */
    conversations: [{
        _id: false,
        message: String,
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sentByRole: {
            type: String,
            enum: ["CUSTOMER", "AGENT", "DISTRIBUTOR", "PRINTS24_STAFF"],
            required: true,
        },
        attachments: [String],
        timestamp: {
            type: Date,
            default: Date.now,
        },
        isInternal: {
            type: Boolean,
            default: false, // Internal notes not visible to customer
        },
    }],

    /* =====================
       AUDIT & HISTORY
       Per Spec: Full status change tracking
    ====================== */
    statusHistory: [{
        status: String,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        changedByRole: String,
        timestamp: {
            type: Date,
            default: Date.now,
        },
        notes: String,
    }],

    /* =====================
       NOTIFICATION LOGS
       Per Spec: Email sync on every status update
    ====================== */
    notificationLogs: [{
        sentAt: {
            type: Date,
            default: Date.now,
        },
        type: {
            type: String,
            enum: ["EMAIL", "WHATSAPP", "SMS"],
        },
        recipient: String,
        subject: String,
        body: String,
        status: {
            type: String,
            enum: ["SENT", "DELIVERED", "FAILED", "OPENED"],
        },
        messageId: String,
        errorMessage: String,
    }],

    /* =====================
       PERFORMANCE METRICS
       Per Spec: Track SLA compliance (1 hour first response)
    ====================== */
    slaBreached: {
        type: Boolean,
        default: false,
    },

    customerSatisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        feedback: String,
        submittedAt: Date,
    },
}, {
    timestamps: true,
});

/* =====================
   INDEXES FOR PERFORMANCE
====================== */
ComplaintSchema.index({ orderNumber: 1 }); // Unique already, but ensure indexed
ComplaintSchema.index({ status: 1, createdAt: -1 }); // Common filter
ComplaintSchema.index({ raisedBy: 1, createdAt: -1 }); // User's complaints
ComplaintSchema.index({ assignedTo: 1, status: 1 }); // Staff dashboard
ComplaintSchema.index({ deliveryDate: 1, createdAt: 1 }); // Time limit checks
ComplaintSchema.index({ registerSource: 1 }); // Analytics by source
ComplaintSchema.index({ reopenSource: 1 }); // Track reopen sources

/* =====================
   PRE-SAVE HOOK: Calculate time limit
====================== */
ComplaintSchema.pre('save', function (next) {
    // Auto-calculate allowedComplaintRegistrationDays if not set
    if (this.isNew && !this.timeLimitApplied) {
        if (this.staffLevel) {
            // Will be calculated in controller using staffTimeLimits utility
        } else if (this.registerSource === 'AGENT' || this.registerSource === 'DISTRIBUTOR') {
            this.timeLimitApplied = 15;
        } else {
            this.timeLimitApplied = 7; // Customer default
        }
    }
    next();
});

export default mongoose.model("Complaint", ComplaintSchema);
