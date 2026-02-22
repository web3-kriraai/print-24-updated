import React, { useState, useEffect } from 'react';
import { X, User, ShoppingBag, CreditCard, Calendar, MessageSquare, Save, Package, CheckCircle2, FileText, Download, ExternalLink } from 'lucide-react';
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
    shippingCost?: number;
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
        uploadedImages?: Array<{
            url: string;
            filename: string;
        }>;
    }>;
    uploadedDesign?: {
        frontImage?: { url?: string; data?: string; filename?: string; contentType?: string };
        backImage?: { url?: string; data?: string; filename?: string; contentType?: string };
        pdfFile?: { url?: string; filename?: string; pageCount?: number };
    };
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
                                    {(order.shippingCost || (order.priceSnapshot as any)?.shippingCost) && (
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-500 uppercase font-medium">Shipping</span>
                                            <span className="text-sm font-bold text-blue-600">₹{(order.shippingCost || (order.priceSnapshot as any)?.shippingCost).toLocaleString()}</span>
                                        </div>
                                    )}
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
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-gray-500 mb-0.5">{attr.attributeName}</p>
                                                                <p className="font-medium text-gray-900">{attr.label} {attr.priceAdd ? `(+₹${attr.priceAdd})` : ''}</p>
                                                            </div>
                                                            {attr.uploadedImages && attr.uploadedImages.length > 0 && (
                                                                <div className="flex gap-1">
                                                                    {attr.uploadedImages.map((img, idx) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={img.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="relative w-8 h-8 rounded border border-gray-100 overflow-hidden hover:border-indigo-400 group"
                                                                            title={img.filename}
                                                                        >
                                                                            <img src={img.url} className="w-full h-full object-cover" />
                                                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                                                                <ExternalLink size={10} className="text-white drop-shadow-md" />
                                                                            </div>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Design Files */}
                            {order.uploadedDesign && (
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                        <FileText size={18} className="text-gray-500" />
                                        <h3 className="font-semibold text-gray-900">Design Files</h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {order.uploadedDesign.frontImage && (
                                            <div className="border border-gray-100 rounded-lg p-3 bg-white">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-indigo-600 uppercase">Front Design</span>
                                                    <a href={order.uploadedDesign.frontImage.url || order.uploadedDesign.frontImage.data} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 rounded">
                                                        <Download size={14} className="text-gray-500" />
                                                    </a>
                                                </div>
                                                <img
                                                    src={order.uploadedDesign.frontImage.url || order.uploadedDesign.frontImage.data}
                                                    className="w-full h-32 object-contain rounded border border-gray-50 bg-gray-50"
                                                />
                                            </div>
                                        )}
                                        {order.uploadedDesign.backImage && (
                                            <div className="border border-gray-100 rounded-lg p-3 bg-white">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-indigo-600 uppercase">Back Design</span>
                                                    <a href={order.uploadedDesign.backImage.url || order.uploadedDesign.backImage.data} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-100 rounded">
                                                        <Download size={14} className="text-gray-500" />
                                                    </a>
                                                </div>
                                                <img
                                                    src={order.uploadedDesign.backImage.url || order.uploadedDesign.backImage.data}
                                                    className="w-full h-32 object-contain rounded border border-gray-50 bg-gray-50"
                                                />
                                            </div>
                                        )}
                                        {order.uploadedDesign.pdfFile && (
                                            <div className="col-span-1 md:col-span-2 border border-blue-100 rounded-lg p-3 bg-blue-50/30">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-100 rounded-lg">
                                                            <FileText size={20} className="text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{order.uploadedDesign.pdfFile.filename || 'Source Design File'}</p>
                                                            <p className="text-xs text-gray-500">{order.uploadedDesign.pdfFile.filename?.toLowerCase().endsWith('.pdf') ? 'PDF Document' : 'Source File'} • {order.uploadedDesign.pdfFile.pageCount || 1} Page(s)</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={order.uploadedDesign.pdfFile.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                                                        >
                                                            <ExternalLink size={14} />
                                                            View
                                                        </a>
                                                        <a
                                                            href={order.uploadedDesign.pdfFile.url}
                                                            download={order.uploadedDesign.pdfFile.filename}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 border border-blue-600 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
                                                        >
                                                            <Download size={14} />
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
