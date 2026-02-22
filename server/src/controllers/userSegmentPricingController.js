import UserSegment from '../models/UserSegment.js';

/**
 * ADMIN: Get all user segments
 * GET /api/admin/pricing/user-segments
 */
export const getAllUserSegments = async (req, res) => {
  try {
    const segments = await UserSegment.find()
      .populate('signupForm', 'name code')
      .sort({ priority: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      segments,
    });
  } catch (error) {
    console.error('Get user segments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user segments',
      error: error.message,
    });
  }
};

/**
 * ADMIN: Create user segment
 * POST /api/admin/pricing/user-segments
 */
export const createUserSegment = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      isDefault,
      isActive,
      signupForm,
      requiresApproval,
      isPubliclyVisible,
      icon,
      color,
      priority,
    } = req.body;

    // Check if code already exists
    const existing = await UserSegment.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A segment with this code already exists',
      });
    }

    // Check if this is the first segment
    const segmentCount = await UserSegment.countDocuments();
    const shouldBeDefault = segmentCount === 0 ? true : (isDefault || false);

    // If this is set as default, unset other defaults
    if (shouldBeDefault) {
      await UserSegment.updateMany({}, { isDefault: false });
    }

    const segment = await UserSegment.create({
      name,
      code: code.toUpperCase(),
      description,
      isDefault: shouldBeDefault,
      isActive: isActive !== undefined ? isActive : true,
      signupForm: signupForm || null,
      requiresApproval: requiresApproval || false,
      isPubliclyVisible: isPubliclyVisible !== undefined ? isPubliclyVisible : true,
      icon,
      color,
      priority: priority || 0,
    });

    res.status(201).json({
      success: true,
      segment,
      message: 'User segment created successfully',
    });
  } catch (error) {
    console.error('Create user segment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user segment',
      error: error.message,
    });
  }
};

/**
 * ADMIN: Update user segment
 * PUT /api/admin/pricing/user-segments/:id
 */
export const updateUserSegment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      description,
      isDefault,
      isActive,
      signupForm,
      requiresApproval,
      isPubliclyVisible,
      icon,
      color,
      priority,
    } = req.body;

    const segment = await UserSegment.findById(id);
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'User segment not found',
      });
    }

    // Check if code is being changed and if it conflicts
    if (code && code.toUpperCase() !== segment.code) {
      const existing = await UserSegment.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A segment with this code already exists',
        });
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault && !segment.isDefault) {
      await UserSegment.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    // Update fields
    segment.name = name || segment.name;
    segment.code = code ? code.toUpperCase() : segment.code;
    segment.description = description !== undefined ? description : segment.description;
    segment.isDefault = isDefault !== undefined ? isDefault : segment.isDefault;
    segment.isActive = isActive !== undefined ? isActive : segment.isActive;
    segment.signupForm = signupForm !== undefined ? (signupForm || null) : segment.signupForm;
    segment.requiresApproval = requiresApproval !== undefined ? requiresApproval : segment.requiresApproval;
    segment.isPubliclyVisible = isPubliclyVisible !== undefined ? isPubliclyVisible : segment.isPubliclyVisible;
    segment.icon = icon !== undefined ? icon : segment.icon;
    segment.color = color !== undefined ? color : segment.color;
    segment.priority = priority !== undefined ? priority : segment.priority;

    await segment.save();

    res.status(200).json({
      success: true,
      segment,
      message: 'User segment updated successfully',
    });
  } catch (error) {
    console.error('Update user segment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user segment',
      error: error.message,
    });
  }
};

/**
 * ADMIN: Delete user segment
 * DELETE /api/admin/pricing/user-segments/:id
 */
export const deleteUserSegment = async (req, res) => {
  try {
    const { id } = req.params;

    const segment = await UserSegment.findById(id);
    if (!segment) {
      return res.status(404).json({
        success: false,
        message: 'User segment not found',
      });
    }

    // Prevent deletion of system segments
    if (segment.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system-protected segments',
      });
    }

    // Check if this is the default segment
    if (segment.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the default segment. Please set another segment as default first.',
      });
    }

    await UserSegment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User segment deleted successfully',
    });
  } catch (error) {
    console.error('Delete user segment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user segment',
      error: error.message,
    });
  }
};
