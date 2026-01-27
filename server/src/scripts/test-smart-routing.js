
/**
 * Test Smart Routing & Shipment Creation Logic
 * 
 * This script tests:
 * 1. Smart Routing Logic (Best Courier Selection)
 * 2. Shipment Creation Flow (Order -> Shipment -> DB Update)
 * 
 * NOTE: This script MOCKS the actual Shiprocket API calls for 'Create Order' 
 * to prevent creating real shipments during testing. It verifies the 
 * internal integration logic.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { User } from '../models/User.js';
import Product from '../models/productModal.js';
import Order from '../models/orderModal.js';
import LogisticsProvider from '../models/LogisticsProvider.js';
import shiprocketService from '../services/courier/ShiprocketService.js';
import { createShipment, selectBestCourier } from '../controllers/courierController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Mock Response Data
const MOCK_SHIPMENT_RESPONSE = {
    success: true,
    shiprocketOrderId: 'TEST-SR-ORDER-' + Date.now(),
    shiprocketShipmentId: 'TEST-SR-SHIP-' + Date.now(),
    awbCode: 'TEST-AWB-' + Date.now(),
    courierName: 'Blue Dart (Test)',
    courierId: 123,
    pickupStatus: 'Scheduled',
    message: 'Shipment created successfully'
};

const MOCK_SERVICEABILITY_RESPONSE = {
    available: true,
    couriers: [
        { courierId: 1, courierName: 'Delhivery', estimatedDays: 3, rate: 50 },
        { courierId: 2, courierName: 'Blue Dart', estimatedDays: 2, rate: 80 }
    ],
    recommendedCourier: {
        courierId: 2,
        courierName: 'Blue Dart',
        estimatedDays: 2,
        rate: 80
    }
};

// Mocking ShiprocketService methods
const originalCreateCompleteShipment = shiprocketService.createCompleteShipment;
const originalCheckServiceability = shiprocketService.checkServiceability;

function mockShiprocketService() {
    console.log('🔶 Mocking ShiprocketService methods for safety...');

    shiprocketService.createCompleteShipment = async (orderData) => {
        console.log(`[Mock] createCompleteShipment called for order: ${orderData.orderNumber}`);
        return MOCK_SHIPMENT_RESPONSE;
    };

    shiprocketService.checkServiceability = async () => {
        console.log(`[Mock] checkServiceability called`);
        return MOCK_SERVICEABILITY_RESPONSE;
    };
}

function restoreShiprocketService() {
    shiprocketService.createCompleteShipment = originalCreateCompleteShipment;
    shiprocketService.checkServiceability = originalCheckServiceability;
}

// Mock Express Request/Response
const mockRes = () => {
    const res = {};
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

async function setup() {
    if (!process.env.MONGO_TEST_URI) {
        console.error('❌ MONGO_TEST_URI is missing');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_TEST_URI);
    console.log('✅ Connected to MongoDB');

    // Ensure Shiprocket Provider exists
    let provider = await LogisticsProvider.findOne({ name: 'SHIPROCKET' });
    if (!provider) {
        await LogisticsProvider.create({
            name: 'SHIPROCKET',
            displayName: 'Shiprocket',
            type: 'EXTERNAL',
            isActive: true,
            priority: 10,
            apiCredentials: { email: 'test@example.com', password: 'test' }
        });
        console.log('✅ Created dummy Shiprocket provider');
    } else if (!provider.isActive) {
        provider.isActive = true;
        await provider.save();
        console.log('✅ Activated Shiprocket provider');
    }
}

async function testSmartRouting() {
    console.log('\n--- Test 1: Smart Routing (Select Best Courier) ---');

    const req = {
        body: {
            deliveryPincode: '400001',
            weight: 0.5
        }
    };
    const res = mockRes();

    await selectBestCourier(req, res);

    if (res.data && res.data.success && res.data.provider === 'SHIPROCKET') {
        console.log('✅ Smart Routing selected Shiprocket (Expected)');
        console.log(`   Recommended: ${res.data.recommendedCourier.courierName}`);
    } else {
        console.log('❌ Smart Routing failed:', res.data || 'No response');
    }
}

async function testFallbackLogic() {
    console.log('\n--- Test 3: Fallback Logic (Shiprocket Unavailable) ---');

    // Force Mock to return unavailable
    shiprocketService.checkServiceability = async () => {
        return { available: false, couriers: [] };
    };

    // Ensure Internal Provider exists and covers the test pincode
    // first try to find by exact valid name
    let internalProvider = await LogisticsProvider.findOne({ name: 'INTERNAL' });

    if (internalProvider) {
        console.log('Found INTERNAL provider by name');
        if (internalProvider.type !== 'INTERNAL') {
            internalProvider.type = 'INTERNAL';
        }
    } else {
        // Fallback: search by type, might find legacy "Internal Fleet"
        internalProvider = await LogisticsProvider.findOne({ type: 'INTERNAL' });

        if (internalProvider) {
            console.log('Found INTERNAL provider by type (legacy name likely)');
            // If we found one by type, but name is not INTERNAL, we can't rename it to INTERNAL
            // because findOne({name:'INTERNAL'}) failed, so name 'INTERNAL' is free... 
            // WAIT, checks above said dup key error. This implies findOne({name:'INTERNAL'}) SHOULD have found it if I queried it.
            // So if I query by name first, I should find it.

            // Just in case, update name if free.
            const validNames = ["DELHIVERY", "SHIPROCKET", "INTERNAL", "BLUEDART", "DTDC", "ECOM_EXPRESS"];
            if (!validNames.includes(internalProvider.name)) {
                // We can't easily rename because of unique index potential collision if my logic is wrong
                // But since we checked findOne({name:'INTERNAL'}) and it was null, we theoretically CAN rename.
                console.log(`Fixing legacy name: ${internalProvider.name} -> INTERNAL`);
                internalProvider.name = 'INTERNAL';
            }
        } else {
            console.log('Creating new INTERNAL provider');
            internalProvider = await LogisticsProvider.create({
                name: 'INTERNAL',
                displayName: 'Our Fleet',
                type: 'INTERNAL',
                isActive: true,
                priority: 0,
                serviceablePincodes: ['400001']
            });
        }
    }

    if (!internalProvider.serviceablePincodes.includes('400001')) {
        internalProvider.serviceablePincodes.push('400001');
    }
    if (!internalProvider.isActive) {
        internalProvider.isActive = true;
    }
    await internalProvider.save();

    const req = {
        body: {
            deliveryPincode: '400001', // Should be in internal list
            weight: 0.5
        }
    };
    const res = mockRes();

    await selectBestCourier(req, res);

    if (res.data && res.data.success && res.data.provider !== 'SHIPROCKET') {
        console.log(`✅ Fallback worked. Selected: ${res.data.provider}`);
    } else {
        console.log('❌ Fallback failed:', res.data);
    }

    // Reset Mock for other tests if any
    shiprocketService.checkServiceability = originalCheckServiceability;
}

async function testShipmentCreation() {
    console.log('\n--- Test 2: Shipment Creation Integration ---');

    // 1. Create Dummy Order
    const order = await Order.create({
        user: new mongoose.Types.ObjectId(),
        product: new mongoose.Types.ObjectId(),
        quantity: 1,
        finish: 'Glossy',
        shape: 'Rect',
        totalPrice: 100,
        pincode: '400001',
        address: 'Test Address, Mumbai',
        mobileNumber: '9876543210',
        paymentStatus: 'completed',
        status: 'production_ready'
    });
    console.log(`✅ Created Test Order: ${order.orderNumber}`);

    // 2. Call createShipment Controller
    const req = {
        params: { orderId: order._id },
        body: { pickupPincode: '395006' }
    };
    const res = mockRes();

    await createShipment(req, res);

    // 3. Verify Response
    if (res.data && res.data.success) {
        console.log('✅ Controller returned success');
        console.log(`   AWB: ${res.data.awbCode}`);
    } else {
        console.log('❌ Controller failed:', res.data || 'No response');
        console.log('   Status Code:', res.statusCode);
    }

    // 4. Verify Database Update
    const updatedOrder = await Order.findById(order._id);
    if (updatedOrder.shiprocketOrderId === MOCK_SHIPMENT_RESPONSE.shiprocketOrderId) {
        console.log('✅ Database updated with Shiprocket Order ID');
    } else {
        console.log('❌ Database NOT updated correctly');
        console.log('   Expected:', MOCK_SHIPMENT_RESPONSE.shiprocketOrderId);
        console.log('   Actual:', updatedOrder.shiprocketOrderId);
    }

    if (updatedOrder.courierStatus === 'pickup_scheduled') {
        console.log('✅ Order status updated to pickup_scheduled');
    } else {
        console.log('❌ Order status mismatch:', updatedOrder.courierStatus);
    }

    // Lookup Provider
    const provider = await LogisticsProvider.findOne({ _id: updatedOrder.logisticsProvider });
    if (provider && provider.name === 'SHIPROCKET') {
        console.log('✅ Logistics Provider linked correctly');
    } else {
        console.log('❌ Logistics Provider not linked');
    }

    // Cleanup
    await Order.findByIdAndDelete(order._id);
    console.log('🧹 Cleanup: Deleted test order');
}

async function run() {
    try {
        await setup();
        mockShiprocketService();

        await testSmartRouting();
        await testFallbackLogic();
        await testShipmentCreation();

    } catch (error) {
        console.error('Fatal Test Error:', error);
    } finally {
        restoreShiprocketService();
        await mongoose.disconnect();
    }
}

run();
