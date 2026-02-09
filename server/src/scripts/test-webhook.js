/**
 * Webhook Testing Script
 * 
 * Tests webhook endpoint with various status updates
 * Verifies database updates and status mapping
 * 
 * USAGE: node src/scripts/test-webhook.js [ORDER_NUMBER]
 */

import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/orderModal.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const WEBHOOK_URL = process.env.WEBHOOK_TEST_URL || 'http://localhost:5000/api/webhooks/courier-update';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const TEST_STATUSES = [
    { status: 'Pickup Scheduled', statusId: 6, location: 'Warehouse' },
    { status: 'Shipped', statusId: 7, location: 'Origin Hub' },
    { status: 'In Transit', statusId: 7, location: 'Transit Hub' },
    { status: 'Out For Delivery', statusId: 9, location: 'Delivery Center' },
    { status: 'Delivered', statusId: 8, location: 'Customer Location' },
];

function printBanner() {
    console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + '║                ' + colors.bright + 'WEBHOOK TESTING SCRIPT' + colors.reset + colors.cyan + '                     ║' + colors.reset);
    console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
}

function printSuccess(msg) {
    console.log(colors.green + '  ✅ ' + msg + colors.reset);
}

function printError(msg) {
    console.log(colors.red + '  ❌ ' + msg + colors.reset);
}

function printInfo(label, value) {
    console.log(`     ${colors.cyan}${label}:${colors.reset} ${value}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWebhook(awb, orderId, status, statusId, location) {
    const payload = {
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
            status: status
        }]
    };

    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: error.code === 'ECONNREFUSED' ? 'Server not running' : error.message
        };
    }
}

async function testWebhooks() {
    try {
        printBanner();
        console.log('\n' + colors.yellow + `📡 Webhook URL: ${WEBHOOK_URL}` + colors.reset);

        // Connect to database
        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        await mongoose.connect(dbUri);
        printSuccess('Database connected');

        // Get order from command line or database
        const orderNumber = process.argv[2];
        let order;

        if (orderNumber) {
            order = await Order.findOne({ orderNumber: orderNumber });
            if (!order) {
                printError(`Order ${orderNumber} not found`);
                await mongoose.disconnect();
                return;
            }
        } else {
            // Find most recent order with AWB
            order = await Order.findOne({ awbCode: { $exists: true, $ne: null } })
                .sort({ createdAt: -1 });

            if (!order) {
                printError('No orders with AWB found. Please create an order first.');
                console.log('\nUsage:');
                console.log('  node src/scripts/test-webhook.js [ORDER_NUMBER]');
                console.log('\nOr run without arguments to use the latest order with AWB\n');
                await mongoose.disconnect();
                return;
            }
        }

        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  ORDER DETAILS' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        printInfo('Order Number', order.orderNumber);
        printInfo('AWB Code', order.awbCode || 'Not assigned');
        printInfo('Current Status', order.courierStatus || 'Not set');
        printInfo('Timeline Entries', order.courierTimeline?.length || 0);

        if (!order.awbCode) {
            printError('Order has no AWB code. Please generate AWB first.');
            await mongoose.disconnect();
            return;
        }

        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  TESTING WEBHOOK STATUS UPDATES' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < TEST_STATUSES.length; i++) {
            const { status, statusId, location } = TEST_STATUSES[i];

            console.log(`\n     ${colors.cyan}Test ${i + 1}/${TEST_STATUSES.length}: ${status}${colors.reset}`);
            printInfo('  Location', location);

            const result = await sendWebhook(
                order.awbCode,
                order.orderNumber,
                status,
                statusId,
                location
            );

            if (result.success) {
                if (result.data.processed) {
                    printSuccess('Webhook processed');
                    printInfo('  Previous Status', result.data.previousStatus || 'N/A');
                    printInfo('  New Status', result.data.newStatus || 'N/A');
                    successCount++;
                } else {
                    printError(`Webhook not processed: ${result.data.reason || 'Unknown'}`);
                    failCount++;
                }
            } else {
                printError(`Webhook failed: ${result.error}`);
                failCount++;
            }

            // Verify database update
            await sleep(300);
            const updatedOrder = await Order.findById(order._id);
            printInfo('  DB Status', updatedOrder.courierStatus || 'Not updated');
            printInfo('  DB Timeline Entries', updatedOrder.courierTimeline?.length || 0);

            // Wait before next webhook
            if (i < TEST_STATUSES.length - 1) {
                await sleep(1000);
            }
        }

        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  FINAL ORDER STATE' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        const finalOrder = await Order.findById(order._id);

        printInfo('Courier Status', finalOrder.courierStatus || 'Not set');
        printInfo('Order Status', finalOrder.status || 'Not set');
        printInfo('Timeline Entries', finalOrder.courierTimeline?.length || 0);

        if (finalOrder.courierTimeline && finalOrder.courierTimeline.length > 0) {
            console.log('\n     ' + colors.cyan + '📋 Complete Timeline:' + colors.reset);
            finalOrder.courierTimeline.forEach((entry, idx) => {
                const timestamp = new Date(entry.timestamp).toLocaleString();
                console.log(`       ${(idx + 1).toString().padStart(2)}. ${entry.status.padEnd(30)} @ ${entry.location.padEnd(20)} [${timestamp}]`);
            });
        }

        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  TEST SUMMARY' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        console.log(`\n     Total Tests: ${TEST_STATUSES.length}`);
        console.log(`     ${colors.green}Passed: ${successCount}${colors.reset}`);
        console.log(`     ${colors.red}Failed: ${failCount}${colors.reset}`);

        if (successCount === TEST_STATUSES.length) {
            console.log('\n' + colors.green + colors.bright + '     🎉 ALL WEBHOOK TESTS PASSED! 🎉' + colors.reset);
        } else if (successCount > 0) {
            console.log('\n' + colors.yellow + '     ⚠️  Some tests failed. Check server logs.' + colors.reset);
        } else {
            console.log('\n' + colors.red + '     ❌ All tests failed. Is the server running?' + colors.reset);
        }

        await mongoose.disconnect();
        console.log('\n');

    } catch (error) {
        console.error(colors.red + '\n❌ Webhook test failed:' + colors.reset, error.message);
        await mongoose.disconnect();
    }
}

// Run test
testWebhooks();
