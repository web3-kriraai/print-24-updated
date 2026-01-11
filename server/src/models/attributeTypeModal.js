import mongoose from "mongoose";

const AttributeTypeSchema = new mongoose.Schema(
  {
    /* =========================
       BASIC IDENTITY
    ========================= */
    attributeName: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
       SYSTEM ROLE
    ========================= */
    functionType: {
      type: String,
      enum: ["QUANTITY_PRICING", "PRINTING_IMAGE", "SPOT_UV_IMAGE", "GENERAL"],
      default: "GENERAL",
    },

    /* =========================
       PRICING BEHAVIOR
    ========================= */
    pricingBehavior: {
      type: String,
      enum: ["NONE", "SIGNAL_ONLY", "QUANTITY_DRIVER"],
      default: "NONE",
    },

    /* =========================
       UI INPUT CONFIG
    ========================= */
    inputStyle: {
      type: String,
      enum: [
        "DROPDOWN",
        "TEXT_FIELD",
        "FILE_UPLOAD",
        "NUMBER",
        "CHECKBOX",
        "RADIO",
        "POPUP",
      ],
      default: "DROPDOWN",
    },

    displayOrder: {
      type: Number,
      default: 0,
    },

    /* =========================
       QUANTITY CONFIG
       (only for QUANTITY_DRIVER)
    ========================= */
    quantityConfig: {
      quantityType: {
        type: String,
        enum: ["SIMPLE", "STEP_WISE", "RANGE_WISE"],
        default: "SIMPLE",
      },

      minQuantity: Number,
      maxQuantity: Number,
      quantityMultiples: Number,

      stepWiseQuantities: [Number],

      rangeWiseQuantities: [
        {
          min: { type: Number, required: true },
          max: Number,
          priceMultiplier: { type: Number, default: 1.0 },
          label: String,
        },
      ],
    },

    /* =========================
       EFFECT AREA
    ========================= */
    primaryEffectType: {
      type: String,
      enum: ["PRICE", "FILE", "VARIANT", "INFORMATIONAL"],
      default: "INFORMATIONAL",
    },

    effectDescription: {
      type: String,
      default: "",
    },

    /* =========================
       FILTERING
    ========================= */
    isFilterable: {
      type: Boolean,
      default: false,
    },

    /* =========================
       DEFAULT VALUE (leaf SubAttribute.value)
    ========================= */
    defaultValue: {
      type: String,
    },

    /* =========================
       VISIBILITY SCOPE
    ========================= */
    isCommonAttribute: {
      type: Boolean,
      default: false,
    },

    applicableCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],

    applicableSubCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
    ],
  },
  { timestamps: true }
);

/* =========================
   INDEXES
========================= */
AttributeTypeSchema.index({ attributeName: 1 });
AttributeTypeSchema.index({ pricingBehavior: 1 });
AttributeTypeSchema.index({ isCommonAttribute: 1 });

export default mongoose.model("AttributeType", AttributeTypeSchema);
