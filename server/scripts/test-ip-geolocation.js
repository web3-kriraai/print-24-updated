import GeolocationService from '../src/services/GeolocationService.js';
import geoip from 'geoip-lite';

// Mock IPs for testing - Testing various Indian regions
const TEST_IPS = {
    'INDIA_JAIPUR_2': '49.36.243.0',         // Jio IP likely Rajasthan
    'INDIA_AHMEDABAD': '103.27.86.1',        // Gujarat IP
    'INDIA_CHENNAI': '122.165.2.1',          // Chennai IP
    'INDIA_DELHI': '103.240.239.1',          // Delhi IP
    'INDIA_KOLKATA': '103.89.8.1',           // Kolkata IP
    'LOCALHOST': '127.0.0.1'
};

async function testGeolocation() {
    console.log('🚀 Starting IP Geolocation Tests...\n');

    for (const [label, ip] of Object.entries(TEST_IPS)) {
        console.log(`----------------------------------------`);
        console.log(`Checking IP: ${ip} (${label})`);

        // Show raw geoip data first
        const rawGeo = geoip.lookup(ip);
        console.log('Raw geoip data:', rawGeo ? JSON.stringify(rawGeo, null, 2) : 'null (localhost or not found)');

        try {
            const result = await GeolocationService.getPincodeFromIP(ip);

            console.log('Final Result:', JSON.stringify(result, null, 2));

            // Verification Logic
            if (label.startsWith('US_')) {
                if (result.country === 'India' || result.pincode === '395006') {
                    console.error('❌ FAILURE: US IP resolved to India/Default!');
                } else {
                    console.log('✅ SUCCESS: US IP did not resolve to India.');
                    if (result.pincode) {
                        console.log('✅ Pincode detected:', result.pincode);
                    }
                }
            } else if (label.startsWith('INDIA_')) {
                if (result.country === 'India') {
                    console.log('✅ SUCCESS: India IP resolved to India.');
                    if (result.pincode) {
                        console.log('✅ Pincode detected:', result.pincode);
                    }
                }
            }

        } catch (error) {
            console.error(`ERROR processing ${ip}:`, error);
        }
        console.log(`----------------------------------------\n`);
    }
}

testGeolocation();
