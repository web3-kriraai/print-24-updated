import PrivilegeBundleService from "../../services/PrivilegeBundleService.js";

const PrivilegeBundleController = {
    async create(req, res) {
        try {
            const bundle = await PrivilegeBundleService.create(req.body, req.user);
            res.status(201).json(bundle);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async update(req, res) {
        try {
            const bundle = await PrivilegeBundleService.update(req.params.id, req.body, req.user);
            res.json(bundle);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async delete(req, res) {
        try {
            await PrivilegeBundleService.delete(req.params.id, req.user);
            res.json({ message: "Privilege bundle deleted successfully" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async list(req, res) {
        try {
            const bundles = await PrivilegeBundleService.list(req.query);
            res.json(bundles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const bundle = await PrivilegeBundleService.getById(req.params.id);
            if (!bundle) {
                return res.status(404).json({ error: "Privilege bundle not found" });
            }
            res.json(bundle);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default PrivilegeBundleController;
