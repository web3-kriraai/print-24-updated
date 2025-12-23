import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["PRICE", "QUALITY", "DELIVERY"],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    // 🔒 IMMUTABLE SNAPSHOT FOR AUDIT
    priceSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: false, // only for PRICE complaints
    },

    resolutionStatus: {
      type: String,
      enum: ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },

    resolutionNotes: {
      type: String,
      default: "",
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    resolvedAt: Date,
  },
  { timestamps: true }
);

ComplaintSchema.index({ order: 1, type: 1 });

export default mongoose.model("Complaint", ComplaintSchema);
