import mongoose from "mongoose";

const CorporateProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    organizationName: { type: String, required: true },

    organizationType: {
      type: String,
      enum: [
        "PRIVATE_LIMITED",
        "LLP",
        "LIMITED",
        "GOVERNMENT",
        "HOSPITAL",
        "SCHOOL",
        "INSTITUTE",
        "NGO",
        "FRANCHISE",
        "OTHER"
      ],
      required: true
    },

    authorizedPersonName: { type: String, required: true },

    designation: {
      type: String,
      enum: [
        "PURCHASE_MANAGER",
        "MARKETING_HEAD",
        "ADMIN",
        "FINANCE_MANAGER",
        "DIRECTOR",
        "OTHER"
      ],
      required: true
    },

    mobileNumber: { type: String, required: true },
    whatsappNumber: String,
    officialEmail: { type: String, required: true },

    gstNumber: { type: String, required: true },

    address: {
      fullAddress: String,
      city: String,
      state: String,
      pincode: String
    },

    proofDocument: {
      type: String, // Letterhead / PO / ID
      required: true
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    verifiedAt: Date
  },
  { timestamps: true }
);

export default mongoose.model("CorporateProfile", CorporateProfileSchema);
