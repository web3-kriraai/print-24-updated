import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const OrderSchema = new mongoose.Schema({
    orderNumber: String,
    isBulkParent: Boolean,
    paymentStatus: String,
    createdAt: Date
}, { strict: false });

const Order = mongoose.model('Order', OrderSchema);

async function checkOrders() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
        console.log('Recent Orders:');
        orders.forEach(o => {
            console.log(`ID: ${o._id}, Num: ${o.orderNumber}, BulkParent: ${o.isBulkParent}, Payment: ${o.paymentStatus}, ChildOrders: ${o.childOrders?.length || 0}`);
            if (o._id.toString() === '69993e7682b0d6570060a4b1') {
                console.log('--- Target Order Design Data ---');
                console.log(JSON.stringify(o.uploadedDesign, null, 2));
            }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkOrders();
