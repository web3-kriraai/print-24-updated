import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Trash2, Plus, Loader, Sparkles, X, Palette, Settings, Layers } from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { Select } from "../../../../components/ui/select";
import toast from "react-hot-toast";

interface OptionUsage {
    price?: boolean;
    image?: boolean;
    listing?: boolean;
}

interface AttributeOption {
    name: string;
    priceImpactPer1000?: string;
    image?: string;
    optionUsage?: OptionUsage;
    priceImpact?: string;
    numberOfImagesRequired?: number;
    imageFileNames?: string[];
    listingFilters?: string;
}

interface StepQuantity {
    quantity: string;
    price: string;
}

interface RangeQuantity {
    min: string;
    max: string;
    price: string;
}

interface AttributeTypeForm {
    attributeName: string;
    systemName: string;
    inputStyle: string;
    attributeImage: File | null;
    effectDescription: string;
    simpleOptions: string;
    isPriceEffect: boolean;
    isStepQuantity: boolean;
    isRangeQuantity: boolean;
    isFixedQuantity: boolean;
    priceEffectAmount: string;
    stepQuantities: StepQuantity[];
    rangeQuantities: RangeQuantity[];
    fixedQuantityMin: string;
    fixedQuantityMax: string;
    primaryEffectType: string;
    priceImpactPer1000: string;
    fileRequirements: string;
    attributeOptionsTable: AttributeOption[];
    functionType: string;
    isPricingAttribute: boolean;
    isFixedQuantityNeeded: boolean;
    isFilterable: boolean;
    attributeValues: any[];
    defaultValue: string;
    isRequired: boolean;
    displayOrder: number;
    isCommonAttribute: boolean;
    applicableCategories: any[];
    applicableSubCategories: any[];
    parentAttribute: string;
    showWhenParentValue: any[];
    hideWhenParentValue: any[];
    existingImage?: string | null;
}

interface CreateAttributeModalProps {
    isOpen: boolean;
    onClose: () => void;
    attributeTypeForm: AttributeTypeForm;
    setAttributeTypeForm: React.Dispatch<React.SetStateAction<AttributeTypeForm>>;
    attributeFormErrors: any;
    setAttributeFormErrors: (errors: any) => void;
    editingAttributeTypeId: string | null;
    setEditingAttributeTypeId: (id: string | null) => void;
    handleAttributeTypeSubmit: (e: React.FormEvent) => Promise<boolean>;
    error: string | null;
    setError: (error: string | null) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    getAuthHeaders: () => HeadersInit;
    onSuccess?: () => void; // Optional callback when attribute is successfully created/updated
}

const CreateAttributeModal: React.FC<CreateAttributeModalProps> = ({
    isOpen,
    onClose,
    attributeTypeForm,
    setAttributeTypeForm,
    attributeFormErrors,
    setAttributeFormErrors,
    editingAttributeTypeId,
    setEditingAttributeTypeId,
    handleAttributeTypeSubmit,
    error,
    setError,
    loading,
    setLoading,
    getAuthHeaders,
    onSuccess,
}) => {
    const handleClose = () => {
        if (!loading) {
            setEditingAttributeTypeId(null);
            setAttributeTypeForm({
                attributeName: "",
                systemName: "",
                inputStyle: "DROPDOWN",
                attributeImage: null,
                effectDescription: "",
                simpleOptions: "",
                isPriceEffect: false,
                isStepQuantity: false,
                isRangeQuantity: false,
                isFixedQuantity: false,
                priceEffectAmount: "",
                stepQuantities: [],
                rangeQuantities: [],
                fixedQuantityMin: "",
                fixedQuantityMax: "",
                primaryEffectType: "INFORMATIONAL",
                priceImpactPer1000: "",
                fileRequirements: "",
                attributeOptionsTable: [],
                functionType: "GENERAL",
                isPricingAttribute: false,
                isFixedQuantityNeeded: false,
                isFilterable: false,
                attributeValues: [],
                defaultValue: "",
                isRequired: false,
                displayOrder: 0,
                isCommonAttribute: true,
                applicableCategories: [],
                applicableSubCategories: [],
                parentAttribute: "",
                showWhenParentValue: [],
                hideWhenParentValue: [],
            });
            onClose();
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent any parent form handlers

        try {
            // Call parent submit handler - it returns true on success, false on error
            const success = await handleAttributeTypeSubmit(e);

            // Only show toast and close modal if submission was successful
            if (success) {
                const message = editingAttributeTypeId
                    ? 'Attribute type updated successfully!'
                    : 'Attribute type created successfully!';

                // Show toast with prominent styling
                toast.success(message, {
                    duration: 5000,
                    position: 'top-center',
                    icon: '✅',
                    style: {
                        background: '#10B981',
                        color: 'white',
                        fontWeight: 'bold',
                        padding: '16px',
                        borderRadius: '10px',
                    },
                });

                // Call onSuccess callback to refresh parent's attribute list
                if (onSuccess) {
                    onSuccess();
                }

                // Close modal after a brief delay to let user see the success message
                setTimeout(() => {
                    handleClose();
                }, 500);
            } else {
                // Validation failed - scroll to top to show error message
                const modalContent = document.querySelector('.max-h-\\[90vh\\].overflow-y-auto');
                if (modalContent) {
                    modalContent.scrollTo({ top: 0, behavior: 'smooth' });
                }

                // Show error toast
                toast.error('Please fix the errors below', {
                    duration: 4000,
                    position: 'top-center',
                });
            }
            // Modal stays open if success is false
        } catch (err) {
            // Additional error handling if needed
            console.error('Error submitting form:', err);
            toast.error('An unexpected error occurred', {
                duration: 4000,
                position: 'top-center',
            });

            // Scroll to top to show error
            const modalContent = document.querySelector('.max-h-\\[90vh\\].overflow-y-auto');
            if (modalContent) {
                modalContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 border-b border-white/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-lg">
                                        <Palette size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {editingAttributeTypeId ? "Edit Attribute Type" : "Create Attribute Type"}
                                        </h2>
                                        <p className="text-white/90 text-sm">
                                            {editingAttributeTypeId
                                                ? "Modify your attribute type configuration"
                                                : "Define a new attribute type with custom properties and behaviors"
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
                            {/* Error/Success Messages */}
                            {error && (
                                <div className="animate-slideDown p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 rounded-full">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        </div>
                                        <p className="text-sm text-red-800 font-medium">{error}</p>
                                    </div>
                                </div>
                            )}



                            {/* Basic Information Section */}
                            <div className="border border-gray-100 rounded-xl p-6 bg-white hover:bg-gray-50/50 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                                        <p className="text-xs text-gray-500 mt-1">Core details about your attribute type</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Attribute Name * <span className="text-xs text-gray-500 font-normal">(What customers will see)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={attributeTypeForm.attributeName}
                                            onChange={(e) => {
                                                setAttributeTypeForm({ ...attributeTypeForm, attributeName: e.target.value });
                                                if (attributeFormErrors.attributeName) {
                                                    setAttributeFormErrors({ ...attributeFormErrors, attributeName: undefined });
                                                }
                                            }}
                                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 ${attributeFormErrors.attributeName ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-indigo-300'
                                                }`}
                                            placeholder="e.g., Printing Option, Paper Type"
                                            required
                                        />
                                        {attributeFormErrors.attributeName && (
                                            <p className="mt-2 text-sm text-red-600 animate-pulse">{attributeFormErrors.attributeName}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            System Name (Internal)
                                        </label>
                                        <input
                                            type="text"
                                            value={attributeTypeForm.systemName}
                                            onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, systemName: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 hover:border-indigo-300"
                                            placeholder="e.g., paper_type, size_v2"
                                        />
                                        <p className="mt-2 text-xs text-gray-500">
                                            Optional. Used for internal system references or API keys.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            How Customers Select This * <span className="text-xs text-gray-500 font-normal">(Input method)</span>
                                        </label>
                                        <Select
                                            options={[
                                                { value: "DROPDOWN", label: "Dropdown Menu" },
                                                { value: "POPUP", label: "Pop-Up" },
                                                { value: "RADIO", label: "Radio Buttons" },
                                                { value: "CHECKBOX", label: "Checkbox" },
                                                { value: "TEXT_FIELD", label: "Text Field" },
                                                { value: "NUMBER", label: "Number Input" },
                                                { value: "FILE_UPLOAD", label: "File Upload" }
                                            ]}
                                            value={attributeTypeForm.inputStyle}
                                            onValueChange={(val) => {
                                                setAttributeTypeForm({ ...attributeTypeForm, inputStyle: val as string });
                                                if (attributeFormErrors.inputStyle) {
                                                    setAttributeFormErrors({ ...attributeFormErrors, inputStyle: undefined });
                                                }
                                            }}
                                            colorTheme="indigo"
                                            placeholder="Select input style..."
                                            className={attributeFormErrors.inputStyle ? "ring-2 ring-red-300 bg-red-50/50" : ""}
                                        />
                                        {attributeFormErrors.inputStyle && (
                                            <p className="mt-2 text-sm text-red-600 animate-pulse">{attributeFormErrors.inputStyle}</p>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Attribute Image <span className="text-xs text-gray-500 font-normal">(to be shown when selecting this attribute)</span>
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <label className={`flex-1 px-4 py-3 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${attributeTypeForm.attributeImage ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20'}`}>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        if (file) {
                                                            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                                            if (!allowedTypes.includes(file.type)) {
                                                                setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
                                                                e.target.value = '';
                                                                setAttributeTypeForm({ ...attributeTypeForm, attributeImage: null });
                                                                return;
                                                            }
                                                            const maxSize = 5 * 1024 * 1024;
                                                            if (file.size > maxSize) {
                                                                setError("Image size must be less than 5MB. Please compress the image and try again.");
                                                                e.target.value = '';
                                                                setAttributeTypeForm({ ...attributeTypeForm, attributeImage: null });
                                                                return;
                                                            }
                                                            setError(null);
                                                        }
                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeImage: file });
                                                    }}
                                                    className="hidden"
                                                />
                                                <div className="text-center">
                                                    {attributeTypeForm.attributeImage ? (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <div className="p-2 bg-emerald-100 rounded-lg">
                                                                <Sparkles size={16} className="text-emerald-500" />
                                                            </div>
                                                            <span className="text-sm text-emerald-700 font-medium">New image selected ✓</span>
                                                        </div>
                                                    ) : attributeTypeForm.existingImage ? (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                                <Sparkles size={16} className="text-indigo-500" />
                                                            </div>
                                                            <span className="text-sm text-indigo-700 font-medium">Keeping existing image</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-600">Click to upload image (JPG, PNG, WebP)</span>
                                                    )}
                                                </div>
                                            </label>
                                            {(attributeTypeForm.attributeImage || attributeTypeForm.existingImage) && (
                                                <div className="relative group">
                                                    <img
                                                        src={attributeTypeForm.attributeImage
                                                            ? URL.createObjectURL(attributeTypeForm.attributeImage)
                                                            : attributeTypeForm.existingImage || ""
                                                        }
                                                        alt="Attribute preview"
                                                        className="w-24 h-24 object-cover rounded-xl border-2 border-emerald-200 group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        What This Affects * <span className="text-xs text-gray-500 font-normal">(Description of impact on product)</span>
                                    </label>
                                    <textarea
                                        value={attributeTypeForm.effectDescription}
                                        onChange={(e) => {
                                            setAttributeTypeForm({ ...attributeTypeForm, effectDescription: e.target.value });
                                            if (attributeFormErrors.primaryEffectType) {
                                                setAttributeFormErrors({ ...attributeFormErrors, primaryEffectType: undefined });
                                            }
                                        }}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 ${attributeFormErrors.primaryEffectType ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-indigo-300'
                                            }`}
                                        rows={3}
                                        placeholder="e.g., Changes the product price, Requires customer to upload a file, Creates different product versions, Just displays information"
                                        required
                                    />
                                    <p className="mt-2 text-xs text-gray-600">Describe how this attribute affects the product or customer experience</p>
                                    {attributeFormErrors.primaryEffectType && (
                                        <p className="mt-2 text-sm text-red-600 animate-pulse">{attributeFormErrors.primaryEffectType}</p>
                                    )}
                                </div>
                            </div>

                            {/* Options Configuration */}
                            {((attributeTypeForm.inputStyle === "DROPDOWN" || attributeTypeForm.inputStyle === "RADIO") || attributeTypeForm.isPriceEffect) ? (
                                <div className="border border-gray-100 rounded-xl p-6 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg">
                                                <Settings size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800">Options Configuration</h3>
                                                <p className="text-xs text-gray-500 mt-1">Define available options and their properties</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttributeTypeForm({
                                                    ...attributeTypeForm,
                                                    attributeOptionsTable: [...attributeTypeForm.attributeOptionsTable, {
                                                        name: "",
                                                        priceImpactPer1000: "",
                                                        image: undefined,
                                                        optionUsage: { price: false, image: false, listing: false },
                                                        priceImpact: "",
                                                        numberOfImagesRequired: 0,
                                                        listingFilters: ""
                                                    }],
                                                });
                                            }}
                                            className="px-4 py-2.5 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                        >
                                            <Plus size={16} />
                                            Add Option
                                        </button>
                                    </div>

                                    <div className="border border-purple-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                        {attributeTypeForm.attributeOptionsTable.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="inline-flex p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-4">
                                                    <Settings size={24} className="text-purple-500" />
                                                </div>
                                                <p className="text-sm text-gray-600">No options added yet.</p>
                                                <p className="text-xs text-gray-500 mt-1">Click "Add Option" to start defining options</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                {attributeFormErrors.attributeValues && (
                                                    <div className="m-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg">
                                                        <p className="text-sm text-red-800 font-medium">{attributeFormErrors.attributeValues}</p>
                                                    </div>
                                                )}
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                                                            <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">Option Name *</th>
                                                            <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">Option Usage *</th>
                                                            {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.price) && (
                                                                <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">Price Impact</th>
                                                            )}
                                                            {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.image) && (
                                                                <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">Images Required</th>
                                                            )}
                                                            {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.listing) && (
                                                                <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">Listing Filters</th>
                                                            )}
                                                            <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">Image</th>
                                                            <th className="border border-purple-100 px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {attributeTypeForm.attributeOptionsTable.map((option, index) => (
                                                            <tr key={index} className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 transition-all duration-300 group">
                                                                <td className="border border-purple-100 px-4 py-3">
                                                                    <input
                                                                        type="text"
                                                                        value={option.name}
                                                                        onChange={(e) => {
                                                                            const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                            updated[index].name = e.target.value;
                                                                            setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                        }}
                                                                        className="w-full px-3 py-2.5 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all duration-300"
                                                                        placeholder="e.g., Both Sides, Express Delivery"
                                                                        required
                                                                    />
                                                                </td>
                                                                <td className="border border-purple-100 px-4 py-3">
                                                                    <div className="space-y-2">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={option.optionUsage?.price || false}
                                                                                onChange={(e) => {
                                                                                    const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                    if (!updated[index].optionUsage) {
                                                                                        updated[index].optionUsage = { price: false, image: false, listing: false };
                                                                                    }
                                                                                    updated[index].optionUsage!.price = e.target.checked;
                                                                                    setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                }}
                                                                                className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500/30 cursor-pointer"
                                                                            />
                                                                            <span className="text-sm text-gray-700">Price</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={option.optionUsage?.image || false}
                                                                                onChange={(e) => {
                                                                                    const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                    if (!updated[index].optionUsage) {
                                                                                        updated[index].optionUsage = { price: false, image: false, listing: false };
                                                                                    }
                                                                                    updated[index].optionUsage!.image = e.target.checked;
                                                                                    setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                }}
                                                                                className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500/30 cursor-pointer"
                                                                            />
                                                                            <span className="text-sm text-gray-700">Image</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={option.optionUsage?.listing || false}
                                                                                onChange={(e) => {
                                                                                    const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                    if (!updated[index].optionUsage) {
                                                                                        updated[index].optionUsage = { price: false, image: false, listing: false };
                                                                                    }
                                                                                    updated[index].optionUsage!.listing = e.target.checked;
                                                                                    setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                }}
                                                                                className="w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500/30 cursor-pointer"
                                                                            />
                                                                            <span className="text-sm text-gray-700">Listing</span>
                                                                        </label>
                                                                    </div>
                                                                </td>
                                                                {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.price) && (
                                                                    <td className="border border-purple-100 px-4 py-3">
                                                                        {option.optionUsage?.price ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm text-gray-600">₹</span>
                                                                                <input
                                                                                    type="number"
                                                                                    value={option.priceImpact || ""}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                        updated[index].priceImpact = e.target.value;
                                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                    }}
                                                                                    className="w-full px-3 py-2.5 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all duration-300"
                                                                                    placeholder="Enter amount"
                                                                                    step="0.01"
                                                                                    min="0"
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-sm text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.image) && (
                                                                    <td className="border border-purple-100 px-4 py-3">
                                                                        {option.optionUsage?.image ? (
                                                                            <div className="space-y-2">
                                                                                <input
                                                                                    type="number"
                                                                                    value={option.numberOfImagesRequired || 0}
                                                                                    onChange={(e) => {
                                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                        const newCount = parseInt(e.target.value) || 0;
                                                                                        updated[index].numberOfImagesRequired = newCount;
                                                                                        // Resize imageFileNames array to match count
                                                                                        const existing = updated[index].imageFileNames || [];
                                                                                        if (newCount > existing.length) {
                                                                                            // Add empty strings for new slots
                                                                                            updated[index].imageFileNames = [
                                                                                                ...existing,
                                                                                                ...Array(newCount - existing.length).fill("")
                                                                                            ];
                                                                                        } else {
                                                                                            // Trim to new count
                                                                                            updated[index].imageFileNames = existing.slice(0, newCount);
                                                                                        }
                                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                    }}
                                                                                    className="w-full px-3 py-2.5 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-all duration-300"
                                                                                    placeholder="Number of images"
                                                                                    min="0"
                                                                                />
                                                                                {/* Dynamic image file name inputs */}
                                                                                {(option.numberOfImagesRequired || 0) > 0 && (
                                                                                    <div className="space-y-1.5 pt-1 border-t border-pink-100">
                                                                                        <p className="text-xs text-pink-600 font-medium">File Names:</p>
                                                                                        <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                                                                            {Array.from({ length: option.numberOfImagesRequired || 0 }).map((_, fileIdx) => (
                                                                                                <input
                                                                                                    key={fileIdx}
                                                                                                    type="text"
                                                                                                    value={(option.imageFileNames || [])[fileIdx] || ""}
                                                                                                    onChange={(e) => {
                                                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                                        const fileNames = [...(updated[index].imageFileNames || Array(updated[index].numberOfImagesRequired || 0).fill(""))];
                                                                                                        fileNames[fileIdx] = e.target.value;
                                                                                                        updated[index].imageFileNames = fileNames;
                                                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                                    }}
                                                                                                    className="w-full px-2.5 py-1.5 border border-pink-100 rounded-lg text-xs focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-all duration-300 bg-pink-50/30"
                                                                                                    placeholder={`Image ${fileIdx + 1} name`}
                                                                                                />
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-sm text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.listing) && (
                                                                    <td className="border border-purple-100 px-4 py-3">
                                                                        {option.optionUsage?.listing ? (
                                                                            <input
                                                                                type="text"
                                                                                value={option.listingFilters || ""}
                                                                                onChange={(e) => {
                                                                                    const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                    updated[index].listingFilters = e.target.value;
                                                                                    setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                }}
                                                                                className="w-full px-3 py-2.5 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300"
                                                                                placeholder="Enter filters"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-sm text-gray-400">-</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                <td className="border border-purple-100 px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        {option.image && (
                                                                            <div className="relative group/img">
                                                                                <img
                                                                                    src={option.image}
                                                                                    alt={option.name || "Option"}
                                                                                    className="w-10 h-10 object-cover rounded-lg border border-purple-200"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                        updated[index].image = undefined;
                                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                    }}
                                                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                                                    title="Remove image"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        <label className="relative block cursor-pointer group/upload flex-1">
                                                                            <input
                                                                                type="file"
                                                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                                                onChange={async (e) => {
                                                                                    const file = e.target.files?.[0];
                                                                                    if (file) {
                                                                                        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                                                                        if (!validTypes.includes(file.type)) {
                                                                                            setError("Invalid image format");
                                                                                            return;
                                                                                        }
                                                                                        if (file.size > 5 * 1024 * 1024) {
                                                                                            setError("Image size must be less than 5MB");
                                                                                            return;
                                                                                        }

                                                                                        try {
                                                                                            setLoading(true);
                                                                                            const formData = new FormData();
                                                                                            formData.append('image', file);

                                                                                            const uploadResponse = await fetch(`${API_BASE_URL}/upload-image`, {
                                                                                                method: 'POST',
                                                                                                headers: getAuthHeaders(),
                                                                                                body: formData,
                                                                                            });

                                                                                            if (!uploadResponse.ok) {
                                                                                                const errorData = await uploadResponse.json().catch(() => ({}));
                                                                                                throw new Error(errorData.error || 'Failed to upload image');
                                                                                            }

                                                                                            const uploadData = await uploadResponse.json();
                                                                                            const imageUrl = uploadData.url || uploadData.secure_url;

                                                                                            if (!imageUrl) {
                                                                                                throw new Error('No image URL returned');
                                                                                            }

                                                                                            const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                                            updated[index].image = imageUrl;
                                                                                            setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                                            setError(null);
                                                                                        } catch (err) {
                                                                                            console.error("Error uploading image:", err);
                                                                                            setError(err instanceof Error ? err.message : "Failed to upload image");
                                                                                        } finally {
                                                                                            setLoading(false);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="hidden"
                                                                            />
                                                                            <div className="px-3 py-2.5 border border-purple-100 rounded-lg text-sm text-center transition-all duration-300 group-hover/upload:border-purple-400 group-hover/upload:bg-purple-50/50">
                                                                                <span className="text-gray-600 group-hover/upload:text-purple-600">
                                                                                    {option.image ? "Replace" : "Upload"}
                                                                                </span>
                                                                            </div>
                                                                        </label>
                                                                    </div>
                                                                </td>
                                                                <td className="border border-purple-100 px-4 py-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = attributeTypeForm.attributeOptionsTable.filter((_, i) => i !== index);
                                                                            setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                        }}
                                                                        className="p-2 text-red-500 hover:bg-red-50/80 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {/* Additional Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Settings</h3>

                                {/* Price Effect */}
                                <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-300">
                                    <input
                                        type="checkbox"
                                        checked={attributeTypeForm.isPriceEffect}
                                        onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isPriceEffect: e.target.checked })}
                                        className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500/30 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 cursor-pointer">Price Effect</label>
                                        <p className="text-xs text-gray-600 mt-1">Does this attribute change the product price?</p>
                                        {attributeTypeForm.isPriceEffect && (
                                            <div className="mt-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Price Impact (₹ per 1000 units) *</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium">₹</div>
                                                    <input
                                                        type="number"
                                                        value={attributeTypeForm.priceEffectAmount}
                                                        onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, priceEffectAmount: e.target.value })}
                                                        className="flex-1 px-4 py-2.5 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-300"
                                                        placeholder="e.g., 20 (means +₹20 per 1000 units)"
                                                        step="0.00001"
                                                        min="0"
                                                        required={attributeTypeForm.isPriceEffect}
                                                    />
                                                    <span className="text-sm text-gray-500">per 1000 units</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step Quantity */}
                                <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-100 hover:border-purple-200 transition-all duration-300">
                                    <input
                                        type="checkbox"
                                        checked={attributeTypeForm.isStepQuantity}
                                        onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isStepQuantity: e.target.checked })}
                                        className="w-5 h-5 text-purple-500 border-gray-300 rounded focus:ring-purple-500/30 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 cursor-pointer">Step Quantity</label>
                                        <p className="text-xs text-gray-600 mt-1">Restrict quantity to specific steps (e.g., 1000, 2000, 3000 only)</p>
                                        {attributeTypeForm.isStepQuantity && (
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-medium text-gray-700">Steps Configuration</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAttributeTypeForm({
                                                                ...attributeTypeForm,
                                                                stepQuantities: [...attributeTypeForm.stepQuantities, { quantity: "", price: "" }],
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center gap-1"
                                                    >
                                                        <Plus size={14} />
                                                        Add Step
                                                    </button>
                                                </div>
                                                {attributeTypeForm.stepQuantities.map((step, index) => (
                                                    <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-100">
                                                        <span className="text-sm font-medium text-purple-600">Step {index + 1}</span>
                                                        <input
                                                            type="number"
                                                            value={step.quantity}
                                                            onChange={(e) => {
                                                                const updated = [...attributeTypeForm.stepQuantities];
                                                                updated[index].quantity = e.target.value;
                                                                setAttributeTypeForm({ ...attributeTypeForm, stepQuantities: updated });
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-purple-100 rounded-lg text-sm"
                                                            placeholder="quantity"
                                                            min="0"
                                                            step="100"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={step.price}
                                                            onChange={(e) => {
                                                                const updated = [...attributeTypeForm.stepQuantities];
                                                                updated[index].price = e.target.value;
                                                                setAttributeTypeForm({ ...attributeTypeForm, stepQuantities: updated });
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-purple-100 rounded-lg text-sm"
                                                            placeholder="price"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = attributeTypeForm.stepQuantities.filter((_, i) => i !== index);
                                                                setAttributeTypeForm({ ...attributeTypeForm, stepQuantities: updated });
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50/80 rounded-lg transition-all duration-300"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Range Quantity */}
                                <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all duration-300">
                                    <input
                                        type="checkbox"
                                        checked={attributeTypeForm.isRangeQuantity}
                                        onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isRangeQuantity: e.target.checked })}
                                        className="w-5 h-5 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500/30 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 cursor-pointer">Range Quantity</label>
                                        <p className="text-xs text-gray-600 mt-1">Restrict quantity to specific ranges (e.g., 1000-2000, 2000-5000)</p>
                                        {attributeTypeForm.isRangeQuantity && (
                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-medium text-gray-700">Ranges Configuration</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAttributeTypeForm({
                                                                ...attributeTypeForm,
                                                                rangeQuantities: [...attributeTypeForm.rangeQuantities, { min: "", max: "", price: "" }],
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 flex items-center gap-1"
                                                    >
                                                        <Plus size={14} />
                                                        Add Range
                                                    </button>
                                                </div>
                                                {attributeTypeForm.rangeQuantities.map((range, index) => (
                                                    <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-emerald-100">
                                                        <span className="text-sm font-medium text-emerald-600">Range {index + 1}</span>
                                                        <input
                                                            type="number"
                                                            value={range.min}
                                                            onChange={(e) => {
                                                                const updated = [...attributeTypeForm.rangeQuantities];
                                                                updated[index].min = e.target.value;
                                                                setAttributeTypeForm({ ...attributeTypeForm, rangeQuantities: updated });
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-emerald-100 rounded-lg text-sm"
                                                            placeholder="min"
                                                            min="0"
                                                            step="100"
                                                        />
                                                        <span className="text-gray-400">—</span>
                                                        <input
                                                            type="number"
                                                            value={range.max}
                                                            onChange={(e) => {
                                                                const updated = [...attributeTypeForm.rangeQuantities];
                                                                updated[index].max = e.target.value;
                                                                setAttributeTypeForm({ ...attributeTypeForm, rangeQuantities: updated });
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-emerald-100 rounded-lg text-sm"
                                                            placeholder="max"
                                                            min="0"
                                                            step="100"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={range.price}
                                                            onChange={(e) => {
                                                                const updated = [...attributeTypeForm.rangeQuantities];
                                                                updated[index].price = e.target.value;
                                                                setAttributeTypeForm({ ...attributeTypeForm, rangeQuantities: updated });
                                                            }}
                                                            className="flex-1 px-3 py-2 border border-emerald-100 rounded-lg text-sm"
                                                            placeholder="price"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = attributeTypeForm.rangeQuantities.filter((_, i) => i !== index);
                                                                setAttributeTypeForm({ ...attributeTypeForm, rangeQuantities: updated });
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50/80 rounded-lg transition-all duration-300"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 group"
                                >
                                    {loading ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} className="group-hover:animate-pulse" />
                                            <span>{editingAttributeTypeId ? "Update Attribute Type" : "Create Attribute Type"}</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 shadow hover:shadow-md disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CreateAttributeModal;
