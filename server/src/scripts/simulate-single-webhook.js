/**
 * Simulate Single Webhook Script
 * 
 * Usage: node src/scripts/simulate-single-webhook.js <ORDER_ID_OR_NUMBER> <STATUS>
 * 
 * Examples:
 *   node src/scripts/simulate-single-webhook.js ORD-123 picked_up
 *   node src/scripts/simulate-single-webhook.js ORD-123 in_transit
 *   node src/scripts/simulate-single-webhook.js ORD-123 out_for_delivery
 *   node src/scripts/simulate-single-webhook.js ORD-123 delivered
 */

import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/orderModal.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from server root
dotenv.config({ path: join(__dirname, '../../.env') });

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const WEBHOOK_URL = `${BASE_URL}/api/webhooks/webhook`;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_TEST_URI;

if (!MONGO_URI) {
    console.error('Error: MONGO_URI or MONGO_TEST_URI not found in .env');
    console.error('Attempted to load .env from:', join(__dirname, '../../.env'));
    process.exit(1);
}

const STATUS_MAP = {
    'pickup_scheduled': { status: 'Pickup Scheduled', id: 6 },
    'picked_up': { status: 'Picked Up', id: 7 },
    'in_transit': { status: 'In Transit', id: 17 },
    'out_for_delivery': { status: 'Out For Delivery', id: 17 },
    'delivered': { status: 'Delivered', id: 7 },
    'cancelled': { status: 'Cancelled', id: 8 },
    'rto_initiated': { status: 'RTO Initiated', id: 9 }
};

async function run() {
    const orderIdentifier = process.argv[2];
    const statusKey = process.argv[3]?.toLowerCase();

    if (!orderIdentifier || !statusKey) {
        console.error('Usage: node src/scripts/simulate-single-webhook.js <ORDER_ID_OR_NUMBER> <STATUS>');
        console.log('Available statuses:', Object.keys(STATUS_MAP).join(', '));
        process.exit(1);
    }

    const validStatus = STATUS_MAP[statusKey];
    if (!validStatus) {
        console.error('Invalid status. Available statuses:', Object.keys(STATUS_MAP).join(', '));
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);

        let order;
        if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
            order = await Order.findById(orderIdentifier);
        }
        if (!order) {
            order = await Order.findOne({ orderNumber: orderIdentifier });
        }

        if (!order) {
            console.error('Order not found!');
            process.exit(1);
        }

        console.log(`Found order: ${order.orderNumber}`);
        console.log(`Current Status: ${order.courierStatus}`);

        // Construct mock payload
        const payload = {
            awb: order.awbCode || 'TEST-AWB',
            order_id: order.shiprocketOrderId || order.orderNumber,
            current_status: validStatus.status,
            current_status_id: validStatus.id,
            scans: [{
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0],
                activity: validStatus.status,
                location: 'Simulated Location',
                status: validStatus.status,
                remarks: 'Simulated via script'
            }]
        };

        console.log(`Sending webhook for status: ${validStatus.status}...`);

        const response = await axios.post(WEBHOOK_URL, payload);

        console.log('Webhook sent successfully!');
        console.log('Response:', response.data);
        console.log('\n--> NOW CHECK YOUR CLIENT UI FOR UPDATES <--');

    } catch (err) {
        console.error('Error:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
    } finally {
        await mongoose.disconnect();
    }
}

run();
