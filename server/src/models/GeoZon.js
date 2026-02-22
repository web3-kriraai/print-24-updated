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
    // ISO 3166-1 alpha-2 (e.g. "US", "IN") or ISO 3166-2 (e.g. "US-NY")
  },

  currency_code: {
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
    enum: ['COUNTRY', 'STATE', 'DISTRICT', 'CITY', 'ZIP', 'ZONE', 'REGION', 'UT', 'CONTINENT', 'WORLD'],
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

  /* =======================
     WAREHOUSE / PICKUP
  ======================= */
  warehouseName: {
    type: String,
    trim: true,
    // e.g., "Delhi Warehouse", "Mumbai Hub"
  },

  warehousePincode: {
    type: String,
    trim: true,
    // Pickup pincode for shipments from this zone's warehouse
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
// Unique case‑insensitive index on name
GeoZoneSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

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

  const mappings = await GeoZoneMapping.find({
    $or: [
      { zipCode: pincode },
      {
        pincodeStart: { $lte: Number(pincode) || 0 },
        pincodeEnd: { $gte: Number(pincode) || 0 }
      }
    ]
  }).populate('geoZone');

  if (mappings.length > 0) {
    // Sort by priority (highest first) and then by range specificity (narrowest range first)
    const sorted = mappings
      .filter(m => m.geoZone)
      .sort((a, b) => {
        // Priority (District > State > Country)
        const priorityDiff = (b.geoZone.priority || 0) - (a.geoZone.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;

        // Range specificity (Narrower range is more specific)
        const rangeA = (a.pincodeEnd || 0) - (a.pincodeStart || 0);
        const rangeB = (b.pincodeEnd || 0) - (b.pincodeStart || 0);
        return rangeA - rangeB;
      });

    if (sorted.length > 0) return sorted[0].geoZone;
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
 * Resolve the nearest warehouse zone by pincode traversing up the hierarchy
 * Priority: Exact match zone -> Parent -> Grandparent...
 */
GeoZoneSchema.statics.resolveWarehouseByPincode = async function (pincode) {
  let zone = await this.resolveByPincode(pincode);

  // Traverse up the hierarchy until we find a zone with a warehouse defined
  while (zone) {
    if (zone.warehousePincode) {
      return zone;
    }
    if (!zone.parentZone) break;
    zone = await this.findById(zone.parentZone);
  }

  return null;
};

export default mongoose.model("GeoZone", GeoZoneSchema);
