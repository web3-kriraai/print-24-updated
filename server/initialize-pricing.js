import dotenv from "dotenv";
import mongoose from "mongoose";
import PriceBook from "./src/models/PriceBook.js";
import UserSegment from "./src/models/UserSegment.js";
import SegmentPriceBook from "./src/models/SegmentPricebook.js";
import GeoZone from "./src/models/GeoZon.js";
import GeoZoneMapping from "./src/models/GeoZonMapping.js";

/**
 * =========================================================================
 * PRICING SYSTEM INITIALIZATION SCRIPT
 * =========================================================================
 * 
 * This script initializes the pricing system with default data:
 * 1. Creates default PriceBook
 * 2. Creates user segments (RETAIL, CORPORATE, PRINT_PARTNER)
 * 3. Maps segments to price books
 * 4. Creates basic geo zones
 * 5. Maps pincodes to geo zones
 * 
 * Run with: node initialize-pricing.js
 */

dotenv.config();

async function initializePricing() {
    try {
        console.log("🚀 Starting pricing system initialization...\n");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // ========================================
        // STEP 1: Create Default PriceBook
        // ========================================
        console.log("Step 1: Creating default PriceBook...");

        let defaultPriceBook = await PriceBook.findOne({ isDefault: true });

        if (!defaultPriceBook) {
            defaultPriceBook = await PriceBook.create({
                name: "Default Price Book - India",
                currency: "INR",
                isDefault: true,
            });
            console.log(`✅ Created default PriceBook: ${defaultPriceBook.name}`);
        } else {
            console.log(`ℹ️  Default PriceBook already exists: ${defaultPriceBook.name}`);
        }
        console.log("");

        // ========================================
        // STEP 2: Create User Segments
        // ========================================
        console.log("Step 2: Creating user segments...");

        const segmentsToCreate = [
            { code: "RETAIL", name: "Retail Customer", isDefault: true },
            { code: "PRINT_PARTNER", name: "Print Partner", isDefault: false },
            { code: "CORPORATE", name: "Corporate Client", isDefault: false },
            { code: "VIP", name: "VIP Customer", isDefault: false },
        ];

        const createdSegments = {};

        for (const segmentData of segmentsToCreate) {
            let segment = await UserSegment.findOne({ code: segmentData.code });

            if (!segment) {
                segment = await UserSegment.create(segmentData);
                console.log(`✅ Created segment: ${segment.code} - ${segment.name}`);
            } else {
                console.log(`ℹ️  Segment already exists: ${segment.code} - ${segment.name}`);
            }

            createdSegments[segment.code] = segment;
        }
        console.log("");

        // ========================================
        // STEP 3: Map Segments to PriceBooks
        // ========================================
        console.log("Step 3: Mapping segments to price books...");

        for (const [code, segment] of Object.entries(createdSegments)) {
            const existingMapping = await SegmentPriceBook.findOne({
                userSegment: segment._id,
            });

            if (!existingMapping) {
                await SegmentPriceBook.create({
                    userSegment: segment._id,
                    priceBook: defaultPriceBook._id,
                    priority: 1,
                });
                console.log(`✅ Mapped ${code} → Default PriceBook`);
            } else {
                console.log(`ℹ️  Mapping already exists: ${code} → PriceBook`);
            }
        }
        console.log("");

        // ========================================
        // STEP 4: Create Geo Zones
        // ========================================
        console.log("Step 4: Creating geo zones...");

        const zonesToCreate = [
            { name: "North India", currency: "INR", isRestricted: false },
            { name: "South India", currency: "INR", isRestricted: false },
            { name: "East India", currency: "INR", isRestricted: false },
            { name: "West India", currency: "INR", isRestricted: false },
            { name: "Central India", currency: "INR", isRestricted: false },
        ];

        const createdZones = {};

        for (const zoneData of zonesToCreate) {
            let zone = await GeoZone.findOne({ name: zoneData.name });

            if (!zone) {
                zone = await GeoZone.create(zoneData);
                console.log(`✅ Created zone: ${zone.name}`);
            } else {
                console.log(`ℹ️  Zone already exists: ${zone.name}`);
            }

            createdZones[zone.name] = zone;
        }
        console.log("");

        // ========================================
        // STEP 5: Map Pincodes to Zones
        // ========================================
        console.log("Step 5: Mapping pincodes to geo zones...");

        const pincodeMappings = [
            // North India (Delhi, Punjab, Haryana, Himachal, J&K, Uttarakhand)
            { zone: "North India", start: 110001, end: 136156 }, // Delhi & nearby
            { zone: "North India", start: 140001, end: 160104 }, // Punjab
            { zone: "North India", start: 171001, end: 177601 }, // Himachal
            { zone: "North India", start: 180001, end: 194404 }, // J&K

            // South India (Karnataka, Kerala, Tamil Nadu, Andhra, Telangana)
            { zone: "South India", start: 500001, end: 509412 }, // Telangana
            { zone: "South India", start: 560001, end: 591346 }, // Karnataka
            { zone: "South India", start: 600001, end: 643253 }, // Tamil Nadu
            { zone: "South India", start: 670001, end: 695615 }, // Kerala

            // East India (West Bengal, Odisha, Bihar, Jharkhand)
            { zone: "East India", start: 700001, end: 743711 }, // West Bengal
            { zone: "East India", start: 751001, end: 770076 }, // Odisha
            { zone: "East India", start: 800001, end: 855117 }, // Bihar

            // West India (Maharashtra, Gujarat, Rajasthan, Goa)
            { zone: "West India", start: 400001, end: 445402 }, // Maharashtra
            { zone: "West India", start: 360001, end: 396590 }, // Gujarat
            { zone: "West India", start: 302001, end: 345034 }, // Rajasthan
            { zone: "West India", start: 403001, end: 403806 }, // Goa

            // Central India (MP, Chhattisgarh)
            { zone: "Central India", start: 450001, end: 488448 }, // MP
            { zone: "Central India", start: 490001, end: 497778 }, // Chhattisgarh
        ];

        for (const mapping of pincodeMappings) {
            const zone = createdZones[mapping.zone];
            if (!zone) {
                console.warn(`⚠️  Zone not found: ${mapping.zone}`);
                continue;
            }

            const existing = await GeoZoneMapping.findOne({
                geoZone: zone._id,
                pincodeStart: mapping.start,
                pincodeEnd: mapping.end,
            });

            if (!existing) {
                await GeoZoneMapping.create({
                    geoZone: zone._id,
                    pincodeStart: mapping.start,
                    pincodeEnd: mapping.end,
                });
                console.log(`✅ Mapped pincodes ${mapping.start}-${mapping.end} → ${mapping.zone}`);
            } else {
                console.log(`ℹ️  Mapping already exists: ${mapping.start}-${mapping.end} → ${mapping.zone}`);
            }
        }
        console.log("");

        // ========================================
        // SUMMARY
        // ========================================
        console.log("=" + "=".repeat(70));
        console.log("✅ Pricing System Initialization Complete!");
        console.log("=" + "=".repeat(70));
        console.log("");
        console.log("Summary:");
        console.log(`  - PriceBook: ${defaultPriceBook.name}`);
        console.log(`  - User Segments: ${Object.keys(createdSegments).length}`);
        console.log(`  - Geo Zones: ${Object.keys(createdZones).length}`);
        console.log(`  - Pincode Mappings: ${pincodeMappings.length}`);
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Add products to PriceBookEntry");
        console.log("  2. Create PriceModifiers as needed");
        console.log("  3. Test pricing API: POST /api/pricing/quote");
        console.log("  4. Integrate with order creation");
        console.log("");

        process.exit(0);
    } catch (error) {
        console.error("❌ Initialization failed:", error);
        console.error(error.stack);
        process.exit(1);
    }
}

initializePricing();
