import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for non-logged-in users
    },
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    // Dynamic display control fields
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: false, // Optional - for service-specific reviews
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    placement: {
      type: String,
      enum: ['global', 'service-specific', 'both'],
      default: 'global',
    },
  },
  { timestamps: true }
);

export default mongoose.model("Review", ReviewSchema);


