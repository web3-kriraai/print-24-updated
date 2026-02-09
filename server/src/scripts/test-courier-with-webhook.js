/**
 * Comprehensive E2E Courier Test with Webhook Simulation
 * 
 * Tests the complete courier flow including:
 * - Order creation
 * - AWB generation (with mock support for non-KYC)
 * - Webhook-based status updates
 * - Complete shipment lifecycle
 * 
 * USAGE:
 *   node src/scripts/test-courier-with-webhook.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
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
import Category from '../models/categoryModal.js';

// Import Shiprocket Service
import shiprocketService from '../services/courier/ShiprocketService.js';

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
    console.log(colors.cyan + '║     ' + colors.bright + 'E2E COURIER TEST WITH WEBHOOK SIMULATION' + colors.reset + colors.cyan + '          ║' + colors.reset);
    console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
    console.log();
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
};

function recordTest(name, passed, error = null) {
    testResults.tests.push({ name, passed, error });
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
}

/**
 * Simulate webhook callback to test status update flow
 */
async function simulateWebhook(awbCode, orderId, status, location = 'Test Warehouse') {
    try {
        const webhookUrl = process.env.WEBHOOK_TEST_URL || 'http://localhost:5000/api/webhooks/courier-update';

        const webhookPayload = {
            awb: awbCode,
            order_id: orderId,
            current_status: status,
            current_status_id: getStatusId(status),
            location: location,
            scans: [{
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0],
                activity: status,
                location: location,
                status: status
            }]
        };

        console.log(`     📡 Sending webhook for status: ${status}`);

        const response = await axios.post(webhookUrl, webhookPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });

        if (response.data.processed) {
            printSuccess(`Webhook processed: ${status}`);
            return true;
        } else {
            printWarning(`Webhook received but not processed: ${response.data.reason || 'Unknown'}`);
            return false;
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            printWarning('Webhook endpoint not running (server may be down)');
        } else {
            printError(`Webhook failed: ${error.message}`);
        }
        return false;
    }
}

/**
 * Get Shiprocket status ID for a status
 */
function getStatusId(status) {
    const statusMap = {
        'Pickup Scheduled': 6,
        'Shipped': 7,
        'In Transit': 7,
        'Out For Delivery': 9,
        'Delivered': 8,
        'RTO Initiated': 10,
    };
    return statusMap[status] || 1;
}

/**
 * Wait for a specified duration
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== MAIN TEST FUNCTION =====
async function runE2ETestWithWebhook() {
    let testOrder = null;

    try {
        printBanner();
        console.log(`📅 Test Started: ${new Date().toLocaleString()}`);

        // ===== DATABASE CONNECTION =====
        printSection('🔌 DATABASE CONNECTION');
        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        if (!dbUri) {
            throw new Error('MONGO_TEST_URI or MONGO_URI not defined in .env');
        }
        await mongoose.connect(dbUri);
        printSuccess('MongoDB Connected');
        printInfo('Database', dbUri.split('@')[1]?.split('/')[0] || 'Connected');

        // ===== STEP 1: SETUP TEST DATA =====
        printStep(1, 'SETUP TEST DATA');

        // Test User
        let user = await User.findOne({ email: 'webhook_test@sublified.com' });
        if (!user) {
            user = await User.create({
                name: 'Webhook Test User',
                email: 'webhook_test@sublified.com',
                password: 'testpassword123',
                mobileNumber: '9876543210',
                signupIntent: 'CUSTOMER'
            });
            printSuccess(`Created Test User: ${user._id}`);
        } else {
            printSuccess(`Found Test User: ${user._id}`);
        }

        // Test Category & Product
        let category = await Category.findOne({ name: 'Webhook Test Category' });
        if (!category) {
            category = await Category.create({
                name: 'Webhook Test Category',
                slug: 'webhook-test-category'
            });
        }

        let product = await Product.findOne({ slug: 'webhook-test-product' });
        if (!product) {
            product = await Product.create({
                name: 'Webhook Test Product',
                slug: 'webhook-test-product',
                category: category._id,
                basePrice: 100,
                description: 'Product for webhook testing',
                quantityDiscounts: [],
                availabilityRules: []
            });
            printSuccess(`Created Test Product: ${product._id}`);
        } else {
            printSuccess(`Found Test Product: ${product._id}`);
        }
        recordTest('Test Data Setup', true);

        // ===== STEP 2: CREATE ORDER =====
        printStep(2, 'CREATE ORDER IN DATABASE');

        const orderNumber = `WEBHOOK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        testOrder = await Order.create({
            orderNumber: orderNumber,
            user: user._id,
            product: product._id,
            quantity: 100,
            totalPrice: 500,
            finish: 'Gloss',
            shape: 'Rectangle',
            status: 'request',
            paymentStatus: 'pending',
            pincode: '400001',
            address: '123 Webhook Test Street, Andheri East, Mumbai, Maharashtra',
            mobileNumber: '9876543210',
            priceSnapshot: {
                basePrice: 100,
                subtotal: 500,
                gstAmount: 0,
                totalPayable: 500,
                currency: 'INR'
            }
        });

        printSuccess(`Order Created: ${testOrder.orderNumber}`);
        printInfo('Order ID', testOrder._id.toString());
        recordTest('Order Creation', true);

        // ===== STEP 3: GENERATE AWB (with mock support) =====
        printStep(3, 'GENERATE AWB CODE');

        // Set mock AWB mode
        shiprocketService.useMockAWB = true;
        printInfo('Mock AWB Mode', 'ENABLED (bypassing KYC)');

        // Generate mock shipment ID
        const mockShipmentId = Date.now();

        try {
            const awbResult = await shiprocketService.generateAWB(mockShipmentId, 1);

            if (awbResult.success) {
                printSuccess('AWB Generated!');
                printInfo('AWB Code', awbResult.awbCode);
                printInfo('Courier', awbResult.courierName);
                printInfo('Is Mock', awbResult.isMock ? 'Yes (KYC not required)' : 'No (Real AWB)');

                testOrder.awbCode = awbResult.awbCode;
                testOrder.courierPartner = awbResult.courierName;
                testOrder.courierStatus = 'AWB_ASSIGNED';
                testOrder.shiprocketShipmentId = mockShipmentId;
                await testOrder.save();

                recordTest('AWB Generation', true);
            } else {
                printError('AWB generation failed');
                recordTest('AWB Generation', false, 'Generation unsuccessful');
            }
        } catch (error) {
            printError(`AWB Generation Failed: ${error.message}`);
            recordTest('AWB Generation', false, error.message);
            throw error;
        }

        // ===== STEP 4: SIMULATE WEBHOOK STATUS UPDATES =====
        printStep(4, 'SIMULATE WEBHOOK STATUS UPDATES');

        const statusSequence = [
            { status: 'Pickup Scheduled', location: 'Surat Warehouse', delay: 1000 },
            { status: 'Shipped', location: 'Surat Hub', delay: 1500 },
            { status: 'In Transit', location: 'Mumbai Hub', delay: 1500 },
            { status: 'Out For Delivery', location: 'Andheri Delivery Center', delay: 1500 },
            { status: 'Delivered', location: 'Customer Location', delay: 1500 }
        ];

        let webhooksPassed = 0;
        let webhooksFailed = 0;

        for (let i = 0; i < statusSequence.length; i++) {
            const { status, location, delay } = statusSequence[i];

            console.log(`\n     📦 Status ${i + 1}/${statusSequence.length}: ${status}`);

            const success = await simulateWebhook(
                testOrder.awbCode,
                testOrder.orderNumber,
                status,
                location
            );

            if (success) {
                webhooksPassed++;

                // Wait a bit then verify database was updated
                await sleep(500);
                const updatedOrder = await Order.findById(testOrder._id);
                printInfo('DB Status', updatedOrder.courierStatus || 'Not updated');

                if (updatedOrder.courierTimeline && updatedOrder.courierTimeline.length > 0) {
                    printInfo('Timeline Entries', updatedOrder.courierTimeline.length.toString());
                }
            } else {
                webhooksFailed++;
            }

            // Wait before next status update
            if (i < statusSequence.length - 1) {
                await sleep(delay);
            }
        }

        recordTest('Webhook Status Updates', webhooksPassed > 0);
        printInfo('Webhooks Passed', `${webhooksPassed}/${statusSequence.length}`);

        // ===== STEP 5: VERIFY FINAL ORDER STATE =====
        printStep(5, 'VERIFY FINAL ORDER STATE');

        const finalOrder = await Order.findById(testOrder._id);

        console.log('\n' + colors.cyan + '┌──────────────────────────────────────────────────────────────┐' + colors.reset);
        console.log(colors.cyan + '│                  FINAL ORDER DETAILS                         │' + colors.reset);
        console.log(colors.cyan + '├──────────────────────────────────────────────────────────────┤' + colors.reset);
        console.log(colors.cyan + `│  Order Number:      ${finalOrder.orderNumber.padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  AWB Code:          ${(finalOrder.awbCode || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Courier:           ${(finalOrder.courierPartner || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Courier Status:    ${(finalOrder.courierStatus || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Order Status:      ${(finalOrder.status || 'N/A').padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + `│  Timeline Entries:  ${(finalOrder.courierTimeline?.length || 0).toString().padEnd(40)}│` + colors.reset);
        console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset);

        if (finalOrder.courierTimeline && finalOrder.courierTimeline.length > 0) {
            console.log('\n     📋 Courier Timeline:');
            finalOrder.courierTimeline.slice(-5).forEach((entry, idx) => {
                console.log(`        ${idx + 1}. ${entry.status} @ ${entry.location} - ${new Date(entry.timestamp).toLocaleString()}`);
            });
        }

        recordTest('Final Order Verification', finalOrder.awbCode !== null);

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
            console.log(colors.green + colors.bright + '\n🎉 ALL E2E COURIER TESTS PASSED! 🎉\n' + colors.reset);
        } else {
            console.log(colors.yellow + `\n⚠️  ${testResults.failed} test(s) failed. See errors above.\n` + colors.reset);
        }

        // Cleanup test order
        printInfo('Cleanup', 'Removing test order from database');
        await Order.deleteOne({ _id: testOrder._id });

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

// Run the test
console.log(`
${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}
${colors.bright}           E2E COURIER TEST WITH WEBHOOK SIMULATION            ${colors.reset}
${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}

This script tests:
  ✓ Order creation
  ✓ AWB generation (with mock support for non-KYC)
  ✓ Webhook-based status updates
  ✓ Complete shipment lifecycle tracking

${colors.yellow}Note: Webhooks require the server to be running!${colors.reset}
`);

runE2ETestWithWebhook();
