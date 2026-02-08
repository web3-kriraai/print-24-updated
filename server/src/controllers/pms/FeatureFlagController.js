import FeatureFlagService from "../../services/FeatureFlagService.js";

const FeatureFlagController = {
    async list(req, res) {
        try {
            const flags = await FeatureFlagService.list();
            res.json(flags);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async create(req, res) {
        try {
            const flag = await FeatureFlagService.create(req.body, req.user);
            res.status(201).json(flag);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async update(req, res) {
        try {
            const flag = await FeatureFlagService.update(req.params.key, req.body, req.user);
            res.json(flag);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async toggleForType(req, res) {
        try {
            const { userTypeId, enabled } = req.body;
            const flag = await FeatureFlagService.toggleForType(
                req.params.key,
                userTypeId,
                enabled,
                req.user
            );
            res.json(flag);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async delete(req, res) {
        // Implement delete logic
        res.status(501).json({ error: "Not implemented yet" });
    }
};

export default FeatureFlagController;
