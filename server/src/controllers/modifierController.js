import PriceModifier from "../models/PriceModifier.js";
import ModifierEngine from "../services/ModifierEngine.js";
import PricingService from "../services/pricing/PricingService.js";

/**
 * =========================================================================
 * MODIFIER CRUD CONTROLLER (STEP 2.5)
 * =========================================================================
 * 
 * Admin endpoints for managing promotional offers and price modifiers.
 * All routes require admin authentication.
 */

/**
 * POST /api/modifiers
 * Create a new modifier
 */
export const createModifier = async (req, res) => {
    try {
        const modifierData = req.body;

        // Validate modifier data
        const validation = ModifierEngine.validateModifier(modifierData);
        if (!validation.valid) {
            return res.status(400).json({
                error: "Validation failed",
                details: validation.errors
            });
        }

        // Check for duplicate code
        if (modifierData.code) {
            const existing = await PriceModifier.findOne({ code: modifierData.code.toUpperCase() });
            if (existing) {
                return res.status(400).json({
                    error: `Modifier with code "${modifierData.code}" already exists`
                });
            }
        }

        // Transform code to uppercase
        if (modifierData.code) {
            modifierData.code = modifierData.code.toUpperCase();
        }

        const modifier = await PriceModifier.create({
            ...modifierData,
            createdBy: req.user?._id
        });

        return res.status(201).json({
            success: true,
            message: "Modifier created successfully",
            data: modifier
        });
    } catch (err) {
        console.error("❌ Error creating modifier:", err);
        return res.status(500).json({ error: err.message || "Failed to create modifier" });
    }
};

/**
 * GET /api/modifiers
 * Get all modifiers with pagination and filtering
 */
export const getAllModifiers = async (req, res) => {
    try {
        // Pagination
        const page = Math.max(1, parseInt(req.query.page || 1));
        const limit = Math.min(50, parseInt(req.query.limit || 20));
        const skip = (page - 1) * limit;

        // Safe filtering (whitelist only)
        const allowedFilters = [
            "appliesTo",
            "appliesOn",
            "isActive",
            "isStackable",
            "code"
        ];

        const filters = {};
        for (const key of allowedFilters) {
            if (req.query[key] !== undefined) {
                // Handle boolean conversion
                if (key === "isActive" || key === "isStackable") {
                    filters[key] = req.query[key] === "true" || req.query[key] === true;
                } else if (key === "code") {
                    filters[key] = req.query[key].toUpperCase();
                } else {
                    filters[key] = req.query[key];
                }
            }
        }

        // Safe sorting (whitelist only)
        const allowedSorts = ["priority", "createdAt", "usedCount", "name"];
        const sortBy = allowedSorts.includes(req.query.sortBy)
            ? req.query.sortBy
            : "createdAt";
        const order = req.query.order === "asc" ? 1 : -1;
        const sort = { [sortBy]: order };

        // Execute query
        const modifiers = await PriceModifier.find(filters)
            .sort(sort)
            .limit(limit)
            .skip(skip)
            .lean();

        const total = await PriceModifier.countDocuments(filters);

        return res.json({
            success: true,
            modifiers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("❌ Error fetching modifiers:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch modifiers" });
    }
};

/**
 * GET /api/modifiers/:id
 * Get single modifier by ID
 */
export const getModifierById = async (req, res) => {
    try {
        const { id } = req.params;

        const modifier = await PriceModifier.findById(id).lean();

        if (!modifier) {
            return res.status(404).json({ error: "Modifier not found" });
        }

        return res.json({
            success: true,
            data: modifier
        });
    } catch (err) {
        console.error("❌ Error fetching modifier:", err);
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid modifier ID format" });
        }
        return res.status(500).json({ error: err.message || "Failed to fetch modifier" });
    }
};

/**
 * PUT /api/modifiers/:id
 * Update a modifier
 */
export const updateModifier = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate modifier data
        const validation = ModifierEngine.validateModifier(updateData);
        if (!validation.valid) {
            return res.status(400).json({
                error: "Validation failed",
                details: validation.errors
            });
        }

        // Check for duplicate code (excluding current modifier)
        if (updateData.code) {
            const existing = await PriceModifier.findOne({
                code: updateData.code.toUpperCase(),
                _id: { $ne: id }
            });

            if (existing) {
                return res.status(400).json({
                    error: `Modifier with code "${updateData.code}" already exists`
                });
            }
        }

        // Transform code to uppercase
        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
        }

        const modifier = await PriceModifier.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!modifier) {
            return res.status(404).json({ error: "Modifier not found" });
        }

        return res.json({
            success: true,
            message: "Modifier updated successfully",
            data: modifier
        });
    } catch (err) {
        console.error("❌ Error updating modifier:", err);
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid modifier ID format" });
        }
        return res.status(500).json({ error: err.message || "Failed to update modifier" });
    }
};

/**
 * DELETE /api/modifiers/:id
 * Delete a modifier
 */
export const deleteModifier = async (req, res) => {
    try {
        const { id } = req.params;

        const modifier = await PriceModifier.findByIdAndDelete(id);

        if (!modifier) {
            return res.status(404).json({ error: "Modifier not found" });
        }

        return res.json({
            success: true,
            message: "Modifier deleted successfully"
        });
    } catch (err) {
        console.error("❌ Error deleting modifier:", err);
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid modifier ID format" });
        }
        return res.status(500).json({ error: err.message || "Failed to delete modifier" });
    }
};

/**
 * POST /api/modifiers/:id/toggle
 * Toggle modifier active status
 */
export const toggleModifier = async (req, res) => {
    try {
        const { id } = req.params;

        const modifier = await PriceModifier.findById(id);

        if (!modifier) {
            return res.status(404).json({ error: "Modifier not found" });
        }

        modifier.isActive = !modifier.isActive;
        await modifier.save();

        return res.json({
            success: true,
            message: `Modifier ${modifier.isActive ? 'activated' : 'deactivated'} successfully`,
            data: modifier
        });
    } catch (err) {
        console.error("❌ Error toggling modifier:", err);
        if (err.name === "CastError") {
            return res.status(400).json({ error: "Invalid modifier ID format" });
        }
        return res.status(500).json({ error: err.message || "Failed to toggle modifier" });
    }
};

/**
 * POST /api/modifiers/validate
 * Validate modifier data without saving
 */
export const validateModifier = async (req, res) => {
    try {
        const modifierData = req.body;

        const validation = ModifierEngine.validateModifier(modifierData);

        return res.json({
            success: true,
            valid: validation.valid,
            errors: validation.errors || []
        });
    } catch (err) {
        console.error("❌ Error validating modifier:", err);
        return res.status(500).json({ error: err.message || "Failed to validate modifier" });
    }
};

/**
 * POST /api/modifiers/preview
 * Preview modifier effect on pricing
 * 
 * IMPORTANT: This endpoint does NOT save anything or increment usage.
 * It's used for Smart Admin Views (Step 3) to preview pricing changes.
 */
export const previewModifier = async (req, res) => {
    try {
        const {
            productId,
            userSegmentId,
            pincode,
            selectedDynamicAttributes,
            quantity,
            promoCodes
        } = req.body;

        // Validate required fields
        if (!productId || !quantity) {
            return res.status(400).json({
                error: "productId and quantity are required for preview"
            });
        }

        // Call PricingService with fake/test context
        // ❌ Does NOT save anything
        // ❌ Does NOT increment usage
        // ✅ Returns pricing breakdown with modifiers applied
        const preview = await PricingService.resolvePrice({
            productId,
            userSegmentId,
            pincode: pincode || '110001', // Default for preview
            selectedDynamicAttributes: selectedDynamicAttributes || [],
            quantity,
            promoCodes: promoCodes || []
        });

        return res.json({
            success: true,
            message: "Preview generated successfully",
            data: preview
        });
    } catch (err) {
        console.error("❌ Error generating preview:", err);
        return res.status(500).json({ error: err.message || "Failed to generate preview" });
    }
};
