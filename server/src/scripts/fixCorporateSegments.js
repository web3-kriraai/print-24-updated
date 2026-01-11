import mongoose from 'mongoose';
import { User } from '../models/User.js';
import UserSegment from '../models/UserSegment.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Fix Corporate Users - Update userSegment to CORPORATE
 */
async function fixCorporateSegments() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_TEST_URI || process.env.MONGO_URI);
        console.log('✅ Connected\n');

        // Find CORPORATE segment
        const corporateSegment = await UserSegment.findOne({ code: 'CORPORATE' });

        if (!corporateSegment) {
            console.log('❌ CORPORATE segment not found!');
            process.exit(1);
        }

        console.log(`✅ CORPORATE segment ID: ${corporateSegment._id}\n`);

        // Find corporate users
        const users = await User.find({
            userType: { $regex: /^corporate$/i }
        }).populate('userSegment');

        console.log(`Found ${users.length} corporate users:\n`);

        users.forEach(u => {
            console.log(`- ${u.email}: current segment = ${u.userSegment?.code || 'NONE'}`);
        });

        // Update directly with updateMany
        console.log('\n🔄 Updating...');
        const result = await User.updateMany(
            { userType: { $regex: /^corporate$/i } },
            { $set: { userSegment: corporateSegment._id } }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} corporate users`);
        console.log('🔄 Refresh your browser!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fixCorporateSegments();
