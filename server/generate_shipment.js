/**
 * Script to manually trigger shipment creation for existing completed orders
 * that were completed before the auto-shipment trigger was added.
 * 
 * Usage: node generate_shipment.js
 * 
 * Set environment variable USE_MOCK_AWB=true to use mock data (recommended for testing)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Force mock AWB for this script 
process.env.USE_MOCK_AWB = 'true';

import Order from './src/models/orderModal.js';
import { User } from './src/models/User.js';
import shiprocketService from './src/services/courier/ShiprocketService.js';
import { calculateEDD } from './src/controllers/shipment.controller.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function generateShipmentForOrder(orderId) {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // If orderId provided, process that order. Otherwise process all completed orders without shipment.
        let orders;
        if (orderId) {
            orders = await Order.find({ _id: orderId }).populate('product');
        } else {
            // Find all completed orders without AWB code
            orders = await Order.find({
                status: 'completed',
                awbCode: null,
            }).populate('product');
        }

        console.log(`📦 Found ${orders.length} order(s) to process`);

        for (const order of orders) {
            console.log(`\n═══════════════════════════════════════`);
            console.log(`Processing: ${order.orderNumber} (${order._id})`);

            // Skip if already has shipment data
            if (order.awbCode) {
                console.log(`  ⏭  Already has AWB: ${order.awbCode}, skipping`);
                continue;
            }

            // Load user
            const user = await User.findById(order.user).lean();
            if (!user) {
                console.log(`  ⚠️  User not found, skipping`);
                continue;
            }

            // Generate mock AWB and shipment data
            const mockAWB = `MOCK${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const mockShipmentId = `SHP${Math.floor(Math.random() * 1000000)}`;
            const mockOrderId = `SR${Math.floor(Math.random() * 10000000)}`;
            const courierNames = ['DTDC', 'Delhivery', 'BlueDart', 'Ekart', 'Xpressbees'];
            const courierName = courierNames[Math.floor(Math.random() * courierNames.length)];

            // Calculate EDD
            const baseDate = order.updatedAt || new Date();
            const transitDays = Math.floor(Math.random() * 3) + 3; // 3-5 days
            const { eddMin } = calculateEDD(baseDate, 0, transitDays, 1);

            // Update order with mock shipment data
            order.shiprocketOrderId = mockOrderId;
            order.shiprocketShipmentId = mockShipmentId;
            order.awbCode = mockAWB;
            order.courierPartner = courierName;
            order.trackingId = mockAWB;
            order.isMockShipment = true;
            order.courierStatus = 'shipment_created';
            order.estimatedDeliveryDate = eddMin;
            order.pickupScheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
            order.courierTrackingUrl = null; // No URL for mock
            order.dispatchedAt = order.updatedAt || new Date();

            // Add courier timeline
            if (!order.courierTimeline) {
                order.courierTimeline = [];
            }

            order.courierTimeline.push({
                status: 'shipment_created',
                location: 'Origin Warehouse',
                timestamp: order.updatedAt || new Date(),
                notes: `Shipment created (TEST MODE). AWB: ${mockAWB}. Courier: ${courierName}`
            });

            order.courierTimeline.push({
                status: 'pickup_scheduled',
                location: 'Origin Warehouse',
                timestamp: new Date(),
                notes: `Pickup scheduled for ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}`
            });

            order.courierStatus = 'pickup_scheduled';

            await order.save();

            console.log(`  ✅ Shipment created!`);
            console.log(`     AWB: ${mockAWB}`);
            console.log(`     Courier: ${courierName}`);
            console.log(`     EDD: ${eddMin.toLocaleDateString()}`);
            console.log(`     Mock: true`);
        }

        console.log(`\n✅ Done! ${orders.length} order(s) updated.`);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Get optional orderId from command line
const orderId = process.argv[2] || null;
generateShipmentForOrder(orderId);
