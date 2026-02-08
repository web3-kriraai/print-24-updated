import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import ResourceRegistry from "../src/models/ResourceRegistry.js";
import ViewStyle from "../src/models/ViewStyle.js";
import PrivilegeBundle from "../src/models/PrivilegeBundle.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

/**
 * Seed PMS Defaults
 * 
 * Seeds the database with default system resources, view styles, and privilege bundles.
 */

// Default System Resources
const systemResources = [
    {
        resource: "ORDERS",
        displayName: "Orders",
        description: "Customer orders and order management",
        actions: ["create", "read", "update", "delete", "export", "approve", "cancel"],
        category: "Core",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "PRODUCTS",
        displayName: "Products",
        description: "Product catalog management",
        actions: ["create", "read", "update", "delete", "pricing"],
        category: "Core",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "CUSTOMERS",
        displayName: "Customers",
        description: "Customer relationship management",
        actions: ["create", "read", "update", "delete", "export"],
        category: "Core",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "COMPLAINTS",
        displayName: "Complaints",
        description: "Customer complaint and issue management",
        actions: ["register", "read", "update", "resolve", "reopen", "approve_reprint"],
        category: "Core",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "REPORTS",
        displayName: "Reports",
        description: "Business analytics and reports",
        actions: ["view", "export", "configure"],
        category: "Reporting",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "USERS",
        displayName: "Users",
        description: "User account management",
        actions: ["create", "read", "update", "delete", "approve"],
        category: "Management",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "SETTINGS",
        displayName: "Settings",
        description: "System configuration and settings",
        actions: ["read", "update"],
        category: "Configuration",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "PRICING",
        displayName: "Pricing",
        description: "Price management and tiers",
        actions: ["read", "update", "configure"],
        category: "Core",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "CATEGORIES",
        displayName: "Categories",
        description: "Product category management",
        actions: ["create", "read", "update", "delete"],
        category: "Core",
        isSystem: true,
        isActive: true,
    },
    {
        resource: "DEPARTMENTS",
        displayName: "Departments",
        description: "Department and workflow management",
        actions: ["create", "read", "update", "delete", "assign"],
        category: "Management",
        isSystem: true,
        isActive: true,
    },
];

// Default View Styles
const defaultViewStyles = [
    {
        name: "Default View",
        code: "DEFAULT_VIEW",
        description: "Standard view for all user types",
        componentConfigs: {
            DASHBOARD: {
                layout: "grid",
                showCharts: true,
                showStats: true,
                widgetOrder: ["orders", "revenue", "customers"],
            },
            ORDERS: {
                layout: "table",
                columns: ["id", "date", "customer", "amount", "status"],
                showExport: true,
            },
        },
        themeOverrides: {},
        isDefault: true,
        isActive: true,
    },
    {
        name: "Corporate View",
        code: "CORPORATE_VIEW",
        description: "Enhanced view with analytics for corporate users",
        componentConfigs: {
            DASHBOARD: {
                layout: "grid",
                showCharts: true,
                showStats: true,
                showTeamMetrics: true,
                widgetOrder: ["revenue", "orders", "team", "customers"],
            },
            ORDERS: {
                layout: "table",
                columns: ["id", "date", "customer", "amount", "status", "team"],
                showExport: true,
                showBulkActions: true,
            },
        },
        themeOverrides: {},
        isDefault: false,
        isActive: true,
    },
    {
        name: "Agent Dashboard",
        code: "AGENT_DASHBOARD",
        description: "Simplified view for agent users",
        componentConfigs: {
            DASHBOARD: {
                layout: "list",
                showCharts: false,
                showStats: true,
                widgetOrder: ["orders", "customers"],
            },
            ORDERS: {
                layout: "table",
                columns: ["id", "date", "customer", "amount", "status"],
                showExport: false,
            },
        },
        themeOverrides: {},
        isDefault: false,
        isActive: true,
    },
];

// Default Privilege Bundles
const defaultPrivilegeBundles = [
    {
        name: "Full Access",
        code: "FULL_ACCESS",
        description: "Complete access to all system resources",
        privileges: [
            { resource: "ORDERS", actions: ["create", "read", "update", "delete", "export", "approve", "cancel"] },
            { resource: "PRODUCTS", actions: ["create", "read", "update", "delete", "pricing"] },
            { resource: "CUSTOMERS", actions: ["create", "read", "update", "delete", "export"] },
            { resource: "COMPLAINTS", actions: ["register", "read", "update", "resolve", "reopen", "approve_reprint"] },
            { resource: "REPORTS", actions: ["view", "export", "configure"] },
            { resource: "USERS", actions: ["create", "read", "update", "delete", "approve"] },
            { resource: "SETTINGS", actions: ["read", "update"] },
            { resource: "PRICING", actions: ["read", "update", "configure"] },
            { resource: "CATEGORIES", actions: ["create", "read", "update", "delete"] },
            { resource: "DEPARTMENTS", actions: ["create", "read", "update", "delete", "assign"] },
        ],
        isActive: true,
    },
    {
        name: "Read Only",
        code: "READ_ONLY",
        description: "View-only access to all resources",
        privileges: [
            { resource: "ORDERS", actions: ["read"] },
            { resource: "PRODUCTS", actions: ["read"] },
            { resource: "CUSTOMERS", actions: ["read"] },
            { resource: "COMPLAINTS", actions: ["read"] },
            { resource: "REPORTS", actions: ["view"] },
            { resource: "USERS", actions: ["read"] },
            { resource: "SETTINGS", actions: ["read"] },
            { resource: "PRICING", actions: ["read"] },
            { resource: "CATEGORIES", actions: ["read"] },
            { resource: "DEPARTMENTS", actions: ["read"] },
        ],
        isActive: true,
    },
    {
        name: "Order Manager",
        code: "ORDER_MANAGER",
        description: "Full access to orders and customers",
        privileges: [
            { resource: "ORDERS", actions: ["create", "read", "update", "export", "approve", "cancel"] },
            { resource: "CUSTOMERS", actions: ["read", "update", "export"] },
            { resource: "PRODUCTS", actions: ["read"] },
            { resource: "COMPLAINTS", actions: ["register", "read", "update"] },
            { resource: "REPORTS", actions: ["view", "export"] },
        ],
        isActive: true,
    },
    {
        name: "Customer Manager",
        code: "CUSTOMER_MANAGER",
        description: "Focus on customer relationship management",
        privileges: [
            { resource: "CUSTOMERS", actions: ["create", "read", "update", "export"] },
            { resource: "ORDERS", actions: ["read", "export"] },
            { resource: "COMPLAINTS", actions: ["register", "read", "update", "resolve"] },
            { resource: "REPORTS", actions: ["view"] },
        ],
        isActive: true,
    },
];

async function seedPMSDefaults() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI_PRICING, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log("✅ Connected to MongoDB");

        // Create a system user for seeding (or use an existing admin)
        const User = (await import("../src/models/User.js")).default;
        let systemUser = await User.findOne({ email: "system@pms.local" });

        if (!systemUser) {
            systemUser = await User.create({
                name: "PMS System",
                email: "system@pms.local",
                password: "not-used",
                role: "admin",
            });
            console.log("✅ Created system user for seeding");
        }

        // Seed System Resources
        console.log("\n📦 Seeding System Resources...");
        for (const resource of systemResources) {
            const existing = await ResourceRegistry.findOne({ resource: resource.resource });

            if (!existing) {
                const newResource = await ResourceRegistry.create({
                    ...resource,
                    createdBy: systemUser._id,
                });
                console.log(`  ✓ Created resource: ${newResource.displayName}`);
            } else {
                console.log(`  - Resource already exists: ${resource.displayName}`);
            }
        }

        // Seed Default View Styles
        console.log("\n🎨 Seeding Default View Styles...");
        for (const style of defaultViewStyles) {
            const existing = await ViewStyle.findOne({ code: style.code });

            if (!existing) {
                const newStyle = await ViewStyle.create({
                    ...style,
                    createdBy: systemUser._id,
                });
                console.log(`  ✓ Created view style: ${newStyle.name}`);
            } else {
                console.log(`  - View style already exists: ${style.name}`);
            }
        }

        // Seed Default Privilege Bundles
        console.log("\n🔐 Seeding Default Privilege Bundles...");
        for (const bundle of defaultPrivilegeBundles) {
            const existing = await PrivilegeBundle.findOne({ code: bundle.code });

            if (!existing) {
                const newBundle = await PrivilegeBundle.create({
                    ...bundle,
                    createdBy: systemUser._id,
                });
                console.log(`  ✓ Created privilege bundle: ${newBundle.name}`);
            } else {
                console.log(`  - Privilege bundle already exists: ${bundle.name}`);
            }
        }

        console.log("\n✅ PMS Default seeding completed successfully!");
        console.log("\n📊 Summary:");
        console.log(`  - System Resources: ${systemResources.length}`);
        console.log(`  - View Styles: ${defaultViewStyles.length}`);
        console.log(`  - Privilege Bundles: ${defaultPrivilegeBundles.length}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding PMS defaults:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run seeding
seedPMSDefaults();
