/**
 * Payment Gateway Selector Component
 * Displays active payment gateways and handles payment initialization
 */

import React, { useState, useEffect } from 'react';

interface PaymentGateway {
    _id: string;
    name: string;
    display_name: string;
    mode: string;
    is_active: boolean;
    is_healthy: boolean;
    priority: number;
    supported_methods?: string[];
}

interface PaymentGatewaySelectorProps {
    orderId?: string;
    amount?: number;
    productId?: string;
    quantity?: number;
    selectedDynamicAttributes?: Array<{
        attributeType: string;
        value: any;
        name?: string;
        label?: any;
    }>;
    currency?: string;
    onPaymentSuccess?: (response: any) => void;
    onPaymentFailure?: (error: any) => void;
    onPaymentError?: (error: string) => void;
    disabled?: boolean;
}

const PaymentGatewaySelector: React.FC<PaymentGatewaySelectorProps> = ({
    orderId,
    amount: propAmount,
    productId,
    quantity,
    selectedDynamicAttributes,
    currency = 'INR',
    onPaymentSuccess,
    onPaymentFailure,
    onPaymentError,
    disabled = false
}) => {
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [selectedGateway, setSelectedGateway] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [calculatedAmount, setCalculatedAmount] = useState<number>(propAmount || 0);

    // Fetch active payment gateways
    useEffect(() => {
        fetchGateways();
    }, []);

    const fetchGateways = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/payment-gateways`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            // Handle both array and object with gateways property
            const gatewayList = Array.isArray(data) ? data : (data.gateways || []);

            // Filter only active and healthy gateways
            const activeGateways = gatewayList.filter((g: PaymentGateway) =>
                g.is_active && g.is_healthy
            );

            setGateways(activeGateways);

            // Auto-select highest priority gateway
            if (activeGateways.length > 0) {
                const topPriority = activeGateways.sort((a, b) => a.priority - b.priority)[0];
                setSelectedGateway(topPriority.name);
            }
        } catch (error) {
            console.error('Failed to fetch gateways:', error);
            setError('Unable to load payment options. Please try again.');
        }
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        if (!selectedGateway) {
            setError('Please select a payment method');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            // Initialize payment
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId,
                    amount: calculatedAmount,
                    currency,
                    preferredGateway: selectedGateway
                })
            });

            if (!response.ok) {
                throw new Error('Payment initialization failed');
            }

            const paymentData = await response.json();

            // DEBUG: Log payment data to verify redirect_required field
            console.log('💳 Payment initialization response:', {
                success: paymentData.success,
                gateway: paymentData.gateway,
                redirect_required: paymentData.redirect_required,
                has_checkout_url: !!paymentData.checkout_url,
                has_checkout_data: !!paymentData.checkout_data
            });

            if (!paymentData.success) {
                throw new Error(paymentData.error || 'Payment initialization failed');
            }

            // Show payment UI based on response
            if (paymentData.redirect_required) {
                // PayU or other redirect-based gateways
                console.log('🔄 Redirecting to PayU checkout...');
                showPayUCheckout(paymentData);
            } else if (paymentData.checkout_data && paymentData.checkout_data.key) {
                // Razorpay - has 'key' in checkout_data
                console.log('💳 Opening Razorpay popup...');
                await showRazorpayCheckout(paymentData);
            } else {
                throw new Error('Unknown payment gateway response format');
            }

        } catch (error: any) {
            console.error('Payment initialization failed:', error);
            setError(error.message || 'Failed to initialize payment');
            onPaymentFailure?.(error);
        } finally {
            setLoading(false);
        }
    };

    const showRazorpayCheckout = async (paymentData: any) => {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
            setError('Failed to load Razorpay. Please refresh and try again.');
            return;
        }

        const options = {
            key: paymentData.checkout_data.key,
            amount: paymentData.checkout_data.amount,
            currency: paymentData.checkout_data.currency || 'INR',
            name: paymentData.checkout_data.name || 'Print24',
            description: paymentData.checkout_data.description,
            order_id: paymentData.checkout_data.order_id,
            handler: async function (response: any) {
                console.log('Razorpay Success:', response);

                // Verify payment
                try {
                    const token = localStorage.getItem('token');
                    const verifyResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/verify`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const result = await verifyResponse.json();
                    if (result.success) {
                        onPaymentSuccess?.(result);
                    } else {
                        onPaymentFailure?.(new Error('Payment verification failed'));
                    }
                } catch (error) {
                    console.error('Verification failed:', error);
                    onPaymentFailure?.(error);
                }
            },
            prefill: paymentData.checkout_data.prefill || {},
            theme: paymentData.checkout_data.theme || { color: '#3B82F6' },
            modal: {
                ondismiss: function () {
                    console.log('Payment cancelled by user');
                    onPaymentFailure?.(new Error('Payment cancelled'));
                }
            }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
    };

    const showPayUCheckout = (paymentData: any) => {
        console.log('🚀 PayU Checkout Data:', paymentData);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentData.checkout_url;

        console.log('📝 PayU Form URL:', paymentData.checkout_url);
        console.log('📝 PayU Form Data:', paymentData.checkout_data);

        Object.keys(paymentData.checkout_data).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = paymentData.checkout_data[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        console.log('✅ PayU form created and appended to body, submitting now...');
        form.submit();
    };

    const getGatewayIcon = (gatewayName: string) => {
        const icons: { [key: string]: string } = {
            'RAZORPAY': '💳',
            'PAYU': '💰',
            'STRIPE': '🔵',
            'PHONEPE': '📱'
        };
        return icons[gatewayName] || '💵';
    };

    if (gateways.length === 0) {
        return (
            <div className="w-full max-w-lg mx-auto my-5 p-6 bg-white rounded-xl shadow-lg">
                <div className="text-center py-8 px-4 text-gray-600">
                    <p className="text-lg">⚠️ Payment options are currently unavailable.</p>
                    <p className="text-sm mt-2 text-gray-400">Please contact support or try again later.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg mx-auto my-5 p-6 bg-white rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 mb-5 text-center">
                Select Payment Method
            </h3>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-center">
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className="flex flex-col gap-3 mb-6">
                {gateways.map((gateway) => (
                    <div
                        key={gateway._id}
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${selectedGateway === gateway.name
                            ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                            : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-100'
                            }`}
                        onClick={() => setSelectedGateway(gateway.name)}
                    >
                        <div className="text-3xl mr-4 min-w-[40px] text-center">
                            {getGatewayIcon(gateway.name)}
                        </div>
                        <div className="flex-1">
                            <div className="text-base font-semibold text-gray-900 mb-1">
                                {gateway.display_name}
                            </div>
                            <div className="text-xs text-gray-600 uppercase font-medium">
                                {gateway.mode}
                            </div>
                        </div>
                        <div className="ml-3">
                            <input
                                type="radio"
                                name="payment-gateway"
                                checked={selectedGateway === gateway.name}
                                onChange={() => setSelectedGateway(gateway.name)}
                                className="w-5 h-5 cursor-pointer accent-blue-500"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button
                className={`w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${loading || !selectedGateway
                    ? 'opacity-60 cursor-not-allowed bg-gray-400'
                    : 'hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300 active:translate-y-0'
                    }`}
                onClick={handlePayment}
                disabled={loading || !selectedGateway || disabled}
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        {calculatedAmount > 0 ? `Pay ₹${calculatedAmount.toLocaleString('en-IN')}` : 'Proceed to Pay'}
                    </>
                )}
            </button>

            <div className="text-center mt-4 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                    🔒 Secure payment powered by {gateways.find(g => g.name === selectedGateway)?.display_name}
                </span>
            </div>
        </div>
    );
};

export default PaymentGatewaySelector;
