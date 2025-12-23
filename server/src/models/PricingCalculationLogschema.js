import mongoose from "mongoose";

const PricingCalculationLogSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    pricingKey: {
      type: String,
      required: true,
    },

    modifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PriceModifier",
    },

    scope: {
      type: String,
      enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE"],
      required: true,
    },

    beforeAmount: {
      type: Number,
      required: true,
    },

    afterAmount: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      default: "",
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

PricingCalculationLogSchema.index({ order: 1, appliedAt: 1 });

export default mongoose.model(
  "PricingCalculationLog",
  PricingCalculationLogSchema
);
