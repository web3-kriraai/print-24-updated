import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Loader, Truck, ExternalLink, AlertCircle } from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';
import courierService from '../src/services/courierService';

/**
 * Payment Success Page
 * Displayed after successful payment verification
 * Automatically triggers shipment creation for external courier
 */
const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [shipmentStatus, setShipmentStatus] = useState<{
        loading: boolean;
        success: boolean;
        data?: any;
        error?: string;
    }>({ loading: false, success: false });

    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');

    useEffect(() => {
        const fetchOrderAndCreateShipment = async () => {
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
                    const orderData = data.order || data;
                    setOrder(orderData);

                    // Trigger shipment creation if order doesn't have AWB yet
                    if (!orderData.awbCode && !orderData.shiprocketOrderId) {
                        setShipmentStatus({ loading: true, success: false });
                        try {
                            const shipmentResult = await courierService.createShipment(orderId);
                            if (shipmentResult.success) {
                                setShipmentStatus({
                                    loading: false,
                                    success: true,
                                    data: shipmentResult
                                });
                                // Update order with shipment data
                                setOrder((prev: any) => ({
                                    ...prev,
                                    awbCode: shipmentResult.awbCode,
                                    courierPartner: shipmentResult.courierName,
                                    courierTrackingUrl: shipmentResult.trackingUrl,
                                    shiprocketOrderId: shipmentResult.shiprocketOrderId
                                }));
                            } else {
                                setShipmentStatus({
                                    loading: false,
                                    success: false,
                                    error: shipmentResult.error || 'Using internal delivery'
                                });
                            }
                        } catch (shipmentError) {
                            console.error('Shipment creation failed:', shipmentError);
                            setShipmentStatus({
                                loading: false,
                                success: false,
                                error: 'Will use internal delivery'
                            });
                        }
                    } else if (orderData.awbCode) {
                        // Already has shipment
                        setShipmentStatus({
                            loading: false,
                            success: true,
                            data: {
                                awbCode: orderData.awbCode,
                                courierName: orderData.courierPartner,
                                trackingUrl: orderData.courierTrackingUrl
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderAndCreateShipment();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">Processing your order...</p>
                </div>
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
                                ₹{(order.priceSnapshot?.totalPayable || order.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                {/* Shipment Status */}
                {shipmentStatus.loading && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <Loader className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-blue-700 text-sm">Creating shipment...</span>
                    </div>
                )}

                {shipmentStatus.success && shipmentStatus.data && (
                    <div className="bg-green-50 rounded-lg p-4 mb-6 text-left border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                            <Truck className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-800">Shipment Created!</span>
                        </div>
                        {shipmentStatus.data.awbCode && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">AWB Code</span>
                                <span className="font-mono font-semibold text-gray-900">
                                    {shipmentStatus.data.awbCode}
                                </span>
                            </div>
                        )}
                        {shipmentStatus.data.courierName && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Courier</span>
                                <span className="font-semibold text-gray-900">
                                    {shipmentStatus.data.courierName}
                                </span>
                            </div>
                        )}
                        {shipmentStatus.data.trackingUrl && (
                            <a
                                href={shipmentStatus.data.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 mt-3 text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Track Shipment
                            </a>
                        )}
                    </div>
                )}

                {!shipmentStatus.loading && !shipmentStatus.success && shipmentStatus.error && (
                    <div className="bg-yellow-50 rounded-lg p-4 mb-6 flex items-center gap-3 border border-yellow-200">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <span className="text-yellow-700 text-sm text-left">
                            {shipmentStatus.error.includes('internal')
                                ? 'Your order will be handled by our internal delivery team.'
                                : shipmentStatus.error}
                        </span>
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
