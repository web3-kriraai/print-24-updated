import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema(
  {
    /* =====================
       CORE REFERENCES
    ====================== */
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
      unique: true // 🔒 ONE complaint per order (STRICT)
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    registeredByRole: {
      type: String,
      enum: ["CUSTOMER", "ADMIN", "EMP"],
      required: true
    },

    /* =====================
       COMPLAINT DETAILS
    ====================== */
    type: {
      type: String,
      enum: ["PRICE", "QUALITY", "DELIVERY"],
      required: true
    },

    description: {
      type: String,
      required: true
    },

    /* =====================
       🔒 IMMUTABLE PRICE SNAPSHOT
       (Only for PRICE complaints)
    ====================== */
    priceSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },

    /* =====================
       ELIGIBILITY CONTROL
    ====================== */
    allowedUntil: {
      type: Date,
      required: true,
      index: true
    },

    /* =====================
       RESOLUTION WORKFLOW
    ====================== */
    resolutionStatus: {
      type: String,
      enum: ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true
    },

    resolutionNotes: {
      type: String,
      default: ""
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    resolvedAt: Date,

    /* =====================
       REOPEN & ESCALATION
    ====================== */
    reopenCount: {
      type: Number,
      default: 0
    },

    lastReopenedAt: Date,

    escalationLevel: {
      type: Number,
      default: 0
<<<<<<< HEAD
    },

    /* =====================
       NEW FIELDS
    ====================== */
    timeLimit: {
      type: Number,
      // 7 for customers, 15 for agents
    },

    complaintSource: {
      type: String,
      enum: ["WEBSITE", "CHAT", "CALL", "WHATSAPP", "EMAIL"],
    },

    existingComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      // For single complaint rule
    },

    reopenedCount: {
      type: Number,
      default: 0,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    resolutionType: {
      type: String,
      enum: ["REPRINT", "PRIORITY_PROCESSING", "REFUND", "OTHER"],
    },

    reprintOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      // If reprint approved
    },

    notificationLogs: [
      {
        sentAt: { type: Date, default: Date.now },
        type: { type: String, enum: ["EMAIL", "WHATSAPP", "SMS"] },
        recipient: String,
        status: { type: String, enum: ["SENT", "DELIVERED", "FAILED"] },
        messageId: String,
      },
    ],
=======
    }
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
  },
  { timestamps: true }
);

/* =====================
   IMMUTABLE PRICE SNAPSHOT
====================== */
ComplaintSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("priceSnapshot")) {
    return next(new Error("Price snapshot is immutable once saved"));
  }
  next();
});

/* =====================
   ORDER STATE VALIDATION
====================== */
ComplaintSchema.pre("validate", async function (next) {
  const Order = mongoose.model("Order");
  const order = await Order.findById(this.order);

  if (!order) {
    return next(new Error("Order not found"));
  }

  if (order.status !== "DELIVERED") {
    return next(new Error("Complaint allowed only after order delivery"));
  }

  next();
});

/* =====================
   INDEXES
====================== */
ComplaintSchema.index({ order: 1 });
ComplaintSchema.index({ resolutionStatus: 1 });
ComplaintSchema.index({ raisedBy: 1, createdAt: -1 });

export default mongoose.model("Complaint", ComplaintSchema);
