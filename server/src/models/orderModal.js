import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    /* =====================
       CORE REFERENCES
    ====================== */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    /* =====================
       INPUT SIGNALS (NO PRICE LOGIC)
    ====================== */
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    selectedDynamicAttributes: [
      {
        attributeType: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AttributeType",
          required: true,
        },

        attributeName: String,

        pricingKey: {
          type: String, // 🔑 connects to pricing engine
          required: true,
        },

        value: mongoose.Schema.Types.Mixed,
        label: String,

        uploadedImages: [
          {
            data: Buffer,
            contentType: String,
            filename: String,
          },
        ],
      },
    ],

    /* =====================
       🔒 PRICE SNAPSHOT (IMMUTABLE)
    ====================== */
    priceSnapshot: {
      basePrice: { type: Number, required: true },

      quantity: { type: Number, required: true },

      appliedModifiers: [
        {
          pricingKey: String,
          modifierType: {
            type: String,
            enum: ["PERCENT_INC", "PERCENT_DEC", "FLAT_INC", "FLAT_DEC"],
          },
          value: Number,
          source: {
            type: String,
            enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE"],
          },
          modifierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PriceModifier",
          },
        },
      ],

      subtotal: { type: Number, required: true },
      gstPercentage: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      totalPayable: { type: Number, required: true },

      currency: { type: String, default: "INR" },
      calculatedAt: { type: Date, default: Date.now },
    },

    /* =====================
       ORDER STATUS FLOW
    ====================== */
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "DESIGN",
        "APPROVED",
        "PRODUCTION",
        "QC",
        "PACKED",
        "DISPATCHED",
        "DELIVERED",
        "CANCELLED",
        "REJECTED",
      ],
      default: "REQUESTED",
      index: true,
    },

    currentDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    /* =====================
       DELIVERY
    ====================== */
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    mobileNumber: { type: String, required: true },

    /* =====================
       PAYMENT
    ====================== */
    advancePaid: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "COMPLETED"],
      default: "PENDING",
    },

    paymentGatewayInvoiceId: String,

    /* =====================
       LEGACY FIELDS (DO NOT DELETE)
    ====================== */
    paperGSM: String,
    laminationType: String,
    specialEffects: [String],

    /* =====================
       AUDIT
    ====================== */
    notes: String,
    adminNotes: String,
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });

/* =====================
   ORDER NUMBER
====================== */
OrderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 10000);
    this.orderNumber = `ORD-${ts}-${rand.toString().padStart(4, "0")}`;
  }
  next();
});

export default mongoose.model("Order", OrderSchema);
