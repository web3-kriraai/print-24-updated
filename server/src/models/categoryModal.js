import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    image: String,
    type: {
      type: String,
      required: true,
      enum: ["Digital", "Bulk"],
      default: "Digital",
    },
    // Optional parent category for unlimited depth hierarchy
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // Sort order for displaying subcategories (lower numbers appear first)
    sortOrder: {
      type: Number,
      default: 0,
    },
    // Slug for URL-friendly identifiers (optional, auto-generated if not provided)
    slug: {
      type: String,
      unique: true,
      sparse: true, // Allow null values for uniqueness
    },
  },
  { timestamps: true }
);

// Index for faster parent queries
CategorySchema.index({ parent: 1 });
CategorySchema.index({ type: 1, parent: 1 });
CategorySchema.index({ parent: 1, sortOrder: 1 }); // For sorting children by order

export default mongoose.model("Category", CategorySchema);
