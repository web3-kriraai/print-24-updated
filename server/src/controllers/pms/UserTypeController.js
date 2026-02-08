import UserTypeService from "../../services/UserTypeService.js";

const UserTypeController = {
    // Create new user type
    async create(req, res) {
        try {
            const userType = await UserTypeService.create(req.body, req.user);
            res.status(201).json(userType);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Update user type
    async update(req, res) {
        try {
            const userType = await UserTypeService.update(req.params.id, req.body, req.user);
            res.json(userType);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Delete user type
    async delete(req, res) {
        try {
            await UserTypeService.delete(req.params.id, req.user);
            res.json({ message: "User type deleted successfully" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Get single user type by ID
    async getById(req, res) {
        try {
            const userType = await UserTypeService.getById(req.params.id);
            if (!userType) {
                return res.status(404).json({ error: "User type not found" });
            }
            res.json(userType);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // List all user types
    async list(req, res) {
        try {
            const userTypes = await UserTypeService.list(req.query);
            res.json(userTypes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Assign privilege bundle
    async assignPrivilegeBundle(req, res) {
        try {
            const { bundleId } = req.body;
            const userType = await UserTypeService.assignPrivilegeBundle(
                req.params.id,
                bundleId,
                req.user
            );
            res.json(userType);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Duplicate user type
    async duplicate(req, res) {
        try {
            // Implementation pending in service
            // const newType = await UserTypeService.duplicate(req.params.id, req.body.newName, req.user);
            // res.json(newType);
            res.status(501).json({ error: "Not implemented yet" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

export default UserTypeController;
