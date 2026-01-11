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

    // ⚠️ LEGACY SUPPORT ONLY
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
       UI DISPLAY OPTIONS ONLY
       (NO PRICING / NO LOGIC)
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
       ⚠️ READ-ONLY
       ⚠️ DO NOT USE IN NEW CODE
    ======================= */
    filters: {
      type: Object,
      select: false, // hides from normal queries
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
       TAX & DISPLAY
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
       PRODUCT LIFECYCLE
    ======================= */
    isActive: {
      type: Boolean,
      default: false,
      index: true,
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
  },
  { timestamps: true }
);

/* =======================
   INDEXES
======================= */
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 1 });

export default mongoose.model("Product", ProductSchema);
