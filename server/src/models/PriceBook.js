const PriceBookSchema = new mongoose.Schema({
    name: String,
    currency: String,
    isDefault: { type: Boolean, default: false }
  });
  
  export default mongoose.model("PriceBook", PriceBookSchema);
  