import mongoose from "mongoose";

const SubAttributeSchema = new mongoose.Schema(
  {
    parentAttribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeType",
      required: true,
      index: true,
    },

    /**
     * The EXACT value of the parent attribute this sub-attribute belongs to
     * Example: "custom_shape", "uv_texture"
     */
    parentValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /**
     * System value (used internally, pricing engine, rules)
     */
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /**
     * Display label (shown to user)
     */
    label: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

    /**
     * Used by Pricing Engine
     * Example: "DIE_CUT", "EMBOSSED_UV", "FOILING_GOLD"
     */
    pricingKey: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
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
