import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/orderModal.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function findOrderByAWB() {
    try {
        await mongoose.connect(MONGO_URI);

        const awb = 'MOCK689565711VIH';
        const order = await Order.findOne({ $or: [{ awbCode: awb }, { trackingId: awb }] });

        if (order) {
            console.log('Order Found:');
            console.log(`- Order Number: ${order.orderNumber}`);
            console.log(`- Pincode: ${order.pincode}`);
            console.log(`- Pickup Warehouse Name: ${order.pickupWarehouseName}`);
            console.log(`- Pickup Warehouse Pincode: ${order.pickupWarehousePincode}`);
            console.log(`- Created At: ${order.createdAt}`);
        } else {
            console.log(`Order with AWB ${awb} not found.`);
            // List recent orders as backup
            const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
            console.log('\nRecent Orders:');
            recentOrders.forEach(o => {
                console.log(`- ${o.orderNumber} | Pincode: ${o.pincode} | Warehouse: ${o.pickupWarehouseName} | AWB: ${o.awbCode || o.trackingId}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

findOrderByAWB();
