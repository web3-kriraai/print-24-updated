import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: {
      type: String,
      required: false, // Will be auto-generated in pre-save hook
      unique: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    finish: {
      type: String,
      required: true,
    },
    shape: {
      type: String,
      required: true,
    },
    selectedOptions: [
      {
        optionId: String,
        optionName: String,
        priceAdd: Number,
        description: String, // Option description
        image: String, // Option image URL if available
      },
    ],
    // Selected dynamic attributes with complete information
    selectedDynamicAttributes: [
      {
        attributeTypeId: String, // Reference to AttributeType
        attributeName: String, // Name of the attribute (e.g., "Paper GSM", "Lamination Type")
        attributeValue: mongoose.Schema.Types.Mixed, // Can be String, Number, Array, etc.
        label: String, // Display label for the selected value
        priceMultiplier: Number, // Price multiplier if applicable
        priceAdd: Number, // Additional price if applicable
        description: String, // Description of the selected value
        image: String, // Image URL if available
        uploadedImages: [{
          // Legacy Buffer storage (for backward compatibility)
          data: Buffer, // Base64 image data
          contentType: String, // MIME type (e.g., "image/png")
          filename: String, // Original filename
          // New Cloudinary URL storage
          url: String,
          publicId: String,
        }], // Images uploaded by user for this attribute
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    /* =====================
       🔒 PRICE SNAPSHOT (IMMUTABLE)
    ====================== */
    priceSnapshot: {
      type: {
        basePrice: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },

        appliedModifiers: [
          {
            pricingKey: String,
            modifierType: {
              type: String,
              enum: ["PERCENT_INC", "PERCENT_DEC", "FLAT_INC", "FLAT_DEC", "FIXED"],
            },
            value: Number,
            source: {
              type: String,
              enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE", "PROMO_CODE", "ZONE_BOOK", "SEGMENT_BOOK", "COMBINATION", "USER", "CATEGORY", "MODIFIER"],
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

        subtotal: { type: Number, default: 0 },
        gstPercentage: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 },
        shippingCost: { type: Number, default: 0 },
        totalPayable: { type: Number, default: 0 },

        currency: { type: String, default: "INR" },
        calculatedAt: { type: Date, default: Date.now },
      },
      required: false, // Optional for backward compatibility with old orders
      immutable: true,
    },

    status: {
      type: String,
      enum: ["request", "confirmed", "production_ready", "approved", "processing", "completed", "cancelled", "rejected"],
      default: "request",
    },
    // Track which department is currently working on this order
    currentDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    // Track the current department index in the sequence (0-based)
    currentDepartmentIndex: {
      type: Number,
      default: null,
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    pincode: {
      type: String,
      required: false,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "India",
    },
    address: {
      type: String,
      required: false,
      default: "",
    },
    mobileNumber: {
      type: String,
      required: false,
      default: "",
    },
    uploadedDesign: {
      frontImage: {
        // Legacy Buffer storage (for backward compatibility)
        data: Buffer,
        contentType: String,
        filename: String,
        // New Cloudinary URL storage
        url: String,
        publicId: String,
      },
      backImage: {
        // Legacy Buffer storage (for backward compatibility)
        data: Buffer,
        contentType: String,
        filename: String,
        // New Cloudinary URL storage
        url: String,
        publicId: String,
      },
      // PDF file storage (Cloudinary only)
      pdfFile: {
        url: String,
        publicId: String,
        filename: String,
        pageCount: Number,
        pageMapping: [{
          pageNumber: Number,
          purpose: String,
          type: {
            type: String,
            enum: ['attribute', 'design'],
          },
          attributeName: String,
          isRequired: Boolean,
        }],
      },
    },
    // Designer Integration Fields
    needDesigner: {
      type: Boolean,
      default: false,
    },
    designerType: {
      type: String,
      enum: ["visual", "physical", null],
      default: null,
    },
    designStatus: {
      type: String,
      enum: ["PendingDesign", "InDesign", "FinalReady", null],
      default: null,
    },
    visitType: {
      type: String,
      enum: ["Home", "Office", null],
      default: null,
    },
    designForm: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    finalPdfUrl: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    // Department-level status tracking
    departmentStatuses: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "in_progress", "paused", "completed", "stopped"],
          default: "pending",
        },
        whenAssigned: {
          type: Date,
          default: null,
        },
        startedAt: {
          type: Date,
          default: null,
        },
        pausedAt: {
          type: Date,
          default: null,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        stoppedAt: {
          type: Date,
          default: null,
        },
        operator: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        notes: {
          type: String,
          default: "",
        },
      },
    ],
    // Production workflow timeline
    productionTimeline: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
        },
        action: {
          type: String,
          enum: ["requested", "started", "paused", "resumed", "stopped", "completed"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        operator: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: String,
      },
    ],
    // Design & File Preparation fields
    designOption: {
      type: String,
      enum: ["need_designer", "upload_own"],
      default: null,
    },
    designerAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    designFileSentAt: {
      type: Date,
      default: null,
    },
    customerResponse: {
      type: String,
      enum: ["approved", "change_requested", "pending"],
      default: null,
    },
    fileUploadedAt: {
      type: Date,
      default: null,
    },
    fileStatus: {
      type: String,
      enum: ["under_checking", "approved_for_print", "reupload_required"],
      default: null,
    },
    fileRejectionReason: {
      type: String,
      default: "",
    },
    designTimeline: [
      {
        action: String, // e.g., "designer_received", "first_design_shared", "customer_approved", "final_file_confirmed"
        timestamp: {
          type: Date,
          default: Date.now,
        },
        operator: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: String,
      },
    ],
    // Production details
    productionStartedAt: {
      type: Date,
      default: null,
    },
    productionDetails: {
      plateMakingStarted: Date,
      plateMakingCompleted: Date,
      printingStarted: Date,
      printingCompleted: Date,
      laminationCompleted: Date,
      uvCompleted: Date,
      embossedUvCompleted: Date,
      textureCompleted: Date,
      foilingCompleted: Date,
      dieCuttingCompleted: Date,
      normalCuttingCompleted: Date,
      qualityCheckCompleted: Date,
    },
    // Packing & Dispatch
    movedToPackingAt: {
      type: Date,
      default: null,
    },
    packedAt: {
      type: Date,
      default: null,
    },
    packedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    numberOfBoxes: {
      type: Number,
      default: 0,
    },
    movedToDispatchAt: {
      type: Date,
      default: null,
    },
    handedOverToCourierAt: {
      type: Date,
      default: null,
    },
    // Invoice
    invoiceNumber: {
      type: String,
      default: null,
    },
    invoiceGeneratedAt: {
      type: Date,
      default: null,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    // Shiprocket Integration
    shiprocketOrderId: {
      type: String,
      default: null,
    },
    shiprocketShipmentId: {
      type: String,
      default: null,
    },
    awbCode: {
      type: String,
      default: null,
    },
    isMockShipment: {
      type: Boolean,
      default: false,
    },
    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },
    pickupScheduledDate: {
      type: Date,
      default: null,
    },
    // Courier & Delivery
    courierPartner: {
      type: String,
      default: null,
    },
    pickupWarehouseName: {
      type: String,
      default: null,
      // Name of the warehouse used for pickup (resolved from GeoZone by admin)
    },
    pickupWarehousePincode: {
      type: String,
      default: null,
      // Pincode of the pickup warehouse
    },
    trackingId: {
      type: String,
      default: null,
    },
    dispatchedAt: {
      type: Date,
      default: null,
    },
    courierStatus: {
      type: String,
      enum: [
        "shipment_created", "pickup_scheduled", "pickup_completed",
        "in_transit", "out_for_delivery", "delivered",
        "return_to_origin", "cancelled"
      ],
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    courierTrackingUrl: {
      type: String,
      default: null,
    },
    courierTimeline: [
      {
        status: String,
        location: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    // Payment
    advancePaid: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "completed", "COMPLETED", "FAILED"],
      default: "pending",
    },
    paymentGatewayInvoiceId: {
      type: String,
      default: null,
    },
    // Legacy product specifications (kept for backward compatibility)
    // These are now stored in selectedDynamicAttributes, but kept here for existing orders
    paperGSM: {
      type: String,
      default: null,
    },
    paperQuality: {
      type: String,
      default: null,
    },
    laminationType: {
      type: String,
      default: null,
    },
    specialEffects: [{
      type: String, // e.g., "UV", "Embossed UV", "Texture", "Foiling", "Die-cut shape"
    }],
    /* =====================
       📦 BULK ORDER TRACKING
    ====================== */
    isBulkParent: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBulkChild: {
      type: Boolean,
      default: false,
      index: true,
    },
    childOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    bulkOrderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BulkOrder",
      index: true,
    },
    distinctDesigns: {
      type: Number,
      default: 1,
    },
    designSequence: {
      type: Number,
      default: null,
    },
    parentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
OrderSchema.index({ status: 1 }); // For filtering by status
OrderSchema.index({ user: 1 }); // For getMyOrders
OrderSchema.index({ user: 1, createdAt: -1 }); // Compound index for getMyOrders with sorting - CRITICAL for performance
OrderSchema.index({ "departmentStatuses.department": 1 }); // For getDepartmentOrders
OrderSchema.index({ createdAt: -1 }); // For sorting by creation date
OrderSchema.index({ status: 1, "departmentStatuses.department": 1 }); // Compound index for getDepartmentOrders
OrderSchema.index({ currentDepartment: 1 }); // For tracking current department
OrderSchema.index({ isBulkParent: 1 });
OrderSchema.index({ isBulkChild: 1 });
OrderSchema.index({ bulkOrderRef: 1 });
OrderSchema.index({ parentOrderId: 1 });

// Generate unique order number before saving (always generate if not provided)
OrderSchema.pre("save", async function (next) {
  // Only generate if orderNumber is not already set
  if (!this.orderNumber || this.orderNumber.trim() === "") {
    try {
      // Use a combination of timestamp and random number for uniqueness
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      this.orderNumber = `ORD-${timestamp}-${String(random).padStart(4, "0")}`;
    } catch (error) {
      // Fallback: use timestamp and random if anything fails
      this.orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
    }
  }
  next();
});

export default mongoose.model("Order", OrderSchema);

