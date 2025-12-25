import mongoose from "mongoose";

const AttributeRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    // WHEN condition
    when: {
      attribute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttributeType",
        required: true,
      },
      value: {
        type: String,
        required: true,
      }
    },

    // THEN actions
    then: [
      {
        action: {
          type: String,
          enum: ["SHOW", "HIDE", "SHOW_ONLY", "SET_DEFAULT", "QUANTITY"],
          required: true,
        },

        targetAttribute: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AttributeType",
          required: true,
        },

        allowedValues: [String], // for SHOW_ONLY
        defaultValue: String,    // for SET_DEFAULT
        minQuantity: Number,     // for QUANTITY
        maxQuantity: Number,     // for QUANTITY
        stepQuantity: Number     // for QUANTITY (multiples)
      }
    ],

    applicableCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },

    applicableProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },

    priority: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

export default mongoose.model("AttributeRule", AttributeRuleSchema);
