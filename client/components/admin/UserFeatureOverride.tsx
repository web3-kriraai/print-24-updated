import React, { useState, useEffect } from 'react';
import { UserCog, Save, X, Search, Shield, CheckCircle, XCircle, Info } from 'lucide-react';

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
 * Allows admins to grant or revoke specific features for individual users,
 * overriding their segment defaults.
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

    useEffect(() => {
        fetchUsers();
        fetchFeatures();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchUserFeatures();
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

    const openOverrideModal = (feature: Feature) => {
        const userFeature = userFeatures.find(f => f.key === feature.key);
        const hasFeature = !!userFeature;
        const isOverride = userFeature?.source === 'user_override';
        const isEnabled = userFeature?.isEnabled || false;

        setOverrideModal({
            isOpen: true,
            feature,
            currentState: { hasFeature, isOverride, isEnabled }
        });

        if (isOverride && userFeature) {
            setOverrideForm({
                isEnabled: userFeature.isEnabled,
                notes: userFeature.notes || '',
                config: JSON.stringify(userFeature.config || {}, null, 2)
            });
        } else {
            setOverrideForm({
                isEnabled: true,
                notes: '',
                config: '{}'
            });
        }
    };

    const saveOverride = async () => {
        if (!overrideModal.feature) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const config = JSON.parse(overrideForm.config);

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
                alert('Feature override saved successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save override');
            }
        } catch (error) {
            console.error('Save override error:', error);
            alert('Invalid JSON or save failed');
        } finally {
            setSaving(false);
        }
    };

    const removeOverride = async (featureKey: string) => {
        if (!confirm('Remove this feature override? User will revert to segment defaults.')) {
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/features/users/${selectedUser}/${featureKey}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchUserFeatures();
                alert('Override removed successfully!');
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to remove override');
            }
        } catch (error) {
            console.error('Remove override error:', error);
            alert('Failed to remove override');
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
        <div className="p-6">
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

            {/* User Search & Selection */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search & Select User
                </label>

                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                {searchQuery && (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredUsers.map(user => (
                            <button
                                key={user._id}
                                onClick={() => {
                                    setSelectedUser(user._id);
                                    setSearchQuery('');
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${selectedUser === user._id ? 'bg-purple-50' : ''
                                    }`}
                            >
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-600">{user.email}</div>
                                {user.userSegment && (
                                    <div className="text-xs text-purple-600 mt-1">
                                        Segment: {user.userSegment.name}
                                    </div>
                                )}
                            </button>
                        ))}

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-4 text-gray-500">No users found</div>
                        )}
                    </div>
                )}

                {selectedUserData && (
                    <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-bold text-gray-900">{selectedUserData.name}</div>
                                <div className="text-sm text-gray-600">{selectedUserData.email}</div>
                                {selectedUserData.userSegment && (
                                    <div className="text-sm text-purple-700 mt-1">
                                        Segment: {selectedUserData.userSegment.name} ({selectedUserData.userSegment.code})
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedUser('')}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Features List */}
            {selectedUser && (
                loadingUserFeatures ? (
                    <div className="text-center py-8 text-gray-500">Loading user features...</div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                            <div key={category} className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    {category}
                                    <span className="text-sm font-normal text-gray-500">
                                        ({categoryFeatures.filter(f => f.isOverride).length} overrides)
                                    </span>
                                </h2>

                                <div className="space-y-3">
                                    {categoryFeatures.map((feature) => (
                                        <div
                                            key={feature._id}
                                            className={`border-2 rounded-lg p-4 transition-all ${feature.isOverride
                                                ? feature.isEnabled
                                                    ? 'border-green-300 bg-green-50'
                                                    : 'border-red-300 bg-red-50'
                                                : feature.hasFeature
                                                    ? 'border-blue-200 bg-blue-50'
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

                                                        {/* Status Badges */}
                                                        {feature.isOverride && (
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${feature.isEnabled
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                Override: {feature.isEnabled ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                        )}
                                                        {!feature.isOverride && feature.hasFeature && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                                From Segment
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-gray-600 mb-2">{feature.description}</p>

                                                    {feature.notes && (
                                                        <div className="text-xs text-gray-500 italic flex items-center gap-1">
                                                            <Info size={12} />
                                                            Admin note: {feature.notes}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 ml-4">
                                                    {feature.isOverride && (
                                                        <button
                                                            onClick={() => removeOverride(feature.key)}
                                                            disabled={saving}
                                                            className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1 text-sm"
                                                        >
                                                            <XCircle size={14} />
                                                            Remove
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => openOverrideModal(feature)}
                                                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                                                    >
                                                        <Shield size={16} />
                                                        {feature.isOverride ? 'Edit Override' : 'Add Override'}
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

            {!selectedUser && (
                <div className="text-center py-12 text-gray-500">
                    Please search and select a user to manage their feature overrides.
                </div>
            )}

            {/* Override Modal */}
            {overrideModal.isOpen && overrideModal.feature && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Shield className="text-purple-600" />
                            {overrideModal.currentState.isOverride ? 'Edit' : 'Add'} Override: {overrideModal.feature.name}
                        </h2>

                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info size={16} className="text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-900">
                                    <p className="font-medium mb-1">Override Priority</p>
                                    <p>User overrides always take precedence over segment features. This allows you to grant or revoke features for individual users regardless of their segment assignment.</p>

                                    {overrideModal.currentState.hasFeature && !overrideModal.currentState.isOverride && (
                                        <p className="mt-2 font-medium">
                                            Current Status: User has this feature from segment ({selectedUserData?.userSegment?.name})
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Enable/Disable Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Feature Status
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={overrideForm.isEnabled}
                                            onChange={() => setOverrideForm({ ...overrideForm, isEnabled: true })}
                                            className="text-purple-600"
                                        />
                                        <span className="text-sm font-medium">Enable for this user</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={!overrideForm.isEnabled}
                                            onChange={() => setOverrideForm({ ...overrideForm, isEnabled: false })}
                                            className="text-purple-600"
                                        />
                                        <span className="text-sm font-medium">Disable for this user</span>
                                    </label>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    value={overrideForm.notes}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    rows={2}
                                    placeholder="Why is this override necessary?"
                                />
                            </div>

                            {/* Config */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Feature Configuration (JSON)
                                </label>
                                <textarea
                                    value={overrideForm.config}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, config: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm h-48"
                                    placeholder='{"key": "value"}'
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-6">
                            <button
                                onClick={() => setOverrideModal({ isOpen: false, feature: null, currentState: { hasFeature: false, isOverride: false, isEnabled: false } })}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveOverride}
                                disabled={saving}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Override'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserFeatureOverride;
