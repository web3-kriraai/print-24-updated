import React, { useState, useMemo, useEffect } from "react";
import { Edit, Trash2, Plus, Search, Loader, Sparkles, ChevronRight, Palette, Settings, Layers, Copy, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { Select } from "../../../../components/ui/select";
import CreateAttributeModal from "./CreateAttributeModal";

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

export interface AttributeTypeForm {
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
    placeholder: string;
}

interface ManageAttributeTypesProps {
    attributeTypeForm: AttributeTypeForm;
    setAttributeTypeForm: React.Dispatch<React.SetStateAction<AttributeTypeForm>>;
    attributeFormErrors: any;
    setAttributeFormErrors: (errors: any) => void;
    editingAttributeTypeId: string | null;
    setEditingAttributeTypeId: (id: string | null) => void;
    handleAttributeTypeSubmit: (e: React.FormEvent) => Promise<boolean>;
    handleEditAttributeType: (id: string) => void;
    handleDeleteAttributeType: (id: string) => Promise<void>;
    handleDuplicateAttributeType: (id: string, customName?: string, customSystemName?: string) => Promise<boolean | void>;
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
    const [duplicateSystemName, setDuplicateSystemName] = useState("");
    const [duplicating, setDuplicating] = useState(false);

    // Create/Edit modal state
    const [showCreateModal, setShowCreateModal] = useState(false);



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
            {/* Create/Edit Attribute Modal */}
            <CreateAttributeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                attributeTypeForm={attributeTypeForm}
                setAttributeTypeForm={setAttributeTypeForm}
                attributeFormErrors={attributeFormErrors}
                setAttributeFormErrors={setAttributeFormErrors}
                editingAttributeTypeId={editingAttributeTypeId}
                setEditingAttributeTypeId={setEditingAttributeTypeId}
                handleAttributeTypeSubmit={handleAttributeTypeSubmit}
                error={error}
                setError={setError}
                loading={loading}
                setLoading={setLoading}
                getAuthHeaders={getAuthHeaders}
            />


            {/* Attribute Types List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50 p-4 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            All Attribute Types
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">Manage and organize your attribute types</p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-3">
                        <div className="relative group w-full sm:w-64 xl:w-72">
                            <input
                                type="text"
                                value={attributeTypeSearch}
                                onChange={(e) => setAttributeTypeSearch(e.target.value)}
                                placeholder="Search attributes..."
                                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 group-hover:border-indigo-300 text-sm"
                            />
                            <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300" />
                        </div>
                        {/* Product Filter Dropdown */}
                        <div className="w-full sm:w-52 xl:w-56">
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
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg flex-1 sm:flex-none text-center">
                                <span className="text-xs sm:text-sm font-medium text-indigo-700 whitespace-nowrap">
                                    {filteredAttributeTypes.length} Types
                                </span>
                            </div>
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
                                        placeholder: "",
                                    });
                                    setShowCreateModal(true);
                                }}
                                className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <Plus size={18} />
                                Create
                            </button>
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
                                                        onClick={() => {
                                                            handleEditAttributeType(at._id);
                                                            setShowCreateModal(true);
                                                        }}
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
            {
                showDuplicateModal && (
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
                                        onChange={(e) => setDuplicateName(e.target.value)}
                                        placeholder="Enter name for the duplicate..."
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300"
                                        autoFocus
                                    />
                                </div>

                                {/* System Name Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        System Name <span className="text-gray-400">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={duplicateSystemName}
                                        onChange={(e) => setDuplicateSystemName(e.target.value)}
                                        placeholder="Auto-generated if left blank"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 font-mono text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Used internally for API references. All sub-attributes will also be duplicated.
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
                                        setDuplicateSystemName("");
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
                                        const success = await handleDuplicateAttributeType(
                                            duplicateAttrId,
                                            duplicateName.trim(),
                                            duplicateSystemName.trim() || undefined
                                        );
                                        setDuplicating(false);

                                        if (success) {
                                            setShowDuplicateModal(false);
                                            setDuplicateAttrId(null);
                                            setDuplicateName("");
                                            setDuplicateSystemName("");
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
                )
            }


        </div >
    );
};

export default ManageAttributeTypes;