import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Package,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader,
    ChevronRight,
    Calendar,
    ArrowLeft,
    Filter
} from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import { formatPrice } from '../src/utils/currencyUtils';

interface Order {
    _id: string;
    orderNumber: string;
    product: {
        _id: string;
        name: string;
        image?: string;
    };
    quantity: number;
    totalPrice: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    parentOrderId?: string | { _id: string }; // Support both populated and unpopulated
    payment_details?: {
        amount_paid?: number;
    };
    priceSnapshot?: {
        totalPayable: number;
    };
}

interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    ordersPerPage: number;
}

const MyOrders: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const parentId = searchParams.get('parent');

    const [orders, setOrders] = useState<Order[]>([]);
    const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all orders for client-side filtering if needed
    
    const [latestOrder, setLatestOrder] = useState<Order | null>(null);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [orderFilter, setOrderFilter] = useState<'all' | 'parent' | 'child'>('all');

    useEffect(() => {
        fetchOrders(currentPage);
    }, [currentPage, parentId, orderFilter]); // Added orderFilter to dependencies

    const fetchOrders = async (page: number) => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Support server-side filtering for parentId and pagination
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '50'); // Increased limit to find child orders
            if (parentId) {
                params.append('parent', parentId);
            }
            // Add filter for parent/child orders
            if (orderFilter === 'parent') {
                params.append('onlyParents', 'true');
            } else if (orderFilter === 'child') {
                params.append('onlyChildren', 'true');
            }
            
            const url = `${API_BASE_URL}/timeline/my-orders?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            
            let fetchedOrders = Array.isArray(data) ? data : (data.orders || []);
            
            // Server now handles parentId filtering
            if (parentId && fetchedOrders.length === 0) {
               // Optional: Handle case where server returns nothing
            }

            setOrders(fetchedOrders);
            setLatestOrder(data.latestOrder || null);
            setPagination(data.pagination || null);
            setPagination(data.pagination || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'processing':
            case 'production_ready':
            case 'approved':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'request':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'cancelled':
            case 'rejected':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'processing':
            case 'production_ready':
            case 'approved':
                return <Loader className="w-4 h-4 animate-spin" />;
            case 'request':
                return <Clock className="w-4 h-4" />;
            case 'cancelled':
            case 'rejected':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Package className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    if (loading && orders.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading your orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Orders</h2>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchOrders(currentPage)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
                    <p className="text-slate-600 mt-2">Track and manage all your orders</p>
                    
                    {/* Filter Dropdown */}
                    {!parentId && (
                        <div className="mt-4">
                            <label htmlFor="orderFilter" className="sr-only">Filter Orders</label>
                            <div className="relative inline-block">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select
                                    id="orderFilter"
                                    value={orderFilter}
                                    onChange={(e) => setOrderFilter(e.target.value as 'all' | 'parent' | 'child')}
                                    className="appearance-none bg-white border border-slate-300 rounded-lg pl-10 pr-10 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                >
                                    <option value="all">All Orders</option>
                                    <option value="parent">Parent Orders Only</option>
                                    <option value="child">Child Orders Only</option>
                                </select>
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {parentId && (
                        <div className="mt-4 flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 text-blue-800">
                                <Package className="w-5 h-5" />
                                <span className="font-medium">Showing Child Orders for Bulk Order</span>
                            </div>
                            <button 
                                onClick={() => navigate('/my-orders')}
                                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                View All Orders
                            </button>
                        </div>
                    )}
                </div>

                {/* Latest Order Banner */}
                {latestOrder && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 mb-8 text-white"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium mb-1">Latest Order</p>
                                <h2 className="text-2xl font-bold mb-2">{latestOrder.orderNumber}</h2>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        {latestOrder.product?.name || 'Product'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(latestOrder.createdAt)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/orders/${latestOrder._id}`)}
                                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                            >
                                View Details
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Orders List */}
                {orders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">No Orders Yet</h3>
                        <p className="text-slate-600 mb-6">Start shopping to see your orders here</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Browse Products
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4">
                            {orders.map((order, index) => (
                                <motion.div
                                    key={order._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => navigate(`/orders/${order._id}`)}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-6">
                                        {/* Product Image */}
                                        {order.product?.image ? (
                                            <img
                                                src={order.product.image}
                                                alt={order.product.name}
                                                className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Package className="w-8 h-8 text-slate-400" />
                                            </div>
                                        )}

                                        {/* Order Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    {order.orderNumber}
                                                </h3>
                                                <span className={`
                          px-3 py-1 rounded-full text-xs font-medium border
                          flex items-center gap-1
                          ${getStatusColor(order.status)}
                        `}>
                                                    {getStatusIcon(order.status)}
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-slate-700 font-medium mb-1">
                                                {order.product?.name || 'Product'}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span>Quantity: {order.quantity.toLocaleString()}</span>
                                                <span>•</span>
                                                <span>{formatDate(order.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Price & Action */}
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-slate-900 mb-2">
                                                {formatPrice(
                                                    order.payment_details?.amount_paid || 
                                                    order.priceSnapshot?.totalPayable || 
                                                    order.totalPrice || 
                                                    0, 
                                                    'INR'
                                                )}
                                            </p>
                                            <div className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700 font-medium">
                                                <span>View Details</span>
                                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-2">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`
                        w-10 h-10 rounded-lg font-medium transition-colors
                        ${page === currentPage
                                                    ? 'bg-blue-600 text-white'
                                                    : 'border border-slate-300 hover:bg-slate-50'}
                      `}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={currentPage === pagination.totalPages}
                                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}

                        {/* Total Orders Count */}
                        {pagination && (
                            <p className="text-center text-sm text-slate-500 mt-4">
                                Showing {orders.length} of {pagination.totalOrders} orders
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MyOrders;
