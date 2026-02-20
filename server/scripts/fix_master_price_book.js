
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname specific for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import connectDB from '../src/config/db.js';

// Import models
import Product from '../src/models/productModal.js';
import PriceBook from '../src/models/PriceBook.js';
import PriceBookEntry from '../src/models/PriceBookEntry.js';

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await connectDB();
        console.log('Connected.');

        // 1. Get Master Price Book
        let masterBook = await PriceBook.findOne({ isMaster: true });

        if (!masterBook) {
            console.log('Master Price Book not found. Creating one...');
            masterBook = await PriceBook.create({
                name: 'Master Price Book',
                description: 'Auto-created Master Price Book',
                currency: 'INR',
                isMaster: true,
                isDefault: true,
                isActive: true
            });
            console.log(`Created Master Price Book: ${masterBook._id}`);
        } else {
            console.log(`Found Master Price Book: ${masterBook.name} (${masterBook._id})`);
        }

        // 2. Get all products
        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);

        let createdCount = 0;
        let skippedCount = 0;

        // 3. Loop through products and ensure price book entry exists
        for (const product of products) {
            const existingEntry = await PriceBookEntry.findOne({
                priceBook: masterBook._id,
                product: product._id
            });

            if (existingEntry) {
                // Optional: Update base price if it's 0 in entry but has value in product?
                // For now, just skip
                skippedCount++;
                // console.log(`Skipping ${product.name} - Entry exists`);
            } else {
                await PriceBookEntry.create({
                    priceBook: masterBook._id,
                    product: product._id,
                    basePrice: product.basePrice || 0,
                    compareAtPrice: 0,
                    isActive: true
                });
                createdCount++;
                console.log(`Created entry for ${product.name} - Price: ${product.basePrice || 0}`);
            }
        }

        console.log('\n--- Summary ---');
        console.log(`Total Products: ${products.length}`);
        console.log(`Created Entries: ${createdCount}`);
        console.log(`Skipped Entries: ${skippedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

run();
