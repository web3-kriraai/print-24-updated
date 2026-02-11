import React from 'react';
import { Upload as UploadIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface BulkOrderToggleProps {
    orderMode: 'single' | 'bulk';
    setOrderMode: (mode: 'single' | 'bulk') => void;
    setShowBulkWizard: (show: boolean) => void;
}

const BulkOrderToggle: React.FC<BulkOrderToggleProps> = ({
    orderMode,
    setOrderMode,
    setShowBulkWizard,
}) => {
    return (
        <>
            {/* Order Mode Toggle */}
            <div className="mb-6 sm:mb-8 bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-5 rounded-xl border-2 border-amber-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <h3 className="font-bold text-sm sm:text-base text-amber-900">Order Mode</h3>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 shadow-sm border border-amber-200">
                        <button
                            onClick={() => setOrderMode('single')}
                            className={`px-4 sm:px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 ${orderMode === 'single'
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                                    : 'text-amber-700 hover:bg-amber-50'
                                }`}
                        >
                            Single Order
                        </button>
                        <button
                            onClick={() => setOrderMode('bulk')}
                            className={`px-4 sm:px-6 py-2 rounded-md font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${orderMode === 'bulk'
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                                    : 'text-amber-700 hover:bg-amber-50'
                                }`}
                        >
                            <UploadIcon size={14} />
                            Bulk Upload
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Upload UI */}
            {orderMode === 'bulk' && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6 sm:mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 sm:p-8 rounded-xl border-2 border-blue-200 shadow-lg"
                >
                    <div className="text-center">
                        <div className="mb-4 flex justify-center">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-full shadow-lg">
                                <UploadIcon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h3 className="font-bold text-xl text-blue-900 mb-2">Bulk Order Upload</h3>
                        <p className="text-sm text-blue-700 mb-6 max-w-md mx-auto">
                            Upload a composite PDF with multiple designs. Perfect for business cards, flyers, or any product with multiple variations.
                        </p>
                        <button
                            onClick={() => setShowBulkWizard(true)}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 mx-auto"
                        >
                            <UploadIcon className="w-6 h-6" />
                            <span>Start Bulk Upload</span>
                        </button>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
                            <div className="flex items-start gap-2 bg-white p-3 rounded-lg">
                                <span className="text-blue-600 mt-0.5">✓</span>
                                <div>
                                    <p className="font-semibold text-sm text-blue-900">Multiple Designs</p>
                                    <p className="text-xs text-blue-600">Upload 1-50 designs in one PDF</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 bg-white p-3 rounded-lg">
                                <span className="text-blue-600 mt-0.5">✓</span>
                                <div>
                                    <p className="font-semibold text-sm text-blue-900">Auto-Split</p>
                                    <p className="text-xs text-blue-600">We'll split & process automatically</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 bg-white p-3 rounded-lg">
                                <span className="text-blue-600 mt-0.5">✓</span>
                                <div>
                                    <p className="font-semibold text-sm text-blue-900">Track Each Order</p>
                                    <p className="text-xs text-blue-600">Individual tracking for each design</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </>
    );
};

export default BulkOrderToggle;
