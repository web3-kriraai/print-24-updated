/**
 * Shipment Controller
 * 
 * Handles shipment-related CRUD operations:
 * - Get shipment details for an order
 * - Get live tracking info from Shiprocket
 * - Admin: manually trigger shipment creation
 * 
 * @module controllers/shipment.controller
 */

import Order from '../models/orderModal.js';
import { User } from '../models/User.js';
import Product from '../models/productModal.js';
import shiprocketService from '../services/courier/ShiprocketService.js';

/**
 * Calculate estimated delivery date
 * @param {Date} baseDate - Start date (order creation or production end)
 * @param {number} productionDays - Days remaining for production (0 if complete)
 * @param {number} transitDays - Courier transit days
 * @param {number} bufferDays - Additional buffer (default 1)
 * @returns {{ eddMin: Date, eddMax: Date }} Estimated delivery date range
 */
export function calculateEDD(baseDate, productionDays = 0, transitDays = 5, bufferDays = 1) {
    const base = new Date(baseDate);
    const totalDays = productionDays + transitDays;

    const eddMin = new Date(base);
    eddMin.setDate(base.getDate() + totalDays);

    const eddMax = new Date(eddMin);
    eddMax.setDate(eddMin.getDate() + bufferDays);

    return { eddMin, eddMax };
}

/**
 * Fetch city and state from pincode using India Post API (fallback for missing data)
 * @param {string} pincode - 6-digit Indian pincode
 * @returns {Promise<{city: string, state: string}>}
 */
async function fetchCityStateFromPincode(pincode) {
    try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, { timeout: 5000 });
        const data = response.data;
        if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            return {
                city: po.District || po.Block || po.Name || '',
                state: po.State || ''
            };
        }
    } catch (err) {
        console.warn(`[Shipment] Could not fetch city/state from pincode ${pincode}:`, err.message);
    }
    return { city: '', state: '' };
}

/**
 * Build Shiprocket-compatible order data from our Order document
 * @param {Object} order - Mongoose order document (populated with user & product)
 * @param {Object} user - User document
 * @param {string} resolvedCity - City resolved from pincode lookup (optional)
 * @param {string} resolvedState - State resolved from pincode lookup (optional)
 * @returns {Object} Shiprocket order payload
 */
function buildShiprocketOrderData(order, user, resolvedCity = '', resolvedState = '') {
    const productName = order.product?.name || 'Print Order';

    const city = order.shippingAddress?.city || order.city || resolvedCity || 'Unknown';
    const state = order.shippingAddress?.state || order.state || resolvedState || 'Unknown';

    console.log(`[Shipment] 📋 Order data — Pincode: ${order.pincode} | City: ${city} | State: ${state} | Mobile: ${order.mobileNumber || 'MISSING'}`);

    return {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        pickupLocation: 'Primary',
        notes: order.notes || '',
        customerName: user.name || 'Customer',
        customerLastName: '',
        address: order.address || '',
        billingAddress: order.address || '',
        city,
        pincode: order.pincode || '',
        state,
        country: order.shippingAddress?.country || order.country || 'India',
        email: user.email || 'customer@example.com',
        mobileNumber: order.mobileNumber || '9999999999',
        shippingIsBilling: true,
        productName: productName,
        productSku: order.orderNumber,
        quantity: order.quantity || 1,
        itemPrice: order.priceSnapshot?.totalPayable || order.totalPrice || 0,
        totalPrice: order.priceSnapshot?.totalPayable || order.totalPrice || 0,
        paymentMethod: 'Prepaid',
        shippingCharges: order.priceSnapshot?.shippingCharge || 0,
        weight: order.calculatedWeight || 0.5, // Use dynamically calculated weight
        length: 20,  // Default dimensions in cm
        breadth: 15,
        height: 5,
    };
}

/**
 * Trigger shipment creation for an order
 * Called internally after production completion or manually by admin
 * 
 * @param {Object} order - Mongoose order document (must be populated with product)
 * @returns {Object} Shipment result
 */
export async function triggerShipmentCreation(order) {
    console.log(`[Shipment] ═══════════════════════════════════════`);
    console.log(`[Shipment] 📦 Triggering shipment for order: ${order.orderNumber}`);

    // Load user details
    const user = await User.findById(order.user).lean();
    if (!user) {
        throw new Error(`User not found for order ${order.orderNumber}`);
    }

    // Calculate dynamic weight based on product productionTimeRanges and order quantity
    let calculatedWeight = 0.5;
    let productionDays = 2; // Default fallback for production check
    const reqQty = parseInt(order.quantity) || 1;

    if (order.product && order.product.productionTimeRanges && order.product.productionTimeRanges.length > 0) {
        // Find applicable range based on quantity
        const applicableRange = order.product.productionTimeRanges.find(
            r => reqQty >= r.minQuantity && (!r.maxQuantity || reqQty <= r.maxQuantity)
        ) || order.product.productionTimeRanges[order.product.productionTimeRanges.length - 1]; // Fallback to maximum range

        const days = Number(applicableRange.days) || 0;
        const hours = Number(applicableRange.hours) || 0;
        const totalFractionalDays = days + (hours / 24);

        productionDays = Math.ceil(totalFractionalDays);
        if (productionDays === 0) productionDays = 1;

        if (applicableRange.weightKg && applicableRange.weightKg > 0) {
            calculatedWeight = applicableRange.weightKg;
            console.log(`[Shipment] dynamic weight set to ${calculatedWeight}kg based on quantity range match for ${reqQty}`);
        }
    }

    order.calculatedWeight = calculatedWeight;

    // Resolve pickup pincode and warehouse from geo zone hierarchy
    let COMPANY_PICKUP_PINCODE = order.pickupWarehousePincode || process.env.PICKUP_PINCODE || '395004';
    let warehouseName = order.pickupWarehouseName || 'Primary';

    // If not already set on order, try to resolve dynamically (for legacy orders or if hierarchy lookup is desired)
    if (!order.pickupWarehouseName || !order.pickupWarehousePincode) {
        try {
            const GeoZone = (await import('../models/GeoZon.js')).default;
            const warehouseZone = await GeoZone.resolveWarehouseByPincode(order.pincode);
            if (warehouseZone) {
                COMPANY_PICKUP_PINCODE = warehouseZone.warehousePincode;
                warehouseName = warehouseZone.warehouseName || 'Primary';
                console.log(`[Shipment] Hierarchical lookup: Resolved warehouse: ${warehouseName} (${COMPANY_PICKUP_PINCODE}) from zone: ${warehouseZone.name}`);
            }
        } catch (err) {
            console.error('[Shipment] Error resolving hierarchical warehouse:', err.message);
        }
    } else {
        console.log(`[Shipment] Using associated warehouse from order: ${warehouseName} (${COMPANY_PICKUP_PINCODE})`);
    }

    let courierId = null;
    let courierName = null;
    let transitDays = 5; // Default fallback

    // Resolve city/state from pincode if they are missing in the order
    let resolvedCity = order.city || '';
    let resolvedState = order.state || '';
    if (!resolvedCity || !resolvedState) {
        console.log(`[Shipment] City/State missing in order — fetching from pincode ${order.pincode}...`);
        const pinData = await fetchCityStateFromPincode(order.pincode);
        resolvedCity = resolvedCity || pinData.city;
        resolvedState = resolvedState || pinData.state;
        console.log(`[Shipment] Resolved pincode data: City=${resolvedCity}, State=${resolvedState}`);
    }

    try {
        const serviceData = await shiprocketService.checkServiceability(
            COMPANY_PICKUP_PINCODE,
            order.pincode,
            calculatedWeight
        );

        if (serviceData?.available && serviceData.recommendedCourier) {
            courierId = serviceData.recommendedCourier.courierId;
            courierName = serviceData.recommendedCourier.courierName;
            transitDays = parseInt(serviceData.recommendedCourier.estimatedDays) || 5;
            console.log(`[Shipment] 🚛 Recommended courier: ${courierName} (${courierId}), ETA: ${transitDays} days`);
        }
    } catch (err) {
        console.warn(`[Shipment] ⚠️  Serviceability check failed, using defaults:`, err.message);
    }

    // Build order data for Shiprocket
    const orderData = buildShiprocketOrderData(order, user, resolvedCity, resolvedState);
    orderData.pickupLocation = warehouseName; // Update pickup location to the resolved warehouse name

    // Determine production end date for pickup scheduling
    const productionEndDate = new Date(); // Production just completed

    // Create complete shipment (order + AWB + pickup)
    const shipmentResult = await shiprocketService.createCompleteShipment(
        orderData,
        courierId,
        courierName,
        productionEndDate
    );

    // Calculate EDD from production end date
    const { eddMin } = calculateEDD(productionEndDate, 0, transitDays, 1);

    // Update order with shipment details
    order.shiprocketOrderId = String(shipmentResult.shiprocketOrderId);
    order.shiprocketShipmentId = String(shipmentResult.shiprocketShipmentId);
    order.awbCode = shipmentResult.awbCode;
    order.courierPartner = shipmentResult.courierName || courierName;
    order.pickupWarehouseName = warehouseName;           // Geo zone-resolved warehouse name
    order.pickupWarehousePincode = COMPANY_PICKUP_PINCODE; // Geo zone-resolved pickup pincode
    order.trackingId = shipmentResult.awbCode;
    order.isMockShipment = shipmentResult.isMock || false;
    order.courierStatus = 'shipment_created';
    order.estimatedDeliveryDate = eddMin;
    order.pickupScheduledDate = shipmentResult.pickupScheduledDate
        ? new Date(shipmentResult.pickupScheduledDate)
        : null;
    order.courierTrackingUrl = shipmentResult.isMock
        ? null
        : `https://shiprocket.co/tracking/${shipmentResult.awbCode}`;

    // Add to courier timeline
    if (!order.courierTimeline) {
        order.courierTimeline = [];
    }
    order.courierTimeline.push({
        status: 'shipment_created',
        location: 'Origin',
        timestamp: new Date(),
        notes: `Shipment created via ${shipmentResult.isMock ? 'TEST MODE' : 'Shiprocket'}. AWB: ${shipmentResult.awbCode}. Courier: ${shipmentResult.courierName || courierName || 'Auto'}`
    });

    if (shipmentResult.pickupScheduledDate) {
        order.courierTimeline.push({
            status: 'pickup_scheduled',
            location: 'Origin',
            timestamp: new Date(shipmentResult.pickupScheduledDate),
            notes: `Pickup scheduled for ${new Date(shipmentResult.pickupScheduledDate).toLocaleDateString()}`
        });
        order.courierStatus = 'pickup_scheduled';
    }

    await order.save();

    console.log(`[Shipment] ✅ Shipment created for ${order.orderNumber}`);
    console.log(`[Shipment]    AWB: ${shipmentResult.awbCode} ${shipmentResult.isMock ? '(MOCK)' : ''}`);
    console.log(`[Shipment]    EDD: ${eddMin.toLocaleDateString()}`);
    console.log(`[Shipment] ═══════════════════════════════════════`);

    return shipmentResult;
}

/**
 * GET /api/orders/:orderId/shipment
 * Get shipment details for an order
 */
export const getShipmentDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .select('orderNumber shiprocketOrderId shiprocketShipmentId awbCode courierPartner pickupWarehouseName pickupWarehousePincode trackingId courierStatus courierTrackingUrl estimatedDeliveryDate pickupScheduledDate isMockShipment courierTimeline dispatchedAt deliveredAt handedOverToCourierAt')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if shipment exists
        if (!order.awbCode && !order.shiprocketOrderId) {
            return res.json({
                success: true,
                hasShipment: false,
                message: 'No shipment created for this order yet'
            });
        }

        return res.json({
            success: true,
            hasShipment: true,
            shipment: {
                orderNumber: order.orderNumber,
                shiprocketOrderId: order.shiprocketOrderId,
                shiprocketShipmentId: order.shiprocketShipmentId,
                awbCode: order.awbCode,
                courierPartner: order.courierPartner,
                pickupWarehouseName: order.pickupWarehouseName || null,
                pickupWarehousePincode: order.pickupWarehousePincode || null,
                trackingId: order.trackingId,
                courierStatus: order.courierStatus,
                courierTrackingUrl: order.courierTrackingUrl,
                estimatedDeliveryDate: order.estimatedDeliveryDate,
                pickupScheduledDate: order.pickupScheduledDate,
                isMockShipment: order.isMockShipment,
                dispatchedAt: order.dispatchedAt,
                deliveredAt: order.deliveredAt,
                handedOverToCourierAt: order.handedOverToCourierAt,
                courierTimeline: order.courierTimeline || [],
            }
        });
    } catch (error) {
        console.error('[Shipment] Error getting shipment details:', error);
        return res.status(500).json({ error: error.message || 'Failed to get shipment details' });
    }
};

/**
 * GET /api/orders/:orderId/tracking
 * Fetch live tracking info from Shiprocket
 */
export const getTrackingInfo = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .select('awbCode shiprocketOrderId isMockShipment courierTimeline courierStatus estimatedDeliveryDate courierPartner')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // If mock shipment, return stored timeline data
        if (order.isMockShipment || !order.awbCode) {
            return res.json({
                success: true,
                isMock: true,
                tracking: {
                    currentStatus: order.courierStatus || 'shipment_created',
                    courierName: order.courierPartner,
                    estimatedDeliveryDate: order.estimatedDeliveryDate,
                    activities: (order.courierTimeline || []).map(t => ({
                        status: t.status,
                        location: t.location,
                        date: t.timestamp,
                        notes: t.notes
                    }))
                }
            });
        }

        // Fetch live tracking from Shiprocket
        try {
            const tracking = await shiprocketService.getTracking(order.awbCode);
            return res.json({
                success: true,
                isMock: false,
                tracking: {
                    currentStatus: tracking.currentStatus,
                    courierName: tracking.courierName,
                    etd: tracking.etd,
                    estimatedDeliveryDate: order.estimatedDeliveryDate,
                    origin: tracking.originCity,
                    destination: tracking.destinationCity,
                    activities: tracking.activities || []
                }
            });
        } catch (trackErr) {
            console.warn('[Shipment] Live tracking failed, returning stored data:', trackErr.message);
            // Fallback to stored timeline
            return res.json({
                success: true,
                isMock: true,
                fallback: true,
                tracking: {
                    currentStatus: order.courierStatus || 'shipment_created',
                    courierName: order.courierPartner,
                    estimatedDeliveryDate: order.estimatedDeliveryDate,
                    activities: (order.courierTimeline || []).map(t => ({
                        status: t.status,
                        location: t.location,
                        date: t.timestamp,
                        notes: t.notes
                    }))
                }
            });
        }
    } catch (error) {
        console.error('[Shipment] Error getting tracking info:', error);
        return res.status(500).json({ error: error.message || 'Failed to get tracking info' });
    }
};

/**
 * POST /api/admin/orders/:orderId/create-shipment
 * Admin-only: Manually trigger shipment creation
 */
export const retryShipment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('product');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if shipment already exists
        if (order.awbCode) {
            return res.status(400).json({
                error: 'Shipment already created for this order',
                awbCode: order.awbCode,
                courierPartner: order.courierPartner
            });
        }

        const result = await triggerShipmentCreation(order);

        return res.json({
            success: true,
            message: `Shipment created for order ${order.orderNumber}`,
            shipment: {
                awbCode: result.awbCode,
                courierName: result.courierName,
                isMock: result.isMock,
                pickupScheduledDate: result.pickupScheduledDate
            }
        });
    } catch (error) {
        console.error('[Shipment] Error creating shipment:', error);
        return res.status(500).json({ error: error.message || 'Failed to create shipment' });
    }
};
