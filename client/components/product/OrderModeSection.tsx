import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Info, Sparkles } from 'lucide-react';

interface OrderModeSectionProps {
    orderMode: 'single' | 'bulk';
    setOrderMode: (mode: 'single' | 'bulk') => void;
    hasPermission: boolean;
    onBulkUploadClick: () => void;
}

export const OrderModeSection: React.FC<OrderModeSectionProps> = ({
    orderMode,
    setOrderMode,
    hasPermission,
    onBulkUploadClick
}) => {
    if (!hasPermission) return null;

    return (
        <div className="mb-8">
            {/* Mode Toggle */}
            <div className="flex gap-3 p-1.5 bg-gradient-to-r from-cream-100 to-cream-50 rounded-2xl shadow-sm border border-cream-200">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOrderMode('single')}
                    className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${orderMode === 'single'
                            ? 'bg-white text-cream-900 shadow-lg ring-2 ring-cream-900/10'
                            : 'text-cream-600 hover:text-cream-900 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles size={18} className={orderMode === 'single' ? 'text-cream-900' : 'text-cream-400'} />
                        <span>Single Order</span>
                    </div>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setOrderMode('bulk');
                        onBulkUploadClick();
                    }}
                    className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${orderMode === 'bulk'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                            : 'text-cream-600 hover:text-cream-900 hover:bg-white/50'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Upload size={18} />
                        <span>Bulk Upload</span>
                        <span className="ml-1.5 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                            Pro
                        </span>
                    </div>
                </motion.button>
            </div>

            {/* Info Banner - Only show in single mode */}
            <AnimatePresence mode="wait">
                {orderMode === 'single' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Info className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-blue-900 leading-relaxed">
                                        <strong className="font-semibold">Pro Tip:</strong> Need to order multiple unique designs at once?
                                        Use <strong>Bulk Upload</strong> to submit 1-50 designs in a single PDF file.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setOrderMode('bulk');
                                            onBulkUploadClick();
                                        }}
                                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        <span>Try Bulk Upload</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Feature Highlight - Only show in bulk mode */}
            <AnimatePresence mode="wait">
                {orderMode === 'bulk' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-white border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-600 mb-1">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs font-semibold">Fast Processing</span>
                                </div>
                                <p className="text-xs text-cream-600">Upload once, receive multiple orders</p>
                            </div>

                            <div className="p-3 bg-white border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-600 mb-1">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs font-semibold">Auto-Split PDF</span>
                                </div>
                                <p className="text-xs text-cream-600">We split your PDF into individual designs</p>
                            </div>

                            <div className="p-3 bg-white border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-600 mb-1">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs font-semibold">Track Progress</span>
                                </div>
                                <p className="text-xs text-cream-600">Real-time status updates for each design</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrderModeSection;
