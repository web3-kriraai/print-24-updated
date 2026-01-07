import mongoose from "mongoose";

const PrintPartnerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },

    mobileNumber: { type: String, required: true },
    whatsappNumber: String,
    email: { type: String, required: true },

    gstNumber: String,

    address: {
      fullAddress: String,
      city: String,
      state: String,
      pincode: String
    },

    proofDocument: {
      type: String, // Cloudinary / S3 URL
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

export default mongoose.model("PrintPartnerProfile", PrintPartnerProfileSchema);
