import Order from "../models/orderModal.js";
import Department from '../models/departmentModal.js';
import { createOrderShipment } from '../services/ShipmentService.js';

/**
 * APPROVE DEPARTMENT WORK
 * Marks a department's work as completed and moves order to next department in sequence
 * 
 * POST /api/orders/:orderId/departments/:deptId/approve
 */
export const approveDepartment = async (req, res) => {
    try {
        const { orderId, deptId } = req.params;
        const { notes } = req.body;
        const operatorId = req.user?.id;

        // Find order and populate department data
        const order = await Order.findById(orderId)
            .populate('departmentStatuses.department', 'name');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the department status entry
        const deptStatusIndex = order.departmentStatuses.findIndex(
            ds => ds.department._id.toString() === deptId
        );

        if (deptStatusIndex === -1) {
            return res.status(404).json({ error: 'Department not found in order workflow' });
        }

        const deptStatus = order.departmentStatuses[deptStatusIndex];

        // Validate that this department can be approved
        if (deptStatus.status === 'completed') {
            return res.status(400).json({ error: 'Department work already completed' });
        }

        // Mark current department as completed
        deptStatus.status = 'completed';
        deptStatus.completedAt = new Date();
        deptStatus.operator = operatorId;
        if (notes) {
            deptStatus.notes = notes;
        }

        // Add to production timeline
        if (!order.productionTimeline) {
            order.productionTimeline = [];
        }

        order.productionTimeline.push({
            department: deptId,
            action: 'completed',
            timestamp: new Date(),
            operator: operatorId,
            notes: notes || `Department ${deptStatus.department.name} completed`,
        });

        // Move to next department in sequence
        const nextIndex = deptStatusIndex + 1;

        if (nextIndex < order.departmentStatuses.length) {
            // Assign next department
            const nextDept = order.departmentStatuses[nextIndex];
            nextDept.status = 'pending';
            nextDept.whenAssigned = new Date();

            order.currentDepartment = nextDept.department._id;
            order.currentDepartmentIndex = nextIndex;
            order.status = 'PRODUCTION';  // Keep in production

            // Add timeline entry for next department
            order.productionTimeline.push({
                department: nextDept.department._id,
                action: 'requested',
                timestamp: new Date(),
                operator: operatorId,
                notes: `Assigned to ${nextDept.department.name}`,
            });

            console.log(`✅ Order ${order.orderNumber}: ${deptStatus.department.name} completed, moved to ${nextDept.department.name}`);
        } else {
            // All departments completed - move to PACKED status
            order.status = 'PACKED';
            order.currentDepartment = null;
            order.packedAt = new Date();

            console.log(`✅ Order ${order.orderNumber}: All departments completed, status set to PACKED`);

            // AUTO-CREATE SHIPMENT after all departments complete
            // This triggers Shiprocket integration for delivery
            try {
                console.log(`📦 Initiating automatic shipment creation for order ${order.orderNumber}...`);

                // Save order first to update status
                await order.save();

                // Create shipment asynchronously (don't wait for response)
                createOrderShipment(orderId).then(shipmentResult => {
                    console.log(`✅ Shipment auto-created for order ${order.orderNumber}:`, {
                        awbCode: shipmentResult.awbCode,
                        shiprocketOrderId: shipmentResult.shiprocketOrderId,
                    });
                }).catch(shipmentError => {
                    console.error(`❌ Auto-shipment creation failed for ${order.orderNumber}:`, shipmentError.message);
                    // Continue execution - shipment can be created manually later
                });
            } catch (shipmentError) {
                console.error(`❌ Error triggering shipment creation:`, shipmentError);
                // Don't fail the approval - shipment can be created manually
            }
        }

        // Mark arrays as modified
        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        // Save order (if not already saved above)
        if (order.isModified()) {
            await order.save();
        }

        // Return updated order
        const updatedOrder = await Order.findById(orderId)
            .populate('departmentStatuses.department', 'name sequence')
            .populate('currentDepartment', 'name')
            .populate('product', 'name');

        return res.json({
            success: true,
            message: nextIndex < order.departmentStatuses.length
                ? `Department approved. Moved to next department.`
                : `All departments completed. Order packed and shipment initiated.`,
            order: updatedOrder,
        });
    } catch (err) {
        console.error('❌ Department approval error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * START DEPARTMENT WORK
 * Marks a department as actively working on the order
 * 
 * POST /api/orders/:orderId/departments/:deptId/start
 */
export const startDepartmentWork = async (req, res) => {
    try {
        const { orderId, deptId } = req.params;
        const operatorId = req.user?.id;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the department status entry
        const deptStatus = order.departmentStatuses.find(
            ds => (ds.department._id || ds.department).toString() === deptId
        );

        if (!deptStatus) {
            return res.status(404).json({ error: 'Department not found in order workflow' });
        }

        // Update status to in_progress
        deptStatus.status = 'in_progress';
        deptStatus.startedAt = new Date();
        deptStatus.operator = operatorId;

        // Add to timeline
        if (!order.productionTimeline) {
            order.productionTimeline = [];
        }

        order.productionTimeline.push({
            department: deptId,
            action: 'started',
            timestamp: new Date(),
            operator: operatorId,
            notes: 'Department work started',
        });

        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        await order.save();

        return res.json({
            success: true,
            message: 'Department work started',
        });
    } catch (err) {
        console.error('❌ Start department work error:', err);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * PAUSE DEPARTMENT WORK
 * Pauses work on a department (can be resumed later)
 * 
 * POST /api/orders/:orderId/departments/:deptId/pause
 */
export const pauseDepartmentWork = async (req, res) => {
    try {
        const { orderId, deptId } = req.params;
        const { reason } = req.body;
        const operatorId = req.user?.id;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Find the department status entry
        const deptStatus = order.departmentStatuses.find(
            ds => (ds.department._id || ds.department).toString() === deptId
        );

        if (!deptStatus) {
            return res.status(404).json({ error: 'Department not found in order workflow' });
        }

        // Update status to paused
        deptStatus.status = 'paused';
        deptStatus.pausedAt = new Date();
        deptStatus.operator = operatorId;
        if (reason) {
            deptStatus.notes = reason;
        }

        // Add to timeline
        if (!order.productionTimeline) {
            order.productionTimeline = [];
        }

        order.productionTimeline.push({
            department: deptId,
            action: 'paused',
            timestamp: new Date(),
            operator: operatorId,
            notes: reason || 'Department work paused',
        });

        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        await order.save();

        return res.json({
            success: true,
            message: 'Department work paused',
        });
    } catch (err) {
        console.error('❌ Pause department work error:', err);
        return res.status(500).json({ error: err.message });
    }
};
