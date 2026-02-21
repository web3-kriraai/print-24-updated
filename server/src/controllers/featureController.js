import Feature from '../models/Feature.js';
import UserSegment from '../models/UserSegment.js';
import { User } from '../models/User.js';

/**
 * FEATURE CONTROLLER
 * 
 * Handles READ-ONLY feature operations and assignments
 * Features are seeded via seed file, not created through API
 */

/* =====================
   FEATURE READ OPERATIONS (PUBLIC/ADMIN)
 ====================== */

/**
 * List all features
 * GET /api/admin/features
 */
export const listFeatures = async (req, res) => {
    try {
        const { category, isActive, isPremium, isBeta } = req.query;

        const query = {};
        if (category) query.category = category;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (isPremium !== undefined) query.isPremium = isPremium === 'true';
        if (isBeta !== undefined) query.isBeta = isBeta === 'true';

        const features = await Feature.find(query).sort({ category: 1, sortOrder: 1 });

        return res.json({
            success: true,
            count: features.length,
            data: features
        });
    } catch (error) {
        console.error('List features error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch features',
            error: error.message
        });
    }
};

/**
 * Get single feature details
 * GET /api/admin/features/:key
 */
export const getFeature = async (req, res) => {
    try {
        const { key } = req.params;

        const feature = await Feature.findOne({ key: key.toLowerCase() });

        if (!feature) {
            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        return res.json({
            success: true,
            data: feature
        });
    } catch (error) {
        console.error('Get feature error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch feature',
            error: error.message
        });
    }
};

/**
 * Get features by category
 * GET /api/admin/features/category/:category
 */
export const getFeaturesByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const features = await Feature.find({
            category: category.toUpperCase(),
            isActive: true
        }).sort({ sortOrder: 1 });

        return res.json({
            success: true,
            category,
            count: features.length,
            data: features
        });
    } catch (error) {
        console.error('Get features by category error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch features',
            error: error.message
        });
    }
};

/* =====================
   SEGMENT FEATURE ASSIGNMENT
 ====================== */

/**
 * Get features assigned to a segment
 * GET /api/admin/segments/:segmentId/features
 */
export const getSegmentFeatures = async (req, res) => {
    try {
        const { segmentId } = req.params;

        const segment = await UserSegment.findById(segmentId);

        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Segment not found'
            });
        }

        // Get all features and mark which are enabled for this segment
        const allFeatures = await Feature.find({ isActive: true }).sort({ category: 1, sortOrder: 1 });

        const featuresWithStatus = allFeatures.map(feature => {
            const segmentFeature = segment.features.find(f => f.featureKey === feature.key);

            return {
                ...feature.toObject(),
                assignedToSegment: !!segmentFeature,
                isEnabledForSegment: segmentFeature?.isEnabled || false,
                segmentConfig: segmentFeature?.config || null
            };
        });

        return res.json({
            success: true,
            segment: {
                _id: segment._id,
                name: segment.name,
                code: segment.code
            },
            data: featuresWithStatus
        });
    } catch (error) {
        console.error('Get segment features error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch segment features',
            error: error.message
        });
    }
};

/**
 * Assign feature to segment (or update existing)
 * POST /api/admin/segments/:segmentId/features
 */
export const assignFeatureToSegment = async (req, res) => {
    try {
        const { segmentId } = req.params;
        const { featureKey, isEnabled = true, config = {} } = req.body;

        if (!featureKey) {
            return res.status(400).json({
                success: false,
                message: 'featureKey is required'
            });
        }

        // Validate segment exists
        const segment = await UserSegment.findById(segmentId);
        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Segment not found'
            });
        }

        // Validate feature exists
        const feature = await Feature.findOne({ key: featureKey.toLowerCase() });
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: `Feature '${featureKey}' not found`
            });
        }

        if (!feature.isActive) {
            return res.status(400).json({
                success: false,
                message: `Feature '${featureKey}' is not active`
            });
        }

        // Check if feature already assigned
        const existingIndex = segment.features.findIndex(f => f.featureKey === featureKey.toLowerCase());

        if (existingIndex >= 0) {
            // Update existing
            segment.features[existingIndex].isEnabled = isEnabled;
            segment.features[existingIndex].config = config;
        } else {
            // Add new
            segment.features.push({
                featureKey: featureKey.toLowerCase(),
                isEnabled,
                config
            });
        }

        await segment.save();

        return res.json({
            success: true,
            message: `Feature '${featureKey}' ${existingIndex >= 0 ? 'updated' : 'assigned'} to segment '${segment.name}'`,
            data: {
                segment: {
                    _id: segment._id,
                    name: segment.name,
                    code: segment.code
                },
                feature: {
                    key: featureKey,
                    isEnabled,
                    config
                }
            }
        });
    } catch (error) {
        console.error('Assign feature to segment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to assign feature',
            error: error.message
        });
    }
};

/**
 * Remove feature from segment
 * DELETE /api/admin/segments/:segmentId/features/:featureKey
 */
export const removeFeatureFromSegment = async (req, res) => {
    try {
        const { segmentId, featureKey } = req.params;

        const segment = await UserSegment.findById(segmentId);
        if (!segment) {
            return res.status(404).json({
                success: false,
                message: 'Segment not found'
            });
        }

        const initialLength = segment.features.length;
        segment.features = segment.features.filter(f => f.featureKey !== featureKey.toLowerCase());

        if (segment.features.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: `Feature '${featureKey}' not assigned to this segment`
            });
        }

        await segment.save();

        return res.json({
            success: true,
            message: `Feature '${featureKey}' removed from segment '${segment.name}'`
        });
    } catch (error) {
        console.error('Remove feature from segment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to remove feature',
            error: error.message
        });
    }
};

/* =====================
   USER FEATURE OVERRIDES
 ====================== */

/**
 * Get user's all features (segment + overrides merged)
 * GET /api/admin/users/:userId/features
 */
export const getUserFeatures = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).populate('userSegment');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Merge segment features and user overrides
        const featureMap = new Map();

        // First, add segment features
        if (user.userSegment?.features) {
            user.userSegment.features.forEach(f => {
                if (f.isEnabled) {
                    featureMap.set(f.featureKey, {
                        key: f.featureKey,
                        isEnabled: f.isEnabled,
                        config: f.config || {},
                        source: 'segment',
                        segmentName: user.userSegment.name
                    });
                }
            });
        }

        // Then, apply user overrides (these take precedence)
        if (user.featureOverrides) {
            user.featureOverrides.forEach(f => {
                featureMap.set(f.featureKey, {
                    key: f.featureKey,
                    isEnabled: f.isEnabled,
                    config: f.config || {},
                    source: 'user_override',
                    enabledBy: f.enabledBy,
                    enabledAt: f.enabledAt,
                    notes: f.notes
                });
            });
        }

        const allFeatures = Array.from(featureMap.values());

        return res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                segment: user.userSegment?.name || 'None'
            },
            features: allFeatures,
            count: allFeatures.length
        });
    } catch (error) {
        console.error('Get user features error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user features',
            error: error.message
        });
    }
};

/**
 * Add/Update user feature override
 * POST /api/admin/users/:userId/features
 */
export const setUserFeatureOverride = async (req, res) => {
    try {
        const { userId } = req.params;
        const { featureKey, isEnabled = true, config = {}, notes = '' } = req.body;

        if (!featureKey) {
            return res.status(400).json({
                success: false,
                message: 'featureKey is required'
            });
        }

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate feature exists
        const feature = await Feature.findOne({ key: featureKey.toLowerCase() });
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: `Feature '${featureKey}' not found`
            });
        }

        if (!feature.isActive) {
            return res.status(400).json({
                success: false,
                message: `Feature '${featureKey}' is not active`
            });
        }

        // Initialize featureOverrides if not exists
        if (!user.featureOverrides) {
            user.featureOverrides = [];
        }

        // Check if override already exists
        const existingIndex = user.featureOverrides.findIndex(f => f.featureKey === featureKey.toLowerCase());

        if (existingIndex >= 0) {
            // Update existing
            user.featureOverrides[existingIndex].isEnabled = isEnabled;
            user.featureOverrides[existingIndex].config = config;
            user.featureOverrides[existingIndex].enabledBy = req.user._id;
            user.featureOverrides[existingIndex].enabledAt = new Date();
            user.featureOverrides[existingIndex].notes = notes;
        } else {
            // Add new
            user.featureOverrides.push({
                featureKey: featureKey.toLowerCase(),
                isEnabled,
                config,
                enabledBy: req.user._id,
                enabledAt: new Date(),
                notes
            });
        }

        await user.save();

        return res.json({
            success: true,
            message: `Feature override ${existingIndex >= 0 ? 'updated' : 'added'} for user`,
            data: {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                feature: {
                    key: featureKey,
                    isEnabled,
                    config,
                    notes
                }
            }
        });
    } catch (error) {
        console.error('Set user feature override error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to set feature override',
            error: error.message
        });
    }
};

/**
 * Bulk assign features to segment
 * POST /api/admin/segments/:segmentId/features/bulk
 */
export const bulkAssignFeaturesToSegment = async (req, res) => {
    try {
        const { segmentId } = req.params;
        const { features } = req.body;

        if (!Array.isArray(features)) {
            return res.status(400).json({ success: false, message: 'features must be an array' });
        }

        const segment = await UserSegment.findById(segmentId);
        if (!segment) {
            return res.status(404).json({ success: false, message: 'Segment not found' });
        }

        const results = { updated: 0, added: 0, failed: 0, errors: [] };

        for (const item of features) {
            const { featureKey, isEnabled = true, config = {} } = item;
            try {
                const feature = await Feature.findOne({ key: featureKey.toLowerCase() });
                if (!feature || !feature.isActive) {
                    results.failed++;
                    results.errors.push(`Feature '${featureKey}' not found or inactive`);
                    continue;
                }

                const existingIndex = segment.features.findIndex(f => f.featureKey === featureKey.toLowerCase());
                if (existingIndex >= 0) {
                    segment.features[existingIndex].isEnabled = isEnabled;
                    segment.features[existingIndex].config = config;
                    results.updated++;
                } else {
                    segment.features.push({ featureKey: featureKey.toLowerCase(), isEnabled, config });
                    results.added++;
                }
            } catch (err) {
                results.failed++;
                results.errors.push(`Error processing '${featureKey}': ${err.message}`);
            }
        }

        await segment.save();
        return res.json({ success: true, message: `Bulk assignment completed`, results });
    } catch (error) {
        console.error('Bulk assign features error:', error);
        return res.status(500).json({ success: false, message: 'Failed to bulk assign features', error: error.message });
    }
};

/**
 * Bulk remove features from segment
 * DELETE /api/admin/segments/:segmentId/features/bulk
 */
export const bulkRemoveSegmentFeatures = async (req, res) => {
    try {
        const { segmentId } = req.params;
        const { featureKeys } = req.body;

        if (!Array.isArray(featureKeys)) {
            return res.status(400).json({ success: false, message: 'featureKeys must be an array' });
        }

        const segment = await UserSegment.findById(segmentId);
        if (!segment) {
            return res.status(404).json({ success: false, message: 'Segment not found' });
        }

        const initialLength = segment.features.length;
        const keysToRemove = featureKeys.map(k => k.toLowerCase());
        segment.features = segment.features.filter(f => !keysToRemove.includes(f.featureKey));
        const removedCount = initialLength - segment.features.length;

        await segment.save();
        return res.json({ success: true, message: `Successfully removed ${removedCount} features` });
    } catch (error) {
        console.error('Bulk remove segment features error:', error);
        return res.status(500).json({ success: false, message: 'Failed to bulk remove features', error: error.message });
    }
};

/**
 * Bulk set user feature overrides
 * POST /api/admin/users/:userId/features/bulk
 */
export const bulkSetUserFeatureOverrides = async (req, res) => {
    try {
        const { userId } = req.params;
        const { features } = req.body;

        if (!Array.isArray(features)) {
            return res.status(400).json({ success: false, message: 'features must be an array' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.featureOverrides) user.featureOverrides = [];
        const results = { updated: 0, added: 0, failed: 0, errors: [] };

        for (const item of features) {
            const { featureKey, isEnabled = true, config = {}, notes = '' } = item;
            try {
                const feature = await Feature.findOne({ key: featureKey.toLowerCase() });
                if (!feature || !feature.isActive) {
                    results.failed++;
                    results.errors.push(`Feature '${featureKey}' not found or inactive`);
                    continue;
                }

                const existingIndex = user.featureOverrides.findIndex(f => f.featureKey === featureKey.toLowerCase());
                if (existingIndex >= 0) {
                    user.featureOverrides[existingIndex].isEnabled = isEnabled;
                    user.featureOverrides[existingIndex].config = config;
                    user.featureOverrides[existingIndex].notes = notes;
                    user.featureOverrides[existingIndex].enabledBy = req.user._id;
                    user.featureOverrides[existingIndex].enabledAt = new Date();
                    results.updated++;
                } else {
                    user.featureOverrides.push({
                        featureKey: featureKey.toLowerCase(),
                        isEnabled,
                        config,
                        notes,
                        enabledBy: req.user._id,
                        enabledAt: new Date()
                    });
                    results.added++;
                }
            } catch (err) {
                results.failed++;
                results.errors.push(`Error processing '${featureKey}': ${err.message}`);
            }
        }

        await user.save();
        return res.json({ success: true, message: `Bulk overrides completed`, results });
    } catch (error) {
        console.error('Bulk set user overrides error:', error);
        return res.status(500).json({ success: false, message: 'Failed to bulk set overrides', error: error.message });
    }
};

/**
 * Bulk remove user feature overrides
 * DELETE /api/admin/users/:userId/features/bulk
 */
export const bulkRemoveUserOverrides = async (req, res) => {
    try {
        const { userId } = req.params;
        const { featureKeys } = req.body;

        if (!Array.isArray(featureKeys)) {
            return res.status(400).json({ success: false, message: 'featureKeys must be an array' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const initialLength = user.featureOverrides?.length || 0;
        const keysToRemove = featureKeys.map(k => k.toLowerCase());
        user.featureOverrides = user.featureOverrides.filter(f => !keysToRemove.includes(f.featureKey));
        const removedCount = initialLength - user.featureOverrides.length;

        await user.save();
        return res.json({ success: true, message: `Successfully removed ${removedCount} overrides` });
    } catch (error) {
        console.error('Bulk remove user overrides error:', error);
        return res.status(500).json({ success: false, message: 'Failed to bulk remove overrides', error: error.message });
    }
};

/**
 * Remove user feature override
 * DELETE /api/admin/users/:userId/features/:featureKey
 */
export const removeUserFeatureOverride = async (req, res) => {
    try {
        const { userId, featureKey } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.featureOverrides) {
            return res.status(404).json({
                success: false,
                message: 'No overrides found for this user'
            });
        }

        const initialLength = user.featureOverrides.length;
        user.featureOverrides = user.featureOverrides.filter(f => f.featureKey !== featureKey.toLowerCase());

        if (user.featureOverrides.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: `Override for '${featureKey}' not found`
            });
        }

        await user.save();

        return res.json({
            success: true,
            message: `Feature override '${featureKey}' removed for user`
        });
    } catch (error) {
        console.error('Remove user feature override error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to remove feature override',
            error: error.message
        });
    }
};

export default {
    listFeatures,
    getFeature,
    getFeaturesByCategory,
    getSegmentFeatures,
    assignFeatureToSegment,
    removeFeatureFromSegment,
    bulkAssignFeaturesToSegment,
    bulkRemoveSegmentFeatures,
    getUserFeatures,
    setUserFeatureOverride,
    removeUserFeatureOverride,
    bulkSetUserFeatureOverrides,
    bulkRemoveUserOverrides
};
