// OrderDetailsModal.tsx - Full Order Details with Tabs
import React, { useState } from 'react';
import { X, Package, CreditCard, Truck, MessageSquare, AlertTriangle, FileText } from 'lucide-react';

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
        basePrice: number;
        subtotal: number;
        gstAmount: number;
        totalPayable: number;
        currency: string;
    };
    createdAt: string;
    updatedAt?: string;
    actualDeliveryDate?: string;
    deliveryStatus?: string;
    address?: string;
    pincode?: string;
    mobileNumber?: string;
    notes?: string;
    complaint?: {
        _id: string;
        status: string;
    };
}

interface OrderDetailsModalProps {
    order: Order;
    onClose: () => void;
    onUpdate: () => void;
}

const TABS = [
    { id: 'basic', label: 'Basic Info', icon: Package },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'communications', label: 'Communications', icon: MessageSquare },
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
    { id: 'audit', label: 'Audit Log', icon: FileText },
];

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
    order,
    onClose,
    onUpdate,
}) => {
    const [activeTab, setActiveTab] = useState('basic');

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="space-y-6">
                        {/* Customer Info */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-xs text-gray-500">Name</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{order.user.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Email</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{order.user.email}</dd>
                                </div>
                                {order.user.mobileNumber && (
                                    <div>
                                        <dt className="text-xs text-gray-500">Mobile</dt>
                                        <dd className="mt-1 text-sm font-medium text-gray-900">{order.user.mobileNumber}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Order Info */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Details</h3>
                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-xs text-gray-500">Order Number</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{order.orderNumber}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Status</dt>
                                    <dd className="mt-1">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {order.status}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Created</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.createdAt)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500">Last Updated</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(order.updatedAt)}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Delivery Info */}
                        {order.address && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Delivery Information</h3>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-xs text-gray-500">Address</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{order.address}</dd>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <dt className="text-xs text-gray-500">Pincode</dt>
                                            <dd className="mt-1 text-sm font-medium text-gray-900">{order.pincode}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-gray-500">Contact</dt>
                                            <dd className="mt-1 text-sm font-medium text-gray-900">{order.mobileNumber}</dd>
                                        </div>
                                    </div>
                                </dl>
                            </div>
                        )}

                        {/* Notes */}
                        {order.notes && (
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
                                <p className="text-sm text-gray-700">{order.notes}</p>
                            </div>
                        )}
                    </div>
                );

            case 'items':
                return (
                    <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-gray-900">{order.product.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">Quantity: {order.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">
                                        ₹{order.priceSnapshot.totalPayable.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'payment':
                return (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-sm font-semibold mb-4">Payment Summary</h3>
                            <dl className="space-y-2">
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-600">Base Price</dt>
                                    <dd className="text-sm font-medium">₹{order.priceSnapshot.basePrice?.toLocaleString() || 0}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-600">Subtotal</dt>
                                    <dd className="text-sm font-medium">₹{order.priceSnapshot.subtotal.toLocaleString()}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm text-gray-600">GST</dt>
                                    <dd className="text-sm font-medium">₹{order.priceSnapshot.gstAmount.toLocaleString()}</dd>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <dt className="text-base font-semibold text-gray-900">Total Payable</dt>
                                    <dd className="text-base font-bold text-gray-900">
                                        ₹{order.priceSnapshot.totalPayable.toLocaleString()}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div>
                            <span
                                className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${order.paymentStatus === 'COMPLETED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                    }`}
                            >
                                {order.paymentStatus}
                            </span>
                        </div>
                    </div>
                );

            case 'logistics':
                return (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Delivery Status</h3>
                        <div>
                            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                                {order.deliveryStatus || 'PENDING'}
                            </span>
                        </div>
                        {order.actualDeliveryDate && (
                            <div>
                                <dt className="text-xs text-gray-500">Delivered On</dt>
                                <dd className="mt-1 text-sm font-medium text-gray-900">
                                    {formatDate(order.actualDeliveryDate)}
                                </dd>
                            </div>
                        )}
                    </div>
                );

            case 'complaints':
                return (
                    <div className="space-y-4">
                        {order.complaint ? (
                            <div className="border-l-4 border-red-400 bg-red-50 p-4">
                                <p className="text-sm font-medium text-red-800">
                                    Complaint Status: {order.complaint.status}
                                </p>
                                <button
                                    onClick={() => window.location.href = `/admin/complaints/${order.complaint?._id}`}
                                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                    View Complaint Details →
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No complaints registered for this order</p>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="text-center py-8">
                        <p className="text-gray-500">Content for {activeTab} coming soon...</p>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                        <p className="text-sm text-gray-500">{order.orderNumber}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderTabContent()}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;
