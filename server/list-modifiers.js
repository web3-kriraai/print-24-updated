import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function listAllModifiers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    const modifiers = await db.collection('pricemodifiers').find({ isActive: true }).toArray();
    
    console.log(`\n📊 Found ${modifiers.length} Active Modifiers:\n`);
    
    modifiers.forEach((mod, idx) => {
      console.log(`${idx + 1}. ${mod.name || 'UNNAMED'}`);
      console.log(`   Type: ${mod.modifierType}`);
      console.log(`   Value: ${mod.value}`);
      console.log(`   Applies To: ${mod.appliesTo}`);
      console.log(`   Priority: ${mod.priority || 0}`);
      console.log(`   Stackable: ${mod.isStackable}`);
      console.log('');
    });

    await mongoose.disconnect();
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

listAllModifiers();
