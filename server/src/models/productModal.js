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

<<<<<<< HEAD
=======
    // Backward compatibility (OK for now)
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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

<<<<<<< HEAD
    // ⚠️ LEGACY SUPPORT ONLY
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
<<<<<<< HEAD
       UI DISPLAY OPTIONS ONLY
       (NO PRICING / NO LOGIC)
=======
       NON-PRICING OPTIONS
       (UI / INFORMATION ONLY)
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
<<<<<<< HEAD
       ⚠️ READ-ONLY
       ⚠️ DO NOT USE IN NEW CODE
    ======================= */
    filters: {
      type: Object,
      select: false, // hides from normal queries
=======
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
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
<<<<<<< HEAD
       TAX & DISPLAY
=======
       TAX & DISPLAY SETTINGS
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
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
<<<<<<< HEAD
       PRODUCT LIFECYCLE
    ======================= */
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* =======================
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
       PRODUCTION WORKFLOW
    ======================= */
    productionSequence: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
      },
    ],
<<<<<<< HEAD

    /* =======================
       NEW FIELDS - Zoho Integration
    ======================= */
    suggestedBaseCost: {
      type: Number,
      // From Zoho integration
    },

    /* =======================
       BILL OF MATERIALS
    ======================= */
    bom: [
      {
        material: String,
        quantity: Number,
        unit: String,
      },
    ],

    /* =======================
       CROSS-SELL & UP-SELL
    ======================= */
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    frequentlyBoughtTogether: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    keywords: [
      {
        type: String,
        trim: true,
        // For SEO and up-sell
      },
    ],

    /* =======================
       VIEW CONFIGURATION
    ======================= */
    views: {
      defaultView: {
        type: String,
        default: "ATTRIBUTE_BASED",
      },
      alternativeView: {
        type: String,
        default: "EXPANDABLE_SECTION",
      },
    },

    /* =======================
       AVAILABILITY RULES
    ======================= */
    availabilityRules: [
      {
        geoZoneId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "GeoZone",
        },
        isSellable: Boolean,
        reason: String,
      },
    ],
=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
  },
  { timestamps: true }
);

/* =======================
   INDEXES
======================= */
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 1 });

export default mongoose.model("Product", ProductSchema);
