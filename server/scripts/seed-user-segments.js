
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import UserSegment from '../src/models/UserSegment.js';
import UserType from '../src/models/UserType.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const CORE_SEGMENTS = [
    {
        code: 'RETAIL',
        name: 'Retail Customer',
        description: 'Standard pricing for general customers',
        isDefault: true,
        priority: 0,
        pricingTier: 0,
        isSystem: true // Protected
    },
    {
        code: 'CORPORATE',
        name: 'Corporate Partner',
        description: 'Special pricing for corporate accounts',
        isDefault: false,
        priority: 10,
        pricingTier: 2,
        isSystem: true // Protected
    },
    {
        code: 'PRINT_PARTNER',
        name: 'Print Partner',
        description: 'Wholesale pricing for printing partners',
        isDefault: false,
        priority: 20,
        pricingTier: 3,
        isSystem: true // Protected
    }
];

const seedUserSegments = async () => {
    try {
        console.log('🌱 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_TEST_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🛡️  Seeding Protected User Segments...');

        for (const segmentDef of CORE_SEGMENTS) {
            const existing = await UserSegment.findOne({ code: segmentDef.code });

            if (existing) {
                // Update existing to ensure it is protected
                existing.isSystem = true;
                existing.name = segmentDef.name; // Reset name if changed
                existing.isDefault = segmentDef.isDefault; // Ensure default status
                await existing.save();
                console.log(`✅ Updated existing segment: ${segmentDef.code} (Protected)`);
            } else {
                // Create new
                await UserSegment.create(segmentDef);
                console.log(`✨ Created new segment: ${segmentDef.code} (Protected)`);
            }
        }

        // Ensure UserTypes exist (optional but good for consistency)
        // This links the Segment Code to the User Type
        const userTypes = [
            { name: 'Retail', code: 'RETAIL', userSegmentCode: 'RETAIL' },
            { name: 'Corporate', code: 'CORPORATE', userSegmentCode: 'CORPORATE' },
            { name: 'Print Partner', code: 'PRINT_PARTNER', userSegmentCode: 'PRINT_PARTNER' }
        ];

        // Only create if UserType model exists (it should based on previous sessions)
        try {
            for (const typeDef of userTypes) {
                const existing = await UserType.findOne({ code: typeDef.code });
                if (!existing) {
                    await UserType.create(typeDef);
                    console.log(`✨ Created UserType: ${typeDef.code}`);
                }
            }
        } catch (err) {
            console.log('⚠️  Skipping UserType check (Model might define it differently)');
        }

        console.log('\n✅ User Segment Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedUserSegments();
