import mongoose from 'mongoose';
import { User } from '../models/User.js';
import UserSegment from '../models/UserSegment.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to fix PRINT_PARTNER users who have incorrect userSegment assigned
 * 
 * Issue: Users with userType='print partner' have userSegment pointing to RETAIL
 * This script will:
 * 1. Find all users with userType='print partner'
 * 2. Update their userSegment to PRINT_PARTNER segment
 */

async function fixPrintPartnerSegments() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_TEST_URI || process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find the PRINT_PARTNER segment
        console.log('🔍 Looking for PRINT_PARTNER segment...');
        const printPartnerSegment = await UserSegment.findOne({ code: 'PRINT_PARTNER' });

        if (!printPartnerSegment) {
            console.log('❌ PRINT_PARTNER segment not found in database!');
            console.log('   Creating PRINT_PARTNER segment...');

            const newSegment = await UserSegment.create({
                code: 'PRINT_PARTNER',
                name: 'Print Partner',
                description: 'Print partner segment for wholesale pricing',
                isDefault: false,
                isActive: true
            });

            console.log(`✅ Created PRINT_PARTNER segment: ${newSegment._id}\n`);
            printPartnerSegment = newSegment;
        } else {
            console.log(`✅ Found PRINT_PARTNER segment:`);
            console.log(`   ID: ${printPartnerSegment._id}`);
            console.log(`   Name: ${printPartnerSegment.name}`);
            console.log(`   Code: ${printPartnerSegment.code}\n`);
        }

        // Find all users with userType='print partner' 
        console.log('🔍 Finding users with userType="print partner"...');
        const printPartnerUsers = await User.find({
            userType: { $in: ['print partner', 'PRINT_PARTNER', 'Print Partner'] }
        }).populate('userSegment');

        console.log(`📊 Found ${printPartnerUsers.length} print partner user(s)\n`);

        if (printPartnerUsers.length === 0) {
            console.log('ℹ️  No print partner users found to update.');
            return;
        }

        // Update each user's segment
        let updatedCount = 0;
        let alreadyCorrectCount = 0;

        for (const user of printPartnerUsers) {
            const currentSegment = user.userSegment?.code || 'NOT SET';

            console.log(`\n👤 User: ${user.email || user.name}`);
            console.log(`   Current userSegment: ${currentSegment}`);
            console.log(`   UserType: ${user.userType}`);
            console.log(`   SignupIntent: ${user.signupIntent}`);

            if (currentSegment === 'PRINT_PARTNER') {
                console.log(`   ✅ Already correct - skipping`);
                alreadyCorrectCount++;
                continue;
            }

            // Update the user's segment
            user.userSegment = printPartnerSegment._id;
            await user.save();

            console.log(`   ✅ Updated userSegment to PRINT_PARTNER`);
            updatedCount++;
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total print partner users: ${printPartnerUsers.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Already correct: ${alreadyCorrectCount}`);
        console.log('='.repeat(60));

        console.log('\n✅ Script completed successfully!');
        console.log('🔄 Please refresh your browser to see the changes.\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
fixPrintPartnerSegments();
