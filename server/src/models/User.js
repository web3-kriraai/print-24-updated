import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: false }, // Made optional for customer signup
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    mobileNumber: { type: String, required: false },
    countryCode: { type: String, required: false },
    role: { type: String, enum: ["user", "admin", "emp"], default: "user" },
    password: { type: String, required: false }, // Optional - set later in signup flow
    userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    userType: { type: String, enum: ["customer", "print partner", "corporate"], default: "customer" },
    signupIntent: {
      type: String,
      enum: ["CUSTOMER", "PRINT_PARTNER", "CORPORATE"],
      required: true
    },
    // Email verification fields
    isEmailVerified: { type: Boolean, default: false },
    emailOtp: { type: String }, // Hashed OTP
    emailOtpExpiresAt: { type: Date },

    /* =====================
       NEW FIELDS - Dynamic PMS
    ====================== */
    userTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserType",
      index: true,
    },

    /* =====================
       FINANCIAL
    ====================== */
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentTerms: {
      type: String,
      // e.g., "NET30", "PREPAID", "COD"
    },

    walletBalance: {
      type: Number,
      default: 0,
    },

    commissionRate: {
      type: Number,
      min: 0,
      max: 100,
      // For agents/distributors
    },

    /* =====================
       TERRITORY (for distributors/branches)
    ====================== */
    territoryAccess: [
      {
        type: String,
        // Pincode or zone codes
      },
    ],

    /* =====================
       HUB & CLIENT MANAGEMENT
    ====================== */
    assignedHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InternalHub",
      // For delivery agents
    },

    clients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // For agents managing clients
      },
    ],

    /* =====================
       BRAND KIT
    ====================== */
    brandKit: {
      logo: String,
      primaryColor: String,
      secondaryColor: String,
      fonts: [String],
      templates: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Design",
        },
      ],
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
userSchema.index({ userTypeId: 1, territoryAccess: 1 });
userSchema.index({ commissionRate: 1 });
userSchema.index({ assignedHub: 1 });

export const User = mongoose.model("User", userSchema);

