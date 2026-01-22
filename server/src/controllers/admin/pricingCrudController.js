import ProductAvailability from '../../models/ProductAvailability.js';

/**
 * Additional CRUD controllers for Geo Zones, User Segments, and Product Availability
 * These are imported and used by pricingAdminRoutes.js
 */

//================================
// GEO ZONE CRUD OPERATIONS
//================================

export const createGeoZone = async (req, res) => {
    try {
        const GeoZone = (await import('../../models/GeoZon.js')).default;
        const GeoZoneMapping = (await import('../../models/GeoZonMapping.js')).default;
        const { name, code, description, currency_code, pincodeRanges, isActive, level } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Geo zone name is required' });
        }

        // Check for duplicate name (case‑insensitive)
        const existingZone = await GeoZone.findOne({
            name: new RegExp('^' + name.trim() + '$', 'i')
        });
        if (existingZone) {
            return res.status(400).json({
                success: false,
                message: 'A Geo Zone with this name already exists. Please choose a unique name.'
            });
        }

        // Create the geo zone
        const geoZone = await GeoZone.create({
            name,
            code,
            description: description || '',
            currency_code: currency_code || 'INR', // Default to INR if not provided
            level: level || 'COUNTRY', // Default to COUNTRY if not specified
            isActive: isActive !== false
        });

        // Create pincode range mappings
        if (pincodeRanges && pincodeRanges.length > 0) {
            const mappings = pincodeRanges.map(range => ({
                geoZone: geoZone._id,
                pincodeStart: range.start,
                pincodeEnd: range.end
            }));
            await GeoZoneMapping.insertMany(mappings);
        }

        // Fetch the created mappings to return
        const createdMappings = await GeoZoneMapping.find({ geoZone: geoZone._id });
        const geoZoneWithRanges = {
            ...geoZone.toObject(),
            pincodeRanges: createdMappings.map(m => ({
                start: m.pincodeStart,
                end: m.pincodeEnd
            }))
        };

        res.json({ success: true, geoZone: geoZoneWithRanges });
    } catch (error) {
        console.error('Create geo zone error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateGeoZone = async (req, res) => {
    try {
        const GeoZone = (await import('../../models/GeoZon.js')).default;
        const GeoZoneMapping = (await import('../../models/GeoZonMapping.js')).default;
        const { id } = req.params;
        const { name, code, description, currency_code, pincodeRanges, isActive, level } = req.body;

        // Check for duplicate name (exclude current zone, case‑insensitive)
        if (name) {
            const existingZone = await GeoZone.findOne({
                name: new RegExp('^' + name.trim() + '$', 'i'),
                _id: { $ne: id }
            });
            if (existingZone) {
                return res.status(400).json({
                    success: false,
                    message: 'A Geo Zone with this name already exists. Please choose a unique name.'
                });
            }
        }

        // Update the geo zone
        const geoZone = await GeoZone.findByIdAndUpdate(
            id,
            { name, code, description, currency_code, isActive, level },
            { new: true }
        );

        if (!geoZone) {
            return res.status(404).json({ success: false, message: 'Geo zone not found' });
        }

        // Update pincode range mappings
        // Delete existing mappings
        await GeoZoneMapping.deleteMany({ geoZone: id });

        // Create new mappings
        if (pincodeRanges && pincodeRanges.length > 0) {
            const mappings = pincodeRanges.map(range => ({
                geoZone: id,
                pincodeStart: range.start,
                pincodeEnd: range.end
            }));
            await GeoZoneMapping.insertMany(mappings);
        }

        // Fetch the updated mappings to return
        const updatedMappings = await GeoZoneMapping.find({ geoZone: id });
        const geoZoneWithRanges = {
            ...geoZone.toObject(),
            pincodeRanges: updatedMappings.map(m => ({
                start: m.pincodeStart,
                end: m.pincodeEnd
            }))
        };

        res.json({ success: true, geoZone: geoZoneWithRanges });
    } catch (error) {
        console.error('Update geo zone error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteGeoZone = async (req, res) => {
    try {
        const GeoZone = (await import('../../models/GeoZon.js')).default;
        const GeoZoneMapping = (await import('../../models/GeoZonMapping.js')).default;
        const PriceBook = (await import('../../models/PriceBook.js')).default;
        const ProductAvailability = (await import('../../models/ProductAvailability.js')).default;

        const { id } = req.params;
        const { force } = req.query;

        // Check for dependencies
        const priceBookCount = await PriceBook.countDocuments({ zone: id });
        const availabilityCount = await ProductAvailability.countDocuments({ geoZone: id });

        if ((priceBookCount > 0 || availabilityCount > 0) && force !== 'true') {
            return res.status(400).json({
                success: false,
                message: `This zone is used by ${priceBookCount} price books and ${availabilityCount} availability rules. Deleting it will cascade delete these associated records.`,
                requiresConfirmation: true,
                counts: {
                    priceBooks: priceBookCount,
                    availabilityRules: availabilityCount
                }
            });
        }

        // Proceed with deletion (and cascade if forced or no dependencies)
        const geoZone = await GeoZone.findByIdAndDelete(id);
        if (!geoZone) {
            return res.status(404).json({ success: false, message: 'Geo zone not found' });
        }

        // Delete all associated pincode range mappings (always safe)
        await GeoZoneMapping.deleteMany({ geoZone: id });

        // Cascade delete dependencies
        if (priceBookCount > 0) {
            await PriceBook.deleteMany({ zone: id });
        }
        if (availabilityCount > 0) {
            await ProductAvailability.deleteMany({ geoZone: id });
        }

        res.json({
            success: true,
            message: 'Geo zone and associated data deleted successfully',
            details: {
                deletedPriceBooks: priceBookCount,
                deletedAvailabilityRules: availabilityCount
            }
        });
    } catch (error) {
        console.error('Delete geo zone error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// USER SEGMENT CRUD OPERATIONS

export const bulkImportGeoZones = async (req, res) => {
    try {
        const GeoZone = (await import('../../models/GeoZon.js')).default;
        const GeoZoneMapping = (await import('../../models/GeoZonMapping.js')).default;
        const { zones } = req.body; // Expects array of { name, code, level, currency_code, pincodeStart, pincodeEnd }

        if (!zones || !Array.isArray(zones)) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of zones.' });
        }

        const results = {
            created: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        for (const zoneData of zones) {
            try {
                const { name, code, level, currency_code, pincodeStart, pincodeEnd } = zoneData;

                if (!name) {
                    results.failed++;
                    results.errors.push('Row missing name');
                    continue;
                }

                // Find or create zone with duplicate name guard (case‑insensitive)
                const query = { name };
                if (code) query.code = code;

                let zone;
                // Check for existing zone with same name (case‑insensitive)
                const duplicate = await GeoZone.findOne({ name: new RegExp('^' + name.trim() + '$', 'i') });
                if (duplicate) {
                    // Treat as update of existing zone
                    duplicate.currency_code = currency_code || duplicate.currency_code;
                    duplicate.level = level || duplicate.level;
                    if (code) duplicate.code = code;
                    await duplicate.save();
                    results.updated++;
                    zone = duplicate;
                } else {
                    // Create new zone
                    zone = await GeoZone.create({
                        name,
                        code,
                        level: level || 'COUNTRY',
                        currency_code: currency_code || 'INR',
                        isActive: true
                    });
                    results.created++;
                }

                // Add pincode mapping if provided
                if (pincodeStart && pincodeEnd) {
                    // Check if mapping exists to avoid duplicates
                    const existingMapping = await GeoZoneMapping.findOne({
                        geoZone: zone._id,
                        pincodeStart,
                        pincodeEnd
                    });

                    if (!existingMapping) {
                        await GeoZoneMapping.create({
                            geoZone: zone._id,
                            pincodeStart,
                            pincodeEnd
                        });
                    }
                }
            } catch (err) {
                console.error('Error processing zone:', zoneData.name, err);
                results.failed++;
                results.errors.push(`${zoneData.name}: ${err.message}`);
            }
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================

export const createUserSegment = async (req, res) => {
    try {
        const UserSegment = (await import('../../models/UserSegment.js')).default;
        const { name, code, description, priority, isDefault, isActive } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Name and code are required' });
        }

        // If setting as default, unset others
        if (isDefault) {
            await UserSegment.updateMany({}, { isDefault: false });
        }

        const userSegment = await UserSegment.create({
            name,
            code,
            description: description || '',
            priority: priority || 0,
            isDefault: isDefault || false,
            isActive: isActive !== false
        });

        res.json({ success: true, userSegment });
    } catch (error) {
        console.error('Create user segment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateUserSegment = async (req, res) => {
    try {
        const UserSegment = (await import('../../models/UserSegment.js')).default;
        const { id } = req.params;
        const { name, code, description, priority, isDefault, isActive } = req.body;

        // If setting as default, unset others
        if (isDefault) {
            await UserSegment.updateMany({}, { isDefault: false });
        }

        const userSegment = await UserSegment.findByIdAndUpdate(
            id,
            { name, code, description, priority, isDefault, isActive },
            { new: true }
        );

        if (!userSegment) {
            return res.status(404).json({ success: false, message: 'User segment not found' });
        }

        res.json({ success: true, userSegment });
    } catch (error) {
        console.error('Update user segment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteUserSegment = async (req, res) => {
    try {
        const UserSegment = (await import('../../models/UserSegment.js')).default;
        const { id } = req.params;

        const userSegment = await UserSegment.findById(id);
        if (!userSegment) {
            return res.status(404).json({ success: false, message: 'User segment not found' });
        }

        if (userSegment.isDefault) {
            return res.status(400).json({ success: false, message: 'Cannot delete default user segment' });
        }

        if (userSegment.isSystem) {
            return res.status(403).json({ success: false, message: 'Cannot delete system-protected user segment' });
        }

        await UserSegment.findByIdAndDelete(id);
        res.json({ success: true, message: 'User segment deleted' });
    } catch (error) {
        console.error('Delete user segment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const setDefaultUserSegment = async (req, res) => {
    try {
        const UserSegment = (await import('../../models/UserSegment.js')).default;
        const { id } = req.params;

        // Unset all defaults
        await UserSegment.updateMany({}, { isDefault: false });

        // Set this one as default
        const userSegment = await UserSegment.findByIdAndUpdate(
            id,
            { isDefault: true },
            { new: true }
        );

        if (!userSegment) {
            return res.status(404).json({ success: false, message: 'User segment not found' });
        }

        res.json({ success: true, userSegment });
    } catch (error) {
        console.error('Set default user segment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// PRODUCT AVAILABILITY CRUD OPERATIONS
//================================

export const getProductAvailability = async (req, res) => {
    try {
        const availability = await ProductAvailability.find()
            .populate('product', 'name image')
            .populate('geoZone', 'name currency')
            .sort({ createdAt: -1 });

        res.json({ success: true, availability });
    } catch (error) {
        console.error('Get product availability error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProductAvailability = async (req, res) => {
    try {
        const { product, geoZone, isSellable, reason } = req.body;

        if (!product || !geoZone) {
            return res.status(400).json({ success: false, message: 'Product and geo zone are required' });
        }

        // Check if rule already exists
        const existing = await ProductAvailability.findOne({ product, geoZone });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Availability rule already exists for this product and geo zone'
            });
        }

        const availability = await ProductAvailability.create({
            product,
            geoZone,
            isSellable: isSellable !== false,
            reason: reason || ''
        });

        await availability.populate('product geoZone');
        res.json({ success: true, availability });
    } catch (error) {
        console.error('Create product availability error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateProductAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { isSellable, reason } = req.body;

        const availability = await ProductAvailability.findByIdAndUpdate(
            id,
            { isSellable, reason },
            { new: true }
        ).populate('product geoZone');

        if (!availability) {
            return res.status(404).json({ success: false, message: 'Availability rule not found' });
        }

        res.json({ success: true, availability });
    } catch (error) {
        console.error('Update product availability error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProductAvailability = async (req, res) => {
    try {
        const { id } = req.params;

        const availability = await ProductAvailability.findByIdAndDelete(id);
        if (!availability) {
            return res.status(404).json({ success: false, message: 'Availability rule not found' });
        }

        res.json({ success: true, message: 'Availability rule deleted' });
    } catch (error) {
        console.error('Delete product availability error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
