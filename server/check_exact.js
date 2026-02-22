import mongoose from 'mongoose';
import Order from './src/models/orderModal.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function checkOrder() {
    await mongoose.connect(process.env.MONGO_URI);

    // The exact order the user likely tested with
    const order = await Order.findOne({ orderNumber: 'ORD-1771642774872-2219' });

    console.log(JSON.stringify(order, null, 2));
    mongoose.disconnect();
}

checkOrder().catch(console.error);
