import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GeoZone from '../src/models/GeoZon.js';
import GeoZoneMapping from '../src/models/GeoZonMapping.js';

dotenv.config();

/**
 * Seed Geo Locations
 * Reads server/data/india-locations-with-districts.json and populates Mongo
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedGeoLocations() {
    console.log('🌱 Starting Geo Location Seeding...');

    try {
        const uri = process.env.MONGO_TEST_URI || process.env.MONGO_URI_PRICING || process.env.MONGO_URI;
        if (!uri) throw new Error('No MongoDB URI found');

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Load JSON data
        const jsonPath = path.join(__dirname, '../data/india-locations-with-districts.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`Data file not found at ${jsonPath}. Run process-pincode-data-with-districts.js first.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(rawData);

        console.log(`📊 Loaded data: ${data.states.length} States, ${data.unionTerritories.length} UTs, ${data.districts.length} Districts`);

        // 1. Ensure Country exists
        let country = await GeoZone.findOne({ level: 'COUNTRY', code: 'IN' });
        if (!country) {
            country = await GeoZone.create({
                name: 'India',
                code: 'IN',
                level: 'COUNTRY',
                currency: 'INR',
                isActive: true
            });
            console.log('✅ Created Country: India');
        } else {
            console.log('✅ Country India exists');
        }

        // 2. Fix Regions (West India etc)
        // We will just update them to have level REGION if they exist
        const regions = ['West India', 'North India', 'South India', 'East India', 'Central India', 'North East India'];
        for (const rName of regions) {
            const r = await GeoZone.findOne({ name: rName });
            if (r && !r.level) {
                r.level = 'REGION';
                r.parentZone = country._id;
                await r.save();
                console.log(`🔧 Fixed Region level for: ${rName}`);
            }
        }

        // 3. Seed States/UTs
        const stateMap = new Map(); // name -> ID

        const allStates = [...data.states, ...data.unionTerritories];

        for (const s of allStates) {
            let zone = await GeoZone.findOne({ name: s.name, level: s.level });

            if (!zone) {
                // Try finding by code
                zone = await GeoZone.findOne({ code: s.code, level: s.level });
            }

            if (!zone) {
                zone = await GeoZone.create({
                    name: s.name,
                    code: s.code,
                    level: s.level,
                    parentZone: country._id,
                    isActive: true
                });
                console.log(`   ➕ Created State/UT: ${s.name}`);
            } else {
                // Update parent if missing
                if (!zone.parentZone) {
                    zone.parentZone = country._id;
                    await zone.save();
                }
            }
            stateMap.set(s.name, zone._id);
            stateMap.set(s.code, zone._id); // Map code too

            // Mappings for State
            await updateMappings(zone._id, s.pincodeRanges);
        }

        // 4. Seed Districts
        for (const d of data.districts) {
            const parentId = stateMap.get(d.stateName);
            if (!parentId) {
                console.warn(`⚠️  Parent state ${d.stateName} not found for district ${d.name}`);
                continue;
            }

            let zone = await GeoZone.findOne({ name: d.name, level: 'DISTRICT', parentZone: parentId });

            if (!zone) {
                zone = await GeoZone.create({
                    name: d.name,
                    code: d.code,
                    level: 'DISTRICT',
                    parentZone: parentId,
                    isActive: true
                });
                // console.log(`   ➕ Created District: ${d.name}`);
            }

            // Mappings for District
            await updateMappings(zone._id, d.pincodeRanges);
        }

        console.log('✅ Seeding Complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

async function updateMappings(zoneId, ranges) {
    // Clear existing? No, maybe merge.
    // For now, simpler to delete existing mappings for this zone and re-insert
    // BUT checking logic is safer.

    // Efficiency: Delete all mappings for this zone and recreate
    await GeoZoneMapping.deleteMany({ geoZone: zoneId });

    const docs = ranges.map(r => ({
        geoZone: zoneId,
        pincodeStart: r.start,
        pincodeEnd: r.end,
        country: 'IN'
    }));

    if (docs.length > 0) {
        await GeoZoneMapping.insertMany(docs);
    }
}

seedGeoLocations();
