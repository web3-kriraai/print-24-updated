import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, MapPin, FileImage, Loader, Phone } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

interface CorporateFormProps {
    onBack: () => void;
    onSuccess: (email: string) => void;
}

const CorporateForm: React.FC<CorporateFormProps> = ({ onBack, onSuccess }) => {
    const [formData, setFormData] = useState({
        organizationName: '',
        organizationType: '',
        authorizedPersonName: '',
        designation: '',
        mobileNumber: '',
        whatsappNumber: '',
        officialEmail: '',
        gstNumber: '',
        fullAddress: '',
        city: '',
        state: '',
        pincode: '',
        password: '',
        confirmPassword: '',
        proofFile: null as File | null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const organizationTypes = [
        'PRIVATE_LIMITED',
        'LLP',
        'LIMITED',
        'GOVERNMENT',
        'HOSPITAL',
        'SCHOOL',
        'INSTITUTE',
        'NGO',
        'FRANCHISE',
        'OTHER',
    ];

    const designations = [
        'PURCHASE_MANAGER',
        'MARKETING_HEAD',
        'ADMIN',
        'FINANCE_MANAGER',
        'DIRECTOR',
        'OTHER',
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setErrors((prev) => ({ ...prev, proofFile: 'Please upload an image file' }));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setErrors((prev) => ({ ...prev, proofFile: 'File size must be less than 5MB' }));
                return;
            }
            setFormData((prev) => ({ ...prev, proofFile: file }));
            setErrors((prev) => ({ ...prev, proofFile: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.organizationName.trim()) newErrors.organizationName = 'Organization name is required';
        if (!formData.organizationType) newErrors.organizationType = 'Organization type is required';
        if (!formData.authorizedPersonName.trim()) newErrors.authorizedPersonName = 'Authorized person name is required';
        if (!formData.designation) newErrors.designation = 'Designation is required';
        if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
        if (!formData.officialEmail.trim()) newErrors.officialEmail = 'Official email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.officialEmail)) newErrors.officialEmail = 'Invalid email address';
        if (!formData.gstNumber.trim()) newErrors.gstNumber = 'GST number is required';
        if (!formData.fullAddress.trim()) newErrors.fullAddress = 'Full address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
        else if (formData.pincode.length !== 6) newErrors.pincode = 'Pincode must be 6 digits';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.confirmPassword !== formData.password) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.proofFile) newErrors.proofFile = 'Please upload proof document';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);

        try {
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'proofFile' && value) {
                    submitData.append(key, value);
                } else if (key !== 'proofFile' && key !== 'confirmPassword') {
                    submitData.append(key, value as string);
                }
            });

            const response = await fetch(`${API_BASE_URL_WITH_API}/auth/submit-corporate-request`, {
                method: 'POST',
                body: submitData,
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Failed to submit request. Please try again.');
                setIsSubmitting(false);
                return;
            }

            // Success - trigger email verification
            onSuccess(formData.officialEmail);
        } catch (err) {
            console.error(err);
            alert('Server error. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900">
                    Corporate Registration
                </h2>
                <p className="mt-2 text-sm text-cream-600">
                    Register your organization for corporate pricing
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Organization Name */}
                <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Organization Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        className={`w-full px-3 py-3 border ${errors.organizationName ? 'border-red-300' : 'border-cream-200'
                            } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                        placeholder="Enter organization name"
                    />
                    {errors.organizationName && <p className="mt-1 text-xs text-red-500">{errors.organizationName}</p>}
                </div>

                {/* Organization Type */}
                <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Organization Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="organizationType"
                        value={formData.organizationType}
                        onChange={handleChange}
                        className={`w-full px-3 py-3 border ${errors.organizationType ? 'border-red-300' : 'border-cream-200'
                            } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                    >
                        <option value="">Select type</option>
                        {organizationTypes.map((type) => (
                            <option key={type} value={type}>
                                {type.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    {errors.organizationType && <p className="mt-1 text-xs text-red-500">{errors.organizationType}</p>}
                </div>

                {/* Authorized Person */}
                <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Authorized Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="authorizedPersonName"
                        value={formData.authorizedPersonName}
                        onChange={handleChange}
                        className={`w-full px-3 py-3 border ${errors.authorizedPersonName ? 'border-red-300' : 'border-cream-200'
                            } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                        placeholder="Enter authorized person name"
                    />
                    {errors.authorizedPersonName && <p className="mt-1 text-xs text-red-500">{errors.authorizedPersonName}</p>}
                </div>

                {/* Designation */}
                <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        className={`w-full px-3 py-3 border ${errors.designation ? 'border-red-300' : 'border-cream-200'
                            } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                    >
                        <option value="">Select designation</option>
                        {designations.map((des) => (
                            <option key={des} value={des}>
                                {des.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    {errors.designation && <p className="mt-1 text-xs text-red-500">{errors.designation}</p>}
                </div>

                {/* Mobile & WhatsApp */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.mobileNumber ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="Mobile number"
                        />
                        {errors.mobileNumber && <p className="mt-1 text-xs text-red-500">{errors.mobileNumber}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">WhatsApp Number</label>
                        <input
                            name="whatsappNumber"
                            value={formData.whatsappNumber}
                            onChange={handleChange}
                            className="w-full px-3 py-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900"
                            placeholder="WhatsApp number"
                        />
                    </div>
                </div>

                {/* Email & GST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            Official Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="officialEmail"
                            type="email"
                            value={formData.officialEmail}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.officialEmail ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="Official email"
                        />
                        {errors.officialEmail && <p className="mt-1 text-xs text-red-500">{errors.officialEmail}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            GST Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="gstNumber"
                            value={formData.gstNumber}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.gstNumber ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="GST number"
                        />
                        {errors.gstNumber && <p className="mt-1 text-xs text-red-500">{errors.gstNumber}</p>}
                    </div>
                </div>

                {/* Address Fields */}
                <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Full Office Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="fullAddress"
                        value={formData.fullAddress}
                        onChange={handleChange}
                        className={`w-full px-3 py-3 border ${errors.fullAddress ? 'border-red-300' : 'border-cream-200'
                            } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                        placeholder="Full address"
                    />
                    {errors.fullAddress && <p className="mt-1 text-xs text-red-500">{errors.fullAddress}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            City <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.city ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="City"
                        />
                        {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            State <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.state ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="State"
                        />
                        {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            Pincode <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            maxLength={6}
                            className={`w-full px-3 py-3 border ${errors.pincode ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="Pincode"
                        />
                        {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>}
                    </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.password ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="Password"
                        />
                        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cream-700 mb-1">
                            Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`w-full px-3 py-3 border ${errors.confirmPassword ? 'border-red-300' : 'border-cream-200'
                                } rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900`}
                            placeholder="Confirm password"
                        />
                        {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                    </div>
                </div>

                {/* Proof Upload */}
                <div>
                    <label className="block text-sm font-medium text-cream-700 mb-1">
                        Upload Proof (Letterhead/PO/ID) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-3 py-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-cream-900"
                    />
                    {errors.proofFile && <p className="mt-1 text-xs text-red-500">{errors.proofFile}</p>}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-cream-900 text-cream-50 py-3 rounded-xl font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader className="h-5 w-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit for Verification'
                    )}
                </button>
            </form>
        </div>
    );
};

export default CorporateForm;