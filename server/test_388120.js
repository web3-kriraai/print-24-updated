import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GeoZone from './src/models/GeoZon.js';
import GeoZoneMapping from './src/models/GeoZonMapping.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function testResolution() {
    try {
        await mongoose.connect(MONGO_URI);

        const pincode = '388120';
        console.log(`Resolving pincode: ${pincode}`);

        const resolvedZone = await GeoZone.resolveByPincode(pincode);
        if (resolvedZone) {
            console.log('Resolved Zone:');
            console.log(JSON.stringify(resolvedZone, null, 2));
        } else {
            console.log('No zone resolved.');
        }

        // Also check Generic mappings for this pincode
        const GeoZoneMapping = mongoose.model('GeoZoneMapping');
        const mapping = await GeoZoneMapping.findOne({
            $or: [
                { zipCode: pincode },
                {
                    pincodeStart: { $lte: Number(pincode) || 0 },
                    pincodeEnd: { $gte: Number(pincode) || 0 }
                }
            ]
        }).populate('geoZone');

        if (mapping) {
            console.log('\nMapping Found:');
            console.log(JSON.stringify(mapping, null, 2));
        } else {
            console.log('\nNo Mapping Found in GeoZoneMapping.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testResolution();
