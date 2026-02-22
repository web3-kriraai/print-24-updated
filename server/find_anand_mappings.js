import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GeoZone from './src/models/GeoZon.js';
import GeoZoneMapping from './src/models/GeoZonMapping.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function findAnandMappings() {
    try {
        await mongoose.connect(MONGO_URI);

        const zone = await GeoZone.findOne({ name: 'ANAND' });
        if (!zone) {
            console.log('Zone ANAND not found.');
            return;
        }

        console.log(`Found Zone: ${zone.name} (${zone._id})`);

        const mappings = await GeoZoneMapping.find({ geoZone: zone._id });
        console.log(`Found ${mappings.length} mappings for ANAND:`);
        mappings.forEach(m => {
            console.log(`- Zip: ${m.zipCode || 'N/A'}, Range: ${m.pincodeStart} - ${m.pincodeEnd}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

findAnandMappings();
