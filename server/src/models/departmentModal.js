import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    operators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
<<<<<<< HEAD

    /* =====================
       NEW FIELDS - Production Workflow Control
    ====================== */
    sequenceOrder: {
      type: Number,
      default: 0,
    },

    canStart: {
      type: Boolean,
      default: true,
    },

    canPause: {
      type: Boolean,
      default: true,
    },

    canStop: {
      type: Boolean,
      default: true,
    },

    defaultDuration: {
      type: Number, // in minutes
    },

    requiredOperators: {
      type: Number,
      default: 1,
      min: 1,
    },

    equipment: [
      {
        type: String,
        trim: true,
      },
    ],

    checklist: [
      {
        type: String,
        trim: true,
      },
    ],
=======
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
  },
  { timestamps: true }
);

// Index for faster queries
DepartmentSchema.index({ isEnabled: 1 });

export default mongoose.model("Department", DepartmentSchema);

