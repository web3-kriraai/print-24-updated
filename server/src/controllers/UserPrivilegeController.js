import PrivilegeVerificationService from "../services/PrivilegeVerificationService.js";
import FeatureFlagService from "../services/FeatureFlagService.js";

/**
 * UserPrivilegeController
 * 
 * Provides privilege and feature information for the current logged-in user.
 * These endpoints are for frontend consumption (non-admin routes).
 */

class UserPrivilegeController {
    /**
     * Get current user's effective privileges
     * GET /api/user/privileges
     */
    async getUserPrivileges(req, res) {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const privileges = await PrivilegeVerificationService.getUserPrivileges(
                req.user._id
            );

            res.json({
                success: true,
                data: privileges,
            });
        } catch (error) {
            console.error("Error getting user privileges:", error);
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Get current user's enabled feature flags
     * GET /api/user/features
     */
    async getUserFeatures(req, res) {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const features = await FeatureFlagService.getEnabledFeaturesForUser(
                req.user._id
            );

            res.json({
                success: true,
                data: features,
            });
        } catch (error) {
            console.error("Error getting user features:", error);
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * Check if user has specific privilege
     * GET /api/user/check-privilege?resource=ORDERS&action=create
     */
    async checkPrivilege(req, res) {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const { resource, action } = req.query;

            if (!resource || !action) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required parameters: resource, action",
                });
            }

            const hasPrivilege = await PrivilegeVerificationService.checkUserPrivilege(
                req.user._id,
                resource,
                action
            );

            res.json({
                success: true,
                data: {
                    hasPrivilege,
                    resource,
                    action,
                },
            });
        } catch (error) {
            console.error("Error checking privilege:", error);
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
}

export default new UserPrivilegeController();
