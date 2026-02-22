import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, FileText, CheckCircle, AlertCircle, Loader,
    FileCheck, Calculator, Eye, ArrowRight, ShoppingCart,
    Package, DollarSign, Layers
} from 'lucide-react';
import { useBulkOrderUpload } from '../hooks/useBulkOrder';

interface BulkOrderWizardProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName?: string;
    selectedQuantity: number;
    unitPrice: number;
    totalPrice: number;
    uploadFields: number; // Number of upload fields required (auto-detected from product)
    selectedAttributes: any; // All selected product attributes
    onSuccess?: (bulkOrderId: string) => void;
}

/**
 * Simplified Bulk Order Wizard
 * - Auto-detects pages per design from product upload fields
 * - Only asks for number of designs
 * - Uses already-configured quantity and attributes from product page
 * - Total = Number of Designs × Single Order Total
 */
const BulkOrderWizard: React.FC<BulkOrderWizardProps> = ({
    isOpen,
    onClose,
    productId,
    productName = 'Product',
    selectedQuantity,
    unitPrice,
    totalPrice,
    uploadFields,
    selectedAttributes,
    onSuccess,
}) => {
    // Form data
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [numberOfDesigns, setNumberOfDesigns] = useState<string>('');

    // Validation state
    const [fileError, setFileError] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Upload state
    const { uploadBulkOrder, uploading } = useBulkOrderUpload();
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Auto-detected pages per design from upload fields
    const pagesPerDesign = uploadFields || 1;

    // Calculations
    const numberOfDesignsNum = parseInt(numberOfDesigns) || 0;
    const totalBulkPrice = numberOfDesignsNum * totalPrice;
    const expectedPages = numberOfDesignsNum * pagesPerDesign;

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

    // Validate form
    const validateForm = () => {
        if (!selectedFile) {
            setErrorMessage('Please upload a PDF file');
            return false;
        }

        if (numberOfDesignsNum < 1) {
            setErrorMessage('Please enter number of designs (minimum: 1)');
            return false;
        }

        if (numberOfDesignsNum > 50) {
            setErrorMessage('Too many designs. Maximum allowed: 50');
            return false;
        }

        setErrorMessage('');
        return true;
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!validateForm() || !selectedFile) return;

        try {
            const formData = new FormData();
            formData.append('compositeFile', selectedFile);
            formData.append('numberOfDesigns', numberOfDesigns);
            formData.append('pagesPerDesign', pagesPerDesign.toString());
            formData.append('productId', productId);
            formData.append('selectedQuantity', selectedQuantity.toString());
            formData.append('unitPrice', unitPrice.toString());
            formData.append('totalPrice', totalPrice.toString());
            formData.append('selectedAttributes', JSON.stringify(selectedAttributes));

            const result = await uploadBulkOrder(formData);
            setUploadSuccess(true);

            // Notify success callback after a short delay to show success UI
            setTimeout(() => {
                if (onSuccess && result.bulkOrderId) {
                    onSuccess(result.bulkOrderId);
                }
                handleClose();
            }, 2000);
        } catch (error: any) {
            console.error('Upload error:', error);
            setErrorMessage(error.message || 'Failed to upload bulk order');
        }
    };

    // Handle close
    const handleClose = () => {
        setSelectedFile(null);
        setNumberOfDesigns('');
        setFileError('');
        setErrorMessage('');
        setUploadSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="border-b border-gray-200 px-6 sm:px-8 py-5 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                            Bulk Order Upload
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            Upload composite PDF with {numberOfDesignsNum || 'multiple'} designs
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-white/50"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
                    {!uploadSuccess ? (
                        <div className="space-y-6">
                            {/* Product Summary */}
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5">
                                <h3 className="font-bold text-sm sm:text-base text-amber-900 mb-3 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Product Configuration
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <p className="text-amber-700 text-xs">Product</p>
                                        <p className="font-semibold text-amber-900">{productName}</p>
                                    </div>
                                    <div>
                                        <p className="text-amber-700 text-xs">Quantity per Design</p>
                                        <p className="font-semibold text-amber-900">{selectedQuantity.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-amber-700 text-xs">Price per Design</p>
                                        <p className="font-semibold text-amber-900">₹{totalPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3">
                                        <p className="text-amber-700 text-xs">Pages per Design (Auto-detected)</p>
                                        <p className="font-semibold text-amber-900">
                                            {pagesPerDesign} {pagesPerDesign === 1 ? '(One-sided)' : pagesPerDesign === 2 ? '(Front-back)' : '(Multi-page)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Number of Designs */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <Calculator className="w-4 h-4 inline mr-2" />
                                    Number of Designs *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={numberOfDesigns}
                                    onChange={(e) => setNumberOfDesigns(e.target.value)}
                                    placeholder="e.g., 30"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                                />
                                <p className="text-xs text-gray-600 mt-1">How many distinct designs are in your PDF? (Max: 50)</p>
                            </div>

                            {/* PDF File Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-2" />
                                    Upload Composite PDF *
                                </label>
                                <div
                                    onDrop={handleFileDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="border-2 border-dashed border-blue-300 rounded-xl p-6 sm:p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50/30 hover:bg-blue-50/50"
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
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                                <FileCheck className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
                                                <div className="text-center sm:text-left">
                                                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{selectedFile.name}</p>
                                                    <p className="text-xs sm:text-sm text-gray-500">
                                                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-blue-400 mx-auto mb-3" />
                                                <p className="text-gray-600 font-medium mb-2 text-sm sm:text-base">
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
                                {selectedFile && numberOfDesignsNum > 0 && (
                                    <p className="mt-2 text-xs text-blue-600">
                                        ✓ Your PDF should have exactly {expectedPages} pages ({numberOfDesignsNum} designs × {pagesPerDesign} pages)
                                    </p>
                                )}
                            </div>

                            {/* Price Summary */}
                            {numberOfDesignsNum > 0 && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 sm:p-6">
                                    <div className="flex items-start gap-3 mb-4">
                                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-bold text-base sm:text-lg text-green-900 mb-2">Price Calculation</p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-green-700">Price per Design:</span>
                                                    <span className="font-semibold text-green-900">₹{totalPrice.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-green-700">Number of Designs:</span>
                                                    <span className="font-semibold text-green-900">×{numberOfDesignsNum}</span>
                                                </div>
                                                <div className="border-t-2 border-green-300 pt-2 mt-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-green-900">Total Amount:</span>
                                                        <span className="text-xl sm:text-2xl font-bold text-green-600">
                                                            ₹{totalBulkPrice.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/60 rounded-lg p-3 text-xs text-green-800">
                                        <p className="font-medium mb-1">📦 What happens next:</p>
                                        <ul className="space-y-1 ml-4">
                                            <li>• Your PDF will be split into {numberOfDesignsNum} separate orders</li>
                                            <li>• Each order will have {selectedQuantity.toLocaleString()} copies</li>
                                            <li>• You can track each design separately</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {errorMessage && (
                                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-red-800">
                                        <AlertCircle className="w-5 h-5" />
                                        <p className="font-medium">{errorMessage}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Success State */
                        <div className="text-center py-12">
                            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
                            <h3 className="text-2xl font-bold text-green-900 mb-2">Upload Successful!</h3>
                            <p className="text-green-700 mb-4">
                                Processing {numberOfDesignsNum} designs...
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4 max-w-md mx-auto">
                                <div className="bg-green-600 h-2 rounded-full animate-pulse w-full"></div>
                            </div>
                            <p className="text-sm text-gray-600">Redirecting to order confirmation...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!uploadSuccess && (
                    <div className="border-t border-gray-200 px-6 sm:px-8 py-4 bg-gray-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <button
                            onClick={handleClose}
                            disabled={uploading}
                            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={uploading || !selectedFile || numberOfDesignsNum < 1}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl order-1 sm:order-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="w-5 h-5" />
                                    Place Bulk Order
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default BulkOrderWizard;
