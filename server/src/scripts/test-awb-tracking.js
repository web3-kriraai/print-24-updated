/**
 * AWB Tracking Test Script
 * 
 * Tests tracking functionality using AWB codes
 * - Tests tracking by AWB code
 * - Tests tracking by Order ID
 * - Displays complete tracking timeline
 * 
 * USAGE: node src/scripts/test-awb-tracking.js [AWB_CODE]
 */

import shiprocketService from '../services/courier/ShiprocketService.js';
import Order from '../models/orderModal.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Colors
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
    console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.cyan + '║              ' + colors.bright + 'AWB TRACKING TEST SCRIPT' + colors.reset + colors.cyan + '                      ║' + colors.reset);
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

function printJSON(label, obj) {
    console.log(`\n     ${colors.cyan}${label}:${colors.reset}`);
    console.log(colors.white + JSON.stringify(obj, null, 2).split('\n').map(line => '       ' + line).join('\n') + colors.reset);
}

async function testTracking() {
    try {
        printBanner();

        // Get AWB from command line argument or use a test AWB
        const awbCode = process.argv[2];

        if (!awbCode) {
            console.log('\n' + colors.yellow + '⚠️  No AWB code provided' + colors.reset);
            console.log('\nUsage:');
            console.log('  node src/scripts/test-awb-tracking.js <AWB_CODE>');
            console.log('\nOr test with database order:');
            console.log('  node src/scripts/test-awb-tracking.js --db\n');
            process.exit(0);
        }

        // Connect to database
        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        await mongoose.connect(dbUri);
        printSuccess('Database connected');

        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  TEST 1: TRACKING BY AWB CODE' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        if (awbCode === '--db') {
            // Find latest order with AWB
            const order = await Order.findOne({ awbCode: { $exists: true, $ne: null } })
                .sort({ createdAt: -1 });

            if (!order) {
                printError('No orders with AWB code found in database');
                await mongoose.disconnect();
                return;
            }

            printInfo('Using AWB from order', order.orderNumber);
            printInfo('AWB Code', order.awbCode);

            await testTrackingByAWB(order.awbCode);

            console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
            console.log(colors.blue + '  TEST 2: TRACKING BY ORDER ID' + colors.reset);
            console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

            if (order.shiprocketOrderId) {
                await testTrackingByOrderId(order.shiprocketOrderId);
            } else {
                printError('Order has no Shiprocket Order ID');
            }

            console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
            console.log(colors.blue + '  DATABASE TRACKING INFO' + colors.reset);
            console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

            displayDatabaseTracking(order);

        } else {
            await testTrackingByAWB(awbCode);

            // Try to find order in database
            const order = await Order.findOne({ awbCode: awbCode });
            if (order) {
                console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
                console.log(colors.blue + '  DATABASE TRACKING INFO' + colors.reset);
                console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
                displayDatabaseTracking(order);
            }
        }

        await mongoose.disconnect();
        console.log('\n' + colors.green + '✅ Tracking test completed' + colors.reset + '\n');

    } catch (error) {
        console.error(colors.red + '\n❌ Tracking test failed:' + colors.reset, error.message);
        await mongoose.disconnect();
    }
}

async function testTrackingByAWB(awbCode) {
    printInfo('Testing AWB', awbCode);

    try {
        const tracking = await shiprocketService.getTracking(awbCode);

        if (tracking.success) {
            printSuccess('Tracking data retrieved');

            console.log('\n     ' + colors.cyan + '📦 Shipment Details:' + colors.reset);
            printInfo('  Current Status', tracking.currentStatus || 'Unknown');
            printInfo('  Origin', tracking.originCity || 'N/A');
            printInfo('  Destination', tracking.destinationCity || 'N/A');
            printInfo('  Courier', tracking.courierName || 'N/A');
            printInfo('  ETD', tracking.etd || 'N/A');

            if (tracking.activities && tracking.activities.length > 0) {
                console.log('\n     ' + colors.cyan + '📋 Tracking Timeline:' + colors.reset);
                tracking.activities.forEach((activity, idx) => {
                    console.log(`       ${(idx + 1).toString().padStart(2)}. ${activity.status.padEnd(35)} @ ${activity.location.padEnd(20)} [${activity.date}]`);
                });
            } else {
                printInfo('  Timeline', 'No tracking activities yet');
            }

            printJSON('Complete Tracking Response', tracking);

        } else {
            printError('No tracking data found');
            console.log('     Message:', tracking.message || 'Unknown error');
        }

    } catch (error) {
        printError(`Tracking failed: ${error.message}`);
        if (error.message.includes('404') || error.message.includes('not found')) {
            console.log('     ' + colors.yellow + 'Note: AWB may not be in Shiprocket system yet' + colors.reset);
        }
    }
}

async function testTrackingByOrderId(orderId) {
    printInfo('Testing Order ID', orderId);

    try {
        const tracking = await shiprocketService.getTrackingByOrderId(orderId);

        if (tracking.success) {
            printSuccess('Tracking data retrieved by Order ID');

            console.log('\n     ' + colors.cyan + '📦 Shipment Details:' + colors.reset);
            printInfo('  AWB Code', tracking.awbCode || 'N/A');
            printInfo('  Current Status', tracking.currentStatus || 'Unknown');
            printInfo('  Courier', tracking.courierName || 'N/A');
            printInfo('  ETD', tracking.etd || 'N/A');
            printInfo('  Delivered Date', tracking.deliveredDate || 'Not delivered');

            if (tracking.activities && tracking.activities.length > 0) {
                console.log('\n     ' + colors.cyan + '📋 Tracking Timeline:' + colors.reset);
                tracking.activities.forEach((activity, idx) => {
                    const datetime = `${activity.date} ${activity.time || ''}`.trim();
                    console.log(`       ${(idx + 1).toString().padStart(2)}. ${activity.status.padEnd(35)} @ ${activity.location.padEnd(20)} [${datetime}]`);
                });
            }

        } else {
            printError('No tracking data found for Order ID');
            console.log('     Message:', tracking.message || 'Unknown error');
        }

    } catch (error) {
        printError(`Tracking by Order ID failed: ${error.message}`);
    }
}

function displayDatabaseTracking(order) {
    printInfo('Order Number', order.orderNumber);
    printInfo('Courier Status', order.courierStatus || 'Not set');
    printInfo('Courier Partner', order.courierPartner || 'Not assigned');

    if (order.courierTimeline && order.courierTimeline.length > 0) {
        console.log('\n     ' + colors.cyan + '📋 Database Timeline (' + order.courierTimeline.length + ' entries):' + colors.reset);
        order.courierTimeline.forEach((entry, idx) => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            console.log(`       ${(idx + 1).toString().padStart(2)}. ${entry.status.padEnd(35)} @ ${entry.location.padEnd(20)} [${timestamp}]`);
            if (entry.notes) {
                console.log(`           ${colors.yellow}Note: ${entry.notes}${colors.reset}`);
            }
        });
    } else {
        printInfo('  Database Timeline', 'No entries (webhooks may not have been received)');
    }
}

// Run test
testTracking();
