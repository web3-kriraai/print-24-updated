import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import './src/models/productModal.js';
import Order from './src/models/orderModal.js';

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const order = await Order.findOne({ orderNumber: 'ORD-1771659653865-6390' }).lean();
        fs.writeFileSync('order_dump.json', JSON.stringify(order, null, 2));
    } catch (e) {
    } finally {
        process.exit();
    }
}
test();
