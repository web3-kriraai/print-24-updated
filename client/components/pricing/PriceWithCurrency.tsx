import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Info } from 'lucide-react';

interface PriceWithCurrencyProps {
    price: number;
    originalCurrency: string;
    currencyConversion?: {
        originalCurrency: string;
        originalAmount: number;
        convertedCurrency: string;
        convertedAmount: number;
        exchangeRate: number;
        convertedUnitPrice?: number;
        convertedSubtotal?: number;
        source: 'live-api' | 'fallback';
    };
    showConversionToggle?: boolean;
    className?: string;
}

/**
 * PriceWithCurrency Component
 * 
 * Beautiful price display with automatic currency conversion
 * Features:
 * - Shows original and converted prices
 * - Exchange rate display
 * - Currency conversion source indicator
 * - Smooth toggle animation
 * - Visual feedback for live/fallback rates
 */
export const PriceWithCurrency: React.FC<PriceWithCurrencyProps> = ({
    price,
    originalCurrency,
    currencyConversion,
    showConversionToggle = true,
    className = ''
}) => {
    const [showConverted, setShowConverted] = useState(!!currencyConversion);

    // Auto-show converted price if available
    useEffect(() => {
        if (currencyConversion) {
            setShowConverted(true);
        }
    }, [currencyConversion]);

    const getCurrencySymbol = (code: string) => {
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
            'SAR': '﷼'
        };
        return symbols[code] || code;
    };

    const formatPrice = (amount: number, currency: string) => {
        return `${getCurrencySymbol(currency)} ${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    // No conversion available - show original price only
    if (!currencyConversion) {
        return (
            <div className={`flex items-baseline gap-2 ${className}`}>
                <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(price, originalCurrency)}
                </span>
            </div>
        );
    }

    return (
        <div className={`${className}`}>
            {/* Price Display */}
            <div className="flex items-baseline gap-3">
                {/* Converted Price (Primary) */}
                {showConverted ? (
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-blue-600">
                            {formatPrice(currencyConversion.convertedAmount, currencyConversion.convertedCurrency)}
                        </span>
                        <span className="text-sm text-gray-500 mt-1">
                            {formatPrice(currencyConversion.originalAmount, currencyConversion.originalCurrency)}
                            {' '}<span className="text-gray-400">({originalCurrency})</span>
                        </span>
                    </div>
                ) : (
                    /* Original Price (Primary) */
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-gray-900">
                            {formatPrice(price, originalCurrency)}
                        </span>
                    </div>
                )}

                {/* Toggle Button */}
                {showConversionToggle && (
                    <button
                        onClick={() => setShowConverted(!showConverted)}
                        className="ml-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title={showConverted ? "Show original price" : "Show converted price"}
                    >
                        <TrendingUp className={`w-5 h-5 ${showConverted ? 'text-blue-600' : 'text-gray-400'}`} />
                    </button>
                )}
            </div>

            {/* Exchange Rate Info */}
            {showConverted && (
                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span className="text-gray-700">
                            Exchange Rate: <span className="font-semibold">
                                1 {originalCurrency} = {currencyConversion.exchangeRate.toFixed(4)} {currencyConversion.convertedCurrency}
                            </span>
                        </span>
                    </div>

                    {/* Data Source Indicator */}
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                        <Info className="w-3 h-3" />
                        {currencyConversion.source === 'live-api' ? (
                            <span className="text-green-600 font-medium">
                                ✓ Live exchange rates
                            </span>
                        ) : (
                            <span className="text-amber-600">
                                ⚠ Using fallback rates (API unavailable)
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceWithCurrency;
