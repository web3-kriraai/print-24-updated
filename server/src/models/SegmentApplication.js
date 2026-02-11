import mongoose from "mongoose";

/**
 * SegmentApplication Schema
 * 
 * Unified model for all user segment applications.
 * Replaces separate PrintPartnerProfile and CorporateProfile models.
 */
const SegmentApplicationSchema = new mongoose.Schema({
  // Applicant reference (if already registered)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    sparse: true, // Allow null for non-registered applicants
  },

  // Email (for non-registered applicants or verification)
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },

  // User segment being applied for
  userSegment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserSegment",
    required: true,
  },

  // Signup form used
  signupForm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SignupForm",
    required: true,
  },

  // Form responses (flexible structure)
  formData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Uploaded files
  uploadedFiles: [{
    fieldId: {
      type: String,
      required: true,
    },
    fieldLabel: String,
    fileName: String,
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: String,
    fileSize: Number,
    cloudinaryPublicId: String, // For deletion if needed
  }],

  // Application status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },

  // Review information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: Date,
  reviewNotes: String,

  // Rejection reason
  rejectionReason: String,

  // Approval details
  approvalNotes: String,

  // Applicant IP and metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    submissionSource: {
      type: String,
      default: 'web',
    },
  },

  // Email verification status (for the application)
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: Date,

  // Application number (auto-generated)
  applicationNumber: {
    type: String,
    unique: true,
  },
}, { timestamps: true });

// Indexes
SegmentApplicationSchema.index({ email: 1 });
SegmentApplicationSchema.index({ user: 1 });
SegmentApplicationSchema.index({ userSegment: 1 });
SegmentApplicationSchema.index({ status: 1, createdAt: -1 });
SegmentApplicationSchema.index({ applicationNumber: 1 });

// Pre-save hook to generate application number
SegmentApplicationSchema.pre('save', async function(next) {
  if (this.isNew && !this.applicationNumber) {
    // Generate application number: SEG-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.applicationNumber = `APP-${dateStr}-${randomStr}`;
  }
  next();
});

// Static method to get application stats
SegmentApplicationSchema.statics.getStats = async function(filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

// Instance method to approve application
SegmentApplicationSchema.methods.approve = async function(reviewerId, notes = '') {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.approvalNotes = notes;
  return await this.save();
};

// Instance method to reject application
SegmentApplicationSchema.methods.reject = async function(reviewerId, reason = '', notes = '') {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.rejectionReason = reason;
  this.reviewNotes = notes;
  return await this.save();
};

export default mongoose.model("SegmentApplication", SegmentApplicationSchema);
