import React, { useState, useEffect } from 'react';
import { Settings, Save, Info, CheckCircle, XCircle, Trash2, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import FeatureConfigForm from './FeatureConfigForm';

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
    configSchema?: any;
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
 */
const SegmentFeatureAssignment: React.FC = () => {
    const [segments, setSegments] = useState<UserSegment[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<string>('');
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    // Config modal state
    const [configModalFeature, setConfigModalFeature] = useState<Feature | null>(null);
    const [configText, setConfigText] = useState('{}');
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);

    useEffect(() => {
        fetchSegments();
    }, []);

    useEffect(() => {
        if (selectedSegment) {
            fetchSegmentFeatures();
            setSelectedKeys([]);
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

    const toggleFeatureSelection = (key: string) => {
        setSelectedKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleCategorySelection = (category: string, catFeatures: Feature[]) => {
        const catKeys = catFeatures.map(f => f.key);
        const allSelected = catKeys.every(k => selectedKeys.includes(k));

        if (allSelected) {
            setSelectedKeys(prev => prev.filter(k => !catKeys.includes(k)));
        } else {
            setSelectedKeys(prev => [...new Set([...prev, ...catKeys])]);
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
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to update feature');
            }
        } catch (error) {
            console.error('Toggle feature error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAction = async (action: 'ENABLE' | 'DISABLE' | 'REMOVE') => {
        if (selectedKeys.length === 0) return;

        const confirmMsg = action === 'REMOVE'
            ? `Are you sure you want to remove ${selectedKeys.length} features from this segment?`
            : `Bulk ${action.toLowerCase()} ${selectedKeys.length} features?`;

        if (!confirm(confirmMsg)) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            let response;

            if (action === 'REMOVE') {
                response = await fetch(`/api/admin/features/segments/${selectedSegment}/bulk`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ featureKeys: selectedKeys })
                });
            } else {
                const bulkFeatures = selectedKeys.map(key => {
                    const feature = features.find(f => f.key === key);
                    return {
                        featureKey: key,
                        isEnabled: action === 'ENABLE',
                        config: feature?.segmentConfig || {}
                    };
                });

                response = await fetch(`/api/admin/features/segments/${selectedSegment}/bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ features: bulkFeatures })
                });
            }

            if (response.ok) {
                await fetchSegmentFeatures();
                setSelectedKeys([]);
                alert('Bulk action completed successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Bulk action failed');
            }
        } catch (error) {
            console.error('Bulk action error:', error);
            alert('An error occurred during bulk action');
        } finally {
            setSaving(false);
        }
    };

    const openConfigModal = (feature: Feature) => {
        setConfigModalFeature(feature);
        const config = feature.segmentConfig || {};
        setConfigText(JSON.stringify(config, null, 2));
        // Default to form mode if schema exists, otherwise JSON
        setIsAdvancedMode(!feature.configSchema || !feature.configSchema.fields);
    };

    const handleFormConfigChange = (newConfig: any) => {
        setConfigText(JSON.stringify(newConfig, null, 2));
    };

    const saveFeatureConfig = async () => {
        if (!configModalFeature) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            let config;
            try {
                config = JSON.parse(configText);
            } catch (e) {
                alert('Invalid JSON format');
                setSaving(false);
                return;
            }

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
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Save config error:', error);
            alert('Save failed');
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
        <div className="p-6 pb-32">
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
            <div className="mb-6 bg-white p-4 rounded-lg shadow border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User Segment
                </label>
                <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all"
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
            {selectedSegment ? (
                loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading segment features...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedFeatures).length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200">
                                <Info className="mx-auto text-gray-400 mb-2" size={40} />
                                <p className="text-gray-500">No active features found in the system.</p>
                            </div>
                        )}

                        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleCategorySelection(category, categoryFeatures)}
                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            {categoryFeatures.every(f => selectedKeys.includes(f.key)) ? (
                                                <CheckSquare size={20} className="text-blue-600" />
                                            ) : categoryFeatures.some(f => selectedKeys.includes(f.key)) ? (
                                                <MinusSquare size={20} className="text-blue-600" />
                                            ) : (
                                                <Square size={20} />
                                            )}
                                        </button>
                                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            {category}
                                            <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                                {categoryFeatures.filter(f => f.isEnabledForSegment).length}/{categoryFeatures.length} enabled
                                            </span>
                                        </h2>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {categoryFeatures.map((feature) => (
                                        <div
                                            key={feature._id}
                                            className={`p-4 transition-all hover:bg-gray-50 flex items-center gap-4 ${selectedKeys.includes(feature.key) ? 'bg-blue-50/50' : ''
                                                }`}
                                        >
                                            {/* Selection Checkbox */}
                                            <button
                                                onClick={() => toggleFeatureSelection(feature.key)}
                                                className={`transition-colors flex-shrink-0 ${selectedKeys.includes(feature.key) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'
                                                    }`}
                                            >
                                                {selectedKeys.includes(feature.key) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>

                                            <div className="flex-1 flex items-center justify-between">
                                                {/* Feature Info */}
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h3 className="font-bold text-gray-900 truncate">{feature.name}</h3>
                                                        <code className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-mono">
                                                            {feature.key}
                                                        </code>
                                                        {feature.isPremium && (
                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                                                                PREMIUM
                                                            </span>
                                                        )}
                                                        {feature.isBeta && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                                                                BETA
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-1">{feature.description}</p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {/* Configure Button */}
                                                    {feature.isEnabledForSegment && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openConfigModal(feature); }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Configure Feature"
                                                        >
                                                            <Settings size={18} />
                                                        </button>
                                                    )}

                                                    {/* Enable/Disable Toggle */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleFeature(feature); }}
                                                        disabled={saving}
                                                        className={`w-28 py-1.5 rounded-lg flex items-center justify-center gap-2 font-semibold text-xs transition-all ${feature.isEnabledForSegment
                                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {feature.isEnabledForSegment ? (
                                                            <><CheckCircle size={14} /> Enabled</>
                                                        ) : (
                                                            <><XCircle size={14} /> Disabled</>
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
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border shadow-blue-500/5">
                    <div className="p-4 bg-blue-50 rounded-full mb-4">
                        <Settings className="text-blue-500" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Segment Selected</h3>
                    <p className="text-gray-500 max-w-sm text-center">
                        Please select a user segment from the dropdown above to manage its feature set.
                    </p>
                </div>
            )}

            {/* Bulk Action Bar - Floating */}
            <AnimatePresence>
                {selectedKeys.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-8 border border-white/10 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-3 pr-8 border-r border-white/20">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                                {selectedKeys.length}
                            </div>
                            <span className="font-medium text-sm whitespace-nowrap">Selected Features</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleBulkAction('ENABLE')}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <CheckCircle size={16} /> Enable All
                            </button>
                            <button
                                onClick={() => handleBulkAction('DISABLE')}
                                disabled={saving}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <XCircle size={16} /> Disable All
                            </button>
                            <button
                                onClick={() => handleBulkAction('REMOVE')}
                                disabled={saving}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 size={16} /> Remove Selected
                            </button>
                            <button
                                onClick={() => setSelectedKeys([])}
                                className="ml-4 text-slate-400 hover:text-white text-sm font-medium"
                            >
                                Clear
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Config Modal */}
            {configModalFeature && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                    >
                        <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                                <Settings className="text-blue-600" />
                                Configure: {configModalFeature.name}
                            </h2>
                            <div className="flex items-center gap-4">
                                {configModalFeature.configSchema?.fields && (
                                    <button 
                                        onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all"
                                    >
                                        {isAdvancedMode ? 'Switch to Smart UI' : 'Switch to Advanced (JSON)'}
                                    </button>
                                )}
                                <button onClick={() => setConfigModalFeature(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                                <Info className="text-blue-600 flex-shrink-0" size={20} />
                                <div className="text-sm text-blue-900">
                                    <p className="font-bold mb-1">
                                        {isAdvancedMode ? 'Advanced JSON Configuration' : 'Feature Configuration'}
                                    </p>
                                    <p className="opacity-80">
                                        {isAdvancedMode 
                                            ? 'Define custom limits, feature flags, or integration settings for this specific segment.'
                                            : 'Easily manage specific settings for this feature using the form below.'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {isAdvancedMode ? (
                                    <>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                            Feature JSON Data
                                        </label>
                                        <textarea
                                            value={configText}
                                            onChange={(e) => setConfigText(e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm h-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                            placeholder='{"key": "value"}'
                                        />
                                    </>
                                ) : (
                                    <FeatureConfigForm 
                                        schema={configModalFeature.configSchema}
                                        currentConfig={JSON.parse(configText || '{}')}
                                        onChange={handleFormConfigChange}
                                    />
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setConfigModalFeature(null)}
                                    className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveFeatureConfig}
                                    disabled={saving}
                                    className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default SegmentFeatureAssignment;
