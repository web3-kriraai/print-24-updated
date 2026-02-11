import mongoose from 'mongoose';

/**
 * Database Migration: Clean up obsolete indexes
 * Run this once to fix the bulk upload duplicate key error
 */

export async function cleanupObsoleteIndexes() {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.warn('⚠️  Database not connected, skipping index cleanup');
            return;
        }

        const collection = db.collection('bulkorders');

        // Get all indexes
        const indexes = await collection.indexes();

        // Check for obsolete poNumber index
        const hasPoNumberIndex = indexes.some(index => index.name === 'poNumber_1');

        if (hasPoNumberIndex) {
            console.log('🗑️  Found obsolete poNumber_1 index, dropping it...');
            await collection.dropIndex('poNumber_1');
            console.log('✅ Successfully dropped obsolete poNumber_1 index');
        }
    } catch (error) {
        // Silently fail - index might not exist
        if (error.code === 27) {
            // Index not found - that's okay
            return;
        }
        console.warn('⚠️  Could not clean up obsolete indexes:', error.message);
    }
}
