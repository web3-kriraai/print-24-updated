import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Test Modifier Stacking Feature
 * This script adds a GLOBAL modifier to demonstrate stacking
 */
async function testModifierStacking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Add a GLOBAL modifier: +10% Holiday Surcharge
    console.log('\n📊 Adding GLOBAL Modifier for Stacking Test...');
    
    const existingGlobal = await db.collection('pricemodifiers').findOne({ 
      name: 'Holiday Season Surcharge' 
    });

    if (!existingGlobal) {
      await db.collection('pricemodifiers').insertOne({
        name: 'Holiday Season Surcharge',
        description: '10% surcharge during holiday season (GLOBAL)',
        appliesTo: 'GLOBAL',
        appliesOn: 'UNIT',
        modifierType: 'PERCENT_INC',
        value: 10,
        isActive: true,
        isStackable: true,
        priority: 30, // Applied after zone and segment
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('  ✅ Created: Holiday Season +10% (GLOBAL)');
    } else {
      console.log('  ⏭️ Already exists: Holiday Season Surcharge');
    }

    // Summary
    console.log('\n🧪 Stacking Test Scenario:');
    console.log('  Product: Laser Printed Pen (₹100)');
    console.log('  Zone: South India (+5%)');
    console.log('  Segment: VIP Customer (-15%)');
    console.log('  Global: Holiday Season (+10%)');
    console.log('\n📐 Expected Calculation:');
    console.log('  Step 1: ₹100.00 (Base Price)');
    console.log('  Step 2: ₹100.00 × 1.05 = ₹105.00 (South India +5%)');
    console.log('  Step 3: ₹105.00 × 0.85 = ₹89.25 (VIP -15%)');
    console.log('  Step 4: ₹89.25 × 1.10 = ₹98.18 (Holiday +10%)');
    console.log('\n💡 Final Price: ₹98.18');
    console.log('\n🎯 Go to Smart View Matrix and select:');
    console.log('   - Zone: South India');
    console.log('   - Segment: VIP Customer');
    console.log('   - Product: Laser Printed Pen');
    console.log('\n   You should see ₹98.18 (or ₹98.17 due to rounding)');

    await mongoose.disconnect();
    console.log('\n✅ Test data ready!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

testModifierStacking();
