import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Save, X, CheckCircle, XCircle, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminSearchableDropdown } from '../../AdminSearchableDropdown';

interface ProductAvailability {
    _id: string;
    product: {
        _id: string;
        name: string;
    };
    geoZone: {
        _id: string;
        name: string;
    };
    isSellable: boolean;
    reason?: string;
}

interface Product {
    _id: string;
    name: string;
}

interface GeoZone {
    _id: string;
    name: string;
}

/**
 * PRODUCT AVAILABILITY MANAGER
 * 
 * Manage product availability by geographical zones
 * Features:
 * - Set product availability per geo zone
 * - Block/allow products in specific regions
 * - Set availability reasons
 */
const ProductAvailabilityManager: React.FC = () => {
    const [availabilities, setAvailabilities] = useState<ProductAvailability[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [geoZones, setGeoZones] = useState<GeoZone[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingAvailability, setEditingAvailability] = useState<ProductAvailability | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        product: '',
        geoZone: '',
        isSellable: true,
        reason: '',
    });

    // Fetch data
    useEffect(() => {
        fetchAvailabilities();
        fetchProducts();
        fetchGeoZones();
    }, []);

    const fetchAvailabilities = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/pricing/product-availability', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setAvailabilities(data.availability || []);
            }
        } catch (error) {
            console.error('Failed to fetch product availabilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products || data);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    const fetchGeoZones = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/pricing/geo-zones', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setGeoZones(data.zones || []);
            }
        } catch (error) {
            console.error('Failed to fetch geo zones:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = editingAvailability
                ? `/api/admin/pricing/product-availability/${editingAvailability._id}`
                : '/api/admin/pricing/product-availability';

            const response = await fetch(url, {
                method: editingAvailability ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert(editingAvailability ? 'Availability updated!' : 'Availability rule created!');
                setShowModal(false);
                resetForm();
                fetchAvailabilities();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save availability rule');
            }
        } catch (error) {
            console.error('Error saving availability:', error);
            alert('Failed to save availability rule');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this availability rule?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/pricing/product-availability/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                alert('Availability rule deleted!');
                fetchAvailabilities();
            }
        } catch (error) {
            console.error('Error deleting availability:', error);
            alert('Failed to delete availability rule');
        }
    };

    const handleEdit = (availability: ProductAvailability) => {
        setEditingAvailability(availability);
        setFormData({
            product: availability.product._id,
            geoZone: availability.geoZone._id,
            isSellable: availability.isSellable,
            reason: availability.reason || '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            product: '',
            geoZone: '',
            isSellable: true,
            reason: '',
        });
        setEditingAvailability(null);
    };

    return (
        <div className="p-0">

            {/* Actions Bar */}
            <div className="mb-6 bg-white border-b border-gray-100 p-6 flex flex-wrap gap-4 justify-between items-center">
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
                >
                    <Plus size={20} />
                    New Availability Rule
                </button>

                <div className="flex-1 max-w-md hidden md:block">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Filter rules by product or zone..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Availabilities List */}
            <div className="p-6">
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Geo Zone</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Reason / Notes</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-sm text-gray-500 font-medium">Loading rules...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : availabilities.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-gray-50 rounded-full">
                                                    <Package size={32} className="text-gray-300" />
                                                </div>
                                                <div className="max-w-xs mx-auto">
                                                    <p className="text-gray-900 font-bold">No rules found</p>
                                                    <p className="text-sm text-gray-500 mt-1">Create availability rules to restrict product sales in specific geographical regions.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    availabilities.map((availability) => (
                                        <tr key={availability._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{availability.product.name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{availability.product._id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <MapPin size={14} className="text-gray-400" />
                                                    {availability.geoZone.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 w-fit ${availability.isSellable
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                                    }`}>
                                                    {availability.isSellable ? (
                                                        <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Available</>
                                                    ) : (
                                                        <><span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Blocked</>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-500 italic max-w-xs truncate">
                                                    {availability.reason || 'No specific reason provided'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(availability)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Rule"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(availability._id)}
                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete Rule"
                                                    >
                                                        <Trash2 size={16} />
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    {editingAvailability ? 'Edit Availability Rule' : 'New Availability Rule'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Configure cross-regional product restrictions.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                            <div className="px-8 py-8 space-y-6 flex-1 overflow-y-auto">
                                {/* Product Selection */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Target Product *</label>
                                    <AdminSearchableDropdown
                                        label="Select Product"
                                        options={products.map((product) => ({
                                            value: product._id,
                                            label: product.name
                                        }))}
                                        value={formData.product}
                                        onChange={(val) => setFormData({ ...formData, product: val as string })}
                                        searchPlaceholder="Search products by name..."
                                    />
                                </div>

                                {/* Geo Zone Selection */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Geographical Zone *</label>
                                    <AdminSearchableDropdown
                                        label="Select Geo Zone"
                                        options={geoZones.map((zone) => ({
                                            value: zone._id,
                                            label: zone.name
                                        }))}
                                        value={formData.geoZone}
                                        onChange={(val) => setFormData({ ...formData, geoZone: val as string })}
                                        searchPlaceholder="Search zones..."
                                    />
                                </div>

                                {/* Availability Status */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Publication Status *</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isSellable: true, reason: '' })}
                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.isSellable
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                        >
                                            <CheckCircle size={24} />
                                            <span className="text-sm font-bold">Sellable</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isSellable: false })}
                                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${!formData.isSellable
                                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                                        >
                                            <XCircle size={24} />
                                            <span className="text-sm font-bold">Blocked</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Reason (only if blocked) */}
                                {!formData.isSellable && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Restriction Reason</label>
                                        <textarea
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                                            placeholder="Example: This product is not compliant with local regulations in this state."
                                            rows={3}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2 ml-1 italic">
                                            Tip: This message will be displayed to customers when they try to purchase this item.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <><Save size={18} /> Update Matrix</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductAvailabilityManager;
