import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Search,
    X,
    Edit,
    Trash2,
    Loader,
    Filter,
    RefreshCw,
    Eye,
    Grid3x3,
    List,
    DollarSign,
    Star,
    TrendingUp,
    Calendar,
    CheckCircle,
    ShoppingBag,
    Tag,
    Layers,
    Copy,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { SearchableDropdown } from '../../../../components/SearchableDropdown';
import { formatCurrency, formatCurrencyFull } from '../../../../utils/pricing';

export interface Product {
    _id: string;
    name: string;
    slug?: string;
    description: string;
    basePrice: number;
    category?: string | { _id: string; name: string };
    subcategory?: string | { _id: string; name: string };
    nestedSubcategory?: string | { _id: string; name: string };
    image?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    sku?: string;
    stock?: number;
    rating?: number;
    salesCount?: number;
    sortOrder?: number;
    showAttributePrices?: boolean;
    isDeleted?: boolean;
}

interface ManageProductsViewProps {
    products: Product[];
    filteredProducts: Product[];
    productSearchQuery: string;
    setProductSearchQuery: (query: string) => void;
    selectedCategoryFilter: string;
    setSelectedCategoryFilter: (categoryId: string) => void;
    selectedSubCategoryFilter: string;
    setSelectedSubCategoryFilter: (subCategoryId: string) => void;
    handleEditProduct: (id: string) => void;
    handleDeleteProduct: (id: string) => void;
    handleToggleProductStatus: (id: string) => void;
    handleRestoreProduct: (id: string) => void;
    handleDuplicateProduct: (id: string) => void;
    fetchProducts: (categoryId?: string, forceFetch?: boolean) => void;
    showDeletedProducts: boolean;
    setShowDeletedProducts: (show: boolean) => void;
    loading: boolean;
    error: string | null;
    setError: (error: string | null) => void;
    success: string | null;
    setSuccess: (success: string | null) => void;
    categories: any[];
    subCategories: any[];
    typeFilter: string;
    setTypeFilter: (type: string) => void;
    statusFilter: "All" | "Active" | "Inactive";
    setStatusFilter: (status: "All" | "Active" | "Inactive") => void;
}

interface ProductDetailModalProps {
    isOpen: boolean;
    product: Product | null;
    onClose: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, product, onClose }) => {
    if (!product || !isOpen) return null;

    const getCategoryName = (cat: any) => {
        if (!cat) return 'Uncategorized';
        return typeof cat === 'object' ? cat.name : cat;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not available';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] flex flex-col overflow-hidden shadow-2xl mx-4 md:mx-0"
                    >
                        {/* Modal Header */}
                        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="text-teal-600" size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">{product.name}</h2>
                                    <p className="text-sm text-gray-600 truncate">{product.sku || 'No SKU'}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 md:p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    {/* Product Image */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Package size={64} className="text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Basic Info */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Product Information</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">Price</span>
                                                <span className="font-medium">{formatCurrencyFull(product.basePrice)}</span>
                                            </div>
                                            {/* Removed Status and Stock display */}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    {/* Description */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Description</h3>
                                        <div
                                            className="prose prose-sm prose-teal max-w-none text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100/50"
                                            dangerouslySetInnerHTML={{ __html: product.description || '<p class="italic text-gray-400">No description available</p>' }}
                                        />
                                    </div>

                                    {/* Categories */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <Tag size={14} className="text-blue-500" />
                                                </div>
                                                <span className="text-sm truncate">{product.category ? getCategoryName(product.category) : 'Uncategorized'}</span>
                                            </div>
                                            {product.subcategory && getCategoryName(product.subcategory) !== 'Uncategorized' && (
                                                <div className="flex items-center gap-2 ml-6 relative">
                                                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300" />
                                                    <div className="w-5 h-5 rounded bg-cyan-50 flex items-center justify-center flex-shrink-0">
                                                        <Layers size={14} className="text-cyan-500" />
                                                    </div>
                                                    <span className="text-sm truncate">{getCategoryName(product.subcategory)}</span>
                                                </div>
                                            )}
                                            {product.nestedSubcategory && getCategoryName(product.nestedSubcategory) !== 'Uncategorized' && (
                                                <div className="flex items-center gap-2 ml-12 relative">
                                                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300" />
                                                    <div className="w-5 h-5 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                        <Layers size={14} className="text-indigo-500" />
                                                    </div>
                                                    <span className="text-sm truncate">{getCategoryName(product.nestedSubcategory)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistics</h3>
                                        <div className="space-y-3">
                                            {product.rating !== undefined && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Rating</span>
                                                    <div className="flex items-center gap-1">
                                                        <Star size={14} className="text-amber-500 fill-amber-500" />
                                                        <span className="font-medium">{product.rating.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {product.salesCount !== undefined && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Sales</span>
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp size={14} className="text-purple-500" />
                                                        <span className="font-medium">{product.salesCount}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Dates</h3>
                                        <div className="space-y-2">
                                            {product.createdAt && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Created</span>
                                                    <span className="text-sm">{formatDate(product.createdAt)}</span>
                                                </div>
                                            )}
                                            {product.updatedAt && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Updated</span>
                                                    <span className="text-sm">{formatDate(product.updatedAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50 shrink-0">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm md:text-base"
                                >
                                    Close
                                </button>
                                {product.isActive && (
                                    <button
                                        onClick={() => {
                                            // Handle edit action
                                            onClose();
                                        }}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm md:text-base"
                                    >
                                        Edit Product
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Memoized Product Item Component
const ProductItem = React.memo(({
    product,
    viewMode,
    onEdit,
    onDelete,
    onView,
    onToggleStatus,
    onRestore,
    onDuplicate,
    isHovered,
    onMouseEnter,
    onMouseLeave
}: {
    product: Product;
    viewMode: 'grid' | 'list';
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
    onToggleStatus: (id: string) => void;
    onRestore: (id: string) => void;
    onDuplicate: (id: string) => void;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) => {
    const getCategoryName = (cat: any) => {
        if (!cat) return '';
        return typeof cat === 'object' ? cat.name : '';
    };

    if (viewMode === 'grid') {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="group"
            >
                <div className="bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col">
                    {/* Product Image */}
                    <div className="relative h-40 overflow-hidden bg-gray-50">
                        {product.image ? (
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Package size={40} className="text-gray-400" />
                            </div>
                        )}

                        {/* Status Badge */}
                        {product.isDeleted && (
                            <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">Deleted</span>
                        )}
                        {!product.isDeleted && (
                            <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded-full ${product.isActive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                                {product.isActive ? 'Active' : 'Inactive'}
                            </span>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="mb-3">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                                    {product.name}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                    {getCategoryName(product.category) || 'Uncategorized'}
                                </div>
                                {product.sku && (
                                    <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                                        {product.sku}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Price and Stats */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-gray-600" />
                                <span className="font-semibold text-gray-900">{formatCurrencyFull(product.basePrice)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Removed Stock Display */}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1 justify-between">
                            {product.isDeleted ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(product._id);
                                    }}
                                    className="flex-1 px-2 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors flex items-center justify-center gap-1 font-medium text-xs flex-shrink-0"
                                >
                                    <RefreshCw size={14} />
                                    Restore
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onView(product._id);
                                        }}
                                        className="px-2 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 font-medium text-xs flex-shrink-0"
                                    >
                                        <Eye size={14} />
                                        View
                                    </button>
                                    {product.isActive && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(product._id);
                                            }}
                                            className="px-2 py-2 bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 transition-colors flex items-center justify-center gap-1 font-medium text-xs flex-shrink-0"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleStatus(product._id);
                                        }}
                                        className={`px-2 py-2 rounded-md transition-colors flex items-center justify-center gap-1 font-medium text-xs flex-shrink-0 ${product.isActive
                                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
                                    >
                                        {product.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDuplicate(product._id);
                                        }}
                                        className="px-2 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 font-medium text-xs flex-shrink-0"
                                        title="Duplicate Product"
                                    >
                                        <Copy size={14} />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(product._id);
                                        }}
                                        className="px-2 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1 font-medium text-xs flex-shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // List View
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            layout
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className={`bg-white rounded-lg border ${product.isActive ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-400'} border-r border-t border-b border-gray-100 hover:shadow-sm transition-all duration-200 group`}>
                <div className="p-4">
                    <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package size={16} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product Name and Category */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-semibold text-gray-900 truncate">
                                    {product.name}
                                </h3>
                                {product.sku && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                                        {product.sku}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                    {getCategoryName(product.category) || 'Uncategorized'}
                                </div>
                                {product.subcategory ? (
                                    <span className="text-gray-500 text-xs ml-1">
                                        ({typeof product.subcategory === 'object' ? product.subcategory.name : 'Sub'})
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {/* Price and Stock */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-base font-semibold text-gray-900">
                                    {formatCurrencyFull(product.basePrice)}
                                </div>
                                {/* Removed Stock Display */}
                            </div>

                            {/* Action Buttons */}
                            <div className={`flex items-center gap-1 transition-opacity duration-200 
                                ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {product.isDeleted ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRestore(product._id);
                                        }}
                                        className="p-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors"
                                        title="Restore Product"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onView(product._id);
                                            }}
                                            className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        {product.isActive && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEdit(product._id);
                                                }}
                                                className="p-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
                                                title="Edit Product"
                                            >
                                                <Edit size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleStatus(product._id);
                                            }}
                                            className={`p-2 rounded-md transition-colors ${product.isActive
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            title={product.isActive ? 'Deactivate Product' : 'Activate Product'}
                                        >
                                            {product.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDuplicate(product._id);
                                            }}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                            title="Duplicate Product"
                                        >
                                            <Copy size={14} />
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(product._id);
                                            }}
                                            className="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                                            title="Delete Product"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

ProductItem.displayName = 'ProductItem';

const ManageProductsView: React.FC<ManageProductsViewProps> = ({
    products,
    filteredProducts,
    productSearchQuery,
    setProductSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedSubCategoryFilter,
    setSelectedSubCategoryFilter,
    handleEditProduct,
    handleDeleteProduct,
    handleToggleProductStatus,
    handleRestoreProduct,
    handleDuplicateProduct,
    fetchProducts,
    showDeletedProducts,
    setShowDeletedProducts,
    loading,
    error,
    success,
    categories,
    subCategories,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Prepare dropdown options
    const categoryOptions = useMemo(() => {
        const filteredCats = typeFilter === 'All'
            ? categories
            : categories.filter(cat => cat.type === typeFilter);

        return [
            { value: '', label: 'All Categories' },
            ...filteredCats.map(cat => ({
                value: cat._id,
                label: cat.name
            }))
        ];
    }, [categories, typeFilter]);

    const subCategoryOptions = useMemo(() => [
        { value: '', label: 'All Subcategories' },
        ...subCategories
            .filter(sub => {
                const catId = typeof sub.category === 'object' ? sub.category._id : sub.category;
                const isTopLevel = !sub.parent;
                return (!selectedCategoryFilter || catId === selectedCategoryFilter) && isTopLevel;
            })
            .map(sub => ({
                value: sub._id,
                label: sub.name
            }))
    ], [subCategories, selectedCategoryFilter]);

    // Statistics
    const totalValue = filteredProducts.reduce((sum, p) => sum + p.basePrice, 0);
    const activeProducts = filteredProducts.filter(p => p.isActive).length;


    const handleViewProduct = (id: string) => {
        const product = filteredProducts.find(p => p._id === id);
        if (product) {
            setSelectedProduct(product);
            setShowDetailModal(true);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="text-teal-600" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Manage Products</h1>
                                <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
                                    {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => fetchProducts()}
                                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
                            >
                                <RefreshCw size={18} />
                                <span>Refresh</span>
                            </button>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 sm:px-3 sm:py-2 rounded-md transition-colors ${viewMode === 'grid'
                                        ? 'bg-white text-teal-600 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <Grid3x3 size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 sm:px-3 sm:py-2 rounded-md transition-colors ${viewMode === 'list'
                                        ? 'bg-white text-teal-600 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Statistics cards can go here if needed later, curr ently removed stock status card */}
                    </div>
                </div>

                {/* Filters Panel */}
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Filter className="text-teal-600" size={20} />
                            <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Search Products</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, SKU..."
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                                />
                                {productSearchQuery && (
                                    <button
                                        onClick={() => setProductSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Show Deleted Toggle */}
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowDeletedProducts(!showDeletedProducts)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors w-full justify-center ${showDeletedProducts
                                        ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {showDeletedProducts ? "Hide Trash" : "Show Trash"}
                                </button>
                            </div>
                        </div>

                        {/* Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Type</label>
                            <SearchableDropdown
                                label="All Types"
                                value={typeFilter === 'All' ? '' : typeFilter}
                                onChange={(value) => {
                                    setTypeFilter(value as string || 'All');
                                    // Reset category and subcategory when type changes
                                    setSelectedCategoryFilter('');
                                    setSelectedSubCategoryFilter('');
                                }}
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'Digital', label: 'Digital' },
                                    { value: 'Bulk', label: 'Bulk' }
                                ]}
                                className="w-full"
                                searchPlaceholder="Search types..."
                                enableSearch={false}
                                buttonClassName="!border-teal-500 hover:!border-teal-600"
                                dropdownClassName="!border-teal-500"
                                searchClassName="!border-teal-500 focus:!border-teal-500 focus:!ring-teal-500"
                                searchIconClassName="!text-teal-600 !bg-teal-50 hover:!bg-teal-100"
                                scrollbarColor="#14b8a6"
                            />
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                            <SearchableDropdown
                                label="All Categories"
                                value={selectedCategoryFilter}
                                onChange={(value) => {
                                    setSelectedCategoryFilter(value as string);
                                    setSelectedSubCategoryFilter('');
                                }}
                                options={categoryOptions}
                                className="w-full"
                                searchPlaceholder="Search categories..."
                                enableSearch={true}
                                buttonClassName="!border-teal-500 hover:!border-teal-600"
                                dropdownClassName="!border-teal-500"
                                searchClassName="!border-teal-500 focus:!border-teal-500 focus:!ring-teal-500"
                                searchIconClassName="!text-teal-600 !bg-teal-50 hover:!bg-teal-100"
                                scrollbarColor="#14b8a6"
                            />
                        </div>

                        {/* Subcategory Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Subcategory</label>
                            <SearchableDropdown
                                label="All Subcategories"
                                value={selectedSubCategoryFilter}
                                onChange={(value) => setSelectedSubCategoryFilter(value as string)}
                                options={subCategoryOptions}
                                className="w-full"
                                searchPlaceholder="Search subcategories..."
                                enableSearch={true}
                                buttonClassName="!border-teal-500 hover:!border-teal-600"
                                dropdownClassName="!border-teal-500"
                                searchClassName="!border-teal-500 focus:!border-teal-500 focus:!ring-teal-500"
                                searchIconClassName="!text-teal-600 !bg-teal-50 hover:!bg-teal-100"
                                scrollbarColor="#14b8a6"
                            />
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as "All" | "Active" | "Inactive")}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active Only</option>
                                <option value="Inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                        {(productSearchQuery || selectedCategoryFilter || selectedSubCategoryFilter || statusFilter !== "All") && (
                            <button
                                onClick={() => {
                                    setProductSearchQuery('');
                                    setSelectedCategoryFilter('');
                                    setSelectedSubCategoryFilter('');
                                    setStatusFilter('All');
                                    fetchProducts();
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                            >
                                <X size={16} />
                                Clear Filters
                            </button>
                        )}
                        <button
                            onClick={() => fetchProducts()}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium"
                        >
                            <Filter size={16} />
                            Apply Filters
                        </button>
                    </div>
                </div>

                {/* Products List/Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader className="animate-spin text-teal-600 mb-4" size={48} />
                        <p className="text-gray-600 font-medium">
                            Loading products...
                        </p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                        <Package size={64} className="mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No Products Found
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {(productSearchQuery || selectedCategoryFilter)
                                ? 'Try adjusting your filters'
                                : 'Get started by creating your first product'}
                        </p>
                        {(productSearchQuery || selectedCategoryFilter) && (
                            <button
                                onClick={() => {
                                    setProductSearchQuery('');
                                    setSelectedCategoryFilter('');
                                    setSelectedSubCategoryFilter('');
                                    fetchProducts();
                                }}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 p-2">
                        <AnimatePresence mode="popLayout">
                            {filteredProducts.map((product) => (
                                <ProductItem
                                    key={product._id}
                                    product={product}
                                    viewMode={viewMode}
                                    onEdit={handleEditProduct}
                                    onDelete={handleDeleteProduct}
                                    onView={handleViewProduct}
                                    onToggleStatus={handleToggleProductStatus}
                                    onRestore={handleRestoreProduct}
                                    onDuplicate={handleDuplicateProduct}
                                    isHovered={hoveredProductId === product._id}
                                    onMouseEnter={() => setHoveredProductId(product._id)}
                                    onMouseLeave={() => setHoveredProductId(null)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredProducts.map((product) => (
                                <ProductItem
                                    key={product._id}
                                    product={product}
                                    viewMode={viewMode}
                                    onEdit={handleEditProduct}
                                    onDelete={handleDeleteProduct}
                                    onView={handleViewProduct}
                                    onToggleStatus={handleToggleProductStatus}
                                    onRestore={handleRestoreProduct}
                                    onDuplicate={handleDuplicateProduct}
                                    isHovered={hoveredProductId === product._id}
                                    onMouseEnter={() => setHoveredProductId(product._id)}
                                    onMouseLeave={() => setHoveredProductId(null)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Product Detail Modal */}
            <ProductDetailModal
                isOpen={showDetailModal}
                product={selectedProduct}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedProduct(null);
                }}
            />
        </>
    );
};

export default ManageProductsView;