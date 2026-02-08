import ResourceRegistry from "../models/ResourceRegistry.js";
import PMSAuditLog from "../models/PMSAuditLog.js";

class ResourceRegistryService {
    /**
     * Get all registered resources
     */
    async getAllResources() {
        return await ResourceRegistry.find({ isActive: true }).sort({ category: 1, displayName: 1 });
    }

    /**
     * Get resources grouped by category
     */
    async getResourcesByCategory() {
        return await ResourceRegistry.getResourcesByCategory();
    }

    /**
     * Create a custom resource
     */
    async createCustomResource(data, adminUser) {
        // Check for existing
        const existing = await ResourceRegistry.findOne({
            resource: data.resource.toUpperCase()
        });

        if (existing) {
            if (existing.isActive) {
                throw new Error(`Resource "${data.resource}" already exists`);
            } else {
                // Reactivate
                existing.isActive = true;
                existing.displayName = data.displayName;
                existing.description = data.description;
                existing.actions = data.actions;
                existing.category = data.category || "Custom";
                existing.updatedBy = adminUser._id;
                await existing.save();

                await PMSAuditLog.createLog({
                    action: "updated",
                    resourceType: "resourceRegistry",
                    resourceId: existing._id,
                    resourceName: existing.resource,
                    after: existing.toObject(),
                    reason: "Reactivated custom resource",
                    changedBy: adminUser._id,
                    changedByName: adminUser.name,
                    changedByEmail: adminUser.email
                });

                return existing;
            }
        }

        const resource = new ResourceRegistry({
            resource: data.resource,
            displayName: data.displayName,
            description: data.description,
            actions: data.actions,
            category: data.category || "Custom",
            isSystem: false,
            createdBy: adminUser._id
        });

        await resource.save();

        await PMSAuditLog.createLog({
            action: "created",
            resourceType: "resourceRegistry",
            resourceId: resource._id,
            resourceName: resource.resource,
            after: resource.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return resource;
    }

    /**
     * Validate resource and action
     */
    async validateResourceAction(resource, action) {
        return await ResourceRegistry.validateResourceAction(resource, action);
    }

    /**
     * Get actions for a specific resource
     */
    async getActionsForResource(resourceName) {
        const resource = await ResourceRegistry.findOne({
            resource: resourceName.toUpperCase(),
            isActive: true
        });

        if (!resource) {
            throw new Error(`Resource "${resourceName}" not found`);
        }

        return resource.actions;
    }
}

export default new ResourceRegistryService();
