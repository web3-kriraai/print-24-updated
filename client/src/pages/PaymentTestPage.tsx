/**
 * Payment Test Page
 * Allows admin to test actual payment checkout flow
 */

import React, { useState } from 'react';

const PaymentTestPage = () => {
    const [selectedGateway, setSelectedGateway] = useState('');
    const [amount, setAmount] = useState(500); // ₹500
    const [loading, setLoading] = useState(false);
    const [gateways, setGateways] = useState([]);

    // Fetch available gateways
    React.useEffect(() => {
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
            setGateways(gatewayList.filter(g => g.is_active));
        } catch (error) {
            console.error('Failed to fetch gateways:', error);
            setGateways([]);
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

    const initializeTestPayment = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Directly initialize payment without creating order
            // The payment API will create a test transaction internally
            const paymentResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/test-initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: 'INR',
                    preferredGateway: selectedGateway || undefined,
                    testMode: true
                })
            });

            if (!paymentResponse.ok) {
                throw new Error(`Payment initialization failed: ${paymentResponse.statusText}`);
            }

            const paymentData = await paymentResponse.json();
            console.log('Payment initialized:', paymentData);

            if (!paymentData.success) {
                throw new Error(paymentData.error || 'Payment initialization failed');
            }

            // Show payment UI based on response
            if (paymentData.redirect_required) {
                // PayU or other redirect-based gateways
                showPayUCheckout(paymentData);
            } else if (paymentData.checkout_data && paymentData.checkout_data.key) {
                // Razorpay - has 'key' in checkout_data
                await showRazorpayCheckout(paymentData);
            } else {
                throw new Error('Unknown payment gateway response format');
            }

        } catch (error) {
            console.error('Payment initialization failed:', error);
            alert('Failed to initialize payment: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const showRazorpayCheckout = async (paymentData) => {
        // Load Razorpay SDK
        const loaded = await loadRazorpayScript();
        if (!loaded) {
            alert('Failed to load Razorpay SDK');
            return;
        }

        const options = {
            key: paymentData.checkout_data.key,
            amount: paymentData.checkout_data.amount,
            currency: 'INR',
            name: 'Test Payment',
            description: 'Testing Razorpay Integration',
            order_id: paymentData.checkout_data.order_id,
            handler: async function (response) {
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
                        alert('✅ Payment Successful!\nPayment ID: ' + response.razorpay_payment_id);
                    } else {
                        alert('❌ Payment verification failed');
                    }
                } catch (error) {
                    console.error('Verification failed:', error);
                }
            },
            prefill: {
                name: 'Test User',
                email: 'test@example.com',
                contact: '9999999999'
            },
            theme: {
                color: '#3399cc'
            },
            modal: {
                ondismiss: function () {
                    console.log('Razorpay checkout closed');
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    };

    const showPayUCheckout = (paymentData) => {
        // PayU uses form POST redirect
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentData.checkout_url;

        // Add all checkout data as hidden inputs
        Object.keys(paymentData.checkout_data).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = paymentData.checkout_data[key];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        console.log('Submitting PayU form to:', paymentData.checkout_url);
        form.submit();
    };

    const showStripeCheckout = (paymentData) => {
        // For Stripe, you'd typically redirect to checkout URL
        if (paymentData.checkout_url) {
            window.location.href = paymentData.checkout_url;
        } else {
            alert('Stripe checkout URL not provided');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold text-center text-gray-900 mb-2">
                    💳 Payment Gateway - Live Testing
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Test the actual payment checkout experience
                </p>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Select Payment Gateway (Optional)
                        </label>
                        <select
                            value={selectedGateway}
                            onChange={(e) => setSelectedGateway(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        >
                            <option value="">Auto-select (based on priority)</option>
                            {gateways.map(gateway => (
                                <option key={gateway._id} value={gateway.name}>
                                    {gateway.display_name} ({gateway.mode})
                                </option>
                            ))}
                        </select>
                        <small className="block mt-2 text-sm text-gray-500">
                            {gateways.length === 0
                                ? 'No gateways configured. Please add gateways first.'
                                : 'Leave empty to let the system choose based on priority & traffic split'
                            }
                        </small>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Test Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                                ₹
                            </span>
                            <input
                                type="number"
                                value={amount / 100}
                                onChange={(e) => setAmount(parseFloat(e.target.value) * 100)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                min="1"
                            />
                        </div>
                        <small className="block mt-2 text-sm text-gray-500">
                            Enter amount in rupees (minimum ₹1)
                        </small>
                    </div>

                    <button
                        onClick={initializeTestPayment}
                        disabled={loading || amount < 100}
                        className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${loading || amount < 100
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                            }`}
                    >
                        {loading ? '🔄 Initializing...' : '🚀 Start Test Payment'}
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            ℹ️ What Will Happen:
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="flex items-start">
                                <span className="font-semibold mr-2">Razorpay:</span>
                                <span>Opens beautiful payment popup with UPI, Cards, Net Banking options</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-semibold mr-2">PayU:</span>
                                <span>Redirects to PayU's payment page in new tab/window</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-semibold mr-2">Stripe:</span>
                                <span>Redirects to Stripe Checkout page</span>
                            </li>
                            <li className="flex items-start">
                                <span className="font-semibold mr-2">PhonePe:</span>
                                <span>Shows QR code or redirects to PhonePe app</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-200">
                        <h4 className="text-lg font-bold text-gray-900 mb-3">
                            🧪 Razorpay Test Cards:
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="bg-white/70 rounded-lg p-3">
                                <strong className="text-green-700">Success:</strong>
                                <p className="text-gray-700 font-mono mt-1">4111 1111 1111 1111</p>
                                <p className="text-gray-500 text-xs">CVV: Any | Expiry: Any future date</p>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3">
                                <strong className="text-red-700">Failure:</strong>
                                <p className="text-gray-700 font-mono mt-1">4000 0000 0000 0002</p>
                                <p className="text-gray-500 text-xs">CVV: Any | Expiry: Any future date</p>
                            </div>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 mt-4 mb-3">
                            💳 Test UPI:
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="bg-white/70 rounded-lg p-3">
                                <strong className="text-green-700">Success:</strong>
                                <span className="ml-2 font-mono text-gray-700">success@razorpay</span>
                            </div>
                            <div className="bg-white/70 rounded-lg p-3">
                                <strong className="text-red-700">Failure:</strong>
                                <span className="ml-2 font-mono text-gray-700">failure@razorpay</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        📊 Currently Active Gateways:
                    </h3>
                    {gateways.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            No active gateways configured
                        </p>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            {gateways.map((gateway) => (
                                <div
                                    key={gateway._id}
                                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-semibold text-gray-900">
                                            {gateway.display_name}
                                        </span>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                            Priority: {gateway.priority}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">
                                            {gateway.traffic_split_percent}% traffic
                                        </span>
                                        <span className={`font-semibold ${gateway.is_healthy ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {gateway.is_healthy ? '✅ Healthy' : '⚠️ Unhealthy'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentTestPage;
