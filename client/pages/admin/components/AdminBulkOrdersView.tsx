import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, ChevronLeft, ChevronRight,
    MoreVertical, Loader2, Package, User, Calendar,
    Clock, CheckCircle, AlertCircle, FileText,
    Database, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '../../../utils/currencyUtils';

/**
 * Admin Bulk Orders Management View
 * Allows admins to monitor and manage all bulk order processing
 */

interface BulkOrder {
    _id: string;
    orderNumber: string;
    user: {
        _id: string;
        name: string;
        email: string;
        mobileNumber?: string;
    };
    product: {
        _id: string;
        name: string;
    };
    totalCopies: number;
    distinctDesigns: number;
    status: string;
    progress: {
        totalSteps: number;
        completedSteps: number;
        currentStep: string;
        percentage: number;
    };
    pricing: {
        totalPrice: number;
    };
    createdAt: string;
    errorLog: Array<{
        step: string;
        message: string;
        timestamp: string;
    }>;
}

const AdminBulkOrdersView: React.FC = () => {
    const [orders, setOrders] = useState<BulkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    const fetchBulkOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/bulk-orders/admin/list', {
                params: {
                    limit: pagination.limit,
                    skip: (pagination.page - 1) * pagination.limit,
                    status: statusFilter === 'all' ? undefined : statusFilter,
                    search: search || undefined
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setOrders(response.data.data);
                setPagination(prev => ({ ...prev, total: response.data.count }));
            }
        } catch (err) {
            console.error('Fetch bulk orders error:', err);
            setError('Failed to fetch bulk orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBulkOrders();
    }, [pagination.page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchBulkOrders();
    };

    const handleRetry = async (orderId: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/bulk-orders/admin/${orderId}/retry`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBulkOrders();
        } catch (err) {
            console.error('Retry error:', err);
            alert('Failed to retry bulk order');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ORDER_CREATED': return 'bg-green-100 text-green-700 border-green-200';
            case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
            case 'CANCELLED': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'SPLITTING':
            case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'UPLOADED': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ORDER_CREATED': return <CheckCircle size={14} />;
            case 'FAILED': return <AlertCircle size={14} />;
            case 'CANCELLED': return <Clock size={14} />;
            case 'SPLITTING':
            case 'PROCESSING': return <Loader2 size={14} className="animate-spin" />;
            case 'UPLOADED': return <FileText size={14} />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by Order Number..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    {['all', 'UPLOADED', 'SPLITTING', 'PROCESSING', 'ORDER_CREATED', 'FAILED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${statusFilter === status
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                }`}
                        >
                            {status === 'all' ? 'All Orders' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Designs / Copies</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status & Progress</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                                        <p className="text-slate-500 font-medium">Loading bulk orders...</p>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Package className="text-slate-300 mx-auto mb-4" size={48} />
                                        <p className="text-slate-500 font-medium">No bulk orders found</p>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-900">#{order.orderNumber}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm font-medium text-slate-600">{order.product?.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-slate-900 flex items-center gap-1">
                                                    <User size={14} className="text-slate-400" />
                                                    {order.user?.name}
                                                </p>
                                                <p className="text-xs text-slate-500">{order.user?.email}</p>
                                                <p className="text-xs text-slate-500">{order.user?.mobileNumber}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-indigo-50 px-2 py-1 rounded text-center min-w-[60px]">
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase">Designs</p>
                                                    <p className="text-sm font-bold text-indigo-900">{order.distinctDesigns}</p>
                                                </div>
                                                <div className="bg-emerald-50 px-2 py-1 rounded text-center min-w-[60px]">
                                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Copies</p>
                                                    <p className="text-sm font-bold text-emerald-900">{order.totalCopies}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                                    {getStatusIcon(order.status)}
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                                <div className="w-40 space-y-1">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                        <span>{Math.round(order.progress?.percentage || 0)}%</span>
                                                        <span>{order.progress?.currentStep}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${order.progress?.percentage || 0}%` }}
                                                            className={`h-full rounded-full ${order.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-600'
                                                                }`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-lg font-bold text-slate-900">{formatPrice(order.pricing?.totalPrice)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {order.status === 'FAILED' && (
                                                    <button
                                                        onClick={() => handleRetry(order._id)}
                                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-200"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.total > pagination.limit && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-medium">
                            Showing <span className="text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900">{pagination.total}</span> entries
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-bold text-slate-700 px-4">Page {pagination.page}</span>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(Math.ceil(prev.total / prev.limit), prev.page + 1) }))}
                                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBulkOrdersView;
