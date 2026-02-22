import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import PriceBook from '../src/models/PriceBook.js';
import PriceBookEntry from '../src/models/PriceBookEntry.js';
import GeoZone from '../src/models/GeoZon.js';
import UserSegment from '../src/models/UserSegment.js';
import Product from '../src/models/productModal.js';

import VirtualPriceBookService from '../src/services/VirtualPriceBookService.js';

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        // 1. Check ALL Master Price Books
        const allMasters = await PriceBook.find({ isMaster: true }).lean();
        console.log(`\n--- Master Price Books (Raw/Lean) ---`);
        console.log(JSON.stringify(allMasters, null, 2));

        if (allMasters.length === 0) {
            console.log('❌ CRITICAL: NO MASTER BOOK FOUND');
        }

        console.log('\n--- Debugging PriceBook.getMasterBook() ---');
        if (typeof PriceBook.getMasterBook === 'function') {
            console.log('PriceBook.getMasterBook is a function.');
            const masterFromStatic = await PriceBook.getMasterBook();
            console.log('PriceBook.getMasterBook() returned:', masterFromStatic ? masterFromStatic.name : 'null');
            if (!masterFromStatic) {
                console.log('⚠️  Static method returned null despite manual find() finding one!');

                // Manual check with EXACT query
                console.log('Running manual findOne({ isMaster: true, isActive: true })...');
                const manualFind = await PriceBook.findOne({ isMaster: true, isActive: true });
                console.log('Manual findOne result:', manualFind ? manualFind.name : 'null');

                console.log('Query being executed by static: { isMaster: true, isActive: true }');
                // Check active status type
                allMasters.forEach(b => console.log(`ID: ${b._id}, isMaster type: ${typeof b.isMaster}, isActive type: ${typeof b.isActive}`));
            }
        } else {
            console.log('❌ PriceBook.getMasterBook is NOT a function!');
            console.log('Statics keys:', Object.keys(PriceBook.schema.statics));
        }

        // 2. Test VirtualPriceBookService.getSmartView()
        console.log('\n--- Testing VirtualPriceBookService.getSmartView() ---');
        const service = new VirtualPriceBookService();

        try {
            // Null filters = Master View
            const result = await service.getSmartView({ zone: null, segment: null, product: null });
            console.log('Result Type:', result.viewType);
            console.log('Master Book Name:', result.masterBookName);
            console.log('Entries Count:', result.entries ? result.entries.length : 'N/A');

            if (result.entries && result.entries.length > 0) {
                console.log('First Entry:', JSON.stringify(result.entries[0], null, 2));
            } else {
                console.log('❌ Entries array is empty!');
                // Check why
                if (result.masterBookId) {
                    const count = await PriceBookEntry.countDocuments({ priceBook: result.masterBookId });
                    console.log(`DB has ${count} entries for this book.`);

                    // Check logic in getMasterView -> validEntries filter
                    console.log('Checking for product references...');
                    const rawEntries = await PriceBookEntry.find({ priceBook: result.masterBookId }).populate('product');
                    console.log(`Raw entries with populated product: ${rawEntries.length}`);
                    const valid = rawEntries.filter(e => e.product);
                    console.log(`Entries with valid product object: ${valid.length}`);
                    if (valid.length < rawEntries.length) {
                        console.log('⚠️ Some entries have missing/null Product references!');
                    }
                }
            }
        } catch (e) {
            console.error('Error calling getSmartView:', e);
        }

        // 3. Check Products
        const productCount = await Product.countDocuments({});
        console.log(`\n--- Products ---`);
        console.log(`Total Products: ${productCount}`);

        // 4. Check Zones
        const zoneCount = await GeoZone.countDocuments({});
        console.log(`\n--- Zones ---`);
        console.log(`Total Zones: ${zoneCount}`);
        const zones = await GeoZone.find({}).select('name');
        zones.forEach(z => console.log(`- ${z.name} (${z._id})`));

        // 5. Check Segments
        const segmentCount = await UserSegment.countDocuments({});
        console.log(`\n--- Segments ---`);
        console.log(`Total Segments: ${segmentCount}`);

        // 6. Check Zone-Specific Price Books
        if (zones.length > 0) {
            console.log('\n--- Zone Price Books ---');
            const zoneBooks = await PriceBook.find({ zone: { $ne: null } }).populate('zone');
            zoneBooks.forEach(b => {
                console.log(`- ${b.name}: Zone=${b.zone?.name}, Active=${b.isActive}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
