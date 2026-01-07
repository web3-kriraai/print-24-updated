import mongoose from "mongoose";

/**
 * DesignerSession Schema
 * 
 * For "Hire a Designer" service - tracks sessions between
 * customers and designers for custom design work.
 */

const DesignerSessionSchema = new mongoose.Schema(
  {
    /* =====================
       CORE REFERENCES
    ====================== */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    designerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* =====================
       SESSION CONFIG
    ====================== */
    sessionType: {
      type: String,
      enum: ["VISUAL", "PHYSICAL"],
      required: true,
    },

    status: {
      type: String,
      enum: ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      index: true,
    },

    startTime: Date,
    endTime: Date,

    duration: {
      type: Number, // in minutes
      min: 0,
    },

    /* =====================
       PAYMENT
    ====================== */
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    amount: {
      type: Number,
      min: 0,
    },

    /* =====================
       SESSION HISTORY
    ====================== */
    historyLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        message: String,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    /* =====================
       ARTIFACTS
    ====================== */
    artifacts: [
      {
        type: {
          type: String,
          enum: ["CHAT_LOG", "REFERENCE_IMAGE", "NOTE", "RECORDING"],
        },
        content: String, // URL or text
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    /* =====================
       DESIGN REQUIREMENTS
    ====================== */
    designRequirements: {
      cardFor: String,
      designStyle: String,
      colorPreference: String,
      language: String,
      logoAvailable: { type: Boolean, default: false },
      logoUrl: String,
      photoAvailable: { type: Boolean, default: false },
      photoUrl: String,
      specialInstructions: String,
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
DesignerSessionSchema.index({ customerId: 1, createdAt: -1 });
DesignerSessionSchema.index({ designerId: 1, status: 1 });
DesignerSessionSchema.index({ status: 1, startTime: 1 });

export default mongoose.model("DesignerSession", DesignerSessionSchema);
