import mongoose from "mongoose";

const SubCategorySchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Optional parent subcategory for nested subcategories (unlimited depth)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
    },
    name: { type: String, required: true },
    description: String,
    image: String, // Image URL
    slug: { type: String, unique: true }, // URL-friendly identifier (e.g., "gloss-finish")
    sortOrder: {
      type: Number,
      default: 0,
    }, // Sort order for displaying subcategories (lower numbers appear first)
  },
  { timestamps: true }
);

// Index for faster parent queries
SubCategorySchema.index({ parent: 1 });
SubCategorySchema.index({ category: 1, parent: 1 });
SubCategorySchema.index({ parent: 1, sortOrder: 1 });

export default mongoose.model("SubCategory", SubCategorySchema);
