import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GeoZoneHierarchyService from '../src/services/GeoZoneHierarchyService.js';
import GeoZoneMapping from '../src/models/GeoZonMapping.js';
import GeoZone from '../src/models/GeoZon.js';

dotenv.config();

/**
 * Debug Geo Hierarchy Resolution
 * Usage: node server/scripts/debug-geo-hierarchy.js <PINCODE>
 */
async function debugGeoHierarchy() {
    const args = process.argv.slice(2);
    const pincode = args[0] ? parseInt(args[0]) : 395007; // Default to Surat

    console.log(`\n🔍 Debugging Geo Hierarchy for Pincode: ${pincode}`);
    console.log('='.repeat(50));

    try {
        console.log('🔌 Connecting to MongoDB...');
        const uri = process.env.MONGO_TEST_URI || process.env.MONGO_URI_PRICING || process.env.MONGO_URI;
        if (!uri) throw new Error('No MongoDB URI found in environment variables (checked MONGO_TEST_URI, MONGO_URI_PRICING, MONGO_URI)');

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB\n');

        // 1. Check raw mappings
        console.log('📋 Checking Raw Mappings...');
        const mappings = await GeoZoneMapping.find({
            pincodeStart: { $lte: pincode },
            pincodeEnd: { $gte: pincode }
        }).populate('geoZone').lean();

        console.log(`Found ${mappings.length} raw mappings:`);
        mappings.forEach(m => {
            if (m.geoZone) {
                const rangeSize = m.pincodeEnd - m.pincodeStart + 1;
                console.log(`   - [${m.geoZone.level}] ${m.geoZone.name} (Priority: ${m.geoZone.priority || 0})`);
                console.log(`     Range: ${m.pincodeStart} - ${m.pincodeEnd} (Size: ${rangeSize})`);
            } else {
                console.log(`   - [ORPHAN] Mapping without GeoZone: ${m.pincodeStart}-${m.pincodeEnd}`);
            }
        });

        // 2. Run Service Resolution
        console.log('\n🚀 Running GeoZoneHierarchyService.resolveZoneHierarchy()...');
        const hierarchy = await GeoZoneHierarchyService.resolveZoneHierarchy(pincode);

        console.log('\n✅ Final Resolved Hierarchy (Specific -> General):');
        hierarchy.forEach((zone, index) => {
            console.log(`   ${index + 1}. ${zone.name} (${zone.level})`);
            console.log(`      ID: ${zone._id}`);
            console.log(`      Priority: ${zone.priority || 0}`);
            console.log(`      Range Size: ${zone._rangeSize}`);
        });

        // 3. Highlight potential issues
        if (hierarchy.length > 1) {
            const first = hierarchy[0];
            const second = hierarchy[1];

            // Hardcoded priority map to avoid static property access issues
            const levels = { 'ZIP': 1, 'CITY': 2, 'DISTRICT': 3, 'STATE': 4, 'UT': 4, 'REGION': 5, 'COUNTRY': 6, 'ZONE': 7 };

            const p1 = levels[first.level] || 99;
            const p2 = levels[second.level] || 99;

            if (p1 > p2) {
                console.log('\n⚠️  WARNING: First item has lower level-priority (less specific) than second item!');
                console.log(`   ${first.level} (${p1}) vs ${second.level} (${p2})`);
            } else if (p1 === p2) {
                // Check range size
                if ((first._rangeSize || 999999) > (second._rangeSize || 999999)) {
                    console.log('\n⚠️  WARNING: First item has larger range size (less specific) than second item!');
                    console.log(`   ${first._rangeSize} vs ${second._rangeSize}`);
                }
            }
        }

        // 4. Check for potentially missing zones (Gujarat, India)
        console.log('\n🔍 Checking for expected zones (Gujarat, India) to see why they were missed...');
        const expectedNames = ['Gujarat', 'India'];
        for (const name of expectedNames) {
            const zone = await GeoZone.findOne({ name: new RegExp(name, 'i') }).lean();
            if (zone) {
                console.log(`\n   Found Zone: ${zone.name} (${zone.level}) - ID: ${zone._id}`);
                // Check if it should have matched
                const mapping = await GeoZoneMapping.findOne({
                    geoZone: zone._id,
                    pincodeStart: { $lte: pincode },
                    pincodeEnd: { $gte: pincode }
                });

                if (mapping) {
                    console.log(`   ✅ Mapping EXISTS for ${pincode}: ${mapping.pincodeStart}-${mapping.pincodeEnd}`);
                    console.log(`   ❓ Why was it not returned in the original query? (Maybe active status?)`);
                } else {
                    console.log(`   ❌ Mapping MISSING or out of range for ${pincode}`);
                    // Find nearest mapping
                    const nearest = await GeoZoneMapping.findOne({ geoZone: zone._id }).sort({ pincodeStart: 1 }).lean();
                    if (nearest) console.log(`      Sample valid range: ${nearest.pincodeStart}-${nearest.pincodeEnd}`);
                }
            } else {
                console.log(`\n   ❌ Zone '${name}' not found in DB`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected');
    }
}

debugGeoHierarchy();
