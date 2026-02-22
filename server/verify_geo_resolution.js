import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GeoZone from './src/models/GeoZon.js';
import GeoZoneMapping from './src/models/GeoZon.js'; // Mapping is usually in the same file or registered

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function verify() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const testPincodes = ['395004', '450001', '110001'];

        for (const pincode of testPincodes) {
            console.log(`\nTesting Pincode: ${pincode}`);

            let resolvedPickupPincode = process.env.PICKUP_PINCODE || '395004';
            let resolvedWarehouseName = 'Primary';

            try {
                const resolvedZone = await GeoZone.resolveByPincode(pincode);
                if (resolvedZone) {
                    console.log(`- Resolved Zone: ${resolvedZone.name} (Level: ${resolvedZone.level})`);
                    if (resolvedZone.warehousePincode) {
                        resolvedPickupPincode = resolvedZone.warehousePincode;
                        resolvedWarehouseName = resolvedZone.warehouseName || 'Primary';
                        console.log(`- ✅ Warehouse Found: ${resolvedWarehouseName} (${resolvedPickupPincode})`);
                    } else {
                        console.log(`- ℹ️ Zone found but no warehouse defined, using default.`);
                    }
                } else {
                    console.log(`- ❌ No zone resolved, using default.`);
                }
            } catch (err) {
                console.error(`- ❌ Error resolving: ${err.message}`);
            }

            console.log(`- Final Association -> Name: ${resolvedWarehouseName}, Pincode: ${resolvedPickupPincode}`);
        }

    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
