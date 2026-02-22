/**
 * Shipment Service
 * 
 * Handles automatic shipment creation after successful payments or order approval.
 * This service provides a centralized way to create shipments that can be called
 * from payment controllers, order status updates, or admin actions.
 * 
 * @module services/ShipmentService
 */

import shiprocketService from './courier/ShiprocketService.js';
import Order from '../models/orderModal.js';
import LogisticsProvider from '../models/LogisticsProvider.js';

/**
 * Create shipment for an order automatically
 * This is called after:
 * 1. Successful payment verification
 * 2. Admin approves an order
 * 3. Manual admin trigger
 * 
 * @param {string} orderId - MongoDB order ID
 * @param {Object} options - Optional configuration
 * @param {string} options.pickupPincode - Override pickup pincode (default: 395006)
 * @param {number} options.courierId - Specific courier to use
 * @returns {Promise<Object>} Shipment creation result
 */
export const createOrderShipment = async (orderId, options = {}) => {
    const { pickupPincode = '395006', courierId = null } = options;

    console.log('[ShipmentService] Creating shipment for order:', orderId);

    try {
        // Get order details
        const order = await Order.findById(orderId)
            .populate('user', 'name email phone')
            .populate('product', 'name sku');

        if (!order) {
            console.log('[ShipmentService] Order not found:', orderId);
            return { success: false, error: 'Order not found' };
        }

        // Skip if already has shipment
        if (order.shiprocketOrderId) {
            console.log('[ShipmentService] Order already has shipment:', order.shiprocketOrderId);
            return {
                success: true,
                alreadyExists: true,
                shiprocketOrderId: order.shiprocketOrderId,
                awbCode: order.awbCode
            };
        }

        // Check payment status - only create shipment for paid orders
        if (order.paymentStatus !== 'COMPLETED') {
            console.log('[ShipmentService] Order payment not complete:', order.paymentStatus);
            return { success: false, error: 'Payment not completed' };
        }

        // Get Shiprocket credentials from database
        const shiprocketProvider = await LogisticsProvider.findOne({
            name: 'SHIPROCKET',
            isActive: true
        }).select('+apiCredentials');

        if (!shiprocketProvider) {
            console.log('[ShipmentService] Shiprocket provider not active');
            return { success: false, error: 'Shiprocket provider not active' };
        }

        // Set credentials if available from DB
        if (shiprocketProvider?.apiCredentials?.email && shiprocketProvider?.apiCredentials?.password) {
            shiprocketService.setCredentials(
                shiprocketProvider.apiCredentials.email,
                shiprocketProvider.apiCredentials.password
            );
        }

        // Check serviceability first
        const serviceability = await shiprocketService.checkServiceability(
            pickupPincode,
            order.pincode,
            0.5 // Default weight
        );

        if (!serviceability.available) {
            console.log('[ShipmentService] Delivery pincode not serviceable:', order.pincode);
            // Update order with serviceability issue
            await Order.findByIdAndUpdate(orderId, {
                $push: {
                    courierTimeline: {
                        status: 'SERVICEABILITY_FAILED',
                        location: order.pincode,
                        timestamp: new Date(),
                        notes: 'Delivery pincode not serviceable by any courier'
                    }
                }
            });
            return { success: false, error: 'Delivery pincode not serviceable' };
        }

        // Helper function to extract city from address
        const extractCity = (address) => {
            if (!address) return 'Surat';
            const parts = address.split(',').map(p => p.trim());
            return parts.length >= 2 ? parts[parts.length - 2] : 'Surat';
        };

        // Helper function to extract state from address
        const extractState = (address) => {
            if (!address) return 'Gujarat';
            const states = ['Gujarat', 'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'West Bengal', 'Kerala', 'Uttar Pradesh', 'Bihar', 'Punjab', 'Haryana', 'Andhra Pradesh', 'Telangana'];
            for (const state of states) {
                if (address.toLowerCase().includes(state.toLowerCase())) {
                    return state;
                }
            }
            return 'Gujarat';
        };

        // Prepare order data for Shiprocket
        const orderData = {
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            customerName: order.user?.name || 'Customer',
            email: order.user?.email || '',
            mobileNumber: order.mobileNumber,
            address: order.address,
            pincode: order.pincode,
            city: extractCity(order.address),
            state: extractState(order.address),
            productName: order.product?.name || 'Print Order',
            productSku: order.product?.sku || order.orderNumber,
            quantity: order.quantity,
            totalPrice: order.priceSnapshot?.totalPayable || order.totalPrice,
            itemPrice: (order.priceSnapshot?.totalPayable || order.totalPrice) / order.quantity,
            notes: order.notes,
            paymentMethod: 'PREPAID', // All paid orders are prepaid
            weight: 0.5,
            length: 20,
            breadth: 15,
            height: 5
        };

        // PRIORITY: Use the courier selected during checkout (smart routing)
        // Fall back to serviceability recommendation only if no courier was selected
        const preSelectedCourier = order.selectedCourier;
        const selectedCourierId = courierId || preSelectedCourier?.courierId || serviceability.recommendedCourier?.courierId;
        const selectedCourierName = preSelectedCourier?.courierName || serviceability.recommendedCourier?.courierName;

        console.log('[ShipmentService] Courier selection:', {
            fromCheckout: preSelectedCourier?.courierName || 'None',
            fromServiceability: serviceability.recommendedCourier?.courierName || 'None',
            finalCourierId: selectedCourierId || 'auto',
            finalCourierName: selectedCourierName || 'auto'
        });

        // Pass productionEndDate to Shiprocket for proper pickup scheduling
        const result = await shiprocketService.createCompleteShipment(
            orderData,
            selectedCourierId,
            selectedCourierName,
            order.productionEndDate // Pass production end date for pickup scheduling
        );

        console.log('[ShipmentService] ═══════════════════════════════════════════════════════════════');
        console.log('[ShipmentService] 📦 COMPLETE SHIPROCKET RESPONSE:');
        console.log('[ShipmentService] ═══════════════════════════════════════════════════════════════');
        console.log('[ShipmentService] Order ID:', result.shiprocketOrderId);
        console.log('[ShipmentService] Shipment ID:', result.shiprocketShipmentId);
        console.log('[ShipmentService] AWB Code:', result.awbCode);
        console.log('[ShipmentService] Courier:', result.courierName);
        console.log('[ShipmentService] Courier ID:', result.courierId);
        console.log('[ShipmentService] Pickup Status:', result.pickupStatus);
        console.log('[ShipmentService] Pickup Scheduled Date:', result.pickupScheduledDate);
        console.log('[ShipmentService] Pickup Token:', result.pickupTokenNumber);
        console.log('[ShipmentService] Is Mock:', result.isMock);
        console.log('[ShipmentService] ═══════════════════════════════════════════════════════════════');

        // Use the pickup date from Shiprocket response (which uses productionEndDate)
        // or fall back to production end date or current date
        const pickupDate = result.pickupScheduledDate
            ? new Date(result.pickupScheduledDate)
            : (order.productionEndDate ? new Date(order.productionEndDate) : new Date());

        console.log('[ShipmentService] 📅 Final Pickup Date:', pickupDate.toISOString());

        // Calculate estimated delivery date: pickup date + courier estimated days
        const courierEstimatedDays = preSelectedCourier?.estimatedDays ||
            serviceability.recommendedCourier?.estimatedDays || 5;
        const estimatedDeliveryDate = new Date(pickupDate);
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + courierEstimatedDays);

        console.log('[ShipmentService] 📅 Dates Calculated:', {
            pickupDate: pickupDate.toISOString(),
            courierEstimatedDays: courierEstimatedDays,
            estimatedDeliveryDate: estimatedDeliveryDate.toISOString()
        });

        // Update order with shipment details - use Shiprocket response data
        const updateData = {
            shiprocketOrderId: result.shiprocketOrderId,
            shiprocketShipmentId: result.shiprocketShipmentId,
            awbCode: result.awbCode,
            courierPartner: result.courierName || selectedCourierName || 'Shiprocket',
            courierCompanyId: result.courierId || selectedCourierId,
            courierStatus: 'PICKUP_SCHEDULED',
            courierTrackingUrl: result.awbCode ? `https://shiprocket.co/tracking/${result.awbCode}` : null,
            dispatchedAt: pickupDate,
            estimatedDeliveryDate: estimatedDeliveryDate,
            logisticsProvider: shiprocketProvider._id,
            courierCharges: {
                freightCharge: result.freightCharge || preSelectedCourier?.rate || serviceability.recommendedCourier?.freightCharge || 0,
                totalCharge: result.rate || preSelectedCourier?.rate || serviceability.recommendedCourier?.rate || 0
            },
            pickupDetails: {
                pickupPincode: pickupPincode,
                pickupLocationName: 'Warehouse',
                scheduledPickupTime: pickupDate
            },
            $push: {
                courierTimeline: {
                    status: 'PICKUP_SCHEDULED',
                    location: 'Origin',
                    timestamp: pickupDate,
                    notes: `Shipment created. AWB: ${result.awbCode || 'Pending'}`
                }
            }
        };

        await Order.findByIdAndUpdate(orderId, updateData);

        console.log('[ShipmentService] ✅ Order updated with shipment details:', orderId);

        return {
            success: true,
            shiprocketOrderId: result.shiprocketOrderId,
            shiprocketShipmentId: result.shiprocketShipmentId,
            awbCode: result.awbCode,
            courierName: result.courierName,
            trackingUrl: result.awbCode ? `https://shiprocket.co/tracking/${result.awbCode}` : null,
            // Use our calculated pickup date (based on productionEndDate) instead of mock response
            pickupScheduledDate: pickupDate.toISOString(),
            isMock: result.isMock
        };

    } catch (error) {
        console.error('[ShipmentService] Shipment creation failed:', error.message);
        console.error('[ShipmentService] Error stack:', error.stack);

        // Log failure to order timeline
        try {
            await Order.findByIdAndUpdate(orderId, {
                $push: {
                    courierTimeline: {
                        status: 'CREATION_FAILED',
                        location: 'System',
                        timestamp: new Date(),
                        notes: `Shipment creation failed: ${error.message}`
                    }
                }
            });
        } catch (updateError) {
            console.error('[ShipmentService] Failed to update order timeline:', updateError.message);
        }

        return { success: false, error: error.message };
    }
};

/**
 * Retry shipment creation for orders that failed initially
 * @param {string} orderId - MongoDB order ID
 */
export const retryShipmentCreation = async (orderId) => {
    console.log('[ShipmentService] Retrying shipment creation for order:', orderId);
    return createOrderShipment(orderId);
};

export default {
    createOrderShipment,
    retryShipmentCreation
};
