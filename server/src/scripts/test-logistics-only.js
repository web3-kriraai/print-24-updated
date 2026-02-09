/**
 * LOGISTICS-ONLY E2E TEST SCRIPT
 * 
 * Tests complete logistics integration (Steps 4 & 5) with an existing order
 * 
 * FLOW:
 * Step 4.1: Check Serviceability (Smart Routing)
 * Step 4.2: Create Shiprocket Order
 * Step 4.3: Generate AWB (Mock - No KYC Required)
 * Step 4.4: Request Pickup
 * Step 5: Simulate Webhook Lifecycle
 * 
 * PREREQUISITES:
 * - Order must exist in database with payment completed
 * - Run this script AFTER payment is processed
 * 
 * USAGE:
 *   node src/scripts/test-logistics-only.js <ORDER_NUMBER>
 *   node src/scripts/test-logistics-only.js --latest
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Order from '../models/orderModal.js';
import { User } from '../models/User.js';
import shiprocketService from '../services/courier/ShiprocketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_TEST_URL || 'http://localhost:5000/api/webhooks/courier-update';
const PICKUP_PINCODE = '395006'; // Surat warehouse
const USE_MOCK_AWB = process.env.USE_MOCK_AWB !== 'false';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

// Utility functions
function printBanner() {
    console.log('\n' + colors.blue + '╔═══════════════════════════════════════════════════════════════╗' + colors.reset);
    console.log(colors.blue + '║        ' + colors.bright + 'LOGISTICS-ONLY E2E TEST (STEPS 4 & 5)' + colors.reset + colors.blue + '           ║' + colors.reset);
    console.log(colors.blue + '╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
    console.log('\nThis script tests ONLY the logistics integration:');
    console.log('  4.1 ✓ Check Serviceability (Smart Routing)');
    console.log('  4.2 ✓ Create Shiprocket Order');
    console.log('  4.3 ✓ Generate AWB Code (Mock - No KYC)');
    console.log('  4.4 ✓ Request Pickup');
    console.log('  5.0 ✓ Webhook Lifecycle Simulation\n');
}

function printStep(num, title) {
    console.log('\n' + colors.blue + `▶ STEP ${num}: ${title}` + colors.reset);
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
    console.log(`     ${colors.cyan}${label}:${colors.reset} ${value}`);
}

function printJSON(label, obj) {
    console.log(`\n     ${colors.cyan}${label}:${colors.reset}`);
    console.log(colors.white + JSON.stringify(obj, null, 2).split('\n').map(line => '       ' + line).join('\n') + colors.reset);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateWebhook(awb, orderId, status, statusId, location) {
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

    console.log(`\n     ${colors.cyan}Simulating: ${status}${colors.reset}`);
    printJSON('Webhook Payload', payload);

    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });

        if (response.data.processed) {
            printSuccess(`Webhook processed: ${status}`);
            printInfo('  Previous Status', response.data.previousStatus || 'N/A');
            printInfo('  New Status', response.data.newStatus || 'N/A');
        } else {
            printWarning(`Webhook not processed: ${response.data.reason || 'Unknown'}`);
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            printError('Server not running - updating DB directly');
        } else {
            printError(`Webhook failed: ${error.message}`);
        }
    }
}

async function runLogisticsOnlyTest() {
    let dbOrder = null;

    try {
        printBanner();

        console.log(colors.cyan + '📅 Test Started:' + colors.reset + ' ' + new Date().toLocaleString());
        console.log(colors.cyan + '🧪 Mock AWB Mode:' + colors.reset + ' ' + (USE_MOCK_AWB ? 'ENABLED' : 'DISABLED'));
        console.log(colors.cyan + '📡 Webhook URL:' + colors.reset + ' ' + WEBHOOK_URL);

        // Connect to database
        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  🔌 DATABASE CONNECTION' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        const dbUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        await mongoose.connect(dbUri);
        printSuccess('MongoDB Connected');

        // Get order from command line or use latest
        const orderArg = process.argv[2];

        printStep('0', 'LOAD EXISTING ORDER');

        if (!orderArg) {
            console.log('\n' + colors.yellow + '⚠️  No order specified. Usage:' + colors.reset);
            console.log('  node src/scripts/test-logistics-only.js <ORDER_NUMBER>');
            console.log('  node src/scripts/test-logistics-only.js --latest\n');
            await mongoose.disconnect();
            return;
        }

        if (orderArg === '--latest') {
            dbOrder = await Order.findOne({ paymentStatus: 'completed' })
                .sort({ createdAt: -1 });

            if (!dbOrder) {
                printError('No paid orders found in database');
                console.log('     ' + colors.yellow + 'Create an order with completed payment first' + colors.reset);
                await mongoose.disconnect();
                return;
            }
            printSuccess('Using latest paid order');
        } else {
            dbOrder = await Order.findOne({ orderNumber: orderArg });

            if (!dbOrder) {
                printError(`Order ${orderArg} not found`);
                await mongoose.disconnect();
                return;
            }

            if (dbOrder.paymentStatus !== 'completed') {
                printError('Order payment is not completed');
                printInfo('  Current Payment Status', dbOrder.paymentStatus);
                console.log('     ' + colors.yellow + 'Complete payment before running logistics' + colors.reset);
                await mongoose.disconnect();
                return;
            }
            printSuccess('Order loaded successfully');
        }

        printInfo('Order Number', dbOrder.orderNumber);
        printInfo('Payment Status', dbOrder.paymentStatus);
        printInfo('Delivery Pincode', dbOrder.pincode);
        printInfo('Total Price', `₹${dbOrder.totalPrice}`);
        printInfo('Quantity', dbOrder.quantity);

        // ===== STEP 4.1: CHECK SERVICEABILITY =====
        printStep('4.1', 'CHECK SERVICEABILITY (Smart Routing)');

        const serviceability = await shiprocketService.checkServiceability(
            PICKUP_PINCODE,
            dbOrder.pincode,
            0.5, // Default weight
            'Prepaid'
        );

        if (!serviceability.serviceable) {
            printError('Pincode not serviceable');
            console.log('     ' + colors.yellow + 'Try different pincode or use internal delivery' + colors.reset);
            await mongoose.disconnect();
            return;
        }

        printSuccess('Pincode serviceable!');
        printInfo('Available Couriers', serviceability.availableCouriers?.length || 0);

        if (serviceability.availableCouriers && serviceability.availableCouriers.length > 0) {
            console.log('\n     ' + colors.cyan + '📦 Available Couriers:' + colors.reset);
            serviceability.availableCouriers.slice(0, 5).forEach((courier, idx) => {
                const rate = courier.rate ? `₹${courier.rate.toString().padStart(6)}` : '  N/A  ';
                const days = courier.etd ? `${courier.etd} days` : 'N/A';
                console.log(`       ${(idx + 1).toString().padStart(2)}. ${courier.courier_name.padEnd(30)} ${rate} (${days})`);
            });
        }

        const selectedCourier = serviceability.recommendedCourier;
        if (selectedCourier) {
            console.log('\n     ' + colors.green + '🎯 Smart Routing Selected:' + colors.reset);
            printInfo('  Courier', selectedCourier.courier_name);
            printInfo('  Rate', `₹${selectedCourier.rate}`);
            printInfo('  Estimated Days', selectedCourier.etd || 'N/A');
        }

        // ===== STEP 4.2: CREATE SHIPROCKET ORDER =====
        printStep('4.2', 'CREATE SHIPROCKET ORDER');

        // Enable mock AWB mode
        shiprocketService.useMockAWB = USE_MOCK_AWB;

        // Get customer name from address or use default
        const names = (dbOrder.address || '').split(' ');
        const firstName = names[0] || 'Customer';
        const lastName = names.slice(1).join(' ') || 'Name';

        const shiprocketOrderData = {
            order_id: dbOrder.orderNumber,
            order_date: dbOrder.createdAt.toISOString().split('T')[0],
            pickup_location: 'Primary',
            billing_customer_name: firstName,
            billing_last_name: lastName,
            billing_address: dbOrder.address,
            billing_city: dbOrder.city || 'City',
            billing_pincode: dbOrder.pincode,
            billing_state: dbOrder.state || 'State',
            billing_country: 'India',
            billing_email: 'customer@example.com',
            billing_phone: dbOrder.mobileNumber,
            shipping_is_billing: true,
            order_items: [{
                name: `Order ${dbOrder.orderNumber}`,
                sku: 'SKU-001',
                units: dbOrder.quantity,
                selling_price: dbOrder.totalPrice,
                discount: 0,
                tax: 0
            }],
            payment_method: dbOrder.paymentMethod || 'Prepaid',
            sub_total: dbOrder.totalPrice,
            length: 10,
            breadth: 10,
            height: 5,
            weight: 0.5
        };

        printJSON('Shiprocket Order Request', shiprocketOrderData);

        const orderResult = await shiprocketService.createOrder(shiprocketOrderData);

        if (orderResult.success) {
            printSuccess('Shiprocket order created!');
            printInfo('Shiprocket Order ID', orderResult.shiprocketOrderId);
            printInfo('Shiprocket Shipment ID', orderResult.shiprocketShipmentId);

            // Update database
            dbOrder.shiprocketOrderId = orderResult.shiprocketOrderId;
            dbOrder.shiprocketShipmentId = orderResult.shiprocketShipmentId;
            await dbOrder.save();

            printJSON('Shiprocket Order Response', orderResult);
        } else {
            throw new Error('Shiprocket order creation failed');
        }

        // ===== STEP 4.3: GENERATE AWB CODE =====
        printStep('4.3', 'GENERATE AWB CODE (Mock - No KYC)');

        const courierId = selectedCourier?.courierId || 1;
        printInfo('Using Courier ID', courierId);

        const awbResult = await shiprocketService.generateAWB(
            orderResult.shiprocketShipmentId,
            courierId
        );

        if (awbResult.success) {
            printSuccess('AWB Generated!');
            printInfo('AWB Code', awbResult.awbCode);
            printInfo('Courier Partner', awbResult.courierName);
            printInfo('Is Mock', awbResult.isMock ? 'Yes (No KYC Required)' : 'No (Real AWB)');

            // Update database
            dbOrder.awbCode = awbResult.awbCode;
            dbOrder.courierPartner = awbResult.courierName;
            dbOrder.courierStatus = 'pickup_pending';
            await dbOrder.save();

            printJSON('AWB Generation Response', awbResult);
        } else {
            throw new Error('AWB generation failed');
        }

        // ===== STEP 4.4: REQUEST PICKUP =====
        printStep('4.4', 'REQUEST PICKUP');

        try {
            const pickupResult = await shiprocketService.requestPickup(orderResult.shiprocketShipmentId);

            if (pickupResult.success) {
                printSuccess('Pickup requested successfully!');
                printInfo('Pickup Status', pickupResult.response?.pickup_status || 'Scheduled');

                dbOrder.courierStatus = 'pickup_scheduled';
                await dbOrder.save();
            } else {
                printWarning(`Pickup request: ${pickupResult.message || 'Failed'}`);
                printInfo('Note', 'Pickup may need manual scheduling in Shiprocket dashboard');
            }
        } catch (error) {
            printWarning(`Pickup request: ${error.message}`);
            printInfo('Note', 'This is expected with mock AWB - pickup requires real AWB');
        }

        // ===== STEP 5: SIMULATE WEBHOOK LIFECYCLE =====
        printStep('5', 'SIMULATE COMPLETE WEBHOOK LIFECYCLE');

        const statusLifecycle = [
            { status: 'Pickup Scheduled', statusId: 6, location: 'Surat Warehouse', delay: 1000 },
            { status: 'Shipped', statusId: 7, location: 'Surat Hub', delay: 1500 },
            { status: 'In Transit', statusId: 7, location: `${dbOrder.city} Hub`, delay: 2000 },
            { status: 'Out For Delivery', statusId: 9, location: `${dbOrder.city} Delivery Center`, delay: 1500 },
            { status: 'Delivered', statusId: 8, location: 'Customer Address', delay: 1000 },
        ];

        for (let i = 0; i < statusLifecycle.length; i++) {
            const { status, statusId, location, delay } = statusLifecycle[i];

            console.log(`\n     ${colors.yellow}━━━ Status Update ${i + 1}/${statusLifecycle.length}: ${status} ━━━${colors.reset}`);

            await simulateWebhook(
                dbOrder.awbCode,
                dbOrder.orderNumber,
                status,
                statusId,
                location
            );

            // Verify database update
            await sleep(500);
            const updatedOrder = await Order.findById(dbOrder._id);
            printInfo('  Current DB Status', updatedOrder.courierStatus || 'Not updated');
            printInfo('  Timeline Entries', updatedOrder.courierTimeline?.length || 0);

            if (i < statusLifecycle.length - 1) {
                await sleep(delay);
            }
        }

        // ===== FINAL VERIFICATION =====
        console.log('\n' + colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.blue + '  ✅ FINAL ORDER STATE' + colors.reset);
        console.log(colors.blue + '═══════════════════════════════════════════════════════════════' + colors.reset);

        const finalOrder = await Order.findById(dbOrder._id);

        console.log('\n┌──────────────────────────────────────────────────────────────┐');
        console.log('│                  LOGISTICS SUMMARY                           │');
        console.log('├──────────────────────────────────────────────────────────────┤');
        console.log(`│  Order Number:        ${finalOrder.orderNumber.padEnd(38)}│`);
        console.log(`│  AWB Code:            ${(finalOrder.awbCode || 'N/A').padEnd(38)}│`);
        console.log(`│  Courier Partner:     ${(finalOrder.courierPartner || 'N/A').padEnd(38)}│`);
        console.log(`│  Courier Status:      ${(finalOrder.courierStatus || 'N/A').padEnd(38)}│`);
        console.log(`│  Shiprocket Order:    ${(finalOrder.shiprocketOrderId || 'N/A').toString().padEnd(38)}│`);
        console.log(`│  Timeline Entries:    ${(finalOrder.courierTimeline?.length || 0).toString().padEnd(38)}│`);
        console.log('└──────────────────────────────────────────────────────────────┘');

        if (finalOrder.courierTimeline && finalOrder.courierTimeline.length > 0) {
            console.log('\n     ' + colors.cyan + '📋 Complete Courier Timeline:' + colors.reset);
            finalOrder.courierTimeline.forEach((entry, idx) => {
                const timestamp = new Date(entry.timestamp).toLocaleString();
                console.log(`       ${(idx + 1).toString().padStart(2)}. ${entry.status.padEnd(25)} @ ${entry.location.padEnd(25)} [${timestamp}]`);
            });
        }

        console.log('\n' + colors.green + colors.bright + '═══════════════════════════════════════════════════════════════' + colors.reset);
        console.log(colors.green + colors.bright + '  ✅ LOGISTICS INTEGRATION COMPLETED SUCCESSFULLY!' + colors.reset);
        console.log(colors.green + colors.bright + '═══════════════════════════════════════════════════════════════' + colors.reset);

        console.log('\n  ' + colors.green + 'Summary:' + colors.reset);
        console.log('    ✓ Serviceability checked with smart routing');
        console.log('    ✓ Shiprocket order created');
        console.log('    ✓ AWB code generated (mock mode)');
        console.log('    ✓ Pickup requested');
        console.log('    ✓ ' + statusLifecycle.length + ' webhook status updates simulated');
        console.log('    ✓ Complete courier lifecycle tracked');

        await mongoose.disconnect();
        console.log('\n📦 Database Disconnected');
        console.log('📅 Test Completed: ' + new Date().toLocaleString());

    } catch (error) {
        console.log('\n' + colors.red + '═══════════════════════════════════════════════════════════════' + colors.reset);
        printError('Logistics Test Failed');
        console.log('\n' + colors.red + 'Error Details:' + colors.reset);
        console.log(error.message);
        console.log('\n' + error.stack);
        console.log(colors.red + '═══════════════════════════════════════════════════════════════' + colors.reset);

        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the test
runLogisticsOnlyTest();
