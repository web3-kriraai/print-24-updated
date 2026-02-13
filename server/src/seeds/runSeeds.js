import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { seedFeatures } from './features.seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * SEED RUNNER
 * Run all seed files to populate initial data
 */

async function runSeeds() {
    try {
        console.log('\n🌱 Starting database seeding...\n');

        // Connect to MongoDB
        if (!process.env.MONGO_URI_PRICING) {
            throw new Error('MONGO_URI_PRICING not found in environment variables');
        }

        await mongoose.connect(process.env.MONGO_URI_PRICING, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log('✅ MongoDB connected\n');

        // Run feature seed
        await seedFeatures();

        // Add more seeds here as needed
        // await seedUserSegments();
        // await seedProducts();
        // etc.

        console.log('\n✅ All seeds completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    }
}

runSeeds();
