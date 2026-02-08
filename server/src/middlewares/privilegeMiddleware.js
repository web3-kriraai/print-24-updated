import PrivilegeVerificationService from "../services/PrivilegeVerificationService.js";

/**
 * Middleware to check if user has specific privilege (resource + action)
 * @param {string} resource - Resource name (e.g., "orders", "products")
 * @param {string} action - Action name (e.g., "create", "read", "update", "delete")
 */
export const requirePrivilege = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
            }

            const hasPrivilege = await PrivilegeVerificationService.checkUserPrivilege(
                req.user._id,
                resource,
                action
            );

            if (!hasPrivilege) {
                return res.status(403).json({
                    success: false,
                    error: `Missing privilege: ${action} on ${resource}`,
                    required: { resource, action },
                });
            }

            next();
        } catch (error) {
            console.error("Privilege check error:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to verify privileges",
            });
        }
    };
};

/**
 * Middleware to check if user has specific feature enabled
 * @param {string} featureKey - Feature flag key
 */
export const requireFeature = (featureKey) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
            }

            const hasFeature = await PrivilegeVerificationService.hasFeature(
                req.user._id,
                featureKey
            );

            if (!hasFeature) {
                return res.status(403).json({
                    success: false,
                    error: `Feature not enabled: ${featureKey}`,
                });
            }

            next();
        } catch (error) {
            console.error("Feature check error:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to verify feature access",
            });
        }
    };
};

/**
 * Optional privilege check - allows access but sets req.hasPrivilege flag
 * @param {string} resource
 * @param {string} action
 */
export const checkPrivilege = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (req.user && req.user._id) {
                req.hasPrivilege = await PrivilegeVerificationService.checkUserPrivilege(
                    req.user._id,
                    resource,
                    action
                );
            } else {
                req.hasPrivilege = false;
            }
            next();
        } catch (error) {
            console.error("Privilege check error:", error);
            req.hasPrivilege = false;
            next();
        }
    };
};

export default {
    requirePrivilege,
    requireFeature,
    checkPrivilege,
};
