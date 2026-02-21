import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const FeatureSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: String,
    category: String,
    isActive: { type: Boolean, default: true },
    isBeta: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    configSchema: { type: mongoose.Schema.Types.Mixed, default: {} },
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

const Feature = mongoose.model('Feature', FeatureSchema);

const featuresToSeed = [
    {
        key: 'bulk_order_upload',
        name: 'Bulk Order Management',
        description: 'Enables multi-product bulk ordering via CSV/PDF upload and wizard.',
        category: 'ORDERS',
        isActive: true,
        sortOrder: 10,
        configSchema: {
            fields: [
                {
                    fieldId: 'minDesigns',
                    label: 'Minimum Designs (Quantity)',
                    fieldType: 'number',
                    defaultValue: 1,
                    validation: { min: 1 },
                    helpText: 'The minimum number of distinct designs required to place a bulk order.'
                },
                {
                    fieldId: 'maxDesigns',
                    label: 'Maximum Designs (Quantity)',
                    fieldType: 'number',
                    defaultValue: 50,
                    validation: { min: 1, max: 200 },
                    helpText: 'The maximum number of distinct designs allowed in a single bulk PDF upload.'
                },
                {
                    fieldId: 'maxFileSizeMB',
                    label: 'Maximum File Size (MB)',
                    fieldType: 'number',
                    defaultValue: 10,
                    validation: { min: 1, max: 50 },
                    helpText: 'The maximum allowed file size for the composite bulk PDF.'
                }
            ]
        }
    },
    {
        key: 'bulk_feature_mgmt',
        name: 'Bulk Feature Management',
        description: 'Allows administrators to manage features and overrides in batch.',
        category: 'ADMIN',
        isPremium: true,
        isActive: true,
        sortOrder: 100
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        for (const f of featuresToSeed) {
            const existing = await Feature.findOne({ key: f.key });
            if (existing) {
                console.log(`Feature ${f.key} already exists. Updating...`);
                await Feature.updateOne({ key: f.key }, f);
            } else {
                console.log(`Creating feature ${f.key}...`);
                await Feature.create(f);
            }
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
