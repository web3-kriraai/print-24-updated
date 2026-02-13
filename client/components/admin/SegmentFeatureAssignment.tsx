import React, { useState, useEffect } from 'react';
import { Settings, Save, Info, CheckCircle, XCircle } from 'lucide-react';

interface Feature {
    _id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    isPremium: boolean;
    isBeta: boolean;
    assignedToSegment: boolean;
    isEnabledForSegment: boolean;
    segmentConfig: any;
}

interface UserSegment {
    _id: string;
    name: string;
    code: string;
}

/**
 * Segment Feature Assignment
 * 
 * Admin component to assign features to user segments.
 * Shows all available features and allows enabling/disabling + configuring for each segment.
 */
const SegmentFeatureAssignment: React.FC = () => {
    const [segments, setSegments] = useState<UserSegment[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<string>('');
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Config modal state
    const [configModalFeature, setConfigModalFeature] = useState<Feature | null>(null);
    const [configText, setConfigText] = useState('{}');

    useEffect(() => {
        fetchSegments();
    }, []);

    useEffect(() => {
        if (selectedSegment) {
            fetchSegmentFeatures();
        }
    }, [selectedSegment]);

    const fetchSegments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/pricing/user-segments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setSegments(data.segments || []);
        } catch (error) {
            console.error('Failed to fetch segments:', error);
        }
    };

    const fetchSegmentFeatures = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/features/segments/${selectedSegment}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setFeatures(data.data || []);
        } catch (error) {
            console.error('Failed to fetch segment features:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeature = async (feature: Feature) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const newState = !feature.isEnabledForSegment;

            const response = await fetch(`/api/admin/features/segments/${selectedSegment}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    featureKey: feature.key,
                    isEnabled: newState,
                    config: feature.segmentConfig || {}
                })
            });

            if (response.ok) {
                await fetchSegmentFeatures();
                alert(`Feature ${newState ? 'enabled' : 'disabled'} successfully!`);
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to update feature');
            }
        } catch (error) {
            console.error('Toggle feature error:', error);
            alert('Failed to update feature');
        } finally {
            setSaving(false);
        }
    };

    const openConfigModal = (feature: Feature) => {
        setConfigModalFeature(feature);
        setConfigText(JSON.stringify(feature.segmentConfig || {}, null, 2));
    };

    const saveFeatureConfig = async () => {
        if (!configModalFeature) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const config = JSON.parse(configText);

            const response = await fetch(`/api/admin/features/segments/${selectedSegment}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    featureKey: configModalFeature.key,
                    isEnabled: configModalFeature.isEnabledForSegment,
                    config
                })
            });

            if (response.ok) {
                await fetchSegmentFeatures();
                setConfigModalFeature(null);
                alert('Configuration saved successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Save config error:', error);
            alert('Invalid JSON or save failed');
        } finally {
            setSaving(false);
        }
    };

    const groupedFeatures = features.reduce((acc, feature) => {
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
                    <Settings className="text-blue-600" />
                    Segment Feature Assignment
                </h1>
                <p className="text-gray-600 mt-2">
                    Assign features to user segments. Users inherit features from their segment.
                </p>
            </div>

            {/* Segment Selector */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User Segment
                </label>
                <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Choose a segment...</option>
                    {segments.map((seg) => (
                        <option key={seg._id} value={seg._id}>
                            {seg.name} ({seg.code})
                        </option>
                    ))}
                </select>
            </div>

            {/* Features List */}
            {selectedSegment && (
                loading ? (
                    <div className="text-center py-8 text-gray-500">Loading features...</div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                            <div key={category} className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    {category}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({categoryFeatures.filter(f => f.isEnabledForSegment).length}/{categoryFeatures.length} enabled)
                                    </span>
                                </h2>

                                <div className="space-y-3">
                                    {categoryFeatures.map((feature) => (
                                        <div
                                            key={feature._id}
                                            className={`border-2 rounded-lg p-4 transition-all ${feature.isEnabledForSegment
                                                    ? 'border-green-300 bg-green-50'
                                                    : 'border-gray-200 bg-white'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                {/* Feature Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-gray-900">{feature.name}</h3>
                                                        <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                            {feature.key}
                                                        </code>
                                                        {feature.isPremium && (
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                                                Premium
                                                            </span>
                                                        )}
                                                        {feature.isBeta && (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                                Beta
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">{feature.description}</p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 ml-4">
                                                    {/* Configure Button */}
                                                    {feature.isEnabledForSegment && (
                                                        <button
                                                            onClick={() => openConfigModal(feature)}
                                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 text-sm"
                                                        >
                                                            <Settings size={14} />
                                                            Config
                                                        </button>
                                                    )}

                                                    {/* Enable/Disable Toggle */}
                                                    <button
                                                        onClick={() => handleToggleFeature(feature)}
                                                        disabled={saving}
                                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${feature.isEnabledForSegment
                                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                    >
                                                        {feature.isEnabledForSegment ? (
                                                            <>
                                                                <XCircle size={16} />
                                                                Disable
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle size={16} />
                                                                Enable
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {!selectedSegment && (
                <div className="text-center py-12 text-gray-500">
                    Please select a user segment to manage features.
                </div>
            )}

            {/* Config Modal */}
            {configModalFeature && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Settings className="text-blue-600" />
                            Configure: {configModalFeature.name}
                        </h2>

                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info size={16} className="text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-900">
                                    <p className="font-medium mb-1">Feature Configuration (JSON)</p>
                                    <p>This configuration will be passed to the feature when it's accessed. Common configs include limits, options, and feature-specific settings.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Configuration (JSON)
                            </label>
                            <textarea
                                value={configText}
                                onChange={(e) => setConfigText(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm h-64"
                                placeholder='{"key": "value"}'
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setConfigModalFeature(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveFeatureConfig}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SegmentFeatureAssignment;
