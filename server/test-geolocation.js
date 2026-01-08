import GeolocationService from './src/services/GeolocationService.js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('🧪 Testing Geolocation Service\n');

async function testGeolocation() {
    try {
        // Check if API key is loaded
        if (!process.env.GCP_GEOLOCATION_API_KEY) {
            console.error('❌ GCP_GEOLOCATION_API_KEY not found in .env file');
            console.log('\n📝 Please add the following to your .env file:');
            console.log('GCP_GEOLOCATION_API_KEY=AIzaSyDF-LquikP14aeKWamhmHB_FXwx1WreWMY\n');
            return;
        }

        console.log('✅ API Key loaded\n');

        // Test 1: Reverse geocoding with known coordinates (Delhi)
        console.log('Test 1: Reverse Geocoding (Delhi coordinates)');
        console.log('-----------------------------------------------');
        const lat = 28.6139;
        const lng = 77.2090;

        try {
            const result = await GeolocationService.reverseGeocode(lat, lng);
            console.log('✅ Success!');
            console.log(`   City: ${result.city}`);
            console.log(`   State: ${result.state}`);
            console.log(`   Pincode: ${result.pincode}`);
            console.log(`   Country: ${result.country}`);
            console.log(`   Address: ${result.formattedAddress}\n`);
        } catch (error) {
            console.error('❌ Failed:', error.message);
            console.log('   This might be due to:');
            console.log('   - Invalid API key');
            console.log('   - API not enabled');
            console.log('   - Network issues\n');
        }

        // Test 2: GPS to Pincode (Mumbai)
        console.log('Test 2: GPS to Pincode (Mumbai)');
        console.log('--------------------------------');
        try {
            const mumbaiResult = await GeolocationService.getPincodeFromGPS(19.0760, 72.8777);
            console.log('✅ Success!');
            console.log(`   City: ${mumbaiResult.city}`);
            console.log(`   Pincode: ${mumbaiResult.pincode}\n`);
        } catch (error) {
            console.error('❌ Failed:', error.message, '\n');
        }

        // Test 3: Cache test
        console.log('Test 3: Testing Cache');
        console.log('---------------------');
        console.log('Making same request twice to test caching...');

        const start1 = Date.now();
        await GeolocationService.reverseGeocode(28.6139, 77.2090);
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        await GeolocationService.reverseGeocode(28.6139, 77.2090);
        const time2 = Date.now() - start2;

        console.log(`   First request: ${time1}ms`);
        console.log(`   Second request: ${time2}ms`);
        console.log(`   ${time2 < time1 ? '✅ Cache working!' : '⚠️ Cache might not be working'}\n`);

        console.log('🎉 All tests completed!\n');
        console.log('Next steps:');
        console.log('1. Start your server: npm start');
        console.log('2. Test the API endpoints using curl or Postman');
        console.log('3. Integrate with your frontend components\n');

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

testGeolocation();
