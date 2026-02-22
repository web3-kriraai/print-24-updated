import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle, AlertCircle, Loader, Package, 
    Layers, ArrowRight, ShoppingBag, RefreshCw,
    FileCheck, ClipboardList, Info
} from 'lucide-react';
import { useBulkOrderStatus } from '../hooks/useBulkOrder';

const BulkOrderStatus: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [pollingEnabled, setPollingEnabled] = useState(true);
    
    // Status polling hook
    const { status, loading, error, refetch } = useBulkOrderStatus(id || '', pollingEnabled);

    // Stop polling once order is created or failed
    useEffect(() => {
        if (status && (status.status === 'ORDER_CREATED' || status.status === 'FAILED')) {
            setPollingEnabled(false);
        }
    }, [status]);

    // Handle retry for fetching
    const handleRetry = () => {
        setPollingEnabled(true);
        refetch();
    };

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                    <p className="text-gray-600 mb-8">{error}</p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleRetry}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                        >
                            Try Again
                        </button>
                        <Link 
                            to="/my-orders"
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Go to My Orders
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Helper for progress percentage
    const getProgress = () => {
        if (!status) return 0;
        if (status.status === 'UPLOADED') return 25;
        if (status.status === 'SPLITTING') return 50;
        if (status.status === 'PROCESSING') return 75;
        if (status.status === 'ORDER_CREATED') return 100;
        return 0;
    };

    // Helper for status message
    const getStatusMessage = () => {
        if (!status) return 'Initializing...';
        switch (status.status) {
            case 'UPLOADED': return 'Preparing your files...';
            case 'SPLITTING': return 'Splitting designs...';
            case 'PROCESSING': return 'Creating individual orders...';
            case 'ORDER_CREATED': return 'All orders created successfully!';
            case 'FAILED': return 'Bulk processing failed';
            case 'CANCELLED': return 'Bulk order cancelled';
            default: return 'Processing your request...';
        }
    };

    const progressValue = getProgress();
    const isComplete = status?.status === 'ORDER_CREATED';
    const isFailed = status?.status === 'FAILED';

    return (
        <div className="min-h-[80vh] bg-gray-50/50 py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg ${
                            isComplete ? 'bg-green-500 shadow-green-200' : 
                            isFailed ? 'bg-red-500 shadow-red-200' :
                            'bg-blue-600 shadow-blue-200'
                        }`}
                    >
                        {isComplete ? (
                            <CheckCircle className="w-10 h-10 text-white" />
                        ) : isFailed ? (
                            <AlertCircle className="w-10 h-10 text-white" />
                        ) : (
                            <Loader className="w-10 h-10 text-white animate-spin" />
                        )}
                    </motion.div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
                        Bulk Order Status
                    </h1>
                    {status?.orderNumber && (
                        <p className="text-sm font-semibold text-blue-600 tracking-wider">
                            ID: {status.orderNumber}
                        </p>
                    )}
                </div>

                {/* Status Card */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10 mb-8 overflow-hidden relative"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -z-0"></div>
                    
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">
                                    {getStatusMessage()}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {isComplete 
                                        ? 'Everything is ready. You can track your orders now.' 
                                        : 'Please wait while we process your bulk designs.'}
                                </p>
                            </div>
                            <div className="text-right flex flex-col items-center sm:items-end">
                                <span className={`text-3xl font-black ${
                                    isComplete ? 'text-green-600' : 
                                    isFailed ? 'text-red-600' : 
                                    'text-blue-600'
                                }`}>
                                    {progressValue}%
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    Progress
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-10 border border-gray-50 shadow-inner">
                            <motion.div 
                                className={`h-full ${
                                    isComplete ? 'bg-green-500' : 
                                    isFailed ? 'bg-red-500 font-bold' : 
                                    'bg-gradient-to-r from-blue-600 to-indigo-600'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progressValue}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                        </div>

                        {/* Order Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100">
                            <div>
                                <div className="text-gray-400 flex items-center gap-1.5 mb-1.5">
                                    <Layers size={14} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Designs</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{status?.distinctDesigns || '-'}</p>
                            </div>
                            <div>
                                <div className="text-gray-400 flex items-center gap-1.5 mb-1.5">
                                    <Package size={14} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Copies</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{status?.totalCopies?.toLocaleString() || '-'}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <div className="text-gray-400 flex items-center gap-1.5 mb-1.5">
                                    <FileCheck size={14} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Status</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-block w-2 h-2 rounded-full ${
                                        isComplete ? 'bg-green-500' : 
                                        isFailed ? 'bg-red-500' : 
                                        'bg-blue-500 animate-pulse'
                                    }`}></span>
                                    <p className="text-sm font-bold text-gray-900">{status?.status || 'PENDING'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {isComplete ? (
                        <>
                            <Link 
                                to="/my-orders"
                                className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-1"
                            >
                                <ShoppingBag size={20} />
                                View All Orders
                            </Link>
                            {status?.parentOrderId && (
                                <Link 
                                    to={`/order/${status.parentOrderId}`}
                                    className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-900 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <ClipboardList size={20} />
                                    Parent Order Details
                                </Link>
                            )}
                        </>
                    ) : isFailed ? (
                        <div className="w-full">
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6">
                                <p className="text-red-800 text-sm font-medium">
                                    <AlertCircle size={16} className="inline mr-2" />
                                    Reason: {status?.failureReason || 'An unknown error occurred during splitting.'}
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate(-1)}
                                className="w-full px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
                            >
                                Go Back & Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 w-full flex items-start gap-4">
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <Info className="text-blue-600 w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-blue-900 font-bold mb-1">What's happening?</h4>
                                <p className="text-blue-800/70 text-sm leading-relaxed">
                                    We are splitting your composite PDF into individual designs. 
                                    Each design will become a separate order in our system. 
                                    This usually takes less than a minute. <strong>Don't close this page.</strong>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Support Link */}
                <div className="text-center mt-12">
                    <p className="text-gray-400 text-sm font-medium">
                        Having issues? <Link to="/contact" className="text-gray-900 hover:underline">Contact Support</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BulkOrderStatus;
