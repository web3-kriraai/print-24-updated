import mongoose from "mongoose";

const AttributeRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
        stepQuantity: Number,
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
    }
  },
  { timestamps: true }
);
AttributeRuleSchema.index({ priority: -1 });
AttributeRuleSchema.index({ applicableCategory: 1 });
AttributeRuleSchema.index({ applicableProduct: 1 });
AttributeRuleSchema.index({ applicableUserSegments: 1 });
AttributeRuleSchema.index({ applicableGeoZones: 1 });
AttributeRuleSchema.index({ isActive: 1 });
export default mongoose.model("AttributeRule", AttributeRuleSchema);
