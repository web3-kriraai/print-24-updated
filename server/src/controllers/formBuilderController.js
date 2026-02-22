import SignupForm from "../models/SignupForm.js";
import UserSegment from "../models/UserSegment.js";

/**
 * Form Builder Controller
 * Handles CRUD operations for signup forms
 */

// @desc    Get all signup forms
// @route   GET /api/admin/forms
// @access  Private/Admin
export const getAllForms = async (req, res) => {
  try {
    const forms = await SignupForm.find({})
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: forms.length,
      forms,
    });
  } catch (error) {
    console.error("Get all forms error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single signup form
// @route   GET /api/admin/forms/:id
// @access  Private/Admin
export const getFormById = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    return res.status(200).json({
      success: true,
      form,
    });
  } catch (error) {
    console.error("Get form by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Create new signup form
// @route   POST /api/admin/forms
// @access  Private/Admin
export const createForm = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      instructions,
      fields,
      submissionSettings,
      isActive,
    } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    // Check if code already exists
    const existingForm = await SignupForm.findOne({ code: code.toUpperCase() });
    if (existingForm) {
      return res.status(409).json({
        success: false,
        message: "Form code already exists",
      });
    }

    // Create form
    const form = await SignupForm.create({
      name,
      code: code.toUpperCase(),
      description,
      instructions,
      fields: fields || [],
      submissionSettings,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      success: true,
      message: "Form created successfully",
      form,
    });
  } catch (error) {
    console.error("Create form error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update signup form
// @route   PUT /api/admin/forms/:id
// @access  Private/Admin
export const updateForm = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const {
      name,
      code,
      description,
      instructions,
      fields,
      submissionSettings,
      isActive,
    } = req.body;

    // If code is being updated, check uniqueness
    if (code && code.toUpperCase() !== form.code) {
      const existingForm = await SignupForm.findOne({ code: code.toUpperCase() });
      if (existingForm) {
        return res.status(409).json({
          success: false,
          message: "Form code already exists",
        });
      }
      form.code = code.toUpperCase();
    }

    // Update fields
    if (name) form.name = name;
    if (description !== undefined) form.description = description;
    if (instructions !== undefined) form.instructions = instructions;
    if (fields !== undefined) form.fields = fields;
    if (submissionSettings !== undefined) form.submissionSettings = submissionSettings;
    if (isActive !== undefined) form.isActive = isActive;

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Form updated successfully",
      form,
    });
  } catch (error) {
    console.error("Update form error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete signup form
// @route   DELETE /api/admin/forms/:id
// @access  Private/Admin
export const deleteForm = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    // Check if form is assigned to any user segments
    const segments = await UserSegment.find({ signupForm: form._id });
    if (segments.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete form. It is assigned to ${segments.length} user segment(s). Please unassign the form first.`,
        assignedSegments: segments.map(s => ({ id: s._id, name: s.name, code: s.code })),
      });
    }

    await form.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Form deleted successfully",
    });
  } catch (error) {
    console.error("Delete form error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Toggle form active status
// @route   PATCH /api/admin/forms/:id/toggle-status
// @access  Private/Admin
export const toggleFormStatus = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    form.isActive = !form.isActive;
    await form.save();

    return res.status(200).json({
      success: true,
      message: `Form ${form.isActive ? "activated" : "deactivated"} successfully`,
      form,
    });
  } catch (error) {
    console.error("Toggle form status error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Add field to form
// @route   POST /api/admin/forms/:id/fields
// @access  Private/Admin
export const addFieldToForm = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const field = req.body;

    // Validate required field properties
    if (!field.fieldId || !field.label || !field.fieldType) {
      return res.status(400).json({
        success: false,
        message: "fieldId, label, and fieldType are required",
      });
    }

    // Check if fieldId already exists
    const existingField = form.fields.find(f => f.fieldId === field.fieldId);
    if (existingField) {
      return res.status(409).json({
        success: false,
        message: "Field ID already exists in this form",
      });
    }

    // Add field
    form.fields.push(field);
    await form.save();

    return res.status(200).json({
      success: true,
      message: "Field added successfully",
      form,
    });
  } catch (error) {
    console.error("Add field error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update field in form
// @route   PUT /api/admin/forms/:id/fields/:fieldId
// @access  Private/Admin
export const updateFormField = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const fieldIndex = form.fields.findIndex(f => f.fieldId === req.params.fieldId);

    if (fieldIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Update field
    form.fields[fieldIndex] = {
      ...form.fields[fieldIndex].toObject(),
      ...req.body,
    };

    await form.save();

    return res.status(200).json({
      success: true,
      message: "Field updated successfully",
      form,
    });
  } catch (error) {
    console.error("Update field error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Remove field from form
// @route   DELETE /api/admin/forms/:id/fields/:fieldId
// @access  Private/Admin
export const removeFormField = async (req, res) => {
  try {
    const form = await SignupForm.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const fieldIndex = form.fields.findIndex(f => f.fieldId === req.params.fieldId);

    if (fieldIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Field not found",
      });
    }

    // Remove field
    form.fields.splice(fieldIndex, 1);
    await form.save();

    return res.status(200).json({
      success: true,
      message: "Field removed successfully",
      form,
    });
  } catch (error) {
    console.error("Remove field error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Duplicate existing form
// @route   POST /api/admin/forms/:id/duplicate
// @access  Private/Admin
export const duplicateForm = async (req, res) => {
  try {
    const originalForm = await SignupForm.findById(req.params.id);

    if (!originalForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const { name, code } = req.body;

    // Check if code already exists
    const existingForm = await SignupForm.findOne({ code: code.toUpperCase() });
    if (existingForm) {
      return res.status(409).json({
        success: false,
        message: "Form code already exists",
      });
    }

    // Create duplicate
    const duplicateForm = await SignupForm.create({
      name: name || `${originalForm.name} (Copy)`,
      code: code.toUpperCase(),
      description: originalForm.description,
      instructions: originalForm.instructions,
      fields: originalForm.fields,
      submissionSettings: originalForm.submissionSettings,
      isActive: false, // Start as inactive
    });

    return res.status(201).json({
      success: true,
      message: "Form duplicated successfully",
      form: duplicateForm,
    });
  } catch (error) {
    console.error("Duplicate form error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
