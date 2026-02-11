import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to fix BulkOrder collection indexes
 * Removes the obsolete poNumber_1 unique index that's causing duplicate key errors
 */

const MONGODB_URI = process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/test';

async function fixBulkOrderIndexes() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected successfully');

        const db = mongoose.connection.db;
        const collection = db.collection('bulkorders');

        // Get existing indexes
        console.log('\n📋 Current indexes:');
        const indexes = await collection.indexes();
        indexes.forEach(index => {
            console.log(`   - ${index.name}:`, JSON.stringify(index.key));
        });

        // Check if poNumber_1 index exists
        const hasPoNumberIndex = indexes.some(index => index.name === 'poNumber_1');

        if (hasPoNumberIndex) {
            console.log('\n🗑️  Dropping obsolete poNumber_1 index...');
            await collection.dropIndex('poNumber_1');
            console.log('✅ Dropped poNumber_1 index successfully');
        } else {
            console.log('\n✓ poNumber_1 index not found (already removed or never existed)');
        }

        // Verify final indexes
        console.log('\n📋 Final indexes:');
        const finalIndexes = await collection.indexes();
        finalIndexes.forEach(index => {
            console.log(`   - ${index.name}:`, JSON.stringify(index.key));
        });

        console.log('\n✅ Index fix completed successfully!');
        console.log('💡 You can now upload PDFs without duplicate key errors');

    } catch (error) {
        console.error('❌ Error fixing indexes:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB connection closed');
        process.exit(0);
    }
}

fixBulkOrderIndexes();
