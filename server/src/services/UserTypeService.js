import UserType from "../models/UserType.js";
import PMSAuditLog from "../models/PMSAuditLog.js";
import PrivilegeBundle from "../models/PrivilegeBundle.js";
import UserTypeViewAssignment from "../models/UserTypeViewAssignment.js";

class UserTypeService {
    /**
     * Create a new user type
     */
    async create(data, adminUser) {
        // Validate uniqueness
        const existing = await UserType.findOne({
            $or: [{ name: data.name }, { code: data.code }]
        });
        if (existing) {
            throw new Error("User type with this name or code already exists");
        }

        // Validate inheritance if parent specified
        if (data.parentType) {
            await this.validateInheritanceChain(null, data.parentType);
        }

        const userType = new UserType({
            ...data,
            features: data.features || [],
            privilegeBundleIds: data.privilegeBundleIds || [],
            limits: data.limits || {},
            territoryRestrictions: data.territoryRestrictions || []
        });

        await userType.save();

        // Log action
        await PMSAuditLog.createLog({
            action: "created",
            resourceType: "userType",
            resourceId: userType._id,
            resourceName: userType.name,
            after: userType.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return userType;
    }

    /**
     * Update user type
     */
    async update(id, data, adminUser) {
        const userType = await UserType.findById(id);
        if (!userType) throw new Error("User type not found");

        // Validate inheritance if parent changing
        if (data.parentType && data.parentType !== userType.parentType?.toString()) {
            await this.validateInheritanceChain(id, data.parentType);
        }

        const beforeState = userType.toObject();

        // Update fields
        if (data.name) userType.name = data.name;
        if (data.description) userType.description = data.description;
        if (data.pricingTier !== undefined) userType.pricingTier = data.pricingTier;
        if (data.parentType !== undefined) userType.parentType = data.parentType;
        if (data.inheritFromParent !== undefined) userType.inheritFromParent = data.inheritFromParent;
        if (data.isActive !== undefined) userType.isActive = data.isActive;
        if (data.limits) userType.limits = { ...userType.limits, ...data.limits };
        if (data.territoryRestrictions) userType.territoryRestrictions = data.territoryRestrictions;
        if (data.maxUsersAllowed !== undefined) userType.maxUsersAllowed = data.maxUsersAllowed;
        if (data.autoApproveSignup !== undefined) userType.autoApproveSignup = data.autoApproveSignup;

        await userType.save();

        // Log action
        await PMSAuditLog.createLog({
            action: "updated",
            resourceType: "userType",
            resourceId: userType._id,
            resourceName: userType.name,
            before: beforeState,
            after: userType.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return userType;
    }

    /**
     * Delete user type (soft delete)
     */
    async delete(id, adminUser) {
        const userType = await UserType.findById(id);
        if (!userType) throw new Error("User type not found");

        // Check if any active users are assigned
        const userCount = await this.getUserCount(id);
        if (userCount > 0) {
            throw new Error(`Cannot delete user type with ${userCount} active users`);
        }

        // Check if any child types depend on this
        const children = await UserType.countDocuments({ parentType: id, isActive: true });
        if (children > 0) {
            throw new Error(`Cannot delete user type that has ${children} child types`);
        }

        const beforeState = userType.toObject();
        userType.isActive = false;
        await userType.save();

        // Log action
        await PMSAuditLog.createLog({
            action: "deleted",
            resourceType: "userType",
            resourceId: userType._id,
            resourceName: userType.name,
            before: beforeState,
            after: null,
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return { success: true };
    }

    /**
     * Get by ID with full details
     */
    async getById(id) {
        return await UserType.findById(id)
            .populate("parentType", "name code")
            .populate("privilegeBundleIds", "name code description");
    }

    /**
     * List all user types
     */
    async list(filters = {}) {
        const query = { ...filters };
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
            delete query.search;
        }

        const types = await UserType.find(query)
            .populate("parentType", "name")
            .sort({ pricingTier: 1, name: 1 });

        // Enhance with user counts (could be optimized with aggregation)
        /* 
        const typesWithCounts = await Promise.all(types.map(async (t) => {
          const count = await mongoose.model("User").countDocuments({ userTypeId: t._id });
          return { ...t.toObject(), userCount: count };
        })); 
        */

        return types;
    }

    /**
     * Assign privilege bundle
     */
    async assignPrivilegeBundle(typeId, bundleId, adminUser) {
        const userType = await UserType.findById(typeId);
        if (!userType) throw new Error("User type not found");

        const bundle = await PrivilegeBundle.findById(bundleId);
        if (!bundle) throw new Error("Privilege bundle not found");

        if (userType.privilegeBundleIds.includes(bundleId)) {
            return userType; // Already assigned
        }

        const beforeState = userType.toObject();
        userType.privilegeBundleIds.push(bundleId);
        await userType.save();

        // Update bundle reference
        await bundle.assignToType(typeId);

        // Log action
        await PMSAuditLog.createLog({
            action: "assigned",
            resourceType: "userType",
            resourceId: userType._id,
            resourceName: userType.name,
            before: beforeState,
            after: userType.toObject(),
            reason: `Assigned privilege bundle: ${bundle.name}`,
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return userType;
    }

    /**
     * Validate inheritance chain to prevent circular dependency
     */
    async validateInheritanceChain(typeId, proposedParentId) {
        if (!proposedParentId) return true;

        // Self reference check
        if (typeId && proposedParentId.toString() === typeId.toString()) {
            throw new Error("Cannot set type as its own parent");
        }

        const visited = new Set();
        if (typeId) visited.add(typeId.toString());

        let currentId = proposedParentId;
        let depth = 0;
        const MAX_DEPTH = 5;

        while (currentId) {
            if (visited.has(currentId.toString())) {
                throw new Error("Circular inheritance detected");
            }

            visited.add(currentId.toString());
            depth++;

            if (depth > MAX_DEPTH) {
                throw new Error(`Inheritance chain too deep (max ${MAX_DEPTH} levels)`);
            }

            const parent = await UserType.findById(currentId);
            if (!parent) break;

            currentId = parent.parentType;
        }

        return true;
    }

    async getUserCount(typeId) {
        // Assuming 'User' model is registered
        // import mongoose from 'mongoose';
        // return await mongoose.model('User').countDocuments({ userTypeId: typeId, isActive: true });
        return 0; // Placeholder until User model is fully integrated with userTypeId
    }
}

export default new UserTypeService();
