import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, UserPlus, Search, Trash2, Package, TrendingUp,
    DollarSign, Clock, ChevronRight, X, Mail, Phone, Plus,
    BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw, Eye
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface Client {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    mobileNumber?: string;
    userSegment?: {
        name: string;
        code: string;
        pricingTier?: number;
    };
    createdAt: string;
    orderCount: number;
    totalRevenue: number;
}

interface Order {
    _id: string;
    orderNumber: string;
    product: { name: string; image?: string };
    user: { name: string; email: string };
    quantity: number;
    status: string;
    priceSnapshot?: { totalPayable: number; currency: string };
    createdAt: string;
    paymentStatus?: string;
}

interface DashboardStats {
    totalClients: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    commissionRate: number;
    totalCommission: number;
    walletBalance: number;
    creditLimit: number;
}

interface MonthlyRevenue {
    _id: { year: number; month: number };
    revenue: number;
    orders: number;
}

interface SearchUser {
    _id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    mobileNumber?: string;
}

// ============================================
// Helper
// ============================================
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
});

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

const statusColors: Record<string, string> = {
    REQUESTED: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    DISPATCHED: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

// ============================================
// Component
// ============================================
const AgentDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'orders'>('dashboard');
    const [loading, setLoading] = useState(false);

    // Dashboard state
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);

    // Clients state
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clientOrders, setClientOrders] = useState<Order[]>([]);
    const [clientOrdersLoading, setClientOrdersLoading] = useState(false);

    // Add client modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState<'search' | 'create'>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [newClientForm, setNewClientForm] = useState({
        firstName: '', lastName: '', email: '', mobileNumber: '',
    });

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // ============================================
    // API calls
    // ============================================
    const fetchDashboardStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agent/dashboard-stats', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setRecentOrders(data.recentOrders || []);
                setMonthlyRevenue(data.monthlyRevenue || []);
            } else if (res.status === 403) {
                setError('You do not have the Client Management feature enabled. Contact admin.');
            }
        } catch (err) {
            console.error('Dashboard stats error:', err);
            setError('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agent/my-clients', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setClients(data.clients || []);
            }
        } catch (err) {
            console.error('Fetch clients error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClientOrders = async (clientId: string) => {
        setClientOrdersLoading(true);
        try {
            const res = await fetch(`/api/agent/client/${clientId}/orders`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setClientOrders(data.orders || []);
            }
        } catch (err) {
            console.error('Fetch client orders error:', err);
        } finally {
            setClientOrdersLoading(false);
        }
    };

    const searchUsers = async (q: string) => {
        if (q.length < 2) { setSearchResults([]); return; }
        setSearchLoading(true);
        try {
            const res = await fetch(`/api/agent/search-users?q=${encodeURIComponent(q)}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.users || []);
            }
        } catch (err) {
            console.error('Search users error:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const addExistingClient = async (userId: string) => {
        try {
            const res = await fetch('/api/agent/add-client', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMsg('Client added successfully!');
                setShowAddModal(false);
                fetchClients();
                if (activeTab === 'dashboard') fetchDashboardStats();
            } else {
                setError(data.message || 'Failed to add client');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const createNewClient = async () => {
        if (!newClientForm.email) { setError('Email is required'); return; }
        try {
            const res = await fetch('/api/agent/create-client', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newClientForm),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccessMsg('Client created and added!');
                setShowAddModal(false);
                setNewClientForm({ firstName: '', lastName: '', email: '', mobileNumber: '' });
                fetchClients();
                if (activeTab === 'dashboard') fetchDashboardStats();
            } else {
                setError(data.message || 'Failed to create client');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    const removeClient = async (clientId: string) => {
        if (!confirm('Remove this client from your list?')) return;
        try {
            const res = await fetch(`/api/agent/remove-client/${clientId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setSuccessMsg('Client removed');
                fetchClients();
                if (selectedClientId === clientId) {
                    setSelectedClientId(null);
                    setClientOrders([]);
                }
            }
        } catch (err) {
            setError('Failed to remove client');
        }
    };

    // ============================================
    // Effects
    // ============================================
    useEffect(() => {
        fetchDashboardStats();
        fetchClients();
    }, [fetchDashboardStats, fetchClients]);

    useEffect(() => {
        if (selectedClientId) {
            fetchClientOrders(selectedClientId);
        }
    }, [selectedClientId]);

    // Auto-clear messages
    useEffect(() => {
        if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 3000); return () => clearTimeout(t); }
    }, [successMsg]);
    useEffect(() => {
        if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
    }, [error]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => { if (searchQuery) searchUsers(searchQuery); }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ============================================
    // Stats Cards
    // ============================================
    const StatCard = ({ icon: Icon, label, value, subValue, color }: {
        icon: React.ElementType; label: string; value: string; subValue?: string; color: string;
    }) => (
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
            {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
    );

    // ============================================
    // Render: Dashboard Tab
    // ============================================
    const renderDashboard = () => {
        if (!stats) return <div className="text-center py-12 text-gray-500">Loading statistics...</div>;

        const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);
        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return (
            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Total Clients" value={stats.totalClients.toString()} color="bg-blue-500" />
                    <StatCard icon={Package} label="Total Orders" value={stats.totalOrders.toString()}
                        subValue={`${stats.pendingOrders} pending`} color="bg-indigo-500" />
                    <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="bg-emerald-500" />
                    <StatCard icon={DollarSign} label="Commission Earned"
                        value={formatCurrency(stats.totalCommission)}
                        subValue={`${stats.commissionRate}% rate`} color="bg-purple-500" />
                </div>

                {/* Revenue + Wallet */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Monthly revenue chart */}
                    <div className="lg:col-span-2 bg-white rounded-xl border p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 size={20} className="text-indigo-500" /> Monthly Revenue
                        </h3>
                        {monthlyRevenue.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No revenue data yet</p>
                        ) : (
                            <div className="flex items-end gap-3 h-40">
                                {monthlyRevenue.map((m, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                        <span className="text-xs text-gray-500">{formatCurrency(m.revenue)}</span>
                                        <div
                                            className="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 rounded-t-md transition-all"
                                            style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, 5)}%` }}
                                        />
                                        <span className="text-xs text-gray-400">{months[m._id.month]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Wallet Card */}
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
                        <h3 className="text-sm font-medium opacity-80 mb-1">Wallet Balance</h3>
                        <p className="text-3xl font-bold">{formatCurrency(stats.walletBalance)}</p>
                        <div className="mt-6 pt-4 border-t border-white/20 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="opacity-70">Credit Limit</span>
                                <span className="font-medium">{formatCurrency(stats.creditLimit)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="opacity-70">Commission Rate</span>
                                <span className="font-medium">{stats.commissionRate}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="opacity-70">Completed Orders</span>
                                <span className="font-medium">{stats.completedOrders}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-gray-500" /> Recent Orders
                    </h3>
                    {recentOrders.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No orders yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-gray-500">
                                        <th className="pb-3 font-medium">Order #</th>
                                        <th className="pb-3 font-medium">Client</th>
                                        <th className="pb-3 font-medium">Product</th>
                                        <th className="pb-3 font-medium">Qty</th>
                                        <th className="pb-3 font-medium">Amount</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentOrders.map(order => (
                                        <tr key={order._id} className="hover:bg-gray-50">
                                            <td className="py-3 font-mono text-xs">{order.orderNumber}</td>
                                            <td className="py-3">{order.user?.name || order.user?.email}</td>
                                            <td className="py-3">{order.product?.name || '—'}</td>
                                            <td className="py-3">{order.quantity}</td>
                                            <td className="py-3 font-medium">{formatCurrency(order.priceSnapshot?.totalPayable || 0)}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-gray-400">{formatDate(order.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ============================================
    // Render: Clients Tab
    // ============================================
    const renderClients = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Client List */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">My Clients ({clients.length})</h3>
                    <button
                        onClick={() => { setShowAddModal(true); setAddMode('search'); setSearchQuery(''); setSearchResults([]); }}
                        className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                    >
                        <UserPlus size={16} /> Add
                    </button>
                </div>

                {clients.length === 0 ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                        <Users size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-2">No clients yet</p>
                        <p className="text-sm text-gray-400">Add your first client to get started</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {clients.map(client => (
                            <div
                                key={client._id}
                                onClick={() => setSelectedClientId(client._id)}
                                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedClientId === client._id ? 'ring-2 ring-indigo-500 border-indigo-300' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Unnamed'}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate flex items-center gap-1 mt-1">
                                            <Mail size={12} /> {client.email}
                                        </p>
                                        {client.mobileNumber && (
                                            <p className="text-sm text-gray-400 flex items-center gap-1">
                                                <Phone size={12} /> {client.mobileNumber}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeClient(client._id); }}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                                    {client.userSegment && (
                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                                            {client.userSegment.name}
                                            {client.userSegment.pricingTier ? ` · Tier ${client.userSegment.pricingTier}` : ''}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {client.orderCount} orders · {formatCurrency(client.totalRevenue)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Client Detail / Orders */}
            <div className="lg:col-span-2">
                {!selectedClientId ? (
                    <div className="bg-white rounded-xl border p-12 text-center">
                        <Eye size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Select a client to view their orders</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border">
                        {/* Client header */}
                        {(() => {
                            const client = clients.find(c => c._id === selectedClientId);
                            if (!client) return null;
                            return (
                                <div className="p-6 border-b bg-gray-50 rounded-t-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim()}
                                            </h3>
                                            <p className="text-sm text-gray-500">{client.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Total Revenue</p>
                                            <p className="text-xl font-bold text-emerald-600">{formatCurrency(client.totalRevenue)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Orders list */}
                        <div className="p-6">
                            <h4 className="font-medium text-gray-700 mb-4">Orders placed on behalf</h4>
                            {clientOrdersLoading ? (
                                <div className="text-center py-8 text-gray-400">Loading orders...</div>
                            ) : clientOrders.length === 0 ? (
                                <div className="text-center py-8">
                                    <Package size={32} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-gray-400 text-sm">No orders placed for this client yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {clientOrders.map(order => (
                                        <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex-1">
                                                <p className="font-mono text-xs text-gray-500">{order.orderNumber}</p>
                                                <p className="font-medium text-sm mt-1">{order.product?.name || '—'}</p>
                                            </div>
                                            <div className="text-center px-4">
                                                <p className="text-xs text-gray-400">Qty</p>
                                                <p className="font-medium">{order.quantity}</p>
                                            </div>
                                            <div className="text-center px-4">
                                                <p className="text-xs text-gray-400">Amount</p>
                                                <p className="font-medium">{formatCurrency(order.priceSnapshot?.totalPayable || 0)}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // ============================================
    // Add Client Modal
    // ============================================
    const renderAddModal = () => {
        if (!showAddModal) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <h3 className="text-lg font-semibold">Add Client</h3>
                        <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b">
                        <button
                            onClick={() => setAddMode('search')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${addMode === 'search' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'
                                }`}
                        >
                            <Search size={14} className="inline mr-1" /> Find Existing User
                        </button>
                        <button
                            onClick={() => setAddMode('create')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${addMode === 'create' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500'
                                }`}
                        >
                            <Plus size={14} className="inline mr-1" /> Create New Client
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {addMode === 'search' ? (
                            <div>
                                <div className="relative mb-4">
                                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        autoFocus
                                    />
                                </div>
                                {searchLoading ? (
                                    <p className="text-center text-gray-400 py-4">Searching...</p>
                                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                    <p className="text-center text-gray-400 py-4">No users found</p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {searchResults.map(user => (
                                            <div
                                                key={user._id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                                            >
                                                <div>
                                                    <p className="font-medium text-sm">
                                                        {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unnamed'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => addExistingClient(user._id)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={newClientForm.firstName}
                                            onChange={(e) => setNewClientForm({ ...newClientForm, firstName: e.target.value })}
                                            className="w-full border rounded-lg px-3 py-2"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={newClientForm.lastName}
                                            onChange={(e) => setNewClientForm({ ...newClientForm, lastName: e.target.value })}
                                            className="w-full border rounded-lg px-3 py-2"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={newClientForm.email}
                                        onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={newClientForm.mobileNumber}
                                        onChange={(e) => setNewClientForm({ ...newClientForm, mobileNumber: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                                <button
                                    onClick={createNewClient}
                                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                                >
                                    Create & Add Client
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // Main Render
    // ============================================
    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Toast Messages */}
            {successMsg && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in">
                    <ArrowUpRight size={16} /> {successMsg}
                </div>
            )}
            {error && (
                <div className="fixed top-4 right-4 bg-red-500 text-white px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in">
                    <ArrowDownRight size={16} /> {error}
                </div>
            )}

            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
                    <p className="text-gray-500 mt-1">Manage your clients and track commissions</p>
                </div>
                <button
                    onClick={() => { fetchDashboardStats(); fetchClients(); }}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
                {[
                    { key: 'dashboard' as const, label: 'Overview', icon: BarChart3 },
                    { key: 'clients' as const, label: 'My Clients', icon: Users },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Active Tab Content */}
            {loading && !stats ? (
                <div className="text-center py-20 text-gray-400">
                    <RefreshCw size={32} className="mx-auto mb-3 animate-spin" />
                    <p>Loading your dashboard...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'clients' && renderClients()}
                </>
            )}

            {/* Add Client Modal */}
            {renderAddModal()}
        </div>
    );
};

export default AgentDashboard;
