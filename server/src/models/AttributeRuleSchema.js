import mongoose from "mongoose";

const AttributeRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    // WHEN condition
    when: {
      isQuantityCondition: {
        type: Boolean,
        default: false,
      },
      attribute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttributeType",
        required: false,
      },
      value: {
        type: String,
        required: false,
      },
      minQuantity: {
        type: Number,
        required: false,
      },
      maxQuantity: {
        type: Number,
        required: false,
      },
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
          required: false,
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
