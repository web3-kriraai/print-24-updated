import mongoose from "mongoose";

const AttributeTypeSchema = new mongoose.Schema(
  {
    // The name of the option presented to the user (e.g., "Color," "Die Shape")
    attributeName: {
      type: String,
      required: true,
      trim: true,
    },
    // Internal name for system use
    systemName: {
      type: String,
      required: false,
      trim: true,
    },

    // The system role of the attribute: Quantity/Pricing, Printing (Image), Spot UV/Image
    functionType: {
      type: String,
      enum: ["QUANTITY_PRICING", "PRINTING_IMAGE", "SPOT_UV_IMAGE", "GENERAL"],
      required: true,
      default: "GENERAL",
    },

    // Explicitly marks if selecting this attribute affects the price calculation
    isPricingAttribute: {
      type: Boolean,
      required: true,
      default: false,
    },

    /* =========================
       PRICING BEHAVIOR
    ========================= */
    pricingBehavior: {
      type: String,
      enum: ["NONE", "SIGNAL_ONLY", "QUANTITY_DRIVER"],
      default: "NONE",
    },

    // How the option is presented: Dropdown, Text Field, File Upload
    inputStyle: {
      type: String,
      enum: ["DROPDOWN", "TEXT_FIELD", "FILE_UPLOAD", "NUMBER", "CHECKBOX", "RADIO", "POPUP"],
      required: true,
      default: "DROPDOWN",
    },

    // If fixed quantity needed, restricts available quantity options to pre-set values
    isFixedQuantityNeeded: {
      type: Boolean,
      default: false,
    },

    // Step quantity settings - restricts quantity to specific steps
    isStepQuantity: {
      type: Boolean,
      default: false,
    },
    stepQuantities: [{
      quantity: { type: Number, required: true },
      price: { type: Number, default: 0 },
    }],

    // Range quantity settings - restricts quantity to specific ranges
    isRangeQuantity: {
      type: Boolean,
      default: false,
    },
    rangeQuantities: [{
      min: { type: Number, required: true },
      max: { type: Number }, // null means no upper limit
      price: { type: Number, default: 0 },
    }],

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

    // What area of the system is impacted: PRICE, FILE, VARIANT, INFORMATIONAL
    primaryEffectType: {
      type: String,
      enum: ["PRICE", "FILE", "VARIANT", "INFORMATIONAL"],
      required: true,
      default: "INFORMATIONAL",
    },

    // Description of impact on product (What This Affects)
    effectDescription: {
      type: String,
      trim: true,
      default: "",
    },

    // Can users use this to filter the catalog results?
    isFilterable: {
      type: Boolean,
      default: false,
    },

    // The pre-defined options (e.g., for "Color": "Red," "Blue," "Green")
    // Only required for DROPDOWN, RADIO input styles
    attributeValues: [
      {
        value: String, // The option value (e.g., "Red")
        label: String, // Display label (e.g., "Red")
        pricingKey: String, // Key used for pricing lookup
        priceMultiplier: Number, // Price multiplier for this value (optional, only if isPricingAttribute is true)
        description: String, // Optional description for this value
        image: String, // Optional image URL for this value
        hasSubAttributes: {
          type: Boolean,
          default: false
        }
      },
    ],

    // Default value (optional)
    defaultValue: String,

    // Whether this attribute is required
    isRequired: {
      type: Boolean,
      default: false,
    },

    // Display order in the UI
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Whether this is a common attribute (available for all products)
    isCommonAttribute: {
      type: Boolean,
      default: false,
    },

    // Category/Subcategory restrictions (if empty, available for all)
    applicableCategories: [
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
    ],
  },
  { timestamps: true }
);

// Index for faster queries
AttributeTypeSchema.index({ attributeName: 1 });
AttributeTypeSchema.index({ pricingBehavior: 1 });
AttributeTypeSchema.index({ isCommonAttribute: 1 });

export default mongoose.model("AttributeType", AttributeTypeSchema);

