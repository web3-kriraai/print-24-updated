/**
 * Seed Shiprocket Provider
 * 
 * Creates or updates the Shiprocket logistics provider in the database.
 * 
 * Run: node src/scripts/seed-shiprocket-provider.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '../../.env') });

// Import model
import LogisticsProvider from '../models/LogisticsProvider.js';

async function seedShiprocketProvider() {
    try {
        console.log('🚀 Seeding Shiprocket Provider...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_TEST_URI);
        console.log('✅ MongoDB connected\n');

        // Shiprocket provider data
        const shiprocketData = {
            name: 'SHIPROCKET',
            displayName: 'Shiprocket',
            type: 'EXTERNAL',
            isActive: true,
            apiCredentials: {
                email: process.env.SHIPROCKET_EMAIL,
                password: process.env.SHIPROCKET_API, // API key is actually the password
                // Token will be generated at runtime and cached
            },
            baseUrl: 'https://apiv2.shiprocket.in/v1/external',
            pricingRules: {
                baseRate: 0, // Rates fetched from Shiprocket API
                perKg: 0,
                codCharges: 0,
            },
            averageDeliveryTime: 5, // Default estimate, actual from API
            expressDeliveryTime: 2,
            supportsCOD: true,
            supportsReverse: true,
            maxWeight: 50, // kg
            priority: 10, // Higher priority than internal
            webhookUrl: '/api/webhooks/courier-update',
            syncStatus: 'PENDING',
        };

        // Upsert (create or update)
        const result = await LogisticsProvider.findOneAndUpdate(
            { name: 'SHIPROCKET' },
            shiprocketData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('✅ Shiprocket Provider seeded successfully!\n');
        console.log('Provider Details:');
        console.log('  - ID:', result._id);
        console.log('  - Name:', result.name);
        console.log('  - Display Name:', result.displayName);
        console.log('  - Type:', result.type);
        console.log('  - Is Active:', result.isActive);
        console.log('  - Priority:', result.priority);
        console.log('  - COD Support:', result.supportsCOD);
        console.log('  - Reverse Support:', result.supportsReverse);

        // Also seed an Internal provider if not exists
        const internalData = {
            name: 'INTERNAL',
            displayName: 'Internal Delivery',
            type: 'INTERNAL',
            isActive: true,
            serviceablePincodes: [], // Add serviceable pincodes as needed
            serviceableRanges: [
                { start: '395001', end: '395099' }, // Surat
                { start: '380001', end: '380099' }, // Ahmedabad
            ],
            pricingRules: {
                baseRate: 50,
                perKg: 10,
                codCharges: 20,
            },
            averageDeliveryTime: 2,
            supportsCOD: true,
            supportsReverse: true,
            priority: 5, // Lower priority than external
        };

        const internalResult = await LogisticsProvider.findOneAndUpdate(
            { name: 'INTERNAL' },
            internalData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log('\n✅ Internal Provider seeded successfully!');
        console.log('  - ID:', internalResult._id);
        console.log('  - Name:', internalResult.name);

        console.log('\n🎉 All providers seeded!\n');

    } catch (error) {
        console.error('❌ Error seeding providers:', error.message);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('📦 MongoDB disconnected');
    }
}

// Run if called directly
seedShiprocketProvider()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
