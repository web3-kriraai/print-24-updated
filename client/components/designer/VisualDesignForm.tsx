import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface VisualDesignFormProps {
    orderId?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onSubmitData?: (data: { designTitle: string; designDescription: string; logo?: File; photo?: File }) => void;
}

const VisualDesignForm: React.FC<VisualDesignFormProps> = ({ orderId, onSuccess, onCancel, onSubmitData }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [logo, setLogo] = useState<File | null>(null);
    const [photo, setPhoto] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) {
            toast.error('Title and description are required');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('designTitle', title);
        formData.append('designDescription', description);
        if (logo) formData.append('logo', logo);
        if (photo) formData.append('photo', photo);

        try {
            if (!orderId) {
                // Pre-order mode: Just return the data
                if (onSubmitData) {
                    onSubmitData({
                        designTitle: title,
                        designDescription: description,
                        logo: logo || undefined,
                        photo: photo || undefined
                    });
                    onSuccess();
                }
                return;
            }

            const response = await fetch(`/api/designer-orders/${orderId}/design-form`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to submit design form');

            toast.success('Design requirements submitted successfully!');
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Visual Design Requirements</h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Design Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g., Business Card Design, Logo Package"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Detailed Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-32 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        placeholder="Describe your design needs, color preferences, etc."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Logo (Optional)</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setLogo(e.target.files?.[0] || null)}
                                className="hidden"
                                id="logo-upload"
                            />
                            <label
                                htmlFor="logo-upload"
                                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${logo ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-500 hover:bg-gray-50'
                                    }`}
                            >
                                {logo ? (
                                    <>
                                        <CheckCircle className="text-blue-500 mb-2" size={24} />
                                        <span className="text-xs text-blue-700 font-medium truncate w-full text-center">{logo.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="text-gray-400 mb-2 group-hover:text-blue-500" size={24} />
                                        <span className="text-xs text-gray-500 text-center">Upload Logo</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Reference Photo (Optional)</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                className="hidden"
                                id="photo-upload"
                            />
                            <label
                                htmlFor="photo-upload"
                                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${photo ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-500 hover:bg-gray-50'
                                    }`}
                            >
                                {photo ? (
                                    <>
                                        <CheckCircle className="text-purple-500 mb-2" size={24} />
                                        <span className="text-xs text-purple-700 font-medium truncate w-full text-center">{photo.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="text-gray-400 mb-2 group-hover:text-purple-500" size={24} />
                                        <span className="text-xs text-gray-500 text-center">Upload Photo</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            'Submit Design'
                        )}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default VisualDesignForm;
