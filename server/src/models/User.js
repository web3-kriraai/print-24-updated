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
    password: { type: String, required: true },
    userType: { 
      type: String, 
      enum: ["customer", "print partner", "CORPORATE MEMBER"], 
      default: "customer" 
    },
    // Print Partner specific fields
    businessName: { type: String, required: false },
    ownerName: { type: String, required: false },
    whatsappNumber: { type: String, required: false },
    gstNumber: { type: String, required: false, unique: true, sparse: true }, // Unique but optional
    fullBusinessAddress: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    pincode: { type: String, required: false },
    proofFileUrl: { type: String, required: false },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
