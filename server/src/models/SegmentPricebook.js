const SegmentPriceBookSchema = new mongoose.Schema({
    userSegment: { type: mongoose.Schema.Types.ObjectId, ref: "UserSegment" },
    priceBook: { type: mongoose.Schema.Types.ObjectId, ref: "PriceBook" },
    priority: Number
  });
  
  export default mongoose.model("SegmentPriceBook", SegmentPriceBookSchema);
  