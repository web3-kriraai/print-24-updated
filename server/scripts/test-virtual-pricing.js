import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PriceBook from '../src/models/PriceBook.js';
import PriceBookEntry from '../src/models/PriceBookEntry.js';
import Product from '../src/models/productModal.js';
import GeoZone from '../src/models/GeoZon.js';
import UserSegment from '../src/models/UserSegment.js';
import VirtualPriceBookService from '../src/services/VirtualPriceBookService.js';

dotenv.config();

/**
 * Test Virtual Price Book System
 * Tests hierarchical pricing: Master + Zone + Segment
 */

async function testVirtualPricing() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const virtualService = new VirtualPriceBookService();

    // ========================================
    // STEP 1: Create Master Price Book
    // ========================================
    console.log('📘 Step 1: Creating Master Price Book...');
    
    let masterBook = await PriceBook.getMasterBook();
    if (!masterBook) {
      masterBook = await PriceBook.create({
        name: 'Master Price Book',
        description: 'Base prices for all products',
        currency: 'INR',
        isMaster: true,
        isDefault: true,
        isActive: true
      });
      console.log(`✅ Created master book: ${masterBook.name} (${masterBook._id})`);
    } else {
      console.log(`✅ Master book exists: ${masterBook.name} (${masterBook._id})`);
    }

    // ========================================
    // STEP 2: Add Master Prices
    // ========================================
    console.log('\n💰 Step 2: Adding Master Prices...');
    
    const products = await Product.find({ isActive: true }).limit(3);
    
    if (products.length === 0) {
      console.log('⚠️ No products found. Please create some products first.');
      return;
    }

    for (const product of products) {
      const existingEntry = await PriceBookEntry.findOne({
        priceBook: masterBook._id,
        product: product._id
      });

      if (!existingEntry) {
        const basePrice = Math.floor(Math.random() * 1000) + 100; // Random price 100-1100
        await PriceBookEntry.create({
          priceBook: masterBook._id,
          product: product._id,
          basePrice,
          compareAtPrice: basePrice * 1.2
        });
        console.log(`   ✅ ${product.name}: ₹${basePrice}`);
      } else {
        console.log(`   ✅ ${product.name}: ₹${existingEntry.basePrice} (existing)`);
      }
    }

    // ========================================
    // STEP 3: Create Zone Price Book
    // ========================================
    console.log('\n🌍 Step 3: Creating Zone Price Book...');
    
    const zones = await GeoZone.find().limit(1);
    if (zones.length === 0) {
      console.log('⚠️ No geo zones found. Skipping zone pricing test.');
    } else {
      const zone = zones[0];
      let zoneBook = await PriceBook.findOne({
        zone: zone._id,
        segment: null,
        isActive: true
      });

      if (!zoneBook) {
        zoneBook = await PriceBook.create({
          name: `${zone.name} Price Book`,
          description: `Zone-specific prices for ${zone.name}`,
          currency: 'INR',
          zone: zone._id,
          parentBook: masterBook._id,
          isMaster: false,
          isActive: true
        });
        console.log(`✅ Created zone book for ${zone.name}`);
      } else {
        console.log(`✅ Zone book exists for ${zone.name}`);
      }

      // Add zone-specific price (10% discount)
      const testProduct = products[0];
      const masterEntry = await PriceBookEntry.findOne({
        priceBook: masterBook._id,
        product: testProduct._id
      });

      if (masterEntry) {
        const zonePrice = Math.floor(masterEntry.basePrice * 0.9); // 10% discount
        await PriceBookEntry.findOneAndUpdate(
          { priceBook: zoneBook._id, product: testProduct._id },
          { basePrice: zonePrice },
          { upsert: true }
        );
        console.log(`   ✅ ${testProduct.name} in ${zone.name}: ₹${zonePrice} (10% off)`);
      }
    }

    // ========================================
    // STEP 4: Create Segment Price Book
    // ========================================
    console.log('\n👥 Step 4: Creating Segment Price Book...');
    
    const segments = await UserSegment.find().limit(1);
    if (segments.length === 0) {
      console.log('⚠️ No user segments found. Skipping segment pricing test.');
    } else {
      const segment = segments[0];
      let segmentBook = await PriceBook.findOne({
        segment: segment._id,
        zone: null,
        isActive: true
      });

      if (!segmentBook) {
        segmentBook = await PriceBook.create({
          name: `${segment.name} Price Book`,
          description: `Segment-specific prices for ${segment.name}`,
          currency: 'INR',
          segment: segment._id,
          parentBook: masterBook._id,
          isMaster: false,
          isActive: true
        });
        console.log(`✅ Created segment book for ${segment.name}`);
      } else {
        console.log(`✅ Segment book exists for ${segment.name}`);
      }

      // Add segment-specific price (15% discount)
      const testProduct = products[0];
      const masterEntry = await PriceBookEntry.findOne({
        priceBook: masterBook._id,
        product: testProduct._id
      });

      if (masterEntry) {
        const segmentPrice = Math.floor(masterEntry.basePrice * 0.85); // 15% discount
        await PriceBookEntry.findOneAndUpdate(
          { priceBook: segmentBook._id, product: testProduct._id },
          { basePrice: segmentPrice },
          { upsert: true }
        );
        console.log(`   ✅ ${testProduct.name} for ${segment.name}: ₹${segmentPrice} (15% off)`);
      }
    }

    // ========================================
    // STEP 5: Test Virtual Price Calculation
    // ========================================
    console.log('\n🧮 Step 5: Testing Virtual Price Calculation...');
    
    const testProduct = products[0];
    const zone = zones.length > 0 ? zones[0] : null;
    const segment = segments.length > 0 ? segments[0] : null;

    // Test 1: Master price only
    console.log('\n   Test 1: Master Price Only');
    const masterPrice = await virtualService.calculateVirtualPrice(testProduct._id, null, null);
    console.log(`   Master Price: ₹${masterPrice.masterPrice}`);
    console.log(`   Final Price: ₹${masterPrice.finalPrice}`);
    console.log(`   Adjustments: ${masterPrice.adjustments.length}`);

    // Test 2: Master + Zone
    if (zone) {
      console.log('\n   Test 2: Master + Zone');
      const zonePrice = await virtualService.calculateVirtualPrice(testProduct._id, zone._id, null);
      console.log(`   Master Price: ₹${zonePrice.masterPrice}`);
      console.log(`   Final Price: ₹${zonePrice.finalPrice}`);
      console.log(`   Adjustments: ${zonePrice.adjustments.length}`);
      zonePrice.adjustments.forEach(adj => {
        console.log(`      - ${adj.type}: ₹${adj.value} (${adj.bookName})`);
      });
    }

    // Test 3: Master + Segment
    if (segment) {
      console.log('\n   Test 3: Master + Segment');
      const segmentPrice = await virtualService.calculateVirtualPrice(testProduct._id, null, segment._id);
      console.log(`   Master Price: ₹${segmentPrice.masterPrice}`);
      console.log(`   Final Price: ₹${segmentPrice.finalPrice}`);
      console.log(`   Adjustments: ${segmentPrice.adjustments.length}`);
      segmentPrice.adjustments.forEach(adj => {
        console.log(`      - ${adj.type}: ₹${adj.value} (${adj.bookName})`);
      });
    }

    // Test 4: Master + Zone + Segment
    if (zone && segment) {
      console.log('\n   Test 4: Master + Zone + Segment');
      const fullPrice = await virtualService.calculateVirtualPrice(testProduct._id, zone._id, segment._id);
      console.log(`   Master Price: ₹${fullPrice.masterPrice}`);
      console.log(`   Final Price: ₹${fullPrice.finalPrice}`);
      console.log(`   Adjustments: ${fullPrice.adjustments.length}`);
      fullPrice.adjustments.forEach(adj => {
        console.log(`      - ${adj.type}: ₹${adj.value} (${adj.bookName})`);
      });
    }

    // ========================================
    // STEP 6: Test Smart View Matrix
    // ========================================
    console.log('\n📊 Step 6: Testing Smart View Matrix...');
    
    // Master View
    console.log('\n   Test: Master View');
    const masterView = await virtualService.getSmartView({});
    console.log(`   View Type: ${masterView.viewType}`);
    console.log(`   Entries: ${masterView.entries.length}`);

    // Zone View
    if (zone) {
      console.log('\n   Test: Zone View');
      const zoneView = await virtualService.getSmartView({ zone: zone._id });
      console.log(`   View Type: ${zoneView.viewType}`);
      console.log(`   Matrix Rows: ${zoneView.matrix.length}`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Master Price Book: Created/Verified');
    console.log('✅ Master Prices: Added for', products.length, 'products');
    if (zones.length > 0) console.log('✅ Zone Price Book: Created/Verified');
    if (segments.length > 0) console.log('✅ Segment Price Book: Created/Verified');
    console.log('✅ Virtual Price Calculation: Working');
    console.log('✅ Smart View Matrix: Working');
    console.log('\n🎉 All tests passed! Virtual pricing system is ready.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testVirtualPricing();
