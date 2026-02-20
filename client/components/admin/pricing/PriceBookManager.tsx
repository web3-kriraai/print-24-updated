import React, { useState, useEffect } from 'react';
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Save, X, Book, Star, Eye, Copy } from 'lucide-react';
import ConflictDetectionModal from '../ConflictDetectionModal';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../../utils/currencyUtils';

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

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterZone, setFilterZone] = useState('');
    const [filterSegment, setFilterSegment] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Computed filtered price books
    const filteredBooks = React.useMemo(() => {
        return priceBooks.filter(book => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                book.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (book as any).description?.toLowerCase().includes(searchQuery.toLowerCase());

            // Zone filter
            const matchesZone = filterZone === '' ||
                book.zone?._id === filterZone;

            // Segment filter
            const matchesSegment = filterSegment === '' ||
                book.segment?._id === filterSegment;

            return matchesSearch && matchesZone && matchesSegment;
        });
    }, [priceBooks, searchQuery, filterZone, filterSegment]);

    // Pagination computed values
    const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
    const paginatedBooks = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredBooks.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredBooks, currentPage, itemsPerPage]);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterZone, filterSegment]);

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

    // Copy Price Book with all entries
    const handleCopyPriceBook = async (book: PriceBook) => {
        const newName = prompt(
            'Enter name for the copied price book:',
            `${book.name} (Copy)`
        );

        if (!newName || newName.trim() === '') {
            return; // User cancelled or empty name
        }

        setLoading(true);
        const loadingToast = toast.loading('Copying price book...');

        try {
            const token = localStorage.getItem('token');

            // Call the copy API endpoint
            const response = await fetch(`/api/admin/price-books/${book._id}/copy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name: newName.trim() }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.dismiss(loadingToast);
                toast.success(`Price book copied! ${result.entriesCopied || 0} product prices duplicated.`);
                fetchPriceBooks();
            } else {
                const error = await response.json();
                toast.dismiss(loadingToast);
                toast.error(error.message || 'Failed to copy price book');
            }
        } catch (error) {
            console.error('Error copying price book:', error);
            toast.dismiss(loadingToast);
            toast.error('Failed to copy price book');
        } finally {
            setLoading(false);
        }
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

            {/* Toolbar: Search, Filters, Create Button */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search price books..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Zone Filter */}
                    <select
                        value={filterZone}
                        onChange={(e) => setFilterZone(e.target.value)}
                        className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                    >
                        <option value="">All Zones</option>
                        {geoZones.map((zone) => (
                            <option key={zone._id} value={zone._id}>{zone.name}</option>
                        ))}
                    </select>

                    {/* Segment Filter */}
                    <select
                        value={filterSegment}
                        onChange={(e) => setFilterSegment(e.target.value)}
                        className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                    >
                        <option value="">All Segments</option>
                        {userSegments.map((segment) => (
                            <option key={segment._id} value={segment._id}>{segment.name}</option>
                        ))}
                    </select>

                    {/* Create Button */}
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm"
                    >
                        <Plus size={20} />
                        New Price Book
                    </button>
                </div>

                {/* Stats Bar */}
                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        <span>{priceBooks.filter(b => (b as any).isMaster).length} Master</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        <span>{priceBooks.filter(b => b.zone).length} Zone-Specific</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>{priceBooks.filter(b => b.segment).length} Segment-Specific</span>
                    </div>
                    <div className="ml-auto font-medium text-gray-800">
                        {filteredBooks.length} of {priceBooks.length} price books
                    </div>
                </div>
            </div>

            {/* Price Books Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading && priceBooks.length === 0 ? (
                    <div className="text-center text-gray-500 py-16">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        Loading price books...
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="text-center py-16">
                        <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                            {priceBooks.length === 0
                                ? "No price books found. Create one to get started."
                                : "No price books match your search criteria."
                            }
                        </p>
                        {priceBooks.length > 0 && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterZone(''); setFilterSegment(''); }}
                                className="mt-4 text-indigo-600 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Price Book
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Scope
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Currency
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paginatedBooks.map((book) => (
                                    <tr
                                        key={book._id}
                                        className={`hover:bg-gray-50 transition-colors ${(book as any).isMaster ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        {/* Name & Type */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(book as any).isMaster
                                                        ? 'bg-indigo-100 text-indigo-600'
                                                        : book.zone && book.segment
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : book.zone
                                                                ? 'bg-purple-100 text-purple-600'
                                                                : book.segment
                                                                    ? 'bg-blue-100 text-blue-600'
                                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    <Book size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                        {book.name}
                                                        {(book as any).isMaster && (
                                                            <Star size={14} className="text-amber-500 fill-amber-500" />
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {(book as any).description ||
                                                            ((book as any).isMaster ? 'Base prices for all products' : 'Custom pricing rules')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Scope (Zone/Segment) */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(book as any).isMaster && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                        Master
                                                    </span>
                                                )}
                                                {book.zone && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                        📍 {book.zone.name}
                                                    </span>
                                                )}
                                                {book.segment && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        👥 {book.segment.name}
                                                    </span>
                                                )}
                                                {!book.zone && !book.segment && !(book as any).isMaster && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        Global
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Currency */}
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-100 text-gray-800 font-mono text-sm font-medium">
                                                {book.currency}
                                            </span>
                                        </td>

                                        {/* Created Date */}
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {book.createdAt ? new Date(book.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            }) : '-'}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewEntries(book)}
                                                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                    title="View Prices"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleCopyPriceBook(book)}
                                                    className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                                                    title="Copy Price Book"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(book)}
                                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(book._id)}
                                                    className={`p-2 rounded-lg transition-colors ${(book as any).isMaster
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        }`}
                                                    title={(book as any).isMaster ? "Cannot delete Master" : "Delete"}
                                                    disabled={(book as any).isMaster}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {filteredBooks.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBooks.length)} of {filteredBooks.length}
                            </span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ⏮
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ◀
                            </button>
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
                                        className={`px-3 py-1.5 text-sm rounded-lg ${currentPage === pageNum
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-gray-300 hover:bg-gray-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ▶
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ⏭
                            </button>
                        </div>
                    </div>
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
                                    className={`w-full border rounded-lg px-3 py-2 ${formData.zone ? 'bg-gray-100 cursor-not-allowed' : ''
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
