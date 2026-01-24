import mongoose from "mongoose";

/**
 * LogisticsProvider Schema
 * 
 * For external/internal logistics management - stores configuration
 * for different shipping providers (Delhivery, Shiprocket, Internal).
 * 
 * ⚠️ SECURITY: apiCredentials should be encrypted before storing.
 */

const LogisticsProviderSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    name: {
      type: String,
      enum: ["DELHIVERY", "SHIPROCKET", "INTERNAL", "BLUEDART", "DTDC", "ECOM_EXPRESS"],
      required: true,
      unique: true,
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      enum: ["INTERNAL", "EXTERNAL"],
      required: true,
      index: true,
    },

    /* =====================
       STATUS
    ====================== */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* =====================
       API CREDENTIALS (ENCRYPTED)
    ====================== */
    apiCredentials: {
      type: mongoose.Schema.Types.Mixed,
      select: false, // Hide by default
      // ⚠️ Should be encrypted
      // e.g., { apiKey: "...", apiSecret: "...", token: "..." }
    },

    baseUrl: String,

    /* =====================
       SERVICE AREA
    ====================== */
    serviceablePincodes: [
      {
        type: String,
        trim: true,
      },
    ],

    // Alternative: pincode ranges
    serviceableRanges: [
      {
        start: String,
        end: String,
      },
    ],

    // Excluded pincodes (takes precedence)
    excludedPincodes: [String],

    /* =====================
       PRICING RULES
    ====================== */
    pricingRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // e.g., { baseRate: 50, perKg: 20, codCharges: 30 }
    },

    /* =====================
       DELIVERY ESTIMATES
    ====================== */
    averageDeliveryTime: {
      type: Number, // in days
      default: 3,
    },

    expressDeliveryTime: Number,

    /* =====================
       CAPABILITIES
    ====================== */
    supportsCOD: {
      type: Boolean,
      default: true,
    },

    supportsReverse: {
      type: Boolean,
      default: false,
    },

    maxWeight: Number, // in kg

    /* =====================
       PRIORITY
    ====================== */
    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    /* =====================
       WEBHOOKS
    ====================== */
    webhookUrl: String,
    webhookSecret: {
      type: String,
      select: false,
    },

    /* =====================
       METADATA
    ====================== */
    lastSyncAt: Date,
    syncStatus: {
      type: String,
      enum: ["OK", "ERROR", "PENDING"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
LogisticsProviderSchema.index({ isActive: 1, priority: -1 });
LogisticsProviderSchema.index({ type: 1, isActive: 1 });
LogisticsProviderSchema.index({ serviceablePincodes: 1 });

/* =====================
   METHODS
====================== */

/**
 * Check if pincode is serviceable
 */
LogisticsProviderSchema.methods.canServicePincode = function (pincode) {
  if (!this.isActive) return false;

  // Check exclusions first
  if (this.excludedPincodes?.includes(pincode)) return false;

  // Check direct list
  if (this.serviceablePincodes?.includes(pincode)) return true;

  // Check ranges
  if (this.serviceableRanges?.length) {
    return this.serviceableRanges.some(
      (range) => pincode >= range.start && pincode <= range.end
    );
  }

  return false;
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Find best provider for a pincode
 */
LogisticsProviderSchema.statics.findBestForPincode = async function (pincode) {
  const providers = await this.find({ isActive: true }).sort({ priority: -1 });

  for (const provider of providers) {
    if (provider.canServicePincode(pincode)) {
      return provider;
    }
  }

  return null;
};

export default mongoose.model("LogisticsProvider", LogisticsProviderSchema);
