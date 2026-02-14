// OrderTable.tsx - Main Table Component with Sorting
import React from 'react';
import {
    CheckSquare, Square, ChevronUp, ChevronDown, MoreVertical,
    AlertTriangle, CheckCircle, Eye
} from 'lucide-react';

interface Order {
    _id: string;
    orderNumber: string;
    user: {
        _id: string;
        name: string;
        email: string;
    };
    product: {
        _id: string;
        name: string;
    };
    quantity: number;
    status: string;
    paymentStatus: string;
    priceSnapshot: {
        basePrice: number;
        subtotal: number;
        gstAmount: number;
        totalPayable: number;
        currency: string;
    };
    createdAt: string;
    actualDeliveryDate?: string;
    complaint?: {
        _id: string;
        status: string;
    };
}

interface OrderTableProps {
    orders: Order[];
    selectedIds: string[];
    onSelectRow: (id: string) => void;
    onSelectAll: () => void;
    sortConfig: { column: string; direction: 'asc' | 'desc' };
    onSort: (column: string) => void;
    onViewDetails: (order: Order) => void;
}

const STATUS_COLORS: Record<string, string> = {
    REQUESTED: 'bg-blue-100 text-blue-800',
    DESIGN: 'bg-purple-100 text-purple-800',
    APPROVED: 'bg-green-100 text-green-800',
    PRODUCTION: 'bg-orange-100 text-orange-800',
    QC: 'bg-yellow-100 text-yellow-800',
    PACKED: 'bg-amber-100 text-amber-800',
    DISPATCHED: 'bg-teal-100 text-teal-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REJECTED: 'bg-gray-100 text-gray-800',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PARTIAL: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
};

const OrderTable: React.FC<OrderTableProps> = ({
    orders,
    selectedIds,
    onSelectRow,
    onSelectAll,
    sortConfig,
    onSort,
    onViewDetails,
}) => {
    const renderSortIcon = (column: string) => {
        if (sortConfig.column !== column) return null;
        return sortConfig.direction === 'asc' ? (
            <ChevronUp size={16} className="inline ml-1" />
        ) : (
            <ChevronDown size={16} className="inline ml-1" />
        );
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const renderComplaintStatus = (order: Order) => {
        if (!order.complaint) {
            return <span className="text-gray-400">—</span>;
        }

        const isActive = ['REGISTERED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'].includes(
            order.complaint.status
        );

        return isActive ? (
            <span className="flex items-center gap-1 text-red-600 text-sm">
                <AlertTriangle size={14} />
                Active
            </span>
        ) : (
            <span className="flex items-center gap-1 text-green-600 text-sm">
                <CheckCircle size={14} />
                Closed
            </span>
        );
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="w-12 px-6 py-3">
                        <button
                            onClick={onSelectAll}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            {selectedIds.length === orders.length ? <CheckSquare size={20} /> : <Square size={20} />
                            }
                        </button>
                    </th>
                    <th
                        onClick={() => onSort('orderNumber')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                        Order Number {renderSortIcon('orderNumber')}
                    </th>
                    <th
                        onClick={() => onSort('user.name')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                        Customer {renderSortIcon('user.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                    </th>
                    <th
                        onClick={() => onSort('priceSnapshot.totalPayable')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                        Amount {renderSortIcon('priceSnapshot.totalPayable')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                    </th>
                    <th
                        onClick={() => onSort('createdAt')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                        Created {renderSortIcon('createdAt')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complaint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                    <tr
                        key={order._id}
                        className={`hover:bg-gray-50 ${selectedIds.includes(order._id) ? 'bg-indigo-50' : ''
                            }`}
                    >
                        <td className="px-6 py-4">
                            <button
                                onClick={() => onSelectRow(order._id)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                {selectedIds.includes(order._id) ? (
                                    <CheckSquare size={20} className="text-indigo-600" />
                                ) : (
                                    <Square size={20} />
                                )}
                            </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <button
                                onClick={() => onViewDetails(order)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                            >
                                {order.orderNumber}
                            </button>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{order.user.name}</div>
                            <div className="text-xs text-gray-500">{order.user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                                {order.product.name}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{(
                                (order as any).payment_details?.amount_paid || 
                                order.priceSnapshot?.totalPayable || 
                                (order as any).totalPrice || 
                                0
                            ).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {order.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_COLORS[order.paymentStatus] || 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {order.paymentStatus}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {renderComplaintStatus(order)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                                onClick={() => onViewDetails(order)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                            >
                                <Eye size={16} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default OrderTable;
