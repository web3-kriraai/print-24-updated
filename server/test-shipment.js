import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/orderModal.js';
import { triggerShipmentCreation } from './src/controllers/shipment.controller.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect('mongodb+srv://print24:XdTuxSHbxpp6JAUt@cluster0.azagder.mongodb.net/test?retryWrites=true&w=majority');
        console.log('Connected to DB');

        const order = await Order.findOne({ orderNumber: 'ORD-1771676632802-9475' }).populate('product');
        if (!order) {
            console.log('Order not found');
            process.exit(1);
        }

        console.log('Triggering shipment for order:', order.orderNumber);
        const result = await triggerShipmentCreation(order);
        console.log('Result:', result);

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response?.data) {
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
run();
