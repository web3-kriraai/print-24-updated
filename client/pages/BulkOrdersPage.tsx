import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Package, Calendar, Clock, CheckCircle, AlertCircle,
    XCircle, Loader, FileText, Eye, ChevronRight,
    Filter, Search, Plus, Upload, Layers
} from 'lucide-react';
import { useBulkOrders } from '../hooks/useBulkOrder';
import { useNavigate } from 'react-router-dom';

const BulkOrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const { bulkOrders, loading, error, refetch } = useBulkOrders({
        status: statusFilter || undefined,
    });

    // Filter by search query
    const filteredOrders = searchQuery
        ? bulkOrders.filter((order: any) =>
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : bulkOrders;

    // Status badge styling
    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            UPLOADED: {
                bg: 'bg-blue-100 text-blue-800',
                text: 'Uploaded',
                icon: <Upload className="w-4 h-4" />,
            },
            VALIDATING: {
                bg: 'bg-yellow-100 text-yellow-800',
                text: 'Validating',
                icon: <Clock className="w-4 h-4" />,
            },
            PROCESSING: {
                bg: 'bg-purple-100 text-purple-800',
                text: 'Processing',
                icon: <Loader className="w-4 h-4 animate-spin" />,
            },
            SPLIT_COMPLETE: {
                bg: 'bg-indigo-100 text-indigo-800',
                text: 'Split Complete',
                icon: <CheckCircle className="w-4 h-4" />,
            },
            ORDER_CREATED: {
                bg: 'bg-green-100 text-green-800',
                text: 'Completed',
                icon: <CheckCircle className="w-4 h-4" />,
            },
            FAILED: {
                bg: 'bg-red-100 text-red-800',
                text: 'Failed',
                icon: <XCircle className="w-4 h-4" />,
            },
            CANCELLED: {
                bg: 'bg-gray-100 text-gray-800',
                text: 'Cancelled',
                icon: <XCircle className="w-4 h-4" />,
            },
        };

        const style = styles[status] || styles.UPLOADED;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.bg}`}>
                {style.icon}
                {style.text}
            </span>
        );
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                                <Package className="w-10 h-10 text-blue-600" />
                                Bulk Orders
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Track and manage your bulk order uploads
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/products')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5" />
                            New Bulk Order
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Search */}
                        <div className="md:col-span-6 relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by order number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="md:col-span-4 relative">
                            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            >
                                <option value="">All Statuses</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="ORDER_CREATED">Completed</option>
                                <option value="FAILED">Failed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        {/* Refresh */}
                        <div className="md:col-span-2">
                            <button
                                onClick={refetch}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                            <p className="text-gray-600">Loading bulk orders...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-800 font-semibold mb-2">Error loading orders</p>
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bulk Orders Yet</h3>
                        <p className="text-gray-600 mb-6">
                            {searchQuery || statusFilter
                                ? 'No orders match your filters'
                                : 'Start by creating your first bulk order'}
                        </p>
                        {!searchQuery && !statusFilter && (
                            <button
                                onClick={() => navigate('/products')}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Create Bulk Order
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order: any) => (
                            <motion.div
                                key={order._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-gray-900">
                                                    {order.orderNumber}
                                                </h3>
                                                {getStatusBadge(order.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(order.createdAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Layers className="w-4 h-4" />
                                                    {order.distinctDesigns} designs
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    {order.totalCopies.toLocaleString()} copies
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/bulk-orders/${order._id}`)}
                                            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Details
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Progress Bar (for processing orders) */}
                                    {order.status === 'PROCESSING' && order.progress && (
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {order.progress.currentStep}
                                                </span>
                                                <span className="text-sm font-semibold text-blue-600">
                                                    {order.progress.percentage}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${order.progress.percentage}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{order.progress.message}</p>
                                        </div>
                                    )}

                                    {/* Child Orders Link */}
                                    {order.status === 'ORDER_CREATED' && order.parentOrderId && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={() => navigate(`/orders?parent=${order.parentOrderId._id}`)}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                                            >
                                                <Package className="w-4 h-4" />
                                                View {order.distinctDesigns} Child Orders
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Failure Reason */}
                                    {order.status === 'FAILED' && order.failureReason && (
                                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                            <p className="text-sm text-red-800 flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4" />
                                                {order.failureReason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkOrdersPage;
