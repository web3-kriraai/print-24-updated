import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function inspectWestIndia() {
    try {
        await mongoose.connect(MONGO_URI);

        const GeoZone = mongoose.model('GeoZone', new mongoose.Schema({}, { strict: false }));
        const zone = await GeoZone.findOne({ name: 'West India' });

        if (zone) {
            console.log('GeoZone West India Found:');
            console.log(JSON.stringify(zone, null, 2));
        } else {
            console.log('GeoZone West India not found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

inspectWestIndia();
