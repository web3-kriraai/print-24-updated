import PMSAuditLog from "../models/PMSAuditLog.js";
import UserType from "../models/UserType.js";
import UserTypeViewAssignment from "../models/UserTypeViewAssignment.js";
import PrivilegeBundle from "../models/PrivilegeBundle.js";
import ViewStyle from "../models/ViewStyle.js";

class PMSAuditLogService {
    /**
     * Get logs with filters and pagination
     */
    async getLogs(filters = {}, pagination = {}) {
        const { page = 1, limit = 50 } = pagination;
        const skip = (page - 1) * limit;

        const query = {};
        if (filters.action) query.action = filters.action;
        if (filters.resourceType) query.resourceType = filters.resourceType;
        if (filters.changedBy) query.changedBy = filters.changedBy;
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
            if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
        }

        const logs = await PMSAuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate("changedBy", "name email");

        const total = await PMSAuditLog.countDocuments(query);

        return {
            logs,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get details for a specific log entry
     */
    async getLogDetails(id) {
        return await PMSAuditLog.findById(id).populate("changedBy", "name email");
    }

    /**
     * Export logs (returns data suitable for CSV/Excel generation)
     */
    async exportLogs(filters = {}) {
        const query = {};
        // Apply same filters as getLogs
        if (filters.action) query.action = filters.action;
        if (filters.resourceType) query.resourceType = filters.resourceType;
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
            if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
        }

        return await PMSAuditLog.find(query)
            .sort({ timestamp: -1 })
            .populate("changedBy", "name email");
    }
}

export default new PMSAuditLogService();
