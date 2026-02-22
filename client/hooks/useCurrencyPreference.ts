import { useState, useEffect, useCallback } from 'react';

/**
 * useCurrencyPreference Hook
 * 
 * Automatically detects and manages user's preferred currency based on:
 * 1. User's explicit preference (localStorage)
 * 2. Country from location/pincode
 * 3. Browser locale
 * 4. Falls back to INR
 * 
 * Returns: { currency, setCurrency, currencySymbol, currencyName }
 */
export const useCurrencyPreference = () => {
    const [currency, setCurrencyState] = useState('INR');
    const [detectedFromLocation, setDetectedFromLocation] = useState(false);

    // Currency symbols mapping
    const getCurrencySymbol = (code) => {
        const symbols = {
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
        };
        return symbols[code] || code;
    };

    // Currency names
    const getCurrencyName = (code) => {
        const names = {
            'USD': 'US Dollar',
            'EUR': 'Euro',
            'GBP': 'British Pound',
            'INR': 'Indian Rupee',
            'JPY': 'Japanese Yen',
            'CNY': 'Chinese Yuan',
            'AUD': 'Australian Dollar',
            'CAD': 'Canadian Dollar',
            'AED': 'UAE Dirham',
            'SAR': 'Saudi Riyal',
        };
        return names[code] || code;
    };

    // Detect currency from location context
    useEffect(() => {
        const detectCurrency = async () => {
            try {
                // 1. Check localStorage preference
                const savedCurrency = localStorage.getItem('preferredCurrency');
                if (savedCurrency) {
                    setCurrencyState(savedCurrency);
                    return;
                }

                // 2. Try to get from user context (includes location)
                const token = localStorage.getItem('token');
                if (token) {
                    const response = await fetch('/api/user/context', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.context?.location?.currency) {
                            setCurrencyState(data.context.location.currency);
                            setDetectedFromLocation(true);
                            return;
                        }
                    }
                }

                // 3. Try browser locale as fallback
                const browserLocale = navigator.language || 'en-IN';
                const countryCode = browserLocale.split('-')[1];
                
                // Map common country codes to currencies
                const localeToCurrency = {
                    'US': 'USD',
                    'GB': 'GBP',
                    'IN': 'INR',
                    'AU': 'AUD',
                    'CA': 'CAD',
                    'JP': 'JPY',
                    'CN': 'CNY',
                    'AE': 'AED',
                    'SA': 'SAR',
                };

                const detectedCurrency = localeToCurrency[countryCode] || 'INR';
                setCurrencyState(detectedCurrency);

            } catch (error) {
                console.error('Currency detection error:', error);
                // Fallback to INR
                setCurrencyState('INR');
            }
        };

        detectCurrency();
    }, []);

    // Custom setCurrency that also saves to localStorage
    const setCurrency = useCallback((newCurrency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('preferredCurrency', newCurrency);
    }, []);

    return {
        currency,
        setCurrency,
        currencySymbol: getCurrencySymbol(currency),
        currencyName: getCurrencyName(currency),
        isDetectedFromLocation: detectedFromLocation
    };
};

export default useCurrencyPreference;
