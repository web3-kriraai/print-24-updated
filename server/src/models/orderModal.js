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
          data: Buffer, // Base64 image data
          contentType: String, // MIME type (e.g., "image/png")
          filename: String, // Original filename
        }], // Images uploaded by user for this attribute
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["request", "production_ready", "approved", "processing", "completed", "cancelled", "rejected"],
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
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    uploadedDesign: {
      frontImage: {
        data: Buffer,
        contentType: String,
        filename: String,
      },
      backImage: {
        data: Buffer,
        contentType: String,
        filename: String,
      },
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
    // Courier & Delivery
    courierPartner: {
      type: String,
      default: null,
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
      enum: ["in_transit", "out_for_delivery", "delivered"],
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
        status: String, // e.g., "received_at_origin", "in_transit", "out_for_delivery", "delivered"
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
      enum: ["pending", "partial", "completed"],
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

