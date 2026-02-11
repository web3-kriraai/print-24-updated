import UserType from "../models/UserType.js";

/**
 * Feature-based access control middleware
 * Checks if user's UserType has a specific feature enabled
 */

/**
 * Middleware to require a specific feature
 * @param {string} featureKey - The feature key to check (e.g., 'bulk_order_upload')
 * @param {object} options - Optional configuration
 * @param {boolean} options.attachConfig - Whether to attach feature config to req
 */
export const requireFeature = (featureKey, options = {}) => {
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            // Get user's userSegment
            const userId = req.user.id;
            const { User } = await import("../models/User.js");

            const user = await User.findById(userId).populate("userSegment");

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            // If no userSegment assigned, deny access
            if (!user.userSegment) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied: No user segment assigned",
                    requiredFeature: featureKey,
                });
            }

            const userSegment = user.userSegment;

            // Check if userSegment has the feature enabled
            const feature = userSegment.features?.find(
                (f) => f.featureKey === featureKey && f.isEnabled === true
            );

            if (!feature) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied: Feature '${featureKey}' not available for your account type`,
                    requiredFeature: featureKey,
                    userSegment: userSegment.name,
                });
            }

            // Attach feature config to request if requested
            if (options.attachConfig) {
                req.featureConfig = feature.config || {};
            }

            // Attach feature info to request
            req.feature = {
                key: featureKey,
                config: feature.config || {},
                userSegment: userSegment.name,
            };

            next();
        } catch (error) {
            console.error("Feature middleware error:", error);
            return res.status(500).json({
                success: false,
                message: "Error checking feature access",
                error: error.message,
            });
        }
    };
};

/**
 * Check if user has a feature (doesn't block, just adds boolean to req)
 * Useful for optional features
 */
export const checkFeature = (featureKey) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                req.hasFeature = false;
                return next();
            }

            const { User } = await import("../models/User.js");
            const user = await User.findById(req.user.id).populate("userSegment");

            if (!user || !user.userSegment) {
                req.hasFeature = false;
                return next();
            }

            const feature = user.userSegment.features?.find(
                (f) => f.featureKey === featureKey && f.isEnabled === true
            );

            req.hasFeature = !!feature;
            if (feature) {
                req.featureConfig = feature.config || {};
            }

            next();
        } catch (error) {
            console.error("Check feature error:", error);
            req.hasFeature = false;
            next();
        }
    };
};

/**
 * Get user's enabled features
 * Adds to req.features array
 */
export const getUserFeatures = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            req.features = [];
            return next();
        }

        const { User } = await import("../models/User.js");
        const user = await User.findById(req.user.id).populate("userSegment");

        if (!user || !user.userSegment) {
            req.features = [];
            return next();
        }

        // Get all enabled features
        req.features = (user.userSegment.features || [])
            .filter((f) => f.isEnabled === true)
            .map((f) => ({
                key: f.featureKey,
                config: f.config || {},
            }));

        next();
    } catch (error) {
        console.error("Get user features error:", error);
        req.features = [];
        next();
    }
};

/**
 * API endpoint to check feature access
 * GET /api/user/check-feature?feature=bulk_order_upload
 */
export const checkFeatureEndpoint = async (req, res) => {
    try {
        const { feature } = req.query;

        if (!feature) {
            return res.status(400).json({
                success: false,
                message: "Feature parameter required",
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const { User } = await import("../models/User.js");
        const user = await User.findById(req.user.id).populate("userSegment");

        if (!user || !user.userSegment) {
            return res.json({
                success: true,
                hasFeature: false,
                feature: feature,
            });
        }

        const featureObj = (user.userSegment.features || []).find(
            (f) => f.featureKey === feature && f.isEnabled === true
        );

        return res.json({
            success: true,
            hasFeature: !!featureObj,
            feature: feature,
            config: featureObj?.config || null,
            userSegment: user.userSegment.name,
        });
    } catch (error) {
        console.error("Check feature endpoint error:", error);
        return res.status(500).json({
            success: false,
            message: "Error checking feature",
            error: error.message,
        });
    }
};
