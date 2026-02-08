import mongoose from "mongoose";

/**
 * UserTypeViewAssignment Schema
 * 
 * Mapping between user types and view styles for specific components.
 * Allows different user types to have different UI views for each component.
 */

const UserTypeViewAssignmentSchema = new mongoose.Schema(
    {
        /* =====================
           ASSIGNMENT INFO
        ====================== */
        userTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserType",
            required: true,
            index: true,
        },

        viewStyleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ViewStyle",
            required: true,
            index: true,
        },

        /* =====================
           COMPONENT SPECIFIC
        ====================== */
        component: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            // e.g., "DASHBOARD", "ORDERS", "PRODUCTS", "CHECKOUT"
        },

        /* =====================
           COMPONENT-SPECIFIC OVERRIDES
        ====================== */
        overrides: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
            // Type-specific tweaks to the base view style
            // e.g., { showExtraWidget: true, hideColumn: 'price' }
        },

        /* =====================
           PRIORITY
        ====================== */
        priority: {
            type: Number,
            default: 0,
            // Higher priority assignments override lower ones (for inheritance)
        },

        /* =====================
           STATUS
        ====================== */
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        /* =====================
           AUDIT FIELDS
        ====================== */
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

/* =====================
   INDEXES
====================== */
// Compound index for fast lookups
UserTypeViewAssignmentSchema.index(
    { userTypeId: 1, component: 1 },
    { unique: true }
);
UserTypeViewAssignmentSchema.index({ viewStyleId: 1, isActive: 1 });
UserTypeViewAssignmentSchema.index({ component: 1, isActive: 1 });

/* =====================
   STATICS
====================== */

/**
 * Get view style for a user type and component
 */
UserTypeViewAssignmentSchema.statics.getViewForType = async function (
    userTypeId,
    component
) {
    const assignment = await this.findOne({
        userTypeId,
        component: component.toUpperCase(),
        isActive: true,
    }).populate("viewStyleId");

    return assignment?.viewStyleId || null;
};

/**
 * Assign view style to user type for a component
 */
UserTypeViewAssignmentSchema.statics.assignView = async function (
    userTypeId,
    component,
    viewStyleId,
    adminUser,
    overrides = {}
) {
    // Check if assignment already exists
    let assignment = await this.findOne({
        userTypeId,
        component: component.toUpperCase(),
    });

    if (assignment) {
        // Update existing assignment
        assignment.viewStyleId = viewStyleId;
        assignment.overrides = overrides;
        assignment.updatedBy = adminUser;
        assignment.isActive = true;
    } else {
        // Create new assignment
        assignment = new this({
            userTypeId,
            viewStyleId,
            component: component.toUpperCase(),
            overrides,
            assignedBy: adminUser,
        });
    }

    await assignment.save();
    return assignment;
};

/**
 * Get all assignments for a user type
 */
UserTypeViewAssignmentSchema.statics.getAssignmentsForType = async function (userTypeId) {
    return await this.find({
        userTypeId,
        isActive: true,
    }).populate("viewStyleId");
};

/**
 * Remove view assignment
 */
UserTypeViewAssignmentSchema.statics.removeAssignment = async function (
    userTypeId,
    component
) {
    return await this.findOneAndUpdate(
        { userTypeId, component: component.toUpperCase() },
        { isActive: false },
        { new: true }
    );
};

export default mongoose.model("UserTypeViewAssignment", UserTypeViewAssignmentSchema);
