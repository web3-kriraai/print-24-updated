
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/orderModal.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/print-24";

const updateShipmentStatus = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the most recent order (assuming this is the "test" order user referred to)
        const order = await Order.findOne().sort({ createdAt: -1 });

        if (!order) {
            console.error('No order found!');
            return;
        }

        console.log(`Updating order: ${order.orderNumber}`);

        // Update fields based on user request
        order.courierStatus = 'PICKUP_SCHEDULED';
        order.awbCode = 'MOCK31208819TRBD';
        order.courierPartner = 'Delhivery Air';
        order.shiprocketShipmentId = '1172648515';

        // Parse scheduled pickup date: 12/02/2026 at 12:05
        // Note: Month is 0-indexed in JS Date? No, string parsing depends on format.
        // Using ISO format for safety: 2026-02-12T12:05:00
        const scheduledDate = new Date('2026-02-12T12:05:00');

        order.pickupDetails = {
            ...order.pickupDetails,
            scheduledPickupTime: scheduledDate,
            pickupLocationName: 'Warehouse', // implied from logic
            pickupPincode: '395006',
            pickupAddress: 'Warehouse Address' // placeholder
        };

        order.courierCharges = {
            freightCharge: 97,
            codCharges: 0,
            totalCharge: 97
        };

        order.estimatedDeliveryDate = new Date('2026-02-15'); // Sunday, 15 Feb 2026

        // Add to courier timeline if not present
        const timelineEntry = {
            status: 'PICKUP_SCHEDULED',
            timestamp: new Date(), // Current time as action time
            location: 'Warehouse',
            notes: 'Pickup Scheduled via Script'
        };

        // Check if duplicate status exists to avoid spamming timeline
        const lastEntry = order.courierTimeline[order.courierTimeline.length - 1];
        if (!lastEntry || lastEntry.status !== 'PICKUP_SCHEDULED') {
            order.courierTimeline.push(timelineEntry);
        }

        await order.save();
        console.log('Order updated successfully!');
        console.log('New Status:', order.courierStatus);
        console.log('AWB:', order.awbCode);
        console.log('Courier:', order.courierPartner);

    } catch (error) {
        console.error('Error updating order:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

updateShipmentStatus();
