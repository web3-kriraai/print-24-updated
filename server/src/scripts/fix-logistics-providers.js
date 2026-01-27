/**
 * Fix Logistics Providers
 * 
 * Removes duplicate Shiprocket providers and ensures correct configuration.
 * 
 * Run: node src/scripts/fix-logistics-providers.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '../../.env') });

import LogisticsProvider from '../models/LogisticsProvider.js';

async function fixProviders() {
    try {
        console.log('🔧 Fixing Logistics Providers...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_TEST_URI);
        console.log('✅ MongoDB connected');

        // Find all Shiprocket providers
        const shiprocketProviders = await LogisticsProvider.find({ name: 'SHIPROCKET' }).sort({ priority: -1 });

        console.log(`Found ${shiprocketProviders.length} Shiprocket provider(s).`);

        if (shiprocketProviders.length > 1) {
            console.log('⚠️ Duplicates found. Keeping the one with highest priority/latest update.');

            // Keep the first one (highest priority due to sort)
            const toKeep = shiprocketProviders[0];
            const toDelete = shiprocketProviders.slice(1);

            console.log(`Keeping provider ID: ${toKeep._id} (Priority: ${toKeep.priority})`);

            for (const p of toDelete) {
                console.log(`Deleting duplicate provider ID: ${p._id} (Priority: ${p.priority})`);
                await LogisticsProvider.findByIdAndDelete(p._id);
            }
            console.log('✅ Duplicates removed.');
        } else if (shiprocketProviders.length === 1) {
            console.log('✅ No duplicates found.');
        } else {
            console.log('❌ No Shiprocket provider found! You should run seed-shiprocket-provider.js');
        }

        // Verify Internal providers as well
        const internalProviders = await LogisticsProvider.find({ name: 'INTERNAL' });
        if (internalProviders.length > 1) {
            console.log('⚠️ Duplicate INTERNAL providers found. Fixing...');
            const toKeep = internalProviders[0];
            const toDelete = internalProviders.slice(1);
            for (const p of toDelete) {
                await LogisticsProvider.findByIdAndDelete(p._id);
            }
            console.log('✅ Internal duplicates removed.');
        }

        console.log('\n✨ cleanup complete.');

    } catch (error) {
        console.error('❌ Error fixing providers:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 MongoDB disconnected');
    }
}

fixProviders();
