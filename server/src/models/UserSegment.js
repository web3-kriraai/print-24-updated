import mongoose from "mongoose";

/**
 * UserSegment Schema
 * 
 * Defines user segments for pricing differentiation.
 * Examples: RETAIL, VIP, WHOLESALE, CORPORATE, B2B_ENTERPRISE
 */
const UserSegmentSchema = new mongoose.Schema({
  // Segment code - flexible, no hardcoded enum
  code: {
    type: String,
    uppercase: true,
    trim: true,
    unique: true,
    required: true,
    index: true,
  },

  // Display name
  name: {
    type: String,
    trim: true,
  },

  // Description for admin
  description: {
    type: String,
    trim: true,
  },

  // Is this the default segment for guests?
  isDefault: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Priority for pricing (higher = better pricing)
  priority: {
    type: Number,
    default: 0,
    index: true,
  },

  // Discount tier (0-4, 0=retail, 4=best)
  pricingTier: {
    type: Number,
    min: 0,
    max: 4,
    default: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Is this a system segment (protected from deletion)?
  isSystem: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

/* =========================
   INDEXES
========================= */
UserSegmentSchema.index({ isDefault: 1, isActive: 1 });
UserSegmentSchema.index({ priority: -1 });

/* =========================
   STATIC METHODS
========================= */

/**
 * Get default segment for guests
 */
UserSegmentSchema.statics.getDefaultSegment = async function () {
  return await this.findOne({ isDefault: true, isActive: true });
};

/**
 * Get segment by code
 */
UserSegmentSchema.statics.getByCode = async function (code) {
  return await this.findOne({ code: code?.toUpperCase(), isActive: true });
};

export default mongoose.model("UserSegment", UserSegmentSchema);
