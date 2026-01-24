/**
 * cleanup-geozones.js
 * 
 * This script removes ALL GeoZone data and related references from the database.
 * 
 * COLLECTIONS AFFECTED:
 * 1. GeoZone - All geo zones deleted
 * 2. GeoZoneMapping - All pincode-to-zone mappings deleted
 * 3. PriceBook - Zone references set to null (does NOT delete price books)
 * 4. SegmentPricebook - GeoZone references set to null
 * 5. ProductAvailability - All zone-specific availability rules deleted
 * 6. PriceModifier - GeoZone references set to null on modifiers
 * 7. Product - GeoZone IDs in pricing history cleared
 * 
 * USAGE:
 *   cd d:\merge\version-1\server
 *   node src/scripts/cleanup-geozones.js
 * 
 * WARNING: This is a DESTRUCTIVE operation. Make a backup first!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import GeoZone from '../models/GeoZon.js';
import GeoZoneMapping from '../models/GeoZonMapping.js';
import PriceBook from '../models/PriceBook.js';
import SegmentPriceBook from '../models/SegmentPricebook.js';
import ProductAvailability from '../models/ProductAvailability.js';
import PriceModifier from '../models/PriceModifier.js';
import Product from '../models/productModal.js';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.magenta}═══════════════════════════════════════${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.magenta}═══════════════════════════════════════${colors.reset}\n`),
};

async function cleanupGeoZones() {
    log.header('GEO ZONE CLEANUP SCRIPT');

    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            log.error('No MongoDB URI found in environment variables!');
            log.info('Please set MONGO_TEST_URI, MONGO_URI or MONGODB_URI in your .env file');
            process.exit(1);
        }

        log.info(`Connecting to MongoDB...`);
        await mongoose.connect(mongoUri);
        log.success('Connected to MongoDB');

        // Summary object
        const summary = {
            geoZonesDeleted: 0,
            geoZoneMappingsDeleted: 0,
            priceBooksUpdated: 0,
            segmentPriceBooksUpdated: 0,
            productAvailabilityDeleted: 0,
            priceModifiersUpdated: 0,
            productsUpdated: 0,
        };

        // =====================================================
        // 1. DELETE ALL GEO ZONE MAPPINGS
        // =====================================================
        log.info('Step 1/7: Deleting GeoZoneMapping documents...');
        const mappingResult = await GeoZoneMapping.deleteMany({});
        summary.geoZoneMappingsDeleted = mappingResult.deletedCount;
        log.success(`Deleted ${summary.geoZoneMappingsDeleted} GeoZoneMapping documents`);

        // =====================================================
        // 2. DELETE ALL GEO ZONES
        // =====================================================
        log.info('Step 2/7: Deleting GeoZone documents...');
        const zoneResult = await GeoZone.deleteMany({});
        summary.geoZonesDeleted = zoneResult.deletedCount;
        log.success(`Deleted ${summary.geoZonesDeleted} GeoZone documents`);

        // =====================================================
        // 3. CLEAR ZONE REFERENCES IN PRICE BOOKS
        // =====================================================
        log.info('Step 3/7: Clearing zone references in PriceBook...');
        const priceBookResult = await PriceBook.updateMany(
            { zone: { $ne: null } },
            { $set: { zone: null } }
        );
        summary.priceBooksUpdated = priceBookResult.modifiedCount;
        log.success(`Updated ${summary.priceBooksUpdated} PriceBook documents`);

        // =====================================================
        // 4. CLEAR GEO ZONE REFERENCES IN SEGMENT PRICE BOOKS
        // =====================================================
        log.info('Step 4/7: Clearing geoZone references in SegmentPriceBook...');
        const segmentPBResult = await SegmentPriceBook.updateMany(
            { geoZone: { $ne: null } },
            { $set: { geoZone: null } }
        );
        summary.segmentPriceBooksUpdated = segmentPBResult.modifiedCount;
        log.success(`Updated ${summary.segmentPriceBooksUpdated} SegmentPriceBook documents`);

        // =====================================================
        // 5. DELETE ALL PRODUCT AVAILABILITY RULES (zone-specific)
        // =====================================================
        log.info('Step 5/7: Deleting ProductAvailability documents...');
        const availabilityResult = await ProductAvailability.deleteMany({});
        summary.productAvailabilityDeleted = availabilityResult.deletedCount;
        log.success(`Deleted ${summary.productAvailabilityDeleted} ProductAvailability documents`);

        // =====================================================
        // 6. CLEAR GEO ZONE REFERENCES IN PRICE MODIFIERS
        // =====================================================
        log.info('Step 6/7: Clearing geoZone references in PriceModifier...');
        const modifierResult = await PriceModifier.updateMany(
            { geoZone: { $ne: null } },
            { $set: { geoZone: null } }
        );
        summary.priceModifiersUpdated = modifierResult.modifiedCount;
        log.success(`Updated ${summary.priceModifiersUpdated} PriceModifier documents`);

        // =====================================================
        // 7. CLEAR GEO ZONE IDS IN PRODUCT PRICING HISTORY
        // =====================================================
        log.info('Step 7/7: Clearing geoZoneId references in Product pricing history...');
        const productResult = await Product.updateMany(
            { 'pricingHistory.geoZoneId': { $ne: null } },
            { $set: { 'pricingHistory.$[].geoZoneId': null } }
        );
        summary.productsUpdated = productResult.modifiedCount;
        log.success(`Updated ${summary.productsUpdated} Product documents`);

        // =====================================================
        // SUMMARY
        // =====================================================
        log.header('CLEANUP COMPLETE - SUMMARY');

        console.log(`
┌─────────────────────────────────────────┐
│          CLEANUP SUMMARY                │
├─────────────────────────────────────────┤
│ GeoZone documents deleted:      ${String(summary.geoZonesDeleted).padStart(6)} │
│ GeoZoneMapping documents:       ${String(summary.geoZoneMappingsDeleted).padStart(6)} │
│ PriceBook zone refs cleared:    ${String(summary.priceBooksUpdated).padStart(6)} │
│ SegmentPriceBook refs cleared:  ${String(summary.segmentPriceBooksUpdated).padStart(6)} │
│ ProductAvailability deleted:    ${String(summary.productAvailabilityDeleted).padStart(6)} │
│ PriceModifier refs cleared:     ${String(summary.priceModifiersUpdated).padStart(6)} │
│ Product pricing history:        ${String(summary.productsUpdated).padStart(6)} │
└─────────────────────────────────────────┘
        `);

        log.success('All GeoZone data has been cleaned up!');
        log.warn('Remember to restart your server for changes to take effect.');

    } catch (error) {
        log.error(`Cleanup failed: ${error.message}`);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        log.info('Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the cleanup
cleanupGeoZones();
