import mongoose from "mongoose";

/**
 * ResourceRegistry Schema
 * 
 * Defines all available system resources and their actions.
 * Prevents typos in privilege assignment by validating against this registry.
 */

const ResourceRegistrySchema = new mongoose.Schema(
    {
        /* =====================
           RESOURCE INFO
        ====================== */
        resource: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
            // e.g., "ORDERS", "PRODUCTS", "CUSTOMERS"
        },

        displayName: {
            type: String,
            required: true,
            trim: true,
            // Human-readable name, e.g., "Orders", "Products"
        },

        description: {
            type: String,
            trim: true,
            // Detailed description of what this resource represents
        },

        /* =====================
           ACTIONS
        ====================== */
        actions: [
            {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
            },
            // e.g., ["create", "read", "update", "delete", "export", "approve"]
        ],

        /* =====================
           CATEGORIZATION
        ====================== */
        category: {
            type: String,
            enum: ["Core", "Reporting", "Management", "Configuration", "Custom"],
            default: "Core",
            index: true,
            // Groups resources for better UI organization
        },

        /* =====================
           SYSTEM FLAG
        ====================== */
        isSystem: {
            type: Boolean,
            default: false,
            index: true,
            // System resources cannot be deleted (only disabled)
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
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // Admin who created this resource (null for system resources)
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // Admin who last updated this resource
        },
    },
    { timestamps: true }
);

/* =====================
   INDEXES
====================== */
ResourceRegistrySchema.index({ isActive: 1, category: 1 });
ResourceRegistrySchema.index({ resource: 1, isActive: 1 });

/* =====================
   METHODS
====================== */

/**
 * Validate if an action exists for this resource
 */
ResourceRegistrySchema.methods.validateAction = function (action) {
    return this.actions.includes(action.toLowerCase());
};

/**
 * Get all actions for this resource
 */
ResourceRegistrySchema.methods.getAllActions = function () {
    return this.actions;
};

/* =====================
   STATICS
====================== */

/**
 * Validate resource and action combination
 */
ResourceRegistrySchema.statics.validateResourceAction = async function (
    resource,
    action
) {
    const resourceDoc = await this.findOne({
        resource: resource.toUpperCase(),
        isActive: true,
    });

    if (!resourceDoc) {
        return { valid: false, error: `Resource "${resource}" not found` };
    }

    if (!resourceDoc.validateAction(action)) {
        return {
            valid: false,
            error: `Action "${action}" not available for resource "${resource}"`,
        };
    }

    return { valid: true };
};

/**
 * Get resources by category
 */
ResourceRegistrySchema.statics.getResourcesByCategory = async function () {
    const resources = await this.find({ isActive: true }).sort({ category: 1, displayName: 1 });

    const grouped = {};
    resources.forEach((resource) => {
        if (!grouped[resource.category]) {
            grouped[resource.category] = [];
        }
        grouped[resource.category].push(resource);
    });

    return grouped;
};

/**
 * Search resources by name or description
 */
ResourceRegistrySchema.statics.searchResources = async function (query) {
    return await this.find({
        isActive: true,
        $or: [
            { resource: { $regex: query, $options: "i" } },
            { displayName: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ],
    }).sort({ displayName: 1 });
};

export default mongoose.model("ResourceRegistry", ResourceRegistrySchema);
