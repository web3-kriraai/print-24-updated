import mongoose from "mongoose";
import JSONRuleEvaluator from '../services/JSONRuleEvaluator.js';

/**
 * PriceModifier Schema (Enhanced)
 * 
 * Supports both:
 * 1. Automatic pricing adjustments (zone, segment, product, attribute)
 * 2. Promotional offers with codes and usage limits
 */

const PriceModifierSchema = new mongoose.Schema({
  /* =======================
     BASIC INFO
  ======================= */
  name: {
    type: String,
    trim: true,
    index: true
  },

  description: {
    type: String,
    trim: true
  },

  /* =======================
     PROMO CODE (Optional)
     If set, modifier requires code to apply
  ======================= */
  code: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true,  // Allow null, but unique if present
    index: true
  },

  /* =======================
     SCOPE
  ======================= */
  appliesTo: {
    type: String,
    enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE", "COMBINATION", "USER", "CATEGORY"],
    required: true,
  },

  // Layer 1: Geo Zone targeting
  geoZone: { type: mongoose.Schema.Types.ObjectId, ref: "GeoZone" },

  // Layer 2: User Segment targeting
  userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },

  // Layer 3: Individual User targeting (for personal discounts)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

  // Layer 4: Product targeting
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

  // Layer 5: Product Type targeting (Digital, Physical, Service)
  productType: {
    type: String,
    enum: ["DIGITAL", "PHYSICAL", "SERVICE", null],
    default: null,
    index: true,
  },

  // Layer 6: Category targeting
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },

  // Layer 7: Sub-Category targeting
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", index: true },

  // Attribute targeting (for variant-specific pricing)
  attributeType: { type: mongoose.Schema.Types.ObjectId, ref: "AttributeType" },
  attributeValue: String,

  /* =======================
     JSON-BASED COMBINATION RULES
     For complex targeting with AND/OR logic
  ======================= */
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: "JSON logic for combination modifiers"
  },

  /* =======================
     APPLICATION SCOPE (CRITICAL)
  ======================= */
  appliesOn: {
    type: String,
    enum: ["UNIT", "SUBTOTAL"],
    default: "UNIT",
    index: true,
    // UNIT: Applies to unit price (ZONE, SEGMENT, PRODUCT, ATTRIBUTE)
    // SUBTOTAL: Applies to cart total (PROMO_CODE, CART-LEVEL)
  },

  /* =======================
     MODIFIER TYPE & VALUE
  ======================= */
  modifierType: {
    type: String,
    enum: ["PERCENT_INC", "PERCENT_DEC", "FLAT_INC", "FLAT_DEC"],
    required: true
  },

  value: {
    type: Number,
    required: true,
    min: 0
  },

  /* =======================
     QUANTITY CONSTRAINTS
  ======================= */
  minQuantity: Number,
  maxQuantity: Number,

  /* =======================
     USAGE LIMITS (for promo codes)
  ======================= */
  maxUses: {
    type: Number,
    min: 0
  },

  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },

  maxUsesPerUser: {
    type: Number,
    min: 0
  },

  minOrderValue: {
    type: Number,
    min: 0
  },

  maxDiscountAmount: {
    type: Number,
    min: 0
  },

  /* =======================
     VALIDITY PERIOD
  ======================= */
  validFrom: {
    type: Date,
    index: true
  },

  validTo: {
    type: Date,
    index: true
  },

  /* =======================
     STACKING BEHAVIOR
  ======================= */
  isStackable: {
    type: Boolean,
    default: true,
    index: true
  },

  /** higher = stronger */
  priority: {
    type: Number,
    default: 0,
    index: true
  },

  /* =======================
     STATUS
  ======================= */
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  /* =======================
     METADATA
  ======================= */
  /** Optional but VERY useful */
  reason: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  tags: [{
    type: String,
    trim: true
  }],

  /* =======================
     NEW FIELDS - 7-Layer Pricing Support
  =======================*/
  isExclusive: {
    type: Boolean,
    default: false,
  },

  timeBased: {
    validFrom: Date,
    validTo: Date,
    daysOfWeek: [Number],
    timeSlots: [String],
  },

  stackingRules: {
    maxStackable: Number,
    excludeModifiers: [{ type: mongoose.Schema.Types.ObjectId, ref: "PriceModifier" }],
  },

  /* =======================
     CONFLICT RESOLUTION TRACKING
  ======================= */
  conflictResolution: {
    // Reference to the price change that triggered this override
    parentOverrideId: { type: mongoose.Schema.Types.ObjectId, ref: "PriceModifier" },
    // How the conflict was resolved
    resolutionAction: {
      type: String,
      enum: ["OVERWRITE", "PRESERVE_CHILD", "RELATIVE_ADJUST", null],
      default: null,
    },
    // Who resolved it
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // When it was resolved
    resolvedAt: Date,
    // Original price before resolution
    originalPrice: Number,
  }

}, { timestamps: true });

/* =======================
   INDEXES
======================= */
PriceModifierSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
PriceModifierSchema.index({ code: 1, isActive: 1 });
PriceModifierSchema.index({ appliesTo: 1, isStackable: 1, priority: -1 });

/* =======================
   METHODS
======================= */

/**
 * Check if modifier is currently valid
 */
PriceModifierSchema.methods.isValid = function () {
  const now = new Date();

  // Check active status
  if (!this.isActive) return false;

  // Check date range (if specified)
  if (this.validFrom && this.validFrom > now) return false;
  if (this.validTo && this.validTo < now) return false;

  // Check usage limits
  if (this.maxUses && this.usedCount >= this.maxUses) return false;

  return true;
};

/**
 * Check if modifier matches given context
 */
PriceModifierSchema.methods.matchesContext = function (context) {
  // Check validity first
  if (!this.isValid()) return false;

  // Check min order value
  if (this.minOrderValue && context.subtotal < this.minOrderValue) {
    return false;
  }

  // Check quantity constraints
  if (this.minQuantity && context.quantity < this.minQuantity) return false;
  if (this.maxQuantity && context.quantity > this.maxQuantity) return false;

  // Check scope matching
  switch (this.appliesTo) {
    case 'GLOBAL':
      return true;  // Always applies

    case 'ZONE':
      return this.geoZone && context.geoZoneId &&
        this.geoZone.toString() === context.geoZoneId.toString();

    case 'SEGMENT':
      return this.userSegment && context.userSegmentId &&
        this.userSegment.toString() === context.userSegmentId.toString();

    case 'PRODUCT':
      return this.product && context.productId &&
        this.product.toString() === context.productId.toString();

    case 'ATTRIBUTE':
      if (!this.attributeType || !context.selectedAttributes) return false;
      return context.selectedAttributes.some(attr =>
        attr.attributeType === this.attributeType.toString() &&
        attr.value === this.attributeValue
      );
    
    case 'COMBINATION':
      if (!this.conditions) {
        console.log(`⚠️ COMBINATION modifier ${this._id} has no conditions`);
        return false;
      }
      try {
        const evaluator = new JSONRuleEvaluator();
        const matches = evaluator.evaluate(this.conditions, context);
        console.log(`${matches ? '✅' : '⏭️'} COMBINATION modifier ${this._id} ${matches ? 'matches' : 'does not match'} context`);
        return matches;
      } catch (error) {
        console.error(`❌ Error evaluating COMBINATION modifier ${this._id}:`, error);
        return false;
      }

    default:
      return false;
  }
};

/**
 * Calculate discount/increase amount for given subtotal
 */
PriceModifierSchema.methods.calculateAdjustment = function (subtotal) {
  let adjustment = 0;

  switch (this.modifierType) {
    case 'PERCENT_INC':
      adjustment = (subtotal * this.value) / 100;
      break;
    case 'PERCENT_DEC':
      adjustment = -(subtotal * this.value) / 100;
      break;
    case 'FLAT_INC':
      adjustment = this.value;
      break;
    case 'FLAT_DEC':
      adjustment = -this.value;
      break;
  }

  // Apply max discount cap if set (only for decreases)
  if (adjustment < 0 && this.maxDiscountAmount) {
    adjustment = Math.max(adjustment, -this.maxDiscountAmount);
  }

  return Math.round(adjustment * 100) / 100;  // Round to 2 decimals
};

export default mongoose.model("PriceModifier", PriceModifierSchema);