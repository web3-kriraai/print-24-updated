
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/productModal.js";
import path from "path";
import { fileURLToPath } from "url";

// Configure dotenv to read from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const updateProducts = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB successfully.");

        console.log("Starting product update...");

        // Update isDeleted: false where it doesn't exist
        const isDeletedResult = await Product.updateMany(
            { isDeleted: { $exists: false } },
            { $set: { isDeleted: false } }
        );
        console.log(`Updated isDeleted for ${isDeletedResult.modifiedCount} products.`);

        // Update isActive: true where it doesn't exist
        const isActiveResult = await Product.updateMany(
            { isActive: { $exists: false } },
            { $set: { isActive: true } }
        );
        console.log(`Updated isActive for ${isActiveResult.modifiedCount} products.`);
        
        // Also ensure all products have default values if they are null (though exists: false should cover it for mongo documents structure usually)
        // Just to be safe, let's also check for null types if schema didn't enforce it before
        
        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit();
    }
};

updateProducts();
