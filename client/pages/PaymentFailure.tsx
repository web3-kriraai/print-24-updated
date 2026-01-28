import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft, Phone } from 'lucide-react';

/**
 * Payment Failure Page
 * Displayed when payment fails or is cancelled
 */
const PaymentFailure: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderId = searchParams.get('orderId');
    const error = searchParams.get('error') || 'Payment could not be completed';

    const handleRetryPayment = () => {
        if (orderId) {
            navigate(`/order/${orderId}`);
        } else {
            navigate('/profile');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
                {/* Failure Icon */}
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-12 h-12 text-red-600" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Payment Failed
                </h1>
                <p className="text-gray-600 mb-6">
                    {error}
                </p>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm text-yellow-800">
                        <strong>Don't worry!</strong> Your order has been saved. You can retry the payment from your order details page or contact our support team for assistance.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleRetryPayment}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Retry Payment
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>
                    <a
                        href="tel:+919876543210"
                        className="w-full flex items-center justify-center gap-2 text-gray-600 py-2 hover:text-gray-800 transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PaymentFailure;
