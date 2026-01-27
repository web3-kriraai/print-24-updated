import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Package, Clock, CheckCircle2, AlertCircle, Loader2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import courierApi, { CourierServiceability } from '../../../lib/courierApi';

interface ShippingEstimateProps {
    deliveryPincode: string;
    pickupPincode?: string;
    weight?: number;
    paymentMode?: 'PREPAID' | 'COD';
    onCourierSelect?: (courier: CourierOption) => void;
    className?: string;
}

interface CourierOption {
    courierId: number;
    courierName: string;
    estimatedDays: number;
    rate: number;
    codCharges?: number;
    freightCharge?: number;
    etd?: string;
}

const ShippingEstimate: React.FC<ShippingEstimateProps> = ({
    deliveryPincode,
    pickupPincode = '395006', // Default Surat pincode
    weight = 0.5,
    paymentMode = 'PREPAID',
    onCourierSelect,
    className = ''
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [serviceability, setServiceability] = useState<CourierServiceability | null>(null);
    const [showAllCouriers, setShowAllCouriers] = useState(false);

    const checkServiceability = useCallback(async () => {
        if (!deliveryPincode || deliveryPincode.length !== 6) {
            setServiceability(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await courierApi.checkServiceability(
                pickupPincode,
                deliveryPincode,
                weight,
                paymentMode
            );

            setServiceability(result);

            if (!result.available) {
                setError(result.message || 'Delivery not available for this pincode');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to check serviceability');
            setServiceability(null);
        } finally {
            setLoading(false);
        }
    }, [deliveryPincode, pickupPincode, weight, paymentMode]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (deliveryPincode && deliveryPincode.length === 6) {
                checkServiceability();
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [deliveryPincode, checkServiceability]);

    const handleCourierSelect = (courier: CourierOption) => {
        if (onCourierSelect) {
            onCourierSelect(courier);
        }
    };

    const formatDeliveryTime = (days: number): string => {
        if (days === 1) return '1 day';
        return `${days} days`;
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (!deliveryPincode || deliveryPincode.length < 6) {
        return null;
    }

    return (
        <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                <Truck className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-900">Shipping Estimate</h3>
                <span className="ml-auto px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
                    {deliveryPincode}
                </span>
            </div>

            <div className="p-4">
                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                        <span className="ml-2 text-sm text-slate-500">Checking delivery options...</span>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Delivery Not Available</p>
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Success - Available Couriers */}
                {!loading && serviceability?.available && (
                    <div className="space-y-4">
                        {/* Recommended Courier */}
                        {serviceability.recommendedCourier && (
                            <div
                                className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 cursor-pointer hover:border-green-300 transition-colors"
                                onClick={() => handleCourierSelect(serviceability.recommendedCourier as CourierOption)}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Recommended</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-slate-900">{serviceability.recommendedCourier.courierName}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-sm text-slate-600">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDeliveryTime(serviceability.recommendedCourier.estimatedDays)}
                                            </span>
                                            <span className="flex items-center gap-1 text-sm text-slate-600">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {deliveryPincode}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-700">
                                            {formatCurrency(serviceability.recommendedCourier.rate)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Other Couriers */}
                        {serviceability.couriers && serviceability.couriers.length > 1 && (
                            <div>
                                <button
                                    onClick={() => setShowAllCouriers(!showAllCouriers)}
                                    className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    <span>{serviceability.couriers.length - 1} more delivery options</span>
                                    {showAllCouriers ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </button>

                                {showAllCouriers && (
                                    <div className="mt-2 space-y-2">
                                        {serviceability.couriers
                                            .filter((courier: CourierOption, index: number) => index > 0 || courier.courierId !== serviceability.recommendedCourier?.courierId)
                                            .slice(0, 5)
                                            .map((courier: CourierOption, index: number) => (
                                                <div
                                                    key={courier.courierId || index}
                                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-200 transition-colors"
                                                    onClick={() => handleCourierSelect(courier)}
                                                >
                                                    <div>
                                                        <p className="font-medium text-slate-900 text-sm">{courier.courierName}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {formatDeliveryTime(courier.estimatedDays)} delivery
                                                        </p>
                                                    </div>
                                                    <p className="font-bold text-slate-700">
                                                        {formatCurrency(courier.rate)}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Delivery Info */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <Package className="w-4 h-4 text-slate-400" />
                            <p className="text-xs text-slate-500">
                                Free shipping on orders above ₹999
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShippingEstimate;
