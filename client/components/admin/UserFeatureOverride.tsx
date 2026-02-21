import React, { useState, useEffect } from 'react';
import { UserCog, Save, X, Search, Shield, CheckCircle, XCircle, Info, Trash2, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FeatureConfigForm from './FeatureConfigForm';

interface User {
    _id: string;
    name: string;
    email: string;
    userSegment?: {
        name: string;
        code: string;
    };
}

interface Feature {
    _id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    isPremium: boolean;
    isBeta: boolean;
    configSchema?: any;
}

interface UserFeature {
    key: string;
    isEnabled: boolean;
    config: any;
    source: 'segment' | 'user_override';
    segmentName?: string;
    notes?: string;
    enabledBy?: string;
    enabledAt?: string;
}

/**
 * User Feature Override
 * 
 * Admin component for adding/removing individual user feature overrides.
 */
const UserFeatureOverride: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [userFeatures, setUserFeatures] = useState<UserFeature[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingFeatures, setLoadingFeatures] = useState(false);
    const [loadingUserFeatures, setLoadingUserFeatures] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);

    // Override modal state
    const [overrideModal, setOverrideModal] = useState<{
        isOpen: boolean;
        feature: Feature | null;
        currentState: {
            hasFeature: boolean;
            isOverride: boolean;
            isEnabled: boolean;
        };
    }>({
        isOpen: false,
        feature: null,
        currentState: { hasFeature: false, isOverride: false, isEnabled: false }
    });

    const [overrideForm, setOverrideForm] = useState({
        isEnabled: true,
        notes: '',
        config: '{}'
    });

    // Bulk override modal state
    const [bulkModal, setBulkModal] = useState({
        isOpen: false,
        featureKeys: [] as string[]
    });

    useEffect(() => {
        fetchUsers();
        fetchFeatures();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchUserFeatures();
            setSelectedKeys([]);
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(data || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchFeatures = async () => {
        setLoadingFeatures(true);
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
            setLoadingFeatures(false);
        }
    };

    const fetchUserFeatures = async () => {
        setLoadingUserFeatures(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/features/users/${selectedUser}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUserFeatures(data.features || []);
        } catch (error) {
            console.error('Failed to fetch user features:', error);
        } finally {
            setLoadingUserFeatures(false);
        }
    };

    const toggleFeatureSelection = (key: string) => {
        setSelectedKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleCategorySelection = (category: string, catFeatures: any[]) => {
        const catKeys = catFeatures.map(f => f.key);
        const allSelected = catKeys.every(k => selectedKeys.includes(k));

        if (allSelected) {
            setSelectedKeys(prev => prev.filter(k => !catKeys.includes(k)));
        } else {
            setSelectedKeys(prev => [...new Set([...prev, ...catKeys])]);
        }
    };

    const openOverrideModal = (feature: Feature) => {
        const userFeature = userFeatures.find(f => f.key === feature.key);
        const hasFeature = !!userFeature;
        const isOverride = userFeature?.source === 'user_override';
        const isEnabled = userFeature?.isEnabled || false;

        const config = userFeature?.config || {};
        const configStr = JSON.stringify(config, null, 2);

        setOverrideModal({
            isOpen: true,
            feature,
            currentState: { hasFeature, isOverride, isEnabled }
        });

        if (isOverride && userFeature) {
            setOverrideForm({
                isEnabled: userFeature.isEnabled,
                notes: userFeature.notes || '',
                config: configStr
            });
        } else {
            setOverrideForm({
                isEnabled: true,
                notes: '',
                config: '{}'
            });
        }

        // Default to form mode if schema exists, otherwise JSON
        setIsAdvancedMode(!feature.configSchema || !feature.configSchema.fields);
    };

    const handleFormConfigChange = (newConfig: any) => {
        setOverrideForm(prev => ({ ...prev, config: JSON.stringify(newConfig, null, 2) }));
    };

    const saveOverride = async () => {
        if (!overrideModal.feature) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            let config;
            try {
                config = JSON.parse(overrideForm.config);
            } catch (e) {
                alert('Invalid JSON format');
                setSaving(false);
                return;
            }

            const response = await fetch(`/api/admin/features/users/${selectedUser}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    featureKey: overrideModal.feature.key,
                    isEnabled: overrideForm.isEnabled,
                    config,
                    notes: overrideForm.notes
                })
            });

            if (response.ok) {
                await fetchUserFeatures();
                setOverrideModal({ isOpen: false, feature: null, currentState: { hasFeature: false, isOverride: false, isEnabled: false } });
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save override');
            }
        } catch (error) {
            console.error('Save override error:', error);
            alert('Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkOverride = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const config = JSON.parse(overrideForm.config);

            const bulkFeatures = bulkModal.featureKeys.map(key => ({
                featureKey: key,
                isEnabled: overrideForm.isEnabled,
                config,
                notes: overrideForm.notes
            }));

            const response = await fetch(`/api/admin/features/users/${selectedUser}/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ features: bulkFeatures })
            });

            if (response.ok) {
                await fetchUserFeatures();
                setBulkModal({ isOpen: false, featureKeys: [] });
                setSelectedKeys([]);
                alert('Bulk overrides saved successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Bulk overrides failed');
            }
        } catch (error) {
            console.error('Bulk override error:', error);
            alert('Invalid JSON or save failed');
        } finally {
            setSaving(false);
        }
    };

    const removeOverride = async (featureKey: string) => {
        if (!confirm('Remove this feature override? User will revert to segment defaults.')) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/features/users/${selectedUser}/${featureKey}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchUserFeatures();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to remove override');
            }
        } catch (error) {
            console.error('Remove override error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleBulkRemove = async () => {
        const overrideKeys = selectedKeys.filter(key => {
            const uf = userFeatures.find(f => f.key === key);
            return uf?.source === 'user_override';
        });

        if (overrideKeys.length === 0) {
            alert('No user overrides selected to remove.');
            return;
        }

        if (!confirm(`Remove ${overrideKeys.length} feature overrides?`)) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/features/users/${selectedUser}/bulk`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ featureKeys: overrideKeys })
            });

            if (response.ok) {
                await fetchUserFeatures();
                setSelectedKeys([]);
                alert('Overrides removed successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Bulk removal failed');
            }
        } catch (error) {
            console.error('Bulk removal error:', error);
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const selectedUserData = users.find(u => u._id === selectedUser);

    const featuresWithStatus = features.map(feature => {
        const userFeature = userFeatures.find(f => f.key === feature.key);
        return {
            ...feature,
            hasFeature: !!userFeature,
            isOverride: userFeature?.source === 'user_override',
            isEnabled: userFeature?.isEnabled || false,
            source: userFeature?.source,
            notes: userFeature?.notes
        };
    });

    const groupedFeatures = featuresWithStatus.reduce((acc, feature) => {
        const cat = feature.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(feature);
        return acc;
    }, {} as Record<string, typeof featuresWithStatus>);

    return (
        <div className="p-6 pb-32">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <UserCog className="text-purple-600" />
                    User Feature Overrides
                </h1>
                <p className="text-gray-600 mt-2">
                    Manage individual user feature access. Overrides take precedence over segment defaults.
                </p>
            </div>

            {/* User Selection */}
            <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Search & Select User
                </label>

                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type name or email to search..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                    />
                </div>

                {searchQuery && (
                    <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl shadow-lg bg-white divide-y divide-gray-50">
                        {filteredUsers.map(user => (
                            <button
                                key={user._id}
                                onClick={() => { setSelectedUser(user._id); setSearchQuery(''); }}
                                className={`w-full text-left px-5 py-4 hover:bg-purple-50 transition-colors flex items-center justify-between ${selectedUser === user._id ? 'bg-purple-50/50' : ''
                                    }`}
                            >
                                <div>
                                    <div className="font-bold text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                                {user.userSegment && (
                                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                        {user.userSegment.code}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {selectedUserData && (
                    <div className="mt-4 p-5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                {selectedUserData.name?.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-gray-900 text-lg">{selectedUserData.name}</div>
                                <div className="text-sm text-gray-500">{selectedUserData.email}</div>
                                {selectedUserData.userSegment && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-semibold text-purple-700">Segment: {selectedUserData.userSegment.name}</span>
                                        <span className="w-1 h-1 bg-purple-300 rounded-full"></span>
                                        <span className="text-xs font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">{selectedUserData.userSegment.code}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedUser('')}
                            className="p-2 text-purple-300 hover:text-purple-600 hover:bg-white rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Features List */}
            {selectedUser ? (
                loadingUserFeatures ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Analyzing user permissions...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                            <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleCategorySelection(category, categoryFeatures)}
                                            className="text-gray-400 hover:text-purple-600 transition-colors"
                                        >
                                            {categoryFeatures.every(f => selectedKeys.includes(f.key)) ? (
                                                <CheckSquare size={20} className="text-purple-600" />
                                            ) : categoryFeatures.some(f => selectedKeys.includes(f.key)) ? (
                                                <MinusSquare size={20} className="text-purple-600" />
                                            ) : (
                                                <Square size={20} />
                                            )}
                                        </button>
                                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            {category}
                                            <span className="text-xs font-normal text-gray-400">
                                                {categoryFeatures.filter(f => f.isOverride).length} overrides active
                                            </span>
                                        </h2>
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-50">
                                    {categoryFeatures.map((feature) => (
                                        <div
                                            key={feature._id}
                                            className={`p-4 transition-all hover:bg-gray-50 flex items-center gap-4 ${selectedKeys.includes(feature.key) ? 'bg-purple-50/50' : ''
                                                }`}
                                        >
                                            <button
                                                onClick={() => toggleFeatureSelection(feature.key)}
                                                className={`transition-colors flex-shrink-0 ${selectedKeys.includes(feature.key) ? 'text-purple-600' : 'text-gray-300 hover:text-gray-400'
                                                    }`}
                                            >
                                                {selectedKeys.includes(feature.key) ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </button>

                                            <div className="flex-1 flex items-center justify-between min-w-0">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h3 className="font-bold text-gray-900 truncate">{feature.name}</h3>
                                                        <code className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-mono uppercase tracking-tighter">
                                                            {feature.key}
                                                        </code>

                                                        {feature.isOverride ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${feature.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                <CheckCircle size={10} /> {feature.isEnabled ? 'OVERRIDE: ON' : 'OVERRIDE: OFF'}
                                                            </span>
                                                        ) : feature.hasFeature ? (
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                                                                INHERITED
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-1">{feature.description}</p>
                                                    {feature.notes && (
                                                        <p className="text-[11px] text-purple-400 mt-1 italic flex items-center gap-1">
                                                            <Info size={12} /> {feature.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {feature.isOverride && (
                                                        <button
                                                            onClick={() => removeOverride(feature.key)}
                                                            disabled={saving}
                                                            className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Remove Override"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openOverrideModal(feature)}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${feature.isOverride
                                                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-purple-600 hover:text-white'
                                                            }`}
                                                    >
                                                        {feature.isOverride ? 'Config' : 'Override'}
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
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border shadow-xl shadow-purple-500/5">
                    <div className="p-6 bg-purple-50 rounded-full mb-6">
                        <UserCog className="text-purple-400" size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No User Context</h3>
                    <p className="text-gray-500 max-w-sm text-center">
                        Select an individual user to view their effective permissions and manage custom overrides.
                    </p>
                </div>
            )}

            {/* Bulk Actions */}
            <AnimatePresence>
                {selectedKeys.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-2xl z-50 flex items-center gap-8 border border-white/10 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-3 pr-8 border-r border-white/20">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold">
                                {selectedKeys.length}
                            </div>
                            <div className="text-xs">
                                <p className="font-bold opacity-100 leading-tight">BATCH</p>
                                <p className="opacity-60 leading-tight">Selected</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    setOverrideForm({ isEnabled: true, notes: '', config: '{}' });
                                    setBulkModal({ isOpen: true, featureKeys: selectedKeys });
                                }}
                                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-2 text-sm font-bold transition-all active:scale-95 shadow-lg"
                            >
                                <Shield size={16} /> Bulk Override
                            </button>
                            <button
                                onClick={handleBulkRemove}
                                disabled={saving}
                                className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl flex items-center gap-2 text-sm font-bold transition-all active:scale-95 border border-red-600/30"
                            >
                                <Trash2 size={16} /> Remove Overrides
                            </button>
                            <button
                                onClick={() => setSelectedKeys([])}
                                className="ml-4 text-slate-500 hover:text-white text-sm font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Override Modals */}
            <AnimatePresence>
                {(overrideModal.isOpen || bulkModal.isOpen) && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            {bulkModal.isOpen ? (
                                <>
                                    <div className="px-8 py-6 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
                                            <Shield className="text-purple-600" />
                                            {`Bulk Override (${bulkModal.featureKeys.length} Features)`}
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setOverrideModal({ isOpen: false, feature: null, currentState: { hasFeature: false, isOverride: false, isEnabled: false } });
                                                setBulkModal({ isOpen: false, featureKeys: [] });
                                            }}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X size={28} />
                                        </button>
                                    </div>

                                    <div className="p-8">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Target Resolution</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        onClick={() => setOverrideForm({ ...overrideForm, isEnabled: true })}
                                                        className={`py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${overrideForm.isEnabled ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-transparent text-gray-400'
                                                            }`}
                                                    >
                                                        <CheckCircle size={20} /> FORCE ENABLE
                                                    </button>
                                                    <button
                                                        onClick={() => setOverrideForm({ ...overrideForm, isEnabled: false })}
                                                        className={`py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${!overrideForm.isEnabled ? 'bg-red-50 border-red-500 text-red-700' : 'bg-gray-50 border-transparent text-gray-400'
                                                            }`}
                                                    >
                                                        <XCircle size={20} /> FORCE DISABLE
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Administrative Notes</label>
                                                <textarea
                                                    value={overrideForm.notes}
                                                    onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                                                    className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                    rows={2}
                                                    placeholder="Reason for this override..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Technical Config (JSON)</label>
                                                <textarea
                                                    value={overrideForm.config}
                                                    onChange={(e) => setOverrideForm({ ...overrideForm, config: e.target.value })}
                                                    className="w-full bg-slate-900 text-purple-300 border border-transparent rounded-2xl px-5 py-4 font-mono text-xs h-40 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                    placeholder='{"key": "value"}'
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-4 justify-end mt-8">
                                            <button
                                                onClick={() => {
                                                    setOverrideModal({ isOpen: false, feature: null, currentState: { hasFeature: false, isOverride: false, isEnabled: false } });
                                                    setBulkModal({ isOpen: false, featureKeys: [] });
                                                }}
                                                className="px-8 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={handleBulkOverride}
                                                disabled={saving}
                                                className="px-10 py-3 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                <Save size={20} />
                                                {saving ? 'Processing...' : 'Apply Override'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : ( // This is the overrideModal.isOpen part
                                <>
                                    <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Shield className="text-blue-600" />
                                            Override: {overrideModal.feature?.name}
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            {overrideModal.feature?.configSchema?.fields && (
                                                <button
                                                    onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all"
                                                >
                                                    {isAdvancedMode ? 'Switch to Smart UI' : 'Switch to Advanced (JSON)'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setOverrideModal({ isOpen: false, feature: null, currentState: { hasFeature: false, isOverride: false, isEnabled: false } })}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                        {overrideModal.feature?.configSchema?.fields ? (
                                            isAdvancedMode ? (
                                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-sm text-blue-900">
                                                    <Info className="flex-shrink-0 text-blue-600" size={18} />
                                                    <p>You are in advanced mode. Edit the raw JSON configuration directly. Switch to Smart UI for a guided experience.</p>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-sm text-blue-900">
                                                    <Info className="flex-shrink-0 text-blue-600" size={18} />
                                                    <p>You are in Smart UI mode. Use the form fields below to configure this feature. Switch to Advanced (JSON) for direct JSON editing.</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-sm text-amber-900">
                                                <Info className="flex-shrink-0 text-amber-600" size={18} />
                                                <p>This feature does not have a defined configuration schema. You can only edit its raw JSON configuration in advanced mode.</p>
                                            </div>
                                        )}

                                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-sm text-amber-900">
                                            <Info className="flex-shrink-0 text-amber-600" size={18} />
                                            <p>User-level overrides take precedence over segment-level features. Use this for specific user customizations.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Override Status</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setOverrideForm(prev => ({ ...prev, isEnabled: true }))}
                                                        className={`flex-1 py-2 rounded-lg border font-bold text-sm transition-all ${
                                                            overrideForm.isEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'
                                                        }`}
                                                    >
                                                        ENABLED
                                                    </button>
                                                    <button
                                                        onClick={() => setOverrideForm(prev => ({ ...prev, isEnabled: false }))}
                                                        className={`flex-1 py-2 rounded-lg border font-bold text-sm transition-all ${
                                                            !overrideForm.isEnabled ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-400'
                                                        }`}
                                                    >
                                                        DISABLED
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Internal Notes (Reason for override)</label>
                                            <textarea
                                                value={overrideForm.notes}
                                                onChange={(e) => setOverrideForm(prev => ({ ...prev, notes: e.target.value }))}
                                                rows={2}
                                                placeholder="Why is this override being added?"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                                {isAdvancedMode ? 'Override JSON Configuration' : 'Override Settings'}
                                            </label>
                                            {isAdvancedMode || !overrideModal.feature?.configSchema?.fields ? (
                                                <textarea
                                                    value={overrideForm.config}
                                                    onChange={(e) => setOverrideForm(prev => ({ ...prev, config: e.target.value }))}
                                                    rows={6}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder='{"limit": 100}'
                                                />
                                            ) : (
                                                <FeatureConfigForm
                                                    schema={overrideModal.feature?.configSchema}
                                                    currentConfig={JSON.parse(overrideForm.config || '{}')}
                                                    onChange={handleFormConfigChange}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gray-50 flex justify-end gap-3">
                                        <button
                                            onClick={() => setOverrideModal({ isOpen: false, feature: null, currentState: { hasFeature: false, isOverride: false, isEnabled: false } })}
                                            className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveOverride}
                                            disabled={saving}
                                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Save size={18} />
                                            {saving ? 'Saving...' : 'Save Override'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserFeatureOverride;
