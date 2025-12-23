import mongoose from "mongoose";

const GeoZoneMappingSchema = new mongoose.Schema(
  {
    geoZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoZone",
      required: true,
      index: true,
    },

    pincodeStart: {
      type: Number,
      required: true,
    },

    pincodeEnd: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

/* =========================
   INDEXES (CRITICAL)
========================= */

// Fast lookup: find zone by pincode
GeoZoneMappingSchema.index({
  pincodeStart: 1,
  pincodeEnd: 1,
});

// Prevent exact duplicate ranges
GeoZoneMappingSchema.index(
  { geoZone: 1, pincodeStart: 1, pincodeEnd: 1 },
  { unique: true }
);

/* =========================
   VALIDATION
========================= */

GeoZoneMappingSchema.pre("save", function (next) {
  if (this.pincodeStart > this.pincodeEnd) {
    return next(
      new Error("pincodeStart cannot be greater than pincodeEnd")
    );
  }
  next();
});

export default mongoose.model("GeoZoneMapping", GeoZoneMappingSchema);
