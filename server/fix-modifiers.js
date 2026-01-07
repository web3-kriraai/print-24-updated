import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Fix User's Modifiers
 */
async function fixModifiers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('\n🔧 Applying Fixes...\n');

    // Fix 1: Name the unnamed product modifier
    const fix1 = await db.collection('pricemodifiers').updateOne(
      { 
        appliesTo: 'PRODUCT',
        modifierType: 'PERCENT_DEC',
        value: 10,
        name: { $exists: false }
      },
      { $set: { name: 'Product Discount' } }
    );

    if (fix1.modifiedCount > 0) {
      console.log('✅ Fix 1: Named the product modifier "Product Discount"');
    } else {
      console.log('⚠️  Fix 1: No unnamed product modifier found');
    }

    // Fix 2: Update Holiday Season from 5% to 10%
    const fix2 = await db.collection('pricemodifiers').updateOne(
      { name: 'Holiday Season Surcharge' },
      { $set: { value: 10 } }
    );

    if (fix2.modifiedCount > 0) {
      console.log('✅ Fix 2: Updated Holiday Season from 5% to 10%');
    } else {
      console.log('⚠️  Fix 2: Holiday Season not found or already 10%');
    }

    console.log('\n📊 Testing Calculation...\n');

    // Get IDs
    const southIndia = await db.collection('geozones').findOne({ name: /South/i });
    const vipSegment = await db.collection('usersegments').findOne({ code: 'VIP' });
    const laserPen = await db.collection('products').findOne({ name: /Laser/i });

    // Import and test
    const VirtualPriceBookService = (await import('./src/services/VirtualPriceBookService.js')).default;
    const service = new VirtualPriceBookService();
    
    const result = await service.calculateVirtualPrice(
      laserPen._id,
      southIndia._id,
      vipSegment._id
    );

    console.log('  Master Price:', `₹${result.masterPrice.toFixed(2)}`);
    console.log('\n  Applied Modifiers:');
    
    result.adjustments.forEach((adj, idx) => {
      if (adj.type === 'MODIFIER') {
        const sign = adj.change >= 0 ? '+' : '';
        console.log(`    ${adj.modifierName}: ${sign}₹${adj.change.toFixed(2)}`);
      }
    });

    console.log('\n  ✅ Final Price:', `₹${result.finalPrice.toFixed(2)}`);
    console.log('  💡 Expected:', '₹94.25');

    const isCorrect = Math.abs(result.finalPrice - 94.25) < 0.10;
    console.log('\n  🏆 Fixed:', isCorrect ? '✅ YES' : '❌ NO');

    await mongoose.disconnect();
    console.log('\n✅ All fixes applied! Refresh the UI to see changes.');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

fixModifiers();
