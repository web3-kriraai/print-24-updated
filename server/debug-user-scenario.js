import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VirtualPriceBookService from './src/services/VirtualPriceBookService.js';
dotenv.config();

/**
 * Debug User's Scenario
 */
async function debugUserScenario() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all the data
    const southIndia = await db.collection('geozones').findOne({ name: /South/i });
    const vipSegment = await db.collection('usersegments').findOne({ code: 'VIP' });
    const laserPen = await db.collection('products').findOne({ name: /Laser/i });

    console.log('\n📋 User\'s Expected Scenario:');
    console.log('  1. Product Discount: -10% (NON-STACKABLE, priority 15)');
    console.log('  2. VIP Discount: -15% (STACKABLE, priority 20)');
    console.log('  3. Holiday Season: +10% (NON-STACKABLE, priority 30)');
    console.log('  4. South India: +12% (already exists)');

    // Check what modifiers actually exist
    console.log('\n🔍 Checking Actual Modifiers...');
    const allModifiers = await db.collection('pricemodifiers').find({
      isActive: true,
      $or: [
        { geoZone: southIndia._id },
        { userSegment: vipSegment._id },
        { product: laserPen._id },
        { appliesTo: 'GLOBAL' }
      ]
    }).toArray();

    console.log(`\nFound ${allModifiers.length} modifiers:`);
    allModifiers.forEach((mod, idx) => {
      console.log(`  ${idx + 1}. ${mod.name}`);
      console.log(`     Type: ${mod.modifierType}, Value: ${mod.value}%`);
      console.log(`     Applies To: ${mod.appliesTo}`);
      console.log(`     Stackable: ${mod.isStackable !== false ? 'YES' : 'NO'}`);
      console.log(`     Priority: ${mod.priority || 0}`);
    });

    // Test calculation
    console.log('\n💰 Calculating Price...');
    const service = new VirtualPriceBookService();
    const result = await service.calculateVirtualPrice(
      laserPen._id,
      southIndia._id,
      vipSegment._id
    );

    console.log('\n📊 Result:');
    console.log('  Master Price:', `₹${result.masterPrice.toFixed(2)}`);
    console.log('\n  Modifiers Applied:');
    
    result.adjustments.forEach((adj, idx) => {
      if (adj.type === 'MODIFIER') {
        const sign = adj.change >= 0 ? '+' : '';
        const stackable = adj.isStackable ? '(STACKABLE)' : '(NON-STACKABLE)';
        console.log(`    ${idx + 1}. ${adj.modifierName} ${stackable}`);
        console.log(`       ${adj.modifierType} ${adj.value}%: ${sign}₹${adj.change.toFixed(2)}`);
      }
    });

    console.log('\n  ✅ Final Price:', `₹${result.finalPrice.toFixed(2)}`);
    
    // Expected calculation
    console.log('\n📐 Manual Calculation Check:');
    let price = 100;
    console.log(`  Base: ₹${price.toFixed(2)}`);
    
    // Apply each modifier manually based on priority
    const sortedMods = result.adjustments.filter(a => a.type === 'MODIFIER')
      .sort((a, b) => {
        const prioA = allModifiers.find(m => m.name === a.modifierName)?.priority || 0;
        const prioB = allModifiers.find(m => m.name === b.modifierName)?.priority || 0;
        return prioA - prioB;
      });

    sortedMods.forEach(adj => {
      const before = price;
      if (adj.modifierType === 'PERCENT_INC') {
        price = price * (1 + adj.value / 100);
      } else if (adj.modifierType === 'PERCENT_DEC') {
        price = price * (1 - adj.value / 100);
      }
      console.log(`  ${adj.modifierName}: ₹${before.toFixed(2)} → ₹${price.toFixed(2)}`);
    });

    await mongoose.disconnect();
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

debugUserScenario();
