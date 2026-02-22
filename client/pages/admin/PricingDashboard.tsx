import React from 'react';
import PriceBookManager from '../../components/admin/pricing/PriceBookManager';
import ModifierRuleBuilder from '../../components/admin/pricing/ModifierRuleBuilder';
import GeoZoneManager from '../../components/admin/pricing/GeoZoneManager';
import ProductAvailabilityManager from '../../components/admin/pricing/ProductAvailabilityManager';
import PricingAuditLog from '../../components/admin/pricing/PricingAuditLog';
import SmartViewMatrix from '../../components/admin/SmartViewMatrix';
import PaymentGatewayManager from '../../components/admin/PaymentGatewayManager';

interface PricingDashboardProps {
    activeTab: string;
}

import { ChevronRight, Settings, DollarSign, Globe, Package, History, Layout, CreditCard } from 'lucide-react';

interface PricingDashboardProps {
    activeTab: string;
}

const PricingDashboard: React.FC<PricingDashboardProps> = ({ activeTab }) => {
    const getTabMetadata = () => {
        switch (activeTab) {
            case 'price-books':
                return { title: 'Price Books', icon: <DollarSign className="text-blue-600" />, desc: 'Manage your product price books and regional pricing.' };
            case 'price-modifiers':
                return { title: 'Price Modifiers', icon: <Settings className="text-purple-600" />, desc: 'Configure discount rules, markup modifiers, and conditions.' };
            case 'geo-zones':
                return { title: 'Geo Zones', icon: <Globe className="text-emerald-600" />, desc: 'Define geographical zones and regional currency settings.' };
            case 'product-availability':
                return { title: 'Product Availability', icon: <Package className="text-orange-600" />, desc: 'Control which products are available in specific regions.' };
            case 'pricing-audit':
                return { title: 'Pricing Audit Logs', icon: <History className="text-gray-600" />, desc: 'Review history of pricing changes and calculations.' };
            case 'smart-view':
                return { title: 'Smart View Matrix', icon: <Layout className="text-indigo-600" />, desc: 'Visualize and manage prices across all variants and zones.' };
            case 'payment-gateways':
                return { title: 'Payment Gateways', icon: <CreditCard className="text-cyan-600" />, desc: 'Configure payment providers and gateway rules.' };
            default:
                return { title: 'Pricing Administration', icon: <DollarSign />, desc: 'Manage the core pricing engine of your store.' };
        }
    };

    const metadata = getTabMetadata();

    const renderContent = () => {
        switch (activeTab) {
            case 'price-books':
                return <PriceBookManager />;
            case 'price-modifiers':
                return <ModifierRuleBuilder />;
            case 'geo-zones':
                return <GeoZoneManager />;
            case 'product-availability':
                return <ProductAvailabilityManager />;
            case 'pricing-audit':
                return <PricingAuditLog />;
            case 'smart-view':
                return <SmartViewMatrix />;
            case 'payment-gateways':
                return <PaymentGatewayManager />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                            <Settings size={32} className="text-gray-400 animate-spin-slow" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Select a pricing section to get started</p>
                        <p className="text-gray-400 text-sm">Choose a tab from the sidebar to manage your store configuration.</p>
                    </div>
                );
        }
    };

    return (
        <div className="pricing-dashboard min-h-screen bg-[#F8FAFC]">
            <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
                {/* Header Section */}
                <div className="mb-8">
                    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span>Admin</span>
                        <ChevronRight size={14} />
                        <span className="font-medium text-blue-600">Pricing Engine</span>
                        <ChevronRight size={14} />
                        <span className="text-gray-400">{metadata.title}</span>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                            {metadata.icon}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{metadata.title}</h1>
                            <p className="text-gray-500 mt-1">{metadata.desc}</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 min-h-[600px] overflow-hidden">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default PricingDashboard;
