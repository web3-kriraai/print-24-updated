import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupBadModifiers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Remove unnamed/bad modifiers
    const result = await db.collection('pricemodifiers').deleteMany({ 
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' }
      ]
    });
    
    console.log(`\n🗑️  Removed ${result.deletedCount} unnamed/bad modifiers`);

    await mongoose.disconnect();
    console.log('✅ Cleanup complete!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

cleanupBadModifiers();
