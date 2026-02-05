// Database cleanup script to free up MongoDB Atlas space
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import AttributeImageMatrix from './src/models/AttributeImageMatrix.js';

const run = async () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to database\n');

    // Check current counts
    const totalBefore = await AttributeImageMatrix.countDocuments({});
    const missingCount = await AttributeImageMatrix.countDocuments({ status: 'MISSING' });

    console.log(`Current matrix entries: ${totalBefore}`);
    console.log(`MISSING entries: ${missingCount}`);
    console.log(`UPLOADED entries: ${totalBefore - missingCount}\n`);

    if (missingCount > 0) {
        console.log(`Deleting ${missingCount} MISSING entries...`);
        const result = await AttributeImageMatrix.deleteMany({ status: 'MISSING' });
        console.log(`✓ Deleted ${result.deletedCount} entries`);
    } else {
        console.log('No MISSING entries to delete');
    }

    const totalAfter = await AttributeImageMatrix.countDocuments({});
    console.log(`\nRemaining entries: ${totalAfter}`);

    await mongoose.disconnect();
    console.log('\n✓ Done');
};

run().catch(console.error);
