import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
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
