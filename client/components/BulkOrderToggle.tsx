import React from 'react';
import { Upload as UploadIcon } from 'lucide-react';

interface BulkOrderToggleProps {
    orderMode: 'single' | 'bulk';
    setOrderMode: (mode: 'single' | 'bulk') => void;
}

const BulkOrderToggle: React.FC<BulkOrderToggleProps> = ({
    orderMode,
    setOrderMode,
}) => {
    return (
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
    );
};

export default BulkOrderToggle;
