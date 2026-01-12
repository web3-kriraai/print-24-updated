
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Models
import Product from '../models/productModal.js';
import GeoZone from '../models/GeoZon.js';
import UserSegment from '../models/UserSegment.js';
import PriceBook from '../models/PriceBook.js';
import PriceBookEntry from '../models/PriceBookEntry.js';
import PriceModifier from '../models/PriceModifier.js';
import Category from '../models/categoryModal.js';

// Services
import pricingService from '../services/pricing/PricingService.js';
import VirtualPriceBookService from '../services/VirtualPriceBookService.js';

// Load Env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const virtualService = new VirtualPriceBookService();

async function runVerification() {
    console.log('🚀 Starting Pricing Engine Verification...');

    try {
        // 1. Connect DB
        if (!process.env.MONGO_URI_PRICING) throw new Error('MONGO_URI_PRICING is missing');
        await mongoose.connect(process.env.MONGO_URI_PRICING);
        console.log('✅ Connected to MongoDB');

        // 2. Setup Test Data
        console.log('\n📦 Setting up Test Data...');

        // Category
        const category = await Category.create({
            name: 'Test Category',
            slug: 'test-category-' + Date.now(),
            image: 'test.jpg'
        });
        console.log(`- Category Created: ${category.name}`);

        // Product
        const product = await Product.create({
            name: 'Test Pricing Product',
            basePrice: 100,
            sku: 'TEST-SKU-001',
            gstPercentage: 18,
            isActive: true,
            category: category._id
        });
        console.log(`- Product Created: ${product.name} ($100 Base)`);

        // GeoZone
        const zone = await GeoZone.create({
            name: 'Test Zone NY',
            level: 'CITY',
            currency: 'USD',
            isActive: true
        });
        console.log(`- Zone Created: ${zone.name}`);

        // UserSegment
        const segment = await UserSegment.create({
            name: 'VIP Testers',
            code: 'VIP_TEST',
            isActive: true
        });
        console.log(`- Segment Created: ${segment.name}`);

        // --- MASTER PRICE BOOK ---
        let masterBook = await PriceBook.findOne({ isMaster: true });
        let createdMaster = false;

        if (!masterBook) {
            masterBook = await PriceBook.create({
                name: 'Test Master Book',
                isMaster: true,
                isDefault: true,
                currency: 'USD',
                isActive: true
            });
            createdMaster = true;
            console.log(`- Created New Master Book`);
        } else {
            console.log(`- Using Existing Master Book: ${masterBook.name}`);
        }

        await PriceBookEntry.create({
            priceBook: masterBook._id,
            product: product._id,
            basePrice: 100
        });
        console.log(`- Master Price Book Entry Set: $100`);

        // --- ZONE ADJUSTMENT BOOK ---
        // Price override to $110
        const zoneBook = await PriceBook.create({
            name: 'NY Adjustment',
            zone: zone._id,
            parentBook: masterBook._id,
            isMaster: false,
            currency: 'USD'
        });

        await PriceBookEntry.create({
            priceBook: zoneBook._id,
            product: product._id,
            basePrice: 110
        });
        console.log(`- Zone Price Book Entry Set: $110 (Effective Override)`);

        // --- MODIFIERS ---
        // 10% Discount for VIP Segment
        await PriceModifier.create({
            name: 'VIP Discount',
            appliesTo: 'SEGMENT',
            userSegment: segment._id,
            modifierType: 'PERCENT_DEC',
            value: 10,
            priority: 1,
            isActive: true
        });
        console.log(`- Modifier Created: VIP Discount 10%`);


        // 3. RUN TESTS
        console.log('\n🧪 Executing Scenarios...');

        // Scenario 1: Base Price (No context)
        console.log('\n--- Scenario 1: Base Context (No Zone/Segment) ---');
        const res1 = await pricingService.resolvePrice({
            productId: product._id,
            quantity: 1,
            cacheResults: false
        });
        console.log(`Result: ${res1.unitPrice} (Expected: 100)`);
        if (res1.unitPrice !== 100) console.error('❌ FAILED Scenario 1');
        else console.log('✅ PASSED Scenario 1');


        // Scenario 2: Zone Context
        console.log('\n--- Scenario 2: Zone Context (Test Zone NY) ---');
        const vRes2 = await virtualService.calculateVirtualPrice(
            product._id,
            zone._id,
            null
        );
        console.log(`Result: ${vRes2.finalPrice} (Expected: 110)`);
        if (vRes2.finalPrice !== 110) console.error('❌ FAILED Scenario 2');
        else console.log('✅ PASSED Scenario 2');


        // Scenario 3: Zone + Segment (VIP)
        console.log('\n--- Scenario 3: Zone + Segment (VIP) ---');
        // Price: $110 (Zone) - 10% (VIP) = $99
        const vRes3 = await virtualService.calculateVirtualPrice(
            product._id,
            zone._id,
            segment._id
        );
        console.log(`Result: ${vRes3.finalPrice} (Expected: 99)`);
        console.log('Adjustments:', vRes3.adjustments.map(a => `${a.type}: ${a.value}`));

        if (vRes3.finalPrice !== 99) console.error('❌ FAILED Scenario 3');
        else console.log('✅ PASSED Scenario 3');

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        if (mongoose.connection.readyState === 1) {
            // Delete created test data
            const products = await Product.find({ name: 'Test Pricing Product' });
            for (const p of products) {
                await PriceBookEntry.deleteMany({ product: p._id });
                await PriceModifier.deleteMany({ product: p._idn }); // typo check
            }
            await Product.deleteMany({ name: 'Test Pricing Product' });
            await Category.deleteMany({ name: 'Test Category' });
            await GeoZone.deleteMany({ name: 'Test Zone NY' });
            await UserSegment.deleteMany({ name: 'VIP Testers' });
            await PriceBook.deleteMany({ name: { $in: ['NY Adjustment'] } });
            if (typeof createdMaster !== 'undefined' && createdMaster) {
                await PriceBook.deleteMany({ name: 'Test Master Book' });
            }
            // Always clean up our modifier
            await PriceModifier.deleteMany({ name: 'VIP Discount' });

            await mongoose.disconnect();
        }
    }
}

runVerification();
