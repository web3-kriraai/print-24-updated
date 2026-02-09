/**
 * Fix Timeline History
 * 
 * Usage: node src/scripts/fix-timeline-history.js <ORDER_NUMBER>
 */

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

async function run() {
    const orderNumber = process.argv[2];
    if (!orderNumber) {
        console.error('Please provide order number');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        const order = await Order.findOne({ orderNumber });

        if (!order) {
            console.error('Order not found');
            process.exit(1);
        }

        console.log(`Order: ${order.orderNumber}, Status: ${order.courierStatus}`);
        console.log('Current Timeline:', JSON.stringify(order.courierTimeline, null, 2));

        // Check if PICKUP_SCHEDULED exists
        const hasPickup = order.courierTimeline.some(e => e.status === 'PICKUP_SCHEDULED');

        if (!hasPickup) {
            console.log('Injecting missing PICKUP_SCHEDULED event...');

            const initialEvent = {
                status: 'PICKUP_SCHEDULED',
                location: 'Origin (Restored)',
                timestamp: order.createdAt, // Backdate to creation
                notes: 'Shipment created (Restored history)'
            };

            // Prepend or push? MongoDB $push only adds to end. 
            // We need to read, modify, and save to reorder, or just push and sort by date in UI (UI sorts by date?)
            // UI logic: order.courierTimeline.slice().reverse()
            // So latest should be LAST in array.
            // If we want PICKUP_SCHEDULED to be first (oldest), it should be at index 0.

            // To insert at 0, we can set the array.
            const newTimeline = [initialEvent, ...order.courierTimeline];

            order.courierTimeline = newTimeline;
            await order.save();

            console.log('Timeline updated successfully!');
        } else {
            console.log('Timeline already has PICKUP_SCHEDULED.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
