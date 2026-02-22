
import mongoose from 'mongoose';
import '../server/config/env.js'; // Ensure env is loaded
import PriceBook from '../server/src/models/PriceBook.js';
import PriceBookEntry from '../server/src/models/PriceBookEntry.js';
import Product from '../server/src/models/productModal.js';
import GeoZone from '../server/src/models/GeoZon.js';
import UserSegment from '../server/src/models/UserSegment.js';
import SmartViewPriceUpdater from '../server/src/services/SmartViewPriceUpdater.js';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/print24_v1')
    .then(async () => {
        console.log('Connected to MongoDB');

        // Setup Test Data
        const product = await Product.findOne({});
        if (!product) { console.error('No products found'); process.exit(1); }

        const zone = await GeoZone.findOne({});
        if (!zone) { console.error('No zones found'); process.exit(1); }

        // Create Master Book if not exists
        let masterBook = await PriceBook.getMasterBook();
        if (!masterBook) {
            masterBook = await PriceBook.create({ name: 'Master Price Book', isMaster: true, isActive: true });
        }

        // Set Master Price
        await PriceBookEntry.findOneAndUpdate(
            { priceBook: masterBook._id, product: product._id },
            { basePrice: 100 },
            { upsert: true, new: true }
        );

        // Create Zone + Segment Book (Child Context)
        // We need a dummy segment to simulate a child context
        // Or we can just use the existing segment if any
        let segment = await UserSegment.findOne({});
        if (!segment) {
            // Create dummy segment
            segment = await UserSegment.create({ name: 'Test Segment', code: 'TEST_SEGMENT' });
        }

        // Create specific price book for Zone + Segment
        let childBook = await PriceBook.findOne({ zone: zone._id, segment: segment._id });
        if (!childBook) {
            childBook = await PriceBook.create({
                name: `Child Book for ${zone.name} + ${segment.name}`,
                zone: zone._id,
                segment: segment._id,
                parentBook: masterBook._id,
                isOverride: true,
                isActive: true
            });
        }

        // Set Child Price (Override)
        await PriceBookEntry.findOneAndUpdate(
            { priceBook: childBook._id, product: product._id },
            { basePrice: 120 }, // 20% higher
            { upsert: true, new: true }
        );

        console.log(`Setup complete using Product: ${product.name}, Zone: ${zone.name}, Segment: ${segment.name}`);
        console.log(`Master Price: 100, Child override: 120`);

        // TEST: Try to update Zone Price (Parent Context) to 110
        // This should conflict with the Child (Zone+Segment) override
        // We expect SmartViewPriceUpdater to detect conflict

        const updater = new SmartViewPriceUpdater();

        console.log('\n--- TESTING CONFLICT DETECTION ---');
        const update = {
            productId: product._id,
            newPrice: 110
        };

        // Zone Update -> Apply to All Segments
        // conflict expected with the specific segment override
        const result = await updater.updateZonePrices(zone._id, [update], 'ASK');

        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.requiresResolution) {
            console.log('✅ Conflict correctly detected!');

            console.log('\n--- TESTING RESOLUTION (OVERWRITE) ---');
            // Now try with OVERWRITE
            const resolutionResult = await updater.updateZonePrices(zone._id, [update], 'OVERWRITE');
            console.log('Resolution Result:', JSON.stringify(resolutionResult, null, 2));

            // Verify Child Override is GONE
            const childEntry = await PriceBookEntry.findOne({ priceBook: childBook._id, product: product._id });
            if (!childEntry) {
                console.log('✅ Child override successfully deleted (OVERWRITE worked)');
            } else {
                console.error('❌ Child override still exists:', childEntry);
            }

        } else {
            console.error('❌ NO CONFLICT DETECTED! Expected conflict with child override.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
