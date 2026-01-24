import mongoose from "mongoose";

/**
 * CrossSellAnalytics Schema
 * 
 * For cross-sell recommendations - tracks which products
 * are frequently viewed/purchased together.
 */

const CrossSellAnalyticsSchema = new mongoose.Schema(
  {
    /* =====================
       PRODUCT PAIR
    ====================== */
    sourceProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    targetProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    /* =====================
       METRICS
    ====================== */
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
      // Times targetProduct was viewed after sourceProduct
    },

    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
      // Times both products were purchased together
    },

    addToCartCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =====================
       COMPUTED METRICS
    ====================== */
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      // purchaseCount / viewCount
    },

    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      // Statistical confidence in the recommendation
    },

    /* =====================
       SCORING
    ====================== */
    score: {
      type: Number,
      default: 0,
      index: true,
      // Weighted score for recommendation ranking
    },

    /* =====================
       TIMING
    ====================== */
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /* =====================
       CATEGORY INFO (for faster queries)
    ====================== */
    sourceCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    targetCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  },
  { timestamps: true }
);

/* =====================
   INDEXES
====================== */
CrossSellAnalyticsSchema.index(
  { sourceProduct: 1, targetProduct: 1 },
  { unique: true }
);
CrossSellAnalyticsSchema.index({ sourceProduct: 1, score: -1 });
CrossSellAnalyticsSchema.index({ lastUpdated: -1 });

/* =====================
   METHODS
====================== */

/**
 * Increment view count and recalculate metrics
 */
CrossSellAnalyticsSchema.methods.incrementView = async function () {
  this.viewCount += 1;
  this.recalculateMetrics();
  return this.save();
};

/**
 * Increment purchase count and recalculate metrics
 */
CrossSellAnalyticsSchema.methods.incrementPurchase = async function () {
  this.purchaseCount += 1;
  this.recalculateMetrics();
  return this.save();
};

/**
 * Recalculate derived metrics
 */
CrossSellAnalyticsSchema.methods.recalculateMetrics = function () {
  // Conversion rate
  this.conversionRate = this.viewCount > 0 
    ? this.purchaseCount / this.viewCount 
    : 0;

  // Confidence (simplified - based on sample size)
  const sampleSize = this.viewCount + this.purchaseCount;
  this.confidence = Math.min(1, sampleSize / 100);

  // Score (weighted combination)
  this.score = (this.conversionRate * 0.6 + this.confidence * 0.4) * 100;

  this.lastUpdated = new Date();
};

/* =====================
   STATIC METHODS
====================== */

/**
 * Get recommendations for a product
 */
CrossSellAnalyticsSchema.statics.getRecommendations = async function (
  productId,
  limit = 5
) {
  return await this.find({
    sourceProduct: productId,
    score: { $gt: 10 }, // Minimum score threshold
  })
    .sort({ score: -1 })
    .limit(limit)
    .populate("targetProduct", "name image");
};

/**
 * Record a view event
 */
CrossSellAnalyticsSchema.statics.recordView = async function (
  sourceProductId,
  targetProductId
) {
  const record = await this.findOneAndUpdate(
    {
      sourceProduct: sourceProductId,
      targetProduct: targetProductId,
    },
    {
      $inc: { viewCount: 1 },
      $set: { lastUpdated: new Date() },
    },
    {
      upsert: true,
      new: true,
    }
  );

  record.recalculateMetrics();
  return record.save();
};

/**
 * Record a purchase event
 */
CrossSellAnalyticsSchema.statics.recordPurchase = async function (productIds) {
  // For each pair of products purchased together
  for (let i = 0; i < productIds.length; i++) {
    for (let j = 0; j < productIds.length; j++) {
      if (i !== j) {
        await this.findOneAndUpdate(
          {
            sourceProduct: productIds[i],
            targetProduct: productIds[j],
          },
          {
            $inc: { purchaseCount: 1 },
            $set: { lastUpdated: new Date() },
          },
          { upsert: true }
        );
      }
    }
  }
};

export default mongoose.model("CrossSellAnalytics", CrossSellAnalyticsSchema);
