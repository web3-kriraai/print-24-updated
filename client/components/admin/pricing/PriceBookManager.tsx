import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Book, Star, Eye } from 'lucide-react';

interface PriceBook {
    _id: string;
    name: string;
    currency: string;
    isDefault: boolean;
    createdAt?: string;
}

interface Product {
    _id: string;
    name: string;
    image?: string;
    category?: { name: string };
}

interface PriceBookEntry {
    _id: string;
    product: Product;
    basePrice: number;
    compareAtPrice?: number;
}

/**
 * PRICE BOOK MANAGER
 * 
 * Manage price books and their product prices
 * Features:
 * - Create/edit/delete price books
 * - Set default price book
 * - Assign products to price books with prices
 * - View and manage price book entries
 */
const PriceBookManager: React.FC = () => {
    const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState<PriceBook | null>(null);

    // Price Book Entries state
    const [showEntriesModal, setShowEntriesModal] = useState(false);
    const [selectedPriceBook, setSelectedPriceBook] = useState<PriceBook | null>(null);
    const [priceBookEntries, setPriceBookEntries] = useState<PriceBookEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);

    // Add/Edit Entry state
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<PriceBookEntry | null>(null);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [entryForm, setEntryForm] = useState({
        product: '',
        basePrice: '',
        compareAtPrice: ''
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        currency: 'INR',
        isDefault: false
    });

    // Fetch price books
    useEffect(() => {
        fetchPriceBooks();
    }, []);

    const fetchPriceBooks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/price-books', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPriceBooks(data.priceBooks || []);
            }
        } catch (error) {
            console.error('Failed to fetch price books:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPriceBookEntries = async (priceBookId: string) => {
        setLoadingEntries(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/price-book-entries?priceBook=${priceBookId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPriceBookEntries(data.entries || []);
            }
        } catch (error) {
            console.error('Failed to fetch price book entries:', error);
        } finally {
            setLoadingEntries(false);
        }
    };

    const fetchAvailableProducts = async () => {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const data = await response.json();
                setAvailableProducts(data.products || data || []);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = editingBook
                ? `/api/admin/price-books/${editingBook._id}`
                : '/api/admin/price-books';

            const response = await fetch(url, {
                method: editingBook ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert(editingBook ? 'Price book updated!' : 'Price book created!');
                setShowModal(false);
                resetForm();
                fetchPriceBooks();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save price book');
            }
        } catch (error) {
            console.error('Error saving price book:', error);
            alert('Failed to save price book');
        } finally {
            setLoading(false);
        }
    };

    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPriceBook) return;

        setLoadingEntries(true);
        try {
            const token = localStorage.getItem('token');
            const url = editingEntry
                ? `/api/admin/price-book-entries/${editingEntry._id}`
                : '/api/admin/price-book-entries';

            const payload = {
                priceBook: selectedPriceBook._id,
                product: entryForm.product,
                basePrice: parseFloat(entryForm.basePrice),
                compareAtPrice: entryForm.compareAtPrice ? parseFloat(entryForm.compareAtPrice) : undefined
            };

            const response = await fetch(url, {
                method: editingEntry ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert(editingEntry ? 'Price updated!' : 'Product price added!');
                setShowEntryForm(false);
                resetEntryForm();
                fetchPriceBookEntries(selectedPriceBook._id);
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save price');
            }
        } catch (error) {
            console.error('Error saving price entry:', error);
            alert('Failed to save price');
        } finally {
            setLoadingEntries(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!confirm('Are you sure you want to delete this price entry?')) return;
        if (!selectedPriceBook) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/price-book-entries/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                alert('Price entry deleted!');
                fetchPriceBookEntries(selectedPriceBook._id);
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Failed to delete price entry');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this price book? All associated price entries will also be deleted.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/price-books/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                alert('Price book deleted!');
                fetchPriceBooks();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to delete price book');
            }
        } catch (error) {
            console.error('Error deleting price book:', error);
            alert('Failed to delete price book');
        }
    };

    const handleEdit = (book: PriceBook) => {
        setEditingBook(book);
        setFormData({
            name: book.name,
            currency: book.currency,
            isDefault: book.isDefault
        });
        setShowModal(true);
    };

    const handleViewEntries = (book: PriceBook) => {
        setSelectedPriceBook(book);
        setShowEntriesModal(true);
        fetchPriceBookEntries(book._id);
        fetchAvailableProducts();
    };

    const handleEditEntry = (entry: PriceBookEntry) => {
        setEditingEntry(entry);
        setEntryForm({
            product: entry.product._id,
            basePrice: entry.basePrice.toString(),
            compareAtPrice: entry.compareAtPrice?.toString() || ''
        });
        setShowEntryForm(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            currency: 'INR',
            isDefault: false
        });
        setEditingBook(null);
    };

    const resetEntryForm = () => {
        setEntryForm({
            product: '',
            basePrice: '',
            compareAtPrice: ''
        });
        setEditingEntry(null);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Book className="text-indigo-600" />
                    Price Book Manager
                </h1>
                <p className="text-gray-600 mt-2">
                    Manage price books and assign product prices for different pricing strategies
                </p>
            </div>

            {/* Create Button */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Price Book
                </button>
            </div>

            {/* Price Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && priceBooks.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                        Loading...
                    </div>
                ) : priceBooks.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                        No price books found. Create one to get started.
                    </div>
                ) : (
                    priceBooks.map((book) => (
                        <div
                            key={book._id}
                            className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-indigo-300 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {book.name}
                                        {book.isDefault && (
                                            <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-600 font-mono">{book.currency}</p>
                                </div>
                                {book.createdAt && (
                                    <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                                        {new Date(book.createdAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            {/* Badges */}
                            <div className="flex gap-2 mb-4">
                                {book.isDefault && (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                        Default
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                                <button
                                    onClick={() => handleViewEntries(book)}
                                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded hover:bg-green-100 flex items-center justify-center gap-2"
                                >
                                    <Eye size={16} />
                                    Prices
                                </button>
                                <button
                                    onClick={() => handleEdit(book)}
                                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(book._id)}
                                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Price Book Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingBook ? 'Edit Price Book' : 'Create Price Book'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Price Book Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., Standard Pricing, Seasonal Sale"
                                    required
                                />
                            </div>

                            {/* Currency */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Currency *</label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>

                            {/* Default Status */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium flex items-center gap-1">
                                        <Star size={16} className="text-yellow-500" />
                                        Set as Default Price Book
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                    This price book will be used as the default base for pricing calculations
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Price Book Entries Modal */}
            {showEntriesModal && selectedPriceBook && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {selectedPriceBook.name} - Product Prices
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Manage product prices for this price book
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowEntriesModal(false);
                                    setSelectedPriceBook(null);
                                    setPriceBookEntries([]);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Add Product Button */}
                            <div className="mb-6">
                                <button
                                    onClick={() => {
                                        resetEntryForm();
                                        setShowEntryForm(true);
                                    }}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Plus size={20} />
                                    Add Product Price
                                </button>
                            </div>

                            {/* Entries Table */}
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compare At</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {loadingEntries ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                                    Loading...
                                                </td>
                                            </tr>
                                        ) : priceBookEntries.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                                    No products added yet. Click "Add Product Price" to get started.
                                                </td>
                                            </tr>
                                        ) : (
                                            priceBookEntries.map((entry) => (
                                                <tr key={entry._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {entry.product.image && (
                                                                <img
                                                                    src={entry.product.image}
                                                                    alt={entry.product.name}
                                                                    className="w-10 h-10 rounded object-cover"
                                                                />
                                                            )}
                                                            <span className="font-medium">{entry.product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {entry.product.category?.name || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-green-600">
                                                        {selectedPriceBook.currency} {entry.basePrice.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {entry.compareAtPrice ? `${selectedPriceBook.currency} ${entry.compareAtPrice.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEditEntry(entry)}
                                                                className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteEntry(entry._id)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Entry Form Modal */}
            {showEntryForm && selectedPriceBook && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingEntry ? 'Edit Product Price' : 'Add Product Price'}
                        </h2>

                        <form onSubmit={handleEntrySubmit}>
                            {/* Product Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Product *</label>
                                <select
                                    value={entryForm.product}
                                    onChange={(e) => setEntryForm({ ...entryForm, product: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                    disabled={!!editingEntry}
                                >
                                    <option value="">Select Product</option>
                                    {availableProducts.map((product) => (
                                        <option key={product._id} value={product._id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Base Price */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Base Price ({selectedPriceBook.currency}) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={entryForm.basePrice}
                                    onChange={(e) => setEntryForm({ ...entryForm, basePrice: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            {/* Compare At Price */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Compare At Price ({selectedPriceBook.currency})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={entryForm.compareAtPrice}
                                    onChange={(e) => setEntryForm({ ...entryForm, compareAtPrice: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="0.00 (optional)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Original price before discount (for showing savings)
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEntryForm(false);
                                        resetEntryForm();
                                    }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loadingEntries}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    {loadingEntries ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceBookManager;
