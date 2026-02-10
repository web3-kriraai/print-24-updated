import mongoose from "mongoose";

/**
 * FormField Schema
 * 
 * Defines reusable form fields that can be used in signup forms.
 * Supports various field types with validation rules.
 */
const FormFieldSchema = new mongoose.Schema({
  // Field identifier (unique within a form)
  fieldId: {
    type: String,
    required: true,
    trim: true,
  },

  // Display label
  label: {
    type: String,
    required: true,
    trim: true,
  },

  // Field type
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

  // Placeholder text
  placeholder: {
    type: String,
    trim: true,
  },

  // Help text/description
  helpText: {
    type: String,
    trim: true,
  },

  // Validation rules
  validation: {
    required: {
      type: Boolean,
      default: false,
    },
    minLength: {
      type: Number,
    },
    maxLength: {
      type: Number,
    },
    min: {
      type: Number, // For number fields
    },
    max: {
      type: Number, // For number fields
    },
    pattern: {
      type: String, // Regex pattern as string
    },
    customErrorMessage: {
      type: String,
    },
  },

  // Options for select, multiselect, radio fields
  options: [{
    label: String,
    value: String,
  }],

  // File upload specific settings
  fileSettings: {
    acceptedTypes: [String], // e.g., ['image/png', 'image/jpeg', 'application/pdf']
    maxSizeBytes: {
      type: Number,
      default: 5 * 1024 * 1024, // 5MB default
    },
    multiple: {
      type: Boolean,
      default: false,
    },
  },

  // Conditional display rules
  conditionalLogic: {
    enabled: {
      type: Boolean,
      default: false,
    },
    // Show this field only if the condition is met
    conditions: [{
      fieldId: String, // ID of the field to check
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

  // Default value
  defaultValue: mongoose.Schema.Types.Mixed,

  // Field order/position
  order: {
    type: Number,
    default: 0,
  },

  // Is this field active?
  isActive: {
    type: Boolean,
    default: true,
  },

  // Is this a system field that cannot be removed?
  isSystemField: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Indexes
FormFieldSchema.index({ fieldId: 1 });
FormFieldSchema.index({ fieldType: 1 });
FormFieldSchema.index({ isActive: 1 });

export default mongoose.model("FormField", FormFieldSchema);
