// Order Management Dashboard - Main Container
// Handles state management, API calls, and coordinates all sub-components

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
    MoreVertical, CheckSquare, Square, Loader2
} from 'lucide-react';
import OrderStats from '../components/OrderStats';
import OrderFilters from '../components/OrderFilters';
import OrderTable from '../components/OrderTable';
import OrderBulkActions from '../components/OrderBulkActions';
import OrderDetailsModal from '../components/OrderDetailsModal';

// Types
interface Order {
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
        image?: string;
    };
    quantity: number;
    status: string;
    paymentStatus: string;
    priceSnapshot: {
        totalPayable: number;
        currency: string;
    };
    createdAt: string;
    updatedAt?: string;
    actualDeliveryDate?: string;
    deliveryStatus?: string;
    complaint?: {
        _id: string;
        status: string;
    };
}

interface Filters {
    search: string;
    status: string[];
    paymentStatus: string[];
    dateRange: {
        start: string;
        end: string;
    };
    amountRange: {
        min: number;
        max: number;
    };
    deliveryStatus: string[];
    hasComplaint: boolean;
    activeComplaintOnly: boolean;
    customerType: string[];
}

interface SortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OrderManagement: React.FC = () => {
    // State Management
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
    });

    // Filters
    const [filters, setFilters] = useState<Filters>({
        search: '',
        status: [],
        paymentStatus: [],
        dateRange: { start: '', end: '' },
        amountRange: { min: 0, max: 0 },
        deliveryStatus: [],
        hasComplaint: false,
        activeComplaintOnly: false,
        customerType: [],
    });

    // Sorting
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        column: 'createdAt',
        direction: 'desc',
    });

    // Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Fetch Orders
    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);

            // Build query params
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());

            if (filters.search) params.append('search', filters.search);
            if (filters.status.length > 0) params.append('status', filters.status.join(','));
            if (filters.paymentStatus.length > 0) params.append('paymentStatus', filters.paymentStatus.join(','));
            if (filters.dateRange.start) params.append('startDate', filters.dateRange.start);
            if (filters.dateRange.end) params.append('endDate', filters.dateRange.end);
            if (filters.amountRange.min > 0) params.append('minAmount', filters.amountRange.min.toString());
            if (filters.amountRange.max > 0) params.append('maxAmount', filters.amountRange.max.toString());
            if (filters.deliveryStatus.length > 0) params.append('deliveryStatus', filters.deliveryStatus.join(','));
            if (filters.hasComplaint) params.append('hasComplaint', 'true');
            if (filters.activeComplaintOnly) params.append('activeComplaint', 'true');
            if (filters.customerType.length > 0) params.append('customerType', filters.customerType.join(','));

            params.append('sortBy', sortConfig.column);
            params.append('sortOrder', sortConfig.direction);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/admin/orders/list?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            setOrders(data.orders || []);
            setPagination(data.pagination || pagination);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError(err instanceof Error ? err.message : 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and when filters/pagination/sort change
    useEffect(() => {
        fetchOrders();
    }, [pagination.page, pagination.limit, sortConfig]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page !== 1) {
                setPagination(prev => ({ ...prev, page: 1 }));
            } else {
                fetchOrders();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [filters.search]);

    // Filter changes (non-search)
    const handleFilterChange = (newFilters: Partial<Filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Watch filter changes and trigger fetch
    useEffect(() => {
        if (pagination.page !== 1) {
            setPagination(prev => ({ ...prev, page: 1 }));
        } else {
            fetchOrders();
        }
    }, [filters]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (pagination.page === 1) {
            fetchOrders();
        }
    }, [pagination.page]);

    // Sorting
    const handleSort = (column: string) => {
        setSortConfig(prev => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Selection
    const handleSelectRow = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(orders.map(o => o._id));
        }
    };

    // Pagination
    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleLimitChange = (newLimit: number) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            search: '',
            status: [],
            paymentStatus: [],
            dateRange: { start: '', end: '' },
            amountRange: { min: 0, max: 0 },
            deliveryStatus: [],
            hasComplaint: false,
            activeComplaintOnly: false,
            customerType: [],
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Applied filters count
    const appliedFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.status.length > 0) count++;
        if (filters.paymentStatus.length > 0) count++;
        if (filters.dateRange.start || filters.dateRange.end) count++;
        if (filters.amountRange.min > 0 || filters.amountRange.max > 0) count++;
        if (filters.deliveryStatus.length > 0) count++;
        if (filters.hasComplaint) count++;
        if (filters.activeComplaintOnly) count++;
        if (filters.customerType.length > 0) count++;
        return count;
    }, [filters]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage and track all orders from your dashboard
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => fetchOrders()}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                            <button
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                                <Download size={16} />
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <OrderStats />
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {/* Search & Filters Bar */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by order number, customer name, email, or product..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* Filter Button */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border ${showFilters || appliedFiltersCount > 0
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter size={16} />
                                Filters
                                {appliedFiltersCount > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-semibold text-white bg-indigo-600 rounded-full">
                                        {appliedFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Filter Chips */}
                        {appliedFiltersCount > 0 && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-600">Active filters:</span>
                                {/* TODO: Add filter chips here */}
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <OrderFilters
                                filters={filters}
                                onChange={handleFilterChange}
                                onClose={() => setShowFilters(false)}
                            />
                        </div>
                    )}

                    {/* Bulk Actions Bar */}
                    {selectedIds.length > 0 && (
                        <OrderBulkActions
                            selectedCount={selectedIds.length}
                            onClearSelection={() => setSelectedIds([])}
                            onStatusUpdate={async (status) => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${API_URL}/api/admin/orders/bulk-update`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            orderIds: selectedIds,
                                            status: status
                                        }),
                                    });

                                    if (response.ok) {
                                        const result = await response.json();
                                        alert(`Successfully updated ${result.updatedCount} orders`);
                                        setSelectedIds([]);
                                        fetchOrders();
                                    } else {
                                        throw new Error('Failed to update orders');
                                    }
                                } catch (error) {
                                    console.error('Bulk status update error:', error);
                                    alert('Failed to update orders. Please try again.');
                                }
                            }}
                            onPaymentUpdate={async (paymentStatus) => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${API_URL}/api/admin/orders/bulk-update`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            orderIds: selectedIds,
                                            paymentStatus: paymentStatus
                                        }),
                                    });

                                    if (response.ok) {
                                        const result = await response.json();
                                        alert(`Successfully updated ${result.updatedCount} orders`);
                                        setSelectedIds([]);
                                        fetchOrders();
                                    } else {
                                        throw new Error('Failed to update payment status');
                                    }
                                } catch (error) {
                                    console.error('Bulk payment update error:', error);
                                    alert('Failed to update payment status. Please try again.');
                                }
                            }}
                            onExport={async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${API_URL}/api/admin/orders/export`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            orderIds: selectedIds
                                        }),
                                    });

                                    if (response.ok) {
                                        const csvContent = await response.text();
                                        // Create download link
                                        const blob = new Blob([csvContent], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        window.URL.revokeObjectURL(url);

                                        alert(`Successfully exported ${selectedIds.length} orders`);
                                    } else {
                                        throw new Error('Failed to export orders');
                                    }
                                } catch (error) {
                                    console.error('Export error:', error);
                                    alert('Failed to export orders. Please try again.');
                                }
                            }}
                            onDelete={async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${API_URL}/api/admin/orders/bulk-delete`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            orderIds: selectedIds
                                        }),
                                    });

                                    if (response.ok) {
                                        const result = await response.json();
                                        alert(`Successfully deleted ${result.deletedCount} orders`);
                                        setSelectedIds([]);
                                        fetchOrders();
                                    } else {
                                        throw new Error('Failed to delete orders');
                                    }
                                } catch (error) {
                                    console.error('Bulk delete error:', error);
                                    alert('Failed to delete orders. Please try again.');
                                }
                            }}
                        />
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-600">{error}</p>
                                <button
                                    onClick={fetchOrders}
                                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No orders found</p>
                                {appliedFiltersCount > 0 && (
                                    <button
                                        onClick={clearFilters}
                                        className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <OrderTable
                                orders={orders}
                                selectedIds={selectedIds}
                                onSelectRow={handleSelectRow}
                                onSelectAll={handleSelectAll}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                onViewDetails={(order) => setSelectedOrder(order)}
                            />
                        )}
                    </div>

                    {/* Pagination */}
                    {!loading && orders.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-700">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                                    {pagination.total} results
                                </span>
                                <select
                                    value={pagination.limit}
                                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value={20}>20 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium ${pagination.page === pageNum
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.pages}
                                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={fetchOrders}
                />
            )}
        </div>
    );
};

export default OrderManagement;
