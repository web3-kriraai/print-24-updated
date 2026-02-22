import React from 'react';
import { ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Clock, Eye, MoreVertical, Image as ImageIcon } from 'lucide-react';

interface Order {
    _id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    priceSnapshot: {
        basePrice: number;
        subtotal: number;
        gstAmount: number;
        totalPayable: number;
        currency: string;
    };
    createdAt: string;
    isBulkParent?: boolean;
    isBulkChild?: boolean;
    distinctDesigns?: number;
    quantity: number;
    childOrders?: string[];
    user: {
        _id: string;
        name: string;
        email: string;
        mobileNumber?: string;
    };
    product: {
        _id: string;
        name: string;
        image: string;
    };
    uploadedDesign?: {
        frontImage?: { url?: string; data?: string; filename?: string; contentType?: string };
        backImage?: { url?: string; data?: string; filename?: string; contentType?: string };
        pdfFile?: { url?: string; filename?: string; pageCount?: number };
    };
}

interface OrderTableProps {
    orders: Order[];
    selectedIds: string[];
    onSelectRow: (id: string) => void;
    onSelectAll: (ids: string[]) => void;
    sortConfig: {
        column: string;
        direction: 'asc' | 'desc';
    };
    onSort: (column: string) => void;
    onViewDetails: (order: Order) => void;
}

const OrderTable: React.FC<OrderTableProps> = ({
    orders,
    selectedIds,
    onSelectRow,
    onSelectAll,
    sortConfig,
    onSort,
    onViewDetails
}) => {
    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onSelectAll(orders.map(o => o._id));
        } else {
            onSelectAll([]);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'request': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'processing': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'cancelled':
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPaymentStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'text-green-600';
            case 'partial': return 'text-blue-600';
            case 'pending': return 'text-orange-600';
            default: return 'text-gray-600';
        }
    };

    const renderSortIcon = (column: string) => {
        if (sortConfig.column !== column) return <ChevronUp size={14} className="opacity-20 group-hover:opacity-100" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="text-indigo-600" />
            : <ChevronDown size={14} className="text-indigo-600" />;
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200">
                            <input
                                type="checkbox"
                                checked={orders.length > 0 && selectedIds.length === orders.length}
                                onChange={handleSelectAllChange}
                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                        </th>
                        <th
                            className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer group"
                            onClick={() => onSort('orderNumber')}
                        >
                            <div className="flex items-center gap-2">
                                Order # {renderSortIcon('orderNumber')}
                            </div>
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Customer
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Product
                        </th>
                        <th
                            className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer group"
                            onClick={() => onSort('createdAt')}
                        >
                            <div className="flex items-center gap-2">
                                Date {renderSortIcon('createdAt')}
                            </div>
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                        </th>
                        <th
                            className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer group"
                            onClick={() => onSort('totalPrice')}
                        >
                            <div className="flex items-center gap-2">
                                Amount {renderSortIcon('totalPrice')}
                            </div>
                        </th>
                        <th className="sticky top-0 z-10 px-6 py-4 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                        <tr
                            key={order._id}
                            className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(order._id) ? 'bg-indigo-50' : ''}`}
                        >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(order._id)}
                                    onChange={() => onSelectRow(order._id)}
                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-900">{order.orderNumber}</span>
                                    {order.isBulkParent && (
                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase" title="Bulk Parent Order">
                                            Bulk
                                        </span>
                                    )}
                                    {order.isBulkChild && (
                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase" title="Part of a Bulk Order">
                                            Child
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">{order.user.name}</span>
                                    <span className="text-xs text-gray-500">{order.user.email}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <img src={order.product.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100" />
                                    <span className="text-sm text-gray-700">{order.product.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-600">
                                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>
                                    {order.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">₹{order.totalPrice.toLocaleString()}</span>
                                    <span className={`text-[10px] font-medium uppercase ${getPaymentStatusStyle(order.paymentStatus)}`}>
                                        {order.paymentStatus}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                                    {(order.uploadedDesign?.frontImage || order.uploadedDesign?.pdfFile) && (
                                        <button
                                            onClick={() => onViewDetails(order)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                            title="View Designs"
                                        >
                                            <ImageIcon size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onViewDetails(order)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <Eye size={16} />
                                        <span>View</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {orders.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-gray-500">No orders found matching your criteria.</p>
                </div>
            )}
        </div>
    );
};

export default OrderTable;
