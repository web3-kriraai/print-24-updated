import React from 'react';
import { motion } from 'framer-motion';
import { User, Layers, Info } from 'lucide-react';

interface BulkOrderToggleProps {
    orderMode: 'single' | 'bulk';
    setOrderMode: (mode: 'single' | 'bulk') => void;
}

const BulkOrderToggle: React.FC<BulkOrderToggleProps> = ({
    orderMode,
    setOrderMode,
}) => {
    return (
        <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 flex items-center shadow-inner">
            <button
                onClick={() => setOrderMode('single')}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                    orderMode === 'single' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                {orderMode === 'single' && (
                    <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gray-900 rounded-xl shadow-lg z-[-1]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <User size={16} />
                Single Design
            </button>
            <button
                onClick={() => setOrderMode('bulk')}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                    orderMode === 'bulk' ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                {orderMode === 'bulk' && (
                    <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg z-[-1]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                )}
                <Layers size={16} />
                Bulk Designs
            </button>
        </div>
    );
};

export default BulkOrderToggle;
