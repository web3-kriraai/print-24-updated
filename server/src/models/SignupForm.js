import mongoose from "mongoose";

/**
 * SignupForm Schema
 * 
 * Defines complete signup forms that can be assigned to user segments.
 * Contains an array of form fields and metadata.
 */
const SignupFormSchema = new mongoose.Schema({
  // Form name
  name: {
    type: String,
    required: true,
    trim: true,
  },

  // Form code (unique identifier)
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },

  // Description for admin
  description: {
    type: String,
    trim: true,
  },

  // User-facing instructions
  instructions: {
    type: String,
    trim: true,
  },

  // Form fields (embedded documents)
  fields: [{
    // Embedded field definition
    fieldId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    fieldType: {
      type: String,
      required: true,
      enum: [
        'text',
        'email',
        'password',
        'phone',
        'number',
        'textarea',
        'select',
        'multiselect',
        'radio',
        'checkbox',
        'file',
        'date',
        'url',
      ],
    },
    placeholder: String,
    helpText: String,
    validation: {
      required: {
        type: Boolean,
        default: false,
      },
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      pattern: String,
      customErrorMessage: String,
    },
    options: [{
      label: String,
      value: String,
    }],
    fileSettings: {
      acceptedTypes: [String],
      maxSizeBytes: {
        type: Number,
        default: 5 * 1024 * 1024,
      },
      multiple: {
        type: Boolean,
        default: false,
      },
    },
    conditionalLogic: {
      enabled: {
        type: Boolean,
        default: false,
      },
      conditions: [{
        fieldId: String,
        operator: {
          type: String,
          enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan'],
        },
        value: mongoose.Schema.Types.Mixed,
      }],
      logicType: {
        type: String,
        enum: ['AND', 'OR'],
        default: 'AND',
      },
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    order: {
      type: Number,
      default: 0,
    },
  }],

  // Submission settings
  submissionSettings: {
    // Success message after submission
    successMessage: {
      type: String,
      default: 'Your application has been submitted successfully!',
    },
    // Redirect URL after submission (optional)
    redirectUrl: String,
    // Email notifications
    notifyAdmin: {
      type: Boolean,
      default: true,
    },
    notifyApplicant: {
      type: Boolean,
      default: true,
    },
  },

  // Is this form active?
  isActive: {
    type: Boolean,
    default: true,
  },

  // Usage statistics
  stats: {
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    approvedSubmissions: {
      type: Number,
      default: 0,
    },
    rejectedSubmissions: {
      type: Number,
      default: 0,
    },
    lastSubmissionAt: Date,
  },
}, { timestamps: true });

// Indexes
SignupFormSchema.index({ code: 1 });
SignupFormSchema.index({ isActive: 1 });
SignupFormSchema.index({ 'fields.fieldId': 1 });

// Methods
SignupFormSchema.methods.incrementSubmissions = function() {
  this.stats.totalSubmissions += 1;
  this.stats.lastSubmissionAt = new Date();
  return this.save();
};

SignupFormSchema.methods.incrementApprovals = function() {
  this.stats.approvedSubmissions += 1;
  return this.save();
};

SignupFormSchema.methods.incrementRejections = function() {
  this.stats.rejectedSubmissions += 1;
  return this.save();
};

export default mongoose.model("SignupForm", SignupFormSchema);
