import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Keep subcategory for backward compatibility during migration (will be removed later)
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: false,
    },

    name: { type: String, required: true },
    shortDescription: { type: String }, // Short description displayed below product name
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    description: String,
    // Description as array for point-wise display
    descriptionArray: [String],

    // Product Type (e.g., "gloss", "matte", "velvet", "nt")
    productType: { type: String, default: "" },

    // Product Image
    image: { type: String },   // Cloudinary URL will be stored here

    // Base price
    basePrice: { type: Number, default: 0 },

    // Product Options
    options: [
      {
        name: String,
        priceAdd: Number,
        description: String,
        image: String, // Image URL for this option
      },
    ],

    // Filters for product customization (legacy - kept for backward compatibility)
    filters: {
      printingOption: [String], // e.g., ["Single Side", "Both Sides", "Single Side with Black Back Printing"]
      orderQuantity: {
        // Legacy support: simple min/max/multiples
        min: { type: Number, default: 1000 },
        max: { type: Number, default: 72000 },
        multiples: { type: Number, default: 1000 },
        // New: Step-wise quantities (specific discrete quantities)
        // e.g., [1000, 2500, 5000, 10000] - exact quantities available
        stepWiseQuantities: [Number],
        // New: Range-wise quantities (quantity ranges with different pricing)
        // e.g., [{min: 1000, max: 5000, priceMultiplier: 1.0}, {min: 5001, max: 10000, priceMultiplier: 0.9}]
        rangeWiseQuantities: [{
          min: { type: Number, required: true },
          max: { type: Number }, // null means no upper limit
          priceMultiplier: { type: Number, default: 1.0 }, // Price multiplier for this range
          label: String, // Optional display label (e.g., "1,000 - 5,000 units")
        }],
        // Quantity configuration type: "SIMPLE" (min/max/multiples), "STEP_WISE", "RANGE_WISE"
        quantityType: {
          type: String,
          enum: ["SIMPLE", "STEP_WISE", "RANGE_WISE"],
          default: "SIMPLE"
        },
      },
      deliverySpeed: [String], // e.g., ["Standard", "Express"]
      textureType: [String], // Optional, e.g., ["Texture No.1", "Texture No.2", ...]
      // Filter prices - when filterPricesEnabled is true, these prices are used
      filterPricesEnabled: { type: Boolean, default: false }, // Enable/disable filter price effects
      printingOptionPrices: [{
        name: String,
        priceAdd: Number // Price addition per 1000 units (can be negative for discount)
      }],
      deliverySpeedPrices: [{
        name: String,
        priceAdd: Number // Price addition per 1000 units (can be negative for discount)
      }],
      textureTypePrices: [{
        name: String,
        priceAdd: Number // Price addition per 1000 units (can be negative for discount)
      }]
    },

    // Dynamic attributes - references to AttributeType and product-specific configurations
    dynamicAttributes: [
      {
        attributeType: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AttributeType",
          required: true,
        },
        // If this attribute depends on another attribute
        dependsOn: {
          attribute: { type: mongoose.Schema.Types.ObjectId, ref: "AttributeType" },
          value: String
        },
        // Product-specific attribute values (overrides default values if provided)
        customValues: [
          {
            value: String,
            label: String,
            priceMultiplier: Number,
            description: String,
            image: String,
          },
        ],
        // Whether this attribute is enabled for this product
        isEnabled: {
          type: Boolean,
          default: true,
        },
        // Display order for this product
        displayOrder: {
          type: Number,
          default: 0,
        },
        // Whether this attribute is required for this product
        isRequired: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Quantity discount tiers (for dynamic quantity-based pricing)
    quantityDiscounts: [
      {
        minQuantity: { type: Number, required: true },
        maxQuantity: { type: Number }, // null means no upper limit
        discountPercentage: { type: Number, default: 0 }, // Discount percentage
        priceMultiplier: { type: Number, default: 1 }, // Price multiplier (alternative to discount)
      },
    ],

    // File upload constraints
    maxFileSizeMB: { type: Number }, // Maximum file size in MB for staff-uploaded files
    minFileWidth: { type: Number }, // Minimum file width in pixels
    maxFileWidth: { type: Number }, // Maximum file width in pixels
    minFileHeight: { type: Number }, // Minimum file height in pixels
    maxFileHeight: { type: Number }, // Maximum file height in pixels
    blockCDRandJPG: { type: Boolean, default: false }, // Block CDR and JPG file types

    // Sorting order for display in product selection deck
    sortOrder: {
      type: Number,
      default: 0,
    },

    // Additional charges and taxes
    additionalDesignCharge: { type: Number, default: 0 }, // Fixed fee for design help
    gstPercentage: { type: Number, default: 0 }, // GST percentage (required for invoice calculation)
    showPriceIncludingGst: { type: Boolean, default: false }, // If true, show prices including GST; if false, show excluding GST (industry standard)

    // Custom instructions for customers (must follow, otherwise company not responsible)
    instructions: { type: String }, // Custom instructions text that customers must follow
    // Product-specific production sequence (custom department order)
    // If not set, uses default department sequence
    productionSequence: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    }],
  },
  { timestamps: true }
);

// Auto-generate slug from name if not provided
ProductSchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Index for efficient sorting by sortOrder
ProductSchema.index({ sortOrder: 1, createdAt: -1 });
ProductSchema.index({ category: 1, sortOrder: 1 });
ProductSchema.index({ subcategory: 1, sortOrder: 1 });

// Compound index for scoped slug uniqueness within subcategory
// Slug must be unique within the same subcategory
ProductSchema.index({ slug: 1, subcategory: 1 }, { unique: true, sparse: true });

// Compound index for scoped slug uniqueness within category (when no subcategory)
// Slug must be unique within the category when subcategory is null
ProductSchema.index({ slug: 1, category: 1 }, {
  unique: true,
  sparse: true,
  partialFilterExpression: { subcategory: null }
});

export default mongoose.model("Product", ProductSchema);
