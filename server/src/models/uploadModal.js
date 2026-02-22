import mongoose from "mongoose";

const designSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    // Safe area (critical content must be within this area)
    safeArea: {
      top: { type: Number, default: 0 },
      bottom: { type: Number, default: 0 },
      left: { type: Number, default: 0 },
      right: { type: Number, default: 0 }
    },
    // Bleed area (extra area that gets trimmed off)
    bleedArea: {
      top: { type: Number, default: 0 },
      bottom: { type: Number, default: 0 },
      left: { type: Number, default: 0 },
      right: { type: Number, default: 0 }
    },
    // Front image (COMPULSORY)
    frontImage: {
      data: { type: Buffer, required: true }, // Required
      contentType: { type: String, required: true }, // Required
      filename: String,
      size: Number
    },
    // Back image (OPTIONAL)
    backImage: {
      data: Buffer,
      contentType: String,
      filename: String,
      size: Number
    }
  },
  { timestamps: true }
);

export default mongoose.model("Design", designSchema);