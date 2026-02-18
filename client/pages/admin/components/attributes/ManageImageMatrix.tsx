import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Package,
    RefreshCw,
    Upload as UploadIcon,
    Image as ImageIcon,
    Trash2,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Search,
    Filter,
    Grid,
    List,
    Loader,
    X,
    Eye,
    Download,
    UploadCloud,
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";

interface Product {
    _id: string;
    name: string;
    image?: string;
}

interface MatrixEntry {
    _id: string;
    attributeCombination: Record<string, string>;
    attributeLabels: Record<string, { attributeName: string; valueLabel: string }>;
    combinationKey: string;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    status: "MISSING" | "UPLOADED";
    sortOrder: number;
}

interface MatrixStats {
    total: number;
    uploaded: number;
    missing: number;
}

interface PreviewData {
    product: { _id: string; name: string };
    attributes: Array<{
        id: string;
        name: string;
        inputStyle: string;
        baseValuesCount: number;
        expandedValuesCount: number;
        hasSubAttributes: boolean;
        values: Array<{
            value: string;
            label: string;
            hasSubAttributes?: boolean;
            subAttributeCount?: number;
        }>;
    }>;
    totalCombinations: number;
    estimatedAfterRules?: number;
    rulesApplied?: Array<{
        name: string;
        when: string;
        actions: string;
    }>;
    existingStats: MatrixStats;
    warning?: string;
}

const ManageImageMatrix: React.FC<{
    products: Product[];
    getAuthHeaders: () => HeadersInit;
}> = ({ products, getAuthHeaders: getAuthHeadersProp }) => {
    // State
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [entries, setEntries] = useState<MatrixEntry[]>([]);
    const [stats, setStats] = useState<MatrixStats>({ total: 0, uploaded: 0, missing: 0 });
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
    const [statusFilter, setStatusFilter] = useState<"" | "MISSING" | "UPLOADED">("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploadingEntryId, setUploadingEntryId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [productDropdownOpen, setProductDropdownOpen] = useState(false);

    // Attribute Filters
    const [activeAttributeFilters, setActiveAttributeFilters] = useState<Record<string, string>>({});

    // Configuration modal state
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedAttributeIds, setSelectedAttributeIds] = useState<Set<string>>(new Set());
    const [selectedValuesByAttr, setSelectedValuesByAttr] = useState<Map<string, Set<string>>>(new Map());
    const [applyRules, setApplyRules] = useState(true);
    const [includeSubAttributes, setIncludeSubAttributes] = useState(true);
    const [calculatedCombinations, setCalculatedCombinations] = useState<{
        total: number;
        withRules: number;
        reduction: number;
    } | null>(null);

    // Progress tracking for matrix generation
    const [generationProgress, setGenerationProgress] = useState<{
        current: number;
        total: number;
        percentage: number;
    } | null>(null);

    // Excel bulk upload state
    const [zipUploading, setZipUploading] = useState(false);
    const [zipProgress, setZipProgress] = useState<{
        current: number;
        total: number;
        percentage: number;
    } | null>(null);
    const [zipResult, setZipResult] = useState<{
        uploaded: number;
        skipped: number;
        total: number;
        errors?: Array<{ filename: string; error: string }>;
    } | null>(null);

    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const zipFileInputRef = useRef<HTMLInputElement>(null);

    // Filtered products
    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    );

    // Use passed auth headers or fallback
    const authHeaders = getAuthHeadersProp || getAuthHeaders;

    // Fetch preview data when product selected
    const fetchPreview = useCallback(async () => {
        if (!selectedProductId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/preview`,
                { headers: authHeaders() }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch preview");
            }

            const data = await response.json();
            setPreviewData(data);
            setStats(data.existingStats);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedProductId, authHeaders]);

    // Fetch matrix entries
    const fetchEntries = useCallback(async (page = 1) => {
        if (!selectedProductId) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(pagination.limit),
            });
            if (statusFilter) params.append("status", statusFilter);

            // Add attribute filters to params
            Object.entries(activeAttributeFilters).forEach(([attrId, value]) => {
                params.append(`attr_${attrId}`, value);
            });

            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix?${params}`,
                { headers: authHeaders() }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch entries");
            }

            const data = await response.json();
            setEntries(data.entries);
            setStats(data.stats);
            setPagination(data.pagination);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedProductId, statusFilter, pagination.limit, activeAttributeFilters, authHeaders]);

    // Calculate combinations based on selection
    const calculateCombinations = useCallback(() => {
        if (!previewData) return null;

        // Get selected attributes
        const selectedAttrs = previewData.attributes.filter(attr => selectedAttributeIds.has(attr.id));

        if (selectedAttrs.length === 0) {
            return { total: 0, withRules: 0, reduction: 0 };
        }

        // Calculate total combinations
        let total = 1;
        for (const attr of selectedAttrs) {
            const selectedValues = selectedValuesByAttr.get(attr.id);
            const valueCount = selectedValues && selectedValues.size > 0
                ? selectedValues.size
                : attr.expandedValuesCount;
            total *= valueCount;
        }

        // Estimate with rules (simple approximation - actual backend will be more accurate)
        const estimatedWithRules = applyRules && previewData.estimatedAfterRules
            ? Math.floor(total * (previewData.estimatedAfterRules / previewData.totalCombinations))
            : total;

        return {
            total,
            withRules: estimatedWithRules,
            reduction: Math.round(((total - estimatedWithRules) / total) * 100)
        };
    }, [previewData, selectedAttributeIds, selectedValuesByAttr, applyRules]);

    // Update calculated combinations when selection changes
    useEffect(() => {
        setCalculatedCombinations(calculateCombinations());
    }, [calculateCombinations]);

    // Generate matrix (auto mode)
    const generateMatrix = useCallback(async (regenerate = false) => {
        if (!selectedProductId) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/generate`,
                {
                    method: "POST",
                    headers: {
                        ...authHeaders(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        regenerate,
                        includeSubAttributes: true,  // Always include sub-attributes
                        applyRules: true             // Always apply attribute rules
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate matrix");
            }

            const data = await response.json();
            setSuccess(data.message);
            setStats(data.stats);
            await fetchEntries(1);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedProductId, authHeaders, fetchEntries]);

    // Generate matrix with custom configuration
    const generateCustomMatrix = useCallback(async (regenerate = false) => {
        if (!selectedProductId) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Build selected attributes configuration
            const selectedAttributes = Array.from(selectedAttributeIds).map(attrId => {
                const selectedValues = selectedValuesByAttr.get(attrId);
                return {
                    attributeId: attrId,
                    selectedValues: selectedValues ? Array.from(selectedValues) : []
                };
            });

            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/generate-custom`,
                {
                    method: "POST",
                    headers: {
                        ...authHeaders(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        mode: 'custom',
                        selectedAttributes,
                        includeSubAttributes,
                        applyRules,
                        regenerate
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error || "Failed to generate custom matrix";

                // Show more helpful error for rule filtering issues
                if (errorMessage.includes("filtered out by attribute rules")) {
                    setError(
                        `${errorMessage}\n\n💡 Suggestion: Try toggling "Apply Attribute Rules" OFF to generate without rule filtering, then review your attribute rules configuration.`
                    );
                } else {
                    setError(errorMessage);
                }
                setLoading(false);
                return;
            }

            const data = await response.json();
            setSuccess(`${data.message} - ${data.totalCombinations} combinations created`);
            setStats(data.stats);
            // DON'T close modal - keep it open to preserve form state
            // setConfigModalOpen(false);
            await fetchEntries(1);
            setGenerationProgress(null); // Reset progress
        } catch (err: any) {
            setError(err.message);
            setGenerationProgress(null); // Reset progress on error
        } finally {
            setLoading(false);
        }
    }, [selectedProductId, selectedAttributeIds, selectedValuesByAttr, applyRules, authHeaders, fetchEntries]);

    // Toggle attribute selection
    const toggleAttributeSelection = (attrId: string) => {
        setSelectedAttributeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(attrId)) {
                newSet.delete(attrId);
                // Clear value selection for this attribute
                setSelectedValuesByAttr(prevMap => {
                    const newMap = new Map(prevMap);
                    newMap.delete(attrId);
                    return newMap;
                });
            } else {
                newSet.add(attrId);
            }
            return newSet;
        });
    };

    // Toggle value selection for an attribute
    const toggleValueSelection = (attrId: string, value: string) => {
        setSelectedValuesByAttr(prev => {
            const newMap = new Map(prev);
            const attrValues = newMap.get(attrId) || new Set<string>();
            const newAttrValues = new Set(attrValues);

            if (newAttrValues.has(value)) {
                newAttrValues.delete(value);
            } else {
                newAttrValues.add(value);
            }

            if (newAttrValues.size === 0) {
                newMap.delete(attrId);
            } else {
                newMap.set(attrId, newAttrValues);
            }

            return newMap;
        });
    };

    // Select all values for an attribute
    const selectAllValues = (attrId: string) => {
        const attr = previewData?.attributes.find(a => a.id === attrId);
        if (!attr) return;

        setSelectedValuesByAttr(prev => {
            const newMap = new Map(prev);
            newMap.set(attrId, new Set(attr.values.map(v => v.value)));
            return newMap;
        });
    };

    // Clear all value selections for an attribute
    const clearAllValues = (attrId: string) => {
        setSelectedValuesByAttr(prev => {
            const newMap = new Map(prev);
            newMap.delete(attrId);
            return newMap;
        });
    };

    // Open configuration modal and initialize with all attributes selected
    const openConfigModal = () => {
        if (previewData) {
            setSelectedAttributeIds(new Set(previewData.attributes.map(a => a.id)));
            setSelectedValuesByAttr(new Map());
            setApplyRules(true);
            setIncludeSubAttributes(false); // Default to FALSE to prevent explosion
        }
        setConfigModalOpen(true);
    };

    // Toggle attribute filter for the main grid/list view
    const toggleAttributeFilter = (attrId: string, value: string) => {
        setActiveAttributeFilters(prev => {
            const newFilters = { ...prev };
            if (newFilters[attrId] === value) {
                // If clicking same value, remove filter
                delete newFilters[attrId];
            } else {
                // Set or change filter
                newFilters[attrId] = value;
            }
            return newFilters;
        });
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    // Clear all filters
    const clearAllFilters = () => {
        setActiveAttributeFilters({});
        setStatusFilter("");
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Upload image for entry
    const uploadImage = useCallback(async (entryId: string, file: File) => {
        setUploadingEntryId(entryId);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/${entryId}`,
                {
                    method: "PUT",
                    headers: authHeaders() as HeadersInit,
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to upload image");
            }

            const data = await response.json();

            // Update local state
            setEntries((prev) =>
                prev.map((entry) =>
                    entry._id === entryId
                        ? {
                            ...entry,
                            imageUrl: data.entry.imageUrl,
                            thumbnailUrl: data.entry.thumbnailUrl,
                            status: "UPLOADED",
                        }
                        : entry
                )
            );
            setStats((prev) => ({
                ...prev,
                uploaded: prev.uploaded + 1,
                missing: prev.missing - 1,
            }));
            setSuccess("Image uploaded successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploadingEntryId(null);
        }
    }, [selectedProductId, authHeaders]);



    // Delete entry image
    const clearEntryImage = useCallback(async (entryId: string) => {
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/${entryId}/image`,
                {
                    method: "DELETE",
                    headers: authHeaders(),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to clear image");
            }

            // Update local state
            setEntries((prev) =>
                prev.map((entry) =>
                    entry._id === entryId
                        ? { ...entry, imageUrl: null, thumbnailUrl: null, status: "MISSING" }
                        : entry
                )
            );
            setStats((prev) => ({
                ...prev,
                uploaded: prev.uploaded - 1,
                missing: prev.missing + 1,
            }));
        } catch (err: any) {
            setError(err.message);
        }
    }, [selectedProductId, authHeaders]);



    // Download Excel template for bulk upload
    const downloadTemplate = async () => {
        if (!selectedProductId) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/template`,
                { headers: authHeaders() }
            );

            if (!response.ok) {
                throw new Error('Failed to generate template');
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `matrix_template_${selectedProductId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Handle ZIP file upload (Excel + images)
    const handleZipUpload = async (file: File) => {
        if (!selectedProductId || !file) return;

        setZipUploading(true);
        setZipResult(null);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/bulk-upload`,
                {
                    method: 'POST',
                    headers: authHeaders(),
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process ZIP file');
            }

            const result = await response.json();
            setZipResult(result);

            // Refresh entries to show newly uploaded images
            await fetchEntries(pagination.page);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setZipUploading(false);
        }
    };

    // Effects
    useEffect(() => {
        if (selectedProductId) {
            fetchPreview();
            setActiveAttributeFilters({}); // Clear filters when product changes
        } else {
            setPreviewData(null);
            setEntries([]);
            setStats({ total: 0, uploaded: 0, missing: 0 });
            setActiveAttributeFilters({});
        }
    }, [selectedProductId, fetchPreview]);

    useEffect(() => {
        if (selectedProductId && stats.total > 0) {
            fetchEntries(1);
        }
    }, [selectedProductId, statusFilter, activeAttributeFilters, stats.total, fetchEntries]);

    // Render combination labels
    const renderCombinationLabels = (entry: MatrixEntry) => {
        const labels = entry.attributeLabels;

        // Fallback to combinationKey if no labels or empty labels
        if (!labels || Object.keys(labels).length === 0) {
            return <span className="text-sm text-gray-600">{entry.combinationKey}</span>;
        }

        const entries = Object.entries(labels);

        return (
            <div className="flex flex-wrap items-center gap-1">
                {entries.map(([attrId, val], idx) => (
                    <span key={attrId} className="inline-flex items-center">
                        {idx > 0 && <span className="text-gray-300 mx-1">|</span>}
                        <span className="text-xs text-gray-500">{val.attributeName}:</span>
                        <span className="text-sm font-medium text-gray-800 ml-1">{val.valueLabel}</span>
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Grid className="text-purple-600" size={24} />
                        Image Matrix
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                        Manage pre-rendered product images for attribute combinations
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                    <span className="text-red-700 text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                        <X size={18} />
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                    <span className="text-green-700 text-sm">{success}</span>
                    <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Product Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex flex-col xl:flex-row xl:items-end gap-6">
                    <div className="relative flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2 pl-1">
                            Select Product
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-left flex items-center justify-between hover:border-purple-300 transition-all duration-300 text-sm group"
                            >
                                <span className={selectedProductId ? "text-gray-800 font-medium" : "text-gray-400"}>
                                    {selectedProductId
                                        ? products.find((p) => p._id === selectedProductId)?.name || "Select..."
                                        : "Select a product..."}
                                </span>
                                <ChevronDown
                                    className={`text-gray-400 group-hover:text-purple-500 transition-transform duration-300 ${productDropdownOpen ? "rotate-180" : ""}`}
                                    size={18}
                                />
                            </button>

                            {productDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-80 overflow-hidden animate-fadeIn border-t-0">
                                    <div className="p-2 bg-gray-50/50 border-b border-gray-100">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-sm transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-4 text-gray-400 text-center text-sm italic">No products found</div>
                                        ) : (
                                            filteredProducts.map((product) => (
                                                <button
                                                    key={product._id}
                                                    onClick={() => {
                                                        setSelectedProductId(product._id);
                                                        setProductDropdownOpen(false);
                                                        setProductSearch("");
                                                    }}
                                                    className={`w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors duration-200 ${selectedProductId === product._id ? "bg-purple-50/80" : ""
                                                        }`}
                                                >
                                                    {product.image ? (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            className="w-10 h-10 object-cover rounded-lg shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                                            <Package className="text-gray-400" size={18} />
                                                        </div>
                                                    )}
                                                    <span className={`text-sm ${selectedProductId === product._id ? "text-purple-700 font-semibold" : "text-gray-700"}`}>{product.name}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedProductId && (
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            <button
                                onClick={() => generateMatrix(stats.total > 0)}
                                disabled={loading}
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-sm"
                            >
                                {loading ? <Loader className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                {stats.total > 0 ? 'Regenerate Matrix' : 'Generate Matrix'}
                            </button>

                            {/* Excel Bulk Upload Buttons */}
                            {stats.total > 0 && (
                                <>
                                    <button
                                        onClick={downloadTemplate}
                                        disabled={loading}
                                        className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 border border-blue-100 text-sm"
                                    >
                                        <Download size={16} />
                                        Template
                                    </button>

                                    <button
                                        onClick={() => zipFileInputRef.current?.click()}
                                        disabled={zipUploading}
                                        className="flex-1 sm:flex-none px-6 py-2.5 bg-green-50 text-green-700 rounded-xl font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 border border-green-100 text-sm"
                                    >
                                        {zipUploading ? <Loader className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                        {zipUploading ? 'Uploading...' : 'Upload ZIP'}
                                    </button>

                                    <input
                                        ref={zipFileInputRef}
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => e.target.files?.[0] && handleZipUpload(e.target.files[0])}
                                        className="hidden"
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ZIP Upload Result Modal */}
                {zipResult && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Upload Complete</h3>
                                <button
                                    onClick={() => setZipResult(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                        <div className="text-3xl font-bold text-green-700">{zipResult.uploaded}</div>
                                        <div className="text-sm text-green-600">Uploaded</div>
                                    </div>
                                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                                        <div className="text-3xl font-bold text-yellow-700">{zipResult.skipped}</div>
                                        <div className="text-sm text-yellow-600">Skipped</div>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                                        <div className="text-3xl font-bold text-blue-700">{zipResult.total}</div>
                                        <div className="text-sm text-blue-600">Total</div>
                                    </div>
                                </div>

                                {/* Errors */}
                                {zipResult.errors && zipResult.errors.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-900 mb-2">Errors ({zipResult.errors.length})</h4>
                                        <div className="max-h-64 overflow-y-auto space-y-2">
                                            {zipResult.errors.map((err, idx) => (
                                                <div key={idx} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                                                    <div className="font-medium text-red-900">{err.filename}</div>
                                                    <div className="text-red-700">{err.error}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => setZipResult(null)}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Info */}
                {previewData && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <div className="text-xl sm:text-2xl font-bold text-gray-800">{previewData.attributes.length}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Attributes</div>
                            </div>
                            <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
                                <div className="text-xl sm:text-2xl font-bold text-green-700">{stats.uploaded}</div>
                                <div className="text-xs text-green-600 uppercase tracking-wider font-semibold">Uploaded</div>
                            </div>
                            <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                                <div className="text-xl sm:text-2xl font-bold text-red-700">{stats.missing}</div>
                                <div className="text-xs text-red-600 uppercase tracking-wider font-semibold">Missing</div>
                            </div>
                        </div>

                        {previewData.warning && (
                            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                                <AlertCircle className="text-amber-500 flex-shrink-0" size={18} />
                                <span className="text-amber-800 text-sm">{previewData.warning}</span>
                            </div>
                        )}

                        {/* Attributes breakdown */}
                        <div className="mt-6 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700 ml-1">Attribute Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {previewData.attributes.map((attr) => (
                                    <div key={attr.id} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-gray-800 text-sm">{attr.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] sm:text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                                                    {attr.expandedValuesCount} values
                                                </span>
                                                {attr.hasSubAttributes && (
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full border border-purple-100">
                                                        Sub-Attrs
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {attr.values.slice(0, 24).map((v) => {
                                                const isActive = activeAttributeFilters[attr.id] === v.value;
                                                return (
                                                    <button
                                                        key={v.value}
                                                        onClick={() => toggleAttributeFilter(attr.id, v.value)}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs transition-all duration-200 border ${isActive
                                                                ? 'bg-purple-600 text-white border-purple-700 shadow-md transform scale-105 z-10'
                                                                : v.hasSubAttributes && (v.subAttributeCount || 0) > 0
                                                                    ? 'bg-purple-100/50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                                    : 'bg-white text-gray-600 border-gray-100 shadow-sm hover:border-purple-200 hover:bg-purple-50'
                                                            }`}
                                                    >
                                                        <span className="truncate max-w-[80px] sm:max-w-[120px]">{v.label}</span>
                                                        {v.hasSubAttributes && (
                                                            <span className={`font-bold ${isActive ? 'text-purple-200' : 'text-purple-800'}`}>
                                                                ({v.subAttributeCount || 0})
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            {attr.values.length > 24 && (
                                                <span className="text-[10px] text-gray-400 self-center">+{attr.values.length - 24} more</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Matrix Grid */}
            {selectedProductId && stats.total > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        className="w-full sm:w-auto appearance-none pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-300 font-medium"
                                    >
                                        <option value="">All ({stats.total})</option>
                                        <option value="UPLOADED">Uploaded ({stats.uploaded})</option>
                                        <option value="MISSING">Missing ({stats.missing})</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                                </div>
                            </div>

                            {(Object.keys(activeAttributeFilters).length > 0 || statusFilter) && (
                                <button
                                    onClick={clearAllFilters}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors duration-200 border border-red-100"
                                >
                                    <X size={14} />
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-full sm:w-auto justify-center sm:justify-start">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === "grid" ? "bg-white shadow-md text-purple-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                <Grid size={16} />
                                <span className="sm:hidden lg:inline">Grid</span>
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${viewMode === "list" ? "bg-white shadow-md text-purple-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                <List size={16} />
                                <span className="sm:hidden lg:inline">List</span>
                            </button>
                        </div>
                    </div>

                    {/* Grid View */}
                    {viewMode === "grid" && (
                        <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                            {entries.map((entry) => (
                                <div
                                    key={entry._id}
                                    className={`group relative rounded-2xl border-2 overflow-hidden transition-all duration-300 ${entry.status === "UPLOADED" ? "border-green-400 shadow-lg shadow-green-100/50" : "border-gray-100 hover:border-purple-200"
                                        }`}
                                >
                                    {/* Image/Placeholder */}
                                    <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                                        {entry.thumbnailUrl || entry.imageUrl ? (
                                            <img
                                                src={entry.thumbnailUrl || entry.imageUrl!}
                                                alt="Matrix image"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                                                onClick={() => setPreviewImage(entry.imageUrl)}
                                            />
                                        ) : (
                                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 w-full h-full flex flex-col items-center justify-center gap-2">
                                                <ImageIcon className="text-gray-300" size={32} />
                                                <span className="text-[10px] text-gray-400 font-medium tracking-tight">NO IMAGE</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <div
                                        className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${entry.status === "UPLOADED" ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                                            }`}
                                    >
                                        {entry.status}
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-purple-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                                        {uploadingEntryId === entry._id ? (
                                            <Loader className="animate-spin text-white" size={20} />
                                        ) : (
                                            <>
                                                <input
                                                    ref={(el) => { if (el) fileInputRefs.current.set(entry._id, el); }}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            uploadImage(entry._id, e.target.files[0]);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => fileInputRefs.current.get(entry._id)?.click()}
                                                    className="p-2.5 bg-white text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all duration-200 shadow-xl"
                                                    title="Upload image"
                                                >
                                                    <UploadIcon size={16} />
                                                </button>
                                                {entry.imageUrl && (
                                                    <>
                                                        <button
                                                            onClick={() => setPreviewImage(entry.imageUrl)}
                                                            className="p-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-200 shadow-xl"
                                                            title="Preview"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => clearEntryImage(entry._id)}
                                                            className="p-2.5 bg-white text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-200 shadow-xl"
                                                            title="Remove image"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Labels */}
                                    <div className="px-2 py-1.5 text-[10px] sm:text-xs text-center bg-white border-t border-gray-50 flex items-center justify-center h-10 group-hover:bg-purple-50/50 transition-colors duration-200">
                                        <div className="truncate font-medium text-gray-600 leading-tight">
                                            {Object.values(entry.attributeLabels || {})
                                                .map((v) => v.valueLabel)
                                                .join(" | ")}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List View */}
                    {viewMode === "list" && (
                        <div className="divide-y">
                            {entries.map((entry) => (
                                <div
                                    key={entry._id}
                                    className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {entry.thumbnailUrl || entry.imageUrl ? (
                                            <img
                                                src={entry.thumbnailUrl || entry.imageUrl!}
                                                alt="Matrix image"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="text-gray-300" size={24} />
                                        )}
                                    </div>

                                    {/* Labels */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap gap-2">
                                            {renderCombinationLabels(entry)}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${entry.status === "UPLOADED"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {entry.status}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={(el) => { if (el) fileInputRefs.current.set(entry._id, el); }}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    uploadImage(entry._id, e.target.files[0]);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRefs.current.get(entry._id)?.click()}
                                            disabled={uploadingEntryId === entry._id}
                                            className="p-2 text-gray-500 hover:text-purple-600 disabled:opacity-50"
                                        >
                                            {uploadingEntryId === entry._id ? (
                                                <Loader className="animate-spin" size={18} />
                                            ) : (
                                                <UploadIcon size={18} />
                                            )}
                                        </button>
                                        {entry.imageUrl && (
                                            <>
                                                <button
                                                    onClick={() => setPreviewImage(entry.imageUrl)}
                                                    className="p-2 text-gray-500 hover:text-blue-600"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => clearEntryImage(entry._id)}
                                                    className="p-2 text-gray-500 hover:text-red-600"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Empty Filter State */}
                    {entries.length === 0 && !loading && (
                        <div className="p-12 text-center">
                            <Filter className="mx-auto text-gray-300 mb-4" size={48} />
                            <h3 className="text-lg font-medium text-gray-800 mb-2">No Matching Entries</h3>
                            <p className="text-gray-500 mb-6">
                                No matrix entries found for the selected filters. Try clearing some filters.
                            </p>
                            <button
                                onClick={clearAllFilters}
                                className="px-6 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all duration-300 shadow-md"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="px-6 py-4 border-t flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                Page {pagination.page} of {pagination.pages} ({pagination.total} entries)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchEntries(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchEntries(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {selectedProductId && stats.total === 0 && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Grid className="mx-auto text-gray-300 mb-4" size={64} />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Matrix Generated Yet</h3>
                    <p className="text-gray-500 mb-6">
                        Click "Generate Matrix" or "Configure Matrix" to create attribute combinations for this product.
                    </p>
                </div>
            )}

            {/* Configuration Modal */}
            {configModalOpen && previewData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-green-600 to-blue-600 text-white">
                            <div>
                                <h3 className="text-xl font-bold">Configure Matrix Generation</h3>
                                <p className="text-sm opacity-90 mt-1">Select attributes and values to reduce combinations</p>
                            </div>
                            <button
                                onClick={() => setConfigModalOpen(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Combination Counter */}
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-4 shadow-sm">
                                        <div className="text-3xl font-bold text-blue-600">
                                            {calculatedCombinations?.total.toLocaleString() || 0}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">Selected Combinations</div>
                                    </div>
                                    {applyRules && (
                                        <>
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <div className="text-3xl font-bold text-green-600">
                                                    {calculatedCombinations?.withRules.toLocaleString() || 0}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">After Rules</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                                <div className="text-3xl font-bold text-orange-600">
                                                    -{calculatedCombinations?.reduction || 0}%
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">Reduction</div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Apply Rules Toggle */}
                                <div className="mt-4 flex items-center justify-between bg-white rounded-lg p-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Apply Attribute Rules</label>
                                        <p className="text-xs text-gray-500 mt-1">Filter out invalid combinations based on business rules</p>
                                    </div>
                                    <button
                                        onClick={() => setApplyRules(!applyRules)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${applyRules ? 'bg-green-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${applyRules ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Include Sub-Attributes Toggle */}
                                <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div>
                                        <label className="text-sm font-medium text-amber-900">Include Sub-Attributes</label>
                                        <p className="text-xs text-amber-700 mt-1">
                                            ⚠️ Enabling this can create 10x-100x more combinations!
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIncludeSubAttributes(!includeSubAttributes)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${includeSubAttributes ? 'bg-amber-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${includeSubAttributes ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Rule Info */}
                                {applyRules && previewData.rulesApplied && previewData.rulesApplied.length > 0 && (
                                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="text-sm font-medium text-blue-800 mb-2">
                                            {previewData.rulesApplied.length} Active Rule{previewData.rulesApplied.length !== 1 ? 's' : ''}
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {previewData.rulesApplied.map((rule, idx) => (
                                                <div key={idx} className="text-xs text-blue-700 bg-white rounded px-2 py-1">
                                                    <span className="font-medium">{rule.name}:</span> {rule.when} → {rule.actions}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Attribute Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-800">Select Attributes</h4>
                                    <div className="text-sm text-gray-500">
                                        {selectedAttributeIds.size} of {previewData.attributes.length} selected
                                    </div>
                                </div>

                                {previewData.attributes.map((attr) => {
                                    const isSelected = selectedAttributeIds.has(attr.id);
                                    const selectedValues = selectedValuesByAttr.get(attr.id);
                                    const allValuesSelected = !selectedValues || selectedValues.size === 0;

                                    return (
                                        <div
                                            key={attr.id}
                                            className={`border-2 rounded-xl overflow-hidden transition ${isSelected ? 'border-green-300 bg-green-50/50' : 'border-gray-200 bg-gray-50'
                                                }`}
                                        >
                                            {/* Attribute Header */}
                                            <div className="p-4 flex items-center justify-between bg-white/50">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleAttributeSelection(attr.id)}
                                                        className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{attr.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {attr.expandedValuesCount} value{attr.expandedValuesCount !== 1 ? 's' : ''}
                                                            {attr.hasSubAttributes && (
                                                                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                                    Has Sub-Attrs
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => selectAllValues(attr.id)}
                                                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                                        >
                                                            All
                                                        </button>
                                                        <button
                                                            onClick={() => clearAllValues(attr.id)}
                                                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                                                        >
                                                            Clear
                                                        </button>
                                                        <div className="text-sm text-gray-600">
                                                            {allValuesSelected ? 'All' : `${selectedValues?.size || 0}`} selected
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Value Selection */}
                                            {isSelected && (
                                                <div className="p-4 bg-white border-t">
                                                    <div className="flex flex-wrap gap-2">
                                                        {attr.values.map((val) => {
                                                            const isValueSelected = allValuesSelected || selectedValues?.has(val.value);
                                                            return (
                                                                <button
                                                                    key={val.value}
                                                                    onClick={() => toggleValueSelection(attr.id, val.value)}
                                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${isValueSelected
                                                                        ? 'bg-green-600 text-white'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                        }`}
                                                                >
                                                                    {val.label}
                                                                    {val.subAttributeCount && val.subAttributeCount > 0 && (
                                                                        <span className="ml-1 opacity-75">({val.subAttributeCount})</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50">
                            {/* Progress Bar */}
                            {loading && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">
                                            Generating combinations...
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {generationProgress
                                                ? `${generationProgress.current} / ${generationProgress.total} (${generationProgress.percentage}%)`
                                                : 'Processing...'
                                            }
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-blue-500 h-3 transition-all duration-300 ease-out"
                                            style={{
                                                width: generationProgress
                                                    ? `${generationProgress.percentage}%`
                                                    : '0%'
                                            }}
                                        >
                                            <div className="w-full h-full bg-white/20 animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setConfigModalOpen(false)}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => generateCustomMatrix(false)}
                                        disabled={loading || selectedAttributeIds.size === 0}
                                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading ? <Loader className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                        Generate {calculatedCombinations?.withRules.toLocaleString() || 0} Combinations
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default ManageImageMatrix;
