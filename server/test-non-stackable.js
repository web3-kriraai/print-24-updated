import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Test Non-Stackable Modifiers
 * This script adds two non-stackable zone modifiers and tests which one is applied
 */
async function testNonStackable() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get zone
    const southIndia = await db.collection('geozones').findOne({ name: /South/i });
    
    if (!southIndia) {
      console.log('❌ South India zone not found');
      process.exit(1);
    }

    // Update existing South India modifier to be NON-stackable
    await db.collection('pricemodifiers').updateOne(
      { name: 'South India Adjustment' },
      { $set: { isStackable: false } }
    );
    console.log('✅ Updated South India +5% to isStackable: false');

    // Add a second NON-stackable zone modifier for South India
    const existingP2 = await db.collection('pricemodifiers').findOne({ 
      name: 'South India Premium' 
    });

    if (!existingP2) {
      await db.collection('pricemodifiers').insertOne({
        name: 'South India Premium',
        description: 'Premium surcharge for South India (NON-STACKABLE)',
        appliesTo: 'ZONE',
        geoZone: southIndia._id,
        appliesOn: 'UNIT',
        modifierType: 'PERCENT_INC',
        value: 12, // Higher than the 5%
        isActive: true,
        isStackable: false, // NOT STACKABLE
        priority: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Created: South India Premium +12% (NON-STACKABLE)');
    } else {
      console.log('⏭️ Already exists: South India Premium');
    }

    console.log('\n📊 Non-Stackable Test Scenario:');
    console.log('  Product: Laser Printed Pen (₹100)');
    console.log('  Zone Modifier P1: South India +5% (NON-STACKABLE)');
    console.log('  Zone Modifier P2: South India Premium +12% (NON-STACKABLE)');
    console.log('  Segment: VIP Customer -15% (STACKABLE)');
    console.log('\n💡 Expected Behavior:');
    console.log('  Since P1 and P2 are BOTH non-stackable and in the same category (ZONE),');
    console.log('  only the BEST one should apply.');
    console.log('  Best = highest increase = P2 (+12%)');
    console.log('\n📐 Expected Calculation:');
    console.log('  Step 1: ₹100.00 (Base Price)');
    console.log('  Step 2: ₹100.00 × 1.12 = ₹112.00 (P2: +12% - BEST non-stackable)');
    console.log('  Step 3: ₹112.00 × 0.85 = ₹95.20 (VIP -15% - STACKABLE)');
    console.log('\n💰 Expected Final Price: ₹95.20');
    console.log('\n🔄 Compare with Stackable:');
    console.log('  If both were stackable:');
    console.log('  ₹100 × 1.05 × 1.12 × 0.85 = ₹100.30');

    await mongoose.disconnect();
    console.log('\n✅ Test data ready!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

testNonStackable();
