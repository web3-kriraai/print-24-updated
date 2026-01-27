import React, { useState, useMemo, useEffect } from "react";
import { Edit, Trash2, Plus, Search, Loader, Sparkles, ChevronRight, Palette, Settings, Layers, Copy } from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { Select } from "../../../../components/ui/select";

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
    // Auto-set fields
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

interface ManageAttributeTypesProps {
    attributeTypeForm: AttributeTypeForm;
    setAttributeTypeForm: React.Dispatch<React.SetStateAction<AttributeTypeForm>>;
    attributeFormErrors: any;
    setAttributeFormErrors: (errors: any) => void;
    editingAttributeTypeId: string | null;
    setEditingAttributeTypeId: (id: string | null) => void;
    handleAttributeTypeSubmit: (e: React.FormEvent) => Promise<void>;
    handleEditAttributeType: (id: string) => void;
    handleDeleteAttributeType: (id: string) => Promise<void>;
    handleDuplicateAttributeType: (id: string, customName?: string) => Promise<boolean | void>;
    error: string | null;
    setError: (error: string | null) => void;
    success: string | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    attributeTypeSearch: string;
    setAttributeTypeSearch: (search: string) => void;
    attributeTypes: any[];
    loadingAttributeTypes: boolean;
    getAuthHeaders: () => HeadersInit;
    products: any[];
}

const ManageAttributeTypes: React.FC<ManageAttributeTypesProps> = ({
    attributeTypeForm,
    setAttributeTypeForm,
    attributeFormErrors,
    setAttributeFormErrors,
    editingAttributeTypeId,
    setEditingAttributeTypeId,
    handleAttributeTypeSubmit,
    handleEditAttributeType,
    handleDeleteAttributeType,
    handleDuplicateAttributeType,
    error,
    setError,
    success,
    loading,
    setLoading,
    attributeTypeSearch,
    setAttributeTypeSearch,
    attributeTypes,
    loadingAttributeTypes,
    getAuthHeaders,
    products,
}) => {
    const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [productFilter, setProductFilter] = useState<string>("");
    
    // Duplicate modal state
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateAttrId, setDuplicateAttrId] = useState<string | null>(null);
    const [duplicateName, setDuplicateName] = useState("");
    const [duplicating, setDuplicating] = useState(false);
    
    const ITEMS_PER_PAGE = 10;

    // Get attribute IDs used by selected product
    const productAttributeIds = useMemo(() => {
        if (!productFilter || !products) return null;
        const selectedProduct = products.find((p: any) => p._id === productFilter);
        if (!selectedProduct?.dynamicAttributes) return null;
        return selectedProduct.dynamicAttributes
            .filter((da: any) => da.attributeType)
            .map((da: any) => typeof da.attributeType === 'object' ? da.attributeType._id : da.attributeType);
    }, [productFilter, products]);

    // Calculate filtered data and pagination
    const { filteredAttributeTypes, totalPages, paginatedData } = useMemo(() => {
        let filtered = attributeTypes.filter((at) =>
            !attributeTypeSearch ||
            at.attributeName?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
            at.systemName?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
            at.inputStyle?.toLowerCase().includes(attributeTypeSearch.toLowerCase()) ||
            at.primaryEffectType?.toLowerCase().includes(attributeTypeSearch.toLowerCase())
        );

        // Apply product filter
        if (productAttributeIds) {
            filtered = filtered.filter((at) => productAttributeIds.includes(at._id));
        }

        const total = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginated = filtered.slice(startIndex, endIndex);

        return {
            filteredAttributeTypes: filtered,
            totalPages: total,
            paginatedData: paginated
        };
    }, [attributeTypes, attributeTypeSearch, currentPage, productAttributeIds]);

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [attributeTypeSearch, productFilter]);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header with gradient and animation */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 border border-white/20 backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-lg">
                            <Palette size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            {editingAttributeTypeId ? "Edit Attribute Type" : "Create Attribute Type"}
                        </h2>
                    </div>
                    <p className="text-gray-600">
                        {editingAttributeTypeId
                            ? "Modify your attribute type configuration"
                            : "Define a new attribute type with custom properties and behaviors"
                        }
                    </p>
                </div>
            </div>

            <form onSubmit={handleAttributeTypeSubmit} className="space-y-8 bg-white p-8 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
                {/* Animated error/success messages */}
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

                {success && (
                    <div className="animate-slideDown p-4 bg-gradient-to-r from-emerald-50 to-green-100 border-l-4 border-emerald-500 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-full">
                                <Sparkles size={16} className="text-emerald-500" />
                            </div>
                            <p className="text-sm text-emerald-800 font-medium">{success}</p>
                        </div>
                    </div>
                )}

                {/* Step 1: Basic Information - Always Visible */}
                <div className="border border-gray-100 rounded-xl p-6 bg-white hover:bg-gray-50/50 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                                <p className="text-xs text-gray-500 mt-1">Core details about your attribute type</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="animate-fadeIn" style={{ animationDelay: '100ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attribute Name * <span className="text-xs text-gray-500 font-normal">(What customers will see)</span>
                            </label>
                            <input
                                type="text"
                                id="attribute-name"
                                value={attributeTypeForm.attributeName}
                                onChange={(e) => {
                                    setAttributeTypeForm({ ...attributeTypeForm, attributeName: e.target.value });
                                    if (attributeFormErrors.attributeName) {
                                        setAttributeFormErrors({ ...attributeFormErrors, attributeName: undefined });
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 ${attributeFormErrors.attributeName ? 'border-red-300 bg-red-50/50' : 'border-gray-200 hover:border-indigo-300'
                                    }`}
                                placeholder="e.g., Printing Option, Paper Type"
                                required
                            />
                            {attributeFormErrors.attributeName && (
                                <p className="mt-2 text-sm text-red-600 animate-pulse">{attributeFormErrors.attributeName}</p>
                            )}
                        </div>

                        <div className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                System Name (Internal)
                            </label>
                            <input
                                type="text"
                                id="system-name"
                                value={attributeTypeForm.systemName}
                                onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, systemName: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 hover:border-indigo-300"
                                placeholder="e.g., paper_type, size_v2"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Optional. Used for internal system references or API keys.
                            </p>
                        </div>

                        <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
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

                        <div className="md:col-span-2 animate-fadeIn" style={{ animationDelay: '400ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attribute Image <span className="text-xs text-gray-500 font-normal">(to be shown when selecting this attribute)</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <label
                                    className={`flex-1 px-4 py-3 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${attributeTypeForm.attributeImage ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20'}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
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
                                    <div
                                        className="relative group"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <img
                                            src={attributeTypeForm.attributeImage
                                                ? URL.createObjectURL(attributeTypeForm.attributeImage)
                                                : attributeTypeForm.existingImage || ""
                                            }
                                            alt="Attribute preview"
                                            className="w-24 h-24 object-cover rounded-xl border-2 border-emerald-200 group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="animate-fadeIn" style={{ animationDelay: '500ms' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                What This Affects * <span className="text-xs text-gray-500 font-normal">(Description of impact on product)</span>
                            </label>
                            <textarea
                                id="attribute-primaryEffectType"
                                value={attributeTypeForm.effectDescription}
                                onChange={(e) => {
                                    setAttributeTypeForm({ ...attributeTypeForm, effectDescription: e.target.value });
                                    if (attributeFormErrors.primaryEffectType) {
                                        setAttributeFormErrors({ ...attributeFormErrors, primaryEffectType: undefined });
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
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
                </div>

                {/* Options Table */}
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
                                onClick={(e) => {
                                    e.stopPropagation();
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
                                <div className="overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                                    {attributeFormErrors.attributeValues && (
                                        <div className="m-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg animate-shake">
                                            <p className="text-sm text-red-800 font-medium">{attributeFormErrors.attributeValues}</p>
                                        </div>
                                    )}
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
                                                <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                    Option Name *
                                                </th>
                                                <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                    Option Usage *
                                                </th>
                                                {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.price) && (
                                                    <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                        Price Impact
                                                    </th>
                                                )}
                                                {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.image) && (
                                                    <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                        Images Required
                                                    </th>
                                                )}
                                                {attributeTypeForm.attributeOptionsTable.some(opt => opt.optionUsage?.listing) && (
                                                    <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                        Listing Filters
                                                    </th>
                                                )}
                                                <th className="border border-purple-100 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                                    Image
                                                </th>
                                                <th className="border border-purple-100 px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">
                                                    Action
                                                </th>
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
                                                            <label className="flex items-center gap-2 cursor-pointer group/checkbox">
                                                                <div className="relative">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={option.optionUsage?.price || false}
                                                                        onChange={(e) => {
                                                                            const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                            if (!updated[index].optionUsage) {
                                                                                updated[index].optionUsage = { price: false, image: false, listing: false };
                                                                            }
                                                                            updated[index].optionUsage.price = e.target.checked;
                                                                            if (!e.target.checked && !updated[index].optionUsage.image && !updated[index].optionUsage.listing) {
                                                                                setError("At least one option usage must be selected");
                                                                                return;
                                                                            }
                                                                            setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                            setError(null);
                                                                        }}
                                                                        className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500/30 cursor-pointer"
                                                                    />
                                                                </div>
                                                                <span className="text-sm text-gray-700 group-hover/checkbox:text-purple-600 transition-colors">Price</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer group/checkbox">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={option.optionUsage?.image || false}
                                                                    onChange={(e) => {
                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                        if (!updated[index].optionUsage) {
                                                                            updated[index].optionUsage = { price: false, image: false, listing: false };
                                                                        }
                                                                        updated[index].optionUsage.image = e.target.checked;
                                                                        if (!e.target.checked && !updated[index].optionUsage.price && !updated[index].optionUsage.listing) {
                                                                            setError("At least one option usage must be selected");
                                                                            return;
                                                                        }
                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                        setError(null);
                                                                    }}
                                                                    className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500/30 cursor-pointer"
                                                                />
                                                                <span className="text-sm text-gray-700 group-hover/checkbox:text-pink-600 transition-colors">Image</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer group/checkbox">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={option.optionUsage?.listing || false}
                                                                    onChange={(e) => {
                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                        if (!updated[index].optionUsage) {
                                                                            updated[index].optionUsage = { price: false, image: false, listing: false };
                                                                        }
                                                                        updated[index].optionUsage.listing = e.target.checked;
                                                                        if (!e.target.checked && !updated[index].optionUsage.price && !updated[index].optionUsage.image) {
                                                                            setError("At least one option usage must be selected");
                                                                            return;
                                                                        }
                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                        setError(null);
                                                                    }}
                                                                    className="w-4 h-4 text-indigo-500 border-gray-300 rounded focus:ring-indigo-500/30 cursor-pointer"
                                                                />
                                                                <span className="text-sm text-gray-700 group-hover/checkbox:text-indigo-600 transition-colors">Listing</span>
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
                                                                <input
                                                                    type="number"
                                                                    value={option.numberOfImagesRequired || 0}
                                                                    onChange={(e) => {
                                                                        const updated = [...attributeTypeForm.attributeOptionsTable];
                                                                        updated[index].numberOfImagesRequired = parseInt(e.target.value) || 0;
                                                                        setAttributeTypeForm({ ...attributeTypeForm, attributeOptionsTable: updated });
                                                                    }}
                                                                    className="w-full px-3 py-2.5 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-all duration-300"
                                                                    placeholder="Number of images"
                                                                    min="0"
                                                                />
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
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
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

                {/* Additional Settings - These sections don't need accordion since they're always visible */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Settings</h3>

                    {/* Price Effect */}
                    <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:scale-[1.01]">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={attributeTypeForm.isPriceEffect}
                                onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isPriceEffect: e.target.checked })}
                                className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500/30 cursor-pointer peer"
                            />
                            <div className="absolute inset-0 bg-blue-500/10 rounded peer-checked:animate-ping-slow pointer-events-none"></div>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 cursor-pointer">
                                Price Effect
                            </label>
                            <p className="text-xs text-gray-600 mt-1">
                                Does this attribute change the product price?
                            </p>
                            {attributeTypeForm.isPriceEffect && (
                                <div className="mt-4 animate-slideDown">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Price Impact (₹ per 1000 units) *
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium">
                                            ₹
                                        </div>
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
                    <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:scale-[1.01]">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={attributeTypeForm.isStepQuantity}
                                onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isStepQuantity: e.target.checked })}
                                className="w-5 h-5 text-purple-500 border-gray-300 rounded focus:ring-purple-500/30 cursor-pointer peer"
                            />
                            <div className="absolute inset-0 bg-purple-500/10 rounded peer-checked:animate-ping-slow pointer-events-none"></div>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 cursor-pointer">
                                Step Quantity
                            </label>
                            <p className="text-xs text-gray-600 mt-1">
                                Restrict quantity to specific steps (e.g., 1000, 2000, 3000 only)
                            </p>
                            {attributeTypeForm.isStepQuantity && (
                                <div className="mt-4 space-y-3 animate-slideDown">
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
                                        <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-100 hover:border-purple-200 transition-all duration-300 animate-slideDown" style={{ animationDelay: `${index * 100}ms` }}>
                                            <span className="text-sm font-medium text-purple-600">Step {index + 1}</span>
                                            <input
                                                type="number"
                                                value={step.quantity}
                                                onChange={(e) => {
                                                    const updated = [...attributeTypeForm.stepQuantities];
                                                    updated[index].quantity = e.target.value;
                                                    setAttributeTypeForm({ ...attributeTypeForm, stepQuantities: updated });
                                                }}
                                                className="flex-1 px-3 py-2 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
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
                                                className="flex-1 px-3 py-2 border border-purple-100 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
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
                                                className="p-2 text-red-500 hover:bg-red-50/80 rounded-lg transition-all duration-300 hover:scale-110"
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
                    <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:scale-[1.01]">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={attributeTypeForm.isRangeQuantity}
                                onChange={(e) => setAttributeTypeForm({ ...attributeTypeForm, isRangeQuantity: e.target.checked })}
                                className="w-5 h-5 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500/30 cursor-pointer peer"
                            />
                            <div className="absolute inset-0 bg-emerald-500/10 rounded peer-checked:animate-ping-slow pointer-events-none"></div>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700 cursor-pointer">
                                Range Quantity
                            </label>
                            <p className="text-xs text-gray-600 mt-1">
                                Restrict quantity to specific ranges (e.g., 1000-2000, 2000-5000)
                            </p>
                            {attributeTypeForm.isRangeQuantity && (
                                <div className="mt-4 space-y-3 animate-slideDown">
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
                                        <div key={index} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-emerald-100 hover:border-emerald-200 transition-all duration-300 animate-slideDown" style={{ animationDelay: `${index * 100}ms` }}>
                                            <span className="text-sm font-medium text-emerald-600">Range {index + 1}</span>
                                            <input
                                                type="number"
                                                value={range.min}
                                                onChange={(e) => {
                                                    const updated = [...attributeTypeForm.rangeQuantities];
                                                    updated[index].min = e.target.value;
                                                    setAttributeTypeForm({ ...attributeTypeForm, rangeQuantities: updated });
                                                }}
                                                className="flex-1 px-3 py-2 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
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
                                                className="flex-1 px-3 py-2 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
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
                                                className="flex-1 px-3 py-2 border border-emerald-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
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
                                                className="p-2 text-red-500 hover:bg-red-50/80 rounded-lg transition-all duration-300 hover:scale-110"
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
                    {editingAttributeTypeId && (
                        <button
                            type="button"
                            onClick={() => {
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
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 shadow hover:shadow-md"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Attribute Types List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            All Attribute Types
                        </h2>
                        <p className="text-gray-600 mt-1">Manage and organize your attribute types</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={attributeTypeSearch}
                                onChange={(e) => setAttributeTypeSearch(e.target.value)}
                                placeholder="Search attributes..."
                                className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 w-72 group-hover:border-indigo-300"
                            />
                            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300" />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                        </div>
                        {/* Product Filter Dropdown */}
                        <div className="w-56">
                            <Select
                                options={[
                                    { value: "", label: "All Products" },
                                    ...(products || []).map((p: any) => ({
                                        value: p._id,
                                        label: p.name
                                    }))
                                ]}
                                value={productFilter}
                                onValueChange={(val) => setProductFilter(val as string)}
                                placeholder="Filter by product..."
                                colorTheme="purple"
                                searchable={true}
                            />
                        </div>
                        <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                            <span className="text-sm font-medium text-indigo-700">
                                {filteredAttributeTypes.length} Types
                            </span>
                        </div>
                    </div>
                </div>

                {loadingAttributeTypes ? (
                    <div className="text-center py-16">
                        <div className="inline-flex p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full mb-4 animate-pulse">
                            <Loader size={32} className="text-indigo-500 animate-spin" />
                        </div>
                        <p className="text-gray-600">Loading attribute types...</p>
                    </div>
                ) : attributeTypes.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-gray-50/80 to-white rounded-xl border border-gray-200">
                        <div className="inline-flex p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-4">
                            <Layers size={32} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600">No attribute types found.</p>
                        <p className="text-sm text-gray-500 mt-1">Create your first attribute type above</p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Name</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">System Name</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Input Style</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Effect Type</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Pricing</th>
                                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Common</th>
                                        <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((at, index) => (
                                        <tr key={at._id} className="hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-gray-100/30 transition-all duration-300 border-b border-gray-100 last:border-0 group animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                                        <Layers size={16} className="text-indigo-600" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors duration-300">{at.attributeName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono bg-gray-50/50 rounded-lg mx-2">{at.systemName || "-"}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700">
                                                    {at.inputStyle}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">{at.primaryEffectType}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${at.isPricingAttribute ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700'
                                                    }`}>
                                                    {at.isPricingAttribute ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${at.isCommonAttribute ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700'
                                                    }`}>
                                                    {at.isCommonAttribute ? "Yes" : "No"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditAttributeType(at._id)}
                                                        className="p-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600 rounded-lg hover:from-blue-100 hover:to-cyan-100 hover:scale-110 transition-all duration-300 group/btn"
                                                        title="Edit attribute"
                                                    >
                                                        <Edit size={16} className="group-hover/btn:rotate-12 transition-transform duration-300" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const attr = attributeTypes.find(a => a._id === at._id);
                                                            setDuplicateAttrId(at._id);
                                                            setDuplicateName(attr ? `${attr.attributeName} (Copy)` : '');
                                                            setShowDuplicateModal(true);
                                                        }}
                                                        className="p-2 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 rounded-lg hover:from-emerald-100 hover:to-teal-100 hover:scale-110 transition-all duration-300 group/btn"
                                                        title="Duplicate attribute with sub-attributes"
                                                    >
                                                        <Copy size={16} className="group-hover/btn:scale-110 transition-transform duration-300" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAttributeType(at._id)}
                                                        className="p-2 bg-gradient-to-r from-red-50 to-pink-50 text-red-500 rounded-lg hover:from-red-100 hover:to-pink-100 hover:scale-110 transition-all duration-300 group/btn"
                                                        title="Delete attribute"
                                                    >
                                                        <Trash2 size={16} className="group-hover/btn:shake-animation" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Pagination Controls */}
                                    {filteredAttributeTypes.length > ITEMS_PER_PAGE && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-4 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-500">
                                                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAttributeTypes.length)} of {filteredAttributeTypes.length} results
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            disabled={currentPage === 1}
                                                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1"
                                                        >
                                                            <ChevronRight size={16} className="rotate-180" />
                                                            <span>Prev</span>
                                                        </button>

                                                        <div className="flex items-center gap-1">
                                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                                let pageNum;
                                                                if (totalPages <= 5) {
                                                                    pageNum = i + 1;
                                                                } else if (currentPage <= 3) {
                                                                    pageNum = i + 1;
                                                                } else if (currentPage >= totalPages - 2) {
                                                                    pageNum = totalPages - 4 + i;
                                                                } else {
                                                                    pageNum = currentPage - 2 + i;
                                                                }

                                                                return (
                                                                    <button
                                                                        key={pageNum}
                                                                        onClick={() => setCurrentPage(pageNum)}
                                                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all duration-300 ${currentPage === pageNum
                                                                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 scale-105"
                                                                            : "text-gray-600 hover:bg-gray-100"
                                                                            }`}
                                                                    >
                                                                        {pageNum}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-1"
                                                        >
                                                            <span>Next</span>
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Duplicate Attribute Modal */}
            {showDuplicateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slideUp">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Copy size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Duplicate Attribute</h3>
                                    <p className="text-emerald-100 text-sm">Create a copy with a new name</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Original Attribute Info */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-500 mb-1">Duplicating from:</div>
                                <div className="font-medium text-gray-800">
                                    {attributeTypes.find(at => at._id === duplicateAttrId)?.attributeName || 'Unknown'}
                                </div>
                            </div>

                            {/* New Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Attribute Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={duplicateName}
                                    onChange={(e) => {
                                        console.log("DUPLICATE Modal - onChange:", e.target.value);
                                        setDuplicateName(e.target.value);
                                    }}
                                    onInput={(e) => {
                                        const val = (e.target as HTMLInputElement).value;
                                        console.log("DUPLICATE Modal - onInput:", val);
                                        setDuplicateName(val);
                                    }}
                                    placeholder="Enter name for the duplicate..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300"
                                    autoFocus
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    All sub-attributes will also be duplicated
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowDuplicateModal(false);
                                    setDuplicateAttrId(null);
                                    setDuplicateName("");
                                }}
                                className="px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300"
                                disabled={duplicating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!duplicateName.trim()) {
                                        alert("Please enter a name for the duplicate");
                                        return;
                                    }
                                    if (!duplicateAttrId) return;
                                    
                                    setDuplicating(true);
                                    const success = await handleDuplicateAttributeType(duplicateAttrId, duplicateName.trim());
                                    setDuplicating(false);
                                    
                                    if (success) {
                                        setShowDuplicateModal(false);
                                        setDuplicateAttrId(null);
                                        setDuplicateName("");
                                    }
                                }}
                                disabled={duplicating || !duplicateName.trim()}
                                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {duplicating ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        <span>Duplicating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        <span>Create Duplicate</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ManageAttributeTypes;