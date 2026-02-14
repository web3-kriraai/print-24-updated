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
    // Front image (OPTIONAL - now optional if designFile is provided)
    frontImage: {
      data: Buffer,
      contentType: String,
      filename: String,
      size: Number
    },
    // Back image (OPTIONAL)
    backImage: {
      data: Buffer,
      contentType: String,
      filename: String,
      size: Number
    },
    // Design file (PDF or CDR) - NEW
    designFile: {
      data: Buffer,
      contentType: String,
      filename: String,
      size: Number,
      fileType: { type: String, enum: ['PDF', 'CDR', 'UNKNOWN'] },
      extractedPageCount: { type: Number, default: 0 }
    },
    // Extracted pages from PDF - NEW
    extractedPages: [{
      data: Buffer,
      contentType: String,
      filename: String,
      size: Number,
      pageNumber: Number
    }],
    // Page mapping metadata - NEW
    pageMapping: [{
      pageNumber: Number,
      purpose: String,
      type: { type: String, enum: ['attribute', 'design'] },
      attributeName: String,
      isRequired: Boolean
    }]
  },
  { timestamps: true }
);

export default mongoose.model("Design", designSchema);