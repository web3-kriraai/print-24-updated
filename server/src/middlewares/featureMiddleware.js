
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

            // Get user's userSegment and featureOverrides
            const userId = req.user.id;
            const { User } = await import("../models/User.js");

            const user = await User.findById(userId).populate("userSegment");

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            // PRIORITY 1: Check user override first
            const userOverride = user.featureOverrides?.find(f => f.featureKey === featureKey);

            if (userOverride) {
                // User has an override - use it
                if (!userOverride.isEnabled) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied: Feature '${featureKey}' is disabled for your account`,
                        requiredFeature: featureKey,
                        source: 'user_override'
                    });
                }

                // User override allows access
                if (options.attachConfig) {
                    req.featureConfig = userOverride.config || {};
                }

                req.feature = {
                    key: featureKey,
                    config: userOverride.config || {},
                    source: 'user_override'
                };

                return next();
            }

            // PRIORITY 2: No user override - check segment features
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
                    source: 'segment'
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
                source: 'segment'
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
 * Useful for optional features.
 * PRIORITY: user-level overrides are checked FIRST, then segment features.
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

            if (!user) {
                req.hasFeature = false;
                return next();
            }

            // PRIORITY 1: Check user-level override first
            const userOverride = user.featureOverrides?.find(f => f.featureKey === featureKey);
            if (userOverride) {
                req.hasFeature = userOverride.isEnabled;
                if (userOverride.isEnabled) {
                    req.featureConfig = userOverride.config || {};
                }
                return next();
            }

            // PRIORITY 2: Fall back to segment features
            if (!user.userSegment) {
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

        console.log('[Feature Check] Request received:', { feature, userId: req.user?.id });

        if (!feature) {
            return res.status(400).json({
                success: false,
                message: "Feature parameter required",
            });
        }

        if (!req.user || !req.user.id) {
            console.log('[Feature Check] No user found in request');
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const { User } = await import("../models/User.js");
        const user = await User.findById(req.user.id).populate("userSegment");

        console.log('[Feature Check] User loaded:', {
            userId: user?._id,
            userSegment: user?.userSegment?.name,
            hasSegment: !!user?.userSegment,
            segmentFeatures: user?.userSegment?.features?.map(f => ({ key: f.featureKey, enabled: f.isEnabled }))
        });

        if (!user || !user.userSegment) {
            console.log('[Feature Check] No user or no segment');
            return res.json({
                success: true,
                hasFeature: false,
                feature: feature,
            });
        }

        // IMPORTANT: Check user overrides first
        const userOverride = user.featureOverrides?.find(f => f.featureKey === feature);

        if (userOverride) {
            console.log('[Feature Check] User override found:', {
                feature,
                isEnabled: userOverride.isEnabled,
                source: 'user_override'
            });

            return res.json({
                success: true,
                hasFeature: userOverride.isEnabled,
                feature: feature,
                config: userOverride.config || null,
                userSegment: user.userSegment.name,
                source: 'user_override'
            });
        }

        const featureObj = (user.userSegment.features || []).find(
            (f) => f.featureKey === feature && f.isEnabled === true
        );

        console.log('[Feature Check] Segment feature check result:', {
            feature,
            found: !!featureObj,
            hasFeature: !!featureObj,
            userSegment: user.userSegment.name,
            source: 'segment'
        });

        return res.json({
            success: true,
            hasFeature: !!featureObj,
            feature: feature,
            config: featureObj?.config || null,
            userSegment: user.userSegment.name,
            source: 'segment'
        });
    } catch (error) {
        console.error("[Feature Check] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error checking feature",
            error: error.message,
        });
    }
};
