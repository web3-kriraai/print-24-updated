import mongoose from "mongoose";

/**
 * UserType Schema
 * 
 * For dynamic privilege management system (PMS) - replaces
 * fixed role system with configurable user types and features.
 */

const UserTypeSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    name: {
      type: String,
      enum: ["AGENT", "CORPORATE", "DISTRIBUTOR", "BRANCH", "HUB", "RETAIL", "VIP"],
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
    },

    description: String,

    /* =====================
       PRICING TIER
    ====================== */
    pricingTier: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
      index: true,
      // 0 = Retail (highest price)
      // 4 = VIP (lowest price)
    },

    /* =====================
       HIERARCHY
    ====================== */
    parentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserType",
      default: null,
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
       FEATURES
    ====================== */
    features: [
      {
        featureKey: {
          type: String,
          required: true,
        },
        isEnabled: {
          type: Boolean,
          default: false,
        },
        config: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],

    /* =====================
       UI CONFIGURATION
    ====================== */
    viewConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // JSON configuration for UI customization
    },

    /* =====================
       PERMISSIONS
    ====================== */
    permissions: [
      {
        resource: String, // e.g., "orders", "products", "users"
        actions: [String], // e.g., ["read", "write", "delete"]
      },
    ],

    /* =====================
       LIMITS
    ====================== */
    limits: {
      maxOrders: Number,
      maxClients: Number,
      maxCreditLimit: Number,
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
UserTypeSchema.index({ isActive: 1, pricingTier: 1 });

/* =====================
   METHODS
====================== */

/**
 * Check if feature is enabled for this user type
 */
UserTypeSchema.methods.hasFeature = function (featureKey) {
  const feature = this.features.find((f) => f.featureKey === featureKey);
  return feature?.isEnabled || false;
};

/**
 * Get feature config
 */
UserTypeSchema.methods.getFeatureConfig = function (featureKey) {
  const feature = this.features.find((f) => f.featureKey === featureKey);
  return feature?.config || {};
};

/**
 * Get all ancestors (parent types)
 */
UserTypeSchema.methods.getAncestors = async function () {
  const ancestors = [];
  let current = this;

  while (current.parentType) {
    const parent = await mongoose.model("UserType").findById(current.parentType);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
};

export default mongoose.model("UserType", UserTypeSchema);
