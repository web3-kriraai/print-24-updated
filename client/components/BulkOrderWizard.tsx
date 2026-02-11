import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, FileText, CheckCircle, AlertCircle, Loader,
    FileCheck, Calculator, Eye, ArrowRight, ArrowLeft,
    ShieldCheck, Clock, DollarSign, Layers
} from 'lucide-react';
import { useBulkOrderUpload, useBulkOrderStatus } from '../hooks/useBulkOrder';

interface BulkOrderWizardProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productType?: string;
    onSuccess?: (bulkOrderId: string) => void;
}

const BulkOrderWizard: React.FC<BulkOrderWizardProps> = ({
    isOpen,
    onClose,
    productId,
    productType = 'VISITING_CARD',
    onSuccess,
}) => {
    // Step state
    const [currentStep, setCurrentStep] = useState(1);

    // Form data
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [totalCopies, setTotalCopies] = useState<string>('');
    const [distinctDesigns, setDistinctDesigns] = useState<string>('');
    const [pagesPerDesign, setPagesPerDesign] = useState<number>(2);
    const [hireDesigner, setHireDesigner] = useState(false);

    // Validation state
    const [fileError, setFileError] = useState<string>('');
    const [configError, setConfigError] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Upload state
    const { uploadBulkOrder, uploading } = useBulkOrderUpload();
    const [bulkOrderId, setBulkOrderId] = useState<string | null>(null);
    const { status: bulkStatus } = useBulkOrderStatus(bulkOrderId || '', !!bulkOrderId);

    // Calculations
    const totalCopiesNum = parseInt(totalCopies) || 0;
    const distinctDesignsNum = parseInt(distinctDesigns) || 0;
    const copiesPerDesign = distinctDesignsNum > 0 ? Math.floor(totalCopiesNum / distinctDesignsNum) : 0;
    const remainderCopies = distinctDesignsNum > 0 ? totalCopiesNum % distinctDesignsNum : 0;
    const designFee = hireDesigner ? distinctDesignsNum * 500 : 0;
    const expectedPages = distinctDesignsNum * pagesPerDesign;

    // File validation
    const validateFile = useCallback((file: File) => {
        setFileError('');

        // Check file type
        if (file.type !== 'application/pdf') {
            setFileError('Only PDF files are allowed');
            return false;
        }

        // Check file size (100MB max)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            setFileError(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
            return false;
        }

        return true;
    }, []);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (validateFile(file)) {
                setSelectedFile(file);
                setFileError('');
            } else {
                setSelectedFile(null);
            }
        }
    };

    // Handle file drop
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (validateFile(file)) {
                setSelectedFile(file);
                setFileError('');
            } else {
                setSelectedFile(null);
            }
        }
    };

    // Validate configuration
    const validateConfiguration = () => {
        setConfigError('');

        if (!selectedFile) {
            setConfigError('Please select a PDF file');
            return false;
        }

        if (totalCopiesNum < 1) {
            setConfigError('Total copies must be at least 1');
            return false;
        }

        if (distinctDesignsNum < 1) {
            setConfigError('Distinct designs must be at least 1');
            return false;
        }

        if (totalCopiesNum > 100000) {
            setConfigError('Total copies exceeds maximum limit (100,000)');
            return false;
        }

        if (distinctDesignsNum > 50) {
            setConfigError('Too many designs. Maximum allowed: 50');
            return false;
        }

        return true;
    };

    // Handle next step
    const handleNext = () => {
        if (currentStep === 1) {
            if (validateConfiguration()) {
                setCurrentStep(2);
            }
        } else if (currentStep === 2) {
            setCurrentStep(3);
        }
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!selectedFile) return;

        try {
            const formData = new FormData();
            formData.append('compositeFile', selectedFile);
            formData.append('totalCopies', totalCopies);
            formData.append('distinctDesigns', distinctDesigns);
            formData.append('pagesPerDesign', pagesPerDesign.toString());
            formData.append('hireDesigner', hireDesigner.toString());
            formData.append('productId', productId);
            formData.append('productType', productType);

            const result = await uploadBulkOrder(formData);
            setBulkOrderId(result.bulkOrderId);

            // Notify success callback
            if (onSuccess && result.bulkOrderId) {
                onSuccess(result.bulkOrderId);
            }
        } catch (error: any) {
            console.error('Upload error:', error);

            // Set error message for display
            setErrorMessage(error.message || 'Failed to upload bulk order');

            // Always redirect to step 1 (Upload & Config) to show the error
            setCurrentStep(1);
        }
    };

    // Handle close
    const handleClose = () => {
        // Reset state
        setCurrentStep(1);
        setSelectedFile(null);
        setTotalCopies('');
        setDistinctDesigns('');
        setPagesPerDesign(2);
        setHireDesigner(false);
        setFileError('');
        setConfigError('');
        setErrorMessage('');
        setBulkOrderId(null);

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="border-b border-gray-200 px-8 py-6 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Upload className="w-6 h-6 text-blue-600" />
                            Bulk Order Upload
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Upload composite PDF and split into multiple orders
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={uploading || !!bulkOrderId}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-white/50"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-8 py-6 bg-gray-50">
                    <div className="flex items-center justify-between max-w-2xl mx-auto">
                        {[
                            { num: 1, label: 'Upload & Config', icon: Upload },
                            { num: 2, label: 'Options', icon: Calculator },
                            { num: 3, label: 'Review & Submit', icon: Eye },
                        ].map((step, index) => (
                            <React.Fragment key={step.num}>
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep > step.num
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : currentStep === step.num
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                                : 'bg-white border-gray-300 text-gray-400'
                                            }`}
                                    >
                                        {currentStep > step.num ? (
                                            <CheckCircle className="w-6 h-6" />
                                        ) : (
                                            <step.icon className="w-6 h-6" />
                                        )}
                                    </div>
                                    <span
                                        className={`mt-2 text-xs font-medium ${currentStep === step.num ? 'text-blue-600' : 'text-gray-500'
                                            }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {index < 2 && (
                                    <div
                                        className={`flex-1 h-1 mx-4 rounded ${currentStep > step.num ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Upload & Configuration */}
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        <FileText className="w-4 h-4 inline mr-2" />
                                        Upload Composite PDF
                                    </label>
                                    <div
                                        onDrop={handleFileDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 hover:bg-blue-50/50"
                                    >
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="pdf-upload"
                                        />
                                        <label htmlFor="pdf-upload" className="cursor-pointer block">
                                            {selectedFile ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <FileCheck className="w-12 h-12 text-green-500" />
                                                    <div className="text-left">
                                                        <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                    <p className="text-gray-600 font-medium mb-2">
                                                        Drop your PDF here or click to browse
                                                    </p>
                                                    <p className="text-xs text-gray-500">PDF only, max 100MB</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                    {fileError && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {fileError}
                                        </p>
                                    )}
                                </div>

                                {/* Configuration Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Total Copies */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Total Copies
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100000"
                                            value={totalCopies}
                                            onChange={(e) => setTotalCopies(e.target.value)}
                                            placeholder="e.g., 30000"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Distinct Designs */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Distinct Designs
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={distinctDesigns}
                                            onChange={(e) => setDistinctDesigns(e.target.value)}
                                            placeholder="e.g., 30"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Pages Per Design */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Pages Per Design
                                        </label>
                                        <select
                                            value={pagesPerDesign}
                                            onChange={(e) => setPagesPerDesign(Number(e.target.value))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value={1}>1 (One-sided)</option>
                                            <option value={2}>2 (Front-back)</option>
                                            <option value={4}>4 (Multi-page)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Validation Summary */}
                                {selectedFile && totalCopiesNum > 0 && distinctDesignsNum > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-blue-900 mb-2">Configuration Summary</p>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <span className="text-blue-700">Expected PDF Pages:</span>
                                                        <span className="ml-2 font-semibold text-blue-900">{expectedPages}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-blue-700">Copies per Design:</span>
                                                        <span className="ml-2 font-semibold text-blue-900">{copiesPerDesign}</span>
                                                        {remainderCopies > 0 && (
                                                            <span className="text-xs text-blue-600 ml-1">
                                                                (+ {remainderCopies} to first designs)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Message Display */}
                                {errorMessage && (
                                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-red-900 mb-1">❌ Upload Failed</p>
                                                <p className="text-sm text-red-800 mb-3">{errorMessage}</p>
                                                {errorMessage.includes('Page count mismatch') && (
                                                    <div className="mt-2 bg-white border border-red-200 rounded p-3">
                                                        <p className="text-sm font-semibold text-red-900 mb-2">💡 How to Fix:</p>
                                                        <ul className="text-sm text-red-800 space-y-1.5">
                                                            <li className="flex items-start gap-2">
                                                                <span className="text-red-600">•</span>
                                                                <span>Check your PDF's total page count</span>
                                                            </li>
                                                            <li className="flex items-start gap-2">
                                                                <span className="text-red-600">•</span>
                                                                <span>Formula: <code className="bg-red-100 px-2 py-0.5 rounded font-mono text-xs">Designs × Pages = PDF Pages</code></span>
                                                            </li>
                                                            <li className="flex items-start gap-2">
                                                                <span className="text-red-600">•</span>
                                                                <span>Adjust values below to match</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {configError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-red-800">
                                            <AlertCircle className="w-5 h-5" />
                                            <p className="font-medium">{configError}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 2: Options */}
                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* Hire Designer Option */}
                                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <input
                                                type="checkbox"
                                                id="hire-designer"
                                                checked={hireDesigner}
                                                onChange={(e) => setHireDesigner(e.target.checked)}
                                                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <div>
                                                <label
                                                    htmlFor="hire-designer"
                                                    className="text-lg font-semibold text-gray-900 cursor-pointer"
                                                >
                                                    Hire Designer Service
                                                </label>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Our design team will enhance your designs professionally
                                                </p>
                                                <div className="mt-3 flex items-center gap-2 text-sm">
                                                    <DollarSign className="w-4 h-4 text-green-600" />
                                                    <span className="text-gray-700">
                                                        ₹500 per design × {distinctDesignsNum} designs =
                                                        <span className="font-bold text-green-600 ml-1">
                                                            ₹{designFee.toLocaleString()}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Info */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-blue-900 mb-1">Quality Assurance</p>
                                            <p className="text-sm text-blue-700">
                                                All designs are verified before printing to ensure best quality output
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Review & Submit */}
                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* Not yet uploaded */}
                                {!bulkOrderId && !uploading && (
                                    <>
                                        {/* Summary */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                                            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                                                <Layers className="w-5 h-5" />
                                                Order Summary
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-blue-700 mb-1">File</p>
                                                    <p className="font-semibold text-blue-900">{selectedFile?.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-blue-700 mb-1">Total Designs</p>
                                                    <p className="font-semibold text-blue-900">{distinctDesignsNum}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-blue-700 mb-1">Total Copies</p>
                                                    <p className="font-semibold text-blue-900">{totalCopiesNum.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-blue-700 mb-1">Copies per Design</p>
                                                    <p className="font-semibold text-blue-900">{copiesPerDesign}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-blue-700 mb-1">Pages per Design</p>
                                                    <p className="font-semibold text-blue-900">{pagesPerDesign}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-blue-700 mb-1">Expected PDF Pages</p>
                                                    <p className="font-semibold text-blue-900">{expectedPages}</p>
                                                </div>
                                            </div>

                                            {/* Design Fee */}
                                            {hireDesigner && (
                                                <div className="mt-4 pt-4 border-t border-blue-200">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-blue-700">Designer Service Fee</span>
                                                        <span className="font-bold text-lg text-green-600">
                                                            ₹{designFee.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={uploading}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                        >
                                            <Upload className="w-5 h-5" />
                                            Submit Bulk Order
                                        </button>
                                    </>
                                )}

                                {/* Uploading */}
                                {uploading && (
                                    <div className="text-center py-12">
                                        <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                                        <p className="text-lg font-semibold text-gray-900 mb-2">Uploading...</p>
                                        <p className="text-sm text-gray-600">Please wait while we process your files</p>
                                    </div>
                                )}

                                {/* Processing Status */}
                                {bulkOrderId && bulkStatus && (
                                    <div className="space-y-4">
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-green-900 mb-2">Upload Successful!</h3>
                                            <p className="text-green-700 mb-4">Order Number: {bulkStatus.orderNumber}</p>

                                            {/* Processing Status */}
                                            <div className="bg-white rounded-lg p-4 mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-700">Processing Status</span>
                                                    <span className="text-sm font-semibold text-blue-600">
                                                        {bulkStatus.status}
                                                    </span>
                                                </div>
                                                {bulkStatus.progress && (
                                                    <>
                                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                                style={{ width: `${bulkStatus.progress.percentage}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-600">{bulkStatus.progress.message}</p>
                                                    </>
                                                )}
                                            </div>

                                            {bulkStatus.status === 'ORDER_CREATED' && (
                                                <button
                                                    onClick={handleClose}
                                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                                >
                                                    View Orders
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 flex items-center justify-between">
                    {/* Back Button */}
                    <button
                        onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                        disabled={currentStep === 1 || uploading || !!bulkOrderId}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    {/* Next/Submit Button */}
                    {currentStep < 3 && (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default BulkOrderWizard;
