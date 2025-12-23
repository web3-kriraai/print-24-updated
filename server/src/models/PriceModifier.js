const PriceModifierSchema = new mongoose.Schema({
  appliesTo: {
    type: String,
    enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE"],
    required: true
  },

  geoZone: { type: mongoose.Schema.Types.ObjectId, ref: "GeoZone" },
  userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

  attributeType: { type: mongoose.Schema.Types.ObjectId, ref: "AttributeType" },
  attributeValue: String,

  modifierType: {
    type: String,
    enum: ["PERCENT_INC", "PERCENT_DEC", "FLAT_INC", "FLAT_DEC"],
    required: true
  },

  value: {
    type: Number,
    required: true
  },

  minQuantity: Number,
  maxQuantity: Number,

  validFrom: Date,
  validTo: Date,

  isStackable: {
    type: Boolean,
    default: true
  },

  /** higher = stronger */
  priority: {
    type: Number,
    default: 0
  },

  isActive: {
    type: Boolean,
    default: true
  },

  /** Optional but VERY useful */
  reason: String

}, { timestamps: true });

export default mongoose.model("PriceModifier", PriceModifierSchema);