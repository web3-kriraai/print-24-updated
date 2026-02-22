import mongoose from "mongoose";

/**
 * Feature Schema
 * 
 * For feature access control - defines all available features
 * that can be enabled/disabled for different user types.
 */

const FeatureSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      // e.g., "view_brand_kit", "access_delivery_hub", "bulk_upload_csv"
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    /* =====================
       CATEGORIZATION
    ====================== */
    category: {
      type: String,
      trim: true,
      index: true,
      // e.g., "ORDERS", "PRODUCTS", "DELIVERY", "ANALYTICS"
    },

    subcategory: String,

    /* =====================
       STATUS
    ====================== */
    isActive: {
      type: Boolean,
      default: true,
    },

    /* =====================
       FEATURE FLAGS
    ====================== */
    isBeta: {
      type: Boolean,
      default: false,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    /* =====================
       DEPENDENCIES
    ====================== */
    dependsOn: [
      {
        type: String,
        // Other feature keys this feature depends on
      },
    ],

    /* =====================
       CONFIGURATION SCHEMA
    ====================== */
    configSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // JSON Schema for feature configuration
    },

    /* =====================
       METADATA
    ====================== */
    icon: String,
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
FeatureSchema.index({ category: 1, sortOrder: 1 });
FeatureSchema.index({ isActive: 1 });

/* =====================
   STATIC METHODS
====================== */

/**
 * Get all features by category
 */
FeatureSchema.statics.getByCategory = async function (category) {
  return await this.find({
    category,
    isActive: true,
  }).sort({ sortOrder: 1 });
};

/**
 * Get all active features
 */
FeatureSchema.statics.getAllActive = async function () {
  return await this.find({ isActive: true }).sort({ category: 1, sortOrder: 1 });
};

export default mongoose.model("Feature", FeatureSchema);
