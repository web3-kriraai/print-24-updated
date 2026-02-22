import mongoose from "mongoose";

const SubAttributeSchema = new mongoose.Schema(
  {
    parentAttribute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttributeType",
      required: true,
    },

    parentValue: {
      type: String, // e.g. "custom-shape-", "texture-uv"
      required: true,
    },

    value: { type: String, required: true },
    label: { type: String, required: true },

    image: String,

    priceAdd: {
      type: Number,
      default: 0,
    },

    systemName: {
      type: String,
      required: false,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SubAttribute", SubAttributeSchema);
