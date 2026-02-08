import ResourceRegistryService from "../../services/ResourceRegistryService.js";

const ResourceRegistryController = {
    async listResources(req, res) {
        try {
            if (req.query.grouped === 'true') {
                const resources = await ResourceRegistryService.getResourcesByCategory();
                res.json(resources);
            } else {
                const resources = await ResourceRegistryService.getAllResources();
                res.json(resources);
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getActions(req, res) {
        try {
            const actions = await ResourceRegistryService.getActionsForResource(req.params.name);
            res.json(actions);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    async createCustomResource(req, res) {
        try {
            const resource = await ResourceRegistryService.createCustomResource(req.body, req.user);
            res.status(201).json(resource);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Update/Delete custom resources would be similar, adding placeholders
    async updateCustomResource(req, res) {
        res.status(501).json({ error: "Not implemented yet" });
    },

    async deleteCustomResource(req, res) {
        res.status(501).json({ error: "Not implemented yet" });
    }
};

export default ResourceRegistryController;
