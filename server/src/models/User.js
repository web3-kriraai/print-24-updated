import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: false }, // Made optional for customer signup
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    mobileNumber: { type: String, required: false },
    address: { type: String, required: false },
    countryCode: { type: String, required: false },
    role: { type: String, enum: ["user", "admin", "emp", "designer"], default: "user" },
    password: { type: String, required: false }, // Optional - set later in signup flow
    userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    userType: { type: String, default: "customer" },
    profileImage: { type: String, default: null },

    // ========== Dynamic Segment System ==========
    // Replaced hardcoded signupIntent enum with flexible segment code
    signupIntent: {
      type: String,
      // No longer an enum - can be any segment code (CUSTOMER, PRINT_PARTNER, CORPORATE, VIP, etc.)
      uppercase: true,
      trim: true,
    },

    // Application reference (if user applied through a form)
    segmentApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SegmentApplication",
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

    /* =====================
       PAYMENT ACCOUNTS (for split payments)
    ====================== */
    payment_accounts: [{
      gateway: {
        type: String,
        enum: ['RAZORPAY', 'STRIPE', 'PHONEPE', 'PAYU', 'CASHFREE']
      },
      account_id: String,      // Gateway's linked account ID
      account_type: {
        type: String,
        enum: ['ROUTE', 'CONNECT', 'SPLIT']  // Razorpay Route, Stripe Connect, etc.
      },
      verified: {
        type: Boolean,
        default: false
      },
      verification_data: mongoose.Schema.Types.Mixed,
      created_at: {
        type: Date,
        default: Date.now
      }
    }],

    /* =====================
       🔧 COMPLAINT MANAGEMENT SYSTEM
       Added: 2026-02-04
       Purpose: Staff time limit tracking for complaint registration
    ====================== */
    staffLevel: {
      type: String,
      enum: ["SUPPORT_OFFICER", "SENIOR_SUPPORT", "TEAM_LEADER", "MANAGER", "ADMIN", null],
      default: null,
    },

    allowedComplaintRegistrationDays: {
      type: Number,
      // Auto-calculated based on staffLevel
      // SUPPORT_OFFICER: 15-20, SENIOR_SUPPORT/TEAM_LEADER: 25, MANAGER: 30, ADMIN: null
    },

    payout_preferences: {
      default_bank_account: {
        account_number_masked: String,  // Last 4 digits only
        ifsc_code: String,
        account_holder: String,
        bank_name: String
      },
      upi_id: String,
      auto_payout: {
        type: Boolean,
        default: false
      },
      payout_threshold: {
        type: Number,
        default: 1000  // Minimum balance for auto-payout
      },
      payout_schedule: {
        type: String,
        enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
        default: 'WEEKLY'
      }
    },

    /* =====================
       DESIGNER SESSION SETTINGS
       Added: 2026-02-16
    ====================== */
    sessionSettings: {
      baseDuration: { type: Number, default: 900 }, // default 15 mins (900s)
      basePrice: { type: Number, default: 500 },    // default ₹500
      extensionDuration: { type: Number, default: 900 }, // default 15 mins (900s)
      extensionPrice: { type: Number, default: 300 }     // default ₹300
    },

    /* =====================
       PHYSICAL DESIGNER VISIT FIELDS
       Added: 2026-02-18
       Purpose: Hourly rate for physical visits + cumulative earnings tracking
    ====================== */
    // hourlyRate: snapshotted into PhysicalDesignerBooking at booking time.
    // Only admin should be able to update this field.
    hourlyRate: {
      type: Number,
      default: 500, // Default ₹500/hr
      min: 0
    },
    // Cumulative hours worked across all completed physical visits
    totalHoursWorked: {
      type: Number,
      default: 0,
      min: 0
    },
    // Cumulative earnings across all completed physical visits
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    // Track if the designer is online and available for pickups
    isOnline: {
      type: Boolean,
      default: false
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

