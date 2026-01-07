import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VirtualPriceBookService from './src/services/VirtualPriceBookService.js';
dotenv.config();

/**
 * Direct API Test for Modifier Stacking
 */
async function testStackingAPI() {
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

    console.log('\n🎯 Stacking Test Result:');
    console.log('  Master Price:', `₹${result.masterPrice.toFixed(2)}`);
    console.log('\n  Adjustments Applied:');
    
    result.adjustments.forEach((adj, idx) => {
      if (adj.type === 'MODIFIER') {
        const sign = adj.change >= 0 ? '+' : '';
        console.log(`    ${idx + 1}. ${adj.modifierName} (${adj.modifierType}): ${sign}₹${adj.change.toFixed(2)}`);
      }
    });

    console.log('\n  ✅ Final Price:', `₹${result.finalPrice.toFixed(2)}`);
    console.log('  💡 Expected:', '₹98.18 (or ₹98.17 due to rounding)');
    
    const isCorrect = Math.abs(result.finalPrice - 98.175) < 0.01;
    console.log('\n  🏆 Stacking Working:', isCorrect ? '✅ YES' : '❌ NO');

    await mongoose.disconnect();
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

testStackingAPI();
