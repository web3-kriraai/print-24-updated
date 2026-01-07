<<<<<<< HEAD
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
=======
const PriceBookEntrySchema = new mongoose.Schema({
    priceBook: { type: mongoose.Schema.Types.ObjectId, ref: "PriceBook" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    basePrice: Number,
    compareAtPrice: Number
  });
  
  export default mongoose.model("PriceBookEntry", PriceBookEntrySchema); 
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
