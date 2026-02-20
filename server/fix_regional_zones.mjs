import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

/**
 * Fix the 5 regional geo zones that have level: undefined and priority: undefined.
 * These zones were created without the hierarchical schema fields.
 * 
 * Zones to fix:
 * - North India → level: REGION, priority: 0
 * - South India → level: REGION, priority: 0
 * - East India → level: REGION, priority: 0
 * - West India → level: REGION, priority: 0
 * - Central India → level: REGION, priority: 0
 */
async function fixRegionalZones() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to:', MONGO_URI);

        const collection = mongoose.connection.db.collection('geozones');

        // Find zones with undefined level
        const zonesToFix = await collection.find({
            $or: [
                { level: { $exists: false } },
                { level: null },
            ]
        }).toArray();

        console.log(`\nFound ${zonesToFix.length} zones with undefined level:`);
        zonesToFix.forEach(z => console.log(`  - ${z.name} (id: ${z._id})`));

        if (zonesToFix.length === 0) {
            console.log('\n✅ No zones need fixing!');
            return;
        }

        // Update them to REGION level with priority 0
        const result = await collection.updateMany(
            {
                $or: [
                    { level: { $exists: false } },
                    { level: null },
                ]
            },
            {
                $set: {
                    level: 'REGION',
                    priority: 0,
                    zoneType: null, // REGION is not in the zoneType enum
                }
            }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} zones to level='REGION', priority=0`);

        // Verify
        const verified = await collection.find({
            name: { $in: zonesToFix.map(z => z.name) }
        }).toArray();

        console.log('\nVerification:');
        verified.forEach(z => {
            console.log(`  ${z.name} → level: ${z.level}, priority: ${z.priority}`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixRegionalZones();
