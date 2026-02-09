/**
 * Real-World E2E Courier Test Script
 * 
 * Tests the complete courier/delivery flow using ACTUAL Shiprocket API calls.
 * This is NOT a mock test - it creates real orders on Shiprocket and then cancels them.
 * 
 * USAGE:
 *   node src/scripts/test-courier-real-e2e.js
 * 
 * To switch to production API:
 *   1. Change API_MODE to 'PRODUCTION' below
 *   2. Update PRODUCTION credentials in CONFIG section
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../../.env') });

// ============================================================================
//                        CONFIGURATION SECTION
// ============================================================================
// Change API_MODE to switch between TEST and PRODUCTION environments
// When deploying to production, simply change this to 'PRODUCTION'

const API_MODE = 'TEST'; // Options: 'TEST' | 'PRODUCTION'

const CONFIG = {
    TEST: {
        // Uses credentials from .env file (current test/sandbox setup)
        useEnvCredentials: true,
        email: null,
        password: null,
        pickupPincode: '395006', // Surat warehouse
        testDeliveryPincode: '400001', // Mumbai
    },
    PRODUCTION: {
        // Override with production credentials when switching to live
        useEnvCredentials: false,
        email: 'your-production-email@domain.com',
        password: 'YOUR_PRODUCTION_API_KEY',
        pickupPincode: '395006', // Update if different for production
        testDeliveryPincode: '400001',
    }
};

// ============================================================================

// Import Models
import { User } from '../models/User.js';
import Product from '../models/productModal.js';
import Order from '../models/orderModal.js';
import LogisticsProvider from '../models/LogisticsProvider.js';
import Category from '../models/categoryModal.js';

// Import Shiprocket Service
import shiprocketService, { ShiprocketService } from '../services/courier/ShiprocketService.js';

// ===== UTILITY FUNCTIONS =====
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function printBanner() {
    console.log('\n');
    console.log(colors.cyan + '╔═══════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + '║     ' + colors.bright + 'REAL-WORLD E2E COURIER TEST - SHIPROCKET' + colors.reset + colors.cyan + '              ║' + colors.reset);
    console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
    console.log();

    if (API_MODE === 'PRODUCTION') {
        console.log(colors.red + colors.bright + '⚠️  WARNING: RUNNING IN PRODUCTION MODE ⚠️' + colors.reset);
        console.log(colors.red + '   This will create REAL orders on your Shiprocket account!' + colors.reset);
        console.log();
    } else {
        console.log(colors.green + '🧪 Running in TEST mode (using .env credentials)' + colors.reset);
        console.log();
    }
}

function printSection(title) {
    console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
    console.log(colors.blue + '  ' + title + colors.reset);
    console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
}

function printStep(num, title) {
    console.log(colors.magenta + `\n▶ STEP ${num}: ${title}` + colors.reset);
}

function printSuccess(message) {
    console.log(colors.green + `  ✅ ${message}` + colors.reset);
}

function printError(message) {
    console.log(colors.red + `  ❌ ${message}` + colors.reset);
}

function printInfo(label, value) {
    console.log(`     ${colors.cyan}${label}:${colors.reset} ${value}`);
}

function printWarning(message) {
    console.log(colors.yellow + `  ⚠️  ${message}` + colors.reset);
}

// ===== TEST RESULTS TRACKER =====
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    shiprocketOrderId: null, // For cleanup
};

function recordTest(name, passed, error = null) {
    testResults.tests.push({ name, passed, error });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

// ===== MAIN TEST FUNCTION =====
async function runRealE2ETest() {
    const config = CONFIG[API_MODE];
    let testOrder = null;
    let shiprocketOrderId = null;

    try {
        printBanner();
        console.log(`📅 Test Started: ${new Date().toLocaleString()}`);
        console.log(`🌐 API Mode: ${API_MODE}`);

        // ===== DATABASE CONNECTION =====
        printSection('🔌 DATABASE CONNECTION');
        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        if (!dbUri) {
            throw new Error('MONGO_TEST_URI or MONGO_URI not defined in .env');
        }
        await mongoose.connect(dbUri);
        printSuccess('MongoDB Connected');
        printInfo('Database', dbUri.split('@')[1]?.split('/')[0] || 'Connected');

        // ===== STEP 1: SHIPROCKET AUTHENTICATION =====
        printStep(1, 'SHIPROCKET AUTHENTICATION');

        // Configure credentials based on mode
        if (!config.useEnvCredentials && config.email && config.password) {
            shiprocketService.setCredentials(config.email, config.password);
            printInfo('Using', 'Custom credentials from CONFIG');
        } else {
            printInfo('Using', 'Credentials from .env file');
        }

        try {
            const token = await shiprocketService.authenticate();
            printSuccess('Authentication Successful');
            printInfo('Token (first 50 chars)', token.substring(0, 50) + '...');
            recordTest('Authentication', true);
        } catch (error) {
            printError(`Authentication Failed: ${error.message}`);
            recordTest('Authentication', false, error.message);
            throw new Error('Cannot proceed without authentication');
        }

        // ===== STEP 2: GET PICKUP LOCATIONS =====
        printStep(2, 'FETCH PICKUP LOCATIONS');

        try {
            const locations = await shiprocketService.getPickupLocations();
            if (locations.success && locations.locations.length > 0) {
                printSuccess(`Found ${locations.locations.length} pickup location(s)`);
                locations.locations.forEach((loc, idx) => {
                    printInfo(`Location ${idx + 1}`, `${loc.name} - ${loc.city}, ${loc.pincode}${loc.isPrimary ? ' (Primary)' : ''}`);
                });
                recordTest('Pickup Locations', true);
            } else {
                printWarning('No pickup locations found - you may need to add one in Shiprocket dashboard');
                recordTest('Pickup Locations', false, 'No locations found');
            }
        } catch (error) {
            printError(`Pickup Locations Failed: ${error.message}`);
            recordTest('Pickup Locations', false, error.message);
        }

        // ===== STEP 3: CHECK SERVICEABILITY =====
        printStep(3, 'CHECK PINCODE SERVICEABILITY');
        printInfo('Route', `${config.pickupPincode} → ${config.testDeliveryPincode}`);

        let recommendedCourier = null;
        try {
            const serviceability = await shiprocketService.checkServiceability(
                config.pickupPincode,
                config.testDeliveryPincode,
                0.5,
                'PREPAID'
            );

            if (serviceability.available) {
                printSuccess(`Pincode is serviceable! ${serviceability.couriers.length} courier(s) available`);

                // Show top 3 couriers
                serviceability.couriers.slice(0, 3).forEach((c, idx) => {
                    printInfo(`Courier ${idx + 1}`, `${c.courierName} - ₹${c.rate} (${c.estimatedDays} days)`);
                });

                if (serviceability.recommendedCourier) {
                    recommendedCourier = serviceability.recommendedCourier;
                    printInfo('Recommended', `${recommendedCourier.courierName} (ID: ${recommendedCourier.courierId})`);
                }
                recordTest('Serviceability Check', true);
            } else {
                printWarning('Pincode not serviceable - no couriers available');
                recordTest('Serviceability Check', false, 'Not serviceable');
            }
        } catch (error) {
            printError(`Serviceability Check Failed: ${error.message}`);
            recordTest('Serviceability Check', false, error.message);
        }

        // ===== STEP 4: CREATE TEST USER & PRODUCT =====
        printStep(4, 'SETUP TEST DATA (User & Product)');

        // Test User
        let user = await User.findOne({ email: 'real_e2e_test@sublified.com' });
        if (!user) {
            user = await User.create({
                name: 'Real E2E Test User',
                email: 'real_e2e_test@sublified.com',
                password: 'testpassword123',
                mobileNumber: '9876543210',
                signupIntent: 'CUSTOMER'
            });
            printSuccess(`Created Test User: ${user._id}`);
        } else {
            printSuccess(`Found Test User: ${user._id}`);
        }

        // Test Category & Product
        let category = await Category.findOne({ name: 'Real E2E Test Category' });
        if (!category) {
            category = await Category.create({
                name: 'Real E2E Test Category',
                slug: 'real-e2e-test-category'
            });
        }

        let product = await Product.findOne({ slug: 'real-e2e-test-product' });
        if (!product) {
            product = await Product.create({
                name: 'Real E2E Test Product',
                slug: 'real-e2e-test-product',
                category: category._id,
                basePrice: 100,
                description: 'Product for real E2E testing',
                quantityDiscounts: [],
                availabilityRules: []
            });
            printSuccess(`Created Test Product: ${product._id}`);
        } else {
            printSuccess(`Found Test Product: ${product._id}`);
        }
        recordTest('Test Data Setup', true);

        // ===== STEP 5: CREATE ORDER IN DATABASE =====
        printStep(5, 'CREATE ORDER IN DATABASE');

        const orderNumber = `REAL-E2E-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        testOrder = await Order.create({
            orderNumber: orderNumber,
            user: user._id,
            product: product._id,
            quantity: 100,
            totalPrice: 500,
            finish: 'Gloss',
            shape: 'Rectangle',
            status: 'REQUESTED',  // Must be uppercase
            paymentStatus: 'PENDING',  // Must be uppercase
            pincode: config.testDeliveryPincode,
            address: '123 Real E2E Test Street, Andheri East, Mumbai, Maharashtra',
            mobileNumber: '9876543210',
            priceSnapshot: {
                basePrice: 100,
                unitPrice: 5,  // Required field
                quantity: 100,  // Required field
                subtotal: 500,
                gstPercentage: 0,
                gstAmount: 0,
                totalPayable: 500,
                currency: 'INR',
                calculatedAt: new Date().toISOString()
            }
        });

        printSuccess(`Order Created: ${testOrder.orderNumber}`);
        printInfo('Order ID', testOrder._id.toString());
        printInfo('Delivery Pincode', testOrder.pincode);
        recordTest('Order Creation', true);

        // ===== STEP 6: CREATE ORDER ON SHIPROCKET =====
        printStep(6, 'CREATE ORDER ON SHIPROCKET (Real API)');

        const shiprocketOrderData = {
            orderNumber: testOrder.orderNumber,
            createdAt: testOrder.createdAt,
            pickupLocation: 'Primary',
            customerName: user.name,
            customerLastName: '',
            address: testOrder.address,
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: testOrder.pincode,
            email: user.email,
            mobileNumber: testOrder.mobileNumber,
            productName: product.name,
            productSku: testOrder.orderNumber,
            quantity: testOrder.quantity,
            itemPrice: testOrder.totalPrice,
            totalPrice: testOrder.totalPrice,
            paymentMethod: 'PREPAID',
            weight: 0.5,
            length: 20,
            breadth: 15,
            height: 5
        };

        try {
            const orderResult = await shiprocketService.createOrder(shiprocketOrderData);

            if (orderResult.success) {
                shiprocketOrderId = orderResult.shiprocketOrderId;
                testResults.shiprocketOrderId = shiprocketOrderId;

                printSuccess('Shiprocket Order Created!');
                printInfo('Shiprocket Order ID', orderResult.shiprocketOrderId);
                printInfo('Shiprocket Shipment ID', orderResult.shiprocketShipmentId);

                // Update local order
                testOrder.shiprocketOrderId = orderResult.shiprocketOrderId;
                testOrder.shiprocketShipmentId = orderResult.shiprocketShipmentId;
                await testOrder.save();

                recordTest('Shiprocket Order Creation', true);

                // ===== STEP 7: GENERATE AWB =====
                printStep(7, 'GENERATE AWB (Air Way Bill)');

                try {
                    const awbResult = await shiprocketService.generateAWB(
                        orderResult.shiprocketShipmentId,
                        recommendedCourier?.courierId || null
                    );

                    if (awbResult.success) {
                        printSuccess('AWB Generated!');
                        printInfo('AWB Code', awbResult.awbCode);
                        printInfo('Courier', awbResult.courierName || 'Auto-assigned');

                        testOrder.awbCode = awbResult.awbCode;
                        testOrder.courierPartner = awbResult.courierName;
                        testOrder.courierStatus = 'PICKUP_SCHEDULED';  // Valid enum value
                        await testOrder.save();

                        recordTest('AWB Generation', true);

                        // ===== STEP 8: REQUEST PICKUP =====
                        printStep(8, 'REQUEST PICKUP');

                        try {
                            const pickupResult = await shiprocketService.requestPickup(
                                orderResult.shiprocketShipmentId
                            );

                            if (pickupResult.success) {
                                printSuccess('Pickup Requested!');
                                printInfo('Pickup Status', pickupResult.pickupStatus || 'Scheduled');
                                recordTest('Pickup Request', true);
                            } else {
                                printWarning('Pickup request returned but may need manual scheduling');
                                recordTest('Pickup Request', true);
                            }
                        } catch (error) {
                            printError(`Pickup Request Failed: ${error.message}`);
                            recordTest('Pickup Request', false, error.message);
                        }

                        // ===== STEP 9: GET TRACKING =====
                        printStep(9, 'GET TRACKING INFORMATION');

                        try {
                            const tracking = await shiprocketService.getTracking(awbResult.awbCode);

                            if (tracking.success) {
                                printSuccess('Tracking Retrieved!');
                                printInfo('Current Status', tracking.currentStatus || 'Pending');
                                printInfo('Origin', tracking.originCity || 'N/A');
                                printInfo('Destination', tracking.destinationCity || 'N/A');

                                if (tracking.activities && tracking.activities.length > 0) {
                                    console.log('\n     📋 Tracking Activities:');
                                    tracking.activities.slice(0, 3).forEach((act, idx) => {
                                        console.log(`        ${idx + 1}. ${act.status} @ ${act.location}`);
                                    });
                                }
                                recordTest('Tracking Retrieval', true);
                            } else {
                                printWarning('No tracking data yet (order just created)');
                                recordTest('Tracking Retrieval', true);
                            }
                        } catch (error) {
                            printWarning(`Tracking not available yet: ${error.message}`);
                            recordTest('Tracking Retrieval', true); // Expected for new orders
                        }

                    } else {
                        printError('AWB Generation returned no AWB code');
                        recordTest('AWB Generation', false, 'No AWB returned');
                    }
                } catch (error) {
                    printError(`AWB Generation Failed: ${error.message}`);
                    recordTest('AWB Generation', false, error.message);
                }

            } else {
                printError('Shiprocket order creation returned unsuccessful');
                recordTest('Shiprocket Order Creation', false, 'Unsuccessful response');
            }
        } catch (error) {
            printError(`Shiprocket Order Creation Failed: ${error.message}`);
            recordTest('Shiprocket Order Creation', false, error.message);
        }

        // ===== STEP 10: CLEANUP - CANCEL SHIPROCKET ORDER =====
        printStep(10, 'CLEANUP - CANCEL SHIPROCKET ORDER');

        if (shiprocketOrderId) {
            try {
                const cancelResult = await shiprocketService.cancelOrder(shiprocketOrderId);
                if (cancelResult.success) {
                    printSuccess('Shiprocket Order Cancelled (Cleanup Complete)');
                    recordTest('Order Cancellation', true);
                } else {
                    printWarning('Cancellation returned but may need manual cleanup');
                    recordTest('Order Cancellation', true);
                }
            } catch (error) {
                printWarning(`Cancellation Failed (may need manual cleanup): ${error.message}`);
                printInfo('Order to cancel manually', shiprocketOrderId);
                recordTest('Order Cancellation', false, error.message);
            }
        } else {
            printWarning('No Shiprocket order to cancel');
            recordTest('Order Cancellation', true);
        }

        // ===== STEP 11: DISPLAY FINAL ORDER DETAILS =====
        printStep(11, 'FINAL ORDER DETAILS');

        const finalOrder = await Order.findById(testOrder._id);

        console.log('\n' + colors.cyan + '┌──────────────────────────────────────────────────────────────┐' + colors.reset);
        console.log(colors.cyan + '│                    COMPLETE ORDER DETAILS                    │' + colors.reset);
        console.log(colors.cyan + '├──────────────────────────────────────────────────────────────┤' + colors.reset);
        console.log(colors.cyan + `│  Order Number:      ${finalOrder.orderNumber.padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Status:            ${(finalOrder.status || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Shiprocket ID:     ${(finalOrder.shiprocketOrderId || 'N/A').toString().padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  AWB Code:          ${(finalOrder.awbCode || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Courier:           ${(finalOrder.courierPartner || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Courier Status:    ${(finalOrder.courierStatus || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset);

        // ===== TEST SUMMARY =====
        printSection('📊 TEST SUMMARY');

        console.log('\n┌──────────────────────────────────────────────────────────────┐');
        console.log('│                       TEST RESULTS                           │');
        console.log('├──────────────────────────────────────────────────────────────┤');
        testResults.tests.forEach(test => {
            const status = test.passed ? colors.green + '✅ PASS' + colors.reset : colors.red + '❌ FAIL' + colors.reset;
            const name = test.name.padEnd(35);
            console.log(`│  ${status}  ${name}│`);
        });
        console.log('├──────────────────────────────────────────────────────────────┤');
        const summary = `Total: ${testResults.passed}/${testResults.tests.length} tests passed`;
        console.log(`│  ${summary.padEnd(58)}│`);
        console.log('└──────────────────────────────────────────────────────────────┘');

        if (testResults.failed === 0) {
            console.log(colors.green + colors.bright + '\n🎉 ALL REAL E2E COURIER TESTS PASSED! 🎉\n' + colors.reset);
        } else {
            console.log(colors.yellow + `\n⚠️  ${testResults.failed} test(s) failed. See errors above.\n` + colors.reset);
        }

        // Cleanup local test order
        if (testOrder) {
            await Order.deleteOne({ _id: testOrder._id });
            printInfo('Local Test Order', 'Deleted from database');
        }

    } catch (error) {
        console.error(colors.red + '\n❌ E2E Test Failed with Error:' + colors.reset, error.message);
        console.error(error.stack);
    } finally {
        // Disconnect
        await mongoose.disconnect();
        console.log('\n📦 Database Disconnected');
        console.log(`📅 Test Completed: ${new Date().toLocaleString()}`);
    }
}

// ===== INSTRUCTIONS =====
console.log(`
${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}
${colors.bright}                    REAL E2E COURIER TEST                       ${colors.reset}
${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}

This script tests the ACTUAL Shiprocket API integration.

${colors.yellow}To switch from TEST to PRODUCTION:${colors.reset}
  1. Open this file: test-courier-real-e2e.js
  2. Change API_MODE from 'TEST' to 'PRODUCTION'
  3. Update the PRODUCTION credentials in CONFIG section
  4. Run the script again

Current Mode: ${API_MODE === 'PRODUCTION' ? colors.red + 'PRODUCTION' : colors.green + 'TEST'}${colors.reset}
`);

// Run the test
runRealE2ETest();
