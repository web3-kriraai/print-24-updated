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
      type: {
        basePrice: { type: Number, required: true },
        unitPrice: { type: Number, required: true },  // Same as basePrice
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
              enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE", "PROMO_CODE"],
            },
            modifierId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "PriceModifier",
            },
            beforeAmount: Number,
            afterAmount: Number,
            reason: String,
            appliesOn: {
              type: String,
              enum: ["UNIT", "SUBTOTAL"],
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
      required: true,
      immutable: true,  // 🚨 CRITICAL: Prevents price tampering
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
      enum: [
        "PENDING",           // Awaiting payment
        "PARTIAL",           // Partial payment received
        "COMPLETED",         // Full payment received
        "FAILED",            // Payment failed
        "REFUNDED",          // Fully refunded
        "PARTIALLY_REFUNDED" // Partial refund issued
      ],
      default: "PENDING",
      index: true,
    },

    paymentGatewayInvoiceId: String,

    // Enhanced payment tracking
    payment_details: {
      // Reference to PaymentTransaction
      transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PaymentTransaction"
      },

      // Gateway used for this order
      gateway_used: {
        type: String,
        enum: ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYU', 'CASHFREE']
      },

      // Payment method used
      payment_method: {
        type: String,
        enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'QR', 'BANK_TRANSFER', 'EMI', 'COD', 'CREDIT']
      },

      // Capture timestamp
      captured_at: Date,

      // Total paid amount
      amount_paid: {
        type: Number,
        default: 0
      },

      // Refund summary
      refund_summary: {
        total_refunded: { type: Number, default: 0 },
        refund_count: { type: Number, default: 0 },
        last_refund_at: Date
      },

      // For split payments
      split_details: {
        is_split: { type: Boolean, default: false },
        platform_amount: Number,  // Amount retained by platform
        vendor_amount: Number,    // Amount to vendor/partner
        vendor_id: mongoose.Schema.Types.ObjectId
      }
    },


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

    /* =====================
       NEW FIELDS - Production & Logistics
    ====================== */
    productionJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionJob",
      index: true,
    },

    docketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Docket",
      index: true,
    },

    logisticsProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LogisticsProvider",
    },

    trackingId: String,

    /* =====================
       DELIVERY TRACKING
    ====================== */
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,

    deliveryStatus: {
      type: String,
      enum: ["PENDING", "DISPATCHED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    deliveryOTP: String,

    /* =====================
       ORDER HIERARCHY (for bulk orders)
    ====================== */
    isPriority: {
      type: Boolean,
      default: false,
    },

    parentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      // For bulk orders (30-in-1)
    },

    childOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        // For split bulk orders
      },
    ],

    /* =====================
       DESIGNER SERVICE
    ====================== */
    designerSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DesignerSession",
    },

    /* =====================
       PAYMENT & ERP
    ====================== */
    paymentGatewayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentGateway",
    },

    zohoInvoiceId: String,

    /* =====================
       DELIVERY RATING
    ====================== */
    deliveryRating: {
      agentRating: { type: Number, min: 1, max: 5 },
      customerRating: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date,
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
// New indexes for delivery and production tracking
OrderSchema.index({ deliveryStatus: 1, estimatedDeliveryDate: 1 });
OrderSchema.index({ productionJobId: 1, status: 1 });
OrderSchema.index({ docketId: 1 });
OrderSchema.index({ parentOrderId: 1 });

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

/* =====================
   BACKWARD COMPATIBILITY
====================== */
// Virtual field for legacy code that references totalPrice
OrderSchema.virtual('totalPrice').get(function () {
  return this.priceSnapshot?.totalPayable || 0;
});

// Ensure virtuals are included in JSON and Object representations
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

export default mongoose.model("Order", OrderSchema);
