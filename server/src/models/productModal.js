import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    /* =======================
       BASIC PRODUCT INFO
    ======================= */
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // Backward compatibility (OK for now)
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    descriptionArray: {
      type: [String],
      default: [],
    },

    productType: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

    /* =======================
       NON-PRICING OPTIONS
       (UI / INFORMATION ONLY)
    ======================= */
    options: [
      {
        name: { type: String, required: true },
        description: String,
        image: String,
      },
    ],

    /* =======================
       LEGACY FILTERS
       (READ-ONLY / MIGRATION)
    ======================= */
    filters: {
      printingOption: {
        type: [String],
        default: [],
      },

      deliverySpeed: {
        type: [String],
        default: [],
      },

      textureType: {
        type: [String],
        default: [],
      },

      /**
       * ⚠️ IMPORTANT
       * This stays ONLY for backward compatibility.
       * Do NOT use it for new pricing logic.
       */
      orderQuantity: {
        quantityType: {
          type: String,
          enum: ["SIMPLE", "STEP_WISE", "RANGE_WISE"],
          default: "SIMPLE",
        },

        min: Number,
        max: Number,
        multiples: Number,

        stepWiseQuantities: [Number],

        rangeWiseQuantities: [
          {
            min: Number,
            max: Number,
            label: String,
          },
        ],
      },
    },

    /* =======================
       MODERN DYNAMIC ATTRIBUTES
    ======================= */
    dynamicAttributes: [
      {
        attributeType: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AttributeType",
          required: true,
        },

        dependsOn: {
          attribute: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AttributeType",
          },
          value: String,
        },

        isEnabled: {
          type: Boolean,
          default: true,
        },

        displayOrder: {
          type: Number,
          default: 0,
        },

        isRequired: {
          type: Boolean,
          default: false,
        },
      },
    ],

    /* =======================
       SINGLE SOURCE OF TRUTH
       FOR QUANTITY
    ======================= */
    quantityConfig: {
      quantityType: {
        type: String,
        enum: ["SIMPLE", "STEP_WISE", "RANGE_WISE"],
        default: "SIMPLE",
      },

      minQuantity: Number,
      maxQuantity: Number,
      multiples: Number,

      stepWiseQuantities: [Number],

      rangeWiseQuantities: [
        {
          min: Number,
          max: Number,
          label: String,
        },
      ],
    },

    /* =======================
       FILE VALIDATION RULES
    ======================= */
    fileRules: {
      maxFileSizeMB: Number,
      minWidth: Number,
      maxWidth: Number,
      minHeight: Number,
      maxHeight: Number,
      blockedFormats: {
        type: [String],
        default: [],
      },
    },

    /* =======================
       TAX & DISPLAY SETTINGS
    ======================= */
    additionalDesignCharge: {
      type: Number,
      default: 0,
    },

    gstPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    showPriceIncludingGst: {
      type: Boolean,
      default: false,
    },

    instructions: {
      type: String,
      default: "",
    },

    /* =======================
       PRODUCTION WORKFLOW
    ======================= */
    productionSequence: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
  },
  { timestamps: true }
);

/* =======================
   INDEXES
======================= */
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 1 });

export default mongoose.model("Product", ProductSchema);
