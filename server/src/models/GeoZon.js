const GeoZoneSchema = new mongoose.Schema({
    name: String,
    currency: { type: String, default: "INR" },
    isRestricted: { type: Boolean, default: false }
  });
  
  export default mongoose.model("GeoZone", GeoZoneSchema);
  