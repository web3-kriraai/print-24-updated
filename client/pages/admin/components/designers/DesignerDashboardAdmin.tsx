import React, { useState, useEffect } from 'react';
import {
    Users,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    Search,
    Filter,
    ArrowRight,
    Loader,
    ChevronRight,
    TrendingUp,
    UserPlus,
    X,
    Mail,
    Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthHeaders } from '../../../../utils/auth';
import { formatCurrency } from '../../../../utils/pricing';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../../../../lib/apiConfig';
import toast from 'react-hot-toast';

interface Stats {
    totalAppointments: number;
    scheduled: number;
    accepted: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
    totalDesigners: number;
}

interface DesignerReport {
    _id: string;
    name: string;
    email: string;
    totalAppointments: number;
    upcoming: number;
    completed: number;
    revenue: number;
    status: 'Active' | 'Inactive';
}

const DesignerDashboardAdmin: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [report, setReport] = useState<DesignerReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDesigner, setSelectedDesigner] = useState<string | null>(null);
    const [detailedData, setDetailedData] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | ''>('');

    // Create User Overlay
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "designer", // Default to designer
    });

    useEffect(() => {
        fetchStats();
        fetchReport();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/designers/stats`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/admin/designers/report`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) setReport(data.data);
        } catch (error) {
            toast.error('Failed to load designer report');
        } finally {
            setLoading(false);
        }
    };

    const fetchDetailedData = async (id: string) => {
        try {
            setLoadingDetails(true);
            setSelectedDesigner(id);
            const res = await fetch(`${API_BASE_URL}/admin/designers/${id}/details?range=${dateRange}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) setDetailedData(data.data);
        } catch (error) {
            toast.error('Failed to load detailed report');
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        if (selectedDesigner) {
            fetchDetailedData(selectedDesigner);
        }
    }, [dateRange]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = `${API_BASE_URL}/admin/create-designer`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(createUserForm),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to create designer");
            }

            toast.success("Designer created successfully");
            setShowCreateUserModal(false);
            setCreateUserForm({ name: "", email: "", password: "", role: "designer" });
            fetchStats();
            fetchReport();
        } catch (err) {
            console.error("Error creating designer:", err);
            toast.error(err instanceof Error ? err.message : "Failed to create designer");
        } finally {
            setLoading(false);
        }
    };

    const filteredReport = report.filter(d =>
        d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Designer Management</h1>
                    <p className="text-gray-500 text-sm">Monitor performance, appointments, and revenue</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium hover:bg-blue-700"
                    >
                        <UserPlus size={18} />
                        Add New Designer
                    </button>
                    <button
                        onClick={() => { fetchStats(); fetchReport(); }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Designers"
                    value={stats?.totalDesigners || 0}
                    icon={<Users className="text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Total Appointments"
                    value={stats?.totalAppointments || 0}
                    subValue={`${stats?.completed || 0} completed`}
                    icon={<Calendar className="text-purple-600" />}
                    color="bg-purple-50"
                />
                <StatCard
                    title="Revenue"
                    value={formatCurrency(stats?.totalRevenue || 0)}
                    icon={<DollarSign className="text-green-600" />}
                    color="bg-green-50"
                />
                <StatCard
                    title="Ongoing Visits"
                    value={stats?.inProgress || 0}
                    subValue={`${stats?.accepted || 0} accepted`}
                    icon={<Clock className="text-orange-600" />}
                    color="bg-orange-50"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Designer List Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <h2 className="font-bold text-gray-900">Designer Performance</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search designer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Designer</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Appointments</th>
                                    <th className="px-6 py-4">Revenue</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReport.map((designer) => (
                                    <tr
                                        key={designer._id}
                                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${selectedDesigner === designer._id ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => fetchDetailedData(designer._id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-sm">{designer.name}</span>
                                                <span className="text-xs text-gray-500">{designer.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${designer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {designer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{designer.totalAppointments}</span>
                                                <span className="text-[10px] text-gray-500">{designer.upcoming} upcoming</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                                            {formatCurrency(designer.revenue)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className="w-5 h-5 text-gray-300 inline" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detailed View / Side Panel */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit sticky top-6">
                    {!selectedDesigner ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">Select a Designer</h3>
                            <p className="text-sm text-gray-500">Click on any designer to view detailed metrics and appointment history.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">Performance Details</h3>
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value as any)}
                                    className="text-xs bg-white border border-gray-200 rounded p-1 outline-none"
                                >
                                    <option value="">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </select>
                            </div>

                            {loadingDetails ? (
                                <div className="p-12 text-center">
                                    <Loader className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">Loading metrics...</p>
                                </div>
                            ) : detailedData ? (
                                <div className="p-4 space-y-6">
                                    {/* Mini Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-blue-50/50 p-3 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Revenue</p>
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(detailedData.summary?.totalRevenue || 0)}</p>
                                        </div>
                                        <div className="bg-purple-50/50 p-3 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-purple-600 mb-1">Duration</p>
                                            <p className="text-lg font-bold text-gray-900">{detailedData.summary?.totalMinutes || 0}m</p>
                                        </div>
                                    </div>

                                    {/* Recent Appointments */}
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Appointments</h4>
                                        <div className="space-y-3">
                                            {detailedData.bookings?.slice(0, 5).map((booking: any) => (
                                                <div key={booking._id} className="p-3 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(booking.visitDate).toLocaleDateString()}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${booking.visitStatus === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            booking.visitStatus === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {booking.visitStatus}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900">{booking.customerId?.name || 'Walk-in Client'}</p>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-xs text-gray-500">{booking.timeSlot || 'At Home'}</span>
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {detailedData.bookings?.length === 0 && (
                                                <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl">No appointments found</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateUserModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">Create New Designer</h3>
                                <button
                                    onClick={() => setShowCreateUserModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createUserForm.name}
                                        onChange={e => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Kenil Pansuriya"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={createUserForm.email}
                                        onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="kenil@design.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={createUserForm.password}
                                        onChange={e => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateUserModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-70 flex justify-center items-center gap-2"
                                    >
                                        {loading ? <Loader size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                        Create Designer
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ReactNode; color: string }> = ({
    title, value, subValue, icon, color
}) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-40 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
        <div className="relative z-10">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {subValue && <span className="text-xs text-gray-400 font-medium">{subValue}</span>}
            </div>
        </div>
    </div>
);

export default DesignerDashboardAdmin;
