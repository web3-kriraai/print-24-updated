import React, { useState, useEffect } from 'react';
import {
    FiCreditCard,
    FiPlayCircle,
    FiInfo,
    FiSettings,
    FiRefreshCw,
    FiExternalLink,
    FiCheckCircle,
    FiAlertCircle,
    FiDollarSign,
    FiShield,
    FiBarChart,
    FiArrowRight,
    FiChevronRight,
    FiActivity,
    FiKey
} from 'react-icons/fi';
import {
    FaRocket,
    FaFlask,
    FaStripe,
    FaPaypal,
    FaQrcode,
    FaUniversity,
    FaMobileAlt,
    FaWallet,
    FaPercentage
} from 'react-icons/fa';
import {
    SiRazorpay
} from 'react-icons/si';
import { MdOutlineHealthAndSafety, MdOutlineTipsAndUpdates } from 'react-icons/md';
import { TbArrowsSplit, TbDeviceAnalytics } from 'react-icons/tb';

const PaymentTestPage = () => {
    const [selectedGateway, setSelectedGateway] = useState('');
    const [amount, setAmount] = useState(5.00); // Store in rupees
    const [loading, setLoading] = useState(false);
    const [gateways, setGateways] = useState([]);
    const [showTestCards, setShowTestCards] = useState(true);
    const [showActiveGateways, setShowActiveGateways] = useState(true);

    // Fetch available gateways
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

    // Handle amount change with validation
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Allow empty input for user convenience
        if (value === '' || value === '.') {
            setAmount(1.00); // Set to minimum ₹1
            return;
        }

        const numValue = parseFloat(value);

        // Validate the number
        if (!isNaN(numValue) && numValue >= 0) {
            // Store directly in rupees (no conversion needed)
            setAmount(numValue);
        }
    };

    const initializeTestPayment = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            // Send amount directly in rupees - backend will handle paise conversion
            const paymentResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/test-initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amount, // Send rupees directly
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

    const getGatewayIcon = (gatewayName: string) => {
        switch (gatewayName) {
            case 'RAZORPAY':
                return <SiRazorpay className="w-5 h-5" style={{ color: '#0C4B78' }} />;
            case 'STRIPE':
                return <FaStripe className="w-5 h-5" style={{ color: '#635BFF' }} />;
            case 'PHONEPE':
                return <FaMobileAlt className="w-5 h-5" style={{ color: '#5F259F' }} />;
            case 'PAYU':
                return <FiCreditCard className="w-5 h-5" style={{ color: '#FF5C00' }} />;
            case 'CASHFREE':
                return <FaWallet className="w-5 h-5" style={{ color: '#00C48C' }} />;
            case 'PAYPAL':
                return <FaPaypal className="w-5 h-5" style={{ color: '#003087' }} />;
            default:
                return <FiCreditCard className="w-5 h-5" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                                <FiPlayCircle className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                    Payment Gateway Tester
                                </h1>
                                <p className="text-gray-600">
                                    Test real payment flows in sandbox environment
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.href = '/admin/payment-gateways'}
                            className="px-6 py-3 bg-white text-indigo-600 font-medium rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl border border-indigo-200 flex items-center justify-center space-x-2 self-start"
                        >
                            <FiSettings className="w-5 h-5" />
                            <span>Manage Gateways</span>
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Gateways</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">{gateways.length}</p>
                                </div>
                                <div className="p-3 bg-green-100 rounded-xl">
                                    <FiActivity className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Test Amount</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">₹{amount.toFixed(2)}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-xl">
                                    <FiDollarSign className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Ready to Test</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-2">{(gateways.length > 0 && amount >= 1) ? 'Yes' : 'No'}</p>
                                </div>
                                <div className="p-3 bg-purple-100 rounded-xl">
                                    <MdOutlineHealthAndSafety className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Test Configuration */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Test Configuration Card */}
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
                                <div className="flex items-center space-x-3">
                                    <FiPlayCircle className="w-6 h-6 text-white" />
                                    <h2 className="text-xl font-bold text-white">Test Configuration</h2>
                                </div>
                                <p className="text-indigo-100 mt-1">Configure your payment test parameters</p>
                            </div>

                            <div className="p-8">
                                {/* Gateway Selection */}
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                                        <FiKey className="w-4 h-4" />
                                        <span>Select Payment Gateway</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedGateway}
                                            onChange={(e) => setSelectedGateway(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none appearance-none"
                                        >
                                            <option value="">Auto-select (based on priority)</option>
                                            {gateways.map(gateway => (
                                                <option key={gateway._id} value={gateway.name}>
                                                    {gateway.display_name} ({gateway.mode})
                                                </option>
                                            ))}
                                        </select>
                                        <FiChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400" />
                                    </div>
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex items-start space-x-2">
                                            <FiInfo className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-blue-700">
                                                {gateways.length === 0
                                                    ? 'No gateways configured. Please add gateways first.'
                                                    : 'Leave empty to let the system choose based on priority & traffic split'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Selection */}
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                                        <FiDollarSign className="w-4 h-4" />
                                        <span>Test Amount</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                            <span className="text-gray-900 font-bold text-lg">₹</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={handleAmountChange}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                                            min="1"
                                            step="0.01"
                                        />
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                            <span className="text-gray-500">INR</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-600">
                                            Minimum amount: ₹1.00
                                        </p>
                                    </div>
                                </div>

                                {/* Start Test Button */}
                                <button
                                    onClick={initializeTestPayment}
                                    disabled={loading || amount < 1 || gateways.length === 0}
                                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-3 ${loading || amount < 1 || gateways.length === 0
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 shadow-lg'
                                        }`}
                                >
                                    {loading ? (
                                        <>
                                            <FiRefreshCw className="w-6 h-6 animate-spin" />
                                            <span>Initializing Payment...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaRocket className="w-6 h-6" />
                                            <span>Launch Test Payment</span>
                                        </>
                                    )}
                                </button>

                                {/* Security Note */}
                                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                    <div className="flex items-start space-x-3">
                                        <FiShield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Safe Testing Environment</p>
                                            <p className="text-sm text-green-700 mt-1">
                                                All transactions are processed in sandbox mode. No real money will be transferred.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gateway Behavior Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <TbDeviceAnalytics className="w-6 h-6 text-indigo-600" />
                                    <h3 className="text-lg font-bold text-gray-900">Gateway Behavior</h3>
                                </div>
                                <button
                                    onClick={() => setShowTestCards(!showTestCards)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showTestCards ? 'rotate-90' : ''}`} />
                                </button>
                            </div>

                            {showTestCards && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                                            <FiInfo className="w-4 h-4" />
                                            <span>What Will Happen</span>
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex items-start space-x-3">
                                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                                    <SiRazorpay className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Razorpay</p>
                                                    <p className="text-sm text-gray-600">Opens payment popup with multiple options</p>
                                                </div>
                                            </li>
                                            <li className="flex items-start space-x-3">
                                                <div className="p-1.5 bg-purple-100 rounded-lg">
                                                    <FiCreditCard className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">PayU</p>
                                                    <p className="text-sm text-gray-600">Redirects to PayU's payment page</p>
                                                </div>
                                            </li>
                                            <li className="flex items-start space-x-3">
                                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                                    <FaStripe className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Stripe</p>
                                                    <p className="text-sm text-gray-600">Redirects to Stripe Checkout</p>
                                                </div>
                                            </li>
                                            <li className="flex items-start space-x-3">
                                                <div className="p-1.5 bg-pink-100 rounded-lg">
                                                    <FaMobileAlt className="w-4 h-4 text-pink-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">PhonePe</p>
                                                    <p className="text-sm text-gray-600">Shows QR code or app redirect</p>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-800 flex items-center space-x-2 mb-4">
                                            <MdOutlineTipsAndUpdates className="w-4 h-4" />
                                            <span>Test Cards & UPI</span>
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                                                    <span className="font-semibold text-green-800">Success Card</span>
                                                </div>
                                                <p className="font-mono text-sm text-gray-800">4111 1111 1111 1111</p>
                                                <p className="text-xs text-gray-600 mt-1">CVV: Any | Expiry: Any future date</p>
                                            </div>
                                            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <FiAlertCircle className="w-5 h-5 text-red-600" />
                                                    <span className="font-semibold text-red-800">Failure Card</span>
                                                </div>
                                                <p className="font-mono text-sm text-gray-800">4000 0000 0000 0002</p>
                                                <p className="text-xs text-gray-600 mt-1">CVV: Any | Expiry: Any future date</p>
                                            </div>
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <FaUniversity className="w-5 h-5 text-blue-600" />
                                                    <span className="font-semibold text-blue-800">Test UPI</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="font-mono text-sm text-gray-800">success@razorpay</p>
                                                    <p className="font-mono text-sm text-gray-800">failure@razorpay</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Active Gateways */}
                    <div className="space-y-8">
                        {/* Active Gateways Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <FiActivity className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-lg font-bold text-gray-900">Active Gateways</h3>
                                    </div>
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                                        {gateways.length} Active
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                {gateways.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FiCreditCard className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-600">No active gateways</p>
                                        <p className="text-sm text-gray-500 mt-1">Configure gateways to start testing</p>
                                        <button
                                            onClick={() => window.location.href = '/admin/payment-gateways'}
                                            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            Configure Now
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {gateways.map((gateway) => (
                                            <div
                                                key={gateway._id}
                                                className="group border-2 border-gray-200 hover:border-indigo-300 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer"
                                                onClick={() => setSelectedGateway(gateway.name)}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                                            {getGatewayIcon(gateway.name)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{gateway.display_name}</h4>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gateway.mode === 'SANDBOX'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {gateway.mode === 'SANDBOX' ? (
                                                                        <span className="flex items-center space-x-1">
                                                                            <FaFlask className="w-3 h-3" />
                                                                            <span>Sandbox</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center space-x-1">
                                                                            <FaRocket className="w-3 h-3" />
                                                                            <span>Production</span>
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gateway.is_healthy
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {gateway.is_healthy ? 'Healthy' : 'Unhealthy'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {selectedGateway === gateway.name && (
                                                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex items-center space-x-1">
                                                            <TbArrowsSplit className="w-4 h-4 text-gray-400" />
                                                            <span className="text-gray-600">{gateway.traffic_split_percent}%</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <FaPercentage className="w-4 h-4 text-gray-400" />
                                                            <span className="text-gray-600">{gateway.tdr_rate}% TDR</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1 text-gray-600">
                                                        <FiBarChart className="w-4 h-4" />
                                                        <span>P{gateway.priority}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Tips Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                <MdOutlineTipsAndUpdates className="w-5 h-5 text-blue-600" />
                                <span>Quick Testing Tips</span>
                            </h4>
                            <ul className="space-y-3">
                                <li className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    <p className="text-sm text-gray-700">Test both successful and failed payments</p>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    <p className="text-sm text-gray-700">Try different payment methods (Card, UPI, Net Banking)</p>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    <p className="text-sm text-gray-700">Check mobile responsiveness of payment pages</p>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    <p className="text-sm text-gray-700">Verify webhook delivery for completed payments</p>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    <p className="text-sm text-gray-700">Monitor gateway health in real-time</p>
                                </li>
                            </ul>
                        </div>

                        {/* Ready Status Card */}
                        <div className={`rounded-2xl p-6 ${gateways.length > 0 && amount >= 100
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                            : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
                            }`}>
                            <div className="flex items-center space-x-3">
                                <div className={`p-3 rounded-xl ${gateways.length > 0 && amount >= 100
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-yellow-100 text-yellow-600'
                                    }`}>
                                    {gateways.length > 0 && amount >= 100 ? (
                                        <FiCheckCircle className="w-6 h-6" />
                                    ) : (
                                        <FiAlertCircle className="w-6 h-6" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Testing Status</h4>
                                    <p className="text-sm text-gray-700 mt-1">
                                        {gateways.length > 0 && amount >= 100
                                            ? 'Ready to launch payment test'
                                            : 'Configure gateways and set amount to start testing'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentTestPage;