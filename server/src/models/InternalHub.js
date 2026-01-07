import mongoose from "mongoose";

/**
 * InternalHub Schema
 * 
 * For delivery hub management - represents physical locations
 * that handle order fulfillment and delivery.
 */

const InternalHubSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================
       MANAGEMENT
    ====================== */
    managerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /* =====================
       SERVICE AREA
    ====================== */
    serviceablePincodes: [
      {
        type: String,
        trim: true,
      },
    ],

    /* =====================
       CONTACT
    ====================== */
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    alternateContactNumber: String,

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    /* =====================
       STATUS
    ====================== */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /* =====================
       CAPACITY
    ====================== */
    capacity: {
      maxOrders: Number,
      maxAgents: Number,
    },

    /* =====================
       OPERATING HOURS
    ====================== */
    operatingHours: {
      start: String, // e.g., "09:00"
      end: String,   // e.g., "18:00"
      timezone: { type: String, default: "Asia/Kolkata" },
    },

    holidays: [Date],
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
InternalHubSchema.index({ isActive: 1 });
InternalHubSchema.index({ serviceablePincodes: 1 });

/* =====================
   METHODS
====================== */

/**
 * Check if pincode is serviceable by this hub
 */
InternalHubSchema.methods.canServicePincode = function (pincode) {
  if (!this.isActive) return false;
  return this.serviceablePincodes.includes(pincode);
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Find hub that can service a given pincode
 */
InternalHubSchema.statics.findByPincode = async function (pincode) {
  return await this.findOne({
    isActive: true,
    serviceablePincodes: pincode,
  });
};

export default mongoose.model("InternalHub", InternalHubSchema);
