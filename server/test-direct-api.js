import axios from 'axios';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.GCP_GEOLOCATION_API_KEY;

console.log('🧪 Direct API Test');
console.log('API Key:', API_KEY ? 'Loaded' : 'Missing');
console.log('');

async function testDirectAPI() {
    try {
        const lat = 28.6139;
        const lng = 77.2090;

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;

        console.log('Making request to:', url.substring(0, 80) + '...');

        const response = await axios.get(url, {
            timeout: 10000
        });

        console.log('\n✅ Response Status:', response.data.status);
        console.log('📊 Full Response:');
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0];
            const address = result.address_components;

            const pincode = address.find(c => c.types.includes('postal_code'))?.long_name;
            const city = address.find(c => c.types.includes('locality'))?.long_name;
            const state = address.find(c => c.types.includes('administrative_area_level_1'))?.long_name;

            console.log('\n📍 Extracted Data:');
            console.log('   Pincode:', pincode);
            console.log('   City:', city);
            console.log('   State:', state);
            console.log('   Full Address:', result.formatted_address);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
    }
}

testDirectAPI();
