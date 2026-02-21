import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Loader, CheckCircle2, AlertCircle, ChevronRight, Scale } from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';

interface ShippingEstimateProps {
    productId: string | undefined;
    quantity: number;
    initialPincode?: string;
    onEstimateChange?: (estimate: {
        is_serviceable: boolean;
        courier_name: string;
        shipping_cost: number;
        eta_range_start: string;
        eta_range_end: string;
        total_days: number;
    } | null) => void;
    onPincodeChange?: (pincode: string) => void;
}

const ShippingEstimate: React.FC<ShippingEstimateProps> = ({
    productId,
    quantity,
    initialPincode = '',
    onEstimateChange,
    onPincodeChange
}) => {
    const [pincode, setPincode] = useState(initialPincode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [estimate, setEstimate] = useState<any>(null);
    const [showInput, setShowInput] = useState(!initialPincode);

    useEffect(() => {
        if (initialPincode && initialPincode.length === 6) {
            setPincode(initialPincode);
            handleCheckPincode(initialPincode);
            setShowInput(false);
        } else {
            setShowInput(true);
        }
    }, [initialPincode, productId, quantity]); // Re-fetch if product or quantity changes

    const handleCheckPincode = async (codeToUse: string = pincode) => {
        if (!codeToUse || codeToUse.length !== 6) {
            setError("Please enter a valid 6-digit pincode");
            setEstimate(null);
            if (onEstimateChange) onEstimateChange(null);
            return;
        }

        if (!productId) {
            setError("Product context missing");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/shipping/estimate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    productId,
                    pincode: codeToUse,
                    quantity: quantity || 100,
                    strategy: 'balanced' // Use smart routing
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Shipping not available for this pincode');
            }

            setEstimate(data.data);
            if (onEstimateChange) onEstimateChange(data.data);
            setShowInput(false); // Hide input on success
        } catch (err: any) {
            setError(err.message || "Failed to fetch shipping estimate");
            setEstimate(null);
            if (onEstimateChange) onEstimateChange(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDateSingle = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-GB', { month: 'short' });
        const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
        return `${day} ${month}, ${weekday}`;
    };

    return (
        <div className="bg-white border md:border-2 border-gray-100 rounded-2xl md:rounded-3xl shadow-sm mt-6 hover:shadow-md transition-shadow overflow-hidden">
            {/* Location Header - Teggles Input */}
            <div
                className={`p-3 md:p-4 flex items-center justify-between cursor-pointer transition-colors ${showInput ? 'bg-blue-50/50' : 'bg-gray-50/50 hover:bg-gray-100'}`}
                onClick={() => setShowInput(!showInput)}
            >
                <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-sm">
                        {estimate && !showInput ? (
                            <>Delivery to <strong className="text-gray-900">{pincode}</strong></>
                        ) : (
                            "Location not set"
                        )}
                    </span>
                </div>
                <span className="text-blue-600 font-bold text-xs sm:text-sm flex items-center">
                    {estimate && !showInput ? 'Change' : 'Select delivery location'}
                    <ChevronRight className="w-4 h-4 ml-0.5" />
                </span>
            </div>

            {/* Input Form */}
            {showInput && (
                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={pincode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setPincode(val);
                                    if (onPincodeChange && val.length === 6) {
                                        onPincodeChange(val);
                                    }
                                }}
                                placeholder="Enter Pincode"
                                className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium outline-none"
                                maxLength={6}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && pincode.length === 6) {
                                        handleCheckPincode();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={() => handleCheckPincode()}
                            disabled={loading || pincode.length !== 6}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                                'Check'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && showInput && (
                <div className="px-4 pb-4 bg-white">
                    <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Delivery Result */}
            {estimate && !error && !showInput && (
                <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                    <div className="flex items-start gap-3">
                        <Truck className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-gray-900 text-[15px]">
                                Delivery by {formatDateSingle(estimate.eta_range_end)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Faster Delivery via {estimate.courier_name}
                            </p>
                        </div>
                        {estimate.shipping_cost !== undefined && (
                            <span className={`text-sm font-bold ${estimate.shipping_cost === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {estimate.shipping_cost === 0 ? 'FREE' : `₹${estimate.shipping_cost}`}
                            </span>
                        )}
                    </div>

                    {/* Warehouse / Origin info */}
                    {estimate.warehouse_name && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-xs text-gray-600">
                                Ships from <strong className="text-gray-800">{estimate.warehouse_name}</strong>
                                {estimate.pickup_pincode && (
                                    <span className="text-gray-400 ml-1">({estimate.pickup_pincode})</span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShippingEstimate;
