import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Loader, Truck, AlertCircle, Package,
  Mail, Phone, User, MapPinned, Calendar, Shield,
  CheckCircle2, ChevronRight, Lock, CreditCard,
  Clock, Award, ArrowRight, Layers
} from 'lucide-react';
import FinalPriceDisplay from './FinalPriceDisplay';
import { formatPrice } from '../utils/currencyUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types (unchanged)
interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: any) => Promise<{ orderId: string; totalAmount: number; orderNumber?: string } | void>;
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
  numberOfDesigns?: number;
  preCalculatedPricing?: {
    subtotal: number;
    gstAmount: number;
    shippingCost?: number;
    total: number;
    unitPrice?: number;
  };
  onPaymentSuccess?: (result: any) => void;
  onPaymentFailure?: (error: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced InputField with floating label effect (optional)
const InputField: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}> = ({ label, icon, children, required }) => (
  <div className="group relative">
    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
      <span className="text-gray-400 group-focus-within:text-blue-500 transition-colors">
        {icon}
      </span>
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// Base input classes – now with more refined states
const inputClass = `
  w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl
  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
  outline-none transition-all duration-200
  text-sm font-medium text-gray-900 placeholder:text-gray-400
  hover:border-gray-300 shadow-sm
`;

// ─────────────────────────────────────────────────────────────────────────────
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
  gstPercentage = 18,
  numberOfDesigns = 1,
  preCalculatedPricing,
  onPaymentSuccess,
  onPaymentFailure
}) => {
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const clearError = () => setPaymentError(null);

  const validateFields = (): boolean => {
    if (!customerName?.trim()) { setPaymentError("Please enter your full name."); return false; }
    if (!customerEmail?.trim()) { setPaymentError("Please enter your email address."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) { setPaymentError("Invalid email format."); return false; }
    if (!pincode || pincode.length !== 6) { setPaymentError("Enter a valid 6‑digit pincode."); return false; }
    if (!address?.trim()) { setPaymentError("Please enter your delivery address."); return false; }
    if (!mobileNumber || mobileNumber.length !== 10) { setPaymentError("Enter a valid 10‑digit mobile number."); return false; }
    return true;
  };

  // ─── Payment helpers (unchanged) ─────────────────────────────────────────
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const showRazorpayCheckout = async (paymentData: any, createdOrderId: string) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error('Failed to load Razorpay. Please refresh.');

    return new Promise<void>((resolve, reject) => {
      const options = {
        key: paymentData.checkout_data.key,
        amount: paymentData.checkout_data.amount,
        currency: paymentData.checkout_data.currency || 'INR',
        name: paymentData.checkout_data.name || 'Print24',
        description: paymentData.checkout_data.description,
        order_id: paymentData.checkout_data.order_id,
        handler: async (response: any) => {
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
            if (result.success) await onPaymentSuccess?.({ ...result, orderId: result?.orderId || createdOrderId });
            else onPaymentFailure?.(new Error('Payment verification failed'));
          } catch (error) {
            onPaymentFailure?.(error);
          }
          resolve();
        },
        prefill: paymentData.checkout_data.prefill || {},
        theme: paymentData.checkout_data.theme || { color: '#3B82F6' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setProcessingStatus('');
            onPaymentFailure?.(new Error('Payment cancelled'));
            resolve();
          }
        }
      };
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    });
  };

  const showPayUCheckout = (paymentData: any) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.checkout_url;
    Object.keys(paymentData.checkout_data).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = paymentData.checkout_data[key];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const handleCreateOrderAndPay = async () => {
    if (!validateFields()) return;
    setIsProcessing(true);
    setPaymentError(null);
    setProcessingStatus('Creating your order...');

    try {
      const result = await onConfirm({ customerName, customerEmail, pincode, address, mobileNumber });
      if (!result || !result.orderId) throw new Error('Order creation failed.');
      const createdOrderId = result.orderId;
      const totalAmount = result.totalAmount || 0;

      setProcessingStatus('Preparing payment...');
      const token = localStorage.getItem('token');
      const gatewayResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/active-gateway`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const gatewayData = await gatewayResponse.json();
      const gatewayList: any[] = Array.isArray(gatewayData) ? gatewayData : (gatewayData.gateways || []);
      const activeGateways = gatewayList
        .filter((g: any) => g.is_active && g.is_healthy !== false)
        .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

      if (activeGateways.length === 0) throw new Error('No payment gateways available.');
      const topGateway = activeGateways[0];

      setProcessingStatus('Initializing payment...');
      const paymentResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/payment/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: createdOrderId,
          amount: totalAmount,
          currency: 'INR',
          preferredGateway: topGateway.name
        })
      });

      if (!paymentResponse.ok) throw new Error('Payment initialization failed');
      const paymentData = await paymentResponse.json();
      if (!paymentData.success) throw new Error(paymentData.error || 'Payment initialization failed');

      if (paymentData.redirect_required) {
        showPayUCheckout(paymentData);
      } else if (paymentData.checkout_data?.key) {
        await showRazorpayCheckout(paymentData, createdOrderId);
      } else {
        throw new Error('Unknown payment gateway response');
      }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Something went wrong.');
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setPaymentError(null);
    setProcessingStatus('');
    onClose();
  };

  if (!isOpen) return null;

  // Helper to format attribute labels
  const formatAttributeValue = (attr: any) => {
    if (typeof attr.label === 'string') return attr.label;
    if (typeof attr.value === 'string' || typeof attr.value === 'number') return String(attr.value);
    return '';
  };

  // Price breakdown from props if available
  const subtotal = preCalculatedPricing?.subtotal ?? 0;
  const gst = preCalculatedPricing?.gstAmount ?? 0;
  const total = preCalculatedPricing?.total ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={() => !isProcessing && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        >
          {/* ─── Header with subtle gradient & step indicator ─── */}
          <div className="relative px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Complete your order</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                      <span className="text-sm font-medium text-gray-700">Delivery</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-300" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold">2</span>
                      <span className="text-sm font-medium text-gray-400">Payment</span>
                    </div>
                  </div>
                </div>
              </div>
              {!isProcessing && (
                <button
                  onClick={handleClose}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* ─── Main content: two columns ─── */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
              {/* Left column – Delivery form */}
              <div className="lg:col-span-7 p-6 lg:p-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <User size={14} /> Delivery information
                </h3>

                <div className="space-y-5">
                  {/* Two‑column grid inside form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <InputField label="Full name" icon={<User size={14} />} required>
                      <input
                        className={inputClass}
                        placeholder="John Doe"
                        value={customerName}
                        onChange={e => { setCustomerName(e.target.value); clearError(); }}
                      />
                    </InputField>

                    <InputField label="Email address" icon={<Mail size={14} />} required>
                      <input
                        className={inputClass}
                        type="email"
                        placeholder="john@example.com"
                        value={customerEmail}
                        onChange={e => { setCustomerEmail(e.target.value); clearError(); }}
                      />
                    </InputField>

                    <InputField label="Mobile number" icon={<Phone size={14} />} required>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-600 font-medium">
                          +91
                        </span>
                        <input
                          className={`${inputClass} rounded-l-none`}
                          maxLength={10}
                          placeholder="98765 43210"
                          value={mobileNumber}
                          onChange={e => { setMobileNumber(e.target.value.replace(/\D/g, '')); clearError(); }}
                        />
                      </div>
                    </InputField>

                    <InputField label="Pincode" icon={<MapPin size={14} />} required>
                      <div className="flex gap-2">
                        <input
                          className={`${inputClass} flex-1 ${isProcessing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                          maxLength={6}
                          placeholder="400001"
                          value={pincode}
                          onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); clearError(); }}
                          disabled={isProcessing}
                        />
                        <button
                          type="button"
                          onClick={onGetLocation}
                          disabled={isProcessing || isGettingLocation}
                          className={`px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200
                            ${isProcessing || isGettingLocation
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-70'
                              : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95 shadow-sm'
                            }`}
                        >
                          {isGettingLocation ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <MapPinned size={16} className={isProcessing ? "text-gray-400" : "text-blue-600"} />
                          )}
                          <span className="hidden sm:inline">Locate</span>
                        </button>
                      </div>
                    </InputField>
                  </div>

                  <InputField label="Delivery address" icon={<Truck size={14} />} required>
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={3}
                      placeholder="House / Building / Street / Landmark"
                      value={address}
                      onChange={e => { setAddress(e.target.value); clearError(); }}
                    />
                  </InputField>

                  {/* Estimated delivery chip */}
                  {estimatedDeliveryDate && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Calendar size={16} className="text-green-700" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Estimated delivery</p>
                        <p className="text-sm font-bold text-green-800">
                          {new Date(estimatedDeliveryDate).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Right column – Order summary */}
              <div className="lg:col-span-5 p-6 lg:p-8 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Package size={14} /> Order summary
                </h3>

                {/* Product card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0 relative">
                      <Package size={24} className="text-blue-700" />
                      {numberOfDesigns > 1 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                          <Layers size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{productName}</h4>
                        {numberOfDesigns > 1 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">
                            Bulk
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">Quantity: {quantity.toLocaleString()}</p>
                      {numberOfDesigns > 1 && (
                        <p className="text-sm font-semibold text-blue-600 mt-1 flex items-center gap-1">
                          <Layers size={14} />
                          {numberOfDesigns} Designs Set
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selected attributes as chips */}
                  {selectedDynamicAttributes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Your selections</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDynamicAttributes.map((attr, idx) => {
                          const val = formatAttributeValue(attr);
                          if (!val) return null;
                          return (
                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-800">
                              <CheckCircle2 size={12} className="text-green-600" />
                              {attr.name || 'Spec'}: {val}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price breakdown */}
                {(preCalculatedPricing || total > 0) && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Price details</h4>
                    <div className="space-y-2.5">
                      {numberOfDesigns > 1 && (
                        <div className="flex justify-between text-sm py-2 px-3 bg-blue-50/50 rounded-lg border border-blue-100 border-dashed mb-2">
                          <div className="flex flex-col">
                            <span className="text-blue-700 font-semibold">Price per Design</span>
                            <span className="text-xs text-blue-500">(Incl. GST)</span>
                          </div>
                          <span className="font-bold text-blue-700">{formatPrice(total / numberOfDesigns)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST ({gstPercentage}%)</span>
                        <span className="font-medium text-gray-900">{formatPrice(gst)}</span>
                      </div>
                      {preCalculatedPricing?.shippingCost !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Shipping</span>
                          <span className="font-medium text-gray-900">
                            {preCalculatedPricing.shippingCost === 0 ? 'Free' : formatPrice(preCalculatedPricing.shippingCost)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-lg text-blue-700">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery promise & secure badge */}
                <div className="flex items-center gap-3 text-xs text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
                  <Clock size={16} className="text-gray-400" />
                  <span>Dispatch in 24‑48 hours</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <Shield size={16} className="text-gray-400" />
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Sticky footer with total & CTA ─── */}
          <div className="border-t border-gray-200 bg-white px-6 lg:px-8 py-4">
            <AnimatePresence>
              {paymentError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{paymentError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Price display (keeps FinalPriceDisplay) */}
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-500">Total amount</span>
                <FinalPriceDisplay
                  productId={productId}
                  quantity={quantity}
                  selectedDynamicAttributes={selectedDynamicAttributes}
                  numberOfDesigns={numberOfDesigns}
                  preCalculatedTotal={preCalculatedPricing?.total}
                />
              </div>

              {/* CTA button */}
              <button
                onClick={handleCreateOrderAndPay}
                disabled={isProcessing}
                className={`
                  group relative overflow-hidden rounded-xl font-bold text-base py-4 px-8
                  transition-all duration-300 flex items-center justify-center gap-3
                  ${isProcessing
                    ? 'bg-gray-400 text-white cursor-wait'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    <span>{processingStatus || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    <span>Confirm & Pay</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Trust badges row */}
            <div className="flex flex-wrap items-center justify-center gap-5 mt-4 pt-3 border-t border-gray-100">
              {[
                { icon: <Shield size={14} className="text-blue-500" />, label: 'SSL Secured' },
                { icon: <Award size={14} className="text-green-500" />, label: 'Quality Assured' },
                { icon: <Truck size={14} className="text-purple-500" />, label: 'Fast Delivery' },
                { icon: <Lock size={14} className="text-orange-500" />, label: 'Data Protected' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  {icon}
                  <span className="text-xs font-medium text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentConfirmationModal;