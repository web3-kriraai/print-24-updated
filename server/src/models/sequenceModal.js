import mongoose from "mongoose";

const SequenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Keep subcategory for backward compatibility during migration (will be removed later)
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: false,
    },
    departments: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
      },
    ],
    attributes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttributeType",
      },
    ],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for faster queries
SequenceSchema.index({ category: 1, subcategory: 1 });
SequenceSchema.index({ isDefault: 1 });

export default mongoose.model("Sequence", SequenceSchema);


