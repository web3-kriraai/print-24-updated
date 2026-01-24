import mongoose from 'mongoose';
import { User } from '../models/User.js';
import UserSegment from '../models/UserSegment.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixPrintPartnerSegments() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_TEST_URI || process.env.MONGO_URI_PRICING);
        console.log('✅ Connected\n');

        // Find PRINT_PARTNER segment
        const printPartnerSegment = await UserSegment.findOne({ code: 'PRINT_PARTNER' });

        if (!printPartnerSegment) {
            console.log('❌ PRINT_PARTNER segment not found!');
            process.exit(1);
        }

        console.log(`✅ PRINT_PARTNER segment ID: ${printPartnerSegment._id}\n`);

        // Find print partner users
        const users = await User.find({
            userType: { $regex: /^print partner$/i }
        }).populate('userSegment');

        console.log(`Found ${users.length} print partner users:\n`);

        users.forEach(u => {
            console.log(`- ${u.email}: current segment = ${u.userSegment?.code || 'NONE'}`);
        });

        // Update directly with updateMany
        console.log('\n🔄 Updating...');
        const result = await User.updateMany(
            { userType: { $regex: /^print partner$/i } },
            { $set: { userSegment: printPartnerSegment._id } }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} users`);
        console.log('🔄 Refresh your browser!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixPrintPartnerSegments();
