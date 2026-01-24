import React from 'react';
import { motion } from 'framer-motion';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { formatPrice } from '../src/utils/currencyUtils';

interface PriceBreakdown {
    basePrice: number;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    appliedModifiers: Array<{
        source: string;
        modifierId?: string;
        applied: number;
        reason?: string;
    }>;
    gstPercentage: number;
    gstAmount: number;
    totalPayable: number;
    currency: string;
}

interface LivePricePreviewProps {
    priceData: PriceBreakdown | null;
    isLoading: boolean;
    error: string | null;
}

/**
 * Live Price Preview Component
 * 
 * Displays real-time pricing breakdown from backend
 * Shows: subtotal, discounts, GST, total
 * Now supports dynamic currency display
 */
export const LivePricePreview: React.FC<LivePricePreviewProps> = ({
    priceData,
    isLoading,
    error
}) => {
    // Helper to format prices with zone's currency
    const formatCurrency = (amount: number) => {
        return formatPrice(amount, priceData?.currency || 'INR');
    };

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-900">Pricing Error</p>
                        <p className="text-xs text-red-700 mt-1">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-cream-50 border border-cream-200 rounded-lg p-6">
                <div className="flex items-center justify-center gap-3">
                    <Loader size={20} className="animate-spin text-cream-600" />
                    <p className="text-sm text-cream-600 font-medium">Calculating price...</p>
                </div>
            </div>
        );
    }

    if (!priceData) {
        return null;
    }

    const hasDiscounts = priceData.appliedModifiers && priceData.appliedModifiers.length > 0;
    const totalDiscount = hasDiscounts
        ? priceData.appliedModifiers.reduce((sum, mod) => sum + mod.applied, 0)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-cream-200 rounded-lg shadow-sm overflow-hidden"
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-cream-900 to-cream-800 px-4 py-3">
                <h3 className="text-white font-semibold text-lg">Price Breakdown</h3>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Base Calculation */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-cream-600">
                        Base Price × Quantity
                    </span>
                    <span className="font-medium text-cream-900">
                        {formatCurrency(priceData.basePrice)} × {priceData.quantity}
                    </span>
                </div>

                {/* Subtotal Before Discounts */}
                <div className="flex justify-between items-center text-sm pb-2 border-b border-cream-200">
                    <span className="text-cream-600">Subtotal</span>
                    <span className="font-semibold text-cream-900">
                        {formatCurrency(priceData.basePrice * priceData.quantity)}
                    </span>
                </div>

                {/* Applied Modifiers/Discounts */}
                {hasDiscounts && (
                    <div className="space-y-2 py-2 border-b border-cream-200">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} className="text-green-600" />
                            <span className="text-xs font-semibold text-green-700 uppercase">
                                Discounts Applied
                            </span>
                        </div>
                        {priceData.appliedModifiers.map((modifier, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex justify-between items-start text-sm pl-6"
                            >
                                <span className="text-green-700 text-xs flex-1">
                                    {modifier.reason || `${modifier.source} Discount`}
                                </span>
                                <span className="font-semibold text-green-700 ml-2">
                                    {formatCurrency(modifier.applied)}
                                </span>
                            </motion.div>
                        ))}
                        <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t border-green-200">
                            <span className="text-green-700">Total Savings</span>
                            <span className="text-green-700">{formatCurrency(totalDiscount)}</span>
                        </div>
                    </div>
                )}

                {/* Subtotal After Discounts */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-cream-600">
                        {hasDiscounts ? 'Subtotal After Discounts' : 'Subtotal'}
                    </span>
                    <span className="font-semibold text-cream-900">
                        {formatCurrency(priceData.subtotal)}
                    </span>
                </div>

                {/* GST */}
                <div className="flex justify-between items-center text-sm pb-3 border-b border-cream-200">
                    <span className="text-cream-600">GST ({priceData.gstPercentage}%)</span>
                    <span className="font-medium text-cream-900">
                        {formatCurrency(priceData.gstAmount)}
                    </span>
                </div>

                {/* Total Payable */}
                <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-cream-900">Total Payable</span>
                    <span className="text-2xl font-bold text-cream-900">
                        {formatCurrency(priceData.totalPayable)}
                    </span>
                </div>

                {/* Savings Badge */}
                {hasDiscounts && totalDiscount < 0 && (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
                    >
                        <p className="text-sm font-semibold text-green-800">
                            🎉 You saved {formatCurrency(Math.abs(totalDiscount))} on this order!
                        </p>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default LivePricePreview;
