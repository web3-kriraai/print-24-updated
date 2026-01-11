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
        type: String, // SubAttribute.value
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
        allowedValues: [String],
        defaultValue: String,

        /* PRICING SIGNAL ONLY */
        pricingSignal: {
          pricingKey: String,
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

    applicableUserSegments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserSegment",
      },
    ],

    applicableGeoZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GeoZone",
      },
    ],

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
AttributeRuleSchema.index({ applicableUserSegments: 1 });
AttributeRuleSchema.index({ applicableGeoZones: 1 });
AttributeRuleSchema.index({ isActive: 1 });

export default mongoose.model("AttributeRule", AttributeRuleSchema);
