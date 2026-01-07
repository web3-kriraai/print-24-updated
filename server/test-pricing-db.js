import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Query collections directly 
    const db = mongoose.connection.db;
    
    // Find admin users
    const admins = await db.collection('users').find({ role: 'admin' }).limit(3).toArray();
    console.log('\n📋 Admin Users:', admins.length);
    admins.forEach(u => console.log(`  - ${u.email} (${u.name || 'N/A'})`));

    // Find GeoZones
    const zones = await db.collection('geozones').find().limit(5).toArray();
    console.log('\n🌍 Geo Zones:', zones.length);
    zones.forEach(z => console.log(`  - ${z.name} (${z.level})`));

    // Find UserSegments
    const segments = await db.collection('usersegments').find().limit(5).toArray();
    console.log('\n👥 User Segments:', segments.length);
    segments.forEach(s => console.log(`  - ${s.code} (${s.name || 'N/A'})`));

    // Find PriceBooks
    const books = await db.collection('pricebooks').find().limit(5).toArray();
    console.log('\n📘 Price Books:', books.length);
    books.forEach(b => console.log(`  - ${b.name} (Master: ${b.isMaster})`));

    // Find PriceBookEntries
    const entries = await db.collection('pricebookentries').find().limit(5).toArray();
    console.log('\n📝 Price Book Entries:', entries.length);
    entries.forEach(e => console.log(`  - Product: ${e.product}, Price: ${e.basePrice}`));

    // Find PriceModifiers
    const modifiers = await db.collection('pricemodifiers').find().limit(5).toArray();
    console.log('\n💰 Price Modifiers:', modifiers.length);
    modifiers.forEach(m => console.log(`  - ${m.name || 'N/A'} (Applies to: ${m.appliesTo})`));

    await mongoose.disconnect();
    console.log('\n✅ Database Check Complete!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

test();
