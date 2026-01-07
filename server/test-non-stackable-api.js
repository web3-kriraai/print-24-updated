import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VirtualPriceBookService from './src/services/VirtualPriceBookService.js';
dotenv.config();

/**
 * Direct API Test for Non-Stackable Modifiers
 */
async function testNonStackableAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get IDs
    const southIndia = await db.collection('geozones').findOne({ name: /South/i });
    const vipSegment = await db.collection('usersegments').findOne({ code: 'VIP' });
    const laserPen = await db.collection('products').findOne({ name: /Laser/i });

    console.log('\n🔍 Test Data IDs:');
    console.log('  South India:', southIndia?._id);
    console.log('  VIP Segment:', vipSegment?._id);
    console.log('  Laser Pen:', laserPen?._id);

    if (!southIndia || !vipSegment || !laserPen) {
      console.log('❌ Missing required data');
      process.exit(1);
    }

    // Test the calculation
    const service = new VirtualPriceBookService();
    const result = await service.calculateVirtualPrice(
      laserPen._id,
      southIndia._id,
      vipSegment._id
    );

    console.log('\n🎯 Non-Stackable Test Result:');
    console.log('  Master Price:', `₹${result.masterPrice.toFixed(2)}`);
    console.log('\n  Modifiers Applied:');
    
    let zoneModCount = 0;
    result.adjustments.forEach((adj, idx) => {
      if (adj.type === 'MODIFIER') {
        const sign = adj.change >= 0 ? '+' : '';
        const stackable = adj.isStackable ? 'STACKABLE' : 'NON-STACKABLE';
        console.log(`    ${idx + 1}. ${adj.modifierName} (${stackable}): ${sign}₹${adj.change.toFixed(2)}`);
        if (adj.appliesTo === 'ZONE') zoneModCount++;
      }
    });

    console.log('\n  ✅ Final Price:', `₹${result.finalPrice.toFixed(2)}`);
    console.log('  💡 Expected:', '₹95.20');
    console.log('\n  🔍 Zone Modifiers Applied:', zoneModCount);
    console.log('  💡 Expected: 1 (only the best non-stackable)');
    
    const isCorrect = Math.abs(result.finalPrice - 95.20) < 0.01;
    const onlyOneMod = zoneModCount === 1;
    console.log('\n  🏆 Non-Stackable Working:', isCorrect && onlyOneMod ? '✅ YES' : '❌ NO');

    if (!isCorrect || !onlyOneMod) {
      console.log('\n  ⚠️  Issue detected:');
      if (!onlyOneMod) console.log('     - Multiple zone modifiers applied (expected 1)');
      if (!isCorrect) console.log('     - Final price mismatch');
    }

    await mongoose.disconnect();
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

testNonStackableAPI();
