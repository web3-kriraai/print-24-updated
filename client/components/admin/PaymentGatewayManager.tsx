import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    FiPlus,
    FiEdit,
    FiTrash2,
    FiRefreshCw,
    FiGlobe,
    FiShield,
    FiActivity,
    FiPercent,
    FiCreditCard,
    FiToggleLeft,
    FiToggleRight,
    FiLock,
    FiUnlock,
    FiCheckCircle,
    FiXCircle,
    FiAlertCircle,
    FiSettings,
    FiDatabase,
    FiBarChart2,
    FiTrendingUp,
    FiKey,
    FiLink,
    FiCheck,
    FiX,
    FiChevronDown,
    FiChevronRight,
    FiUser,
    FiDollarSign
} from 'react-icons/fi';
import {
    FaRocket,
    FaFlask,
    FaRegLightbulb,
    FaWeightHanging,
    FaPercentage,
    FaStripe,
    FaPaypal,
    FaCcAmazonPay,
    FaUniversity,
    FaQrcode,
    FaMobileAlt,
    FaWallet,
    FaExchangeAlt,
    FaChartLine
} from 'react-icons/fa';
import {
    SiRazorpay,
    SiPhonepe
} from 'react-icons/si';
import {
    MdOutlineHealthAndSafety,
    MdOutlineDragIndicator,
    MdOutlineSecurity,
    MdOutlineAutoGraph
} from 'react-icons/md';
import { TbTrafficCone, TbSwitch3, TbProgress } from 'react-icons/tb';
import { GoGear, GoGraph } from 'react-icons/go';
import { HiOutlineStatusOnline } from 'react-icons/hi';
import { RiSignalWifiErrorLine } from 'react-icons/ri';

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
    supported_methods: string[];
    tdr_rate: number;
}

const GATEWAY_OPTIONS = [
    { value: 'RAZORPAY', label: 'Razorpay', icon: SiRazorpay, color: '#0C4B78', bgColor: '#E3F2FD' },
    { value: 'STRIPE', label: 'Stripe', icon: FaStripe, color: '#635BFF', bgColor: '#F3F4FF' },
    { value: 'PHONEPE', label: 'PhonePe', icon: SiPhonepe, color: '#5F259F', bgColor: '#F5F3FF' },
    { value: 'PAYU', label: 'PayU', icon: FaWallet, color: '#FF5C00', bgColor: '#FFF3E0' },
];

const PAYMENT_METHODS = [
    { value: 'UPI', label: 'UPI', icon: FaUniversity, color: '#3B82F6', bgColor: '#EFF6FF' },
    { value: 'CARD', label: 'Card', icon: FiCreditCard, color: '#8B5CF6', bgColor: '#F5F3FF' },
    { value: 'NETBANKING', label: 'Net Banking', icon: FaUniversity, color: '#10B981', bgColor: '#ECFDF5' },
    { value: 'WALLET', label: 'Wallet', icon: FaWallet, color: '#F59E0B', bgColor: '#FFFBEB' },
    { value: 'QR', label: 'QR Code', icon: FaQrcode, color: '#EF4444', bgColor: '#FEF2F2' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: FiGlobe, color: '#06B6D4', bgColor: '#ECFEFF' },
];

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
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'sandbox' | 'production'>('all');
    const [expandedGateway, setExpandedGateway] = useState<string | null>(null);
    const [showGatewayDropdown, setShowGatewayDropdown] = useState(false);

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

    // Filter gateways based on active tab
    const filteredGateways = gateways.filter(gateway => {
        switch (activeTab) {
            case 'active':
                return gateway.is_active;
            case 'sandbox':
                return gateway.mode === 'SANDBOX';
            case 'production':
                return gateway.mode === 'PRODUCTION';
            default:
                return true;
        }
    });

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

    // Handle gateway name change
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
            supported_methods: gateway.supported_methods || [],
            tdr_rate: gateway.tdr_rate,
        });
        setShowEditModal(true);
    };

    // Get gateway icon
    const getGatewayIcon = (gatewayName: string) => {
        const option = GATEWAY_OPTIONS.find(g => g.value === gatewayName);
        const IconComponent = option?.icon || FiCreditCard;
        return <IconComponent className="w-6 h-6" style={{ color: option?.color }} />;
    };

    // Get method icon
    const getMethodIcon = (method: string) => {
        const methodOption = PAYMENT_METHODS.find(m => m.value === method);
        const IconComponent = methodOption?.icon || FiCreditCard;
        return <IconComponent className="w-4 h-4" />;
    };

    // Format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Render form modal
    const renderFormModal = (isEdit: boolean) => (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                {isEdit ? (
                                    <FiEdit className="w-8 h-8 text-white" />
                                ) : (
                                    <FiPlus className="w-8 h-8 text-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {isEdit ? `Edit ${selectedGateway?.display_name}` : 'Add Payment Gateway'}
                                </h2>
                                <p className="text-indigo-100">
                                    {isEdit ? 'Update gateway configuration' : 'Configure a new payment gateway'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <FiX className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>

                <form onSubmit={isEdit ? handleUpdateGateway : handleAddGateway} className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Basic Configuration */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <FiSettings className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Basic Configuration</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                    <FiCreditCard className="w-4 h-4" />
                                    <span>Gateway Provider</span>
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => !isEdit && setShowGatewayDropdown(!showGatewayDropdown)}
                                        disabled={isEdit}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="p-2 rounded-lg"
                                                style={{
                                                    backgroundColor: GATEWAY_OPTIONS.find(g => g.value === formData.name)?.bgColor,
                                                    color: GATEWAY_OPTIONS.find(g => g.value === formData.name)?.color
                                                }}
                                            >
                                                {getGatewayIcon(formData.name)}
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                {GATEWAY_OPTIONS.find(g => g.value === formData.name)?.label}
                                            </span>
                                        </div>
                                        <FiChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showGatewayDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Custom Dropdown */}
                                    {showGatewayDropdown && !isEdit && (
                                        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden">
                                            {GATEWAY_OPTIONS.map(gateway => {
                                                const Icon = gateway.icon;
                                                return (
                                                    <button
                                                        key={gateway.value}
                                                        type="button"
                                                        onClick={() => {
                                                            handleGatewayNameChange({ target: { value: gateway.value } } as any);
                                                            setShowGatewayDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-indigo-50 transition-colors text-left"
                                                    >
                                                        <div
                                                            className="p-2 rounded-lg"
                                                            style={{ backgroundColor: gateway.bgColor, color: gateway.color }}
                                                        >
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <span className="font-medium text-gray-900">{gateway.label}</span>
                                                        {formData.name === gateway.value && (
                                                            <FiCheck className="w-5 h-5 text-indigo-600 ml-auto" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                    <FaRocket className="w-4 h-4" />
                                    <span>Environment Mode</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="mode"
                                        value={formData.mode}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    >
                                        <option value="SANDBOX">Sandbox (Test)</option>
                                        <option value="PRODUCTION">Production</option>
                                    </select>
                                    {formData.mode === 'SANDBOX' ? (
                                        <FaFlask className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-600" />
                                    ) : (
                                        <FaRocket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                    <MdOutlineDragIndicator className="w-4 h-4" />
                                    <span>Priority (1=Highest)</span>
                                </label>
                                <input
                                    type="number"
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                    min={1}
                                    max={10}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                    <FaWeightHanging className="w-4 h-4" />
                                    <span>Traffic Split %</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="traffic_split_percent"
                                        value={formData.traffic_split_percent}
                                        onChange={handleInputChange}
                                        min={0}
                                        max={100}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                    <FaPercentage className="w-4 h-4" />
                                    <span>TDR Rate %</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="tdr_rate"
                                        value={formData.tdr_rate}
                                        onChange={handleInputChange}
                                        step={0.1}
                                        min={0}
                                        max={10}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API Credentials */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FiKey className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">API Credentials</h3>
                        </div>

                        <div className="space-y-4">
                            {formData.mode === 'SANDBOX' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                            <FiKey className="w-4 h-4" />
                                            <span>Test Public Key</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="test_public_key"
                                            value={formData.test_public_key}
                                            onChange={handleInputChange}
                                            placeholder={isEdit ? '(unchanged if empty)' : 'pk_test_...'}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                            <FiLock className="w-4 h-4" />
                                            <span>Test Secret Key</span>
                                        </label>
                                        <input
                                            type="password"
                                            name="test_secret_key"
                                            value={formData.test_secret_key}
                                            onChange={handleInputChange}
                                            placeholder={isEdit ? '(unchanged if empty)' : 'sk_test_...'}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                            <FiKey className="w-4 h-4" />
                                            <span>Live Public Key</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="live_public_key"
                                            value={formData.live_public_key}
                                            onChange={handleInputChange}
                                            placeholder={isEdit ? '(unchanged if empty)' : 'pk_live_...'}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                                            <FiLock className="w-4 h-4" />
                                            <span>Live Secret Key</span>
                                        </label>
                                        <input
                                            type="password"
                                            name="live_secret_key"
                                            value={formData.live_secret_key}
                                            onChange={handleInputChange}
                                            placeholder={isEdit ? '(unchanged if empty)' : 'sk_live_...'}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </>
                            )}


                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FiCreditCard className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800">Supported Payment Methods</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PAYMENT_METHODS.map(method => (
                                <div key={method.value} className="relative">
                                    <input
                                        type="checkbox"
                                        id={`method-${method.value}`}
                                        checked={formData.supported_methods.includes(method.value)}
                                        onChange={() => handleMethodToggle(method.value)}
                                        className="sr-only"
                                    />
                                    <label
                                        htmlFor={`method-${method.value}`}
                                        className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.supported_methods.includes(method.value)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="p-2 rounded-lg"
                                                style={{ backgroundColor: method.bgColor, color: method.color }}
                                            >
                                                {getMethodIcon(method.value)}
                                            </div>
                                            <span className="font-medium text-gray-700">{method.label}</span>
                                        </div>
                                        {formData.supported_methods.includes(method.value) && (
                                            <div className="absolute top-2 right-2">
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <FiCheck className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
                        >
                            {isEdit ? (
                                <>
                                    <FiEdit className="w-5 h-5" />
                                    <span>Update Gateway</span>
                                </>
                            ) : (
                                <>
                                    <FiPlus className="w-5 h-5" />
                                    <span>Add Gateway</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">

                    <div className="flex gap-3">
                        <button
                            onClick={() => window.location.href = '/admin/test-payment'}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                        >
                            <FiActivity className="w-5 h-5" />
                            <span>Test Payment</span>
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 self-start"
                        >
                            <FiPlus className="w-5 h-5" />
                            <span>Add Gateway</span>
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Gateways</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{gateways.length}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <FiDatabase className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                            <FiActivity className="w-4 h-4 mr-1" />
                            <span>{gateways.filter(g => g.is_active).length} active</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.success_rate || 0}%</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-xl">
                                <FaChartLine className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                            <FiTrendingUp className="w-4 h-4 mr-1" />
                            <span>Last 30 days</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Avg TDR Rate</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.avg_tdr || 0}%</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <FaPercentage className="w-8 h-8 text-purple-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                            <FiDollarSign className="w-4 h-4 mr-1" />
                            <span>Transaction cost</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {stats?.total_transactions ? (stats.total_transactions / 1000).toFixed(1) + 'k' : '0'}
                                </p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-xl">
                                <FiBarChart2 className="w-8 h-8 text-orange-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-gray-500">
                            <FiUser className="w-4 h-4 mr-1" />
                            <span>All time</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Health Banner */}
            <div className={`rounded-2xl p-6 mb-8 shadow-lg ${healthStatus?.overall === 'HEALTHY'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                : healthStatus?.overall === 'DEGRADED'
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
                    : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
                }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${healthStatus?.overall === 'HEALTHY'
                            ? 'bg-green-100 text-green-600'
                            : healthStatus?.overall === 'DEGRADED'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-red-100 text-red-600'
                            }`}>
                            <MdOutlineHealthAndSafety className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">System Status: {healthStatus?.overall || 'Unknown'}</h3>
                            <p className="text-gray-600">
                                {healthStatus?.overall === 'HEALTHY'
                                    ? 'All systems are operating normally'
                                    : healthStatus?.overall === 'DEGRADED'
                                        ? 'Some systems are experiencing issues'
                                        : 'System health status unavailable'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{healthStatus?.metrics?.healthy_gateways || 0}</div>
                            <div className="text-sm text-gray-600">Healthy</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{healthStatus?.metrics?.total_gateways || 0}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{healthStatus?.metrics?.available_capacity || 0}%</div>
                            <div className="text-sm text-gray-600">Capacity</div>
                        </div>
                        <button
                            onClick={fetchHealthStatus}
                            className="p-2 bg-white rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            <FiRefreshCw className={`w-5 h-5 text-gray-600 ${healthStatus ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${activeTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                >
                    <FiGlobe className="w-4 h-4" />
                    <span>All Gateways</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {gateways.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${activeTab === 'active'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                >
                    <HiOutlineStatusOnline className="w-4 h-4" />
                    <span>Active</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {gateways.filter(g => g.is_active).length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('sandbox')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${activeTab === 'sandbox'
                        ? 'bg-yellow-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                >
                    <FaFlask className="w-4 h-4" />
                    <span>Sandbox</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {gateways.filter(g => g.mode === 'SANDBOX').length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('production')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${activeTab === 'production'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                >
                    <FaRocket className="w-4 h-4" />
                    <span>Production</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {gateways.filter(g => g.mode === 'PRODUCTION').length}
                    </span>
                </button>
            </div>

            {/* Gateway Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading gateways...</p>
                    </div>
                ) : filteredGateways.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiCreditCard className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Gateways Found</h3>
                        <p className="text-gray-600 mb-6">
                            {activeTab === 'all'
                                ? 'Add your first payment gateway to get started'
                                : `No ${activeTab} gateways found`}
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
                        >
                            <FiPlus className="w-5 h-5" />
                            <span>Add Gateway</span>
                        </button>
                    </div>
                ) : (
                    filteredGateways.map(gateway => (
                        <div
                            key={gateway._id}
                            className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${gateway.is_active
                                ? 'border-green-200 hover:border-green-300'
                                : 'border-gray-200 hover:border-gray-300 opacity-75'
                                }`}
                        >
                            {/* Card Header */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div
                                            className="p-3 rounded-xl"
                                            style={{
                                                backgroundColor: GATEWAY_OPTIONS.find(g => g.value === gateway.name)?.bgColor || '#f3f4f6'
                                            }}
                                        >
                                            {getGatewayIcon(gateway.name)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{gateway.display_name}</h3>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${gateway.mode === 'SANDBOX'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {gateway.mode === 'SANDBOX' ? (
                                                        <span className="flex items-center space-x-1">
                                                            <FaFlask className="w-3 h-3" />
                                                            <span>Sandbox</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center space-x-1">
                                                            <FaRocket className="w-3 h-3" />
                                                            <span>Production</span>
                                                        </span>
                                                    )}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${gateway.is_healthy
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {gateway.is_healthy ? (
                                                        <span className="flex items-center space-x-1">
                                                            <FiCheckCircle className="w-3 h-3" />
                                                            <span>Healthy</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center space-x-1">
                                                            <FiAlertCircle className="w-3 h-3" />
                                                            <span>Unhealthy</span>
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setExpandedGateway(expandedGateway === gateway._id ? null : gateway._id)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <FiChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${expandedGateway === gateway._id ? 'rotate-90' : ''
                                            }`} />
                                    </button>
                                </div>

                                {/* Status Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">Status:</span>
                                        <span className={`text-sm font-medium ${gateway.is_active ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                            {gateway.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={gateway.is_active}
                                            onChange={() => handleToggle(gateway)}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-6 rounded-full transition-colors ${gateway.is_active ? 'bg-green-500' : 'bg-gray-300'
                                            }`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${gateway.is_active ? 'left-7' : 'left-1'
                                                }`} />
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-4 gap-4 p-6">
                                <div className="text-center">
                                    <div className="p-2 bg-blue-100 rounded-lg inline-block mb-2">
                                        <MdOutlineDragIndicator className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="text-xs text-gray-600">Priority</div>
                                    <div className="text-lg font-bold text-gray-900">{gateway.priority}</div>
                                </div>
                                <div className="text-center">
                                    <div className="p-2 bg-purple-100 rounded-lg inline-block mb-2">
                                        <TbTrafficCone className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="text-xs text-gray-600">Traffic Split</div>
                                    <div className="text-lg font-bold text-gray-900">{gateway.traffic_split_percent}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="p-2 bg-yellow-100 rounded-lg inline-block mb-2">
                                        <FaPercentage className="w-5 h-5 text-yellow-600" />
                                    </div>
                                    <div className="text-xs text-gray-600">TDR Rate</div>
                                    <div className="text-lg font-bold text-gray-900">{gateway.tdr_rate}%</div>
                                </div>
                                <div className="text-center">
                                    <div className="p-2 bg-red-100 rounded-lg inline-block mb-2">
                                        <FiActivity className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div className="text-xs text-gray-600">Failures</div>
                                    <div className="text-lg font-bold text-gray-900">{gateway.failure_count}</div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedGateway === gateway._id && (
                                <div className="border-t border-gray-200 p-6 animate-fadeIn">
                                    {/* Payment Methods */}
                                    <div className="mb-6">
                                        <div className="flex items-center space-x-2 mb-3">
                                            <FiCreditCard className="w-4 h-4 text-gray-500" />
                                            <h4 className="text-sm font-semibold text-gray-700">Supported Methods</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {gateway.supported_methods?.map(method => {
                                                const methodOption = PAYMENT_METHODS.find(m => m.value === method);
                                                return (
                                                    <span
                                                        key={method}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5"
                                                        style={{
                                                            borderColor: methodOption?.bgColor,
                                                            backgroundColor: methodOption?.bgColor + '40',
                                                            color: methodOption?.color
                                                        }}
                                                    >
                                                        {getMethodIcon(method)}
                                                        <span>{methodOption?.label || method}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Last Health Check */}
                                    <div className="mb-6">
                                        <div className="flex items-center space-x-2 mb-3">
                                            <FiActivity className="w-4 h-4 text-gray-500" />
                                            <h4 className="text-sm font-semibold text-gray-700">Last Health Check</h4>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {gateway.last_health_check ? formatDate(gateway.last_health_check) : 'Never checked'}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleTestGateway(gateway)}
                                            disabled={testingGateway === gateway._id || !gateway.is_active}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${testingGateway === gateway._id || !gateway.is_active
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                                }`}
                                        >
                                            {testingGateway === gateway._id ? (
                                                <>
                                                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                    <span>Testing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiActivity className="w-4 h-4" />
                                                    <span>Test Connection</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(gateway)}
                                            className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                                        >
                                            <FiEdit className="w-4 h-4" />
                                            <span>Edit Gateway</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(gateway)}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 col-span-2"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                            <span>Delete Gateway</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons (Collapsed) */}
                            {expandedGateway !== gateway._id && (
                                <div className="border-t border-gray-200 p-4">
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => handleTestGateway(gateway)}
                                            disabled={testingGateway === gateway._id || !gateway.is_active}
                                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${testingGateway === gateway._id || !gateway.is_active
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                                }`}
                                        >
                                            {testingGateway === gateway._id ? (
                                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <FiActivity className="w-4 h-4" />
                                            )}
                                            <span>Test</span>
                                        </button>
                                        <button
                                            onClick={() => openEditModal(gateway)}
                                            className="flex-1 px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                                        >
                                            <FiEdit className="w-4 h-4" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(gateway)}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition-all flex items-center justify-center"
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
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