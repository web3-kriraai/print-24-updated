import mongoose from "mongoose";

const SubCategorySchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
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

export default mongoose.model("SubCategory", SubCategorySchema);


