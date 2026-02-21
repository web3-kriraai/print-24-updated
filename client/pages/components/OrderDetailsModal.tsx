import React, { useState, useEffect } from 'react';
import { X, User, ShoppingBag, CreditCard, Calendar, MessageSquare, Save, Package, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/apiConfig';

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
        image: string;
    };
    quantity: number;
    totalPrice: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    adminNotes?: string;
    priceSnapshot?: {
        basePrice: number;
        subtotal: number;
        gstAmount: number;
        totalPayable: number;
        currency: string;
    };
    selectedOptions?: Array<{
        optionName: string;
        priceAdd: number;
    }>;
    selectedDynamicAttributes?: Array<{
        attributeName: string;
        label: string;
        priceAdd?: number;
    }>;
}

interface OrderDetailsModalProps {
    order: Order;
    onClose: () => void;
    onUpdate: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order: initialOrder, onClose, onUpdate }) => {
    const [order, setOrder] = useState<Order>(initialOrder);
    const [status, setStatus] = useState(initialOrder.status);
    const [paymentStatus, setPaymentStatus] = useState(initialOrder.paymentStatus);
    const [adminNotes, setAdminNotes] = useState(initialOrder.adminNotes || '');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFullDetails = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/orders/${initialOrder._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrder(data);
                    setStatus(data.status);
                    setPaymentStatus(data.paymentStatus);
                    setAdminNotes(data.adminNotes || '');
                }
            } catch (err) {
                console.error('Error fetching full order details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFullDetails();
    }, [initialOrder._id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/orders/${order._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    status,
                    adminNotes,
                    // Note: paymentStatus might need a separate endpoint or be handled here
                })
            });

            if (response.ok) {
                onUpdate();
                onClose();
            }
        } catch (err) {
            console.error('Error updating order:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
                        <p className="text-sm text-gray-500">#{order.orderNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-40 bg-gray-100 rounded-xl"></div>
                            <div className="h-60 bg-gray-100 rounded-xl"></div>
                        </div>
                    ) : (
                        <>
                            {/* Summary Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Customer Info */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3 text-indigo-600">
                                        <User size={18} />
                                        <h3 className="font-semibold text-sm">Customer</h3>
                                    </div>
                                    <p className="font-bold text-gray-900">{order.user.name}</p>
                                    <p className="text-sm text-gray-600">{order.user.email}</p>
                                    {order.user.mobileNumber && <p className="text-sm text-gray-600">{order.user.mobileNumber}</p>}
                                </div>

                                {/* Order Info */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3 text-orange-600">
                                        <Package size={18} />
                                        <h3 className="font-semibold text-sm">Order Status</h3>
                                    </div>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="request">Request</option>
                                        <option value="approved">Approved</option>
                                        <option value="processing">Processing</option>
                                        <option value="production_ready">Production Ready</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* Payment Info */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 mb-3 text-green-600">
                                        <CreditCard size={18} />
                                        <h3 className="font-semibold text-sm">Payment</h3>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500 uppercase font-medium">Status</span>
                                        <span className="text-sm font-bold text-gray-900 uppercase">{paymentStatus}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 uppercase font-medium">Total Price</span>
                                        <span className="text-lg font-bold text-indigo-600">₹{order.totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Product Details */}
                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                    <ShoppingBag size={18} className="text-gray-500" />
                                    <h3 className="font-semibold text-gray-900">Product Items</h3>
                                </div>
                                <div className="p-4 flex gap-6">
                                    <img src={order.product.image} className="w-32 h-32 rounded-lg object-cover bg-gray-50" />
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900">{order.product.name}</h4>
                                            <p className="text-sm text-gray-500">Unit Quantity: {order.quantity}</p>
                                        </div>

                                        {(order.selectedOptions?.length || 0) > 0 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {order.selectedOptions?.map((opt, i) => (
                                                    <div key={i} className="text-xs border-l-2 border-indigo-200 pl-3">
                                                        <p className="text-gray-500 mb-0.5">{opt.optionName}</p>
                                                        <p className="font-medium text-gray-900">+₹{opt.priceAdd}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {(order.selectedDynamicAttributes?.length || 0) > 0 && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {order.selectedDynamicAttributes?.map((attr, i) => (
                                                    <div key={i} className="text-xs border-l-2 border-gray-200 pl-3">
                                                        <p className="text-gray-500 mb-0.5">{attr.attributeName}</p>
                                                        <p className="font-medium text-gray-900">{attr.label} {attr.priceAdd ? `(+₹${attr.priceAdd})` : ''}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Admin Notes */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 text-gray-700">
                                    <MessageSquare size={18} />
                                    <h3 className="font-semibold text-sm">Admin Notes</h3>
                                </div>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Enter internal notes here..."
                                    className="w-full h-24 bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? 'Saving...' : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;
