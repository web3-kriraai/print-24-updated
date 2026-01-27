/**
 * E2E Delivery Test Script
 * 
 * Comprehensive end-to-end test for delivery flow:
 * 1. User & Product Setup
 * 2. Order Creation  
 * 3. Delivery Serviceability Check
 * 4. Shipment Creation (with mocked Shiprocket)
 * 5. Tracking Verification
 * 6. Order Status Updates
 * 7. Full Delivery Details Display
 * 
 * Run: node src/scripts/test-delivery-e2e.js
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
import { User } from '../models/User.js';
import Product from '../models/productModal.js';
import Order from '../models/orderModal.js';
import LogisticsProvider from '../models/LogisticsProvider.js';
import Category from '../models/categoryModal.js';

// Import Services & Controllers
import shiprocketService from '../services/courier/ShiprocketService.js';
import * as OrderController from '../controllers/orderController.js';
import * as CourierController from '../controllers/courierController.js';

// ===== MOCK SETUP =====
const originalMethods = {
    checkServiceability: shiprocketService.checkServiceability,
    createCompleteShipment: shiprocketService.createCompleteShipment,
    getTracking: shiprocketService.getTracking
};

const mockData = {
    awbCode: 'E2E_AWB_' + Date.now(),
    shiprocketOrderId: 'E2E_SR_' + Date.now(),
    shiprocketShipmentId: 'E2E_SHIP_' + Date.now()
};

function setupMocks() {
    console.log('🎭 Setting up Shiprocket mocks...\n');

    shiprocketService.checkServiceability = async (pickupPincode, deliveryPincode, weight, paymentMode) => {
        console.log(`   [Mock] checkServiceability: ${pickupPincode} → ${deliveryPincode}`);
        return {
            available: true,
            couriers: [
                {
                    courierId: 1,
                    courierName: 'E2E Express Delivery',
                    estimatedDays: 2,
                    rate: 65,
                    etd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    courierId: 2,
                    courierName: 'E2E Standard Shipping',
                    estimatedDays: 4,
                    rate: 45,
                    etd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
                }
            ],
            recommendedCourier: {
                courierId: 1,
                courierName: 'E2E Express Delivery',
                estimatedDays: 2,
                rate: 65
            }
        };
    };

    shiprocketService.createCompleteShipment = async (orderData, courierId) => {
        console.log(`   [Mock] createCompleteShipment for order: ${orderData.orderNumber}`);
        return {
            success: true,
            shiprocketOrderId: mockData.shiprocketOrderId,
            shiprocketShipmentId: mockData.shiprocketShipmentId,
            awbCode: mockData.awbCode,
            courierName: 'E2E Express Delivery',
            courierId: courierId || 1,
            pickupStatus: 'Scheduled',
            message: 'Mock E2E shipment created'
        };
    };

    shiprocketService.getTracking = async (awbCode) => {
        console.log(`   [Mock] getTracking for AWB: ${awbCode}`);
        const now = new Date();
        return {
            success: true,
            currentStatus: 'In Transit',
            currentStatusId: 18,
            shipmentStatus: 'In Transit',
            shipmentStatusId: 18,
            originCity: 'Surat',
            destinationCity: 'Mumbai',
            deliveryPincode: '400001',
            courierName: 'E2E Express Delivery',
            awbCode: awbCode,
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            activities: [
                {
                    status: 'Shipment Created',
                    location: 'Surat',
                    date: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
                    srStatusLabel: 'Shipment Created'
                },
                {
                    status: 'Picked Up',
                    location: 'Surat Warehouse',
                    date: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
                    srStatusLabel: 'Picked Up'
                },
                {
                    status: 'In Transit',
                    location: 'Hub - Ahmedabad',
                    date: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
                    srStatusLabel: 'In Transit'
                }
            ]
        };
    };
}

function restoreMocks() {
    shiprocketService.checkServiceability = originalMethods.checkServiceability;
    shiprocketService.createCompleteShipment = originalMethods.createCompleteShipment;
    shiprocketService.getTracking = originalMethods.getTracking;
}

// ===== MOCK REQUEST/RESPONSE =====
const mockReq = (body = {}, params = {}, user = {}) => ({
    body,
    params,
    user
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

// ===== TEST HELPERS =====
function printSection(title) {
    console.log('\n' + '═'.repeat(60));
    console.log(`  ${title}`);
    console.log('═'.repeat(60));
}

function printSuccess(message) {
    console.log(`✅ ${message}`);
}

function printError(message) {
    console.log(`❌ ${message}`);
}

function printInfo(label, value) {
    console.log(`   ${label}: ${value}`);
}

function printDeliveryDetails(order, tracking) {
    printSection('📦 COMPLETE DELIVERY DETAILS');

    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│                    ORDER INFORMATION                   │');
    console.log('├────────────────────────────────────────────────────────┤');
    console.log(`│  Order Number:     ${order.orderNumber.padEnd(36)}│`);
    console.log(`│  Order ID:         ${order._id.toString().padEnd(36)}│`);
    console.log(`│  Status:           ${(order.status || 'pending').padEnd(36)}│`);
    console.log(`│  Quantity:         ${String(order.quantity).padEnd(36)}│`);
    console.log(`│  Total Price:      ₹${String(order.totalPrice || 0).padEnd(34)}│`);
    console.log('└────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│                  SHIPPING INFORMATION                  │');
    console.log('├────────────────────────────────────────────────────────┤');
    console.log(`│  AWB Code:         ${(order.awbCode || 'N/A').padEnd(36)}│`);
    console.log(`│  Courier Partner:  ${(order.courierPartner || 'N/A').padEnd(36)}│`);
    console.log(`│  Courier Status:   ${(order.courierStatus || 'N/A').padEnd(36)}│`);
    console.log(`│  Tracking ID:      ${(order.trackingId || 'N/A').padEnd(36)}│`);
    console.log('└────────────────────────────────────────────────────────┘');

    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│                  DELIVERY ADDRESS                      │');
    console.log('├────────────────────────────────────────────────────────┤');
    const addressLines = (order.address || 'N/A').match(/.{1,52}/g) || ['N/A'];
    addressLines.forEach(line => {
        console.log(`│  ${line.padEnd(54)}│`);
    });
    console.log(`│  Pincode:          ${(order.pincode || 'N/A').padEnd(36)}│`);
    console.log(`│  Mobile:           ${(order.mobileNumber || 'N/A').padEnd(36)}│`);
    console.log('└────────────────────────────────────────────────────────┘');

    if (tracking) {
        console.log('\n┌────────────────────────────────────────────────────────┐');
        console.log('│                  TRACKING INFORMATION                  │');
        console.log('├────────────────────────────────────────────────────────┤');
        console.log(`│  Current Status:   ${(tracking.currentStatus || 'Unknown').padEnd(36)}│`);
        console.log(`│  Origin:           ${(tracking.originCity || 'N/A').padEnd(36)}│`);
        console.log(`│  Destination:      ${(tracking.destinationCity || 'N/A').padEnd(36)}│`);
        console.log(`│  Est. Delivery:    ${(tracking.estimatedDelivery ? new Date(tracking.estimatedDelivery).toLocaleDateString() : 'N/A').padEnd(36)}│`);
        console.log('└────────────────────────────────────────────────────────┘');

        if (tracking.activities && tracking.activities.length > 0) {
            console.log('\n┌────────────────────────────────────────────────────────┐');
            console.log('│                  TRACKING TIMELINE                     │');
            console.log('├────────────────────────────────────────────────────────┤');
            tracking.activities.forEach((activity, idx) => {
                const time = new Date(activity.date).toLocaleString();
                console.log(`│  ${idx + 1}. ${activity.status.padEnd(20)} - ${activity.location.padEnd(15)}│`);
                console.log(`│     ${time.padEnd(51)}│`);
            });
            console.log('└────────────────────────────────────────────────────────┘');
        }
    }

    if (order.courierTimeline && order.courierTimeline.length > 0) {
        console.log('\n┌────────────────────────────────────────────────────────┐');
        console.log('│                  ORDER TIMELINE                        │');
        console.log('├────────────────────────────────────────────────────────┤');
        order.courierTimeline.forEach((entry, idx) => {
            const time = new Date(entry.timestamp).toLocaleString();
            console.log(`│  ${idx + 1}. ${(entry.status || 'Unknown').padEnd(20)} @ ${(entry.location || 'Unknown').padEnd(10)}│`);
            console.log(`│     ${time.padEnd(51)}│`);
            if (entry.notes) {
                console.log(`│     Note: ${entry.notes.substring(0, 43).padEnd(43)}│`);
            }
        });
        console.log('└────────────────────────────────────────────────────────┘');
    }

    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│                    TRACKING LINKS                      │');
    console.log('├────────────────────────────────────────────────────────┤');
    if (order.courierTrackingUrl) {
        console.log(`│  🔗 ${order.courierTrackingUrl.padEnd(51)}│`);
    } else if (order.awbCode) {
        console.log(`│  🔗 https://shiprocket.co/tracking/${order.awbCode}`.padEnd(55) + '│');
    }
    console.log('└────────────────────────────────────────────────────────┘');
}

// ===== MAIN TEST =====
async function runE2EDeliveryTest() {
    const testResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    try {
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║          E2E DELIVERY FLOW TEST - COMPREHENSIVE          ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`\n📅 Test Started: ${new Date().toLocaleString()}`);

        // Connect to Database
        printSection('🔌 DATABASE CONNECTION');
        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        if (!dbUri) {
            throw new Error('MONGO_TEST_URI or MONGO_URI not defined in .env');
        }
        await mongoose.connect(dbUri);
        printSuccess('MongoDB Connected');

        // Setup Mocks
        setupMocks();

        // ===== STEP 1: USER SETUP =====
        printSection('👤 STEP 1: USER SETUP');
        let user = await User.findOne({ email: 'e2e_delivery_test@sublified.com' });
        if (!user) {
            user = await User.create({
                name: 'E2E Test Delivery User',
                email: 'e2e_delivery_test@sublified.com',
                password: 'testpassword123',
                mobileNumber: '9876543210',
                signupIntent: 'CUSTOMER' // Required field - valid enum: CUSTOMER, PRINT_PARTNER, CORPORATE
            });
            printSuccess(`Created Test User: ${user._id}`);
        } else {
            printSuccess(`Found Existing Test User: ${user._id}`);
        }
        printInfo('Email', user.email);
        printInfo('Mobile', user.mobileNumber);
        testResults.tests.push({ name: 'User Setup', passed: true });
        testResults.passed++;

        // ===== STEP 2: PRODUCT SETUP =====
        printSection('📦 STEP 2: PRODUCT SETUP');
        let category = await Category.findOne({ name: 'E2E Test Category' });
        if (!category) {
            category = await Category.create({
                name: 'E2E Test Category',
                slug: 'e2e-test-category'
            });
        }

        let product = await Product.findOne({ slug: 'e2e-delivery-test-product' });
        if (!product) {
            product = await Product.create({
                name: 'E2E Delivery Test Product',
                slug: 'e2e-delivery-test-product',
                category: category._id,
                basePrice: 250,
                description: 'Product for E2E delivery testing',
                quantityDiscounts: [],
                availabilityRules: []
            });
            printSuccess(`Created Test Product: ${product._id}`);
        } else {
            printSuccess(`Found Existing Test Product: ${product._id}`);
        }
        printInfo('Product Name', product.name);
        printInfo('Base Price', `₹${product.basePrice}`);
        testResults.tests.push({ name: 'Product Setup', passed: true });
        testResults.passed++;

        // ===== STEP 3: CREATE ORDER (Direct DB Insert - bypasses PricingService) =====
        printSection('🛒 STEP 3: ORDER CREATION');

        // Generate unique order number
        const orderNumber = `E2E-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // Create order directly in database (bypasses PricingService which requires master price)
        const order = await Order.create({
            orderNumber: orderNumber,
            user: user._id,
            product: product._id,
            quantity: 500,
            totalPrice: 1250, // Test price
            finish: 'Gloss', // Required field
            shape: 'Rectangle', // Required field
            status: 'request', // Valid enum: request, production_ready, approved, processing, completed, cancelled, rejected
            paymentStatus: 'pending',
            pincode: '400001', // Mumbai delivery
            address: '123 E2E Test Street, Andheri East, Mumbai, Maharashtra',
            mobileNumber: '9876543210',
            priceSnapshot: {
                basePrice: 250,
                subtotal: 1250,
                gstAmount: 0,
                totalPayable: 1250,
                currency: 'INR'
            }
        });

        printSuccess(`Order Created: ${order.orderNumber}`);
        printInfo('Order ID', order._id);
        printInfo('Quantity', order.quantity);
        printInfo('Pincode', order.pincode);
        printInfo('Status', order.status);
        printInfo('Total Price', `₹${order.totalPrice}`);
        testResults.tests.push({ name: 'Order Creation', passed: true });
        testResults.passed++;

        // ===== STEP 4: CHECK SERVICEABILITY =====
        printSection('🚚 STEP 4: SERVICEABILITY CHECK');
        const checkReq = mockReq({
            pickupPincode: '395006', // Surat origin
            deliveryPincode: '400001', // Mumbai destination
            weight: 0.5,
            paymentMode: 'PREPAID'
        });
        const checkRes = mockRes();

        await CourierController.checkServiceability(checkReq, checkRes);

        if (checkRes.statusCode === 200 && checkRes.data.success) {
            printSuccess('Serviceability Check Passed');
            printInfo('Route', '395006 (Surat) → 400001 (Mumbai)');
            printInfo('Couriers Available', checkRes.data.couriers.length);

            if (checkRes.data.recommendedCourier) {
                printInfo('Recommended Courier', checkRes.data.recommendedCourier.courierName);
                printInfo('Estimated Days', checkRes.data.recommendedCourier.estimatedDays);
                printInfo('Shipping Rate', `₹${checkRes.data.recommendedCourier.rate}`);
            }
            testResults.tests.push({ name: 'Serviceability Check', passed: true });
            testResults.passed++;
        } else {
            printError(`Serviceability Check Failed: ${JSON.stringify(checkRes.data)}`);
            testResults.tests.push({ name: 'Serviceability Check', passed: false, error: checkRes.data });
            testResults.failed++;
        }

        // ===== STEP 5: CREATE SHIPMENT =====
        printSection('📮 STEP 5: SHIPMENT CREATION');
        const shipReq = mockReq(
            {
                pickupPincode: '395006',
                city: 'Mumbai',
                state: 'Maharashtra'
            },
            { orderId: order._id },
            { id: user._id }
        );
        const shipRes = mockRes();

        await CourierController.createUserShipment(shipReq, shipRes);

        if (shipRes.statusCode === 200 && shipRes.data.success) {
            printSuccess('Shipment Created Successfully');
            printInfo('AWB Code', shipRes.data.awbCode);
            printInfo('Courier', shipRes.data.courierName);
            printInfo('Shiprocket Order ID', shipRes.data.shiprocketOrderId);
            printInfo('Delivery Type', shipRes.data.deliveryType || 'EXTERNAL');
            if (shipRes.data.trackingUrl) {
                printInfo('Tracking URL', shipRes.data.trackingUrl);
            }
            testResults.tests.push({ name: 'Shipment Creation', passed: true });
            testResults.passed++;
        } else {
            printError(`Shipment Creation Failed: ${JSON.stringify(shipRes.data)}`);
            testResults.tests.push({ name: 'Shipment Creation', passed: false, error: shipRes.data });
            testResults.failed++;
        }

        // ===== STEP 6: VERIFY ORDER UPDATE =====
        printSection('🔍 STEP 6: ORDER UPDATE VERIFICATION');
        const updatedOrder = await Order.findById(order._id);

        const verifications = [
            { field: 'shiprocketOrderId', value: updatedOrder.shiprocketOrderId },
            { field: 'awbCode', value: updatedOrder.awbCode },
            { field: 'courierPartner', value: updatedOrder.courierPartner },
            { field: 'courierStatus', value: updatedOrder.courierStatus }
        ];

        let allVerified = true;
        verifications.forEach(v => {
            if (v.value) {
                printSuccess(`${v.field}: ${v.value}`);
            } else {
                printError(`${v.field}: Missing`);
                allVerified = false;
            }
        });

        if (allVerified) {
            testResults.tests.push({ name: 'Order Update Verification', passed: true });
            testResults.passed++;
        } else {
            testResults.tests.push({ name: 'Order Update Verification', passed: false });
            testResults.failed++;
        }

        // ===== STEP 7: VERIFY TIMELINE =====
        printSection('📋 STEP 7: TIMELINE VERIFICATION');
        if (updatedOrder.courierTimeline && updatedOrder.courierTimeline.length > 0) {
            printSuccess(`Courier Timeline has ${updatedOrder.courierTimeline.length} entries`);
            updatedOrder.courierTimeline.forEach((entry, idx) => {
                console.log(`   ${idx + 1}. [${entry.status}] at ${entry.location} - ${entry.notes}`);
            });
            testResults.tests.push({ name: 'Timeline Verification', passed: true });
            testResults.passed++;
        } else {
            printError('No courier timeline entries found');
            testResults.tests.push({ name: 'Timeline Verification', passed: false });
            testResults.failed++;
        }

        // ===== STEP 8: GET TRACKING =====
        printSection('📡 STEP 8: TRACKING RETRIEVAL');
        let tracking = null;
        if (updatedOrder.awbCode) {
            const trackReq = mockReq({}, { awbCode: updatedOrder.awbCode });
            const trackRes = mockRes();

            await CourierController.getTracking(trackReq, trackRes);

            if (trackRes.statusCode === 200 && trackRes.data.success) {
                tracking = trackRes.data;
                printSuccess('Tracking Retrieved Successfully');
                printInfo('Current Status', tracking.currentStatus);
                printInfo('Origin City', tracking.originCity);
                printInfo('Destination City', tracking.destinationCity);
                printInfo('Courier', tracking.courierName);

                if (tracking.estimatedDelivery) {
                    printInfo('Est. Delivery', new Date(tracking.estimatedDelivery).toLocaleDateString());
                }

                if (tracking.activities && tracking.activities.length > 0) {
                    console.log('\n   Tracking Activities:');
                    tracking.activities.forEach((activity, idx) => {
                        console.log(`   ${idx + 1}. ${activity.status} - ${activity.location} (${new Date(activity.date).toLocaleString()})`);
                    });
                }
                testResults.tests.push({ name: 'Tracking Retrieval', passed: true });
                testResults.passed++;
            } else {
                printError(`Tracking Retrieval Failed: ${JSON.stringify(trackRes.data)}`);
                testResults.tests.push({ name: 'Tracking Retrieval', passed: false, error: trackRes.data });
                testResults.failed++;
            }
        } else {
            printError('Cannot retrieve tracking - no AWB code');
            testResults.tests.push({ name: 'Tracking Retrieval', passed: false, error: 'No AWB code' });
            testResults.failed++;
        }

        // ===== STEP 9: DISPLAY COMPLETE DELIVERY DETAILS =====
        const finalOrder = await Order.findById(order._id);
        printDeliveryDetails(finalOrder, tracking);

        // ===== TEST SUMMARY =====
        printSection('📊 TEST SUMMARY');
        console.log('\n┌────────────────────────────────────────────────────────┐');
        console.log('│                     TEST RESULTS                       │');
        console.log('├────────────────────────────────────────────────────────┤');
        testResults.tests.forEach(test => {
            const status = test.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`│  ${status}  ${test.name.padEnd(43)}│`);
        });
        console.log('├────────────────────────────────────────────────────────┤');
        console.log(`│  Total: ${testResults.passed}/${testResults.tests.length} tests passed`.padEnd(55) + '│');
        console.log('└────────────────────────────────────────────────────────┘');

        if (testResults.failed === 0) {
            console.log('\n🎉 ALL E2E DELIVERY TESTS PASSED SUCCESSFULLY! 🎉\n');
        } else {
            console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the errors above.\n`);
        }

    } catch (error) {
        console.error('\n❌ E2E Test Failed with Error:', error.message);
        console.error(error.stack);
    } finally {
        // Restore mocks
        restoreMocks();

        // Disconnect
        await mongoose.disconnect();
        console.log('📦 Database Disconnected');
        console.log(`\n📅 Test Completed: ${new Date().toLocaleString()}`);
    }
}

// Run the test
runE2EDeliveryTest();
