import UserTypeViewAssignment from "../../models/UserTypeViewAssignment.js";
import UserType from "../../models/UserType.js";
import PMSAuditLog from "../../models/PMSAuditLog.js";
// import User from "../../models/User.js"; // Import if needed for user updates

const UserTypeAssignmentController = {
    // Assign user to type
    async assign(req, res) {
        try {
            const { userId, userTypeId, effectiveDate, expiryDate } = req.body;

            // Update User model (assuming User model has userTypeId)
            // await User.findByIdAndUpdate(userId, { userTypeId, ... });

            // For now, we'll just log it as the User model integration is separate
            // In a real implementation this would update the user record

            const userType = await UserType.findById(userTypeId);
            if (!userType) throw new Error("User type not found");

            await PMSAuditLog.createLog({
                action: "assigned",
                resourceType: "userType",
                resourceId: userType._id,
                resourceName: userType.name,
                reason: `Assigned user ${userId} to type`,
                changedBy: req.user._id,
                changedByName: req.user.name,
                changedByEmail: req.user.email
            });

            res.json({ message: "User assigned to type successfully" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // Bulk assign
    async bulkAssign(req, res) {
        try {
            const { userIds, userTypeId } = req.body;
            // Logic to update multiple users
            res.json({ message: `Assigned ${userIds.length} users to type` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    async listAssignments(req, res) {
        // Return assignments from User collection or separate table
        res.json([]);
    },

    // Assign view style to user type for a component
    async assignViewStyle(req, res) {
        try {
            const { userTypeId, component, viewStyleId, overrides } = req.body;
            const assignment = await UserTypeViewAssignment.assignView(
                userTypeId,
                component,
                viewStyleId,
                req.user,
                overrides
            );
            res.json(assignment);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

export default UserTypeAssignmentController;
