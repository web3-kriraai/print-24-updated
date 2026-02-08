import PMSAuditLogService from "../../services/PMSAuditLogService.js";

const PMSAuditController = {
    async getLogs(req, res) {
        try {
            const result = await PMSAuditLogService.getLogs(req.query, {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getLogDetails(req, res) {
        try {
            const log = await PMSAuditLogService.getLogDetails(req.params.id);
            if (!log) {
                return res.status(404).json({ error: "Log entry not found" });
            }
            res.json(log);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async exportLogs(req, res) {
        try {
            const logs = await PMSAuditLogService.exportLogs(req.query);
            res.json(logs);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default PMSAuditController;
