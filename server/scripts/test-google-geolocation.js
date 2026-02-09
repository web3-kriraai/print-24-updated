/**
 * Google Geolocation API Test Script
 * 
 * Tests:
 * 1. IP to Pincode (Google Hybrid)
 * 2. GPS to Pincode (Google Geocoding)
 * 3. Cache functionality
 * 4. Fallback mechanisms
 * 5. Error handling
 */

import GeolocationService from '../src/services/GeolocationService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Google Geolocation API Test Suite\n');
console.log('='.repeat(60));

// Check configuration
console.log('\n📋 Configuration Check:');
console.log(`API Key: ${process.env.GCP_GEOLOCATION_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`USE_GOOGLE_GEOLOCATION: ${process.env.USE_GOOGLE_GEOLOCATION || 'true (default)'}`);
console.log('='.repeat(60));

// Test Cases
const tests = {
    // Test 1: IP to Pincode (Public IP)
    testIPToPincode: async () => {
        console.log('\n\n🧪 Test 1: IP to Pincode (Google Hybrid Method)');
        console.log('-'.repeat(60));

        const testIPs = [
            { ip: '157.51.112.34', description: 'Indian IP (Mumbai area)' },
            { ip: '8.8.8.8', description: 'Google DNS (US)' },
            { ip: '106.51.74.185', description: 'Indian IP' }
        ];

        for (const { ip, description } of testIPs) {
            console.log(`\n📍 Testing: ${ip} (${description})`);
            try {
                const result = await GeolocationService.getPincodeFromIP(ip);
                console.log('✅ Result:', JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('❌ Error:', error.message);
            }
        }
    },

    // Test 2: GPS Coordinates to Pincode
    testGPSToPincode: async () => {
        console.log('\n\n🧪 Test 2: GPS to Pincode (Google Geocoding)');
        console.log('-'.repeat(60));

        const testLocations = [
            { lat: 21.1702, lng: 72.8311, description: 'Surat, Gujarat' },
            { lat: 19.0760, lng: 72.8777, description: 'Mumbai, Maharashtra' },
            { lat: 28.6139, lng: 77.2090, description: 'Delhi' },
            { lat: 12.9716, lng: 77.5946, description: 'Bangalore, Karnataka' }
        ];

        for (const { lat, lng, description } of testLocations) {
            console.log(`\n📍 Testing: ${lat}, ${lng} (${description})`);
            try {
                const result = await GeolocationService.getPincodeFromGPS(lat, lng);
                console.log('✅ Result:', JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('❌ Error:', error.message);
            }
        }
    },

    // Test 3: Direct Google Reverse Geocoding
    testGoogleGeocoding: async () => {
        console.log('\n\n🧪 Test 3: Direct Google Geocoding API');
        console.log('-'.repeat(60));

        const testCoordinates = [
            { lat: 21.1702, lng: 72.8311, description: 'Surat' },
            { lat: 19.0760, lng: 72.8777, description: 'Mumbai' }
        ];

        for (const { lat, lng, description } of testCoordinates) {
            console.log(`\n📍 Testing: ${description} (${lat}, ${lng})`);
            try {
                const result = await GeolocationService.reverseGeocodeGoogle(lat, lng);
                if (result) {
                    console.log('✅ Result:', JSON.stringify(result, null, 2));
                } else {
                    console.log('⚠️ No result from Google API');
                }
            } catch (error) {
                console.error('❌ Error:', error.message);
            }
        }
    },

    // Test 4: Cache Functionality
    testCache: async () => {
        console.log('\n\n🧪 Test 4: Cache Functionality');
        console.log('-'.repeat(60));

        const lat = 21.1702;
        const lng = 72.8311;

        console.log('\n📍 First request (should call Google API):');
        const start1 = Date.now();
        const result1 = await GeolocationService.reverseGeocodeGoogle(lat, lng);
        const time1 = Date.now() - start1;
        console.log(`⏱️ Time: ${time1}ms`);
        console.log('Result:', result1);

        console.log('\n📍 Second request (should use cache):');
        const start2 = Date.now();
        const result2 = await GeolocationService.reverseGeocodeGoogle(lat, lng);
        const time2 = Date.now() - start2;
        console.log(`⏱️ Time: ${time2}ms`);
        console.log('Result:', result2);

        console.log(`\n${time2 < time1 ? '✅' : '❌'} Cache is ${time2 < time1 ? 'working' : 'NOT working'} (${time1}ms vs ${time2}ms)`);

        console.log('\n🗑️ Clearing cache...');
        GeolocationService.clearCache();

        console.log('\n📍 Third request (should call Google API again):');
        const start3 = Date.now();
        const result3 = await GeolocationService.reverseGeocodeGoogle(lat, lng);
        const time3 = Date.now() - start3;
        console.log(`⏱️ Time: ${time3}ms`);
        console.log(`${time3 > time2 ? '✅' : '❌'} Cache cleared successfully`);
    },

    // Test 5: Localhost Fallback
    testLocalhost: async () => {
        console.log('\n\n🧪 Test 5: Localhost Fallback');
        console.log('-'.repeat(60));

        const result = await GeolocationService.getPincodeFromIP('127.0.0.1');
        console.log('Result:', JSON.stringify(result, null, 2));
        console.log(`${result.source === 'default-fallback' ? '✅' : '❌'} Localhost fallback working`);
    },

    // Test 6: Comparison (Google vs Local)
    testComparison: async () => {
        console.log('\n\n🧪 Test 6: Accuracy Comparison (Google vs Local)');
        console.log('-'.repeat(60));

        const lat = 21.1702;
        const lng = 72.8311;

        console.log('\n📍 Testing coordinates:', lat, lng);

        // Google method
        console.log('\n🌍 Google Geocoding API:');
        const googleResult = await GeolocationService.reverseGeocodeGoogle(lat, lng);
        console.log('Pincode:', googleResult?.pincode);
        console.log('City:', googleResult?.city);
        console.log('Accuracy:', googleResult?.accuracy);

        // Local method
        console.log('\n💾 Local geoip-lite:');
        const localResult = GeolocationService.getCityFromCoordinates(lat, lng);
        console.log('Pincode:', localResult?.pincode);
        console.log('City:', localResult?.city);
        console.log('Accuracy: medium (bounding box)');

        console.log('\n📊 Comparison:');
        console.log(`Pincodes match: ${googleResult?.pincode === localResult?.pincode ? '✅ Yes' : '❌ No'}`);
        console.log(`Google pincode: ${googleResult?.pincode || 'N/A'}`);
        console.log(`Local pincode: ${localResult?.pincode || 'N/A'}`);
    }
};

// Run all tests
const runAllTests = async () => {
    try {
        await tests.testIPToPincode();
        await tests.testGPSToPincode();
        await tests.testGoogleGeocoding();
        await tests.testCache();
        await tests.testLocalhost();
        await tests.testComparison();

        console.log('\n\n' + '='.repeat(60));
        console.log('✅ All tests completed!');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
};

// Run tests
runAllTests();
