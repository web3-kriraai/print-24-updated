import React, { useState, useEffect } from 'react';
import { Eye, Info, Shield } from 'lucide-react';

interface Feature {
    _id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    subcategory?: string;
    isActive: boolean;
    isBeta: boolean;
    isPremium: boolean;
    icon?: string;
    sortOrder: number;
}

/**
 * Feature List Viewer
 * 
 * Read-only view of all available features in the system.
 * Features are seeded from backend and cannot be  created/edited via UI.
 */
const FeatureListViewer: React.FC = () => {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    const categories = ['ALL', 'ORDERS', 'ANALYTICS', 'BRANDING', 'SUPPORT', 'FINANCIAL', 'PRICING', 'INTEGRATION'];

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/features', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setFeatures(data.data || []);
        } catch (error) {
            console.error('Failed to fetch features:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredFeatures = selectedCategory === 'ALL'
        ? features
        : features.filter(f => f.category === selectedCategory);

    const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
        const cat = feature.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="text-purple-600" />
                    Available Features
                </h1>
                <p className="text-gray-600 mt-2">
                    View all system features. Features are seeded from backend and read-only.
                </p>
            </div>

            {/* Category Filter */}
            <div className="mb-6 flex gap-2 flex-wrap">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === cat
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                        <div key={category} className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                {category}
                                <span className="text-sm font-normal text-gray-500">
                                    ({categoryFeatures.length} features)
                                </span>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categoryFeatures.map((feature) => (
                                    <div
                                        key={feature._id}
                                        className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {feature.icon && <span className="text-xl">{feature.icon}</span>}
                                                    <h3 className="font-bold text-gray-900">{feature.name}</h3>
                                                </div>
                                                <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {feature.key}
                                                </code>
                                            </div>

                                            {/* Status Badges */}
                                            <div className="flex gap-1">
                                                {feature.isActive && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                        Active
                                                    </span>
                                                )}
                                                {feature.isBeta && (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                        Beta
                                                    </span>
                                                )}
                                                {feature.isPremium && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                                        Premium
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-gray-600 mb-3">{feature.description}</p>

                                        {/* Subcategory */}
                                        {feature.subcategory && (
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Info size={12} />
                                                Subcategory: {feature.subcategory}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredFeatures.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                    No features found in this category.
                </div>
            )}
        </div>
    );
};

export default FeatureListViewer;
