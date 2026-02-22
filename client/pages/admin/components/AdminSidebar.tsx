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
    DollarSign,
    AlertCircle,
    Shield,
    X,
    Palette
} from 'lucide-react';
import { useLogo } from '../../../hooks/useSiteSettings';

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
    isOpen: boolean;
    onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
    const navigate = useNavigate();
    const [expandedSections, setExpandedSections] = useState<string[]>(['categories']);
    const { logo } = useLogo();

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
                { id: 'sort-products', label: 'Sort Products' },
            ],
        },
        {
            id: 'users',
            label: 'Users',
            icon: <Users size={20} />,
            subItems: [
                { id: 'users', label: 'All Users' }
            ],
        },
        {
            id: 'user-segments',
            label: 'User Segments',
            icon: <Layers size={20} />,
            subItems: [
                { id: 'user-segments', label: 'Manage Segments' },
                { id: 'segment-applications', label: 'Applications' },
                { id: 'form-builder', label: 'Form Builder' },
            ],
        },
        {
            id: 'features',
            label: 'Features',
            icon: <Shield size={20} />, // Make sure Shield is imported
            subItems: [
                { id: 'segment_features', label: 'Segment Features' },
            ],
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: <ShoppingBag size={20} />,
            subItems: [
                { id: 'orders', label: 'Manage Orders' },
            ],
        },
        {
            id: 'pricing',
            label: 'Pricing',
            icon: <DollarSign size={20} />,
            subItems: [
                { id: 'price-books', label: 'Price Books' },
                { id: 'price-modifiers', label: 'Price Modifiers' },
                { id: 'geo-zones', label: 'Geo Zones' },
                { id: 'product-availability', label: 'Product Availability' },
                { id: 'smart-view', label: 'Smart View Matrix' },
                { id: 'payment-gateways', label: 'Payment Gateways' },
                { id: 'pricing-audit', label: 'Audit Log' },
            ],
        },
        {
            id: 'complaints',
            label: 'Complaints',
            icon: <AlertCircle size={20} />, // Make sure AlertCircle is imported
            subItems: [
                { id: 'complaints', label: 'Manage Complaints' },
            ],
        },
        {
            id: 'designers',
            label: 'Designers',
            icon: <Palette size={20} />,
            subItems: [
                { id: 'designer-dashboard', label: 'Management' },
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
                { id: 'image-matrix', label: 'Image Matrix' },
            ],
        },
        {
            id: 'content',
            label: 'Contents',
            icon: <FileText size={20} />,
            subItems: [
                { id: 'services', label: 'Services' },
                { id: 'site-settings', label: 'Site Settings' },
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
        onClose(); // Close sidebar on mobile after selection
    };

    return (
        <div
            className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#475569 #1e293b',
            }}
        >
            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
                    <Link to="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
                        <div className="bg-white p-2 rounded-xl shadow-lg">
                            <img
                                src={logo}
                                alt="Logo"
                                className="h-10 w-auto object-contain"
                            />
                        </div>
                    </Link>
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
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

            </div>

            {/* Footer - Fixed at bottom of sidebar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 z-10">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Star size={12} className="text-yellow-500" />
                    <span>Admin Dashboard v1.0</span>
                </div>
            </div>
        </div>
    );
};

export default AdminSidebar;
