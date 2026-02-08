import PrivilegeBundle from "../models/PrivilegeBundle.js";
import PMSAuditLog from "../models/PMSAuditLog.js";
import UserType from "../models/UserType.js";

class PrivilegeBundleService {
    /**
     * Create a new privilege bundle
     */
    async create(data, adminUser) {
        const existing = await PrivilegeBundle.findOne({
            $or: [{ name: data.name }, { code: data.code }]
        });
        if (existing) {
            throw new Error("Privilege bundle with this name or code already exists");
        }

        const bundle = new PrivilegeBundle({
            ...data,
            createdBy: adminUser._id
        });

        await bundle.save();

        await PMSAuditLog.createLog({
            action: "created",
            resourceType: "privilegeBundle",
            resourceId: bundle._id,
            resourceName: bundle.name,
            after: bundle.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return bundle;
    }

    /**
     * Update bundle
     */
    async update(id, data, adminUser) {
        const bundle = await PrivilegeBundle.findById(id);
        if (!bundle) throw new Error("Privilege bundle not found");

        const beforeState = bundle.toObject();

        // Update fields
        if (data.name) bundle.name = data.name;
        if (data.description) bundle.description = data.description;
        if (data.privileges) bundle.privileges = data.privileges;
        if (data.isActive !== undefined) bundle.isActive = data.isActive;

        bundle.updatedBy = adminUser._id;

        await bundle.save();

        await PMSAuditLog.createLog({
            action: "updated",
            resourceType: "privilegeBundle",
            resourceId: bundle._id,
            resourceName: bundle.name,
            before: beforeState,
            after: bundle.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return bundle;
    }

    /**
     * Delete bundle
     */
    async delete(id, adminUser) {
        const bundle = await PrivilegeBundle.findById(id);
        if (!bundle) throw new Error("Privilege bundle not found");

        // Check if assigned to any active user types
        const assignedCount = await UserType.countDocuments({
            privilegeBundleIds: id,
            isActive: true
        });

        if (assignedCount > 0) {
            throw new Error(`Cannot delete bundle assigned to ${assignedCount} user types`);
        }

        const beforeState = bundle.toObject();
        bundle.isActive = false;
        bundle.updatedBy = adminUser._id;
        await bundle.save();

        await PMSAuditLog.createLog({
            action: "deleted",
            resourceType: "privilegeBundle",
            resourceId: bundle._id,
            resourceName: bundle.name,
            before: beforeState,
            after: null,
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return { success: true };
    }

    async list(filters = {}) {
        const query = { isActive: true };
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
        }

        return await PrivilegeBundle.find(query)
            .populate("assignedToUserTypes", "name code")
            .sort({ name: 1 });
    }

    async getById(id) {
        return await PrivilegeBundle.findById(id).populate("assignedToUserTypes", "name code");
    }
}

export default new PrivilegeBundleService();
