import mongoose from "mongoose";
import dotenv from "dotenv";
import UserType from "../models/UserType.js";

dotenv.config();

const migrateUserTypes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB for migration...");

        const userTypes = await UserType.find({});
        console.log(`Found ${userTypes.length} user types to check.`);

        let updatedCount = 0;

        for (const type of userTypes) {
            let needsUpdate = false;

            // Initialize missing fields
            if (!type.features) {
                type.features = [];
                needsUpdate = true;
            }

            if (!type.privilegeBundleIds) {
                type.privilegeBundleIds = [];
                needsUpdate = true;
            }

            if (!type.limits) {
                type.limits = {
                    maxOrdersPerDay: null,
                    maxClients: null,
                    maxCreditLimit: null,
                    allowedPaymentTerms: []
                };
                needsUpdate = true;
            }

            if (!type.territoryRestrictions) {
                type.territoryRestrictions = [];
                needsUpdate = true;
            }

            if (type.inheritFromParent === undefined) {
                type.inheritFromParent = true;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await type.save();
                updatedCount++;
                console.log(`Updated user type: ${type.name}`);
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} user types.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateUserTypes();
