import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testFeatureCheck() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Import models
        const { User } = await import('./src/models/User.js');
        const UserSegment = (await import('./src/models/UserSegment.js')).default;

        // Find all user segments
        const segments = await UserSegment.find({});
        console.log('\n📊 Available User Segments:');
        segments.forEach(seg => {
            console.log(`  - ${seg.name} (${seg.code})`);
            const bulkFeature = seg.features?.find(f => f.featureKey === 'bulk_order_upload');
            if (bulkFeature) {
                console.log(`    ✅ bulk_order_upload: ${bulkFeature.isEnabled ? 'ENABLED' : 'DISABLED'}`);
            } else {
                console.log(`    ❌ bulk_order_upload: NOT CONFIGURED`);
            }
        });

        // Find retail customer segment
        const retailSegment = segments.find(s => s.code === 'RETAIL' || s.name.includes('Retail'));
        if (!retailSegment) {
            console.log('\n❌ Retail Customer segment not found!');
        } else {
            console.log(`\n✅ Found Retail Customer segment: ${retailSegment.name} (ID: ${retailSegment._id})`);
        }

        // Find some users
        const users = await User.find({ role: 'user' }).limit(5).populate('userSegment');
        console.log(`\n👥 Sample Users (showing first 5):`);
        users.forEach(user => {
            console.log(`\n  User: ${user.email || user.name || user._id}`);
            console.log(`    Role: ${user.role}`);
            console.log(`    User Segment: ${user.userSegment?.name || 'NOT ASSIGNED'}`);
            if (user.userSegment) {
                const bulkFeature = user.userSegment.features?.find(f => f.featureKey === 'bulk_order_upload');
                console.log(`    bulk_order_upload: ${bulkFeature?.isEnabled ? '✅ ENABLED' : '❌ DISABLED or NOT FOUND'}`);
            }
        });

        // Count users without segment
        const usersWithoutSegment = await User.countDocuments({ userSegment: { $exists: false } });
        const usersWithNullSegment = await User.countDocuments({ userSegment: null });
        console.log(`\n⚠️  Users without segment assigned:`);
        console.log(`    - Missing field: ${usersWithoutSegment}`);
        console.log(`    - Null value: ${usersWithNullSegment}`);
        console.log(`    - Total: ${usersWithoutSegment + usersWithNullSegment}`);

        // Suggest fix
        if ((usersWithoutSegment + usersWithNullSegment) > 0 && retailSegment) {
            console.log(`\n💡 SUGGESTED FIX:`);
            console.log(`   Assign Retail Customer segment to your test user:`);
            console.log(`   \n   In MongoDB or via admin panel:`);
            console.log(`   db.users.updateOne(`);
            console.log(`     { email: "YOUR_TEST_USER_EMAIL" },`);
            console.log(`     { $set: { userSegment: ObjectId("${retailSegment._id}") } }`);
            console.log(`   )\n`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

testFeatureCheck();
