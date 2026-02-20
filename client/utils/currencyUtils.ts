/**
 * Currency Utilities
 * 
 * Centralized currency formatting functions used across the application.
 * Supports dynamic currency symbols based on zone/region.
 */

/**
 * Get currency symbol from currency code
 * @param {string} currencyCode - ISO 4217 currency code (USD, EUR, INR, etc.)
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode: string): string => {
    const symbols: Record<string, string> = {
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
        'KRW': '₩',
        'HKD': 'HK$',
        'PLN': 'zł',
        'TRY': '₺',
    };
    return symbols[currencyCode] || currencyCode || '₹'; // Fallback to INR
};

export interface FormatPriceOptions {
    decimals?: number;
    showSymbol?: boolean;
    locale?: string;
}

/**
 * Format price with currency symbol
 * @param {number|string|null|undefined} amount - Price amount
 * @param {string} currencyCode - Currency code (optional, defaults to INR)
 * @param {FormatPriceOptions} options - Formatting options
 * @returns {string} Formatted price string
 */
export const formatPrice = (
    amount: number | string | null | undefined,
    currencyCode: string = 'INR',
    options: FormatPriceOptions = {}
): string => {
    const {
        decimals = 2,
        showSymbol = true,
        locale = 'en-US'
    } = options;

    if (amount === null || amount === undefined || isNaN(Number(amount))) {
        return showSymbol ? `${getCurrencySymbol(currencyCode)}0.00` : '0.00';
    }

    const symbol = getCurrencySymbol(currencyCode);
    const formatted = Number(amount).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    return showSymbol ? `${symbol}${formatted}` : formatted;
};

/**
 * Format price from pricing object (from API response)
 * @param {any} pricing - Pricing object from API
 * @param {string} field - Field to format (totalPayable, subtotal, etc.)
 * @returns {string} Formatted price
 */
export const formatPricingField = (pricing: any, field: string = 'totalPayable'): string => {
    if (!pricing) return '₹0.00';
    const amount = pricing[field];
    const currency = pricing.currency || 'INR';
    return formatPrice(amount, currency);
};

/**
 * Get currency name from code
 * @param {string} currencyCode - Currency code
 * @returns {string} Currency name
 */
export const getCurrencyName = (currencyCode: string): string => {
    const names: Record<string, string> = {
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
        'SGD': 'Singapore Dollar',
        'MYR': 'Malaysian Ringgit',
        'THB': 'Thai Baht',
        'CHF': 'Swiss Franc',
        'NZD': 'New Zealand Dollar',
        'ZAR': 'South African Rand',
        'MXN': 'Mexican Peso',
        'BRL': 'Brazilian Real',
        'KRW': 'South Korean Won',
        'HKD': 'Hong Kong Dollar',
    };
    return names[currencyCode] || currencyCode;
};

/**
 * Parse price from string (removes currency symbols)
 * @param {string|number} priceString - Price string with currency symbol
 * @returns {number} Numeric price value
 */
export const parsePrice = (priceString: string | number): number => {
    if (typeof priceString === 'number') return priceString;
    if (!priceString) return 0;

    // Remove all currency symbols and formatting
    const cleaned = String(priceString).replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
};

/**
 * List of supported currencies
 */
export const SUPPORTED_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

export default {
    getCurrencySymbol,
    formatPrice,
    formatPricingField,
    getCurrencyName,
    parsePrice,
    SUPPORTED_CURRENCIES
};
