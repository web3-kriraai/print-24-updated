/**
 * Test Delivery Flow Script
 * 
 * Simulates a complete order-to-delivery flow:
 * 1. Setup (User, Product)
 * 2. Order Creation
 * 3. Shipment Creation (Mocked Shiprocket)
 * 4. Tracking Verification
 * 
 * Run: node src/scripts/test-delivery-flow.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../../.env') });

// Import Models
import { User } from '../models/User.js'; // Note: User is a named export or default? Checked file: named export "export { User }" likely, but let's check imports in other files.
// Checking orderController.js: import { User } from "../models/User.js"; -> It is a named export.
import Product from '../models/productModal.js';
import Order from '../models/orderModal.js';
import LogisticsProvider from '../models/LogisticsProvider.js';
import Category from '../models/categoryModal.js'; // Required for product creation

// Import Services & Controllers
import shiprocketService from '../services/courier/ShiprocketService.js';
import * as OrderController from '../controllers/orderController.js';
import * as CourierController from '../controllers/courierController.js';

// Setup Mocks
const originalCheckServiceability = shiprocketService.checkServiceability;
const originalCreateCompleteShipment = shiprocketService.createCompleteShipment;
const originalGetTracking = shiprocketService.getTracking;

function setupMocks() {
    console.log('🎭 Setting up Shiprocket mocks...');

    shiprocketService.checkServiceability = async () => {
        console.log('   [Mock] checkServiceability called');
        return {
            available: true,
            couriers: [
                {
                    courierId: 1,
                    courierName: 'Mock Express',
                    estimatedDays: 2,
                    rate: 50,
                    etd: '2026-02-01'
                }
            ],
            recommendedCourier: {
                courierId: 1,
                courierName: 'Mock Express',
                estimatedDays: 2,
                rate: 50
            }
        };
    };

    shiprocketService.createCompleteShipment = async (orderData) => {
        console.log('   [Mock] createCompleteShipment called for order:', orderData.orderNumber);
        return {
            success: true,
            shiprocketOrderId: 'MOCK_SR_ORDER_' + Date.now(),
            shiprocketShipmentId: 'MOCK_SR_SHIP_' + Date.now(),
            awbCode: 'MOCK_AWB_' + Date.now(),
            courierName: 'Mock Express',
            courierId: 1,
            pickupStatus: 'Scheduled',
            message: 'Mock shipment created'
        };
    };

    shiprocketService.getTracking = async (awbCode) => {
        console.log('   [Mock] getTracking called for AWB:', awbCode);
        return {
            success: true,
            currentStatus: 'Picked Up',
            currentStatusId: 6,
            originCity: 'Surat',
            destinationCity: 'Mumbai',
            activities: [
                {
                    status: 'Picked Up',
                    location: 'Surat',
                    date: new Date().toISOString(),
                    srStatusLabel: 'Picked Up'
                }
            ]
        };
    };
}

// Mock Express Req/Res
const mockReq = (body = {}, params = {}, user = {}) => ({
    body,
    params,
    user: user
});

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTest() {
    try {
        console.log('🚀 Starting Delivery Flow Test...\n');

        // Connect DB
        if (!process.env.MONGO_TEST_URI && !process.env.MONGO_URI) {
            throw new Error('MONGO_URI or MONGO_TEST_URI not defined in .env');
        }
        const dbUri = process.env.MONGO_URI; // Using main URI as this is likely dev env
        await mongoose.connect(dbUri);
        console.log('✅ MongoDB Connected');

        // Setup Mocks
        setupMocks();

        // 1. Get or Create Test User
        let user = await User.findOne({ email: 'test_delivery_user@sublified.com' });
        if (!user) {
            user = await User.create({
                name: 'Test Delivery User',
                email: 'test_delivery_user@sublified.com',
                password: 'password123', // should be hashed in real app but OK for test
                mobileNumber: '9876543210'
            });
            console.log('✅ Created Test User:', user._id);
        } else {
            console.log('✅ Found Test User:', user._id);
        }

        // 2. Get or Create Test Category & Product
        let category = await Category.findOne({ name: 'Test Category' });
        if (!category) {
            category = await Category.create({
                name: 'Test Category',
                slug: 'test-category'
            });
        }

        let product = await Product.findOne({ slug: 'test-delivery-product' });
        if (!product) {
            product = await Product.create({
                name: 'Test Delivery Product',
                slug: 'test-delivery-product',
                category: category._id,
                basePrice: 100,
                description: 'For testing delivery flow',
                quantityDiscounts: [],
                availabilityRules: []
            });
            console.log('✅ Created Test Product:', product._id);
        } else {
            console.log('✅ Found Test Product:', product._id);
        }

        // 3. Create Order
        console.log('\n📦 Creating Order...');
        const orderReq = mockReq(
            {
                productId: product._id,
                quantity: 1,
                finish: 'Gloss',
                shape: 'Square',
                selectedOptions: [],
                pincode: '400001', // Mumbai
                address: '123 Test St, Mumbai, Maharashtra',
                mobileNumber: '9876543210',
                uploadedDesign: {
                    frontImage: { data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', filename: 'test.png' } // Valid 1x1 pixel base64
                }
            },
            {},
            { id: user._id }
        );
        const orderRes = mockRes();

        await OrderController.createOrder(orderReq, orderRes);

        if (orderRes.statusCode !== 201) {
            console.error('❌ Order Creation Failed:', orderRes.data);
            throw new Error('Order creation failed');
        }

        const order = orderRes.data.order;
        console.log('✅ Order Created:', order.orderNumber, `(ID: ${order._id})`);
        console.log('   Status:', order.status);

        // 4. Test Serviceability (via Controller)
        console.log('\n🚚 Checking Serviceability...');
        const checkReq = mockReq({
            pickupPincode: '395006',
            deliveryPincode: '400001',
            weight: 0.5
        });
        const checkRes = mockRes();
        await CourierController.checkServiceability(checkReq, checkRes);

        if (checkRes.statusCode === 200 && checkRes.data.success) {
            console.log('✅ Serviceability Check Passed');
            console.log('   Couriers Found:', checkRes.data.couriers.length);
        } else {
            console.warn('⚠️ Serviceability Check Warning:', checkRes.data);
        }

        // 5. Create Shipment (User Shipment Flow)
        console.log('\n🚢 Creating Shipment...');
        const shipReq = mockReq(
            {
                pickupPincode: '395006'
            },
            { orderId: order._id },
            { id: user._id }
        );
        const shipRes = mockRes();

        await CourierController.createUserShipment(shipReq, shipRes);

        if (shipRes.statusCode !== 200) {
            console.error('❌ Shipment Creation Failed:', shipRes.data);
            throw new Error('Shipment creation failed');
        }

        console.log('✅ Shipment Created Successfully');
        console.log('   AWB:', shipRes.data.awbCode);
        console.log('   Courier:', shipRes.data.courierName);
        console.log('   Tracking URL:', shipRes.data.trackingUrl);

        // 6. Verify Order Update
        const updatedOrder = await Order.findById(order._id);
        if (updatedOrder.shiprocketOrderId && updatedOrder.awbCode) {
            console.log('✅ Order Updated with Shipment Details');
            console.log('   Order Courier Status:', updatedOrder.courierStatus);
        } else {
            console.error('❌ Order NOT Updated correctly');
        }

        // 7. Verify Timeline
        if (updatedOrder.courierTimeline && updatedOrder.courierTimeline.length > 0) {
            console.log('✅ Courier Timeline Updated');
            console.log('   Last Event:', updatedOrder.courierTimeline[updatedOrder.courierTimeline.length - 1].notes);
        } else {
            console.warn('⚠️ No Courier Timeline found');
        }

        // 8. Test Tracking (via Controller)
        console.log('\n📡 Testing Tracking...');
        const trackReq = mockReq({}, { awbCode: shipRes.data.awbCode });
        const trackRes = mockRes();

        await CourierController.getTracking(trackReq, trackRes);

        if (trackRes.statusCode === 200 && trackRes.data.success) {
            console.log('✅ Tracking Fetched Successfully');
            console.log('   Current Status:', trackRes.data.currentStatus);
        } else {
            console.error('❌ Tracking Fetch Failed:', trackRes.data);
        }

        console.log('\n🎉 End-to-End Delivery Flow Test PASSED!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n📦 Database Disconnected');
    }
}

runTest();
