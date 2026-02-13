/**
 * Migration Script: Assign Retail Customer Segment to Users
 * 
 * Run with: node scripts/assign-retail-segment.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function assignRetailSegment() {
    try {
        // Connect to MongoDB - try different env variable names
        const mongoUri = process.env.MONGO_URI_PRICING || process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!mongoUri) {
            console.error('❌ MongoDB URI not found in .env file');
            console.log('   Looked for: MONGO_URI_PRICING, MONGODB_URI, MONGO_URI');
            process.exit(1);
        }

        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Import models
        const { User } = await import('../src/models/User.js');
        const UserSegment = (await import('../src/models/UserSegment.js')).default;

        // Find the Retail Customer segment
        console.log('🔍 Looking for Retail Customer segment...');
        const retailSegment = await UserSegment.findOne({
            $or: [
                { code: 'RETAIL' },
                { name: /retail.*customer/i }
            ]
        });

        if (!retailSegment) {
            console.error('❌ Retail Customer segment not found!');
            console.log('💡 Please create the Retail Customer segment in the admin panel first.');
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`✅ Found Retail Customer segment: "${retailSegment.name}"`);
        console.log(`   Segment ID: ${retailSegment._id}`);
        console.log(`   Code: ${retailSegment.code}\n`);

        // Check bulk_order_upload feature
        const bulkFeature = retailSegment.features?.find(f => f.featureKey === 'bulk_order_upload');
        if (bulkFeature && bulkFeature.isEnabled) {
            console.log('✅ bulk_order_upload feature is ENABLED for this segment\n');
        } else {
            console.log('⚠️  WARNING: bulk_order_upload feature is NOT enabled for this segment');
            console.log('💡 Please enable it in: Admin Panel → PMS → Segment Features\n');
        }

        // Find users without segment assignment
        console.log('🔍 Finding users without segment assignment...');
        const usersWithoutSegment = await User.find({
            role: 'user',
            $or: [
                { userSegment: { $exists: false } },
                { userSegment: null }
            ]
        });

        console.log(`📊 Found ${usersWithoutSegment.length} users without segment assignment\n`);

        if (usersWithoutSegment.length === 0) {
            console.log('✅ All users already have segment assignments!');

            // Show current assignments
            const sampleUsers = await User.find({
                role: 'user'
            }).limit(5).populate('userSegment');

            if (sampleUsers.length > 0) {
                console.log('\n📋 Sample user assignments:');
                sampleUsers.forEach(u => {
                    console.log(`  - ${u.email || u.name || u._id}: ${u.userSegment?.name || 'NO SEGMENT'}`);
                });
            }
        } else {
            console.log('🔄 Assigning users to Retail Customer segment...\n');

            // Use bulk update for better performance
            const result = await User.updateMany(
                {
                    role: 'user',
                    $or: [
                        { userSegment: { $exists: false } },
                        { userSegment: null }
                    ]
                },
                {
                    $set: { userSegment: retailSegment._id }
                }
            );

            console.log(`✅ Updated ${result.modifiedCount} users\n`);
        }

        // Final summary
        const totalUsers = await User.countDocuments({ role: 'user' });
        const assignedUsers = await User.countDocuments({
            role: 'user',
            userSegment: retailSegment._id
        });

        console.log('📈 Final Summary:');
        console.log(`   Total users: ${totalUsers}`);
        console.log(`   Assigned to Retail Customer segment: ${assignedUsers}`);
        console.log(`   Not assigned: ${totalUsers - assignedUsers}\n`);

        if (assignedUsers > 0) {
            console.log('✅ SUCCESS! Retail customers can now access bulk_order_upload feature!');
            console.log('💡 Have users refresh their browser (Ctrl+F5) to see the bulk upload button.\n');
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

// Run the migration
assignRetailSegment();
