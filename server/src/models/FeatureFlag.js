import mongoose from "mongoose";

/**
 * FeatureFlag Schema
 * 
 * Separates UI feature toggles from resource-action privileges.
 * Feature Flag: UI component visibility (e.g., "Should user see bulk upload button?")
 * Privilege: Action on resource (e.g., "Can user DELETE orders?")
 */

const FeatureFlagSchema = new mongoose.Schema(
    {
        /* =====================
           FEATURE INFO
        ====================== */
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
            // e.g., "BULK_ORDER_UPLOAD", "ANALYTICS_DASHBOARD", "ADVANCED_FILTERS"
        },

        name: {
            type: String,
            required: true,
            trim: true,
            // Human-readable name, e.g., "Bulk Order Upload"
        },

        description: {
            type: String,
            trim: true,
            // What this feature enables
        },

        /* =====================
           UI COMPONENT
        ====================== */
        component: {
            type: String,
            required: true,
            trim: true,
            // Which UI component this affects, e.g., "OrderManagement", "Dashboard"
        },

        /* =====================
           DEFAULT STATE
        ====================== */
        defaultValue: {
            type: Boolean,
            default: false,
            // Default on/off state for types not explicitly set
        },

        /* =====================
           TYPE ASSIGNMENTS
        ====================== */
        enabledForTypes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "UserType",
            },
        ],

        /* =====================
           GLOBAL OVERRIDE
        ====================== */
        isGlobal: {
            type: Boolean,
            default: false,
            index: true,
            // If true, overrides type-specific settings (feature enabled for all)
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
FeatureFlagSchema.index({ key: 1, isActive: 1 });
FeatureFlagSchema.index({ component: 1, isActive: 1 });
FeatureFlagSchema.index({ isGlobal: 1, isActive: 1 });

/* =====================
   METHODS
====================== */

/**
 * Check if feature is enabled for a specific user type
 */
FeatureFlagSchema.methods.isEnabledForType = function (userTypeId) {
    // Global override
    if (this.isGlobal) {
        return this.defaultValue;
    }

    // Check type-specific assignment
    const isAssigned = this.enabledForTypes.some(
        (typeId) => typeId.toString() === userTypeId.toString()
    );

    return isAssigned;
};

/* =====================
   STATICS
====================== */

/**
 * Get all enabled features for a user type
 */
FeatureFlagSchema.statics.getEnabledFeaturesForType = async function (userTypeId) {
    const allFlags = await this.find({ isActive: true });

    const enabledFeatures = allFlags
        .filter((flag) => flag.isEnabledForType(userTypeId))
        .map((flag) => ({
            key: flag.key,
            name: flag.name,
            component: flag.component,
        }));

    return enabledFeatures;
};

/**
 * Get all features by component
 */
FeatureFlagSchema.statics.getByComponent = async function (component) {
    return await this.find({
        component,
        isActive: true,
    }).sort({ name: 1 });
};

/**
 * Toggle feature for a user type
 */
FeatureFlagSchema.statics.toggleForType = async function (flagKey, userTypeId, enabled) {
    const flag = await this.findOne({ key: flagKey, isActive: true });

    if (!flag) {
        throw new Error(`Feature flag "${flagKey}" not found`);
    }

    if (enabled) {
        // Add to enabledForTypes if not already present
        if (!flag.enabledForTypes.some((id) => id.toString() === userTypeId.toString())) {
            flag.enabledForTypes.push(userTypeId);
        }
    } else {
        // Remove from enabledForTypes
        flag.enabledForTypes = flag.enabledForTypes.filter(
            (id) => id.toString() !== userTypeId.toString()
        );
    }

    await flag.save();
    return flag;
};

export default mongoose.model("FeatureFlag", FeatureFlagSchema);
