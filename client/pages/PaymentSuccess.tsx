import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Loader } from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';

/**
 * Payment Success Page
 * Displayed after successful payment verification
 */
const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setOrder(data.order || data);
                }
            } catch (error) {
                console.error('Failed to fetch order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <Loader className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Payment Successful!
                </h1>
                <p className="text-gray-600 mb-6">
                    Your order has been placed successfully.
                </p>

                {/* Order Details */}
                {order && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Order Number</span>
                            <span className="font-semibold text-gray-900">
                                #{order.orderNumber}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Amount Paid</span>
                            <span className="font-semibold text-green-600">
                                ₹{(order.totalPrice || order.priceSnapshot?.finalTotal || 0).toFixed(2)}
                            </span>
                        </div>
                        {paymentId && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Payment ID</span>
                                <span className="font-mono text-xs text-gray-700">
                                    {paymentId}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => navigate(`/order/${orderId}`)}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Package className="w-5 h-5" />
                        View Order Details
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Continue Shopping
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
