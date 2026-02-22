import shiprocketService from '../services/courier/ShiprocketService.js';
import Product from '../models/productModal.js';

/**
 * Get shipping estimate for product detail page
 * Calculates final ETA = Current Date + Production Time + Transit Time
 */
export const getShippingEstimate = async (req, res) => {
    try {
        const { pincode, productId, quantity, strategy = 'balanced' } = req.body;

        if (!pincode || !productId) {
            return res.status(400).json({ error: 'Pincode and productId are required' });
        }

        // 1. Get Product Production Time & Weight
        let product = null;
        try {
            product = await Product.findById(productId);
        } catch (err) {
            console.log("Product lookup failed for ETA:", err.message);
        }

        const reqQty = parseInt(quantity) || 1;
        let productionDays = 2; // Default fallback
        let shippingWeight = 0.5; // Default fallback weight in kg

        if (product && product.productionTimeRanges && product.productionTimeRanges.length > 0) {
            // Find applicable range based on quantity
            const applicableRange = product.productionTimeRanges.find(
                r => reqQty >= r.minQuantity && (!r.maxQuantity || reqQty <= r.maxQuantity)
            ) || product.productionTimeRanges[product.productionTimeRanges.length - 1]; // Fallback to maximum range

            const days = Number(applicableRange.days) || 0;
            const hours = Number(applicableRange.hours) || 0;
            const totalFractionalDays = days + (hours / 24);

            // User requested that any partial hours round up to a full day
            productionDays = Math.ceil(totalFractionalDays);
            if (productionDays === 0) productionDays = 1; // Minimum 1 day

            // Use weight from the matching range if defined
            // The admin defines the total weight FOR this specific quantity range, do NOT multiply by quantity
            if (applicableRange.weightKg && applicableRange.weightKg > 0) {
                shippingWeight = applicableRange.weightKg;
                console.log(`[ShippingEstimate] weight picked from product range: ${shippingWeight}kg for quantity: ${reqQty}`);
            } else {
                console.log(`[ShippingEstimate] weight for product range not found, using default: 0.5kg`);
            }
        }

        // 2. Resolve pickup pincode from geo zone warehouse (fallback to env)
        let pickupPincode = process.env.PICKUP_PINCODE || '395004';
        let warehouseName = '';
        try {
            const GeoZone = (await import('../models/GeoZon.js')).default;
            const resolvedZone = await GeoZone.resolveByPincode(pincode);
            if (resolvedZone && resolvedZone.warehousePincode) {
                pickupPincode = resolvedZone.warehousePincode;
                warehouseName = resolvedZone.warehouseName || '';
                console.log(`[ShippingEstimate] Resolved warehouse: ${warehouseName} (${pickupPincode}) from zone: ${resolvedZone.name}`);
            }
        } catch (err) {
            console.log('[ShippingEstimate] Geo zone warehouse resolution failed, using default:', err.message);
        }

        // 3. Contact Shiprocket via the class instance
        const serviceData = await shiprocketService.checkServiceability(
            pickupPincode,
            pincode,
            shippingWeight
        );

        if (!serviceData || !serviceData.available || !serviceData.couriers || serviceData.couriers.length === 0) {
            return res.status(404).json({
                error: serviceData?.message || 'Delivery not available to this pincode based on our courier partners.'
            });
        }

        // 4. Apply Smart Routing Protocol
        // Use recommended given by Shiprocket Service or pick worst case fallback
        const bestCourier = serviceData.recommendedCourier || serviceData.couriers[0];

        // Calculate Transit Days from Courier String
        let transitDays = parseInt(bestCourier.estimatedDays);
        if (isNaN(transitDays)) transitDays = 5; // Fallback if shiprocket sends bad text

        const totalDays = productionDays + transitDays;

        // Calculate dynamic ETA dates
        const now = new Date();
        const etaDateMin = new Date(now);
        etaDateMin.setDate(now.getDate() + totalDays);

        // Add a +1 day buffer range
        const etaDateMax = new Date(etaDateMin);
        etaDateMax.setDate(etaDateMin.getDate() + 1);

        res.json({
            success: true,
            data: {
                is_serviceable: true,
                courier_name: bestCourier.courierName,
                shipping_cost: bestCourier.rate,
                estimated_transit_days: transitDays,
                production_days: productionDays,
                total_days: totalDays,
                eta_range_start: etaDateMin,
                eta_range_end: etaDateMax,
                smart_routing: strategy,
                warehouse_name: warehouseName || null,
                pickup_pincode: pickupPincode,
                weight_kg: shippingWeight,
            }
        });

    } catch (error) {
        console.error('Shipping Estimate Error:', error);
        res.status(500).json({ error: error.message || 'Failed to calculate shipping estimate' });
    }
};
