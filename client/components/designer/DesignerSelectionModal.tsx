import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette, MapPin, ArrowRight } from 'lucide-react';

interface DesignerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'visual' | 'physical') => void;
}

const DesignerSelectionModal: React.FC<DesignerSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">How would you like to design?</h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <button
                                onClick={() => onSelect('visual')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <Palette size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">Visual Design (Online)</h3>
                                    <p className="text-sm text-gray-500">Connect with a designer remotely to finalize your design.</p>
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                            </button>

                            <button
                                onClick={() => onSelect('physical')}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                    <MapPin size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">Physical Visit (In-Person)</h3>
                                    <p className="text-sm text-gray-500">Request a designer to visit your location for a personalized session.</p>
                                </div>
                                <ArrowRight size={20} className="text-gray-300 group-hover:text-purple-500 transition-colors" />
                            </button>
                        </div>

                        <div className="p-6 bg-gray-50 text-center">
                            <p className="text-xs text-gray-400">
                                Designers are available during business hours. A small fee may apply.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DesignerSelectionModal;
