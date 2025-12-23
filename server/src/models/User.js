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
    userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    signupIntent: {
      type: String,
      enum: ["CUSTOMER", "PRINT_PARTNER", "CORPORATE"],
      required: true
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
