import mongoose from "mongoose";

/**
 * PaymentGateway Schema
 * 
 * For multi-gateway payment support - stores configuration
 * for different payment providers (Razorpay, Stripe, PhonePe).
 * 
 * ⚠️ SECURITY: publicKey, secretKey, webhookSecret should be
 * encrypted before storing. Use a proper encryption library.
 */

const PaymentGatewaySchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    name: {
      type: String,
      enum: ["RAZORPAY", "STRIPE", "PHONEPE", "PAYTM", "CASHFREE"],
      required: true,
      unique: true,
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
    },

    /* =====================
       STATUS
    ====================== */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    mode: {
      type: String,
      enum: ["SANDBOX", "PRODUCTION"],
      default: "SANDBOX",
    },

    /* =====================
       CREDENTIALS (ENCRYPTED)
    ====================== */
    publicKey: {
      type: String,
      required: true,
      // ⚠️ Should be encrypted
    },

    secretKey: {
      type: String,
      required: true,
      select: false, // Hide by default
      // ⚠️ Should be encrypted
    },

    webhookSecret: {
      type: String,
      select: false, // Hide by default
      // ⚠️ Should be encrypted
    },

    /* =====================
       TRAFFIC DISTRIBUTION
    ====================== */
    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    trafficSplit: {
      type: Number,
      min: 0,
      max: 100,
      default: 100, // Percentage
    },

    /* =====================
       SUPPORTED FEATURES
    ====================== */
    supportedCurrencies: {
      type: [String],
      default: ["INR"],
    },

    supportedMethods: {
      type: [String],
      default: ["UPI", "CARD", "NETBANKING", "WALLET"],
    },

    /* =====================
       PROVIDER CONFIG
    ====================== */
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Provider-specific configuration
    },

    /* =====================
       ENDPOINTS
    ====================== */
    webhookUrl: String,
    callbackUrl: String,

    /* =====================
       METADATA
    ====================== */
    lastTestedAt: Date,
    testResult: {
      success: Boolean,
      message: String,
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
PaymentGatewaySchema.index({ isActive: 1, priority: -1 });

/* =====================
   STATIC METHODS
====================== */

/**
 * Get active payment gateway based on priority and traffic split
 */
PaymentGatewaySchema.statics.getActiveGateway = async function () {
  const gateways = await this.find({ isActive: true }).sort({ priority: -1 });

  if (gateways.length === 0) return null;
  if (gateways.length === 1) return gateways[0];

  // Simple traffic split selection
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const gateway of gateways) {
    cumulative += gateway.trafficSplit;
    if (random <= cumulative) {
      return gateway;
    }
  }

  return gateways[0];
};

export default mongoose.model("PaymentGateway", PaymentGatewaySchema);
