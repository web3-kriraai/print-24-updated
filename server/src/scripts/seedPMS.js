import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import ResourceRegistry from "../models/ResourceRegistry.js";
import PrivilegeBundle from "../models/PrivilegeBundle.js";
import ViewStyle from "../models/ViewStyle.js";

dotenv.config();

const resources = [
    {
        resource: "ORDERS",
        displayName: "Orders",
        category: "Core",
        actions: ["create", "read", "update", "delete", "export", "approve"],
        description: "Manage customer orders"
    },
    {
        resource: "PRODUCTS",
        displayName: "Products",
        category: "Core",
        actions: ["create", "read", "update", "delete", "import"],
        description: "Manage product catalog"
    },
    {
        resource: "CUSTOMERS",
        displayName: "Customers",
        category: "Core",
        actions: ["create", "read", "update", "delete", "export"],
        description: "Manage customer profiles"
    },
    {
        resource: "COMPLAINTS",
        displayName: "Complaints",
        category: "Support",
        actions: ["create", "read", "resolve", "delete"],
        description: "Customer complaints and tickets"
    },
    {
        resource: "REPORTS",
        displayName: "Reports",
        category: "Reporting",
        actions: ["view_sales", "view_financial", "export"],
        description: "Business analytics and reports"
    },
    {
        resource: "USERS",
        displayName: "User Management",
        category: "Management",
        actions: ["create", "read", "update", "delete", "assign_type"],
        description: "Manage system users"
    },
    {
        resource: "SETTINGS",
        displayName: "System Settings",
        category: "Configuration",
        actions: ["read", "update"],
        description: "Global system configuration"
    },
    {
        resource: "PMS",
        displayName: "Privilege Management",
        category: "Configuration",
        actions: ["manage_types", "manage_bundles", "manage_views"],
        description: "Manage user types and privileges"
    }
];

const defaultBundles = [
    {
        name: "Full Admin Access",
        code: "FULL_ADMIN",
        description: "Complete access to all system resources",
        privileges: resources.map(r => ({
            resource: r.resource,
            actions: r.actions
        }))
    },
    {
        name: "Read Only Access",
        code: "READ_ONLY",
        description: "Can view data but cannot modify anything",
        privileges: resources.map(r => ({
            resource: r.resource,
            actions: r.actions.filter(a => a.includes("read") || a.includes("view"))
        }))
    }
];

const seedPMS = async () => {
    try {
        const mongoUri = process.env.MONGO_URI_PRICING || process.env.MONGO_TEST_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("No MongoDB URI found in environment variables");
        }

        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");

        // Seed Resources
        console.log("Seeding ResourceRegistry...");
        for (const res of resources) {
            await ResourceRegistry.findOneAndUpdate(
                { resource: res.resource },
                { ...res, isActive: true },
                { upsert: true, new: true }
            );
        }
        console.log("Resources seeded successfully.");

        // Seed Bundles
        console.log("Seeding PrivilegeBundles...");
        // Find admin user for createdBy field (optional)
        const adminUser = await User.findOne({ role: "admin" });
        const adminId = adminUser ? adminUser._id : null;

        for (const bundle of defaultBundles) {
            await PrivilegeBundle.findOneAndUpdate(
                { code: bundle.code },
                {
                    ...bundle,
                    isActive: true,
                    createdBy: adminId || new mongoose.Types.ObjectId()
                },
                { upsert: true, new: true }
            );
        }
        console.log("Bundles seeded successfully.");

        // Seed Default View Style
        const defaultStyle = {
            name: "Default View",
            code: "DEFAULT",
            description: "Standard system view",
            isDefault: true,
            componentConfigs: {
                DASHBOARD: { layout: "standard", widgets: ["stats", "recent_orders"] },
                ORDERS: { layout: "list", columns: ["id", "date", "customer", "total", "status"] }
            }
        };

        await ViewStyle.findOneAndUpdate(
            { code: "DEFAULT" },
            { ...defaultStyle, isActive: true },
            { upsert: true, new: true }
        );
        console.log("Default ViewStyle seeded.");

        console.log("PMS Seeding Complete!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedPMS();
