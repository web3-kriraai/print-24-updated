import mongoose from "mongoose";

const AttributeRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /* =====================
       WHEN (CONDITION)
    ====================== */
    when: {
      attribute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttributeType",
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },

    /* =====================
       THEN (ACTIONS)
    ====================== */
    then: [
      {
        action: {
          type: String,
          enum: [
            "SHOW",
            "HIDE",
            "SHOW_ONLY",
            "SET_DEFAULT",
            "TRIGGER_PRICING",
          ],
          required: true,
        },

        targetAttribute: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AttributeType",
        },

        /* UI ACTION DATA */
        allowedValues: [String], // SHOW_ONLY
        defaultValue: String,    // SET_DEFAULT

        /* PRICING ACTION DATA */
        pricingSignal: {
          pricingKey: String, // maps to pricing engine
          scope: {
            type: String,
            enum: ["GLOBAL", "ZONE", "SEGMENT", "PRODUCT", "ATTRIBUTE"],
          },
          priority: {
            type: Number,
            default: 0,
          },
        },
      },
    ],

    /* =====================
       APPLICABILITY
    ====================== */
    applicableCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    applicableProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    priority: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
===================== */
AttributeRuleSchema.index({ priority: -1 });
AttributeRuleSchema.index({ applicableCategory: 1 });
AttributeRuleSchema.index({ applicableProduct: 1 });
AttributeRuleSchema.index({ isActive: 1 });

export default mongoose.model("AttributeRule", AttributeRuleSchema);
