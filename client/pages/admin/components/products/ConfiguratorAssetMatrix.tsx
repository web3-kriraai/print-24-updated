import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '@/lib/apiConfig';

/**
 * ConfiguratorAssetMatrix - Admin dashboard for Matrix Strategy asset management
 * 
 * Features:
 * - Initialize configurator with selected attributes
 * - Visual grid of all attribute combinations
 * - Status indicators (🟢 uploaded, 🟡 pending, 🔴 missing)
 * - Single and bulk image upload with drag-and-drop
 * - Auto-matching by filename
 */

interface Attribute {
    _id: string;
    attributeName: string;
    systemName?: string;
    attributeValues: Array<{ value: string; label: string }>;
    displayOrder: number;
}

interface Asset {
    _id: string;
    combinationHash: string;
    attributeCombination: Record<string, string>;
    expectedFilename: string;
    imageUrl?: string;
    status: 'pending' | 'uploaded' | 'missing';
    fileSize?: number;
    uploadedAt?: string;
}

interface Stats {
    pending: number;
    uploaded: number;
    missing: number;
    total: number;
    completionPercentage: string;
}

interface ConfiguratorAssetMatrixProps {
    productId: string;
    productName: string;
    onClose?: () => void;
}

export default function ConfiguratorAssetMatrix({
    productId,
    productName,
    onClose,
}: ConfiguratorAssetMatrixProps) {
    // State
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Attributes & Configuration
    const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
    const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
    const [configuratorSettings, setConfiguratorSettings] = useState<any>(null);

    // Asset Matrix
    const [assets, setAssets] = useState<Asset[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Upload
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const bulkInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Fetch available attributes
    const fetchAttributes = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/attributes`);
            const data = await res.json();
            if (data.success) {
                const filterable = data.data.filter(
                    (attr: Attribute) => attr.attributeValues && attr.attributeValues.length > 0
                );
                setAvailableAttributes(filterable);
            }
        } catch (err: any) {
            console.error('Failed to fetch attributes:', err);
        }
    }, []);

    // Fetch asset matrix
    const fetchAssetMatrix = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });
            if (statusFilter) {
                params.append('status', statusFilter);
            }

            const res = await fetch(
                `${API_BASE_URL}/product-configurator/${productId}/asset-matrix?${params}`
            );
            const data = await res.json();

            if (data.success) {
                setAssets(data.data.assets);
                setStats(data.data.stats);
                setPagination((prev) => ({
                    ...prev,
                    totalPages: data.data.pagination.totalPages,
                }));
                setConfiguratorSettings(data.data.product?.configuratorSettings);
                setIsInitialized(data.data.product?.configuratorSettings?.isConfiguratorEnabled || false);
            }
        } catch (err: any) {
            console.error('Failed to fetch asset matrix:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [productId, pagination.page, pagination.limit, statusFilter]);

    // Initialize configurator
    const handleInitialize = async () => {
        if (selectedAttributeIds.length === 0) {
            setError('Please select at least one attribute');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const res = await fetch(
                `${API_BASE_URL}/product-configurator/${productId}/initialize`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        configuratorAttributeIds: selectedAttributeIds,
                        maxCombinations: 1000,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to initialize');
            }

            setIsInitialized(true);
            await fetchAssetMatrix();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Upload single asset
    const handleSingleUpload = async (asset: Asset, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('combinationHash', asset.combinationHash);

        try {
            setUploadProgress((prev) => ({ ...prev, [asset._id]: 0 }));

            const res = await fetch(
                `${API_BASE_URL}/product-configurator/${productId}/upload-asset`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const data = await res.json();

            if (data.success) {
                setAssets((prev) =>
                    prev.map((a) =>
                        a._id === asset._id
                            ? { ...a, imageUrl: data.data.asset.imageUrl, status: 'uploaded' }
                            : a
                    )
                );
                setStats(data.data.stats);
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(`Upload failed: ${err.message}`);
        } finally {
            setUploadProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[asset._id];
                return newProgress;
            });
        }
    };

    // Bulk upload
    const handleBulkUpload = async (files: FileList) => {
        if (files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }

        try {
            setUploading(true);
            setError(null);

            const res = await fetch(
                `${API_BASE_URL}/product-configurator/${productId}/bulk-upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const data = await res.json();

            if (data.success) {
                setStats(data.data.stats);
                await fetchAssetMatrix();

                const { results } = data.data;
                if (results.failed.length > 0 || results.skipped.length > 0) {
                    setError(
                        `Uploaded: ${results.success.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`
                    );
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(`Bulk upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleBulkUpload(e.dataTransfer.files);
        }
    };

    // Delete asset
    const handleDeleteAsset = async (assetId: string) => {
        if (!confirm('Reset this asset? The image will be removed.')) return;

        try {
            const res = await fetch(
                `${API_BASE_URL}/product-configurator/${productId}/asset/${assetId}`,
                { method: 'DELETE' }
            );

            const data = await res.json();

            if (data.success) {
                setAssets((prev) =>
                    prev.map((a) =>
                        a._id === assetId ? { ...a, imageUrl: undefined, status: 'pending' } : a
                    )
                );
                setStats(data.data.stats);
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Toggle attribute selection
    const toggleAttribute = (attrId: string) => {
        setSelectedAttributeIds((prev) =>
            prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
        );
    };

    // Effects
    useEffect(() => {
        fetchAttributes();
        fetchAssetMatrix();
    }, [fetchAttributes, fetchAssetMatrix]);

    // Calculate formula preview
    const getFormulaPreview = () => {
        const selected = availableAttributes.filter((a) =>
            selectedAttributeIds.includes(a._id)
        );
        if (selected.length === 0) return null;

        const counts = selected.map((a) => a.attributeValues.length);
        const total = counts.reduce((acc, c) => acc * c, 1);

        return {
            formula: counts.join(' × '),
            total,
            warning: total > 1000,
        };
    };

    const formulaPreview = getFormulaPreview();

    // Status Badge Component
    const StatusBadge = ({ status }: { status: string }) => {
        const config = {
            uploaded: { bg: 'bg-green-500', text: 'Uploaded', icon: '🟢' },
            pending: { bg: 'bg-amber-500', text: 'Pending', icon: '🟡' },
            missing: { bg: 'bg-red-500', text: 'Missing', icon: '🔴' },
        }[status] || { bg: 'bg-amber-500', text: 'Pending', icon: '🟡' };

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide text-white ${config.bg}`}>
                {config.icon} {config.text}
            </span>
        );
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white min-h-[600px]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                <div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        Product Configurator
                    </h2>
                    <span className="text-sm text-white/60">{productName}</span>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-all hover:rotate-90"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 mb-4 flex justify-between items-center text-red-300">
                    {error}
                    <button onClick={() => setError(null)} className="hover:text-white">✕</button>
                </div>
            )}

            {/* Initialization Section */}
            {!isInitialized && (
                <div className="bg-white/5 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-medium mb-2">Select Configurator Attributes</h3>
                    <p className="text-white/60 text-sm mb-5">
                        Choose attributes that will drive the visual configurator. Each combination will require an image.
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center mb-5">
                        {availableAttributes.map((attr) => (
                            <label
                                key={attr._id}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full cursor-pointer transition-all border-2
                  ${selectedAttributeIds.includes(attr._id)
                                        ? 'bg-indigo-500/30 border-indigo-500'
                                        : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedAttributeIds.includes(attr._id)}
                                    onChange={() => toggleAttribute(attr._id)}
                                    className="hidden"
                                />
                                <span>{attr.attributeName}</span>
                                <span className="text-xs text-white/50">({attr.attributeValues.length} options)</span>
                            </label>
                        ))}
                    </div>

                    {formulaPreview && (
                        <div className={`inline-block px-5 py-3 rounded-lg mb-5 ${formulaPreview.warning ? 'bg-red-500/20' : 'bg-indigo-500/20'}`}>
                            <span className="text-base">
                                {formulaPreview.formula} = <strong className={`text-xl ${formulaPreview.warning ? 'text-red-400' : 'text-indigo-400'}`}>{formulaPreview.total}</strong> combinations
                            </span>
                            {formulaPreview.warning && (
                                <span className="block mt-2 text-red-300 text-sm">
                                    ⚠️ Too many combinations! Max 1000 allowed.
                                </span>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleInitialize}
                        disabled={loading || selectedAttributeIds.length === 0 || (formulaPreview?.warning ?? false)}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3.5 rounded-full font-semibold transition-all hover:translate-y-[-2px] hover:shadow-lg hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {loading ? 'Initializing...' : 'Initialize Configurator'}
                    </button>
                </div>
            )}

            {/* Asset Matrix Section */}
            {isInitialized && (
                <>
                    {/* Stats Bar */}
                    {stats && (
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            {[
                                { key: 'uploaded', icon: '🟢', color: 'text-green-400' },
                                { key: 'pending', icon: '🟡', color: 'text-amber-400' },
                                { key: 'missing', icon: '🔴', color: 'text-red-400' },
                                { key: 'completionPercentage', icon: '', color: 'text-indigo-400', suffix: '%' },
                            ].map((item) => (
                                <div key={item.key} className="bg-white/5 rounded-xl p-4 text-center">
                                    {item.icon && <span className="text-2xl mb-1">{item.icon}</span>}
                                    <span className={`block text-2xl font-bold ${item.color}`}>
                                        {stats[item.key as keyof Stats]}{item.suffix || ''}
                                    </span>
                                    <span className="text-xs text-white/60 uppercase tracking-wide">
                                        {item.key === 'completionPercentage' ? 'Complete' : item.key}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bulk Upload Zone */}
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-all
              ${dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <span className="text-4xl block mb-2">📁</span>
                        <p className="text-white/80">Drag & drop images here for bulk upload</p>
                        <p className="text-xs text-white/50 mt-1">
                            Filename format: prod_{'{hash}'}.jpg (e.g., prod_leather_red_matte.jpg)
                        </p>
                        <button
                            onClick={() => bulkInputRef.current?.click()}
                            disabled={uploading}
                            className="mt-4 px-6 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-wait"
                        >
                            {uploading ? 'Uploading...' : 'Browse Files'}
                        </button>
                        <input
                            ref={bulkInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
                        />
                    </div>

                    {/* Filters */}
                    <div className="mb-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg cursor-pointer"
                        >
                            <option value="" className="bg-slate-900">All Status</option>
                            <option value="pending" className="bg-slate-900">Pending</option>
                            <option value="uploaded" className="bg-slate-900">Uploaded</option>
                            <option value="missing" className="bg-slate-900">Missing</option>
                        </select>
                    </div>

                    {/* Asset Grid */}
                    {loading ? (
                        <div className="text-center py-10 text-white/60">Loading assets...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {assets.map((asset) => (
                                <motion.div
                                    key={asset._id}
                                    className={`bg-white/5 rounded-xl overflow-hidden border transition-all hover:translate-y-[-2px] hover:shadow-lg
                    ${asset.status === 'uploaded' ? 'border-green-500/30' :
                                            asset.status === 'pending' ? 'border-amber-500/30' : 'border-red-500/30'}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Image Preview */}
                                    <div className="relative aspect-[4/3] bg-black/20">
                                        {asset.imageUrl ? (
                                            <img src={asset.imageUrl} alt={asset.combinationHash} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
                                                No Image
                                            </div>
                                        )}
                                        {uploadProgress[asset._id] !== undefined && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-5">
                                                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                                                        style={{ width: `${uploadProgress[asset._id]}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Asset Info */}
                                    <div className="p-3">
                                        <div className="font-mono text-xs text-white/50 mb-1.5 break-all">{asset.combinationHash}</div>
                                        <StatusBadge status={asset.status} />
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {Object.entries(asset.attributeCombination || {}).map(([key, value]) => (
                                                <span key={key} className="bg-white/10 px-2 py-0.5 rounded text-[10px] capitalize">
                                                    {key}: {value}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 px-3 pb-3">
                                        <label className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 rounded-lg text-xs font-medium text-center cursor-pointer hover:translate-y-[-1px] transition-all">
                                            📷 Upload
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    e.target.files?.[0] && handleSingleUpload(asset, e.target.files[0])
                                                }
                                            />
                                        </label>
                                        {asset.status === 'uploaded' && (
                                            <button
                                                onClick={() => handleDeleteAsset(asset._id)}
                                                className="bg-red-500/20 border border-red-500/30 text-red-400 px-3 rounded-lg hover:bg-red-500/30 transition-all"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                                className="px-5 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-white/60 text-sm">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                                className="px-5 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
