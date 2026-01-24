import mongoose from "mongoose";

/**
 * ZohoSyncLog Schema
 * 
 * For ERP integration audit trail - tracks all sync operations
 * between the application and Zoho (invoices, inventory, contacts).
 */

const ZohoSyncLogSchema = new mongoose.Schema(
  {
    /* =====================
       REFERENCE
    ====================== */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },

    /* =====================
       SYNC DETAILS
    ====================== */
    syncType: {
      type: String,
      enum: ["INVOICE", "INVENTORY", "CONTACT", "PAYMENT", "CREDIT_NOTE"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "RETRYING"],
      default: "PENDING",
      index: true,
    },

    /* =====================
       REQUEST/RESPONSE DATA
    ====================== */
    requestData: {
      type: mongoose.Schema.Types.Mixed,
    },

    responseData: {
      type: mongoose.Schema.Types.Mixed,
    },

    /* =====================
       ZOHO REFERENCE
    ====================== */
    zohoId: {
      type: String,
      index: true,
    },

    zohoModule: String, // e.g., "invoices", "contacts"

    /* =====================
       ERROR HANDLING
    ====================== */
    errorMessage: String,
    errorCode: String,

    retryCount: {
      type: Number,
      default: 0,
    },

    maxRetries: {
      type: Number,
      default: 3,
    },

    nextRetryAt: Date,

    /* =====================
       TIMING
    ====================== */
    syncedAt: Date,
    
    syncDuration: {
      type: Number, // in milliseconds
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
ZohoSyncLogSchema.index({ orderId: 1, syncType: 1 });
ZohoSyncLogSchema.index({ status: 1, nextRetryAt: 1 });
ZohoSyncLogSchema.index({ zohoId: 1 });
ZohoSyncLogSchema.index({ createdAt: -1 });

/* =====================
   METHODS
====================== */

/**
 * Mark sync as successful
 */
ZohoSyncLogSchema.methods.markSuccess = function (zohoId, responseData) {
  this.status = "SUCCESS";
  this.zohoId = zohoId;
  this.responseData = responseData;
  this.syncedAt = new Date();
  return this.save();
};

/**
 * Mark sync as failed and schedule retry
 */
ZohoSyncLogSchema.methods.markFailed = function (errorMessage, errorCode) {
  this.status = this.retryCount < this.maxRetries ? "RETRYING" : "FAILED";
  this.errorMessage = errorMessage;
  this.errorCode = errorCode;
  this.retryCount += 1;

  if (this.status === "RETRYING") {
    // Exponential backoff: 5min, 15min, 45min
    const delayMinutes = Math.pow(3, this.retryCount) * 5;
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  return this.save();
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Get pending retries
 */
ZohoSyncLogSchema.statics.getPendingRetries = async function () {
  return await this.find({
    status: "RETRYING",
    nextRetryAt: { $lte: new Date() },
  }).limit(100);
};

export default mongoose.model("ZohoSyncLog", ZohoSyncLogSchema);
