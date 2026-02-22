import mongoose from "mongoose";

/**
 * ProductAvailability Schema
 * 
 * Hard restrictions on where products can be sold.
 * When isSellable = false, product must be hidden in that zone.
 */
const ProductAvailabilitySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },

  geoZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GeoZone",
    required: true,
    index: true,
  },

  // Is product available in this zone?
  isSellable: {
    type: Boolean,
    default: true,
    index: true,
  },

  // Reason for restriction (shown to customers)
  reason: {
    type: String,
    trim: true,
    // e.g., "Not compliant with local regulations"
  },

  // Internal notes for admins
  internalNotes: {
    type: String,
    trim: true,
  },

  // Effective date range (optional)
  effectiveFrom: {
    type: Date,
  },

  effectiveTo: {
    type: Date,
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, { timestamps: true });

/* =========================
   INDEXES (CRITICAL)
========================= */

// Fast lookup: check availability
ProductAvailabilitySchema.index(
  { product: 1, geoZone: 1 },
  { unique: true }
);

// Query by zone
ProductAvailabilitySchema.index({ geoZone: 1, isSellable: 1 });

/* =========================
   STATIC METHODS
========================= */

/**
 * Check if product is available in zone
 */
ProductAvailabilitySchema.statics.isProductAvailable = async function (productId, geoZoneId) {
  if (!geoZoneId) return true; // No zone = available

  const record = await this.findOne({
    product: productId,
    geoZone: geoZoneId,
    isActive: true,
  });

  // If no record, product is available (whitelist approach)
  if (!record) return true;

  // Check date range if set
  const now = new Date();
  if (record.effectiveFrom && record.effectiveFrom > now) return true;
  if (record.effectiveTo && record.effectiveTo < now) return true;

  return record.isSellable;
};

/**
 * Get restriction reason
 */
ProductAvailabilitySchema.statics.getRestrictionReason = async function (productId, geoZoneId) {
  const record = await this.findOne({
    product: productId,
    geoZone: geoZoneId,
    isSellable: false,
    isActive: true,
  });

  return record?.reason || "Product not available in your region";
};

export default mongoose.model("ProductAvailability", ProductAvailabilitySchema);
