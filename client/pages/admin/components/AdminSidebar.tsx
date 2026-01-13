import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderPlus,
    Package,
    ShoppingBag,
    Users,
    Building2,
    Settings,
    FileText,
    Briefcase,
    ImageIcon,
    ChevronDown,
    ChevronRight,
    LayoutDashboard,
    Star,
    Layers,
} from 'lucide-react';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    subItems?: {
        id: string;
        label: string;
        isExternalLink?: boolean;
        externalUrl?: string;
    }[];
    isExternalLink?: boolean;
    externalUrl?: string;
}

interface AdminSidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange }) => {
    const navigate = useNavigate();
    const [expandedSections, setExpandedSections] = useState<string[]>(['categories']);

    const navigationItems: NavItem[] = [
        {
            id: 'categories',
            label: 'Categories',
            icon: <FolderPlus size={20} />,
            subItems: [
                { id: 'categories', label: 'Add Category' },
                { id: 'manage-categories', label: 'Manage Categories' },
            ],
        },
        {
            id: 'products',
            label: 'Products',
            icon: <Package size={20} />,
            subItems: [
                { id: 'products', label: 'Add Product' },
                { id: 'manage-products', label: 'Manage Products' },
            ],
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: <ShoppingBag size={20} />,
            subItems: [
                { id: 'orders', label: 'View All Orders' },
            ],
        },
        {
            id: 'users',
            label: 'Users',
            icon: <Users size={20} />,
            subItems: [
                { id: 'users', label: 'All Users' },
                { id: 'employees', label: 'Employees' },
            ],
        },
        {
            id: 'production',
            label: 'Production',
            icon: <Building2 size={20} />,
            subItems: [
                { id: 'departments', label: 'Departments' },
                { id: 'sequences', label: 'Sequences' },
            ],
        },
        {
            id: 'attributes',
            label: 'Attributes',
            icon: <Settings size={20} />,
            subItems: [
                { id: 'attribute-types', label: 'Attribute Types' },
                { id: 'attribute-rules', label: 'Attribute Rules' },
                { id: 'sub-attributes', label: 'Sub-Attributes' },
            ],
        },
        {
            id: 'content',
            label: 'Contents',
            icon: <FileText size={20} />,
            subItems: [
                { id: 'services', label: 'Services' },
            ],
        },
        {
            id: 'partners',
            label: 'Print Partners',
            icon: <Briefcase size={20} />,
            subItems: [
                { id: 'print-partner-requests', label: 'Partner Requests' },
            ],
        },
        {
            id: 'uploads',
            label: 'Uploads',
            icon: <ImageIcon size={20} />,
            subItems: [
                { id: 'uploads', label: 'User Uploads' },
            ],
        },
    ];

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) =>
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    const handleSubItemClick = (tabId: string, sectionId: string) => {
        // Ensure the section is expanded when clicking a sub-item
        if (!expandedSections.includes(sectionId)) {
            setExpandedSections((prev) => [...prev, sectionId]);
        }
        onTabChange(tabId);
    };

    return (
        <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-40 overflow-y-auto"
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#475569 #1e293b',
            }}
        >
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50">
                <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
                    <div className="bg-white p-2 rounded-xl shadow-lg">
                        <img
                            src="/logo.svg"
                            alt="Logo"
                            className="h-10 w-auto object-contain"
                        />
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-2 pb-20">
                {navigationItems.map((item) => {
                    const isExpanded = expandedSections.includes(item.id);
                    const hasActiveSubItem = item.subItems?.some((sub) => sub.id === activeTab);

                    return (
                        <div key={item.id} className="space-y-1">
                            {/* Main Item */}
                            <button
                                onClick={() => {
                                    if (item.isExternalLink && item.externalUrl) {
                                        navigate(item.externalUrl);
                                    } else {
                                        toggleSection(item.id);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${hasActiveSubItem
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`transition-transform duration-200 ${hasActiveSubItem ? 'scale-110' : 'group-hover:scale-110'
                                            }`}
                                    >
                                        {item.icon}
                                    </div>
                                    <span className="font-medium text-sm">{item.label}</span>
                                </div>
                                {!item.isExternalLink && (
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown size={16} />
                                    </motion.div>
                                )}
                            </button>

                            {/* Sub Items */}
                            <AnimatePresence>
                                {isExpanded && item.subItems && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pl-4 space-y-1 pt-1">
                                            {item.subItems.map((subItem) => {
                                                const isActive = activeTab === subItem.id;
                                                return (
                                                    <motion.button
                                                        key={subItem.id}
                                                        onClick={() => {
                                                            if (subItem.isExternalLink && subItem.externalUrl) {
                                                                navigate(subItem.externalUrl);
                                                            } else {
                                                                handleSubItemClick(subItem.id, item.id);
                                                            }
                                                        }}
                                                        initial={{ x: -10, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ duration: 0.2 }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 group ${isActive
                                                            ? 'bg-slate-700 text-white shadow-md border-l-4 border-blue-500'
                                                            : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-200 border-l-4 border-transparent'
                                                            }`}
                                                    >
                                                        <ChevronRight
                                                            size={14}
                                                            className={`transition-transform duration-200 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'
                                                                }`}
                                                        />
                                                        <span className="font-medium">{subItem.label}</span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Star size={12} className="text-yellow-500" />
                    <span>Admin Dashboard v1.0</span>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminSidebar;
