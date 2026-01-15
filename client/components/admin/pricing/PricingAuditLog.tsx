import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, ChevronLeft, ChevronRight, Eye, X, AlertCircle, Loader } from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../../../lib/apiConfig';

/**
 * =========================================================================
 * PRICING AUDIT LOG UI
 * =========================================================================
 * 
 * Purpose: View all pricing calculation logs for audit trail
 * 
 * Features:
 * - List view with pagination
 * - Search by order/product/user
 * - Date range filtering
 * - Detailed modal showing full breakdown
 * - Responsive mobile/tablet/desktop design
 */

interface PricingLog {
    orderId: string;
    orderNumber: string;
    product: {
        _id: string;
        name: string;
        image?: string;
    };
    user: {
        _id: string;
        name: string;
        email: string;
    };
    quantity: number;
    totalPrice: number;
    createdAt: string;
    modifiers: Array<{
        _id: string;
        pricingKey: string;
        scope: string;
        beforeAmount: number;
        afterAmount: number;
        reason: string;
        appliedAt: string;
    }>;
}

export const PricingAuditLog: React.FC = () => {
    const [logs, setLogs] = useState<PricingLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<PricingLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalLogs: 0,
        limit: 20
    });

    useEffect(() => {
        fetchLogs();
    }, [currentPage, searchQuery, startDate, endDate]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
            });

            if (searchQuery) params.append('search', searchQuery);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`${API_BASE_URL}/admin/pricing-logs?${params}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setLogs(data.logs || []);
                setPagination(data.pagination);
            } else {
                setError(data.message || 'Failed to fetch logs');
            }
        } catch (error) {
            console.error('Failed to fetch pricing logs:', error);
            setError('Failed to fetch pricing logs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (log: PricingLog) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        return `₹${amount.toFixed(2)}`;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-7 h-7 md:w-8 md:h-8" />
                    Pricing Audit Logs
                </h1>
                <p className="text-gray-600 mt-2">
                    View all pricing calculations and applied modifiers
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Order, product, user..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading pricing logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No pricing logs found</p>
                    <p className="text-sm text-gray-500 mt-2">
                        Logs will appear here when orders are created
                    </p>
                </div>
            ) : (
                <>
                    {/* Logs List */}
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div
                                key={log.orderId}
                                className="bg-white rounded-lg shadow-md p-4 md:p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            {log.product?.image && (
                                                <img
                                                    src={log.product.image}
                                                    alt={log.product.name}
                                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 text-lg">
                                                    Order #{log.orderNumber}
                                                </h3>
                                                <p className="text-gray-700 mt-1">
                                                    {log.product?.name || 'Unknown Product'}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {log.user?.name} ({log.user?.email})
                                                </p>
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                                    <span>Qty: {log.quantity}</span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-green-600">
                                                        {formatCurrency(log.totalPrice)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{log.modifiers?.length || 0} modifiers</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {formatDate(log.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleViewDetails(log)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span className="hidden sm:inline">View Details</span>
                                        <span className="sm:hidden">Details</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="bg-white rounded-lg shadow-md p-4 mt-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-gray-600">
                                Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalLogs} total logs)
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="px-4 py-2 text-sm font-medium">
                                    {currentPage}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                                    disabled={currentPage === pagination.totalPages}
                                    className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                                Pricing Details
                            </h2>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 md:p-6 space-y-6">
                            {/* Order Info */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Order Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Order Number:</span>
                                        <span className="font-semibold">#{selectedLog.orderNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Product:</span>
                                        <span className="font-semibold">{selectedLog.product?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Customer:</span>
                                        <span className="font-semibold">{selectedLog.user?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Email:</span>
                                        <span className="font-semibold">{selectedLog.user?.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date:</span>
                                        <span className="font-semibold">{formatDate(selectedLog.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Applied Modifiers */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    Applied Modifiers ({selectedLog.modifiers?.length || 0})
                                </h3>
                                {selectedLog.modifiers && selectedLog.modifiers.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedLog.modifiers.map((modifier, index) => (
                                            <div
                                                key={modifier._id}
                                                className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-sm font-semibold text-blue-900">
                                                        {modifier.scope} Modifier
                                                    </span>
                                                    <span className={`text-sm font-bold ${modifier.afterAmount > modifier.beforeAmount
                                                        ? 'text-red-600'
                                                        : 'text-green-600'
                                                        }`}>
                                                        {modifier.afterAmount > modifier.beforeAmount ? '+' : ''}
                                                        {formatCurrency(modifier.afterAmount - modifier.beforeAmount)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-2">
                                                    {modifier.reason || 'No reason provided'}
                                                </p>
                                                <div className="flex justify-between text-xs text-gray-600">
                                                    <span>Before: {formatCurrency(modifier.beforeAmount)}</span>
                                                    <span>→</span>
                                                    <span>After: {formatCurrency(modifier.afterAmount)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                                        No modifiers were applied to this order
                                    </p>
                                )}
                            </div>

                            {/* Price Summary */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Price Summary</h3>
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Total Payable</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            {formatCurrency(selectedLog.totalPrice)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Quantity: {selectedLog.quantity} units
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 md:p-6">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PricingAuditLog;
