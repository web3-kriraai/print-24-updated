import mongoose from "mongoose";

const OrderStateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: [
        "REQUESTED",
        "APPROVED",
        "DESIGN",
        "PRODUCTION",
        "QC",
        "PACKED",
        "DISPATCHED",
        "DELIVERED",
        "CANCELLED",
      ],
      required: true,
      unique: true,
      index: true,
    },

    allowedNextStates: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("OrderState", OrderStateSchema);
