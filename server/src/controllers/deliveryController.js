import DeliverySettings from '../models/deliverySettingsModal.js';
import { calculateEDD } from '../utils/eddCalculator.js';

/**
 * GET DELIVERY SETTINGS
 * Retrieves current delivery configuration
 */
export const getDeliverySettings = async (req, res) => {
    try {
        const settings = await DeliverySettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching delivery settings:', error);
        res.status(500).json({ error: 'Failed to fetch delivery settings' });
    }
};

/**
 * UPDATE DELIVERY SETTINGS
 * Updates buffer days, courier preference, etc.
 */
export const updateDeliverySettings = async (req, res) => {
    try {
        const {
            bufferDays,
            courierPreference,
            defaultLogisticsDays,
            skipWeekends,
        } = req.body;

        const settings = await DeliverySettings.getSettings();

        if (bufferDays !== undefined) settings.bufferDays = bufferDays;
        if (courierPreference) settings.courierPreference = courierPreference;
        if (defaultLogisticsDays !== undefined) settings.defaultLogisticsDays = defaultLogisticsDays;
        if (skipWeekends !== undefined) settings.skipWeekends = skipWeekends;

        settings.updatedBy = req.user?.id;

        await settings.save();

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating delivery settings:', error);
        res.status(500).json({ error: 'Failed to update delivery settings' });
    }
};

/**
 * ADD GEO ZONE MAPPING
 * Adds a new delivery zone
 */
export const addGeoZone = async (req, res) => {
    try {
        const { zoneName, pincodes, deliveryDays } = req.body;

        if (!zoneName || !pincodes || !deliveryDays) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const settings = await DeliverySettings.getSettings();

        settings.geoZoneMappings.push({
            zoneName,
            pincodes,
            deliveryDays,
            isActive: true,
        });

        settings.updatedBy = req.user?.id;
        await settings.save();

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error adding geo zone:', error);
        res.status(500).json({ error: 'Failed to add geo zone' });
    }
};

/**
 * UPDATE GEO ZONE
 * Updates an existing zone
 */
export const updateGeoZone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const { zoneName, pincodes, deliveryDays, isActive } = req.body;

        const settings = await DeliverySettings.getSettings();
        const zone = settings.geoZoneMappings.id(zoneId);

        if (!zone) {
            return res.status(404).json({ error: 'Zone not found' });
        }

        if (zoneName) zone.zoneName = zoneName;
        if (pincodes) zone.pincodes = pincodes;
        if (deliveryDays !== undefined) zone.deliveryDays = deliveryDays;
        if (isActive !== undefined) zone.isActive = isActive;

        settings.updatedBy = req.user?.id;
        await settings.save();

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating geo zone:', error);
        res.status(500).json({ error: 'Failed to update geo zone' });
    }
};

/**
 * DELETE GEO ZONE
 * Removes a zone
 */
export const deleteGeoZone = async (req, res) => {
    try {
        const { zoneId } = req.params;

        const settings = await DeliverySettings.getSettings();
        settings.geoZoneMappings.id(zoneId).remove();

        settings.updatedBy = req.user?.id;
        await settings.save();

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error deleting geo zone:', error);
        res.status(500).json({ error: 'Failed to delete geo zone' });
    }
};

/**
 * ADD HOLIDAY
 * Adds a non-working day
 */
export const addHoliday = async (req, res) => {
    try {
        const { date, name, recurring } = req.body;

        if (!date || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const settings = await DeliverySettings.getSettings();

        settings.holidays.push({
            date: new Date(date),
            name,
            recurring: recurring || false,
        });

        settings.updatedBy = req.user?.id;
        await settings.save();

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error adding holiday:', error);
        res.status(500).json({ error: 'Failed to add holiday' });
    }
};

/**
 * CALCULATE EDD FOR PRODUCTS
 * Calculates estimated delivery date for given products and pincode
 */
export const calculateEDDForProducts = async (req, res) => {
    try {
        const { productIds, pincode, courierDays } = req.body;

        if (!productIds || !Array.isArray(productIds) || !pincode) {
            return res.status(400).json({ error: 'Missing productIds or pincode' });
        }

        // Fetch products
        const Product = (await import('../models/productModal.js')).default;
        const products = await Product.find({ _id: { $in: productIds } })
            .populate('assignedSequence')
            .populate('productionSequence');

        // Calculate EDD
        const result = await calculateEDD({
            products,
            pincode,
            courierDays: courierDays || null,
        });

        res.json({
            success: true,
            edd: result.edd,
            breakdown: result.breakdown,
        });
    } catch (error) {
        console.error('Error calculating EDD:', error);
        res.status(500).json({ error: 'Failed to calculate EDD' });
    }
};

export default {
    getDeliverySettings,
    updateDeliverySettings,
    addGeoZone,
    updateGeoZone,
    deleteGeoZone,
    addHoliday,
    calculateEDDForProducts,
};
