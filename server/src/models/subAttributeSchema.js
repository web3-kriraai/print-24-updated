import mongoose from "mongoose";

const SubAttributeSchema = new mongoose.Schema(
  {
<<<<<<< HEAD
    /* =======================
       ATTRIBUTE LINK
    ======================= */
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    parentAttribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeType",
      required: true,
      index: true,
    },

<<<<<<< HEAD
    /* =======================
       NESTING CONTROL
       - ROOT LEVEL: parentValue = "__root__"
       - CHILD LEVEL: parentValue = parent.value
    ======================= */
=======
    /**
     * The EXACT value of the parent attribute this sub-attribute belongs to
     * Example: "custom_shape", "uv_texture"
     */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    parentValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

<<<<<<< HEAD
    /* =======================
       SYSTEM VALUE (LEAF STORED)
    ======================= */
=======
    /**
     * System value (used internally, pricing engine, rules)
     */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    value: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

<<<<<<< HEAD
    /* =======================
       DISPLAY
    ======================= */
=======
    /**
     * Display label (shown to user)
     */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    label: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

<<<<<<< HEAD
    /* =======================
       PRICING ENGINE BRIDGE
       (USED ONLY FOR LEAF)
    ======================= */
=======
    /**
     * Used by Pricing Engine
     * Example: "DIE_CUT", "EMBOSSED_UV", "FOILING_GOLD"
     */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
