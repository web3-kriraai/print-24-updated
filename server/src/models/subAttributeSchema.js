import mongoose from "mongoose";

const SubAttributeSchema = new mongoose.Schema(
  {
    /* =======================
       ATTRIBUTE LINK
    ======================= */
    parentAttribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeType",
      required: true,
      index: true,
    },

    /* =======================
       NESTING CONTROL
       - ROOT LEVEL: parentValue = "__root__"
       - CHILD LEVEL: parentValue = parent.value
    ======================= */
    parentValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /* =======================
       SYSTEM VALUE (LEAF STORED)
    ======================= */
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /* =======================
       DISPLAY
    ======================= */
    label: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

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
