import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Loader,
    RefreshCw,
    Check,
    AlertCircle,
    Filter,
    Save,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown
} from 'lucide-react';
import { getAuthHeaders } from '../../../../utils/auth';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../../../../lib/apiConfig';
import toast from 'react-hot-toast';
import { SearchableDropdown } from '../../../../components/SearchableDropdown';
import { formatCurrencyFull } from '../../../../utils/pricing';

interface Product {
    _id: string;
    name: string;
    image?: string;
    basePrice: number;
    sortOrder?: number;
    category?: { _id: string; name: string } | string;
    subcategory?: { _id: string; name: string } | string;
}

interface Category {
    _id: string;
    name: string;
    type?: string;
}

interface SubCategory {
    _id: string;
    name: string;
    category?: { _id: string; name: string } | string;
}

interface SortProductsViewProps {
    categories: Category[];
    subCategories: SubCategory[];
}

const ITEMS_PER_PAGE = 10;

const SortProductsView: React.FC<SortProductsViewProps> = ({ categories, subCategories }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editedSortOrders, setEditedSortOrders] = useState<{ [key: string]: number }>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch products
    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `${API_BASE_URL}/products`;
            if (selectedSubCategory) {
                url = `${API_BASE_URL}/products/subcategory/${selectedSubCategory}`;
            } else if (selectedCategory) {
                url = `${API_BASE_URL}/products/category/${selectedCategory}`;
            } else if (selectedType) {
                // If only type is selected, we might want to filter by type, but currently API doesn't support products/type directly in this context easily without a new endpoint or query param.
                // For now, if no category is selected, we fetch all (or we could filter client side, but pagination makes that tricky).
                // Ideally, we should add a query param ?type=... to /products.
                // Assuming /products returns all, we can filter client side if needed, BUT products are paginated in the VIEW (client side pagination on full list?).
                // Wait, fetchProducts gets ALL products?
                // yes: const productList = Array.isArray(data) ? data : [];
                // So we can filter by type client side if needed.
            }

            const response = await fetch(url, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }

            const data = await response.json();
            let productList = Array.isArray(data) ? data : [];

            // Client-side filter by type if selected and no category selected (because category implies type)
            if (selectedType && !selectedCategory) {
                // We need to know which products belong to this type.
                // Products have category. If category has type.
                // The product interface has category?: { _id: string; name: string } | string;
                // It doesn't have the type directly on category object in product usually unless populated deep.
                // However, we can filter based on the 'categories' prop we have.
                const categoriesOfType = categories.filter(c => c.type === selectedType).map(c => c._id);
                productList = productList.filter(p => {
                    const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
                    return categoriesOfType.includes(pCatId as string);
                });
            }

            // Sort by sortOrder
            productList.sort((a: Product, b: Product) => (a.sortOrder || 0) - (b.sortOrder || 0));

            setProducts(productList);
            setEditedSortOrders({});
            setHasChanges(false);
            setCurrentPage(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, selectedSubCategory, selectedType, categories]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Handle sort order change
    const handleSortOrderChange = (productId: string, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0) {
            setEditedSortOrders(prev => ({
                ...prev,
                [productId]: numValue
            }));
            setHasChanges(true);
        }
    };

    // Save all changes
    const saveAllChanges = async () => {
        if (Object.keys(editedSortOrders).length === 0) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Build updates array
            const updates = Object.entries(editedSortOrders).map(([productId, sortOrder]) => ({
                productId,
                sortOrder
            }));

            // Use batch update endpoint
            const response = await fetch(`${API_BASE_URL}/products/sort-order`, {
                method: 'PUT',
                headers: getAuthHeaders(true),
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save');
            }

            const result = await response.json();
            setSuccess(`Successfully updated ${result.updated} product(s)!`);
            toast.success(`Updated ${result.updated} product(s)`);
            setEditedSortOrders({});
            setHasChanges(false);
            // Refresh to show new order
            await fetchProducts();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save order');
            toast.error('Failed to save product order');
        } finally {
            setSaving(false);
        }
    };

    // Get unique types
    const uniqueTypes = Array.from(new Set(categories.map(cat => cat.type).filter(Boolean))) as string[];

    // Filter categories based on selected type
    const filteredCategories = selectedType
        ? categories.filter(cat => cat.type === selectedType)
        : categories;

    // Get filtered subcategories
    const filteredSubCategories = selectedCategory
        ? subCategories.filter(sc => {
            const catId = typeof sc.category === 'object' ? sc.category?._id : sc.category;
            return catId === selectedCategory;
        })
        : []; // Only show subcategories if a category is selected

    const getCategoryName = (cat: any) => {
        if (!cat) return 'N/A';
        return typeof cat === 'object' ? cat.name : 'N/A';
    };

    // Pagination
    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedProducts = products.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowUpDown size={24} className="text-purple-600" />
                        Sort Products
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Set the display order for products in the product selection deck.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={fetchProducts}
                        disabled={loading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    {hasChanges && (
                        <button
                            onClick={saveAllChanges}
                            disabled={saving}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                        >
                            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Changes
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3 text-gray-700">
                    <Filter size={18} />
                    <span className="font-medium">Filter by Category</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <SearchableDropdown
                            label="All Types"
                            value={selectedType}
                            onChange={(value) => {
                                setSelectedType(value as string);
                                setSelectedCategory('');
                                setSelectedSubCategory('');
                            }}
                            options={[
                                { value: '', label: 'All Types' },
                                ...uniqueTypes.map(type => ({ value: type, label: type }))
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <SearchableDropdown
                            label="All Categories"
                            value={selectedCategory}
                            onChange={(value) => {
                                setSelectedCategory(value as string);
                                setSelectedSubCategory('');
                            }}
                            options={[
                                { value: '', label: 'All Categories' },
                                ...filteredCategories.map(cat => ({ value: cat._id, label: cat.name }))
                            ]}
                            className="w-full"
                            enableSearch={true}
                            searchPlaceholder="Search categories..."
                        />
                    </div>

                    {/* Subcategory Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                        <SearchableDropdown
                            label="All Subcategories"
                            value={selectedSubCategory}
                            onChange={(value) => setSelectedSubCategory(value as string)}
                            options={[
                                { value: '', label: 'All Subcategories' },
                                ...filteredSubCategories.map(sc => ({ value: sc._id, label: sc.name }))
                            ]}
                            className="w-full"
                            disabled={!selectedCategory}
                            enableSearch={true}
                            searchPlaceholder="Search subcategories..."
                        />
                    </div>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <Check size={20} />
                    {success}
                </div>
            )}

            {/* Products Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <span className="font-medium text-gray-700">
                        {products.length} Product{products.length !== 1 ? 's' : ''}
                        {products.length > ITEMS_PER_PAGE && ` (Showing ${startIndex + 1}-${Math.min(endIndex, products.length)})`}
                    </span>
                    {hasChanges && (
                        <span className="text-sm text-amber-600 flex items-center gap-1">
                            <AlertCircle size={14} />
                            {Object.keys(editedSortOrders).length} unsaved change(s)
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader size={32} className="animate-spin text-purple-600" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Package size={48} className="mb-4 opacity-50" />
                        <p>No products found</p>
                        <p className="text-sm">Select a category to see its products</p>
                    </div>
                ) : (
                    <>
                        <div className="min-w-full">
                            {/* Desktop Header - Only visible on LG screens */}
                            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
                                <div className="col-span-1">Order</div>
                                <div className="col-span-5">Product</div>
                                <div className="col-span-4">Category</div>
                                <div className="col-span-2 text-right">Price</div>
                            </div>

                            {/* Products List/Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0 p-4 lg:p-0">
                                {paginatedProducts.map((product) => {
                                    const currentOrder = editedSortOrders[product._id] ?? product.sortOrder ?? 0;
                                    const isEdited = editedSortOrders[product._id] !== undefined;

                                    return (
                                        <motion.div
                                            key={product._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`
                                                relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden
                                                hover:shadow-md transition-all duration-200
                                                lg:rounded-none lg:border-0 lg:border-b lg:shadow-none lg:hover:shadow-none lg:hover:bg-gray-50
                                                ${isEdited ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200 lg:ring-0' : ''}
                                            `}
                                        >
                                            <div className="p-4 lg:px-4 lg:py-3 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                                                {/* Mobile: Header Section with Image & Name */}
                                                <div className="lg:col-span-5 lg:order-2 flex items-center gap-3">
                                                    <div className="w-12 h-12 lg:w-10 lg:h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
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
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-semibold text-gray-900 text-base lg:text-sm block truncate">
                                                            {product.name}
                                                        </span>
                                                        {/* Mobile Only Category Subtitle */}
                                                        <div className="lg:hidden text-xs text-gray-500 truncate mt-0.5">
                                                            {getCategoryName(product.category)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Order Input Area */}
                                                <div className="lg:col-span-1 lg:order-1 flex items-center justify-between lg:justify-start">
                                                    <span className="lg:hidden text-sm font-medium text-gray-500">Sort Order</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={currentOrder}
                                                        onChange={(e) => handleSortOrderChange(product._id, e.target.value)}
                                                        className={`w-20 lg:w-full px-2 py-1.5 text-center border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-medium
                                                            ${isEdited ? 'border-amber-400 bg-white ring-2 ring-amber-100' : 'border-gray-200 bg-gray-50 lg:bg-white'}
                                                        `}
                                                    />
                                                </div>

                                                {/* Desktop Category */}
                                                <div className="hidden lg:block lg:col-span-4 lg:order-3 text-sm text-gray-600 truncate">
                                                    {getCategoryName(product.category)}
                                                    {product.subcategory && (
                                                        <span className="text-gray-400"> → {getCategoryName(product.subcategory)}</span>
                                                    )}
                                                </div>

                                                {/* Price */}
                                                <div className="lg:col-span-2 lg:order-4 flex items-center justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 mt-2 lg:mt-0">
                                                    <span className="lg:hidden text-sm font-medium text-gray-500">Base Price</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {formatCurrencyFull(product.basePrice)}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium">How to use</p>
                        <ul className="text-sm mt-1 space-y-1">
                            <li>• Enter the order number for each product (lower numbers appear first)</li>
                            <li>• Click "Save Changes" to apply your changes</li>
                            <li>• Products with the same order number will be sorted by creation date</li>
                            <li>• The order set here will be reflected in the product selection deck</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SortProductsView;
