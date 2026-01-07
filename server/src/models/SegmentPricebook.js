<<<<<<< HEAD
import mongoose from "mongoose";

/**
 * SegmentPriceBook Schema
 * 
 * Links user segments to specific price books.
 * Determines which price book to use based on user's segment.
 */
const SegmentPriceBookSchema = new mongoose.Schema({
  userSegment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserSegment",
    required: true,
    index: true,
  },

  priceBook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PriceBook",
    required: true,
    index: true,
  },

  // Priority for when segment has multiple books
  priority: {
    type: Number,
    default: 0,
    index: true,
  },

  // Optional zone restriction
  geoZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GeoZone",
    default: null,
    index: true,
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

// Unique constraint: one book per segment-zone combo
SegmentPriceBookSchema.index(
  { userSegment: 1, priceBook: 1, geoZone: 1 },
  { unique: true }
);

// Fast lookup by segment
SegmentPriceBookSchema.index({ userSegment: 1, priority: -1 });

/* =========================
   STATIC METHODS
========================= */

/**
 * Get price book for segment (optionally by zone)
 */
SegmentPriceBookSchema.statics.getPriceBookForSegment = async function (segmentId, geoZoneId = null) {
  const query = {
    userSegment: segmentId,
    isActive: true,
  };

  if (geoZoneId) {
    // First try zone-specific
    query.geoZone = geoZoneId;
    const zoneSpecific = await this.findOne(query)
      .populate("priceBook")
      .sort({ priority: -1 });

    if (zoneSpecific) return zoneSpecific.priceBook;

    // Fall back to segment-only (no zone)
    delete query.geoZone;
    query.geoZone = null;
  }

  const result = await this.findOne(query)
    .populate("priceBook")
    .sort({ priority: -1 });

  return result?.priceBook || null;
};

export default mongoose.model("SegmentPriceBook", SegmentPriceBookSchema);
=======
const SegmentPriceBookSchema = new mongoose.Schema({
    userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },
    priceBook: { type: mongoose.Schema.Types.ObjectId, ref: "PriceBook" },
    priority: Number
  });
  
  export default mongoose.model("SegmentPriceBook", SegmentPriceBookSchema);
  
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
