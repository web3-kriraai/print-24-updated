import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Register models first
import '../src/models/productModal.js';
import '../src/models/categoryModal.js';
import '../src/models/UserSegment.js';
import Order from '../src/models/orderModal.js';
import BulkOrder from '../src/models/BulkOrder.js';
import { User } from '../src/models/User.js';
import { triggerBulkProcessingIfNeeded } from '../src/controllers/webhook.controller.js';

async function testTrigger() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const orderId = '69993e7682b0d6570060a4b1';
        console.log(`Triggering bulk processing for order: ${orderId}`);
        
        await triggerBulkProcessingIfNeeded(orderId);
        
        console.log('Trigger call finished (processing might be in background)');
        
        // Wait longer for background process
        console.log('Waiting 10 seconds for child orders...');
        await new Promise(r => setTimeout(r, 10000));
        
        const updatedOrder = await Order.findById(orderId);
        console.log(`ChildOrders count: ${updatedOrder.childOrders?.length || 0}`);
        console.log(`BulkOrderRef: ${updatedOrder.bulkOrderRef}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testTrigger();
