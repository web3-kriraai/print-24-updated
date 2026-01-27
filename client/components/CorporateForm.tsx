import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, MapPin, FileImage, Loader, Phone, Lock, Briefcase } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

interface CorporateFormProps {
    onBack: () => void;
    onSuccess: (email: string) => void;
    verifiedEmail?: string;
}

const CorporateForm: React.FC<CorporateFormProps> = ({ onBack, onSuccess, verifiedEmail }) => {
    const [formData, setFormData] = useState({
        organizationName: '',
        organizationType: '',
        authorizedPersonName: '',
        designation: '',
        mobileNumber: '',
        whatsappNumber: '',
        officialEmail: verifiedEmail || '',
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
                    submitData.append(key, value as File);
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
                if (response.status === 409 && data.conflictField) {
                    const fieldMap: Record<string, string> = {
                        email: 'officialEmail',
                        mobileNumber: 'mobileNumber',
                        gstNumber: 'gstNumber'
                    };
                    const formField = fieldMap[data.conflictField] || data.conflictField;
                    setErrors(prev => ({ ...prev, [formField]: data.message }));

                    // Scroll to the error field
                    const element = document.getElementsByName(formField)[0];
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } else {
                    alert(data.message || 'Failed to submit request. Please try again.');
                }
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
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25"
                >
                    <Building2 className="h-8 w-8 text-white" />
                </motion.div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                    Corporate Registration
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                    Register your organization for corporate pricing
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Organization Name */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Organization Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3.5 border-2 ${errors.organizationName ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                        placeholder="Enter organization name"
                    />
                    {errors.organizationName && <p className="mt-1.5 text-xs text-red-400">{errors.organizationName}</p>}
                </motion.div>

                {/* Organization Type */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Organization Type <span className="text-red-400">*</span>
                    </label>
                    <select
                        name="organizationType"
                        value={formData.organizationType}
                        onChange={handleChange}
                        className={`w-full px-4 py-3.5 border-2 ${errors.organizationType ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 appearance-none cursor-pointer`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                        <option value="" className="bg-slate-800">Select type</option>
                        {organizationTypes.map((type) => (
                            <option key={type} value={type} className="bg-slate-800">
                                {type.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    {errors.organizationType && <p className="mt-1.5 text-xs text-red-400">{errors.organizationType}</p>}
                </motion.div>

                {/* Authorized Person */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Authorized Person Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        name="authorizedPersonName"
                        value={formData.authorizedPersonName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3.5 border-2 ${errors.authorizedPersonName ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                        placeholder="Enter authorized person name"
                    />
                    {errors.authorizedPersonName && <p className="mt-1.5 text-xs text-red-400">{errors.authorizedPersonName}</p>}
                </motion.div>

                {/* Designation */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Designation <span className="text-red-400">*</span>
                    </label>
                    <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        className={`w-full px-4 py-3.5 border-2 ${errors.designation ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 appearance-none cursor-pointer`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                        <option value="" className="bg-slate-800">Select designation</option>
                        {designations.map((des) => (
                            <option key={des} value={des} className="bg-slate-800">
                                {des.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    {errors.designation && <p className="mt-1.5 text-xs text-red-400">{errors.designation}</p>}
                </motion.div>

                {/* Mobile & WhatsApp */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Mobile Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 border-2 ${errors.mobileNumber ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="Mobile number"
                        />
                        {errors.mobileNumber && <p className="mt-1.5 text-xs text-red-400">{errors.mobileNumber}</p>}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp Number</label>
                        <input
                            name="whatsappNumber"
                            value={formData.whatsappNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-3.5 border-2 border-slate-600 bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300"
                            placeholder="WhatsApp number"
                        />
                    </motion.div>
                </div>

                {/* Email & GST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Official Email <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="officialEmail"
                            type="email"
                            value={formData.officialEmail}
                            onChange={handleChange}
                            readOnly={!!verifiedEmail}
                            className={`w-full px-4 py-3.5 border-2 ${errors.officialEmail ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300 ${verifiedEmail ? 'opacity-60 cursor-not-allowed' : ''}`}
                            placeholder="Official email"
                        />
                        {errors.officialEmail && <p className="mt-1.5 text-xs text-red-400">{errors.officialEmail}</p>}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            GST Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="gstNumber"
                            value={formData.gstNumber}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 border-2 ${errors.gstNumber ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="GST number"
                        />
                        {errors.gstNumber && <p className="mt-1.5 text-xs text-red-400">{errors.gstNumber}</p>}
                    </motion.div>
                </div>

                {/* Address Fields */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Full Office Address <span className="text-red-400">*</span>
                    </label>
                    <input
                        name="fullAddress"
                        value={formData.fullAddress}
                        onChange={handleChange}
                        className={`w-full px-4 py-3.5 border-2 ${errors.fullAddress ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                        placeholder="Full address"
                    />
                    {errors.fullAddress && <p className="mt-1.5 text-xs text-red-400">{errors.fullAddress}</p>}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            City <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 border-2 ${errors.city ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="City"
                        />
                        {errors.city && <p className="mt-1.5 text-xs text-red-400">{errors.city}</p>}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            State <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 border-2 ${errors.state ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="State"
                        />
                        {errors.state && <p className="mt-1.5 text-xs text-red-400">{errors.state}</p>}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.65 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Pincode <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            maxLength={6}
                            className={`w-full px-4 py-3.5 border-2 ${errors.pincode ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="Pincode"
                        />
                        {errors.pincode && <p className="mt-1.5 text-xs text-red-400">{errors.pincode}</p>}
                    </motion.div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 border-2 ${errors.password ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="Password"
                        />
                        {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.75 }}
                    >
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Confirm Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className={`w-full px-4 py-3.5 border-2 ${errors.confirmPassword ? 'border-red-500/50' : 'border-slate-600'} bg-slate-900/50 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300`}
                            placeholder="Confirm password"
                        />
                        {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>}
                    </motion.div>
                </div>

                {/* Proof Upload */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Upload Proof (Letterhead/PO/ID) <span className="text-red-400">*</span>
                    </label>
                    <div className={`relative border-2 border-dashed ${errors.proofFile ? 'border-red-500/50' : 'border-slate-600'} rounded-xl p-4 hover:border-cyan-500/50 transition-colors cursor-pointer`}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="text-center">
                            <FileImage className="mx-auto h-10 w-10 text-slate-500 mb-2" />
                            <p className="text-sm text-slate-400">
                                {formData.proofFile ? formData.proofFile.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                    </div>
                    {errors.proofFile && <p className="mt-1.5 text-xs text-red-400">{errors.proofFile}</p>}
                </motion.div>

                {/* Submit Button */}
                <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                    className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 text-white py-3.5 rounded-xl font-medium hover:from-cyan-400 hover:to-teal-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                >
                    {isSubmitting ? (
                        <>
                            <Loader className="h-5 w-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit for Verification'
                    )}
                </motion.button>
            </form>
        </div>
    );
};

export default CorporateForm;