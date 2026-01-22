// cleanupDuplicateGeoZones.js
// Run with: node scripts/cleanupDuplicateGeoZones.js

import mongoose from 'mongoose';
import GeoZone from '../src/models/GeoZon.js';

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/price', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        const duplicates = await GeoZone.aggregate([
            { $group: { _id: { $toLower: '$name' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
        ]);

        if (duplicates.length === 0) {
            console.log('No duplicate Geo Zone names found');
            process.exit(0);
        }

        for (const dup of duplicates) {
            console.log('Duplicate name:', dup._id, 'IDs:', dup.ids);
            const [keep, ...remove] = dup.ids;
            await GeoZone.deleteMany({ _id: { $in: remove } });
            console.log(`Removed ${remove.length} duplicate(s), kept ${keep}`);
        }
        console.log('Cleanup completed');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
};

run();
