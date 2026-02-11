import mongoose from "mongoose";
import dotenv from "dotenv";
import UserSegment from "../src/models/UserSegment.js";

dotenv.config();

/**
 * Check existing User Segments
 * Run: node scripts/checkUserSegments.js
 */

const checkUserSegments = async () => {
    try {
        console.log("🔍 Checking existing user segments...");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI_PRICING || "mongodb://localhost:27017/print24");
        console.log("✅ Connected to MongoDB");

        // Get all segments
        const segments = await UserSegment.find({}).lean();

        console.log(`\n📊 Found ${segments.length} user segments:\n`);

        segments.forEach(segment => {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Name: ${segment.name}`);
            console.log(`Display Name: ${segment.displayName}`);
            console.log(`Active: ${segment.isActive}`);
            console.log(`Features: ${segment.features?.length || 0} features`);
            if (segment.features && segment.features.length > 0) {
                segment.features.forEach(f => {
                    console.log(`  - ${f.featureKey}: ${f.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
                });
            }
            console.log(`Permissions: ${segment.permissions?.length || 0}`);
            console.log(`ID: ${segment._id}`);
        });

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error checking user segments:", error);
        process.exit(1);
    }
};

// Run check
checkUserSegments();
