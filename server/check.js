import mongoose from 'mongoose';
import Order from './src/models/orderModal.js';
import Product from './src/models/productModal.js';
import Department from './src/models/departmentModal.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function checkOrders() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Get the most recent 3 orders
    const orders = await Order.find().sort({ createdAt: -1 }).limit(3).populate('product');

    console.log(`Found ${orders.length} orders`);
    for (const order of orders) {
        console.log(`\nOrder: ${order.orderNumber} (ID: ${order._id})`);
        console.log(`Status: ${order.status}`);
        console.log(`Payment Status: ${order.paymentStatus}`);
        console.log(`Product: ${order.product?.name}`);
        console.log(`Product Production Sequence: ${order.product?.productionSequence}`);
        console.log(`Order Department Statuses: ${JSON.stringify(order.departmentStatuses, null, 2)}`);
        console.log(`Current Department: ${order.currentDepartment}`);
    }

    mongoose.disconnect();
}

checkOrders().catch(console.error);
