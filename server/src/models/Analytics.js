import mongoose from "mongoose";

/**
 * Analytics Schema
 * 
 * For user behavior tracking - captures events like
 * product views, add to cart, checkout, design uploads.
 */

const AnalyticsSchema = new mongoose.Schema(
  {
    /* =====================
       EVENT INFO
    ====================== */
    eventType: {
      type: String,
      enum: [
        "PRODUCT_VIEW",
        "ADD_TO_CART",
        "REMOVE_FROM_CART",
        "CHECKOUT_START",
        "CHECKOUT_COMPLETE",
        "DESIGN_UPLOAD",
        "SEARCH",
        "FILTER_APPLY",
        "CATEGORY_VIEW",
        "LOGIN",
        "SIGNUP",
        "LOGOUT",
      ],
      required: true,
      index: true,
    },

    /* =====================
       REFERENCES
    ====================== */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    /* =====================
       SESSION TRACKING
    ====================== */
    sessionId: {
      type: String,
      index: true,
    },

    /* =====================
       TIMESTAMP
    ====================== */
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /* =====================
       EVENT METADATA
    ====================== */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Event-specific data
      // e.g., { searchQuery: "business cards", quantity: 100 }
    },

    /* =====================
       DEVICE INFO
    ====================== */
    deviceInfo: {
      type: {
        type: String, // "MOBILE", "DESKTOP", "TABLET"
      },
      os: String,
      browser: String,
      userAgent: String,
      screenWidth: Number,
      screenHeight: Number,
    },

    /* =====================
       LOCATION
    ====================== */
    location: {
      ip: String,
      country: String,
      state: String,
      city: String,
      pincode: String,
      latitude: Number,
      longitude: Number,
    },

    /* =====================
       REFERRER
    ====================== */
    referrer: {
      source: String, // "GOOGLE", "FACEBOOK", "DIRECT", "EMAIL"
      medium: String, // "CPC", "ORGANIC", "REFERRAL"
      campaign: String,
      url: String,
    },

    /* =====================
       PAGE CONTEXT
    ====================== */
    pageUrl: String,
    pageTitle: String,
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
AnalyticsSchema.index({ eventType: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, timestamp: -1 });
AnalyticsSchema.index({ productId: 1, timestamp: -1 });
AnalyticsSchema.index({ sessionId: 1, timestamp: 1 });

// TTL index - auto-delete after 1 year (optional)
// AnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

/* =====================
   STATIC METHODS
====================== */

/**
 * Track an event
 */
AnalyticsSchema.statics.track = async function (eventData) {
  return await this.create({
    ...eventData,
    timestamp: new Date(),
  });
};

/**
 * Get product views count
 */
AnalyticsSchema.statics.getProductViews = async function (productId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return await this.countDocuments({
    eventType: "PRODUCT_VIEW",
    productId,
    timestamp: { $gte: since },
  });
};

export default mongoose.model("Analytics", AnalyticsSchema);
