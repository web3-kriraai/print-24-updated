import mongoose from "mongoose";

const SubAttributeSchema = new mongoose.Schema(
  {
    parentAttribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeType",
      required: true,
    },

    parentValue: {
      type: String, // e.g. "custom-shape-", "texture-uv"
      required: true,
    },

    value: { type: String, required: true },
    label: { type: String, required: true },

    image: String,

    /* =======================
       PRICING ENGINE BRIDGE
       (USED ONLY FOR LEAF)
    ======================= */
    pricingKey: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    priceAdd: {
      type: Number,
      default: 0,
    },

    systemName: {
      type: String,
      required: false,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* =======================
   PREVENT DUPLICATES
======================= */
SubAttributeSchema.index(
  { parentAttribute: 1, parentValue: 1, value: 1 },
  { unique: true }
);

export default mongoose.model("SubAttribute", SubAttributeSchema);
