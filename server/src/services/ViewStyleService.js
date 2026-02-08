import ViewStyle from "../models/ViewStyle.js";
import UserTypeViewAssignment from "../models/UserTypeViewAssignment.js";
import PMSAuditLog from "../models/PMSAuditLog.js";
import UserType from "../models/UserType.js";

const ComponentDefaults = {
    DASHBOARD: {
        layout: 'grid',
        showCharts: true,
        showStats: true,
        widgetOrder: ['orders', 'revenue', 'customers'],
        theme: 'light'
    },
    ORDERS: {
        layout: 'table',
        columns: ['id', 'date', 'customer', 'amount', 'status'],
        filters: ['last30days', 'status'],
        showExport: false,
        rowsPerPage: 25
    },
    PRODUCTS: {
        layout: 'grid',
        showFilters: true,
        showBulkPricing: false,
        columns: ['image', 'name', 'sku', 'price']
    },
    CHECKOUT: {
        showCreditTerms: false,
        showPONumber: false,
        allowMultipleAddresses: false,
        autoApproveLimit: 0
    }
};

class ViewStyleService {

    async create(data, adminUser) {
        const existing = await ViewStyle.findOne({ code: data.code });
        if (existing) throw new Error("View style with this code already exists");

        const style = new ViewStyle({
            ...data,
            createdBy: adminUser._id
        });

        await style.save();

        await PMSAuditLog.createLog({
            action: "created",
            resourceType: "viewStyle",
            resourceId: style._id,
            resourceName: style.name,
            after: style.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return style;
    }

    async update(id, data, adminUser) {
        const style = await ViewStyle.findById(id);
        if (!style) throw new Error("View style not found");

        const beforeState = style.toObject();

        if (data.name) style.name = data.name;
        if (data.description) style.description = data.description;
        if (data.componentConfigs) style.componentConfigs = data.componentConfigs;
        if (data.themeOverrides) style.themeOverrides = data.themeOverrides;
        if (data.previewUrl) style.previewUrl = data.previewUrl;
        if (data.isDefault !== undefined) style.isDefault = data.isDefault;

        style.updatedBy = adminUser._id;

        await style.save();

        await PMSAuditLog.createLog({
            action: "updated",
            resourceType: "viewStyle",
            resourceId: style._id,
            resourceName: style.name,
            before: beforeState,
            after: style.toObject(),
            changedBy: adminUser._id,
            changedByName: adminUser.name,
            changedByEmail: adminUser.email
        });

        return style;
    }

    async list(filters = {}) {
        const query = { isActive: true };
        return await ViewStyle.find(query).sort({ name: 1 });
    }

    async getById(id) {
        return await ViewStyle.findById(id);
    }

    /**
     * Duplicate a style
     */
    async cloneStyle(id, newName, newCode, adminUser) {
        // Use static method on model
        return await ViewStyle.cloneStyle(id, newName, newCode, adminUser._id);
    }

    /**
     * Get effective view configuration for a user type and component
     */
    async getStyleForUserType(userTypeId, component) {
        // 1. Check for specific assignment
        let assignment = await UserTypeViewAssignment.findOne({
            userTypeId,
            component: component.toUpperCase(),
            isActive: true
        }).populate('viewStyleId');

        if (assignment) {
            return this.mergeWithDefaults(assignment.viewStyleId.componentConfigs[component.toUpperCase()], assignment.overrides || {});
        }

        // 2. Check inheritance
        const userType = await UserType.findById(userTypeId);
        if (userType && userType.inheritFromParent && userType.parentType) {
            // Recursive check would happen here, but for simplicity let's check immediate parent
            // Or use the model method if available?
            // Let's implement robust inheritance check
            const parentStyle = await this.getStyleForUserType(userType.parentType, component);
            if (parentStyle && Object.keys(parentStyle).length > 0) return parentStyle;
        }

        // 3. Check default ViewStyle in DB
        const defaultStyle = await ViewStyle.getDefault();
        if (defaultStyle && defaultStyle.componentConfigs && defaultStyle.componentConfigs[component.toUpperCase()]) {
            return defaultStyle.componentConfigs[component.toUpperCase()];
        }

        // 4. Fallback to hardcoded defaults
        return ComponentDefaults[component.toUpperCase()] || {};
    }

    mergeWithDefaults(config, overrides) {
        return { ...config, ...overrides };
    }
}

export default new ViewStyleService();
