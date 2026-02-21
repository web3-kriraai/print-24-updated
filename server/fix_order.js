import mongoose from 'mongoose';
import Order from './src/models/orderModal.js';
import Product from './src/models/productModal.js';
import Department from './src/models/departmentModal.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const autoApproveOrder = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate('product');
        if (!order) return;

        // If already has departmentStatuses, skip
        if (order.departmentStatuses && order.departmentStatuses.length > 0) return;

        const productId = order.product._id || order.product;
        const product = await Product.findById(productId).populate('productionSequence');

        if (!product || !product.productionSequence || product.productionSequence.length === 0) {
            console.log(`[Payment Auto-Approve] Product ${productId} has no production sequence. Skipping assignment.`);
            return;
        }

        const deptIds = product.productionSequence.map(dept => typeof dept === 'object' ? dept._id : dept);
        const departments = await Department.find({ _id: { $in: deptIds }, isEnabled: true });

        if (departments.length === 0) return;

        const deptMap = new Map(departments.map(d => [d._id.toString(), d]));
        const departmentsInOrder = deptIds
            .map(id => {
                const idStr = typeof id === 'object' ? id.toString() : id?.toString();
                return idStr ? deptMap.get(idStr) : null;
            })
            .filter(d => d !== null && d !== undefined);

        if (departmentsInOrder.length === 0) return;

        const firstDept = departmentsInOrder[0];
        const now = new Date();

        order.departmentStatuses = [{
            department: firstDept._id,
            status: 'pending',
            whenAssigned: now,
            startedAt: null,
            pausedAt: null,
            completedAt: null,
            stoppedAt: null,
            operator: null,
            notes: '',
        }];

        order.currentDepartment = firstDept._id;
        order.currentDepartmentIndex = 0;
        order.status = 'approved';

        order.productionTimeline = order.productionTimeline || [];
        order.productionTimeline.push({
            department: firstDept._id,
            action: 'requested',
            timestamp: now,
            operator: null,
            notes: `Auto-approved upon payment success and assigned to ${firstDept.name}`,
        });

        order.markModified('departmentStatuses');
        order.markModified('productionTimeline');

        await order.save();
        console.log(`[Payment Auto-Approve] Order ${orderId} assigned to ${firstDept.name}`);
    } catch (err) {
        console.error('[Payment Auto-Approve] Error auto-approving order:', err);
    }
};

async function fixOrder() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Get the most recent confirmed order
    const order = await Order.findOne({ status: 'confirmed' }).sort({ createdAt: -1 });

    if (order) {
        console.log(`Fixing order: ${order.orderNumber} (ID: ${order._id})`);
        await autoApproveOrder(order._id);
    } else {
        console.log('No unapproved order found.');
    }

    mongoose.disconnect();
}

fixOrder().catch(console.error);
