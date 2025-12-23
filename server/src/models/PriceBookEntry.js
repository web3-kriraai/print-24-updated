const PriceBookEntrySchema = new mongoose.Schema({
    priceBook: { type: mongoose.Schema.Types.ObjectId, ref: "PriceBook" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    basePrice: Number,
    compareAtPrice: Number
  });
  
  export default mongoose.model("PriceBookEntry", PriceBookEntrySchema); 