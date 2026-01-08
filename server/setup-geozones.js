/**
 * Setup GeoZones and GeoZoneMappings for Location-Based Pricing
 * 
 * Run this script once to create geo zones for Indian cities
 * Usage: node setup-geozones.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Import models
const GeoZoneSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, uppercase: true },
    currency: { type: String, default: 'INR' },
    level: {
        type: String,
        enum: ['COUNTRY', 'STATE', 'DISTRICT', 'CITY', 'ZIP'],
        required: true
    },
    parentZone: { type: mongoose.Schema.Types.ObjectId, ref: 'GeoZone' },
    priority: Number,
    isRestricted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    deliveryDays: { type: Number, default: 3 }
}, { timestamps: true });

const GeoZoneMappingSchema = new mongoose.Schema({
    geoZone: { type: mongoose.Schema.Types.ObjectId, ref: 'GeoZone', required: true },
    countryCode: { type: String, uppercase: true, maxlength: 2 },
    zipCode: { type: String },
    pincodeStart: Number,
    pincodeEnd: Number,
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const GeoZone = mongoose.model('GeoZone', GeoZoneSchema);
const GeoZoneMapping = mongoose.model('GeoZoneMapping', GeoZoneMappingSchema);

/**
 * Main setup function
 */
async function setupGeoZones() {
    try {
        console.log('🌍 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Clear existing data (optional - comment if you want to keep existing)
        console.log('🗑️ Clearing existing geo zones...');
        await GeoZone.deleteMany({});
        await GeoZoneMapping.deleteMany({});
        console.log('✅ Cleared\n');

        // Step 1: Create Country (India)
        console.log('📍 Creating India (Country)...');
        const india = await GeoZone.create({
            name: 'India',
            code: 'IN',
            level: 'COUNTRY',
            priority: 1,
            currency: 'INR',
            isActive: true
        });
        console.log(`✅ Created: ${india.name} (${india._id})\n`);

        // Step 2: Create States
        console.log('📍 Creating States...');
        const gujarat = await GeoZone.create({
            name: 'Gujarat',
            code: 'GJ',
            level: 'STATE',
            parentZone: india._id,
            priority: 2,
            currency: 'INR'
        });

        const maharashtra = await GeoZone.create({
            name: 'Maharashtra',
            code: 'MH',
            level: 'STATE',
            parentZone: india._id,
            priority: 2,
            currency: 'INR'
        });

        const delhi = await GeoZone.create({
            name: 'Delhi',
            code: 'DL',
            level: 'STATE',
            parentZone: india._id,
            priority: 2,
            currency: 'INR'
        });

        console.log(`✅ Created States: Gujarat, Maharashtra, Delhi\n`);

        // Step 3: Create Cities
        console.log('📍 Creating Cities...');
        const surat = await GeoZone.create({
            name: 'Surat',
            code: 'SRT',
            level: 'CITY',
            parentZone: gujarat._id,
            priority: 4,
            currency: 'INR',
            deliveryDays: 2  // Faster delivery in main city
        });

        const mumbai = await GeoZone.create({
            name: 'Mumbai',
            code: 'MUM',
            level: 'CITY',
            parentZone: maharashtra._id,
            priority: 4,
            currency: 'INR',
            deliveryDays: 2
        });

        const pune = await GeoZone.create({
            name: 'Pune',
            code: 'PUN',
            level: 'CITY',
            parentZone: maharashtra._id,
            priority: 4,
            currency: 'INR',
            deliveryDays: 3
        });

        const newDelhi = await GeoZone.create({
            name: 'New Delhi',
            code: 'DEL',
            level: 'CITY',
            parentZone: delhi._id,
            priority: 4,
            currency: 'INR',
            deliveryDays: 2
        });

        console.log(`✅ Created Cities: Surat, Mumbai, Pune, New Delhi\n`);

        // Step 4: Create Pincode Mappings
        console.log('📍 Creating Pincode Mappings...\n');

        // Surat pincodes (395001-395017)
        console.log('   Mapping Surat pincodes...');
        await GeoZoneMapping.create({
            geoZone: surat._id,
            countryCode: 'IN',
            pincodeStart: 395001,
            pincodeEnd: 395017
        });

        // Mumbai pincodes (400001-400104)
        console.log('   Mapping Mumbai pincodes...');
        await GeoZoneMapping.create({
            geoZone: mumbai._id,
            countryCode: 'IN',
            pincodeStart: 400001,
            pincodeEnd: 400104
        });

        // Pune pincodes (411001-411062)
        console.log('   Mapping Pune pincodes...');
        await GeoZoneMapping.create({
            geoZone: pune._id,
            countryCode: 'IN',
            pincodeStart: 411001,
            pincodeEnd: 411062
        });

        // Delhi pincodes (110001-110097)
        console.log('   Mapping Delhi pincodes...');
        await GeoZoneMapping.create({
            geoZone: newDelhi._id,
            countryCode: 'IN',
            pincodeStart: 110001,
            pincodeEnd: 110097
        });

        console.log('✅ Created all pincode mappings\n');

        // Step 5: Set default for India
        console.log('📍 Setting default mapping for India...');
        await GeoZoneMapping.create({
            geoZone: india._id,
            countryCode: 'IN',
            isDefault: true
        });
        console.log('✅ Default mapping created\n');

        // Step 6: Verify
        console.log('🔍 Verifying setup...\n');

        // Test pincode resolution
        const testPincodes = ['395004', '400001', '411001', '110001'];

        for (const pincode of testPincodes) {
            const pincodeNum = parseInt(pincode);
            const mapping = await GeoZoneMapping.findOne({
                pincodeStart: { $lte: pincodeNum },
                pincodeEnd: { $gte: pincodeNum }
            }).populate('geoZone');

            if (mapping && mapping.geoZone) {
                console.log(`   ✅ Pincode ${pincode} → ${mapping.geoZone.name}`);
            } else {
                console.log(`   ❌ Pincode ${pincode} → NOT MAPPED`);
            }
        }

        console.log('\n🎉 GeoZone setup complete!\n');

        // Summary
        console.log('📊 Summary:');
        const zoneCount = await GeoZone.countDocuments();
        const mappingCount = await GeoZoneMapping.countDocuments();
        console.log(`   - Total GeoZones: ${zoneCount}`);
        console.log(`   - Total Mappings: ${mappingCount}`);
        console.log('');

        console.log('💡 Next Steps:');
        console.log('   1. Test pricing API with different pincodes');
        console.log('   2. Create price modifiers for different zones');
        console.log('   3. Add more cities/pincodes as needed\n');

    } catch (error) {
        console.error('❌ Error setting up geo zones:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
}

// Run setup
setupGeoZones();
