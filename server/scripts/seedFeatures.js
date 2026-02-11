import mongoose from "mongoose";
import dotenv from "dotenv";
import UserSegment from "../src/models/UserSegment.js";
import Feature from "../src/models/Feature.js";

dotenv.config();

/**
 * Seed Features and Assign to User Segments
 * Run: node scripts/seedFeatures.js
 */

const seedFeatures = async () => {
    try {
        console.log("🌱 Starting feature seeding...");

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI_PRICING || "mongodb://localhost:27017/print24");
        console.log("✅ Connected to MongoDB");

        // Step 1: Create the bulk_order_upload feature if it doesn't exist
        console.log("\n📦 Creating bulk_order_upload feature...");

        let bulkFeature = await Feature.findOne({ key: "bulk_order_upload" });

        if (!bulkFeature) {
            bulkFeature = await Feature.create({
                key: "bulk_order_upload",
                name: "Bulk Order Upload",
                description: "Upload composite PDF and split into multiple orders (30-in-1)",
                category: "ORDERS",
                subcategory: "BULK",
                isActive: true,
                isBeta: false,
                isPremium: true,
                configSchema: {
                    maxDesigns: {
                        type: "number",
                        default: 50,
                        description: "Maximum number of designs allowed in a bulk order",
                    },
                    maxTotalCopies: {
                        type: "number",
                        default: 100000,
                        description: "Maximum total copies across all designs",
                    },
                    maxFileSize: {
                        type: "number",
                        default: 100 * 1024 * 1024, // 100MB
                        description: "Maximum PDF file size in bytes",
                    },
                },
                icon: "upload",
                sortOrder: 10,
            });

            console.log("✅ Created bulk_order_upload feature");
        } else {
            console.log("ℹ️  bulk_order_upload feature already exists");
        }

        // Step 2: Find user segments that should have this feature
        console.log("\n👥 Finding user segments...");

        // Target segments for bulk upload: Corporate Partner, Print Partner, Delivery Agent Nepal
        const targetSegmentNames = ["Corporate Partner", "Print Partner", "Delivery Agent Nepal"];

        const userSegments = await UserSegment.find({
            name: { $in: targetSegmentNames },
            isActive: true,
        });

        console.log(`Found ${userSegments.length} user segments: ${userSegments.map((seg) => seg.name).join(", ")}`);

        if (userSegments.length === 0) {
            console.log("\n⚠️  Warning: No matching user segments found!");
            console.log("Available segments should include: Corporate Partner, Print Partner, Delivery Agent Nepal");
            console.log("\nℹ️  Feature created but not assigned to any segments.");
            await mongoose.disconnect();
            process.exit(0);
        }

        // Step 3: Assign feature to user segments
        for (const userSegment of userSegments) {
            console.log(`\n📝 Processing UserSegment: ${userSegment.name}`);

            // Initialize features array if it doesn't exist
            if (!userSegment.features) {
                userSegment.features = [];
            }

            // Check if feature already exists in user segment
            const existingFeatureIndex = userSegment.features.findIndex(
                (f) => f.featureKey === "bulk_order_upload"
            );

            const featureConfig = {
                maxDesigns: userSegment.name === "Corporate Partner" ? 100 : 50,
                maxTotalCopies: userSegment.name === "Corporate Partner" ? 200000 : 100000,
                maxFileSize: 100 * 1024 * 1024, // 100MB for all
            };

            if (existingFeatureIndex !== -1) {
                console.log(`  ℹ️  Feature already exists, updating...`);
                userSegment.features[existingFeatureIndex] = {
                    featureKey: "bulk_order_upload",
                    isEnabled: true,
                    config: featureConfig,
                };
            } else {
                console.log(`  ➕ Adding new feature...`);
                userSegment.features.push({
                    featureKey: "bulk_order_upload",
                    isEnabled: true,
                    config: featureConfig,
                });
            }

            // Mark the features field as modified for Mongoose
            userSegment.markModified('features');
            await userSegment.save();
            console.log(`  ✅ Updated ${userSegment.name} with bulk_order_upload feature`);
        }

        console.log("\n✨ Feature seeding completed successfully!");
        console.log("\n📊 Summary:");
        console.log(`  - Feature: bulk_order_upload`);
        console.log(`  - Assigned to: ${userSegments.map((seg) => seg.name).join(", ")}`);
        console.log(`  - Configuration:`);
        console.log(`    • Corporate Partner: max 100 designs, 200k copies`);
        console.log(`    • Others: max 50 designs, 100k copies`);
        console.log(`    • All: max 100MB file size`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding features:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run seeding
seedFeatures();

