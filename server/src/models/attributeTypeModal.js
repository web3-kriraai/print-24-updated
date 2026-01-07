import mongoose from "mongoose";

const AttributeTypeSchema = new mongoose.Schema(
  {
    /* =========================
<<<<<<< HEAD
       BASIC IDENTITY
    ========================= */
=======
     * BASIC IDENTITY
     * ========================= */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    attributeName: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
<<<<<<< HEAD
       SYSTEM ROLE
    ========================= */
=======
     * SYSTEM ROLE
     * ========================= */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    functionType: {
      type: String,
      enum: ["QUANTITY_PRICING", "PRINTING_IMAGE", "SPOT_UV_IMAGE", "GENERAL"],
      default: "GENERAL",
    },

    /* =========================
<<<<<<< HEAD
       PRICING BEHAVIOR
    ========================= */
=======
     * PRICING BEHAVIOR (VERY IMPORTANT)
     * =========================
     * NONE            → UI only, no pricing impact
     * SIGNAL_ONLY     → Sends pricingKey to pricing engine
     * QUANTITY_DRIVER → Drives base quantity pricing
     */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    pricingBehavior: {
      type: String,
      enum: ["NONE", "SIGNAL_ONLY", "QUANTITY_DRIVER"],
      default: "NONE",
    },

    /* =========================
<<<<<<< HEAD
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

=======
     * UI INPUT CONFIG
     * ========================= */
    inputStyle: {
      type: String,
      enum: ["DROPDOWN", "TEXT_FIELD", "FILE_UPLOAD", "NUMBER", "CHECKBOX", "RADIO", "POPUP"],
      default: "DROPDOWN",
    },

    isRequired: {
      type: Boolean,
      default: false,
    },

>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    displayOrder: {
      type: Number,
      default: 0,
    },

    /* =========================
<<<<<<< HEAD
       QUANTITY CONFIG
       (only for QUANTITY_DRIVER)
    ========================= */
=======
     * QUANTITY CONFIGURATION
     * (Only used when pricingBehavior = QUANTITY_DRIVER)
     * ========================= */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    quantityConfig: {
      quantityType: {
        type: String,
        enum: ["SIMPLE", "STEP_WISE", "RANGE_WISE"],
        default: "SIMPLE",
      },

<<<<<<< HEAD
=======
      // SIMPLE
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      minQuantity: Number,
      maxQuantity: Number,
      quantityMultiples: Number,

<<<<<<< HEAD
      stepWiseQuantities: [Number],

=======
      // STEP_WISE
      stepWiseQuantities: [Number],

      // RANGE_WISE
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
<<<<<<< HEAD
       EFFECT AREA
    ========================= */
=======
     * EFFECT AREA
     * ========================= */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    primaryEffectType: {
      type: String,
      enum: ["PRICE", "FILE", "VARIANT", "INFORMATIONAL"],
      default: "INFORMATIONAL",
    },

    effectDescription: {
      type: String,
<<<<<<< HEAD
=======
      trim: true,
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
      default: "",
    },

    /* =========================
<<<<<<< HEAD
       FILTERING
    ========================= */
=======
     * FILTERING
     * ========================= */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    isFilterable: {
      type: Boolean,
      default: false,
    },

    /* =========================
<<<<<<< HEAD
       DEFAULT VALUE (leaf SubAttribute.value)
    ========================= */
    defaultValue: {
      type: String,
    },

    /* =========================
       VISIBILITY SCOPE
    ========================= */
=======
     * ATTRIBUTE VALUES
     * ========================= */
    attributeValues: [
      {
        value: String,
        label: String,

        /*
         * IMPORTANT:
         * pricingKey is the ONLY bridge to pricing engine
         * NO price, NO multiplier here
         */
        pricingKey: String,

        description: String,
        image: String,

        hasSubAttributes: {
          type: Boolean,
          default: false,
        },
      },
    ],

    defaultValue: String,

    /* =========================
     * VISIBILITY SCOPE
     * ========================= */
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    isCommonAttribute: {
      type: Boolean,
      default: false,
    },

    applicableCategories: [
<<<<<<< HEAD
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ],

    applicableSubCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" },
=======
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    applicableSubCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    ],
  },
  { timestamps: true }
);

/* =========================
<<<<<<< HEAD
   INDEXES
========================= */
AttributeTypeSchema.index({ attributeName: 1 });
AttributeTypeSchema.index({ pricingBehavior: 1 });
AttributeTypeSchema.index({ isCommonAttribute: 1 });
=======
 * INDEXES
 * ========================= */
AttributeTypeSchema.index({ attributeName: 1 });
AttributeTypeSchema.index({ isCommonAttribute: 1 });
AttributeTypeSchema.index({ pricingBehavior: 1 });
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6

export default mongoose.model("AttributeType", AttributeTypeSchema);
