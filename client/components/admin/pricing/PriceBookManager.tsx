import React, { useState, useEffect } from 'react';
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Save, X, Book, Star, Eye } from 'lucide-react';
import ConflictDetectionModal from '../../../src/components/admin/ConflictDetectionModal';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../../src/utils/currencyUtils';

interface PriceBook {
    _id: string;
    name: string;
    currency: string;
    isDefault: boolean;
    createdAt?: string;
    zone?: { _id: string; name: string };
    segment?: { _id: string; name: string };
}

interface Product {
    _id: string;
    name: string;
    image?: string;
    category?: { name: string };
}

interface PriceBookEntry {
    _id: string;
    product: Product | null;
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
        zone: '',
        segment: '',
        isMaster: false,
        parentBook: '',
        isOverride: false,
        overridePriority: 0,
        description: ''
    });

    // Conflict Resolution State
    const [conflictData, setConflictData] = useState<any>(null);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [resolvingConflict, setResolvingConflict] = useState(false);

    // Lookup data
    const [geoZones, setGeoZones] = useState<any[]>([]);
    const [userSegments, setUserSegments] = useState<any[]>([]);

    // Fetch price books and lookup data
    useEffect(() => {
        fetchPriceBooks();
        fetchLookupData();
    }, []);

    const fetchLookupData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [zonesRes, segmentsRes] = await Promise.all([
                fetch('/api/admin/pricing/geo-zones', { headers }),
                fetch('/api/admin/pricing/user-segments', { headers })
            ]);

            if (zonesRes.ok) {
                const data = await zonesRes.json();
                setGeoZones(data.zones || []);
            }

            if (segmentsRes.ok) {
                const data = await segmentsRes.json();
                setUserSegments(data.segments || []);
            }
        } catch (error) {
            console.error('Failed to fetch lookup data:', error);
        }
    };

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
                toast.success(editingBook ? 'Price book updated!' : 'Price book created!');
                setShowModal(false);
                resetForm();
                fetchPriceBooks();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to save price book');
            }
        } catch (error) {
            console.error('Error saving price book:', error);
            toast.error('Failed to save price book');
        } finally {
            setLoading(false);
        }
    };

    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPriceBook) return;

        setLoadingEntries(true);
        const token = localStorage.getItem('token');

        try {
            // CONFLICT DETECTION STEP
            // Relevant if we are adding/updating a price that might conflict with others
            if (!editingEntry && parseFloat(entryForm.basePrice) > 0) {
                // Prepare detection payload
                const detectionPayload = {
                    zoneId: selectedPriceBook.zone?._id || null,
                    segmentId: selectedPriceBook.segment?._id || null,
                    productId: entryForm.product,
                    newPrice: parseFloat(entryForm.basePrice)
                };

                const checkRes = await fetch('/api/admin/pricing/detect-conflicts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(detectionPayload)
                });

                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    console.log('🔍 Conflict Check Response:', checkData);
                    
                    // Handle both 'hasConflict' and 'hasConflicts' for compatibility
                    const hasConflict = checkData.success && checkData.data && 
                                       (checkData.data.hasConflict || checkData.data.hasConflicts);
                    
                    if (hasConflict) {
                        // Conflicts detected! Show modal.
                        console.log('⚠️ CONFLICTS DETECTED! Showing modal with data:', checkData.data);
                        setConflictData({
                            ...checkData.data,
                            payload: detectionPayload // store payload for resolution
                        });
                        setShowConflictModal(true);
                        setLoadingEntries(false);
                        return; // Halt standard submission
                    } else {
                        console.log('✅ No conflicts detected, proceeding with save');
                    }
                }
            }

            // Standard Submission flow (No conflicts or simple update)
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
                toast.success(editingEntry ? 'Price updated!' : 'Product price added!');
                setShowEntryForm(false);
                resetEntryForm();
                fetchPriceBookEntries(selectedPriceBook._id);
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to save price');
            }
        } catch (error) {
            console.error('Error saving price entry:', error);
            toast.error('Failed to save price');
        } finally {
            setLoadingEntries(false);
        }
    };

    const handleResolveConflict = async (resolutionId: string) => {
        if (!conflictData) return;

        setResolvingConflict(true);
        try {
            const token = localStorage.getItem('token');
            
            // Extract conflict information
            const productId = conflictData.payload?.productId;
            const newPrice = conflictData.payload?.newPrice;
            const oldPrice = conflictData.impactSummary?.currentMasterPrice || 0;
            const zoneId = conflictData.payload?.zoneId;
            const segmentId = conflictData.payload?.segmentId;
            
            // Get conflicts array - backend needs this
            const conflicts = conflictData.conflicts || [];
            
            const requestBody = {
                resolutionId: resolutionId,  // Backend expects 'resolutionId' not 'resolution'
                productId,
                newPrice,
                oldPrice,
                zoneId,
                segmentId,
                conflicts,  // Backend needs conflicts array
                updateLevel: 'ZONE'
            };
            
            console.log('🚀 Sending conflict resolution request:', requestBody);
            
            const response = await fetch('/api/admin/pricing/resolve-conflict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                toast.success('Conflict resolved and price saved successfully!');
                setShowConflictModal(false);
                setShowEntryForm(false);
                resetEntryForm();
                setConflictData(null);
                if (selectedPriceBook) {
                    fetchPriceBookEntries(selectedPriceBook._id);
                }
            } else {
                const error = await response.json();
                console.error('❌ Conflict resolution failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error,
                    sentRequest: requestBody
                });
                toast.error(error.message || 'Failed to resolve conflict');
            }
        } catch (error) {
            console.error('Error resolving conflict:', error);
            toast.error('Failed to resolve conflict');
        } finally {
            setResolvingConflict(false);
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
                toast.success('Price entry deleted!');
                fetchPriceBookEntries(selectedPriceBook._id);
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to delete price entry');
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            toast.error('Failed to delete price entry');
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
                toast.success('Price book deleted!');
                fetchPriceBooks();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to delete price book');
            }
        } catch (error) {
            console.error('Error deleting price book:', error);
            toast.error('Failed to delete price book');
        }
    };

    const handleEdit = (book: PriceBook) => {
        setEditingBook(book);
        setFormData({
            name: book.name,
            currency: book.currency,
            zone: book.zone?._id || '',
            segment: book.segment?._id || '',
            isMaster: (book as any).isMaster || false,
            parentBook: (book as any).parentBook || '',
            isOverride: (book as any).isOverride || false,
            overridePriority: (book as any).overridePriority || 0,
            description: (book as any).description || ''
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
        if (!entry.product) {
            toast.success('Cannot edit this entry: Product data is missing. Please delete and recreate this entry.');
            return;
        }
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
            zone: '',
            segment: '',
            isMaster: false,
            parentBook: '',
            isOverride: false,
            overridePriority: 0,
            description: ''
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
            <div className="mb-6 flex gap-4">
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
                
                {/* TEST BUTTON - Remove after testing */}
                <button
                    onClick={() => {
                        console.log('🧪 TEST: Manually triggering conflict modal');
                        setConflictData({
                            hasConflict: true,
                            affectedCount: 2,
                            affectedItems: [
                                {
                                    segment: { _id: '1', name: 'CORPORATE', code: 'CORP' },
                                    pricing: {
                                       masterPrice: 1000,
                                        currentPrice: 1050,
                                        newZonePrice: 1200,
                                        priceDifference: 150,
                                        percentageDifference: '14.29%',
                                        direction: 'increase'
                                    }
                                },
                                {
                                    segment: { _id: '2', name: 'RETAIL', code: 'RET' },
                                    pricing: {
                                        masterPrice: 1000,
                                        currentEffectivePrice: 900,
                                        newZonePrice: 1200,
                                        priceDifference: 300,
                                        percentageDifference: '33.33%',
                                        direction: 'increase'
                                    }
                                }
                            ],
                            impactSummary: {
                                product: { _id: 'test123', name: 'Test Product', sku: 'TEST-001' },
                                updateLevel: 'ZONE',
                                currentMasterPrice: 1000,
                                newPrice: 1200,
                                totalAffectedItems: 2,
                                affectedSegments: ['CORPORATE', 'RETAIL']
                            },
                            resolutionOptions: [
                                {
                                    id: 'OVERWRITE',
                                    label: 'Force Overwrite',
                                    description: 'Delete all overrides',
                                    impact: { warning: 'Will delete 2 items', itemsDeleted: 2 }
                                },
                                {
                                    id: 'PRESERVE',
                                    label: 'Preserve Overrides',
                                    description: 'Keep existing prices',
                                    impact: { warning: 'Will preserve 2 items', itemsPreserved: 2 }
                                }
                            ],
                            payload: { productId: 'test123', newPrice: 1200 }
                        });
                        setShowConflictModal(true);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                    🧪 TEST MODAL
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
                                        {(book as any).isMaster && (
                                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium">Master</span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-600 font-mono">{book.currency}</p>
                                    {/* Zone/Segment Badges */}
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {book.zone && (
                                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                                Zone: {book.zone.name}
                                            </span>
                                        )}
                                        {book.segment && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                Segment: {book.segment.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {book.createdAt && (
                                    <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                                        {new Date(book.createdAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            {/* Badges - Removed since we don't need separate badge section anymore */}
                            <div className="flex gap-2 mb-4">
                                {/* Empty - badges now inline with title */}
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
                                <label className="block text-sm font-medium mb-2">
                                    Currency * 
                                    {formData.zone && (
                                        <span className="ml-2 text-xs text-indigo-600 font-normal">
                                            (Auto-set from GeoZone)
                                        </span>
                                    )}
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className={`w-full border rounded-lg px-3 py-2 ${
                                        formData.zone ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    disabled={!!formData.zone}
                                    required
                                >
                                    {SUPPORTED_CURRENCIES.map((curr) => (
                                        <option key={curr.code} value={curr.code}>
                                            {curr.code} ({curr.symbol}) - {curr.name}
                                        </option>
                                    ))}
                                </select>
                                {formData.zone ? (
                                    <p className="text-xs text-indigo-600 mt-1">
                                        ✓ Currency automatically set from selected GeoZone
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Select a GeoZone to auto-set currency, or choose manually
                                    </p>
                                )}
                            </div>

                            {/* Geo Zone Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Geo Zone (Optional)</label>
                                <select
                                    value={formData.zone}
                                    onChange={(e) => {
                                        const selectedZoneId = e.target.value;
                                        // Find the selected zone and auto-set currency
                                        const selectedZone = geoZones.find(z => z._id === selectedZoneId);
                                        setFormData({
                                            ...formData,
                                            zone: selectedZoneId,
                                            currency: selectedZone?.currency_code || formData.currency
                                        });
                                    }}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">-- No Zone (Global) --</option>
                                    {geoZones.map((zone) => (
                                        <option key={zone._id} value={zone._id}>
                                            {zone.name} ({zone.currency_code || 'INR'})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Limit these prices to a specific geographic area. Currency will be auto-set.
                                </p>
                            </div>

                            {/* User Segment Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">User Segment (Optional)</label>
                                <select
                                    value={formData.segment}
                                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">-- No Segment (All Users) --</option>
                                    {userSegments.map((segment) => (
                                        <option key={segment._id} value={segment._id}>
                                            {segment.name} ({segment.code})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Limit these prices to a specific group of customers
                                </p>
                            </div>

                            {/* Master Price Book - Only checkbox needed */}
                            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isMaster}
                                        onChange={(e) => setFormData({ ...formData, isMaster: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span className="text-sm font-bold text-indigo-900">📚 Master Price Book</span>
                                </label>
                                <p className="text-xs text-indigo-700 mb-1">
                                    ✓ Contains base prices for ALL products (foundation layer)
                                </p>
                                <p className="text-xs text-indigo-600">
                                    ⚠️ Only ONE master book should exist. Zone/Segment books override these prices.
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                                                            {entry.product?.image && (
                                                                <img
                                                                    src={entry.product.image}
                                                                    alt={entry.product.name}
                                                                    className="w-10 h-10 rounded object-cover"
                                                                />
                                                            )}
                                                            <span className="font-medium">{entry.product?.name || 'Unknown Product'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {entry.product?.category?.name || '-'}
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
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

            {/* CONFLICT RESOLUTION MODAL */}
            {(() => {
                console.log('🎭 Modal Render Check:', {
                    showConflictModal,
                    hasConflictData: !!conflictData,
                    conflictData: conflictData
                });
                return null;
            })()}
            {showConflictModal && conflictData && (
                <ConflictDetectionModal
                    conflict={conflictData}
                    onResolve={handleResolveConflict}
                    onCancel={() => {
                        setShowConflictModal(false);
                        setConflictData(null);
                        setLoadingEntries(false);
                    }}
                />
            )}
        </div>
    );
};

export default PriceBookManager;
