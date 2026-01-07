/**
 * Comprehensive Test Data Generation Script
 * Creates all necessary data for testing the pricing engine
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/print24';

async function generateCompleteTestData() {
  console.log('🌱 Starting Comprehensive Test Data Generation...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Dynamic imports
    const GeoZone = (await import('../src/models/GeoZon.js')).default;
    const GeoZoneMapping = (await import('../src/models/GeoZonMapping.js')).default;
    const UserSegment = (await import('../src/models/UserSegment.js')).default;
    const PriceBook = (await import('../src/models/PriceBook.js')).default;
    const PriceBookEntry = (await import('../src/models/PriceBookEntry.js')).default;
    const PriceModifier = (await import('../src/models/PriceModifier.js')).default;
    const ProductAvailability = (await import('../src/models/ProductAvailability.js')).default;
    const Product = (await import('../src/models/productModal.js')).default;
    const Category = (await import('../src/models/categoryModal.js')).default;

    // Track created data
    const data = {};

    // ============================================
    // 1. GEO ZONES - Hierarchical Structure
    // ============================================
    console.log('📍 Creating Geo Zones...');

    // Clear existing test data
    await GeoZone.deleteMany({ code: { $regex: /^TEST_/ } });
    await GeoZoneMapping.deleteMany({ zipCode: { $regex: /^TEST_/ } });

    // Create USA hierarchy
    data.usa = await GeoZone.create({
      name: 'Test United States',
      code: 'TEST_US',
      level: 'COUNTRY',
      currency: 'USD',
      isActive: true
    });

    // States
    const states = [
      { name: 'Test New York', code: 'TEST_NY' },
      { name: 'Test California', code: 'TEST_CA' },
      { name: 'Test Florida', code: 'TEST_FL' },
      { name: 'Test Texas', code: 'TEST_TX' }
    ];

    data.states = [];
    for (const state of states) {
      const zone = await GeoZone.create({
        name: state.name,
        code: state.code,
        level: 'STATE',
        parentZone: data.usa._id,
        isActive: true
      });
      data.states.push(zone);
    }

    // Cities
    const cities = [
      { name: 'Test NYC', code: 'TEST_NYC', parent: 'TEST_NY' },
      { name: 'Test Los Angeles', code: 'TEST_LA', parent: 'TEST_CA' },
      { name: 'Test Miami', code: 'TEST_MIA', parent: 'TEST_FL' }
    ];

    data.cities = [];
    for (const city of cities) {
      const parentZone = data.states.find(s => s.code === city.parent);
      const zone = await GeoZone.create({
        name: city.name,
        code: city.code,
        level: 'CITY',
        parentZone: parentZone._id,
        isActive: true
      });
      data.cities.push(zone);
    }

    // Zip codes
    const zips = [
      { code: 'TEST_10001', parent: 'TEST_NYC', zip: 'TEST_10001' },
      { code: 'TEST_10002', parent: 'TEST_NYC', zip: 'TEST_10002' },
      { code: 'TEST_90210', parent: 'TEST_LA', zip: 'TEST_90210' },
      { code: 'TEST_33101', parent: 'TEST_MIA', zip: 'TEST_33101' }
    ];

    data.zips = [];
    for (const zip of zips) {
      const parentZone = data.cities.find(c => c.code === zip.parent);
      const zone = await GeoZone.create({
        name: `Test Zip ${zip.zip}`,
        code: zip.code,
        level: 'ZIP',
        parentZone: parentZone._id,
        isActive: true
      });
      data.zips.push(zone);

      // Create mapping
      await GeoZoneMapping.create({
        geoZone: zone._id,
        zipCode: zip.zip
      });
    }

    console.log(`   ✅ Created ${1 + states.length + cities.length + zips.length} zones\n`);

    // ============================================
    // 2. USER SEGMENTS
    // ============================================
    console.log('👥 Creating User Segments...');

    const segments = [
      { code: 'RETAIL', name: 'Retail Customer', isDefault: true },
      { code: 'PRINT_PARTNER', name: 'Print Partner' },
      { code: 'CORPORATE', name: 'Corporate Client' },
      { code: 'VIP', name: 'VIP Customer' }
    ];

    data.segments = [];
    for (const seg of segments) {
      let segment = await UserSegment.findOne({ code: seg.code });
      if (!segment) {
        segment = await UserSegment.create(seg);
      }
      data.segments.push(segment);
    }

    console.log(`   ✅ Created/verified ${segments.length} segments\n`);

    // ============================================
    // 3. CATEGORIES & PRODUCTS
    // ============================================
    console.log('📦 Creating Test Categories and Products...');

    // Check for existing category or create
    let category = await Category.findOne({ name: 'Test Visiting Cards' });
    if (!category) {
      category = await Category.create({
        name: 'Test Visiting Cards',
        type: 'Digital',
        slug: 'test-visiting-cards'
      });
    }
    data.category = category;

    // Create products
    data.products = [];
    for (let i = 1; i <= 10; i++) {
      let product = await Product.findOne({ sku: `TEST-VC-${String(i).padStart(3, '0')}` });
      if (!product) {
        product = await Product.create({
          name: `Test Visiting Card ${i}`,
          sku: `TEST-VC-${String(i).padStart(3, '0')}`,
          category: category._id,
          isActive: true
        });
      }
      data.products.push(product);
    }

    console.log(`   ✅ Created ${data.products.length} products\n`);

    // ============================================
    // 4. PRICE BOOKS
    // ============================================
    console.log('💰 Creating Price Books...');

    // Clear existing test price books
    await PriceBook.deleteMany({ name: { $regex: /^Test/ } });

    // Master Price Book
    data.masterBook = await PriceBook.create({
      name: 'Test Master USD',
      currency: 'USD',
      isMaster: true,
      isDefault: true
    });

    // Zone-specific Price Books
    data.zonePriceBooks = [];
    for (const state of data.states.slice(0, 2)) {
      const book = await PriceBook.create({
        name: `Test ${state.name.replace('Test ', '')} Pricing`,
        parentBook: data.masterBook._id,
        zone: state._id,
        calculationLogic: 'MASTER_PLUS_ZONE',
        isVirtual: true
      });
      data.zonePriceBooks.push(book);
    }

    // Segment-specific Price Books
    data.segmentPriceBooks = [];
    for (const seg of data.segments.slice(1, 3)) {
      const book = await PriceBook.create({
        name: `Test ${seg.name} Pricing`,
        parentBook: data.masterBook._id,
        segment: seg._id,
        calculationLogic: 'MASTER_PLUS_SEGMENT',
        isVirtual: true
      });
      data.segmentPriceBooks.push(book);
    }

    console.log(`   ✅ Created ${1 + data.zonePriceBooks.length + data.segmentPriceBooks.length} price books\n`);

    // ============================================
    // 5. PRICE BOOK ENTRIES
    // ============================================
    console.log('💵 Creating Price Book Entries...');

    // Clear existing entries for master book
    await PriceBookEntry.deleteMany({ priceBook: data.masterBook._id });

    // Add base prices (random between 50-150)
    for (const product of data.products) {
      const basePrice = 50 + Math.floor(Math.random() * 100);
      await PriceBookEntry.create({
        priceBook: data.masterBook._id,
        product: product._id,
        basePrice,
        compareAtPrice: basePrice * 1.2
      });
    }

    console.log(`   ✅ Created ${data.products.length} price entries\n`);

    // ============================================
    // 6. PRICE MODIFIERS
    // ============================================
    console.log('🏷️  Creating Price Modifiers...');

    // Clear existing test modifiers
    await PriceModifier.deleteMany({ name: { $regex: /^Test/ } });

    data.modifiers = [];

    // Global discount
    data.modifiers.push(await PriceModifier.create({
      name: 'Test Holiday Sale',
      appliesTo: 'GLOBAL',
      modifierType: 'PERCENT_DEC',
      value: 10,
      validFrom: new Date('2026-12-01'),
      validTo: new Date('2026-12-31'),
      isActive: true,
      isStackable: true,
      priority: 1
    }));

    // Zone-specific modifier
    data.modifiers.push(await PriceModifier.create({
      name: 'Test NY Summer Discount',
      appliesTo: 'ZONE',
      geoZone: data.states[0]._id, // NY
      modifierType: 'PERCENT_DEC',
      value: 15,
      validFrom: new Date('2026-06-01'),
      validTo: new Date('2026-08-31'),
      isActive: true,
      isStackable: true,
      priority: 2
    }));

    // Segment-specific modifier
    data.modifiers.push(await PriceModifier.create({
      name: 'Test VIP Exclusive',
      appliesTo: 'SEGMENT',
      userSegment: data.segments.find(s => s.code === 'VIP')._id,
      modifierType: 'PERCENT_DEC',
      value: 20,
      isActive: true,
      isStackable: false, // Exclusive
      priority: 10
    }));

    // Product-specific modifier
    data.modifiers.push(await PriceModifier.create({
      name: 'Test Bulk Order Discount',
      appliesTo: 'PRODUCT',
      product: data.products[0]._id,
      modifierType: 'PERCENT_DEC',
      value: 5,
      minQuantity: 10,
      maxQuantity: 50,
      appliesOn: 'SUBTOTAL',
      isActive: true,
      isStackable: true,
      priority: 3
    }));

    // Combination modifier (JSON rule)
    data.modifiers.push(await PriceModifier.create({
      name: 'Test Florida Cards Promo',
      appliesTo: 'COMBINATION',
      modifierType: 'PERCENT_DEC',
      value: 5,
      conditions: {
        AND: [
          { field: 'geo_zone', operator: 'EQUALS', value: 'TEST_FL' },
          { field: 'category', operator: 'EQUALS', value: data.category._id.toString() }
        ]
      },
      isActive: true,
      isStackable: true,
      priority: 5
    }));

    console.log(`   ✅ Created ${data.modifiers.length} modifiers\n`);

    // ============================================
    // 7. PRODUCT AVAILABILITY
    // ============================================
    console.log('🔒 Creating Product Availability Rules...');

    // Clear existing test rules
    await ProductAvailability.deleteMany({ 
      product: { $in: data.products.map(p => p._id) } 
    });

    // All products available in USA
    for (const product of data.products) {
      await ProductAvailability.create({
        product: product._id,
        geoZone: data.usa._id,
        isSellable: true
      });
    }

    // One product restricted in Florida
    await ProductAvailability.create({
      product: data.products[5]._id,
      geoZone: data.states.find(s => s.code === 'TEST_FL')._id,
      isSellable: false,
      reason: 'Test: Not available due to licensing'
    });

    console.log(`   ✅ Created ${data.products.length + 1} availability rules\n`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('='.repeat(50));
    console.log('📊 TEST DATA GENERATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`
   Geo Zones:
     - 1 Country (USA)
     - ${states.length} States
     - ${cities.length} Cities
     - ${zips.length} Zip Codes
   
   User Segments: ${segments.length}
   Products: ${data.products.length}
   
   Price Books:
     - 1 Master Book
     - ${data.zonePriceBooks.length} Zone Books
     - ${data.segmentPriceBooks.length} Segment Books
   
   Modifiers: ${data.modifiers.length}
   Availability Rules: ${data.products.length + 1}
`);
    console.log('🎯 Ready for testing!\n');

    return data;

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (import.meta.url === process.argv[1]) {
  generateCompleteTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default { generateCompleteTestData };
