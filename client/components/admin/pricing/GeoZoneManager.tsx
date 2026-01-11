import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Save, X } from 'lucide-react';

interface PincodeRange {
    start: number;
    end: number;
}

interface GeoZone {
    _id: string;
    name: string;
    code: string;
    currency: string;
    pincodeRanges: PincodeRange[];
    isActive: boolean;
}

/**
 * GEO ZONE MANAGER
 * 
 * Manage geographical zones for location-based pricing
 * Features:
 * - Create/edit/delete geo zones
 * - Manage pincode ranges
 * - Set currency per zone
 * - Activate/deactivate zones
 */
const GeoZoneManager: React.FC = () => {
    const [geoZones, setGeoZones] = useState<GeoZone[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingZone, setEditingZone] = useState<GeoZone | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        currency: 'INR',
        pincodeRanges: [{ start: 0, end: 0 }],
        isActive: true,
    });

    // Fetch geo zones
    useEffect(() => {
        fetchGeoZones();
    }, []);

    const fetchGeoZones = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = editingZone
                ? `/api/admin/pricing/geo-zones/${editingZone._id}`
                : '/api/admin/pricing/geo-zones';

            const response = await fetch(url, {
                method: editingZone ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert(editingZone ? 'Geo zone updated!' : 'Geo zone created!');
                setShowModal(false);
                resetForm();
                fetchGeoZones();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to save geo zone');
            }
        } catch (error) {
            console.error('Error saving geo zone:', error);
            alert('Failed to save geo zone');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this geo zone?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/pricing/geo-zones/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                alert('Geo zone deleted!');
                fetchGeoZones();
            }
        } catch (error) {
            console.error('Error deleting geo zone:', error);
            alert('Failed to delete geo zone');
        }
    };

    const handleEdit = (zone: GeoZone) => {
        setEditingZone(zone);
        setFormData({
            name: zone.name,
            code: zone.code,
            currency: zone.currency,
            pincodeRanges: zone.pincodeRanges.length > 0 ? zone.pincodeRanges : [{ start: 0, end: 0 }],
            isActive: zone.isActive,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            currency: 'INR',
            pincodeRanges: [{ start: 0, end: 0 }],
            isActive: true,
        });
        setEditingZone(null);
    };

    const addPincodeRange = () => {
        setFormData({
            ...formData,
            pincodeRanges: [...formData.pincodeRanges, { start: 0, end: 0 }],
        });
    };

    const removePincodeRange = (index: number) => {
        setFormData({
            ...formData,
            pincodeRanges: formData.pincodeRanges.filter((_, i) => i !== index),
        });
    };

    const updatePincodeRange = (index: number, field: 'start' | 'end', value: number) => {
        const newRanges = [...formData.pincodeRanges];
        newRanges[index][field] = value;
        setFormData({ ...formData, pincodeRanges: newRanges });
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="text-blue-600" />
                    Geo Zone Manager
                </h1>
                <p className="text-gray-600 mt-2">
                    Manage geographical zones for location-based pricing
                </p>
            </div>

            {/* Create Button */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create Geo Zone
                </button>
            </div>

            {/* Geo Zones List */}
            <div className="bg-white rounded-lg shadow">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pincode Ranges</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : geoZones.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    No geo zones found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            geoZones.map((zone) => (
                                <tr key={zone._id}>
                                    <td className="px-6 py-4 font-medium">{zone.name}</td>
                                    <td className="px-6 py-4">{zone.code}</td>
                                    <td className="px-6 py-4">{zone.currency}</td>
                                    <td className="px-6 py-4">
                                        {zone.pincodeRanges && zone.pincodeRanges.length > 0 ? (
                                            zone.pincodeRanges.map((range, idx) => (
                                                <div key={idx} className="text-sm">
                                                    {range.start} - {range.end}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 text-sm">No ranges</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${zone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {zone.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(zone)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(zone._id)}
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingZone ? 'Edit Geo Zone' : 'Create Geo Zone'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Zone Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., North India"
                                    required
                                />
                            </div>

                            {/* Code */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Zone Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., NORTH"
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

                            {/* Pincode Ranges */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Pincode Ranges *</label>
                                {formData.pincodeRanges.map((range, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <input
                                            type="number"
                                            value={range.start || ''}
                                            onChange={(e) => updatePincodeRange(index, 'start', parseInt(e.target.value))}
                                            className="flex-1 border rounded-lg px-3 py-2"
                                            placeholder="Start (e.g., 110000)"
                                            required
                                        />
                                        <span className="self-center">-</span>
                                        <input
                                            type="number"
                                            value={range.end || ''}
                                            onChange={(e) => updatePincodeRange(index, 'end', parseInt(e.target.value))}
                                            className="flex-1 border rounded-lg px-3 py-2"
                                            placeholder="End (e.g., 119999)"
                                            required
                                        />
                                        {formData.pincodeRanges.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePincodeRange(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addPincodeRange}
                                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                >
                                    <Plus size={16} />
                                    Add Range
                                </button>
                            </div>

                            {/* Active Status */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium">Active</span>
                                </label>
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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

export default GeoZoneManager;
