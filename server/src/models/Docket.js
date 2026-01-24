import mongoose from "mongoose";

/**
 * Docket Schema
 * 
 * For internal logistics - tracks shipments between hubs
 * and delivery to customers.
 */

const DocketSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    docketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* =====================
       ORDER REFERENCES
    ====================== */
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },
    ],

    /* =====================
       HUB ROUTING
    ====================== */
    originHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternalHub",
      required: true,
      index: true,
    },

    destinationHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternalHub",
      required: true,
      index: true,
    },

    /* =====================
       STATUS TRACKING
    ====================== */
    currentStatus: {
      type: String,
      enum: [
        "CREATED",
        "DISPATCHED",
        "RECEIVED_AT_HUB",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ],
      default: "CREATED",
      index: true,
    },

    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        location: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    /* =====================
       DELIVERY
    ====================== */
    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    estimatedDelivery: Date,
    actualDelivery: Date,

    /* =====================
       OTP VERIFICATION
    ====================== */
    otpCode: String,
    otpVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =====================
   AUTO-GENERATE DOCKET NUMBER
====================== */
DocketSchema.pre("save", function (next) {
  if (!this.docketNumber) {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 10000);
    this.docketNumber = `DCK-${ts}-${rand.toString().padStart(4, "0")}`;
  }
  next();
});

/* =====================
   INDEXES
====================== */
DocketSchema.index({ currentStatus: 1, estimatedDelivery: 1 });
DocketSchema.index({ deliveryAgent: 1, currentStatus: 1 });
DocketSchema.index({ orders: 1 });

export default mongoose.model("Docket", DocketSchema);
