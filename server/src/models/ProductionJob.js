import mongoose from "mongoose";

/**
 * ProductionJob Schema
 * 
 * For job-based production tracking - groups orders into
 * production batches (offset gang or digital direct).
 */

const ProductionJobSchema = new mongoose.Schema(
  {
    /* =====================
       BASIC INFO
    ====================== */
    jobNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    jobType: {
      type: String,
      enum: ["OFFSET_GANG", "DIGITAL_DIRECT"],
      required: true,
      index: true,
    },

    /* =====================
       ORDER REFERENCES
    ====================== */
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
      },
    ],

    /* =====================
       PRODUCTION STATUS
    ====================== */
    currentStation: {
      type: String,
      enum: ["PRINTING", "CUTTING", "LAMINATION", "DISPATCH"],
      index: true,
    },

    filePath: String,

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED"],
      default: "PENDING",
      index: true,
    },

    startedAt: Date,
    completedAt: Date,

    /* =====================
       ASSIGNMENT
    ====================== */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /* =====================
       DEPARTMENT LOGS
    ====================== */
    departmentLogs: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
        },
        startTime: Date,
        endTime: Date,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
      },
    ],

    /* =====================
       PREFLIGHT RESULT
    ====================== */
    preflightResult: {
      status: {
        type: String,
        enum: ["PASS", "FAIL", "WARNING"],
      },
      reportUrl: String,
      errorCodes: [String],
      checkedAt: Date,
    },

    /* =====================
       METADATA
    ====================== */
    priority: {
      type: Number,
      default: 0,
    },

    notes: String,
  },
  { timestamps: true }
);

/* =====================
   AUTO-GENERATE JOB NUMBER
====================== */
ProductionJobSchema.pre("save", function (next) {
  if (!this.jobNumber) {
    const prefix = this.jobType === "OFFSET_GANG" ? "OFG" : "DIG";
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 10000);
    this.jobNumber = `${prefix}-${ts}-${rand.toString().padStart(4, "0")}`;
  }
  next();
});

/* =====================
   INDEXES
====================== */
ProductionJobSchema.index({ jobType: 1, currentStation: 1 });
ProductionJobSchema.index({ status: 1, createdAt: -1 });
ProductionJobSchema.index({ orders: 1 });
ProductionJobSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model("ProductionJob", ProductionJobSchema);
