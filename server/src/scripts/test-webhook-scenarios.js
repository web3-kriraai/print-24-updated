
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Order from '../models/orderModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from two levels up (server root is one level up from src)
// My script is in src/scripts, so .env is in ../../.env
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_TEST_URI;
// Default port 5000 if not in env
const PORT = process.env.PORT || 5000;
// Note: Route is mounted at /api/webhooks AND /api/courier
// In courierRoutes.js: router.post('/webhook', ...)
// In server.js: app.use("/api/webhooks", courierRoutes);
// So URL is /api/webhooks/webhook
const WEBHOOK_URL = `http://localhost:${PORT}/api/webhooks/webhook`;

const TEST_AWB = 'TEST-AWB-' + Date.now();
const TEST_ORDER_ID = 'TEST-SR-' + Date.now();

async function runTests() {
    console.log('Connecting to MongoDB...');
    if (!MONGO_URI) {
        console.error('MONGO_TEST_URI is missing in .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err.message);
        process.exit(1);
    }

    try {
        // 1. Create a dummy order
        console.log('Creating test order...');

        // Create random ObjectIds for required fields that are references
        const dummyUserId = new mongoose.Types.ObjectId();
        const dummyProductId = new mongoose.Types.ObjectId();

        // Remove existing test order if any (unlikely due to timestamp)
        await Order.deleteMany({ awbCode: TEST_AWB });

        const order = await Order.create({
            user: dummyUserId,
            product: dummyProductId,
            quantity: 100,
            finish: 'Matte',
            shape: 'Rect',
            totalPrice: 500,
            pincode: '400001',
            address: 'Test Address',
            mobileNumber: '9999999999',
            awbCode: TEST_AWB,
            shiprocketOrderId: TEST_ORDER_ID,
            courierStatus: 'pickup_scheduled',
            orderNumber: 'TEST-ORD-' + Date.now(),
            status: 'processing'
        });

        console.log(`Created order: ${order.orderNumber} with ID: ${order._id}`);
        console.log(`Target Webhook URL: ${WEBHOOK_URL}`);

        // 2. Define Test Cases
        const testCases = [
            {
                name: 'In Transit Update (Shipped)',
                payload: {
                    awb: TEST_AWB,
                    order_id: TEST_ORDER_ID,
                    current_status: 'In Transit',
                    current_status_id: 17,
                    scans: [
                        {
                            location: "Mumbai Hub",
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toTimeString().split(' ')[0],
                            activity: "Arrived at Hub",
                            remarks: "Processing"
                        }
                    ]
                },
                expectedStatus: 'in_transit'
            },
            {
                name: 'Out For Delivery Update',
                payload: {
                    awb: TEST_AWB,
                    order_id: TEST_ORDER_ID,
                    current_status: 'Out For Delivery',
                    current_status_id: 18,
                    location: 'Bangalore'
                },
                expectedStatus: 'out_for_delivery'
            },
            {
                name: 'Delivered Update',
                payload: {
                    awb: TEST_AWB,
                    order_id: TEST_ORDER_ID,
                    current_status: 'Delivered',
                    current_status_id: 7,
                    scans: [
                        {
                            location: "Customer Address",
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toTimeString().split(' ')[0],
                            activity: "Delivered",
                            remarks: "Given to security"
                        }
                    ]
                },
                expectedStatus: 'delivered', // Internal mapped status
                checkMainStatus: 'completed'
            },
            {
                name: 'RTO Initiated (Simulated separate case on new order)',
                skip: true // skipping for now as we just delivered it, cannot transition easily without complex state machine or new order
            }
        ];

        // 3. Run Test Cases
        for (const test of testCases) {
            if (test.skip) continue;

            console.log(`\n--- Running Test: ${test.name} ---`);

            try {
                const response = await axios.post(WEBHOOK_URL, test.payload, {
                    headers: {
                        'x-shiprocket-signature': 'dummy-signature'
                    }
                });

                console.log('Webhook Response:', response.status, response.data);

                // Verify DB State
                // We fetch fresh from DB
                const updatedOrder = await Order.findById(order._id);
                console.log(`Order DB Courier Status: ${updatedOrder.courierStatus}`);

                if (updatedOrder.courierStatus === test.expectedStatus) {
                    console.log('✅ Status Matched Expected');
                } else {
                    console.log(`❌ Status Mismatch! Expected ${test.expectedStatus}, got ${updatedOrder.courierStatus}`);
                }

                if (test.checkMainStatus) {
                    console.log(`Order Main Status: ${updatedOrder.status}`);
                    if (updatedOrder.status === test.checkMainStatus) {
                        console.log(`✅ Main Status Correctly Updated to ${test.checkMainStatus}`);
                    } else {
                        console.log(`❌ Main Status Mismatch! Expected ${test.checkMainStatus}, got ${updatedOrder.status}`);
                    }
                }

                // Check timeline
                console.log(`Timeline entries: ${updatedOrder.courierTimeline.length}`);
                if (updatedOrder.courierTimeline.length > 0) {
                    const lastEntry = updatedOrder.courierTimeline[updatedOrder.courierTimeline.length - 1];
                    console.log(`Last Timeline: [${lastEntry.timestamp}] ${lastEntry.status} - ${lastEntry.location}`);
                }

            } catch (err) {
                console.error('Error sending webhook:', err.message);
                if (err.code === 'ECONNREFUSED') {
                    console.error('⚠️ Is the server running? Make sure the backend server is started.');
                    break; // Stop testing if server is down
                }
                if (err.response) {
                    console.error('Response data:', err.response.data);
                }
            }

            // Small delay
            await new Promise(r => setTimeout(r, 1000));
        }

        // 4. Cleanup
        console.log('\nCleaning up...');
        await Order.findByIdAndDelete(order._id);
        console.log('Test order deleted.');

    } catch (error) {
        console.error('Test script error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

runTests();
