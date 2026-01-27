import React, { useState, useEffect } from 'react';
import {
    Truck,
    Power,
    Settings,
    Key,
    Save,
    RefreshCw,
    CheckCircle,
    XCircle,
    Eye,
    EyeOff,
    TestTube,
    AlertCircle,
    Shield
} from 'lucide-react';

/**
 * LogisticsProvidersManager Component
 * 
 * Admin UI for managing logistics providers:
 * - Enable/disable providers with toggle switches
 * - Manage API credentials (encrypted storage)
 * - Test provider connections
 */

interface LogisticsProvider {
    _id: string;
    name: string;
    displayName: string;
    type: 'INTERNAL' | 'EXTERNAL';
    isActive: boolean;
    priority: number;
    supportsCOD: boolean;
    supportsReverse: boolean;
    averageDeliveryTime: number;
    syncStatus: 'OK' | 'ERROR' | 'PENDING';
    lastSyncAt: string | null;
    hasCredentials?: boolean;
}

interface CredentialField {
    key: string;
    label: string;
    type: 'text' | 'password';
    placeholder: string;
}

const PROVIDER_CREDENTIALS: Record<string, CredentialField[]> = {
    SHIPROCKET: [
        { key: 'email', label: 'Email', type: 'text', placeholder: 'your@email.com' },
        { key: 'password', label: 'API Password', type: 'password', placeholder: '••••••••' }
    ],
    DELHIVERY: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Delhivery API Key' },
        { key: 'warehouseId', label: 'Warehouse ID', type: 'text', placeholder: 'Warehouse ID' }
    ],
    BLUEDART: [
        { key: 'licenseKey', label: 'License Key', type: 'password', placeholder: 'BlueDart License Key' },
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Client ID' }
    ],
    DTDC: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'DTDC API Key' },
        { key: 'customerId', label: 'Customer ID', type: 'text', placeholder: 'Customer ID' }
    ],
    ECOM_EXPRESS: [
        { key: 'username', label: 'Username', type: 'text', placeholder: 'Username' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'API Key' }
    ],
    INTERNAL: []
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function LogisticsProvidersManager() {
    const [providers, setProviders] = useState<LogisticsProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingCredentials, setEditingCredentials] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/logistics-providers`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch providers');

            const data = await response.json();
            setProviders(data.providers || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleProvider = async (providerId: string, isActive: boolean) => {
        setSaving(providerId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/logistics-providers/${providerId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive })
            });

            if (!response.ok) throw new Error('Failed to update provider');

            setProviders(prev => prev.map(p =>
                p._id === providerId ? { ...p, isActive } : p
            ));

            setSuccess(`Provider ${isActive ? 'enabled' : 'disabled'} successfully`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(null);
        }
    };

    const saveCredentials = async (providerId: string) => {
        setSaving(providerId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/logistics-providers/${providerId}/credentials`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ credentials })
            });

            if (!response.ok) throw new Error('Failed to save credentials');

            setEditingCredentials(null);
            setCredentials({});
            setSuccess('Credentials saved securely');
            setTimeout(() => setSuccess(null), 3000);

            // Refresh to update hasCredentials status
            fetchProviders();
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(null);
        }
    };

    const testConnection = async (providerId: string, providerName: string) => {
        setTesting(providerId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/logistics-providers/${providerId}/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(`${providerName} connection successful!`);
                setProviders(prev => prev.map(p =>
                    p._id === providerId ? { ...p, syncStatus: 'OK', lastSyncAt: new Date().toISOString() } : p
                ));
            } else {
                setError(`Connection test failed: ${data.error || 'Unknown error'}`);
            }
            setTimeout(() => { setSuccess(null); setError(null); }, 3000);
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        } finally {
            setTesting(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OK': return 'text-green-500';
            case 'ERROR': return 'text-red-500';
            default: return 'text-yellow-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OK': return <CheckCircle size={16} className="text-green-500" />;
            case 'ERROR': return <XCircle size={16} className="text-red-500" />;
            default: return <AlertCircle size={16} className="text-yellow-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw size={32} className="animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading providers...</span>
            </div>
        );
    }

    return (
        <div className="logistics-providers-manager">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Truck size={24} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Logistics Providers</h2>
                        <p className="text-sm text-gray-500">Manage courier partners and API integrations</p>
                    </div>
                </div>
                <button
                    onClick={fetchProviders}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <XCircle size={18} className="text-red-500" />
                    <span className="text-red-700">{error}</span>
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-500" />
                    <span className="text-green-700">{success}</span>
                </div>
            )}

            {/* Providers List */}
            <div className="space-y-4">
                {providers.map((provider) => (
                    <div
                        key={provider._id}
                        className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${provider.isActive ? 'border-green-200' : 'border-gray-200'
                            }`}
                    >
                        {/* Provider Header */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Toggle Switch */}
                                <button
                                    onClick={() => toggleProvider(provider._id, !provider.isActive)}
                                    disabled={saving === provider._id}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${provider.isActive ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${provider.isActive ? 'left-8' : 'left-1'
                                        }`} />
                                    {saving === provider._id && (
                                        <RefreshCw size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                                    )}
                                </button>

                                {/* Provider Info */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{provider.displayName || provider.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${provider.type === 'INTERNAL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {provider.type}
                                        </span>
                                        {provider.isActive && (
                                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                        <span>Priority: {provider.priority}</span>
                                        <span>•</span>
                                        <span>ETA: {provider.averageDeliveryTime} days</span>
                                        {provider.supportsCOD && (
                                            <>
                                                <span>•</span>
                                                <span className="text-green-600">COD ✓</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex items-center gap-3">
                                {/* Sync Status */}
                                <div className="flex items-center gap-1.5 text-sm">
                                    {getStatusIcon(provider.syncStatus)}
                                    <span className={getStatusColor(provider.syncStatus)}>{provider.syncStatus}</span>
                                </div>

                                {/* Credentials Button */}
                                {provider.type === 'EXTERNAL' && (
                                    <button
                                        onClick={() => setEditingCredentials(editingCredentials === provider._id ? null : provider._id)}
                                        className={`p-2 rounded-lg transition-colors ${editingCredentials === provider._id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        title="Manage Credentials"
                                    >
                                        <Key size={18} />
                                    </button>
                                )}

                                {/* Test Button */}
                                <button
                                    onClick={() => testConnection(provider._id, provider.displayName || provider.name)}
                                    disabled={testing === provider._id || !provider.isActive}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                >
                                    {testing === provider._id ? (
                                        <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                        <TestTube size={14} />
                                    )}
                                    Test
                                </button>
                            </div>
                        </div>

                        {/* Credentials Form */}
                        {editingCredentials === provider._id && provider.type === 'EXTERNAL' && (
                            <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield size={18} className="text-blue-500" />
                                    <span className="font-semibold text-gray-900">API Credentials</span>
                                    <span className="text-xs text-gray-500">(Encrypted storage)</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {PROVIDER_CREDENTIALS[provider.name]?.map((field) => (
                                        <div key={field.key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {field.label}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords[field.key] ? 'text' : field.type}
                                                    placeholder={field.placeholder}
                                                    value={credentials[field.key] || ''}
                                                    onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                {field.type === 'password' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-end gap-3 mt-4">
                                    <button
                                        onClick={() => {
                                            setEditingCredentials(null);
                                            setCredentials({});
                                        }}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => saveCredentials(provider._id)}
                                        disabled={saving === provider._id}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving === provider._id ? (
                                            <RefreshCw size={16} className="animate-spin" />
                                        ) : (
                                            <Save size={16} />
                                        )}
                                        Save Credentials
                                    </button>
                                </div>

                                {provider.hasCredentials && (
                                    <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle size={14} />
                                        Credentials already configured. Enter new values to update.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {providers.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <Truck size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No logistics providers configured</p>
                        <p className="text-sm text-gray-400 mt-1">Run the seed script to add providers</p>
                    </div>
                )}
            </div>
        </div>
    );
}
