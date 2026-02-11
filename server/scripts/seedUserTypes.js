import mongoose from "mongoose";
import dotenv from "dotenv";
import UserType from "../src/models/UserType.js";

dotenv.config();

/**
 * Check and Seed User Types
 * This ensures AGENT, CORPORATE, and DISTRIBUTOR user types exist
 * Run: node scripts/seedUserTypes.js
 */

const seedUserTypes = async () => {
    try {
        console.log("🌱 Starting user type seeding...");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI_PRICING || "mongodb://localhost:27017/print24");
        console.log("✅ Connected to MongoDB");

        // Check existing user types
        const existingUserTypes = await UserType.find({});
        console.log(`\n📊 Found ${existingUserTypes.length} existing user types:`);
        existingUserTypes.forEach(ut => {
            console.log(`  - ${ut.name} (${ut.displayName}) - Active: ${ut.isActive}`);
        });

        // Define required user types
        const requiredUserTypes = [
            {
                name: "AGENT",
                displayName: "Agent",
                description: "Agent user with advanced ordering capabilities",
                isActive: true,
                permissions: ["bulk_order_upload"],
                features: []
            },
            {
                name: "CORPORATE",
                displayName: "Corporate",
                description: "Corporate user with enhanced bulk ordering features",
                isActive: true,
                permissions: ["bulk_order_upload"],
                features: []
            },
            {
                name: "DISTRIBUTOR",
                displayName: "Distributor",
                description: "Distributor with bulk ordering capabilities",
                isActive: true,
                permissions: ["bulk_order_upload"],
                features: []
            },
            {
                name: "RETAIL",
                displayName: "Retail",
                description: "Standard retail customer",
                isActive: true,
                permissions: [],
                features: []
            }
        ];

        console.log("\n🔍 Checking and creating user types...");

        for (const userTypeData of requiredUserTypes) {
            const existing = await UserType.findOne({ name: userTypeData.name });

            if (!existing) {
                const newUserType = await UserType.create(userTypeData);
                console.log(`  ✅ Created: ${newUserType.name} (${newUserType.displayName})`);
            } else {
                console.log(`  ℹ️  Already exists: ${existing.name} (${existing.displayName})`);
            }
        }

        // Final check
        const finalUserTypes = await UserType.find({ isActive: true });
        console.log(`\n✨ User type seeding completed!`);
        console.log(`📊 Total active user types: ${finalUserTypes.length}`);
        finalUserTypes.forEach(ut => {
            console.log(`  - ${ut.name} (${ut.displayName})`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding user types:", error);
        process.exit(1);
    }
};

// Run seeding
seedUserTypes();
