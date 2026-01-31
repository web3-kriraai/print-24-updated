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
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkUploadResults, setBulkUploadResults] = useState<{
        matched: number;
        unmatched: number;
        errors: number;
    } | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [productDropdownOpen, setProductDropdownOpen] = useState(false);

    const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const bulkFileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

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
    }, [selectedProductId, statusFilter, pagination.limit, authHeaders]);

    // Generate matrix
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
                    body: JSON.stringify({ regenerate }),
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

    // Bulk upload
    const handleBulkUpload = useCallback(async (files: FileList | File[]) => {
        if (!selectedProductId || files.length === 0) return;

        setBulkUploading(true);
        setBulkUploadResults(null);
        setError(null);

        try {
            const formData = new FormData();
            Array.from(files).forEach((file) => {
                formData.append("images", file);
            });

            const response = await fetch(
                `${API_BASE_URL}/products/${selectedProductId}/image-matrix/bulk-upload`,
                {
                    method: "POST",
                    headers: authHeaders() as HeadersInit,
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to process bulk upload");
            }

            const data = await response.json();
            setBulkUploadResults({
                matched: data.results.matched.length,
                unmatched: data.results.unmatched.length,
                errors: data.results.errors.length,
            });
            setStats(data.stats);
            setSuccess(data.message);
            await fetchEntries(pagination.page);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBulkUploading(false);
        }
    }, [selectedProductId, authHeaders, fetchEntries, pagination.page]);

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

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current) {
            dropZoneRef.current.classList.add("border-blue-500", "bg-blue-50");
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current) {
            dropZoneRef.current.classList.remove("border-blue-500", "bg-blue-50");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropZoneRef.current) {
            dropZoneRef.current.classList.remove("border-blue-500", "bg-blue-50");
        }
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleBulkUpload(files);
        }
    };

    // Effects
    useEffect(() => {
        if (selectedProductId) {
            fetchPreview();
        } else {
            setPreviewData(null);
            setEntries([]);
            setStats({ total: 0, uploaded: 0, missing: 0 });
        }
    }, [selectedProductId, fetchPreview]);

    useEffect(() => {
        if (selectedProductId && stats.total > 0) {
            fetchEntries(1);
        }
    }, [selectedProductId, statusFilter, stats.total, fetchEntries]);

    // Render combination labels
    const renderCombinationLabels = (entry: MatrixEntry) => {
        const labels = entry.attributeLabels;
        if (!labels) return entry.combinationKey;

        return Object.entries(labels)
            .map(([_, val]) => (
                <span key={val.attributeName} className="inline-flex items-center gap-1">
                    <span className="text-xs text-gray-500">{val.attributeName}:</span>
                    <span className="text-sm font-medium text-gray-800">{val.valueLabel}</span>
                </span>
            ))
            .reduce((prev, curr, idx) => (
                <>
                    {prev}
                    {idx > 0 && <span className="text-gray-300 mx-1">|</span>}
                    {curr}
                </>
            ) as any);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Grid className="text-purple-600" size={28} />
                        Image Matrix
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Manage pre-rendered product images for attribute combinations
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <span className="text-red-700">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
                        <X size={18} />
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="text-green-500" size={20} />
                    <span className="text-green-700">{success}</span>
                    <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Product Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[300px]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Product
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 transition"
                            >
                                <span className={selectedProductId ? "text-gray-800" : "text-gray-400"}>
                                    {selectedProductId
                                        ? products.find((p) => p._id === selectedProductId)?.name || "Select..."
                                        : "Select a product..."}
                                </span>
                                <ChevronDown
                                    className={`text-gray-400 transition-transform ${productDropdownOpen ? "rotate-180" : ""}`}
                                    size={20}
                                />
                            </button>

                            {productDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-hidden">
                                    <div className="p-2 border-b">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-4 text-gray-500 text-center">No products found</div>
                                        ) : (
                                            filteredProducts.map((product) => (
                                                <button
                                                    key={product._id}
                                                    onClick={() => {
                                                        setSelectedProductId(product._id);
                                                        setProductDropdownOpen(false);
                                                        setProductSearch("");
                                                    }}
                                                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${selectedProductId === product._id ? "bg-purple-50" : ""
                                                        }`}
                                                >
                                                    {product.image ? (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            className="w-10 h-10 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                            <Package className="text-gray-400" size={20} />
                                                        </div>
                                                    )}
                                                    <span className="text-gray-800">{product.name}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedProductId && (
                        <>
                            <button
                                onClick={() => generateMatrix(false)}
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-7"
                            >
                                {loading ? <Loader className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                Generate Matrix
                            </button>

                            {stats.total > 0 && (
                                <button
                                    onClick={() => generateMatrix(true)}
                                    disabled={loading}
                                    className="px-6 py-3 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-7"
                                >
                                    <RefreshCw size={18} />
                                    Regenerate
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Preview Info */}
                {previewData && (
                    <div className="mt-6 pt-6 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-gray-800">{previewData.attributes.length}</div>
                                <div className="text-sm text-gray-500">Attributes</div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-blue-700">{previewData.totalCombinations}</div>
                                <div className="text-sm text-blue-600">Total Combinations</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-green-700">{stats.uploaded}</div>
                                <div className="text-sm text-green-600">Uploaded</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-red-700">{stats.missing}</div>
                                <div className="text-sm text-red-600">Missing</div>
                            </div>
                        </div>

                        {previewData.warning && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                                <AlertCircle className="text-yellow-600" size={18} />
                                <span className="text-yellow-700 text-sm">{previewData.warning}</span>
                            </div>
                        )}

                        {/* Attributes breakdown with sub-attribute details */}
                        <div className="mt-4 space-y-3">
                            {previewData.attributes.map((attr) => (
                                <div key={attr.id} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold text-gray-800">{attr.name}</span>
                                        <span className="text-sm text-gray-500">
                                            ({attr.baseValuesCount} values{attr.hasSubAttributes ? ` → ${attr.expandedValuesCount} expanded` : ''})
                                        </span>
                                        {attr.hasSubAttributes && (
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                Has Sub-Attrs
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {attr.values.map((v) => (
                                            <span
                                                key={v.value}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${v.hasSubAttributes && (v.subAttributeCount || 0) > 0
                                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                        : 'bg-white text-gray-600 border border-gray-200'
                                                    }`}
                                                title={v.hasSubAttributes ? `${v.subAttributeCount} sub-attributes` : 'No sub-attributes'}
                                            >
                                                <span>{v.label}</span>
                                                {v.hasSubAttributes && (
                                                    <span className="font-medium text-purple-800">
                                                        ({v.subAttributeCount || 0})
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Upload Zone */}
            {selectedProductId && stats.total > 0 && (
                <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => bulkFileInputRef.current?.click()}
                >
                    <input
                        ref={bulkFileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
                        className="hidden"
                    />

                    {bulkUploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader className="animate-spin text-blue-600" size={40} />
                            <span className="text-gray-600">Processing images...</span>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="mx-auto text-gray-400 mb-3" size={48} />
                            <p className="text-gray-700 font-medium">Bulk Upload Images</p>
                            <p className="text-gray-500 text-sm mt-1">
                                Drag & drop images here, or click to select. Filename format: <code>value1_value2_value3.jpg</code>
                            </p>
                        </>
                    )}

                    {bulkUploadResults && (
                        <div className="mt-4 flex justify-center gap-4">
                            <span className="text-green-600">✓ {bulkUploadResults.matched} matched</span>
                            <span className="text-yellow-600">⚠ {bulkUploadResults.unmatched} unmatched</span>
                            {bulkUploadResults.errors > 0 && (
                                <span className="text-red-600">✕ {bulkUploadResults.errors} errors</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Matrix Grid */}
            {selectedProductId && entries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <Filter className="text-gray-400" size={18} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">All ({stats.total})</option>
                                <option value="UPLOADED">Uploaded ({stats.uploaded})</option>
                                <option value="MISSING">Missing ({stats.missing})</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded ${viewMode === "grid" ? "bg-purple-100 text-purple-700" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <Grid size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded ${viewMode === "list" ? "bg-purple-100 text-purple-700" : "text-gray-400 hover:text-gray-600"}`}
                            >
                                <List size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Grid View */}
                    {viewMode === "grid" && (
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {entries.map((entry) => (
                                <div
                                    key={entry._id}
                                    className={`relative rounded-lg border-2 overflow-hidden group ${entry.status === "UPLOADED" ? "border-green-300" : "border-gray-200"
                                        }`}
                                >
                                    {/* Image/Placeholder */}
                                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                        {entry.thumbnailUrl || entry.imageUrl ? (
                                            <img
                                                src={entry.thumbnailUrl || entry.imageUrl!}
                                                alt="Matrix image"
                                                className="w-full h-full object-cover cursor-pointer"
                                                onClick={() => setPreviewImage(entry.imageUrl)}
                                            />
                                        ) : (
                                            <ImageIcon className="text-gray-300" size={40} />
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <div
                                        className={`absolute top-2 right-2 w-3 h-3 rounded-full ${entry.status === "UPLOADED" ? "bg-green-500" : "bg-red-500"
                                            }`}
                                    />

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        {uploadingEntryId === entry._id ? (
                                            <Loader className="animate-spin text-white" size={24} />
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
                                                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                                                    title="Upload image"
                                                >
                                                    <UploadIcon className="text-gray-700" size={18} />
                                                </button>
                                                {entry.imageUrl && (
                                                    <>
                                                        <button
                                                            onClick={() => setPreviewImage(entry.imageUrl)}
                                                            className="p-2 bg-white rounded-full hover:bg-gray-100"
                                                            title="Preview"
                                                        >
                                                            <Eye className="text-gray-700" size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => clearEntryImage(entry._id)}
                                                            className="p-2 bg-white rounded-full hover:bg-red-100"
                                                            title="Remove image"
                                                        >
                                                            <Trash2 className="text-red-600" size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Labels */}
                                    <div className="p-2 text-xs text-center bg-white border-t truncate">
                                        {Object.values(entry.attributeLabels || {})
                                            .map((v) => v.valueLabel)
                                            .join(" | ")}
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
                        Click "Generate Matrix" to create all attribute combinations for this product.
                    </p>
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
