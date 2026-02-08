import FeatureFlag from "../models/FeatureFlag.js";
import PMSAuditLog from "../models/PMSAuditLog.js";

class FeatureFlagService {
    /**
     * List all feature flags
     */
    async list() {
        return await FeatureFlag.find({ isActive: true }).sort({ component: 1, name: 1 });
    }

    /**
     * Create feature flag
     */
    async create(data, adminUser) {
        const existing = await FeatureFlag.findOne({ key: data.key });
        if (existing) throw new Error("Feature flag with this key already exists");

        const flag = new FeatureFlag({
            ...data,
            createdBy: adminUser._id
        });

        await flag.save();

        await PMSAuditLog.createLog({
            action: "created",
            resourceType: "featureFlag",
            resourceId: flag._id,
            resourceName: flag.key,
            after: flag.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return flag;
    }

    /**
     * Update feature flag
     */
    async update(key, data, adminUser) {
        const flag = await FeatureFlag.findOne({ key });
        if (!flag) throw new Error("Feature flag not found");

        const beforeState = flag.toObject();

        if (data.name) flag.name = data.name;
        if (data.description) flag.description = data.description;
        if (data.component) flag.component = data.component;
        if (data.defaultValue !== undefined) flag.defaultValue = data.defaultValue;
        if (data.isGlobal !== undefined) flag.isGlobal = data.isGlobal;

        flag.updatedBy = adminUser._id;

        await flag.save();

        await PMSAuditLog.createLog({
            action: "updated",
            resourceType: "featureFlag",
            resourceId: flag._id,
            resourceName: flag.key,
            before: beforeState,
            after: flag.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return flag;
    }

    /**
     * Toggle feature for a specific user type
     */
    async toggleForType(key, userTypeId, enabled, adminUser) {
        const flag = await FeatureFlag.toggleForType(key, userTypeId, enabled);

        await PMSAuditLog.createLog({
            action: "toggled",
            resourceType: "featureFlag",
            resourceId: flag._id,
            resourceName: flag.key,
            reason: `${enabled ? 'Enabled' : 'Disabled'} for user type ${userTypeId}`,
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return flag;
    }

    /**
     * Get all enabled features for a user type
     */
    async getEnabledFeaturesForType(userTypeId) {
        return await FeatureFlag.getEnabledFeaturesForType(userTypeId);
    }
}

export default new FeatureFlagService();
