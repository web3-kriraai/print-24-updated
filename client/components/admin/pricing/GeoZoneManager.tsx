import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Save, X, Copy, Upload, FileText } from 'lucide-react';

interface PincodeRange {
    start: number;
    end: number;
}

interface GeoZone {
    _id: string;
    name: string;
    code: string;
    currency_code: string;
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
        currency_code: 'INR',
        level: 'COUNTRY',
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
                // Check if response has content and is JSON before parsing
                const contentType = response.headers.get('content-type');
                let errorMessage = 'Failed to save geo zone';

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const error = await response.json();
                        errorMessage = error.message || errorMessage;
                    } catch (e) {
                        // If JSON parsing fails, use the default error message
                        console.error('Failed to parse error response:', e);
                    }
                } else {
                    // Try to get text response if not JSON
                    try {
                        const text = await response.text();
                        if (text) errorMessage = text;
                    } catch (e) {
                        console.error('Failed to parse text response:', e);
                    }
                }

                alert(errorMessage);
            }
        } catch (error) {
            console.error('Error saving geo zone:', error);
            alert('Failed to save geo zone');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, force: boolean = false) => {
        if (!force && !confirm('Are you sure you want to delete this geo zone?')) return;

        try {
            const token = localStorage.getItem('token');
            const url = force
                ? `/api/admin/pricing/geo-zones/${id}?force=true`
                : `/api/admin/pricing/geo-zones/${id}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                alert('Geo zone deleted!');
                fetchGeoZones();
            } else {
                const data = await response.json();

                // Handle dependency confirmation
                if (response.status === 400 && data.requiresConfirmation) {
                    if (confirm(`${data.message}\n\nDo you want to FORCE DELETE? This action cannot be undone.`)) {
                        await handleDelete(id, true);
                        return;
                    }
                } else {
                    alert(data.message || 'Failed to delete geo zone');
                }
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
            currency_code: (zone as any).currency_code || (zone as any).currency || 'INR',
            level: (zone as any).level || 'COUNTRY',
            pincodeRanges: zone.pincodeRanges.length > 0 ? zone.pincodeRanges : [{ start: 0, end: 0 }],
            isActive: zone.isActive,
        });
        setShowModal(true);
    };

    const handleDuplicate = (zone: GeoZone) => {
        setEditingZone(null); // Create mode
        setFormData({
            name: `${zone.name} (Copy)`,
            code: `${zone.code}_COPY`,
            currency_code: (zone as any).currency_code || (zone as any).currency || 'INR',
            level: (zone as any).level || 'COUNTRY',
            // Deep copy pincode ranges
            pincodeRanges: zone.pincodeRanges.map(r => ({ ...r })),
            isActive: true,
        });
        setShowModal(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                if (!text) return;

                // Simple CSV parser
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());

                const zones = lines.slice(1).filter(l => l.trim()).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const obj: any = {};
                    headers.forEach((h, i) => {
                        obj[h] = values[i];
                    });

                    // Convert pincodes to numbers
                    if (obj.pincodeStart) obj.pincodeStart = parseInt(obj.pincodeStart);
                    if (obj.pincodeEnd) obj.pincodeEnd = parseInt(obj.pincodeEnd);

                    return obj;
                });

                if (zones.length === 0) {
                    alert('No valid data found in CSV');
                    return;
                }

                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch('/api/admin/pricing/geo-zones/bulk-import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ zones }),
                });

                const data = await response.json();
                if (data.success) {
                    alert(`Import successful!\nCreated: ${data.results.created}\nUpdated: ${data.results.updated}\nFailed: ${data.results.failed}`);
                    fetchGeoZones();
                } else {
                    alert('Import failed: ' + data.message);
                }
            } catch (err) {
                console.error('Import error:', err);
                alert('Error processing file');
            } finally {
                setLoading(false);
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const headers = ['name,code,level,currency_code,pincodeStart,pincodeEnd'];
        const sample = 'South Zone,SZ,DISTRICT,INR,500000,509999';
        const blob = new Blob([[headers, sample].join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'geo_zones_template.csv';
        a.click();
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            currency_code: 'INR',
            level: 'COUNTRY',
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

            {/* Actions Bar */}
            <div className="mb-6 flex flex-wrap gap-4 justify-between items-center">
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

                <div className="flex gap-2">
                    <button
                        onClick={downloadTemplate}
                        className="text-gray-600 hover:text-gray-800 px-3 py-2 border rounded-lg flex items-center gap-2"
                        title="Download CSV Template"
                    >
                        <FileText size={18} />
                        Template
                    </button>
                    <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                        <Upload size={20} />
                        Import CSV
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>
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
                                    <td className="px-6 py-4">{(zone as any).currency_code || (zone as any).currency}</td>
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
                                                onClick={() => handleDuplicate(zone)}
                                                className="text-green-600 hover:text-green-800"
                                                title="Duplicate Zone"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(zone._id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Delete Zone"
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

                            {/* Currency Code */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Currency Code (ISO 4217) *</label>
                                <select
                                    value={formData.currency_code}
                                    onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>

                            {/* Level */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Zone Level *</label>
                                <select
                                    value={formData.level}
                                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                >
                                    <option value="COUNTRY">Country</option>
                                    <option value="STATE">State</option>
                                    <option value="UT">Union Territory</option>
                                    <option value="DISTRICT">District</option>
                                    <option value="CITY">City</option>
                                    <option value="ZIP">ZIP/Pincode</option>
                                    <option value="ZONE">Zone</option>
                                    <option value="REGION">Region</option>
                                </select>
                            </div>

                            {/* Pincode Ranges - Only show for granular levels */}
                            {['DISTRICT', 'CITY', 'ZIP'].includes(formData.level) && (
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
                            )}

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
