import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/orderModal.js';
import { handleCourierWebhook } from './src/controllers/courierWebhook.controller.js';

dotenv.config();

async function verifyWebhook() {
    console.log('🚀 Starting Webhook Verification...');

    // 1. Connect to DB
    if (!process.env.MONGO_TEST_URI) {
        console.error('❌ MONGO_TEST_URI not found in environment');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_TEST_URI);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ DB Connection failed:', err);
        process.exit(1);
    }

    // 2. Create a Test Order
    const awbCode = `TEST-AWB-${Date.now()}`;
    const testOrder = new Order({
        user: new mongoose.Types.ObjectId(), // Fake User ID
        product: new mongoose.Types.ObjectId(), // Fake Product ID
        quantity: 1,
        address: 'Test Address',
        pincode: '123456',
        mobileNumber: '9999999999',
        priceSnapshot: {
            basePrice: 100,
            unitPrice: 100,
            quantity: 1,
            subtotal: 100,
            totalPayable: 100,
            gstPercentage: 0,
            gstAmount: 0
        },
        awbCode: awbCode,
        courierStatus: 'PENDING',
        courierPartner: 'Test Courier'
    });

    try {
        const savedOrder = await testOrder.save();
        console.log(`✅ Created Test Order: ${savedOrder.orderNumber} (AWB: ${awbCode})`);
        console.log(`   Initial Courier Status: ${savedOrder.courierStatus}`);

        // 3. Simulate Webhook Payload (Shiprocket format)
        const webhookPayload = {
            awb: awbCode,
            current_status: 'In Transit',
            current_status_id: 6,
            order_id: savedOrder.shiprocketOrderId || '123456', // Optional if AWB matches
            scans: [
                {
                    location: "Mumbai Hub",
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    activity: "Arrived at Hub",
                    remarks: "Package received at origin center"
                }
            ]
        };

        // 4. Call Controller
        console.log('🔄 Calling Webhook Handler...');
        const req = { body: webhookPayload, headers: {} };
        const res = {
            statusCode: 200,
            data: null,
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        await handleCourierWebhook(req, res);

        if (res.statusCode !== 200) {
            console.error('❌ Webhook handler returned error status:', res.statusCode);
            console.error('   Response:', res.data);
        } else {
            console.log('✅ Webhook processed successfully');
            console.log('   Response:', res.data);
        }

        // 5. Verify Database Update
        const updatedOrder = await Order.findById(savedOrder._id);
        console.log('🔍 Verifying DB Update...');
        console.log(`   New Courier Status: '${updatedOrder.courierStatus}'`);

        // Check Status
        if (updatedOrder.courierStatus === 'in_transit') {
            console.log('✅ Status updated correctly to "in_transit"');
        } else {
            console.error(`❌ Status mismatch! Expected 'in_transit', got '${updatedOrder.courierStatus}'`);
            console.warn('   (Note: Checking for case-sensitivity issues)');
        }

        // Check Timeline
        const latestEvent = updatedOrder.courierTimeline[updatedOrder.courierTimeline.length - 1];
        if (latestEvent && latestEvent.location === 'Mumbai Hub') {
            console.log('✅ Timeline updated correctly with scan');
        } else {
            console.error('❌ Timeline not updated correctly');
            console.log('   Timeline:', updatedOrder.courierTimeline);
        }

        // 6. Cleanup
        await Order.findByIdAndDelete(savedOrder._id);
        console.log('🧹 Cleaned up test order');

    } catch (error) {
        console.error('❌ Error during verification:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from DB');
    }
}

verifyWebhook();
