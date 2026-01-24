import mongoose from "mongoose";

/**
 * PriceBook Schema - Enhanced for Virtual Price Book System
 * 
 * Supports:
 * - Master/Child hierarchy
 * - Zone and Segment specific price books
 * - Virtual calculated views
 * - Override conflict resolution
 */
const PriceBookSchema = new mongoose.Schema({
  // Basic fields
  name: { 
    type: String, 
    required: true,
    index: true
  },
  
  currency: { 
    type: String, 
    default: "INR" 
  },
  
  isDefault: { 
    type: Boolean, 
    default: false,
    index: true
  },

  // ========================================
  // VIRTUAL PRICE BOOK FIELDS
  // ========================================
  
  /**
   * Master Price Book Flag
   * True = Master book (base prices for all products)
   * False = Child book (overrides or zone/segment specific)
   */
  isMaster: {
    type: Boolean,
    default: false,
    index: true,
    description: "Master price book (true) or child book (false)"
  },
  
  /**
   * Suggested Price from Zoho Books
   * Future integration for syncing with accounting system
   */
  suggestedPrice: {
    type: Number,
    default: null,
    description: "Suggested price from Zoho Books (future integration)"
  },
  
  /**
   * Parent Book Reference
   * Null for master books
   * Points to parent for child books
   */
  parentBook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceBook',
    default: null,
    index: true,
    description: "Parent price book for hierarchy (null for master)"
  },
  
  /**
   * Geo Zone Link
   * Links this price book to a specific geographic zone
   */
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeoZone',
    default: null,
    index: true,
    description: "Linked geo zone (for zone-specific price books)"
  },
  
  /**
   * User Segment Link
   * Links this price book to a specific user segment
   */
  segment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSegment',
    default: null,
    index: true,
    description: "Linked user segment (for segment-specific price books)"
  },
  
  // ========================================
  // VIRTUAL BOOK METADATA
  // ========================================
  
  /**
   * Virtual Book Flag
   * True = Calculated view (not stored physically)
   * False = Physical book with stored entries
   */
  isVirtual: {
    type: Boolean,
    default: false,
    index: true,
    description: "True if this is a calculated view, not stored physically"
  },
  
  /**
   * Calculation Logic
   * Defines how virtual prices are calculated
   */
  calculationLogic: {
    type: String,
    enum: ['MASTER_ONLY', 'MASTER_PLUS_ZONE', 'MASTER_PLUS_SEGMENT', 'MASTER_PLUS_BOTH', 'CUSTOM'],
    default: 'MASTER_ONLY',
    description: "Logic for calculating virtual prices"
  },
  
  // ========================================
  // OVERRIDE BEHAVIOR
  // ========================================
  
  /**
   * Override Priority
   * Higher number = higher priority in conflict resolution
   */
  overridePriority: {
    type: Number,
    default: 0,
    index: true,
    description: "Priority for override conflicts (higher wins)"
  },
  
  /**
   * Override Flag
   * True = This book contains only overrides
   * False = This book contains base prices
   */
  isOverride: {
    type: Boolean,
    default: false,
    index: true,
    description: "True if this book contains overrides only"
  },
  
  // ========================================
  // AUDIT TRAIL
  // ========================================
  
  /**
   * Created From
   * Tracks which book this was created from (for cloning)
   */
  createdFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceBook',
    default: null,
    description: "Original book this was created from"
  },
  
  /**
   * Version
   * Incremented on each update for conflict detection
   */
  version: {
    type: Number,
    default: 1,
    description: "Version number for conflict detection"
  },
  
  /**
   * Description
   * Admin notes about this price book
   */
  description: {
    type: String,
    default: "",
    description: "Admin notes about this price book"
  },
  
  /**
   * Active Status
   * Inactive books are not used in calculations
   */
  isActive: {
    type: Boolean,
    default: true,
    index: true,
    description: "Active status for this price book"
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// VIRTUAL FIELDS
// ========================================

/**
 * Virtual: Child Books
 * Returns all child books of this price book
 */
PriceBookSchema.virtual('children', {
  ref: 'PriceBook',
  localField: '_id',
  foreignField: 'parentBook',
  justOne: false
});

// ========================================
// INDEXES
// ========================================

// Compound index for zone + segment lookup
PriceBookSchema.index({ zone: 1, segment: 1 });

// Index for master book queries
PriceBookSchema.index({ isMaster: 1, isActive: 1 });

// Index for hierarchy queries
PriceBookSchema.index({ parentBook: 1, isActive: 1 });

// ========================================
// METHODS
// ========================================

/**
 * Check if this is a master price book
 */
PriceBookSchema.methods.isMasterBook = function() {
  return this.isMaster === true;
};

/**
 * Check if this is a child price book
 */
PriceBookSchema.methods.isChildBook = function() {
  return this.parentBook !== null;
};

/**
 * Get full hierarchy path
 */
PriceBookSchema.methods.getHierarchyPath = async function() {
  const path = [this];
  let current = this;
  
  while (current.parentBook) {
    current = await this.model('PriceBook').findById(current.parentBook);
    if (current) path.unshift(current);
  }
  
  return path;
};

// ========================================
// STATIC METHODS
// ========================================

/**
 * Get master price book
 */
PriceBookSchema.statics.getMasterBook = async function() {
  return await this.findOne({ isMaster: true, isActive: true });
};

/**
 * Get price book for zone and segment
 */
PriceBookSchema.statics.getBookForContext = async function(zoneId, segmentId) {
  // Try exact match first
  let book = await this.findOne({
    zone: zoneId,
    segment: segmentId,
    isActive: true
  });
  
  if (book) return book;
  
  // Try zone-only match
  book = await this.findOne({
    zone: zoneId,
    segment: null,
    isActive: true
  });
  
  if (book) return book;
  
  // Try segment-only match
  book = await this.findOne({
    zone: null,
    segment: segmentId,
    isActive: true
  });
  
  if (book) return book;
  
  // Fall back to master
  return await this.getMasterBook();
};

export default mongoose.model("PriceBook", PriceBookSchema);
