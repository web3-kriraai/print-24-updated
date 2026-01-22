/**
 * Payment Gateway Manager Component
 * Admin UI for managing payment gateway configurations
 */
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import './PaymentGatewayManager.css';

interface Gateway {
    _id: string;
    name: string;
    display_name: string;
    is_active: boolean;
    is_healthy: boolean;
    priority: number;
    traffic_split_percent: number;
    mode: 'SANDBOX' | 'PRODUCTION';
    supported_methods: string[];
    tdr_rate: number;
    last_health_check?: string;
    failure_count: number;
    maskedKeys?: {
        live_public_key: string | null;
        live_secret_key: string | null;
        test_public_key: string | null;
        test_secret_key: string | null;
        webhook_secret: string | null;
    };
}

interface GatewayFormData {
    name: string;
    display_name: string;
    mode: 'SANDBOX' | 'PRODUCTION';
    priority: number;
    traffic_split_percent: number;
    test_public_key: string;
    test_secret_key: string;
    live_public_key: string;
    live_secret_key: string;
    webhook_secret: string;
    supported_methods: string[];
    tdr_rate: number;
}

const GATEWAY_OPTIONS = [
    { value: 'RAZORPAY', label: 'Razorpay', logo: '💳' },
    { value: 'STRIPE', label: 'Stripe', logo: '💵' },
    { value: 'PHONEPE', label: 'PhonePe', logo: '📱' },
    { value: 'PAYU', label: 'PayU', logo: '💰' },
    { value: 'CASHFREE', label: 'Cashfree', logo: '💸' },
];

const PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'QR', 'BANK_TRANSFER'];

const initialFormData: GatewayFormData = {
    name: 'RAZORPAY',
    display_name: 'Razorpay',
    mode: 'SANDBOX',
    priority: 1,
    traffic_split_percent: 100,
    test_public_key: '',
    test_secret_key: '',
    live_public_key: '',
    live_secret_key: '',
    webhook_secret: '',
    supported_methods: ['UPI', 'CARD', 'NETBANKING', 'WALLET'],
    tdr_rate: 2.0,
};

const PaymentGatewayManager: React.FC = () => {
    const [gateways, setGateways] = useState<Gateway[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
    const [formData, setFormData] = useState<GatewayFormData>(initialFormData);
    const [testingGateway, setTestingGateway] = useState<string | null>(null);
    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);

    // Get auth headers
    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
        };
    }, []);

    // Fetch all gateways
    const fetchGateways = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/payment-gateways', {
                headers: getAuthHeaders(),
            });

            if (!response.ok) throw new Error('Failed to fetch gateways');

            const data = await response.json();
            setGateways(data.gateways || []);
            setStats(data.stats);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    // Fetch health status
    const fetchHealthStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/payment/health', {
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                setHealthStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch health status');
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchGateways();
        fetchHealthStatus();

        // Auto-refresh health every 30 seconds
        const interval = setInterval(fetchHealthStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchGateways, fetchHealthStatus]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    // Handle method selection
    const handleMethodToggle = (method: string) => {
        setFormData(prev => ({
            ...prev,
            supported_methods: prev.supported_methods.includes(method)
                ? prev.supported_methods.filter(m => m !== method)
                : [...prev.supported_methods, method],
        }));
    };

    // Handle gateway name change (update display name)
    const handleGatewayNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
        const option = GATEWAY_OPTIONS.find(g => g.value === name);
        setFormData(prev => ({
            ...prev,
            name,
            display_name: option?.label || name,
        }));
    };

    // Add new gateway
    const handleAddGateway = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/admin/payment-gateways', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to add gateway');

            toast.success(`${formData.display_name} gateway added successfully!`);
            setShowAddModal(false);
            setFormData(initialFormData);
            fetchGateways();
            fetchHealthStatus();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Update gateway
    const handleUpdateGateway = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGateway) return;

        try {
            const response = await fetch(`/api/admin/payment-gateways/${selectedGateway._id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to update gateway');

            toast.success(`${formData.display_name} gateway updated!`);
            setShowEditModal(false);
            setSelectedGateway(null);
            fetchGateways();
            fetchHealthStatus();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Toggle gateway active status
    const handleToggle = async (gateway: Gateway) => {
        try {
            const response = await fetch(`/api/admin/payment-gateways/${gateway._id}/toggle`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_active: !gateway.is_active }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            toast.success(data.message);
            fetchGateways();
            fetchHealthStatus();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Test gateway connectivity
    const handleTestGateway = async (gateway: Gateway) => {
        setTestingGateway(gateway._id);

        try {
            const response = await fetch(`/api/admin/payment-gateways/${gateway._id}/test`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`✅ ${gateway.name} is responding (${data.response_time_ms}ms)`);
            } else {
                toast.error(`❌ ${gateway.name} health check failed`);
            }

            fetchGateways();
            fetchHealthStatus();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setTestingGateway(null);
        }
    };

    // Delete gateway
    const handleDelete = async (gateway: Gateway) => {
        if (!confirm(`Are you sure you want to delete ${gateway.display_name}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/payment-gateways/${gateway._id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            toast.success(data.message);
            fetchGateways();
            fetchHealthStatus();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // Open edit modal
    const openEditModal = (gateway: Gateway) => {
        setSelectedGateway(gateway);
        setFormData({
            name: gateway.name,
            display_name: gateway.display_name,
            mode: gateway.mode,
            priority: gateway.priority,
            traffic_split_percent: gateway.traffic_split_percent,
            test_public_key: '',
            test_secret_key: '',
            live_public_key: '',
            live_secret_key: '',
            webhook_secret: '',
            supported_methods: gateway.supported_methods || [],
            tdr_rate: gateway.tdr_rate,
        });
        setShowEditModal(true);
    };

    // Render form modal
    const renderFormModal = (isEdit: boolean) => (
        <div className="pgm-modal-overlay" onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}>
            <div className="pgm-modal" onClick={e => e.stopPropagation()}>
                <div className="pgm-modal-header">
                    <h2>{isEdit ? `Edit ${selectedGateway?.display_name}` : 'Add Payment Gateway'}</h2>
                    <button className="pgm-close-btn" onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}>
                        ✕
                    </button>
                </div>

                <form onSubmit={isEdit ? handleUpdateGateway : handleAddGateway} className="pgm-form">
                    <div className="pgm-form-row">
                        <div className="pgm-form-group">
                            <label>Gateway</label>
                            <select
                                name="name"
                                value={formData.name}
                                onChange={handleGatewayNameChange}
                                disabled={isEdit}
                            >
                                {GATEWAY_OPTIONS.map(g => (
                                    <option key={g.value} value={g.value}>{g.logo} {g.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pgm-form-group">
                            <label>Mode</label>
                            <select name="mode" value={formData.mode} onChange={handleInputChange}>
                                <option value="SANDBOX">🧪 Sandbox (Test)</option>
                                <option value="PRODUCTION">🚀 Production</option>
                            </select>
                        </div>
                    </div>

                    <div className="pgm-form-row">
                        <div className="pgm-form-group">
                            <label>Priority (1=highest)</label>
                            <input
                                type="number"
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                min={1}
                                max={10}
                            />
                        </div>

                        <div className="pgm-form-group">
                            <label>Traffic Split %</label>
                            <input
                                type="number"
                                name="traffic_split_percent"
                                value={formData.traffic_split_percent}
                                onChange={handleInputChange}
                                min={0}
                                max={100}
                            />
                        </div>

                        <div className="pgm-form-group">
                            <label>TDR Rate %</label>
                            <input
                                type="number"
                                name="tdr_rate"
                                value={formData.tdr_rate}
                                onChange={handleInputChange}
                                step={0.1}
                                min={0}
                                max={10}
                            />
                        </div>
                    </div>

                    <div className="pgm-credentials-section">
                        <h3>🔐 {formData.mode === 'SANDBOX' ? 'Test' : 'Live'} Credentials</h3>

                        {formData.mode === 'SANDBOX' ? (
                            <>
                                <div className="pgm-form-group">
                                    <label>Test Public Key / Key ID</label>
                                    <input
                                        type="text"
                                        name="test_public_key"
                                        value={formData.test_public_key}
                                        onChange={handleInputChange}
                                        placeholder={isEdit ? '(unchanged if empty)' : 'Enter test public key'}
                                    />
                                </div>

                                <div className="pgm-form-group">
                                    <label>Test Secret Key</label>
                                    <input
                                        type="password"
                                        name="test_secret_key"
                                        value={formData.test_secret_key}
                                        onChange={handleInputChange}
                                        placeholder={isEdit ? '(unchanged if empty)' : 'Enter test secret key'}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="pgm-form-group">
                                    <label>Live Public Key / Key ID</label>
                                    <input
                                        type="text"
                                        name="live_public_key"
                                        value={formData.live_public_key}
                                        onChange={handleInputChange}
                                        placeholder={isEdit ? '(unchanged if empty)' : 'Enter live public key'}
                                    />
                                </div>

                                <div className="pgm-form-group">
                                    <label>Live Secret Key</label>
                                    <input
                                        type="password"
                                        name="live_secret_key"
                                        value={formData.live_secret_key}
                                        onChange={handleInputChange}
                                        placeholder={isEdit ? '(unchanged if empty)' : 'Enter live secret key'}
                                    />
                                </div>
                            </>
                        )}

                        <div className="pgm-form-group">
                            <label>Webhook Secret</label>
                            <input
                                type="password"
                                name="webhook_secret"
                                value={formData.webhook_secret}
                                onChange={handleInputChange}
                                placeholder={isEdit ? '(unchanged if empty)' : 'Enter webhook secret'}
                            />
                        </div>
                    </div>

                    <div className="pgm-form-group">
                        <label>Supported Payment Methods</label>
                        <div className="pgm-methods-grid">
                            {PAYMENT_METHODS.map(method => (
                                <label key={method} className="pgm-method-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={formData.supported_methods.includes(method)}
                                        onChange={() => handleMethodToggle(method)}
                                    />
                                    {method}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="pgm-form-actions">
                        <button type="button" className="pgm-btn pgm-btn-secondary" onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="pgm-btn pgm-btn-primary">
                            {isEdit ? 'Update Gateway' : 'Add Gateway'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="pgm-container">
            {/* Header */}
            <div className="pgm-header">
                <div>
                    <h1>💳 Payment Gateway Management</h1>
                    <p>Configure and manage payment gateways with hot-swapping capability</p>
                </div>

                <button className="pgm-btn pgm-btn-primary" onClick={() => setShowAddModal(true)}>
                    + Add Gateway
                </button>
            </div>

            {/* Health Status Banner */}
            <div className={`pgm-health-banner ${healthStatus?.overall?.toLowerCase() || 'unknown'}`}>
                <div className="pgm-health-indicator">
                    <span className="pgm-health-dot"></span>
                    <span>System Status: {healthStatus?.overall || 'Unknown'}</span>
                </div>
                <div className="pgm-health-metrics">
                    <span>🏢 {healthStatus?.metrics?.total_gateways || 0} Gateways</span>
                    <span>✅ {healthStatus?.metrics?.healthy_gateways || 0} Healthy</span>
                    <span>📊 {healthStatus?.metrics?.available_capacity || 0}% Capacity</span>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="pgm-stats-grid">
                    <div className="pgm-stat-card">
                        <div className="pgm-stat-value">{stats.active_count}</div>
                        <div className="pgm-stat-label">Active Gateways</div>
                    </div>
                    <div className="pgm-stat-card">
                        <div className="pgm-stat-value">{stats.total_transactions?.toLocaleString() || 0}</div>
                        <div className="pgm-stat-label">Total Transactions</div>
                    </div>
                    <div className="pgm-stat-card">
                        <div className="pgm-stat-value">{stats.success_rate}%</div>
                        <div className="pgm-stat-label">Success Rate</div>
                    </div>
                    <div className="pgm-stat-card">
                        <div className="pgm-stat-value">{stats.avg_tdr}%</div>
                        <div className="pgm-stat-label">Avg TDR</div>
                    </div>
                </div>
            )}

            {/* Gateway List */}
            <div className="pgm-gateway-list">
                {loading ? (
                    <div className="pgm-loading">Loading gateways...</div>
                ) : gateways.length === 0 ? (
                    <div className="pgm-empty">
                        <div className="pgm-empty-icon">🏦</div>
                        <h3>No Payment Gateways Configured</h3>
                        <p>Add your first payment gateway to start accepting payments</p>
                        <button className="pgm-btn pgm-btn-primary" onClick={() => setShowAddModal(true)}>
                            + Add Gateway
                        </button>
                    </div>
                ) : (
                    gateways.map(gateway => (
                        <div key={gateway._id} className={`pgm-gateway-card ${!gateway.is_active ? 'disabled' : ''}`}>
                            <div className="pgm-gateway-header">
                                <div className="pgm-gateway-info">
                                    <span className="pgm-gateway-logo">
                                        {GATEWAY_OPTIONS.find(g => g.value === gateway.name)?.logo || '💳'}
                                    </span>
                                    <div>
                                        <h3>{gateway.display_name}</h3>
                                        <div className="pgm-gateway-badges">
                                            <span className={`pgm-badge ${gateway.mode.toLowerCase()}`}>
                                                {gateway.mode === 'SANDBOX' ? '🧪 Test' : '🚀 Live'}
                                            </span>
                                            <span className={`pgm-badge ${gateway.is_healthy ? 'healthy' : 'unhealthy'}`}>
                                                {gateway.is_healthy ? '✓ Healthy' : '✗ Unhealthy'}
                                            </span>
                                            <span className="pgm-badge priority">P{gateway.priority}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pgm-gateway-toggle">
                                    <label className="pgm-switch">
                                        <input
                                            type="checkbox"
                                            checked={gateway.is_active}
                                            onChange={() => handleToggle(gateway)}
                                        />
                                        <span className="pgm-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div className="pgm-gateway-details">
                                <div className="pgm-detail">
                                    <span>Traffic Split</span>
                                    <strong>{gateway.traffic_split_percent}%</strong>
                                </div>
                                <div className="pgm-detail">
                                    <span>TDR Rate</span>
                                    <strong>{gateway.tdr_rate}%</strong>
                                </div>
                                <div className="pgm-detail">
                                    <span>Failures</span>
                                    <strong>{gateway.failure_count}</strong>
                                </div>
                                <div className="pgm-detail">
                                    <span>Methods</span>
                                    <strong>{gateway.supported_methods?.length || 0}</strong>
                                </div>
                            </div>

                            <div className="pgm-gateway-methods">
                                {gateway.supported_methods?.map(method => (
                                    <span key={method} className="pgm-method-tag">{method}</span>
                                ))}
                            </div>

                            <div className="pgm-gateway-actions">
                                <button
                                    className="pgm-btn pgm-btn-outline"
                                    onClick={() => handleTestGateway(gateway)}
                                    disabled={testingGateway === gateway._id || !gateway.is_active}
                                >
                                    {testingGateway === gateway._id ? '⏳ Testing...' : '🔌 Test'}
                                </button>
                                <button
                                    className="pgm-btn pgm-btn-outline"
                                    onClick={() => openEditModal(gateway)}
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    className="pgm-btn pgm-btn-danger-outline"
                                    onClick={() => handleDelete(gateway)}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {showAddModal && renderFormModal(false)}
            {showEditModal && renderFormModal(true)}
        </div>
    );
};

export default PaymentGatewayManager;
