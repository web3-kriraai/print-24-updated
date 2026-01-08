/**
 * Quick test script to check GPS reverse geocoding
 * Run: node test-gps-pincode.js
 */

import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.GCP_GEOLOCATION_API_KEY;

async function testGPSReverse() {
    // Surat coordinates from user's log
    const lat = 21.1648512;
    const lng = 72.8498176;

    console.log(`🧪 Testing GPS Reverse Geocoding`);
    console.log(`📍 Coordinates: ${lat}, ${lng} (Surat)\n`);

    try {
        const params = new URLSearchParams({
            latlng: `${lat},${lng}`,
            key: API_KEY
        });

        const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

        const response = await fetch(url);
        const data = await response.json();

        console.log(`📊 API Response Status: ${data.status}\n`);

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            const components = result.address_components;

            // Extract pincode
            const pincodeComponent = components.find(c => c.types.includes('postal_code'));
            const cityComponent = components.find(c => c.types.includes('locality'));
            const stateComponent = components.find(c => c.types.includes('administrative_area_level_1'));

            console.log(`✅ Address: ${result.formatted_address}`);
            console.log(`\n🏙️ Components:`);
            console.log(`   Pincode: ${pincodeComponent?.long_name || 'NOT FOUND'}`);
            console.log(`   City: ${cityComponent?.long_name || 'NOT FOUND'}`);
            console.log(`   State: ${stateComponent?.long_name || 'NOT FOUND'}`);

            if (!pincodeComponent) {
                console.log(`\n⚠️ WARNING: No pincode found in reverse geocoding!`);
                console.log(`This is why your pricing might be using a fallback pincode.\n`);
                console.log(`All components found:`);
                components.forEach(c => {
                    console.log(`   - ${c.long_name} (${c.types.join(', ')})`);
                });
            }
        } else {
            console.log(`❌ Error: ${data.status}`);
            if (data.error_message) {
                console.log(`   ${data.error_message}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }
}

testGPSReverse();
