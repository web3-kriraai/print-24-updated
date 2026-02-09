
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/orderModal.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_TEST_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI not found');
    process.exit(1);
}

async function listOrders() {
    try {
        await mongoose.connect(MONGO_URI);
        const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
        console.log('Recent Orders:');
        orders.forEach(o => {
            console.log(`- ${o.orderNumber}: ${o.status}, Courier: ${o.courierStatus || 'N/A'}, AWB: ${o.awbCode || 'N/A'}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

listOrders();
