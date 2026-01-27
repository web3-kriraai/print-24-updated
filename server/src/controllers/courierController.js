/**
 * Courier Controller
 * 
 * Handles courier-related operations:
 * - Pincode serviceability checks
 * - Shipment creation
 * - Tracking retrieval
 * - Smart courier selection
 * 
 * @module controllers/courierController
 */

import shiprocketService from '../services/courier/ShiprocketService.js';
import Order from '../models/orderModal.js';
import LogisticsProvider from '../models/LogisticsProvider.js';

/**
 * Check if a pincode is serviceable by external couriers
 * POST /api/courier/check-serviceability
 */
export const checkServiceability = async (req, res) => {
    try {
        const { pickupPincode, deliveryPincode, weight = 0.5, paymentMode = 'PREPAID' } = req.body;

        if (!pickupPincode || !deliveryPincode) {
            return res.status(400).json({
                success: false,
                error: 'pickupPincode and deliveryPincode are required'
            });
        }

        // Check if Shiprocket is active
        const shiprocketProvider = await LogisticsProvider.findOne({
            name: 'SHIPROCKET',
            isActive: true
        }).select('+apiCredentials');

        if (!shiprocketProvider) {
            return res.status(400).json({
                success: false,
                error: 'Shiprocket provider is not active',
                available: false
            });
        }

        // Inject credentials from DB if available (fallback for missing env vars)
        if (shiprocketProvider.apiCredentials && shiprocketProvider.apiCredentials.email && shiprocketProvider.apiCredentials.password) {
            shiprocketService.setCredentials(
                shiprocketProvider.apiCredentials.email,
                shiprocketProvider.apiCredentials.password
            );
        }

        const result = await shiprocketService.checkServiceability(
            pickupPincode,
            deliveryPincode,
            weight,
            paymentMode
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[CourierController] Serviceability check failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Create shipment for an order
 * POST /api/courier/create-shipment/:orderId
 */
export const createShipment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { courierId } = req.body; // Optional specific courier

        // Get order details
        const order = await Order.findById(orderId)
            .populate('user', 'name email phone')
            .populate('product', 'name sku');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check if already shipped
        if (order.shiprocketOrderId) {
            return res.status(400).json({
                success: false,
                error: 'Shipment already created for this order',
                shiprocketOrderId: order.shiprocketOrderId,
                awbCode: order.awbCode
            });
        }

        // Get pickup location from site settings or use default
        const pickupPincode = req.body.pickupPincode || '395006'; // Default Surat pincode

        // Inject Shiprocket credentials
        const shiprocketProvider = await LogisticsProvider.findOne({ name: 'SHIPROCKET' }).select('+apiCredentials');
        if (shiprocketProvider && shiprocketProvider.apiCredentials?.email && shiprocketProvider.apiCredentials?.password) {
            shiprocketService.setCredentials(
                shiprocketProvider.apiCredentials.email,
                shiprocketProvider.apiCredentials.password
            );
        }

        // Check serviceability first
        const serviceability = await shiprocketService.checkServiceability(
            pickupPincode,
            order.pincode,
            0.5
        );

        if (!serviceability.available) {
            return res.status(400).json({
                success: false,
                error: 'Delivery pincode is not serviceable by any courier'
            });
        }

        // Prepare order data for Shiprocket
        const orderData = {
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            customerName: order.user?.name || 'Customer',
            email: order.user?.email || '',
            mobileNumber: order.mobileNumber,
            address: order.address,
            pincode: order.pincode,
            city: req.body.city || extractCity(order.address),
            state: req.body.state || extractState(order.address),
            productName: order.product?.name || 'Print Order',
            productSku: order.product?.sku || order.orderNumber,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            itemPrice: order.totalPrice / order.quantity,
            notes: order.notes,
            paymentMethod: order.paymentStatus === 'completed' ? 'PREPAID' : 'COD',
            weight: 0.5, // Default weight, can be customized
            length: 20,
            breadth: 15,
            height: 5
        };

        // Create complete shipment (order + AWB + pickup)
        const selectedCourierId = courierId || serviceability.recommendedCourier?.courierId;
        const result = await shiprocketService.createCompleteShipment(orderData, selectedCourierId);

        // Update order with shipment details
        const updateData = {
            shiprocketOrderId: result.shiprocketOrderId,
            shiprocketShipmentId: result.shiprocketShipmentId,
            awbCode: result.awbCode,
            courierPartner: result.courierName || 'Shiprocket',
            trackingId: result.awbCode,
            courierStatus: 'pickup_scheduled',
            dispatchedAt: new Date(),
            courierTrackingUrl: `https://shiprocket.co/tracking/${result.awbCode}`
        };

        // Add to courier timeline
        const timelineEntry = {
            status: 'pickup_scheduled',
            location: 'Origin',
            timestamp: new Date(),
            notes: `Shipment created. AWB: ${result.awbCode}`
        };

        await Order.findByIdAndUpdate(orderId, {
            ...updateData,
            $push: { courierTimeline: timelineEntry }
        });

        // Link to logistics provider
        const shiprocketProviderRef = await LogisticsProvider.findOne({ name: 'SHIPROCKET' });
        if (shiprocketProviderRef) {
            await Order.findByIdAndUpdate(orderId, {
                logisticsProvider: shiprocketProviderRef._id
            });
        }

        res.json({
            success: true,
            message: 'Shipment created successfully',
            ...result,
            trackingUrl: `https://shiprocket.co/tracking/${result.awbCode}`
        });
    } catch (error) {
        console.error('[CourierController] Create shipment failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get tracking info by AWB code
 * GET /api/courier/tracking/:awbCode
 */
export const getTracking = async (req, res) => {
    try {
        const { awbCode } = req.params;

        if (!awbCode) {
            return res.status(400).json({
                success: false,
                error: 'AWB code is required'
            });
        }

        const tracking = await shiprocketService.getTracking(awbCode);

        res.json({
            success: true,
            ...tracking
        });
    } catch (error) {
        console.error('[CourierController] Get tracking failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get tracking by order ID (internal order ID)
 * GET /api/courier/tracking/order/:orderId
 */
export const getTrackingByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (!order.awbCode && !order.shiprocketOrderId) {
            return res.status(400).json({
                success: false,
                error: 'No shipment found for this order'
            });
        }

        let tracking;
        if (order.awbCode) {
            tracking = await shiprocketService.getTracking(order.awbCode);
        } else {
            tracking = await shiprocketService.getTrackingByOrderId(order.shiprocketOrderId);
        }

        res.json({
            success: true,
            orderId: order._id,
            orderNumber: order.orderNumber,
            ...tracking
        });
    } catch (error) {
        console.error('[CourierController] Get tracking by order failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Cancel shipment
 * POST /api/courier/cancel-shipment/:orderId
 */
export const cancelShipment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (!order.shiprocketOrderId) {
            return res.status(400).json({
                success: false,
                error: 'No Shiprocket order found for this order'
            });
        }

        // Check if shipment can be cancelled (not already delivered)
        if (order.courierStatus === 'delivered') {
            return res.status(400).json({
                success: false,
                error: 'Cannot cancel - shipment already delivered'
            });
        }

        await shiprocketService.cancelOrder(order.shiprocketOrderId);

        // Update order
        await Order.findByIdAndUpdate(orderId, {
            courierStatus: 'cancelled',
            $push: {
                courierTimeline: {
                    status: 'cancelled',
                    location: 'System',
                    timestamp: new Date(),
                    notes: 'Shipment cancelled'
                }
            }
        });

        res.json({
            success: true,
            message: 'Shipment cancelled successfully'
        });
    } catch (error) {
        console.error('[CourierController] Cancel shipment failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Select best courier for a pincode (smart routing)
 * POST /api/courier/select-best
 */
export const selectBestCourier = async (req, res) => {
    try {
        const { deliveryPincode, weight = 0.5, paymentMode = 'PREPAID' } = req.body;

        if (!deliveryPincode) {
            return res.status(400).json({
                success: false,
                error: 'deliveryPincode is required'
            });
        }

        // Get active external providers
        const activeProviders = await LogisticsProvider.find({
            type: 'EXTERNAL',
            isActive: true
        }).select('+apiCredentials').sort({ priority: -1 });

        if (activeProviders.length === 0) {
            // Fall back to internal logistics
            const internalProvider = await LogisticsProvider.findOne({
                type: 'INTERNAL',
                isActive: true
            });

            if (internalProvider && internalProvider.canServicePincode(deliveryPincode)) {
                return res.json({
                    success: true,
                    provider: 'INTERNAL',
                    providerName: internalProvider.displayName || 'Internal Delivery',
                    estimatedDays: internalProvider.averageDeliveryTime || 3,
                    message: 'Internal delivery selected'
                });
            }

            return res.status(400).json({
                success: false,
                error: 'No courier available for this pincode'
            });
        }

        // Try Shiprocket first (highest priority external)
        const pickupPincode = req.body.pickupPincode || '395006';

        try {
            const shiprocketProvider = activeProviders.find(p => p.name === 'SHIPROCKET');
            if (shiprocketProvider && shiprocketProvider.apiCredentials?.email && shiprocketProvider.apiCredentials?.password) {
                shiprocketService.setCredentials(
                    shiprocketProvider.apiCredentials.email,
                    shiprocketProvider.apiCredentials.password
                );
            }
            const serviceability = await shiprocketService.checkServiceability(
                pickupPincode,
                deliveryPincode,
                weight,
                paymentMode
            );

            if (serviceability.available) {
                return res.json({
                    success: true,
                    provider: 'SHIPROCKET',
                    providerName: 'Shiprocket',
                    couriers: serviceability.couriers,
                    recommendedCourier: serviceability.recommendedCourier,
                    estimatedDays: serviceability.recommendedCourier?.estimatedDays,
                    rate: serviceability.recommendedCourier?.rate
                });
            }
        } catch (error) {
            console.log('[CourierController] Shiprocket check failed, trying next provider');
        }

        // No external courier available, try internal
        const internalProvider = await LogisticsProvider.findBestForPincode(deliveryPincode);

        if (internalProvider) {
            return res.json({
                success: true,
                provider: internalProvider.name,
                providerName: internalProvider.displayName || internalProvider.name,
                estimatedDays: internalProvider.averageDeliveryTime || 3,
                message: 'Selected based on pincode routing'
            });
        }

        res.status(400).json({
            success: false,
            error: 'No courier available for this pincode'
        });
    } catch (error) {
        console.error('[CourierController] Select best courier failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get pickup locations from Shiprocket
 * GET /api/courier/pickup-locations
 */
export const getPickupLocations = async (req, res) => {
    try {
        const result = await shiprocketService.getPickupLocations();
        res.json(result);
    } catch (error) {
        console.error('[CourierController] Get pickup locations failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Create shipment for user's own order (authenticated users)
 * POST /api/courier/create-user-shipment/:orderId
 * This allows users to trigger shipment creation for their orders after order placement
 */
export const createUserShipment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.id || req.user?._id;
        const { courierId, city, state } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        // Get order details and verify ownership
        const order = await Order.findById(orderId)
            .populate('user', 'name email phone')
            .populate('product', 'name sku');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Verify the order belongs to the requesting user
        const orderUserId = order.user?._id?.toString() || order.user?.toString();
        if (orderUserId !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to create shipment for this order'
            });
        }

        // Check if already shipped
        if (order.shiprocketOrderId) {
            return res.json({
                success: true,
                message: 'Shipment already exists for this order',
                shiprocketOrderId: order.shiprocketOrderId,
                awbCode: order.awbCode,
                courierPartner: order.courierPartner,
                trackingUrl: order.courierTrackingUrl
            });
        }

        // Get pickup location from site settings or use default
        const pickupPincode = req.body.pickupPincode || '395006'; // Default Surat pincode

        // Inject Shiprocket credentials from database
        const shiprocketProvider = await LogisticsProvider.findOne({
            name: 'SHIPROCKET',
            isActive: true
        }).select('+apiCredentials');

        if (!shiprocketProvider) {
            // External courier not active - order will be handled internally
            return res.json({
                success: true,
                message: 'External courier not configured. Order will be processed with internal delivery.',
                deliveryType: 'INTERNAL'
            });
        }

        if (shiprocketProvider.apiCredentials?.email && shiprocketProvider.apiCredentials?.password) {
            shiprocketService.setCredentials(
                shiprocketProvider.apiCredentials.email,
                shiprocketProvider.apiCredentials.password
            );
        }

        // Check serviceability first
        const serviceability = await shiprocketService.checkServiceability(
            pickupPincode,
            order.pincode,
            0.5,
            'PREPAID'
        );

        if (!serviceability.available) {
            // Fallback to internal delivery
            return res.json({
                success: true,
                message: 'Pincode not serviceable by external courier. Will use internal delivery.',
                deliveryType: 'INTERNAL',
                pincode: order.pincode
            });
        }

        // Prepare order data for Shiprocket
        const orderData = {
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            customerName: order.user?.name || 'Customer',
            email: order.user?.email || '',
            mobileNumber: order.mobileNumber,
            address: order.address,
            pincode: order.pincode,
            city: city || extractCity(order.address),
            state: state || extractState(order.address),
            productName: order.product?.name || 'Print Order',
            productSku: order.product?.sku || order.orderNumber,
            quantity: order.quantity,
            totalPrice: order.priceSnapshot?.totalPayable || order.totalPrice || 0,
            itemPrice: (order.priceSnapshot?.totalPayable || order.totalPrice || 0) / order.quantity,
            notes: order.notes,
            paymentMethod: order.paymentStatus === 'completed' ? 'PREPAID' : 'COD',
            weight: 0.5, // Default weight, can be customized
            length: 20,
            breadth: 15,
            height: 5
        };

        // Create complete shipment (order + AWB + pickup)
        const selectedCourierId = courierId || serviceability.recommendedCourier?.courierId;
        const result = await shiprocketService.createCompleteShipment(orderData, selectedCourierId);

        // Update order with shipment details
        const updateData = {
            shiprocketOrderId: result.shiprocketOrderId,
            shiprocketShipmentId: result.shiprocketShipmentId,
            awbCode: result.awbCode,
            courierPartner: result.courierName || 'Shiprocket',
            trackingId: result.awbCode,
            courierStatus: 'pickup_scheduled',
            dispatchedAt: new Date(),
            courierTrackingUrl: `https://shiprocket.co/tracking/${result.awbCode}`,
            logisticsProvider: shiprocketProvider._id
        };

        // Add to courier timeline
        const timelineEntry = {
            status: 'pickup_scheduled',
            location: 'Origin',
            timestamp: new Date(),
            notes: `Shipment created automatically. AWB: ${result.awbCode}`
        };

        await Order.findByIdAndUpdate(orderId, {
            ...updateData,
            $push: { courierTimeline: timelineEntry }
        });

        res.json({
            success: true,
            message: 'Shipment created successfully',
            deliveryType: 'EXTERNAL',
            ...result,
            trackingUrl: `https://shiprocket.co/tracking/${result.awbCode}`
        });
    } catch (error) {
        console.error('[CourierController] Create user shipment failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Helper functions
function extractCity(address) {
    // Simple extraction - can be improved
    const parts = address.split(',');
    if (parts.length >= 2) {
        return parts[parts.length - 2]?.trim() || 'Unknown';
    }
    return 'Unknown';
}

function extractState(address) {
    // Simple extraction - can be improved
    const parts = address.split(',');
    if (parts.length >= 1) {
        return parts[parts.length - 1]?.trim().replace(/\d+/g, '').trim() || 'Gujarat';
    }
    return 'Gujarat';
}

export default {
    checkServiceability,
    createShipment,
    getTracking,
    getTrackingByOrder,
    cancelShipment,
    selectBestCourier,
    getPickupLocations,
    createUserShipment
};
