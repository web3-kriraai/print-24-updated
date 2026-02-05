import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Feature from './src/models/featureModal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '.env') });

const sampleFeatures = [
    {
        icon: 'Tag',
        title: 'Best prices & offers',
        description: 'Orders $50 or more',
        color: '#8BC34A',
        displayOrder: 1,
        isVisible: true,
    },
    {
        icon: 'Truck',
        title: 'Free delivery',
        description: '24/7 amazing services',
        color: '#4CAF50',
        displayOrder: 2,
        isVisible: true,
    },
    {
        icon: 'Gift',
        title: 'Great daily deal',
        description: 'When you sign up',
        color: '#FFC107',
        displayOrder: 3,
        isVisible: true,
    },
    {
        icon: 'ShoppingBag',
        title: 'Wide assortment',
        description: 'Mega Discounts',
        color: '#00BCD4',
        displayOrder: 4,
        isVisible: true,
    },
    {
        icon: 'RotateCcw',
        title: 'Easy returns',
        description: 'Within 30 days',
        color: '#8BC34A',
        displayOrder: 5,
        isVisible: true,
    },
];

async function addSampleFeatures() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing features
        await Feature.deleteMany({});
        console.log('🗑️  Cleared existing features');

        // Insert sample features
        const features = await Feature.insertMany(sampleFeatures);
        console.log(`✅ Added ${features.length} sample features`);

        features.forEach((feature) => {
            console.log(`   - ${feature.title} (${feature.icon})`);
        });

        console.log('\n✅ Sample features added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding sample features:', error);
        process.exit(1);
    }
}

addSampleFeatures();
