import ViewStyleService from "../../services/ViewStyleService.js";

const ViewStyleController = {
    async create(req, res) {
        try {
            const style = await ViewStyleService.create(req.body, req.user);
            res.status(201).json(style);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async update(req, res) {
        try {
            const style = await ViewStyleService.update(req.params.id, req.body, req.user);
            res.json(style);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async list(req, res) {
        try {
            const styles = await ViewStyleService.list(req.query);
            res.json(styles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async getById(req, res) {
        try {
            const style = await ViewStyleService.getById(req.params.id);
            if (!style) {
                return res.status(404).json({ error: "View style not found" });
            }
            res.json(style);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async clone(req, res) {
        try {
            const { newName, newCode } = req.body;
            const newStyle = await ViewStyleService.cloneStyle(req.params.id, newName, newCode, req.user);
            res.status(201).json(newStyle);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getPreview(req, res) {
        try {
            const style = await ViewStyleService.getById(req.params.id);
            if (!style) {
                return res.status(404).json({ error: "View style not found" });
            }
            res.json(style.generatePreview());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default ViewStyleController;
