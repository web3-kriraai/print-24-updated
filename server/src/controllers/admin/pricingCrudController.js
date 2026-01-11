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
        const { name, code, description, currency, pincodeRanges, isActive } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Geo zone name is required' });
        }

        // Create the geo zone
        const geoZone = await GeoZone.create({
            name,
            code,
            description: description || '',
            currency: currency || 'INR',
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
        const { name, code, description, currency, pincodeRanges, isActive } = req.body;

        // Update the geo zone
        const geoZone = await GeoZone.findByIdAndUpdate(
            id,
            { name, code, description, currency, isActive },
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
        const { id } = req.params;

        const geoZone = await GeoZone.findByIdAndDelete(id);
        if (!geoZone) {
            return res.status(404).json({ success: false, message: 'Geo zone not found' });
        }

        // Delete all associated pincode range mappings
        await GeoZoneMapping.deleteMany({ geoZone: id });

        res.json({ success: true, message: 'Geo zone deleted' });
    } catch (error) {
        console.error('Delete geo zone error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

//================================
// USER SEGMENT CRUD OPERATIONS
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
