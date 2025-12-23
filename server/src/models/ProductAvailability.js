const ProductAvailabilitySchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    geoZone: { type: mongoose.Schema.Types.ObjectId, ref: "GeoZone" },
    isSellable: Boolean,
    reason: String
  });
  
  export default mongoose.model("ProductAvailability", ProductAvailabilitySchema);
  