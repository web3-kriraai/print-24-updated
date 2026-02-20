/**
 * COMPLAINT MANAGEMENT SYSTEM - Frontend Component
 * RegisterComplaint.tsx
 * Created: 2026-02-04
 * 
 * Page for registering new complaints
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, CheckCircle2, FileText, Camera, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// TypeScript interfaces
interface ImageUpload {
    url: string;
    thumbnailUrl: string;
    file: File;
}

interface FormData {
    complaintType: string;
    description: string;
    images: ImageUpload[];
    policyConfirmed: boolean;
}

interface FormErrors {
    complaintType?: string;
    description?: string;
    images?: string;
    policyConfirmed?: string;
    api?: string;
}


const RegisterComplaint = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [eligibility, setEligibility] = useState<any>(null);
    const [existingComplaint, setExistingComplaint] = useState<any>(null);
    const [showReopenModal, setShowReopenModal] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        complaintType: '',
        description: '',
        images: [],
        policyConfirmed: false,
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const complaintTypes = [
        { value: 'PRINTING_QUALITY', label: 'Printing Quality Issue' },
        { value: 'WRONG_CONTENT', label: 'Wrong Content/Design' },
        { value: 'QUANTITY_ISSUE', label: 'Quantity Issue' },
        { value: 'ORDER_DELAY', label: 'Order Delay' },
        { value: 'WRONG_PRODUCT', label: 'Wrong Product Delivered' },
        { value: 'OTHER', label: 'Other' },
    ];

    // Check eligibility on mount
    useEffect(() => {
        checkEligibility();
    }, [orderId]);

    const checkEligibility = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/complaints/check-eligibility/${orderId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            const data = await response.json();

            if (data.eligibility === false || data.eligible === false) {
                // Handle existing complaint
                if (data.existingComplaint) {
                    setExistingComplaint(data);
                    if (data.status === 'CLOSED' || data.status === 'REJECTED') {
                        setShowReopenModal(true);
                    } else {
                        // Show clear message then redirect to existing complaint
                        const complaintId = data.existingComplaint._id || data.existingComplaint.id || data.complaintId;

                        // Show toast-style alert
                        alert(
                            '⚠️ Complaint Already Exists\n\n' +
                            'A complaint has already been registered for this order.\n\n' +
                            'You cannot create a new complaint for the same order.\n\n' +
                            'You will be redirected to view and continue the existing complaint.'
                        );

                        // Redirect after user acknowledges
                        navigate(`/complaints/${complaintId}`);
                    }
                } else {
                    // Time limit exceeded
                    setEligibility({ eligible: false, message: data.message });
                }
            } else {
                setEligibility(data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Eligibility check error:', error);
            setEligibility({ eligible: false, message: 'Failed to check eligibility' });
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];

        console.log('📸 Image upload started, files selected:', files.length);

        if (files.length + formData.images.length > 5) {
            setErrors({ ...errors, images: 'Maximum 5 images allowed' });
            return;
        }

        // Clear previous errors
        setErrors({ ...errors, images: undefined });

        // ✅ FIXED: Upload to Cloudinary via backend endpoint
        setUploading(true);  // Show loading state
        setUploadProgress({ current: 0, total: files.length });
        const uploadedImages: ImageUpload[] = [];
        const token = localStorage.getItem('token');

        console.log('🔑 Token available:', !!token);
        console.log('🌐 API URL:', API_URL);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgress({ current: i + 1, total: files.length });

            try {
                console.log(`\n📤 Uploading file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    console.error('❌ File too large:', file.name);
                    setErrors({ ...errors, images: `File ${file.name} is too large. Max 5MB.` });
                    continue;
                }

                // Upload to backend (which uploads to Cloudinary)
                const formDataUpload = new FormData();
                formDataUpload.append('image', file);

                console.log('⬆️ Sending upload request to:', `${API_URL}/upload-image`);

                const uploadResponse = await fetch(`${API_URL}/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formDataUpload,
                });

                console.log('📡 Upload response status:', uploadResponse.status, uploadResponse.statusText);

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json().catch(() => ({}));
                    console.error('❌ Upload failed:', errorData);
                    throw new Error(errorData.error || errorData.message || `Upload failed with status ${uploadResponse.status}`);
                }

                const uploadData = await uploadResponse.json();
                console.log('✅ Upload response data:', uploadData);

                const imageUrl = uploadData.url || uploadData.secure_url;

                if (!imageUrl) {
                    console.error('❌ No URL in response:', uploadData);
                    throw new Error('No image URL returned from server');
                }

                console.log('🎉 Image uploaded successfully:', imageUrl);

                uploadedImages.push({
                    url: imageUrl,
                    thumbnailUrl: imageUrl, // Cloudinary URL can be used directly
                    file: file,
                });

            } catch (error) {
                console.error('💥 Image upload error for', file.name, ':', error);
                setErrors({
                    ...errors,
                    images: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                // Continue with other files
            }
        }

        console.log(`\n✅ Upload complete! ${uploadedImages.length}/${files.length} images successfully uploaded`);

        if (uploadedImages.length > 0) {
            setFormData({ ...formData, images: [...formData.images, ...uploadedImages] });
        }

        setUploading(false);  // Hide loading state
    };

    const removeImage = (index: number) => {
        setFormData({
            ...formData,
            images: formData.images.filter((_, i) => i !== index),
        });
    };

    const validateForm = () => {
        const newErrors: FormErrors = {};

        if (!formData.complaintType) {
            newErrors.complaintType = 'Please select a complaint type';
        }

        if (!formData.description || formData.description.trim().length < 10) {
            newErrors.description = 'Description must be at least 10 characters';
        }

        if (!formData.policyConfirmed) {
            newErrors.policyConfirmed = 'You must accept the complaint policy';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setErrors({ api: 'Please login to continue' });
                return;
            }

            // Upload images first if any
            // (Implementation depends on your image upload service)

            const response = await fetch(`${API_URL}/complaints/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    orderId,
                    complaintType: formData.complaintType,
                    description: formData.description,
                    images: formData.images.map(img => img.url),
                    policyConfirmed: formData.policyConfirmed,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `Server error: ${response.status}`);
            }

            if (data.success) {
                navigate(`/complaints/${data.complaintId}`);
            }
        } catch (error) {
            console.error('Error registering complaint:', error);
            setErrors({ api: error instanceof Error ? error.message : 'Failed to register complaint' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleReopen = () => {
        navigate(`/complaints/${existingComplaint.complaintId}`);
        // The reopen action will be handled in the ComplaintDetails page
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Show reopen modal for closed complaints
    if (showReopenModal) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-yellow-600 mt-1" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                Existing Complaint Found
                            </h2>
                            <p className="text-gray-700 mb-4">
                                {existingComplaint.message}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleReopen}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    View Complaint
                                </button>
                                <button
                                    onClick={() => navigate('/my-orders')}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                >
                                    Back to Orders
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!eligibility?.eligible) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                Cannot Register Complaint
                            </h2>
                            <p className="text-gray-700">
                                {eligibility?.message || 'You are not eligible to register a complaint for this order.'}
                            </p>
                            <button
                                onClick={() => navigate('/my-orders')}
                                className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Back to Orders
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Register Complaint
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>Order: {eligibility?.order?.orderNumber}</span>
                        <span className="mx-2">•</span>
                        <span>{eligibility?.order?.productName}</span>
                    </div>
                </div>

                {/* Policy Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-semibold mb-1">Important Policy</p>
                            <p>If the mistake is from your confirmed file or design, reprint will not be provided. Only company mistakes are eligible for reprint as per company policy.</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Complaint Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Complaint Type *
                        </label>
                        <select
                            value={formData.complaintType}
                            onChange={(e) => setFormData({ ...formData, complaintType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Select complaint type</option>
                            {complaintTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {errors.complaintType && (
                            <p className="text-red-600 text-sm mt-1">{errors.complaintType}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={5}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Please describe the issue in detail..."
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {formData.description.length}/500 characters (minimum 10)
                        </p>
                        {errors.description && (
                            <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                        )}
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Images (Max 5)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            {formData.images.map((img, index) => (
                                <div key={index} className="relative">
                                    <img
                                        src={img.url}
                                        alt={`Upload ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {formData.images.length < 5 && (
                                <label className={`border-2 border-dashed border-gray-300 rounded-lg h-32 flex flex-col items-center justify-center ${uploading ? 'cursor-wait bg-indigo-50 border-indigo-300' : 'cursor-pointer hover:border-indigo-500 hover:bg-indigo-50'}`}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-8 h-8 text-indigo-600 mb-2 animate-spin" />
                                            <span className="text-sm font-semibold text-indigo-600">
                                                Uploading {uploadProgress.current}/{uploadProgress.total}
                                            </span>
                                            <span className="text-xs text-indigo-500 mt-1">
                                                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% Complete
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500">Upload Image</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                        {errors.images && (
                            <p className="text-red-600 text-sm">{errors.images}</p>
                        )}
                    </div>

                    {/* Policy Confirmation */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            id="policyConfirmed"
                            checked={formData.policyConfirmed}
                            onChange={(e) => setFormData({ ...formData, policyConfirmed: e.target.checked })}
                            className="mt-1"
                        />
                        <label htmlFor="policyConfirmed" className="text-sm text-gray-700 flex-1">
                            I understand that if the mistake is from your confirmed file or design, reprint will not be provided. Only company mistakes are eligible for reprint as per company policy. *
                        </label>
                    </div>
                    {errors.policyConfirmed && (
                        <p className="text-red-600 text-sm">{errors.policyConfirmed}</p>
                    )}

                    {/* API Error */}
                    {errors.api && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800">{errors.api}</p>
                        </div>
                    )}

                    {/* Submit Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Register Complaint
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterComplaint;
