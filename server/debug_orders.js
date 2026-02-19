import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const OrderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', OrderSchema);

async function check() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const order = await Order.findOne().sort({ createdAt: -1 });
        console.log('--- LATEST ORDER ---');
        console.log(JSON.stringify(order, null, 2));

        const myOrders = await Order.find({ needDesigner: true });
        console.log('--- DESIGN REQUESTS COUNT ---', myOrders.length);

        const visualPending = await Order.find({
            needDesigner: true,
            designerType: "visual",
            designStatus: { $in: ["PendingDesign", "InDesign"] }
        });
        console.log('--- VISUAL PENDING COUNT ---', visualPending.length);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
