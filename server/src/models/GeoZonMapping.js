import mongoose from "mongoose";

/**
 * GeoZoneMapping Schema
 * 
 * Maps geographic identifiers to GeoZones for price resolution.
 * Supports:
 * - Country codes (ISO 3166-1 alpha-2)
 * - Pincode ranges
 * - Single zip codes
 */
const GeoZoneMappingSchema = new mongoose.Schema(
  {
    geoZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoZone",
      required: true,
      index: true,
    },

    // ISO 3166-1 alpha-2 country code (e.g., "US", "IN", "DE")
    countryCode: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 2,
      index: true,
    },

    // Single zip/pincode for exact matching
    zipCode: {
      type: String,
      trim: true,
      index: true,
    },

    // Range for pincode matching
    pincodeStart: {
      type: Number,
    },

    pincodeEnd: {
      type: Number,
    },

    // Is this the default mapping for the country?
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

/* =========================
   INDEXES (CRITICAL)
========================= */

// Fast lookup: find zone by pincode range
GeoZoneMappingSchema.index({
  pincodeStart: 1,
  pincodeEnd: 1,
});

// Fast lookup: country + default
GeoZoneMappingSchema.index({
  countryCode: 1,
  isDefault: 1,
});

// Prevent exact duplicate ranges
GeoZoneMappingSchema.index(
  { geoZone: 1, pincodeStart: 1, pincodeEnd: 1 },
  { unique: true, sparse: true }
);

/* =========================
   VALIDATION
========================= */

GeoZoneMappingSchema.pre("save", function (next) {
  // Validate pincode range
  if (this.pincodeStart && this.pincodeEnd) {
    if (this.pincodeStart > this.pincodeEnd) {
      return next(
        new Error("pincodeStart cannot be greater than pincodeEnd")
      );
    }
  }
  next();
});

/* =========================
   STATIC METHODS
========================= */

/**
 * Find zone by country code
 */
GeoZoneMappingSchema.statics.findByCountryCode = async function (countryCode) {
  return await this.findOne({
    countryCode: countryCode?.toUpperCase(),
    isDefault: true,
  }).populate("geoZone");
};

/**
 * Find zone by exact zip code
 */
GeoZoneMappingSchema.statics.findByZipCode = async function (zipCode) {
  return await this.findOne({
    zipCode: zipCode,
  }).populate("geoZone");
};

/**
 * Find zone by pincode range
 */
GeoZoneMappingSchema.statics.findByPincodeRange = async function (pincode) {
  const pincodeNum = parseInt(pincode);
  if (isNaN(pincodeNum)) return null;

  return await this.findOne({
    pincodeStart: { $lte: pincodeNum },
    pincodeEnd: { $gte: pincodeNum },
  }).populate("geoZone");
};

export default mongoose.model("GeoZoneMapping", GeoZoneMappingSchema);
