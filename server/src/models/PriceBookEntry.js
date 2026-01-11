import mongoose from "mongoose";

const PriceBookEntrySchema = new mongoose.Schema({
  priceBook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PriceBook",
    required: true,
    index: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true
  },
  basePrice: { type: Number, required: true },
  compareAtPrice: { type: Number }
}, {
  timestamps: true
});

// Compound index to ensure unique product per price book
PriceBookEntrySchema.index({ priceBook: 1, product: 1 }, { unique: true });

export default mongoose.model("PriceBookEntry", PriceBookEntrySchema);
