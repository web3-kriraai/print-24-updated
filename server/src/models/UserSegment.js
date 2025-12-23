import mongoose from "mongoose";

const UserSegmentSchema = new mongoose.Schema({
  code: {
    type: String,
    enum: ["RETAIL", "PRINT_PARTNER", "CORPORATE", "VIP"],
    unique: true,
    required: true
  },
  name: String,
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("UserSegment", UserSegmentSchema);
