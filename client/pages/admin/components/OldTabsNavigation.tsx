/**
 * OLD ADMIN DASHBOARD TABS NAVIGATION
 * 
 * This file contains the original horizontal tabs navigation that was replaced
 * with the new AdminSidebar component. Preserved for reference.
 * 
 * Date: 2026-01-10
 * Replaced by: AdminSidebar.tsx
 */

import React from 'react';
import {
    Package,
    FolderPlus,
    ImageIcon,
    Users,
    Building2,
    Settings,
    ShoppingBag,
    Briefcase,
} from 'lucide-react';

// Tabs configuration
const tabs = [
    { id: "products", label: "Add Product", icon: Package },
    { id: "manage-products", label: "Manage Products", icon: Package },
    { id: "attribute-types", label: "Attribute Types", icon: Settings },
    { id: "attribute-rules", label: "Attribute Rules", icon: Settings },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "sequences", label: "Sequences", icon: Settings },
    { id: "categories", label: "Add Category", icon: FolderPlus },
    { id: "manage-categories", label: "Manage Categories", icon: FolderPlus },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "uploads", label: "Uploaded Images", icon: ImageIcon },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "print-partner-requests", label: "Print Partners", icon: Briefcase },
];

export { tabs };
