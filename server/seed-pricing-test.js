import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function seedDynamicPricingTestData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get existing data
    const masterPriceBook = await db.collection('pricebooks').findOne({ isMaster: true });
    const zones = await db.collection('geozones').find().toArray();
    const segments = await db.collection('usersegments').find().toArray();
    const products = await db.collection('products').find().limit(5).toArray();

    console.log('\n📋 Existing Data:');
    console.log('  Master Price Book:', masterPriceBook?.name);
    console.log('  Zones:', zones.length);
    console.log('  Segments:', segments.length);
    console.log('  Products:', products.length);

    if (!masterPriceBook) {
      console.log('❌ No Master Price Book found!');
      process.exit(1);
    }

    // Get zone and segment IDs
    const northIndia = zones.find(z => z.name.includes('North'));
    const southIndia = zones.find(z => z.name.includes('South'));
    const eastIndia = zones.find(z => z.name.includes('East'));
    const vipSegment = segments.find(s => s.code === 'VIP');
    const corporateSegment = segments.find(s => s.code === 'CORPORATE');

    console.log('\n🎯 Target Zones & Segments:');
    console.log('  North India:', northIndia?._id);
    console.log('  South India:', southIndia?._id);
    console.log('  VIP Segment:', vipSegment?._id);
    console.log('  Corporate:', corporateSegment?._id);

    // Add more price book entries for products
    console.log('\n💰 Adding Price Book Entries...');
    for (let i = 0; i < Math.min(3, products.length); i++) {
      const product = products[i];
      const basePrice = (i + 1) * 100; // 100, 200, 300
      
      const existing = await db.collection('pricebookentries').findOne({
        priceBook: masterPriceBook._id,
        product: product._id
      });

      if (!existing) {
        await db.collection('pricebookentries').insertOne({
          priceBook: masterPriceBook._id,
          product: product._id,
          basePrice: basePrice,
          compareAtPrice: basePrice + (basePrice * 0.1),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`  ✅ Added: ${product.name || product._id} = ₹${basePrice}`);
      } else {
        console.log(`  ⏭️ Exists: ${product.name || product._id} = ₹${existing.basePrice}`);
      }
    }

    // Create Price Modifiers
    console.log('\n📊 Creating Price Modifiers...');

    // Zone Modifier: North India +10%
    if (northIndia) {
      const existingMod = await db.collection('pricemodifiers').findOne({ 
        name: 'North India Surcharge' 
      });
      if (!existingMod) {
        await db.collection('pricemodifiers').insertOne({
          name: 'North India Surcharge',
          description: '10% surcharge for North India zone',
          appliesTo: 'ZONE',
          geoZone: northIndia._id,
          appliesOn: 'UNIT',
          modifierType: 'PERCENT_INC',
          value: 10,
          isActive: true,
          isStackable: true,
          priority: 10,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('  ✅ Created: North India +10%');
      } else {
        console.log('  ⏭️ Exists: North India Surcharge');
      }
    }

    // Zone Modifier: South India +5%
    if (southIndia) {
      const existingMod = await db.collection('pricemodifiers').findOne({ 
        name: 'South India Adjustment' 
      });
      if (!existingMod) {
        await db.collection('pricemodifiers').insertOne({
          name: 'South India Adjustment',
          description: '5% surcharge for South India zone',
          appliesTo: 'ZONE',
          geoZone: southIndia._id,
          appliesOn: 'UNIT',
          modifierType: 'PERCENT_INC',
          value: 5,
          isActive: true,
          isStackable: true,
          priority: 10,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('  ✅ Created: South India +5%');
      } else {
        console.log('  ⏭️ Exists: South India Adjustment');
      }
    }

    // Segment Modifier: VIP -15%
    if (vipSegment) {
      const existingMod = await db.collection('pricemodifiers').findOne({ 
        name: 'VIP Discount' 
      });
      if (!existingMod) {
        await db.collection('pricemodifiers').insertOne({
          name: 'VIP Discount',
          description: '15% discount for VIP customers',
          appliesTo: 'SEGMENT',
          userSegment: vipSegment._id,
          appliesOn: 'UNIT',
          modifierType: 'PERCENT_DEC',
          value: 15,
          isActive: true,
          isStackable: true,
          priority: 20,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('  ✅ Created: VIP -15%');
      } else {
        console.log('  ⏭️ Exists: VIP Discount');
      }
    }

    // Segment Modifier: Corporate -10%
    if (corporateSegment) {
      const existingMod = await db.collection('pricemodifiers').findOne({ 
        name: 'Corporate Discount' 
      });
      if (!existingMod) {
        await db.collection('pricemodifiers').insertOne({
          name: 'Corporate Discount',
          description: '10% discount for Corporate clients',
          appliesTo: 'SEGMENT',
          userSegment: corporateSegment._id,
          appliesOn: 'UNIT',
          modifierType: 'PERCENT_DEC',
          value: 10,
          isActive: true,
          isStackable: true,
          priority: 15,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('  ✅ Created: Corporate -10%');
      } else {
        console.log('  ⏭️ Exists: Corporate Discount');
      }
    }

    // Set Product Availability restrictions
    console.log('\n🚫 Setting Product Availability...');
    if (eastIndia && products.length > 0) {
      const existingAvail = await db.collection('productavailabilities').findOne({
        product: products[0]._id,
        geoZone: eastIndia._id
      });
      if (!existingAvail) {
        await db.collection('productavailabilities').insertOne({
          product: products[0]._id,
          geoZone: eastIndia._id,
          isSellable: false,
          reason: 'Product not available in East India region',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`  ✅ Restricted: ${products[0].name || 'Product 1'} in East India`);
      } else {
        console.log('  ⏭️ Restriction exists for East India');
      }
    }

    // Summary
    console.log('\n📈 Final Summary:');
    const priceEntries = await db.collection('pricebookentries').countDocuments();
    const modifiers = await db.collection('pricemodifiers').countDocuments();
    const restrictions = await db.collection('productavailabilities').countDocuments();
    
    console.log(`  Price Book Entries: ${priceEntries}`);
    console.log(`  Price Modifiers: ${modifiers}`);
    console.log(`  Availability Restrictions: ${restrictions}`);

    await mongoose.disconnect();
    console.log('\n✅ Seed Complete! Test data is ready.');
    console.log('\n🧪 Now go to Smart View Matrix to verify:');
    console.log('   1. Master View - see base prices');
    console.log('   2. Select North India - should show +10% prices');
    console.log('   3. Select VIP segment - should show -15% discount');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

seedDynamicPricingTestData();
