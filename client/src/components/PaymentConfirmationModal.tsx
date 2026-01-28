import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, MapPin, Loader, Truck, AlertCircle, Package, Mail, Phone, User, MapPinned, Calendar, Shield } from 'lucide-react';
import { formatPrice } from '../utils/currencyUtils';
import PaymentGatewaySelector from './PaymentGatewaySelector';
import ProductPriceBox from '../../components/ProductPriceBox';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentData: any) => Promise<void>;
    productId: string;
    productName: string;
    quantity: number;
    selectedDynamicAttributes: Array<{
        attributeType: string;
        value: any;
        name?: string;
        label?: any;
    }>;
    customerName: string;
    setCustomerName: (value: string) => void;
    customerEmail: string;
    setCustomerEmail: (value: string) => void;
    pincode: string;
    setPincode: (value: string) => void;
    address: string;
    setAddress: (value: string) => void;
    mobileNumber: string;
    setMobileNumber: (value: string) => void;
    estimatedDeliveryDate?: string;
    deliveryLocationSource?: string;
    onGetLocation: () => void;
    isGettingLocation: boolean;
    gstPercentage?: number;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    productId,
    productName,
    quantity,
    selectedDynamicAttributes,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    pincode,
    setPincode,
    address,
    setAddress,
    mobileNumber,
    setMobileNumber,
    estimatedDeliveryDate,
    deliveryLocationSource,
    onGetLocation,
    isGettingLocation,
    gstPercentage = 18
}) => {
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const validateFields = (): boolean => {
        if (!customerName || customerName.trim().length === 0) {
            setPaymentError("Please enter your full name.");
            return false;
        }
        if (!customerEmail || customerEmail.trim().length === 0) {
            setPaymentError("Please enter your email address.");
            return false;
        }
        if (!pincode || pincode.length !== 6) {
            setPaymentError("Please enter a valid 6-digit pincode.");
            return false;
        }
        if (!address || address.trim().length === 0) {
            setPaymentError("Please enter your complete delivery address.");
            return false;
        }
        if (!mobileNumber || mobileNumber.length !== 10) {
            setPaymentError("Please enter a valid 10-digit mobile number.");
            return false;
        }
        return true;
    };

    const handlePayment = async (paymentData: any) => {
        if (!validateFields()) {
            return;
        }

        setIsProcessing(true);
        setPaymentError(null);

        try {
            await onConfirm({
                ...paymentData,
                customerName,
                customerEmail,
                pincode,
                address,
                mobileNumber
            });
        } catch (error) {
            setPaymentError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
                onClick={() => !isProcessing && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
                    data-payment-modal
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 border-b border-blue-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl">
                                    <CreditCard className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Complete Your Order</h3>
                                    <p className="text-blue-100 text-sm mt-0.5">Secure checkout powered by SSL encryption</p>
                                </div>
                            </div>
                            {!isProcessing && (
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                                >
                                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid lg:grid-cols-5 gap-6 p-6">
                            {/* Left Column - Form */}
                            <div className="lg:col-span-3 space-y-5">
                                {/* Error Alert */}
                                {paymentError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-red-900 text-sm">Payment Error</p>
                                            <p className="text-red-700 text-sm mt-1">{paymentError}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Delivery Information Section */}
                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Truck className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Delivery Information</h4>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-500" />
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={customerName}
                                                onChange={(e) => {
                                                    setCustomerName(e.target.value);
                                                    if (paymentError) setPaymentError(null);
                                                }}
                                                placeholder="Enter your full name"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Email and Phone */}
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-gray-500" />
                                                    Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={customerEmail}
                                                    onChange={(e) => {
                                                        setCustomerEmail(e.target.value);
                                                        if (paymentError) setPaymentError(null);
                                                    }}
                                                    placeholder="your@email.com"
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                    Mobile <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={mobileNumber}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setMobileNumber(value);
                                                        if (paymentError) setPaymentError(null);
                                                    }}
                                                    placeholder="10-digit number"
                                                    maxLength={10}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Pincode */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <MapPinned className="w-4 h-4 text-gray-500" />
                                                Pincode <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={pincode}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setPincode(value);
                                                    if (paymentError) setPaymentError(null);
                                                }}
                                                placeholder="6-digit pincode"
                                                maxLength={6}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                Complete Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <textarea
                                                    value={address}
                                                    onChange={(e) => {
                                                        setAddress(e.target.value);
                                                        if (paymentError) setPaymentError(null);
                                                    }}
                                                    placeholder="House no., Building, Street, Area, Landmark..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-gray-900 placeholder:text-gray-400 resize-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={onGetLocation}
                                                    disabled={isGettingLocation}
                                                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                                    title="Auto-detect location"
                                                >
                                                    {isGettingLocation ? (
                                                        <Loader className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MapPin className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                Your address is encrypted and secure
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Section */}
                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-green-50 rounded-lg">
                                            <CreditCard className="w-5 h-5 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Payment Method</h4>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            if (!validateFields()) return;
                                            await handlePayment({});
                                        }}
                                        disabled={isProcessing}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader className="w-5 h-5 animate-spin" />
                                                Processing Order...
                                            </>
                                        ) : (
                                            <>
                                                <Package className="w-5 h-5" />
                                                Confirm Order
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Secure payment gateway will open after confirmation
                                    </p>
                                </div>
                            </div>

                            {/* Right Column - Summary */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* Order Summary */}
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 shadow-sm sticky top-0">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Package className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900">Order Summary</h4>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Product</p>
                                            <p className="font-bold text-gray-900">{productName}</p>
                                        </div>

                                        <div className="bg-white rounded-lg p-4 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-600 mb-1">Quantity</p>
                                            <p className="font-bold text-gray-900">{quantity.toLocaleString()} units</p>
                                        </div>

                                        {selectedDynamicAttributes.length > 0 && (
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <p className="text-sm font-semibold text-gray-600 mb-2">Customizations</p>
                                                <div className="space-y-1.5">
                                                    {selectedDynamicAttributes.map((attr, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 text-sm">
                                                            <span className="text-blue-600">•</span>
                                                            <div>
                                                                <span className="text-gray-600">{attr.name}:</span>
                                                                <span className="font-semibold text-gray-900 ml-1">{attr.label || attr.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Pricing */}
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                                            <ProductPriceBox
                                                productId={productId}
                                                quantity={quantity}
                                                selectedDynamicAttributes={selectedDynamicAttributes}
                                                showBreakdown={true}
                                            />
                                        </div>

                                        {/* Estimated Delivery */}
                                        {estimatedDeliveryDate && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-green-900 text-sm">Estimated Delivery</p>
                                                        <p className="text-green-700 font-semibold mt-1">{estimatedDeliveryDate}</p>
                                                        {deliveryLocationSource && (
                                                            <p className="text-xs text-green-600 mt-1">{deliveryLocationSource}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Security Badge */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-8 h-8 text-blue-600" />
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Secure Payment</p>
                                            <p className="text-xs text-gray-600 mt-0.5">256-bit SSL encryption • PCI DSS compliant</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PaymentConfirmationModal;
