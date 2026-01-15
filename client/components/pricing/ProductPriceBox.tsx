import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, Tag, Info } from 'lucide-react';

/**
 * =========================================================================
 * PRODUCT PRICE BOX (USER-FACING)
 * =========================================================================
 * 
 * Purpose: Display real-time pricing on product pages
 * 
 * Features:
 * - Real-time price updates based on user location (pincode)
 * - Displays prices in the GeoZone's currency (admin-defined)
 * - Dynamic currency symbols (₹, $, €, £, etc.)
 * - Shows base price (strikethrough if compareAt exists)
 * - GST breakdown
 * - Applied discounts indicator
 * - Optional breakdown drawer trigger
 * 
 * Currency Logic:
 * - Admin sets currency when creating GeoZone (e.g., USD, EUR, INR)
 * - Prices are stored in that currency
 * - User in that zone sees prices in the zone's currency
 * - No conversion needed - direct display
 */

interface ProductPriceBoxProps {
    productId: string;
    pincode?: string;
    quantity?: number;
    selectedAttributes?: Array<{
        attributeType: string;
        value: any;
        pricingKey?: string;
    }>;
    onChange?: (pricing: any) => void;
    className?: string;
}

export const ProductPriceBox: React.FC<ProductPriceBoxProps> = ({
    productId,
    pincode = '',
    quantity = 1,
    selectedAttributes = [],
    onChange,
    className = '',
}) => {
    const [pricing, setPricing] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);

    useEffect(() => {
        if (productId && pincode) {
            fetchPrice();
        }
    }, [productId, pincode, quantity, JSON.stringify(selectedAttributes)]);

    const fetchPrice = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/pricing/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    productId,
                    pincode,
                    quantity,
                    selectedDynamicAttributes: selectedAttributes.map((attr) => ({
                        attributeType: attr.attributeType,
                        value: attr.value,
                        attributeName: '',
                        pricingKey: attr.pricingKey,
                    })),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setPricing(data.pricing);
                onChange?.(data.pricing);
            } else {
                setError(data.message || 'Unable to calculate price');
            }
        } catch (err) {
            console.error('Failed to fetch price:', err);
            setError('Unable to load pricing. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
                <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Pricing Error</p>
                        <p className="text-xs text-red-600 mt-1">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!pricing) {
        return (
            <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
                <p className="text-gray-500 text-sm">Enter delivery details to see price</p>
            </div>
        );
    }

    // Helper function to get currency symbol from code
    const getCurrencySymbol = (currencyCode: string) => {
        const symbols: { [key: string]: string } = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'INR': '₹',
            'JPY': '¥',
            'CNY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'AED': 'د.إ',
            'SAR': '﷼',
            'SGD': 'S$',
            'MYR': 'RM',
            'THB': '฿',
            'CHF': 'CHF',
            'NZD': 'NZ$',
            'ZAR': 'R',
            'MXN': '$',
            'BRL': 'R$',
        };
        return symbols[currencyCode] || currencyCode;
    };

    // Helper function to format price with currency symbol
    const formatPrice = (amount: number) => {
        const symbol = getCurrencySymbol(pricing.currency);
        return `${symbol}${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    const hasDiscount = pricing.compareAtPrice && pricing.compareAtPrice > pricing.basePrice;
    const discountPercentage = hasDiscount
        ? Math.round(((pricing.compareAtPrice - pricing.basePrice) / pricing.compareAtPrice) * 100)
        : 0;

    const hasModifiers = pricing.meta?.modifiersApplied > 0;

    return (
        <div className={`bg-white rounded-lg border-2 border-gray-200 p-6 ${className}`}>
            {/* Currency Info Badge */}
            {pricing.currency && pricing.currency !== 'INR' && (
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs">
                    <Info className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-700 font-medium">
                        Prices in {pricing.currency} for this region
                    </span>
                </div>
            )}

            {/* Price Display */}
            <div className="mb-4">
                <div className="flex items-baseline gap-3 mb-2">
                    {hasDiscount && (
                        <span className="text-xl text-gray-400 line-through">
                            {formatPrice(pricing.compareAtPrice)}
                        </span>
                    )}
                    <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(pricing.totalPayable)}
                    </span>
                    {hasDiscount && (
                        <span className="bg-green-100 text-green-800 text-sm font-semibold px-2 py-1 rounded">
                            {discountPercentage}% OFF
                        </span>
                    )}
                </div>

                <p className="text-sm text-gray-600">
                    (including GST {formatPrice(pricing.gstAmount)})
                </p>
            </div>

            {/* Applied Discounts/Modifiers Indicator */}
            {hasModifiers && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <p className="text-sm font-semibold text-green-800">
                            {pricing.meta.modifiersApplied} discount{pricing.meta.modifiersApplied > 1 ? 's' : ''} applied
                        </p>
                    </div>
                </div>
            )}

            {/* Geo Zone Info */}
            {pricing.meta?.geoZone && (
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <Info className="w-4 h-4" />
                    <span>Pricing for: {pricing.meta.geoZone}</span>
                </div>
            )}

            {/* Quick Breakdown */}
            <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({quantity}x)</span>
                    <span>{formatPrice(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                    <span>GST ({pricing.gstPercentage}%)</span>
                    <span>{formatPrice(pricing.gstAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t pt-2">
                    <span>Total</span>
                    <span>{formatPrice(pricing.totalPayable)}</span>
                </div>
            </div>

            {/* View Detailed Breakdown Button */}
            <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-semibold"
            >
                {showBreakdown ? 'Hide' : 'View'} detailed breakdown
            </button>

            {/* Detailed Breakdown (Expandable) */}
            {showBreakdown && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-sm">
                    <p className="font-semibold text-gray-900 mb-2">Price Calculation:</p>
                    <div className="flex justify-between text-gray-700">
                        <span>Base Price</span>
                        <span>{formatPrice(pricing.basePrice)}</span>
                    </div>
                    {hasModifiers && (
                        <div className="text-xs text-gray-600 pl-4">
                            <p className="italic">+ {pricing.meta.modifiersApplied} pricing adjustments</p>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-700">
                        <span>Price per unit</span>
                        <span>{formatPrice(pricing.subtotal / quantity)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                        <span>Quantity</span>
                        <span>× {quantity}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 font-semibold border-t pt-2">
                        <span>Subtotal</span>
                        <span>{formatPrice(pricing.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                        <span>GST ({pricing.gstPercentage}%)</span>
                        <span>{formatPrice(pricing.gstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-900 font-bold border-t pt-2">
                        <span>Final Amount</span>
                        <span>{formatPrice(pricing.totalPayable)}</span>
                    </div>
                </div>
            )}

            {/* Trust Indicator */}
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="w-3 h-3" />
                <span>Price locked at checkout • No hidden charges</span>
            </div>
        </div>
    );
};

export default ProductPriceBox;
