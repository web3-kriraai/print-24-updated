/**
 * Webhook Test Script with Order Details Integration
 * 
 * This script tests the Shiprocket webhook endpoint and verifies
 * that order details are properly updated in the database.
 * 
 * Features:
 * - Test webhooks with an existing order or create a test order
 * - Simulate full delivery lifecycle (pickup -> in_transit -> delivered)
 * - Verify database updates after each webhook
 * - Show detailed order state at each step
 * 
 * USAGE:
 *   node src/scripts/test-webhook-order-details.js                    # Create test order
 *   node src/scripts/test-webhook-order-details.js <ORDER_NUMBER>     # Use existing order
 *   node src/scripts/test-webhook-order-details.js <ORDER_ID>         # Use MongoDB ObjectId
 * 
 * EXAMPLE:
 *   node src/scripts/test-webhook-order-details.js ORD-1234567890-0001
 */

import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/orderModal.js';
import { User } from '../models/User.js';
import Product from '../models/productModal.js';
import Category from '../models/categoryModal.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Configuration
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const WEBHOOK_URL = `${BASE_URL}/api/webhooks/webhook`;

// Console colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
};

// Shiprocket Status Lifecycle
const DELIVERY_LIFECYCLE = [
    {
        status: 'Pickup Scheduled',
        statusId: 6,
        location: 'Warehouse - Surat',
        expectedDbStatus: 'pickup_scheduled',
        description: 'Order ready for pickup'
    },
    {
        status: 'Out For Pickup',
        statusId: 6,
        location: 'Warehouse - Surat',
        expectedDbStatus: 'pickup_scheduled',
        description: 'Courier partner heading to pickup'
    },
    {
        status: 'Shipped',
        statusId: 7,
        location: 'Origin Hub - Surat',
        expectedDbStatus: 'in_transit',
        description: 'Package handed to courier'
    },
    {
        status: 'In Transit',
        statusId: 7,
        location: 'Transit Hub - Mumbai',
        expectedDbStatus: 'in_transit',
        description: 'Package moving through network'
    },
    {
        status: 'Reached at Destination Hub',
        statusId: 7,
        location: 'Destination Hub - Delhi',
        expectedDbStatus: 'in_transit',
        description: 'Package reached destination city'
    },
    {
        status: 'Out For Delivery',
        statusId: 9,
        location: 'Delivery Center - Delhi',
        expectedDbStatus: 'out_for_delivery',
        description: 'Out for final delivery'
    },
    {
        status: 'Delivered',
        statusId: 8,
        location: 'Customer Address',
        expectedDbStatus: 'delivered',
        description: 'Package delivered successfully'
    }
];

// Helper functions
function printBanner() {
    console.log('\n');
    console.log(colors.cyan + '╔═══════════════════════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + '║  ' + colors.bright + colors.white + '📦 SHIPROCKET WEBHOOK TESTING WITH ORDER DETAILS INTEGRATION' + colors.reset + colors.cyan + '                ║' + colors.reset);
    console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════════════════════════╝' + colors.reset);
}

function printSection(title, emoji = '📌') {
    console.log('\n' + colors.blue + '═'.repeat(80) + colors.reset);
    console.log(colors.blue + `  ${emoji} ${title}` + colors.reset);
    console.log(colors.blue + '═'.repeat(80) + colors.reset);
}

function printSuccess(msg) {
    console.log(colors.green + '  ✅ ' + msg + colors.reset);
}

function printError(msg) {
    console.log(colors.red + '  ❌ ' + msg + colors.reset);
}

function printWarning(msg) {
    console.log(colors.yellow + '  ⚠️  ' + msg + colors.reset);
}

function printInfo(label, value) {
    console.log(`    ${colors.cyan}${label}:${colors.reset} ${value}`);
}

function printStep(num, total, title) {
    console.log(`\n  ${colors.magenta}▶ Step ${num}/${total}: ${title}${colors.reset}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create webhook payload in Shiprocket format
 */
function createWebhookPayload(awb, orderId, status, statusId, location) {
    return {
        awb: awb,
        order_id: orderId,
        current_status: status,
        current_status_id: statusId,
        location: location,
        scans: [{
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().split(' ')[0],
            activity: status,
            location: location,
            status: status,
            remarks: `Test webhook - ${status}`
        }]
    };
}

/**
 * Send webhook and capture response
 */
async function sendWebhook(payload) {
    try {
        const startTime = Date.now();
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Test': 'true'
            },
            timeout: 10000
        });
        const duration = Date.now() - startTime;

        return {
            success: true,
            data: response.data,
            status: response.status,
            duration: duration
        };
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: `Server not running at ${BASE_URL}`,
                suggestion: 'Start the server with: npm run dev'
            };
        }
        return {
            success: false,
            error: error.response?.data?.error || error.message
        };
    }
}

/**
 * Display order details in a formatted box
 */
function printOrderDetails(order, title = 'ORDER DETAILS') {
    const width = 70;
    const line = '─'.repeat(width);

    console.log('\n  ' + colors.cyan + '┌' + line + '┐' + colors.reset);
    console.log('  ' + colors.cyan + '│' + colors.reset + colors.bright + ` ${title.padEnd(width - 1)}` + colors.reset + colors.cyan + '│' + colors.reset);
    console.log('  ' + colors.cyan + '├' + line + '┤' + colors.reset);

    const printRow = (label, value) => {
        const labelPadded = label.padEnd(22);
        const valueTruncated = String(value || 'N/A').substring(0, width - 25);
        console.log('  ' + colors.cyan + '│' + colors.reset + `  ${colors.dim}${labelPadded}${colors.reset} ${valueTruncated.padEnd(width - 25)}` + colors.cyan + '│' + colors.reset);
    };

    printRow('Order Number', order.orderNumber);
    printRow('Order ID', order._id?.toString());
    printRow('Order Status', order.status);
    printRow('Payment Status', order.paymentStatus);
    console.log('  ' + colors.cyan + '├' + line + '┤' + colors.reset);
    printRow('AWB Code', order.awbCode);
    printRow('Courier Partner', order.courierPartner);
    printRow('Courier Status', order.courierStatus);
    printRow('Shiprocket Order ID', order.shiprocketOrderId);
    printRow('Tracking URL', order.courierTrackingUrl?.substring(0, 40) + '...');
    console.log('  ' + colors.cyan + '├' + line + '┤' + colors.reset);
    printRow('Timeline Entries', order.courierTimeline?.length || 0);
    printRow('Dispatched At', order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'Not yet');
    printRow('Delivered At', order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'Not yet');

    console.log('  ' + colors.cyan + '└' + line + '┘' + colors.reset);
}

/**
 * Display courier timeline
 */
function printTimeline(timeline) {
    if (!timeline || timeline.length === 0) {
        console.log('    ' + colors.dim + 'No timeline entries' + colors.reset);
        return;
    }

    console.log('\n  ' + colors.cyan + '📋 Courier Timeline:' + colors.reset);
    timeline.forEach((entry, idx) => {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const status = colors.bright + entry.status + colors.reset;
        const location = colors.dim + `@ ${entry.location}` + colors.reset;
        console.log(`    ${(idx + 1).toString().padStart(2, '0')}. ${status.padEnd(40)} ${location}`);
        console.log(`        ${colors.dim}${timestamp}${colors.reset}`);
    });
}

/**
 * Create a test order if needed
 */
async function createTestOrder() {
    // Find or create test user
    let user = await User.findOne({ email: 'webhook_test@test.com' });
    if (!user) {
        user = await User.create({
            name: 'Webhook Test User',
            email: 'webhook_test@test.com',
            password: 'testpassword123',
            mobileNumber: '9876543210',
            signupIntent: 'CUSTOMER'
        });
    }

    // Find or create test category
    let category = await Category.findOne({ slug: 'webhook-test' });
    if (!category) {
        category = await Category.create({
            name: 'Webhook Test',
            slug: 'webhook-test'
        });
    }

    // Find or create test product
    let product = await Product.findOne({ slug: 'webhook-test-product' });
    if (!product) {
        product = await Product.create({
            name: 'Webhook Test Product',
            slug: 'webhook-test-product',
            category: category._id,
            basePrice: 100,
            description: 'Product for webhook testing'
        });
    }

    // Generate mock AWB code
    const mockAWB = `MTEST${Date.now().toString().slice(-8)}`;

    // Create test order
    const order = await Order.create({
        user: user._id,
        product: product._id,
        quantity: 100,
        status: 'DISPATCHED',
        paymentStatus: 'COMPLETED',
        address: 'Test Address, Test City, Test State',
        pincode: '400001',
        mobileNumber: '9876543210',
        priceSnapshot: {
            basePrice: 1,
            unitPrice: 1,
            quantity: 100,
            subtotal: 100,
            gstAmount: 18,
            totalPayable: 118,
            currency: 'INR',
            appliedModifiers: []
        },
        awbCode: mockAWB,
        courierPartner: 'Test Courier',
        courierStatus: 'PENDING',
        shiprocketOrderId: `SR${Date.now()}`,
        shiprocketShipmentId: `SH${Date.now()}`,
        courierTrackingUrl: `https://shiprocket.co/tracking/${mockAWB}`,
        dispatchedAt: new Date()
    });

    return order;
}

// Main test function
async function runWebhookTest() {
    let testOrder = null;
    let createdTestOrder = false;

    try {
        printBanner();
        console.log(`\n  📅 Test Started: ${new Date().toLocaleString()}`);
        console.log(`  🔗 Webhook URL: ${colors.cyan}${WEBHOOK_URL}${colors.reset}`);

        // Connect to database
        printSection('DATABASE CONNECTION', '🔌');
        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        if (!dbUri) {
            throw new Error('MONGO_TEST_URI or MONGO_URI not defined in .env');
        }
        await mongoose.connect(dbUri);
        printSuccess('Connected to MongoDB');

        // Get or create order
        printSection('PREPARING TEST ORDER', '📦');

        const orderIdentifier = process.argv[2];

        if (orderIdentifier) {
            // Try to find by order number or MongoDB ObjectId
            if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
                testOrder = await Order.findById(orderIdentifier);
            }
            if (!testOrder) {
                testOrder = await Order.findOne({ orderNumber: orderIdentifier });
            }

            if (!testOrder) {
                printError(`Order not found: ${orderIdentifier}`);
                console.log('\n  Usage:');
                console.log('    node src/scripts/test-webhook-order-details.js [ORDER_NUMBER or ORDER_ID]');
                await mongoose.disconnect();
                return;
            }

            printSuccess(`Found existing order: ${testOrder.orderNumber}`);
        } else {
            // Create a new test order
            printWarning('No order specified, creating a test order...');
            testOrder = await createTestOrder();
            createdTestOrder = true;
            printSuccess(`Created test order: ${testOrder.orderNumber}`);
        }

        // Ensure order has AWB code
        if (!testOrder.awbCode) {
            const mockAWB = `MTEST${Date.now().toString().slice(-8)}`;
            await Order.findByIdAndUpdate(testOrder._id, {
                awbCode: mockAWB,
                courierStatus: 'PENDING',
                courierPartner: 'Test Courier'
            });
            testOrder = await Order.findById(testOrder._id);
            printWarning(`Generated mock AWB: ${mockAWB}`);
        }

        // Display initial order state
        printOrderDetails(testOrder, 'INITIAL ORDER STATE');

        // Check server connectivity
        printSection('CONNECTIVITY CHECK', '🔍');
        const testPayload = createWebhookPayload(
            'TEST-AWB',
            'TEST-ORDER',
            'Ping',
            0,
            'Test'
        );
        const connectResult = await sendWebhook(testPayload);

        if (!connectResult.success && connectResult.suggestion) {
            printError(connectResult.error);
            printWarning(connectResult.suggestion);
            await mongoose.disconnect();
            return;
        }
        printSuccess(`Server is reachable (${connectResult.duration}ms response time)`);

        // Run webhook lifecycle tests
        printSection('WEBHOOK DELIVERY LIFECYCLE TEST', '🚚');

        const results = {
            passed: 0,
            failed: 0,
            tests: []
        };

        for (let i = 0; i < DELIVERY_LIFECYCLE.length; i++) {
            const step = DELIVERY_LIFECYCLE[i];
            printStep(i + 1, DELIVERY_LIFECYCLE.length, step.status);
            console.log(`    ${colors.dim}${step.description}${colors.reset}`);

            // Create and send webhook
            const payload = createWebhookPayload(
                testOrder.awbCode,
                testOrder.orderNumber,
                step.status,
                step.statusId,
                step.location
            );

            const response = await sendWebhook(payload);

            if (response.success && response.data.processed) {
                printSuccess(`Webhook processed in ${response.duration}ms`);
                printInfo('Previous Status', response.data.previousStatus || 'N/A');
                printInfo('New Status', response.data.newStatus || 'N/A');

                // Wait for DB update
                await sleep(300);

                // Verify database was updated
                const updatedOrder = await Order.findById(testOrder._id);
                const dbStatusMatch = updatedOrder.courierStatus === step.expectedDbStatus;

                if (dbStatusMatch) {
                    printSuccess(`DB status verified: ${updatedOrder.courierStatus}`);
                    results.passed++;
                    results.tests.push({ name: step.status, passed: true });
                } else {
                    printWarning(`DB status mismatch: expected ${step.expectedDbStatus}, got ${updatedOrder.courierStatus}`);
                    results.failed++;
                    results.tests.push({ name: step.status, passed: false, error: 'Status mismatch' });
                }

                printInfo('Timeline Entries', updatedOrder.courierTimeline?.length || 0);
            } else {
                printError(`Webhook failed: ${response.error || 'Unknown error'}`);
                if (response.data && !response.data.processed) {
                    printInfo('Reason', response.data.reason || 'Not processed');
                }
                results.failed++;
                results.tests.push({ name: step.status, passed: false, error: response.error });
            }

            // Delay between webhooks
            if (i < DELIVERY_LIFECYCLE.length - 1) {
                await sleep(500);
            }
        }

        // Display final order state
        printSection('FINAL ORDER STATE', '📋');
        const finalOrder = await Order.findById(testOrder._id);
        printOrderDetails(finalOrder, 'FINAL ORDER STATE');
        printTimeline(finalOrder.courierTimeline);

        // Print test summary
        printSection('TEST SUMMARY', '📊');

        console.log('\n  ┌────────────────────────────────────────────────────────────────┐');
        console.log('  │                        TEST RESULTS                           │');
        console.log('  ├────────────────────────────────────────────────────────────────┤');
        results.tests.forEach(test => {
            const status = test.passed
                ? colors.green + '✅ PASS' + colors.reset
                : colors.red + '❌ FAIL' + colors.reset;
            const name = test.name.padEnd(35);
            console.log(`  │  ${status}  ${name} │`);
        });
        console.log('  ├────────────────────────────────────────────────────────────────┤');
        const summary = `Total: ${results.passed}/${results.tests.length} tests passed`;
        console.log(`  │  ${summary.padEnd(58)} │`);
        console.log('  └────────────────────────────────────────────────────────────────┘');

        if (results.failed === 0) {
            console.log(colors.green + colors.bright + '\n  🎉 ALL WEBHOOK TESTS PASSED! ORDER DETAILS INTEGRATION WORKING! 🎉' + colors.reset);
        } else {
            console.log(colors.yellow + `\n  ⚠️  ${results.failed} test(s) failed. Review the errors above.` + colors.reset);
        }

        // Cleanup if we created a test order
        if (createdTestOrder) {
            printSection('CLEANUP', '🧹');
            await Order.findByIdAndDelete(testOrder._id);
            printSuccess('Test order deleted');
        }

    } catch (error) {
        console.error(colors.red + '\n  ❌ Test failed with error:' + colors.reset, error.message);
        console.error(error.stack);

        // Cleanup on error
        if (createdTestOrder && testOrder) {
            await Order.findByIdAndDelete(testOrder._id).catch(() => { });
        }
    } finally {
        await mongoose.disconnect();
        console.log(`\n  📅 Test Completed: ${new Date().toLocaleString()}`);
        console.log('  📦 Database Disconnected\n');
    }
}

// Display help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
${colors.bright}WEBHOOK TEST SCRIPT WITH ORDER DETAILS INTEGRATION${colors.reset}

${colors.cyan}USAGE:${colors.reset}
  node src/scripts/test-webhook-order-details.js                    # Create test order
  node src/scripts/test-webhook-order-details.js <ORDER_NUMBER>     # Use existing order
  node src/scripts/test-webhook-order-details.js <ORDER_ID>         # Use MongoDB ObjectId

${colors.cyan}DESCRIPTION:${colors.reset}
  This script tests the Shiprocket webhook integration by simulating
  the full delivery lifecycle from pickup to delivery. It verifies
  that each webhook properly updates the order in the database.

${colors.cyan}REQUIREMENTS:${colors.reset}
  - Server must be running (npm run dev)
  - MongoDB connection configured in .env
  - Order must have an AWB code (will generate mock if missing)

${colors.cyan}WEBHOOK LIFECYCLE TESTED:${colors.reset}
  1. Pickup Scheduled
  2. Out For Pickup
  3. Shipped
  4. In Transit
  5. Reached at Destination Hub
  6. Out For Delivery
  7. Delivered

${colors.cyan}EXAMPLES:${colors.reset}
  node src/scripts/test-webhook-order-details.js ORD-1707000000000-0001
  node src/scripts/test-webhook-order-details.js 65a1b2c3d4e5f6g7h8i9j0k1
`);
    process.exit(0);
}

// Run the test
runWebhookTest();
