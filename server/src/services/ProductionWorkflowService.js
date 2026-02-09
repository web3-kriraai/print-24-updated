/**
 * Production Workflow Service
 * 
 * Handles production completion and automatic shipment scheduling
 */

import Order from '../models/orderModal.js';
import ShipmentService from './courier/ShipmentService.js';

/**
 * Handle production completion and automatic shipment scheduling
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} Result of shipment creation
 */
export async function handleProductionCompletion(orderId) {
    try {
        const order = await Order.findById(orderId)
            .populate('product user')
            .populate('departmentStatuses.department');

        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        // Verify all departments completed
        const allComplete = order.departmentStatuses?.every(d => d.status === 'completed');
        if (!allComplete) {
            console.log(`[ProductionWorkflow] Order ${order.orderNumber} - not all departments complete`);
            return {
                success: false,
                message: 'Not all departments have completed production',
                order: order.orderNumber
            };
        }

        // Check if already marked as complete
        if (order.productionCompletedAt) {
            console.log(`[ProductionWorkflow] Order ${order.orderNumber} - already marked complete`);
            return {
                success: false,
                message: 'Production already marked as complete',
                order: order.orderNumber
            };
        }

        // CHECK: Only proceed if current date >= productionEndDate
        const now = new Date();
        if (order.productionEndDate && now < new Date(order.productionEndDate)) {
            const daysRemaining = Math.ceil((new Date(order.productionEndDate) - now) / (1000 * 60 * 60 * 24));
            console.log(`[ProductionWorkflow] Order ${order.orderNumber} - Production end date not reached yet (${daysRemaining} days remaining)`);
            return {
                success: false,
                message: `Production completion date not reached. ${daysRemaining} days remaining.`,
                order: order.orderNumber,
                productionEndDate: order.productionEndDate,
                daysRemaining
            };
        }

        // Mark production complete
        await Order.findByIdAndUpdate(orderId, {
            productionCompletedAt: new Date(),
            status: 'production_complete'
        });

        console.log(`✅ [ProductionWorkflow] Order ${order.orderNumber} - Production marked complete`);

        // Check if shipment already created
        if (order.shiprocketOrderId) {
            console.log(`[ProductionWorkflow] Order ${order.orderNumber} - Shipment already created`);
            return {
                success: true,
                message: 'Production complete, shipment already exists',
                order: order.orderNumber,
                shiprocketOrderId: order.shiprocketOrderId
            };
        }

        // Schedule shipment pickup
        console.log(`📦 [ProductionWorkflow] Order ${order.orderNumber} - Scheduling shipment...`);

        try {
            const result = await ShipmentService.createShipment(orderId);

            if (result.success) {
                await Order.findByIdAndUpdate(orderId, {
                    shipmentCreatedViaProduction: true,
                    shipmentScheduledDate: new Date(),
                    status: 'dispatched'
                });

                console.log(`🚚 [ProductionWorkflow] Order ${order.orderNumber} - Shipment auto-created successfully`);

                return {
                    success: true,
                    message: 'Production complete and shipment scheduled',
                    order: order.orderNumber,
                    shipment: result
                };
            } else {
                console.error(`❌ [ProductionWorkflow] Order ${order.orderNumber} - Shipment creation failed:`, result.error);
                return {
                    success: false,
                    message: 'Production complete but shipment creation failed',
                    order: order.orderNumber,
                    error: result.error
                };
            }
        } catch (shipmentError) {
            console.error(`❌ [ProductionWorkflow] Order ${order.orderNumber} - Shipment error:`, shipmentError);
            return {
                success: false,
                message: 'Production complete but shipment creation error',
                order: order.orderNumber,
                error: shipmentError.message
            };
        }

    } catch (error) {
        console.error('[ProductionWorkflow] Error:', error);
        throw error;
    }
}

/**
 * Check if order production is complete
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>}
 */
export async function isProductionComplete(orderId) {
    const order = await Order.findById(orderId).select('departmentStatuses productionCompletedAt');

    if (!order) return false;
    if (order.productionCompletedAt) return true;

    const allComplete = order.departmentStatuses?.every(d => d.status === 'completed');
    return allComplete || false;
}

/**
 * Get production status for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} Production status details
 */
export async function getProductionStatus(orderId) {
    const order = await Order.findById(orderId)
        .select('orderNumber productionStartDate productionEndDate productionCompletedAt departmentStatuses status')
        .populate('departmentStatuses.department', 'name');

    if (!order) {
        throw new Error('Order not found');
    }

    const totalDepartments = order.departmentStatuses?.length || 0;
    const completedDepartments = order.departmentStatuses?.filter(d => d.status === 'completed').length || 0;
    const inProgressDepartments = order.departmentStatuses?.filter(d => d.status === 'in_progress').length || 0;

    const isComplete = order.productionCompletedAt || (totalDepartments > 0 && completedDepartments === totalDepartments);

    return {
        orderNumber: order.orderNumber,
        productionStartDate: order.productionStartDate,
        productionEndDate: order.productionEndDate,
        productionCompletedAt: order.productionCompletedAt,
        isComplete,
        progress: {
            total: totalDepartments,
            completed: completedDepartments,
            inProgress: inProgressDepartments,
            pending: totalDepartments - completedDepartments - inProgressDepartments
        },
        status: order.status
    };
}

export default {
    handleProductionCompletion,
    isProductionComplete,
    getProductionStatus
};
