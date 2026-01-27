/**
 * Test Courier Integration Script
 * 
 * Tests all courier integration endpoints:
 * 1. Authentication with Shiprocket
 * 2. Serviceability check
 * 3. Best courier selection
 * 4. Pickup locations
 * 5. Webhook endpoint
 * 
 * Run: node src/scripts/test-courier-integration.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '../../.env') });

// Direct import of ShiprocketService for testing
import shiprocketService from '../services/courier/ShiprocketService.js';
import LogisticsProvider from '../models/LogisticsProvider.js';

// Re-initialize credentials because ESM import hoisting causes service to load before dotenv
if (shiprocketService) {
    shiprocketService.email = (process.env.SHIPROCKET_EMAIL || '').replace(/['"]/g, '').trim();
    shiprocketService.password = (process.env.SHIPROCKET_API || '').replace(/['"]/g, '').trim();
    console.log('Credentials reloaded from .env');
}

const BASE_URL = 'http://localhost:5001/api';

// Test configuration
const TEST_CONFIG = {
    pickupPincode: '395006',      // Surat (origin)
    deliveryPincode: '400001',    // Mumbai (destination)
    rajasthanPincode: '302001',   // Jaipur, Rajasthan
    weight: 0.5,
    paymentMode: 'PREPAID'
};

// Color console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
    console.log('\n' + '='.repeat(60));
    log(`  ${title}`, 'cyan');
    console.log('='.repeat(60) + '\n');
}

/**
 * Test 1: Direct Shiprocket Authentication
 */
async function testShiprocketAuth() {
    section('TEST 1: Shiprocket Authentication');

    try {
        log('Testing direct authentication with Shiprocket API...', 'yellow');
        log(`Email: ${process.env.SHIPROCKET_EMAIL}`, 'blue');

        const token = await shiprocketService.authenticate();

        if (token) {
            log('✅ Authentication successful!', 'green');
            log(`Token (first 50 chars): ${token.substring(0, 50)}...`, 'blue');
            return { success: true, token };
        } else {
            log('❌ Authentication failed - no token received', 'red');
            return { success: false };
        }
    } catch (error) {
        log(`❌ Authentication failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 2: Serviceability Check via API
 */
async function testServiceabilityAPI() {
    section('TEST 2: Serviceability Check (API Endpoint)');

    try {
        log(`Testing serviceability: ${TEST_CONFIG.pickupPincode} → ${TEST_CONFIG.deliveryPincode}`, 'yellow');

        const response = await axios.post(`${BASE_URL}/courier/check-serviceability`, {
            pickupPincode: TEST_CONFIG.pickupPincode,
            deliveryPincode: TEST_CONFIG.deliveryPincode,
            weight: TEST_CONFIG.weight,
            paymentMode: TEST_CONFIG.paymentMode
        });

        if (response.data.success && response.data.available) {
            log('✅ Serviceability check passed!', 'green');
            log(`Available couriers: ${response.data.couriers?.length || 0}`, 'blue');

            if (response.data.recommendedCourier) {
                log('\nRecommended Courier:', 'cyan');
                log(`  Name: ${response.data.recommendedCourier.courierName}`, 'blue');
                log(`  Estimated Days: ${response.data.recommendedCourier.estimatedDays}`, 'blue');
                log(`  Rate: ₹${response.data.recommendedCourier.rate}`, 'blue');
            }

            return { success: true, data: response.data };
        } else {
            log(`⚠️ Route not serviceable: ${response.data.message || 'Unknown reason'}`, 'yellow');
            return { success: true, available: false, data: response.data };
        }
    } catch (error) {
        log(`❌ Serviceability check failed: ${error.response?.data?.error || error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 3: Direct Serviceability Check
 */
async function testServiceabilityDirect() {
    section('TEST 3: Serviceability Check (Direct Service)');

    try {
        log(`Testing direct serviceability check...`, 'yellow');

        const result = await shiprocketService.checkServiceability(
            TEST_CONFIG.pickupPincode,
            TEST_CONFIG.deliveryPincode,
            TEST_CONFIG.weight,
            TEST_CONFIG.paymentMode
        );

        if (result.available) {
            log('✅ Direct serviceability check passed!', 'green');
            log(`Total couriers available: ${result.couriers.length}`, 'blue');

            log('\nAll available couriers:', 'cyan');
            result.couriers.slice(0, 5).forEach((c, i) => {
                log(`  ${i + 1}. ${c.courierName} - ${c.estimatedDays} days - ₹${c.rate}`, 'blue');
            });

            return { success: true, data: result };
        } else {
            log('⚠️ Route not serviceable', 'yellow');
            return { success: true, available: false };
        }
    } catch (error) {
        log(`❌ Direct serviceability check failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 4: Best Courier Selection
 */
async function testBestCourierSelection() {
    section('TEST 4: Best Courier Selection (Smart Routing)');

    try {
        log(`Testing best courier selection for pincode: ${TEST_CONFIG.deliveryPincode}`, 'yellow');

        const response = await axios.post(`${BASE_URL}/courier/select-best`, {
            deliveryPincode: TEST_CONFIG.deliveryPincode,
            pickupPincode: TEST_CONFIG.pickupPincode,
            weight: TEST_CONFIG.weight,
            paymentMode: TEST_CONFIG.paymentMode
        });

        if (response.data.success) {
            log('✅ Best courier selection passed!', 'green');
            log(`Provider: ${response.data.provider}`, 'blue');
            log(`Provider Name: ${response.data.providerName}`, 'blue');
            log(`Estimated Days: ${response.data.estimatedDays}`, 'blue');

            if (response.data.recommendedCourier) {
                log(`Rate: ₹${response.data.recommendedCourier.rate}`, 'blue');
            }

            return { success: true, data: response.data };
        } else {
            log(`⚠️ No courier available: ${response.data.error}`, 'yellow');
            return { success: false, data: response.data };
        }
    } catch (error) {
        log(`❌ Best courier selection failed: ${error.response?.data?.error || error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 5: Multiple Pincode Serviceability
 */
async function testMultiplePincodes() {
    section('TEST 5: Multiple Pincode Serviceability');

    const testPincodes = [
        { name: 'Mumbai', pincode: '400001' },
        { name: 'Delhi', pincode: '110001' },
        { name: 'Jaipur', pincode: '302001' },
        { name: 'Bangalore', pincode: '560001' },
        { name: 'Chennai', pincode: '600001' },
        { name: 'Kolkata', pincode: '700001' }
    ];

    const results = [];

    for (const dest of testPincodes) {
        try {
            const result = await shiprocketService.checkServiceability(
                TEST_CONFIG.pickupPincode,
                dest.pincode,
                TEST_CONFIG.weight
            );

            const status = result.available ? '✅' : '❌';
            const info = result.available
                ? `${result.couriers.length} couriers, fastest: ${result.recommendedCourier?.estimatedDays} days`
                : 'Not serviceable';

            log(`  ${status} ${dest.name} (${dest.pincode}): ${info}`, result.available ? 'green' : 'red');
            results.push({ ...dest, available: result.available });
        } catch (error) {
            log(`  ❌ ${dest.name} (${dest.pincode}): Error - ${error.message}`, 'red');
            results.push({ ...dest, available: false, error: error.message });
        }
    }

    const successCount = results.filter(r => r.available).length;
    log(`\nSummary: ${successCount}/${testPincodes.length} destinations serviceable`, 'cyan');

    return { success: true, results };
}

/**
 * Test 6: Pickup Locations
 */
async function testPickupLocations() {
    section('TEST 6: Pickup Locations');

    try {
        log('Fetching pickup locations from Shiprocket...', 'yellow');

        const result = await shiprocketService.getPickupLocations();

        if (result.success && result.locations?.length > 0) {
            log(`✅ Found ${result.locations.length} pickup location(s)`, 'green');

            result.locations.forEach((loc, i) => {
                log(`\n  Location ${i + 1}:`, 'cyan');
                log(`    Name: ${loc.name}`, 'blue');
                log(`    Address: ${loc.address}`, 'blue');
                log(`    City: ${loc.city}`, 'blue');
                log(`    Pincode: ${loc.pincode}`, 'blue');
                log(`    Primary: ${loc.isPrimary ? 'Yes' : 'No'}`, 'blue');
            });

            return { success: true, data: result };
        } else {
            log('⚠️ No pickup locations found', 'yellow');
            return { success: true, locations: [] };
        }
    } catch (error) {
        log(`❌ Pickup locations fetch failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 7: Webhook Endpoint
 */
async function testWebhookEndpoint() {
    section('TEST 7: Webhook Endpoint');

    try {
        log('Testing webhook endpoint with mock data...', 'yellow');

        // Mock Shiprocket webhook payload
        const mockWebhookPayload = {
            awb: 'TEST123456789',
            order_id: 'TEST-ORDER-001',
            current_status: 'In Transit',
            current_status_id: 6,
            location: 'Mumbai Hub',
            scans: [
                {
                    date: new Date().toISOString().split('T')[0],
                    time: '10:30',
                    activity: 'Shipment picked up',
                    location: 'Surat'
                }
            ]
        };

        const response = await axios.post(`${BASE_URL}/courier/webhook`, mockWebhookPayload);

        if (response.data.received) {
            log('✅ Webhook endpoint is working!', 'green');
            log(`Processed: ${response.data.processed}`, 'blue');
            if (!response.data.processed) {
                log(`Reason: ${response.data.reason || 'Order not found (expected for test)'}`, 'yellow');
            }
            return { success: true, data: response.data };
        } else {
            log('⚠️ Webhook responded but did not acknowledge', 'yellow');
            return { success: false, data: response.data };
        }
    } catch (error) {
        log(`❌ Webhook test failed: ${error.response?.data?.error || error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 8: Database Provider Check
 */
async function testDatabaseProviders() {
    section('TEST 8: Database Provider Check');

    try {
        log('Connecting to MongoDB...', 'yellow');
        await mongoose.connect(process.env.MONGO_TEST_URI);
        log('✅ MongoDB connected', 'green');

        const providers = await LogisticsProvider.find({});

        if (providers.length > 0) {
            log(`✅ Found ${providers.length} logistics provider(s)`, 'green');

            providers.forEach(p => {
                const status = p.isActive ? '✅' : '❌';
                log(`\n  ${status} ${p.displayName || p.name}`, 'cyan');
                log(`    Type: ${p.type}`, 'blue');
                log(`    Priority: ${p.priority}`, 'blue');
                log(`    COD Support: ${p.supportsCOD ? 'Yes' : 'No'}`, 'blue');
                log(`    Sync Status: ${p.syncStatus}`, 'blue');
            });

            return { success: true, providers };
        } else {
            log('⚠️ No providers found in database', 'yellow');
            log('Run: node src/scripts/seed-shiprocket-provider.js', 'yellow');
            return { success: false, message: 'No providers' };
        }
    } catch (error) {
        log(`❌ Database check failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Test 9: Test Webhook Endpoint (Debug)
 */
async function testWebhookDebug() {
    section('TEST 9: Webhook Debug Endpoint');

    try {
        log('Testing debug webhook endpoint...', 'yellow');

        const response = await axios.post(`${BASE_URL}/courier/webhook-test`, {
            test: true,
            message: 'Integration test'
        });

        if (response.data.received) {
            log('✅ Debug webhook endpoint is working!', 'green');
            log(`Timestamp: ${response.data.timestamp}`, 'blue');
            return { success: true };
        }

        return { success: false };
    } catch (error) {
        log(`❌ Debug webhook test failed: ${error.message}`, 'red');
        return { success: false, error: error.message };
    }
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║       COURIER INTEGRATION TEST SUITE                      ║', 'cyan');
    log('║       Testing Shiprocket + Internal Logistics             ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

    log(`\nServer URL: ${BASE_URL}`, 'blue');
    log(`Pickup Pincode: ${TEST_CONFIG.pickupPincode}`, 'blue');
    log(`Test Delivery Pincode: ${TEST_CONFIG.deliveryPincode}`, 'blue');

    const results = {};

    try {
        // Test 1: Auth
        results.auth = await testShiprocketAuth();

        // Test 2: API Serviceability
        results.serviceabilityAPI = await testServiceabilityAPI();

        // Test 3: Direct Serviceability
        results.serviceabilityDirect = await testServiceabilityDirect();

        // Test 4: Best Courier
        results.bestCourier = await testBestCourierSelection();

        // Test 5: Multiple Pincodes
        results.multiplePincodes = await testMultiplePincodes();

        // Test 6: Pickup Locations
        results.pickupLocations = await testPickupLocations();

        // Test 7: Webhook
        results.webhook = await testWebhookEndpoint();

        // Test 8: Database
        results.database = await testDatabaseProviders();

        // Test 9: Debug Webhook
        results.webhookDebug = await testWebhookDebug();

    } catch (error) {
        log(`\n❌ Test suite error: ${error.message}`, 'red');
    }

    // Summary
    section('TEST SUMMARY');

    const testNames = {
        auth: 'Shiprocket Authentication',
        serviceabilityAPI: 'Serviceability API',
        serviceabilityDirect: 'Serviceability Direct',
        bestCourier: 'Best Courier Selection',
        multiplePincodes: 'Multiple Pincodes',
        pickupLocations: 'Pickup Locations',
        webhook: 'Webhook Endpoint',
        database: 'Database Providers',
        webhookDebug: 'Debug Webhook'
    };

    let passed = 0;
    let failed = 0;

    for (const [key, name] of Object.entries(testNames)) {
        const result = results[key];
        if (result?.success) {
            log(`  ✅ ${name}`, 'green');
            passed++;
        } else {
            log(`  ❌ ${name}: ${result?.error || 'Failed'}`, 'red');
            failed++;
        }
    }

    console.log('\n' + '-'.repeat(60));
    log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`, passed === passed + failed ? 'green' : 'yellow');
    console.log('-'.repeat(60) + '\n');

    // Overall result
    if (failed === 0) {
        log('🎉 All courier integration tests passed!', 'green');
        log('✅ Ready for client integration', 'green');
    } else {
        log(`⚠️ ${failed} test(s) failed. Please review and fix issues.`, 'yellow');
    }

    // Cleanup
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        log('\n📦 MongoDB disconnected', 'blue');
    }

    return results;
}

// Run tests
runAllTests()
    .then((results) => {
        const allPassed = Object.values(results).every(r => r?.success);
        process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
