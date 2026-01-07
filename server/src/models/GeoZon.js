import mongoose from "mongoose";

/**
 * HIERARCHICAL GEO ZONE SCHEMA
 * 
 * Supports cascading zones: Country → State → District → City → Zip
 * Priority resolution: Most specific zone wins
 * 
 * Example hierarchy:
 * - USA (Country, Priority 1)
 *   - New York (State, Priority 2)
 *     - Manhattan (City, Priority 4)
 *       - 10001 (Zip, Priority 5)
 */

const GeoZoneSchema = new mongoose.Schema({
  /* =======================
     BASIC INFO
  ======================= */
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  code: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true,
    index: true
    // e.g., "US", "NY", "10001"
  },

  currency: {
    type: String,
    default: "INR",
    uppercase: true
    // ISO 4217: USD, EUR, INR, GBP
  },

  /* =======================
     HIERARCHICAL STRUCTURE
  ======================= */
  level: {
    type: String,
    enum: ['COUNTRY', 'STATE', 'DISTRICT', 'CITY', 'ZIP'],
    required: true,
    index: true
  },

  parentZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeoZone',
    default: null,
    index: true
    // null for top-level (COUNTRY)
  },

  priority: {
    type: Number,
    default: function () {
      // Auto-assign priority based on level
      const priorities = {
        'ZIP': 5,
        'CITY': 4,
        'DISTRICT': 3,
        'STATE': 2,
        'COUNTRY': 1
      };
      return priorities[this.level] || 0;
    },
    index: true
  },

  /* =======================
     RESTRICTIONS
  ======================= */
  isRestricted: {
    type: Boolean,
    default: false,
    index: true
  },

  restrictionReason: {
    type: String,
    trim: true
    // e.g., "Not compliant with local regulations"
  },

  /* =======================
     METADATA
  ======================= */
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  description: {
    type: String,
    trim: true
  },

  /* =======================
     NEW FIELDS - Extended Hierarchy Support
  ======================= */
  // Alias for level (for compatibility)
  zoneType: {
    type: String,
    enum: ['COUNTRY', 'STATE', 'DISTRICT', 'CITY', 'ZIP'],
    // Automatically synced with level
  },

  timezone: {
    type: String,
    default: 'Asia/Kolkata',
    // e.g., "America/New_York", "Europe/London"
  },

  deliveryDays: {
    type: Number,
    default: 3,
    // Standard delivery time in days
  },

  holidays: [Date],

  operatingHours: {
    start: String, // e.g., "09:00"
    end: String,   // e.g., "18:00"
    timezone: { type: String, default: 'Asia/Kolkata' },
  },

}, {
  timestamps: true
});

/* =======================
   INDEXES
======================= */
// Compound index for hierarchy queries
GeoZoneSchema.index({ level: 1, parentZone: 1, isActive: 1 });
GeoZoneSchema.index({ priority: -1, isActive: 1 });

/* =======================
   METHODS
======================= */

/**
 * Get all ancestor zones (parent, grandparent, etc.)
 */
GeoZoneSchema.methods.getAncestors = async function () {
  const ancestors = [];
  let currentZone = this;

  while (currentZone.parentZone) {
    const parent = await mongoose.model('GeoZone').findById(currentZone.parentZone);
    if (!parent) break;
    ancestors.push(parent);
    currentZone = parent;
  }

  return ancestors;
};

/**
 * Get all child zones
 */
GeoZoneSchema.methods.getChildren = async function () {
  return await mongoose.model('GeoZone').find({
    parentZone: this._id,
    isActive: true
  }).sort({ priority: -1 });
};

/**
 * Get full hierarchy path (e.g., "USA > New York > Manhattan > 10001")
 */
GeoZoneSchema.methods.getHierarchyPath = async function () {
  const ancestors = await this.getAncestors();
  const path = [...ancestors.reverse().map(a => a.name), this.name];
  return path.join(' > ');
};

/* =======================
   STATIC METHODS
======================= */

/**
 * Resolve geo zone by pincode with cascading fallback
 * Priority: ZIP > CITY > DISTRICT > STATE > COUNTRY
 */
GeoZoneSchema.statics.resolveByPincode = async function (pincode) {
  // First, try to find exact match in GeoZoneMapping
  const GeoZoneMapping = mongoose.model('GeoZoneMapping');

  const mapping = await GeoZoneMapping.findOne({
    $or: [
      { zipCode: pincode },
      {
        zipCodeStart: { $lte: pincode },
        zipCodeEnd: { $gte: pincode }
      }
    ]
  }).populate('geoZone');

  if (mapping && mapping.geoZone) {
    return mapping.geoZone;
  }

  // Fallback: Find default zone for country (if pincode pattern matches)
  // This is a simplified fallback - you can enhance with regex patterns
  const defaultZone = await this.findOne({
    level: 'COUNTRY',
    isActive: true,
    isRestricted: false
  }).sort({ priority: 1 });

  return defaultZone;
};

/**
 * Get most specific zone from a list of zones
 */
GeoZoneSchema.statics.getMostSpecific = function (zones) {
  if (!zones || zones.length === 0) return null;

  // Sort by priority (highest first)
  const sorted = zones.sort((a, b) => b.priority - a.priority);
  return sorted[0];
};

export default mongoose.model("GeoZone", GeoZoneSchema);
