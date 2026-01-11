import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Loader } from 'lucide-react';

interface PromoCodeInputProps {
    promoCodes: string[];
    onAddPromoCode: (code: string) => void;
    onRemovePromoCode: (code: string) => void;
    isLoading?: boolean;
    error?: string | null;
}

/**
 * Promo Code Input Component
 * 
 * Features:
 * - Add promo codes via Enter key
 * - Remove codes with X button
 * - Visual feedback for applied codes
 * - Loading state support
 */
export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
    promoCodes,
    onAddPromoCode,
    onRemovePromoCode,
    isLoading = false,
    error = null
}) => {
    const [inputValue, setInputValue] = useState('');
    const [inputError, setInputError] = useState<string | null>(null);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = inputValue.trim().toUpperCase();

            // Validation
            if (!code) {
                setInputError('Please enter a promo code');
                return;
            }

            if (promoCodes.includes(code)) {
                setInputError('This promo code is already applied');
                return;
            }

            if (code.length < 3) {
                setInputError('Promo code must be at least 3 characters');
                return;
            }

            // Add code
            onAddPromoCode(code);
            setInputValue('');
            setInputError(null);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-cream-200 p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Tag size={20} className="text-green-600" />
                <h3 className="text-lg font-semibold text-cream-900">Promo Code</h3>
            </div>

            {/* Input */}
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value.toUpperCase());
                            setInputError(null);
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter promo code and press Enter"
                        disabled={isLoading}
                        className={`w-full px-4 py-3 border rounded-lg text-sm font-medium transition-all ${inputError
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                : 'border-cream-300 focus:border-cream-500 focus:ring-cream-200'
                            } focus:ring-2 focus:outline-none disabled:bg-cream-50 disabled:cursor-not-allowed`}
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader size={18} className="animate-spin text-cream-500" />
                        </div>
                    )}
                </div>

                {/* Input Error */}
                {inputError && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-600 font-medium"
                    >
                        {inputError}
                    </motion.p>
                )}

                {/* API Error */}
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-600 font-medium"
                    >
                        {error}
                    </motion.p>
                )}

                {/* Applied Codes */}
                <AnimatePresence>
                    {promoCodes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            <p className="text-xs text-cream-600 font-medium">Applied Codes:</p>
                            <div className="flex flex-wrap gap-2">
                                {promoCodes.map((code) => (
                                    <motion.div
                                        key={code}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-semibold"
                                    >
                                        <Tag size={14} />
                                        {code}
                                        <button
                                            onClick={() => onRemovePromoCode(code)}
                                            disabled={isLoading}
                                            className="hover:text-green-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label={`Remove ${code}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Helper Text */}
                {promoCodes.length === 0 && (
                    <p className="text-xs text-cream-500">
                        Enter your promo code above and press Enter to apply
                    </p>
                )}
            </div>
        </div>
    );
};

export default PromoCodeInput;
