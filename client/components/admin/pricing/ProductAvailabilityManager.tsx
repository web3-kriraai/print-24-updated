import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Save, X, CheckCircle, XCircle } from 'lucide-react';

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
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-green-600" />
                    Product Availability Manager
                </h1>
                <p className="text-gray-600 mt-2">
                    Control which products are available in different geographical zones
                </p>
            </div>

            {/* Create Button */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Availability Rule
                </button>
            </div>

            {/* Availabilities List */}
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geo Zone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : availabilities.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No availability rules found. Create one to restrict product availability by region.
                                </td>
                            </tr>
                        ) : (
                            availabilities.map((availability) => (
                                <tr key={availability._id}>
                                    <td className="px-6 py-4 font-medium">{availability.product.name}</td>
                                    <td className="px-6 py-4">{availability.geoZone.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit ${availability.isSellable
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {availability.isSellable ? (
                                                <>
                                                    <CheckCircle size={16} />
                                                    Available
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle size={16} />
                                                    Blocked
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {availability.reason || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(availability)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(availability._id)}
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingAvailability ? 'Edit Availability Rule' : 'Create Availability Rule'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            {/* Product */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Product *</label>
                                <select
                                    value={formData.product}
                                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="">Select Product</option>
                                    {products.map((product) => (
                                        <option key={product._id} value={product._id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Geo Zone */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Geo Zone *</label>
                                <select
                                    value={formData.geoZone}
                                    onChange={(e) => setFormData({ ...formData, geoZone: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="">Select Geo Zone</option>
                                    {geoZones.map((zone) => (
                                        <option key={zone._id} value={zone._id}>
                                            {zone.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Availability Status */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Availability Status *</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="isSellable"
                                            checked={formData.isSellable === true}
                                            onChange={() => setFormData({ ...formData, isSellable: true, reason: '' })}
                                            className="text-green-600"
                                        />
                                        <CheckCircle size={20} className="text-green-600" />
                                        <span className="font-medium">Available (Sellable)</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="isSellable"
                                            checked={formData.isSellable === false}
                                            onChange={() => setFormData({ ...formData, isSellable: false })}
                                            className="text-red-600"
                                        />
                                        <XCircle size={20} className="text-red-600" />
                                        <span className="font-medium">Blocked (Not Sellable)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Reason (only if blocked) */}
                            {!formData.isSellable && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Reason for Blocking</label>
                                    <textarea
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="e.g., Not available in your region, Out of stock in this area"
                                        rows={3}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        This message will be shown to customers in this region
                                    </p>
                                </div>
                            )}

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
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save'}
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
