import mongoose from "mongoose";

/**
 * PrivilegeBundle Schema
 * 
 * Reusable privilege sets that can be assigned to user types.
 * Simplifies privilege management by grouping related permissions.
 */

const PrivilegeBundleSchema = new mongoose.Schema(
    {
        /* =====================
           BUNDLE INFO
        ====================== */
        name: {
            type: String,
            required: true,
            trim: true,
            // e.g., "Full Access", "Read Only", "Order Manager"
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
            // e.g., "FULL_ACCESS", "READ_ONLY"
        },

        description: {
            type: String,
            trim: true,
            // Detailed description of what this bundle provides
        },

        /* =====================
           PRIVILEGES
        ====================== */
        privileges: [
            {
                resource: {
                    type: String,
                    required: true,
                    uppercase: true,
                    // e.g., "ORDERS", "PRODUCTS"
                },
                actions: [
                    {
                        type: String,
                        required: true,
                        lowercase: true,
                        // e.g., "create", "read", "update", "delete"
                    },
                ],
                conditions: {
                    type: mongoose.Schema.Types.Mixed,
                    default: {},
                    // Optional conditions for fine-grained access control
                    // e.g., { scope: "own", territory: true }
                },
            },
        ],

        /* =====================
           ASSIGNMENTS
        ====================== */
        assignedToUserTypes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "UserType",
            },
        ],

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
        createdBy: {
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
PrivilegeBundleSchema.index({ code: 1, isActive: 1 });
PrivilegeBundleSchema.index({ isActive: 1, name: 1 });

/* =====================
   METHODS
====================== */

/**
 * Assign this bundle to a user type
 */
PrivilegeBundleSchema.methods.assignToType = async function (userTypeId) {
    if (!this.assignedToUserTypes.some((id) => id.toString() === userTypeId.toString())) {
        this.assignedToUserTypes.push(userTypeId);
        await this.save();
    }
    return this;
};

/**
 * Remove this bundle from a user type
 */
PrivilegeBundleSchema.methods.removeFromType = async function (userTypeId) {
    this.assignedToUserTypes = this.assignedToUserTypes.filter(
        (id) => id.toString() !== userTypeId.toString()
    );
    await this.save();
    return this;
};

/**
 * Get all user types assigned to this bundle
 */
PrivilegeBundleSchema.methods.getAssignedTypes = async function () {
    await this.populate("assignedToUserTypes");
    return this.assignedToUserTypes;
};

/**
 * Check if bundle has a specific privilege
 */
PrivilegeBundleSchema.methods.hasPrivilege = function (resource, action) {
    return this.privileges.some(
        (priv) =>
            priv.resource.toUpperCase() === resource.toUpperCase() &&
            priv.actions.includes(action.toLowerCase())
    );
};

/* =====================
   STATICS
====================== */

/**
 * Get all bundles assigned to a user type
 */
PrivilegeBundleSchema.statics.getBundlesForType = async function (userTypeId) {
    return await this.find({
        assignedToUserTypes: userTypeId,
        isActive: true,
    });
};

/**
 * Get aggregated privileges from multiple bundles
 */
PrivilegeBundleSchema.statics.aggregatePrivileges = function (bundles) {
    const privilegeMap = new Map();

    bundles.forEach((bundle) => {
        bundle.privileges.forEach((priv) => {
            const key = priv.resource.toUpperCase();
            if (!privilegeMap.has(key)) {
                privilegeMap.set(key, new Set());
            }
            priv.actions.forEach((action) => {
                privilegeMap.get(key).add(action.toLowerCase());
            });
        });
    });

    // Convert to array format
    const aggregated = [];
    privilegeMap.forEach((actions, resource) => {
        aggregated.push({
            resource,
            actions: Array.from(actions),
        });
    });

    return aggregated;
};

export default mongoose.model("PrivilegeBundle", PrivilegeBundleSchema);
