import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Check if user check-feature endpoint exists
 * This is needed for the bulk upload permission check
 */

const checkRoutes = async () => {
    try {
        console.log("🔍 Checking for user feature check endpoint...\n");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI_PRICING || "mongodb://localhost:27017/print24");
        console.log("✅ Connected to MongoDB\n");

        // Check if user has userSegment populated
        const { User } = await import("../src/models/User.js");

        // Find a user with email or any corporate user
        console.log("📊 Checking user records:\n");
        const users = await User.find().populate("userSegment").limit(5).lean();

        users.forEach(user => {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Email: ${user.email}`);
            console.log(`User Segment: ${user.userSegment?.name || 'NOT SET'}`);
            console.log(`User Segment ID: ${user.userSegment?._id || 'NONE'}`);
            console.log(`Has Features: ${user.userSegment?.features?.length || 0}`);
            if (user.userSegment?.features?.length > 0) {
                user.userSegment.features.forEach(f => {
                    console.log(`  - ${f.featureKey}: ${f.isEnabled ? '✅' : '❌'}`);
                });
            }
        });

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

checkRoutes();
