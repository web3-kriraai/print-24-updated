import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, MapPin, Save, X, Copy, Upload, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { CascadingLocationSelect } from '../../common/CascadingLocationSelect';
import { useLocationSearch } from '../../../hooks/useLocationSearch';
import { LocationAutocomplete } from './LocationAutocomplete';
import { handleLocationSelection } from '../../../utils/locationUtils';
import { SUPPORTED_CURRENCIES } from '../../../src/utils/currencyUtils';

interface PincodeRange {
    start: number;
    end: number;
}

interface GeoZone {
    _id: string;
    name: string;
    code: string;
    level: string;
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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);

    // Location selection state for cascading dropdowns
    const [locationValue, setLocationValue] = useState<{
        country?: string;
        countryName?: string;
        state?: string;
        stateName?: string;
        city?: string;
        cityName?: string;
    }>({
        country: '',
        countryName: '',
        state: '',
        stateName: '',
        city: '',
        cityName: ''
    });

    // Location search hook
    const {
        locationSearch,
        locationSuggestions,
        showSuggestions,
        isLoading: isSearchLoading,
        handleSearchChange,
        clearSearch,
        closeSuggestions,
        openSuggestions
    } = useLocationSearch(geoZones);

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
                toast.success(editingZone ? 'Geo zone updated successfully!' : 'Geo zone created successfully!');
                setShowModal(false);
                resetForm();
                fetchGeoZones();
            } else {
                const contentType = response.headers.get('content-type');
                let errorMessage = 'Failed to save geo zone';

                if (contentType && contentType.includes('application/json')) {
                    try {
                        const error = await response.json();
                        errorMessage = error.message || errorMessage;
                    } catch (e) {
                        console.error('Failed to parse error response:', e);
                    }
                } else {
                    try {
                        const text = await response.text();
                        if (text) errorMessage = text;
                    } catch (e) {
                        console.error('Failed to parse text response:', e);
                    }
                }
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error saving geo zone:', error);
            toast.error('Failed to save geo zone');
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
                toast.dismiss(); // Dismiss any existing toasts
                toast.success('Geo zone deleted successfully');
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
                    toast.error(data.message || 'Failed to delete geo zone');
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
            // Ensure deep copy of pincode ranges or fallback
            pincodeRanges: zone.pincodeRanges && zone.pincodeRanges.length > 0
                ? zone.pincodeRanges.map(r => ({ ...r }))
                : [{ start: 0, end: 0 }],
            isActive: zone.isActive,
        });
        setCurrentStep(3); // Jump directly to validation step for edits
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
                    toast.error('No valid data found in CSV');
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
                    toast.success(`Import successful! Created: ${data.results.created}, Updated: ${data.results.updated}`);
                    fetchGeoZones();
                } else {
                    toast.error('Import failed: ' + data.message);
                }
            } catch (err) {
                console.error('Import error:', err);
                toast.error('Error processing file');
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
        setLocationValue({
            country: '',
            countryName: '',
            state: '',
            stateName: '',
            city: '',
            cityName: ''
        });
        setEditingZone(null);
        clearSearch();
        setCurrentStep(1); // Reset to step 1
    };

    // Handle location selection from autocomplete
    const handleSelectLocation = (location: any) => {
        const result = handleLocationSelection(location, geoZones, handleEdit);

        if (result.action === 'create' || result.action === 'create-custom') {
            setFormData({
                ...formData,
                ...result.data
            });
            // If Quick Search was utilized, jump to Step 3 for verification
            setCurrentStep(3);
            toast.success('Location details loaded. Please verify.');
        }

        clearSearch();
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

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = geoZones.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(geoZones.length / itemsPerPage);

    // Wizard navigation
    const nextStep = () => {
        // Validation for Step 1
        if (currentStep === 1) {
            // Optional: Force selection? No, manual entry allowed in step 2.
        }
        // Validation for Step 2
        if (currentStep === 2) {
            if (!formData.name || !formData.code || !formData.currency_code) {
                toast.error('Please fill in all required fields (Name, Code, Currency)');
                return;
            }
        }
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => setCurrentStep(prev => prev - 1);

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
            <div className="bg-white rounded-lg shadow flex flex-col ">
                <div className="flex-1 overflow-auto">
                    <table className="w-full relative">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Currency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Pincode Ranges</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Actions</th>
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
                                currentItems.map((zone) => (
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

                {/* Pagination Footer */}
                {geoZones.length > 0 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row gap-4 sm:gap-0 items-center justify-between bg-gray-50">
                        <span className="text-sm text-gray-700 order-2 sm:order-1">
                            Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to <span className="font-medium">{Math.min(indexOfLastItem, geoZones.length)}</span> of <span className="font-medium">{geoZones.length}</span> results
                        </span>
                        <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-start">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft size={16} />
                                <span className="hidden sm:inline">Previous</span>
                                <span className="sm:hidden">Prev</span>
                            </button>
                            <span className="px-3 py-1 border rounded bg-white text-gray-700 whitespace-nowrap">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <span className="hidden sm:inline">Next</span>
                                <span className="sm:hidden">Next</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal - Multi-Step Wizard */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-white">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingZone ? 'Edit Geo Zone' : 'Create Geo Zone'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Step {currentStep} of 3</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="px-12 py-6 bg-gray-50 border-b">
                            <div className="relative flex justify-between items-center">
                                {/* Track Background */}
                                <div className="absolute top-5 left-0 right-0 h-1 -translate-y-1/2 bg-gray-200 rounded-full"></div>
                                {/* Track Progress */}
                                <div
                                    className="absolute top-5 left-0 h-1 -translate-y-1/2 bg-blue-600 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                ></div>

                                {/* Step 1 */}
                                <div className={`relative z-10 flex flex-col items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all duration-300 bg-white ${currentStep >= 1 ? 'border-blue-600 text-blue-600 scale-110' : 'border-gray-300 text-gray-400'}`}>
                                        1
                                    </div>
                                    <span className="text-sm font-semibold">Location</span>
                                </div>

                                {/* Step 2 */}
                                <div className={`relative z-10 flex flex-col items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all duration-300 bg-white ${currentStep >= 2 ? 'border-blue-600 text-blue-600 scale-110' : 'border-gray-300 text-gray-400'}`}>
                                        2
                                    </div>
                                    <span className="text-sm font-semibold">Details</span>
                                </div>

                                {/* Step 3 */}
                                <div className={`relative z-10 flex flex-col items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all duration-300 bg-white ${currentStep >= 3 ? 'border-blue-600 text-blue-600 scale-110' : 'border-gray-300 text-gray-400'}`}>
                                        3
                                    </div>
                                    <span className="text-sm font-semibold">Validation</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-8">
                            <form onSubmit={handleSubmit} id="geoZoneForm" className="max-w-3xl mx-auto">

                                {/* STEP 1: LOCATION */}
                                {currentStep === 1 && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="text-center mb-8">
                                            <h3 className="text-xl font-semibold text-gray-900">Where is this zone located?</h3>
                                            <p className="text-gray-500">Quickly search for a location in India or manually select using dropdowns.</p>
                                        </div>

                                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">

                                            {/* Quick Search - Primary Method for India */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                        🇮🇳 Quick Search (India Only)
                                                        <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Recommended</span>
                                                    </label>
                                                </div>
                                                <LocationAutocomplete
                                                    locationSearch={locationSearch}
                                                    locationSuggestions={locationSuggestions}
                                                    showSuggestions={showSuggestions}
                                                    isLoading={isSearchLoading}
                                                    onSearchChange={handleSearchChange}
                                                    onSelectLocation={handleSelectLocation}
                                                    onFocus={openSuggestions}
                                                    onClose={closeSuggestions}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Search by City, State, or Pincode (e.g., "Mumbai", "Maharashtra", "400001")</p>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-200"></div>
                                                </div>
                                                <div className="relative flex justify-center text-sm">
                                                    <span className="px-3 bg-white text-gray-500 font-medium">OR Select Manually</span>
                                                </div>
                                            </div>

                                            {/* Cascading Dropdowns - Secondary Method */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">International / Manual Selection</label>
                                                <CascadingLocationSelect
                                                    value={locationValue}
                                                    onChange={async (location) => {
                                                        setLocationValue(location);
                                                        setFormData({
                                                            ...formData,
                                                            name: location.cityName || location.stateName || location.countryName || '',
                                                            code: (location.cityName ? location.cityName.split('(')[0].trim().toUpperCase() : (location.state || location.country || '')),
                                                            level: location.city ? 'CITY' : location.state ? 'STATE' : 'COUNTRY'
                                                        });

                                                        if (location.country === 'IN' && location.state) {
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                const response = await fetch(
                                                                    `/api/admin/locations/pincode-ranges?country=IN&region=${location.state}`,
                                                                    { headers: { 'Authorization': `Bearer ${token}` } }
                                                                );
                                                                const data = await response.json();
                                                                if (data.success && data.data.available) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        pincodeRanges: [{
                                                                            start: parseInt(data.data.start),
                                                                            end: parseInt(data.data.end)
                                                                        }]
                                                                    }));
                                                                }
                                                            } catch (err) {
                                                                console.error('Failed to fetch pincode ranges:', err);
                                                            }
                                                        }
                                                    }}
                                                    onCurrencyChange={(currency) => setFormData({ ...formData, currency_code: currency })}
                                                    required={false}
                                                    showCurrency={false}
                                                    showZipCode={false}
                                                    showCityDropdown={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: DETAILS */}
                                {currentStep === 2 && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="text-center mb-8">
                                            <h3 className="text-xl font-semibold text-gray-900">Zone Configuration</h3>
                                            <p className="text-gray-500">Review and customize the zone details.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Zone Name *</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                    placeholder="e.g., Maharashtra"
                                                    required
                                                />
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Zone Code *</label>
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                    className="w-full border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                    placeholder="e.g., MH"
                                                    required
                                                />
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Currency *</label>
                                                <select
                                                    value={formData.currency_code}
                                                    onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                                                    className="w-full border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                    required
                                                >
                                                    {SUPPORTED_CURRENCIES.map((currency) => (
                                                        <option key={currency.code} value={currency.code}>
                                                            {currency.code} ({currency.symbol}) - {currency.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Level *</label>
                                                <select
                                                    value={formData.level}
                                                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                                    className="w-full border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                                    required
                                                >
                                                    <option value="COUNTRY">Country</option>
                                                    <option value="STATE">State</option>
                                                    <option value="UT">Union Territory</option>
                                                    <option value="DISTRICT">District</option>
                                                    <option value="CITY">City</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: PINCODE & STATUS */}
                                {currentStep === 3 && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="text-center mb-8">
                                            <h3 className="text-xl font-semibold text-gray-900">Final Validation</h3>
                                            <p className="text-gray-500">Define coverage ranges and activate the zone.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    📮 Pincode Ranges
                                                    <span className="text-xs font-normal text-gray-500 px-2 py-1 bg-white rounded border">Optional</span>
                                                </h4>

                                                <div className="space-y-3">
                                                    {formData.pincodeRanges.map((range, index) => (
                                                        <div key={index} className="flex gap-3 items-center">
                                                            <div className="flex-1">
                                                                <input
                                                                    type="number"
                                                                    value={range.start || ''}
                                                                    onChange={(e) => updatePincodeRange(index, 'start', parseInt(e.target.value))}
                                                                    className="w-full border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                                    placeholder="Start"
                                                                />
                                                            </div>
                                                            <span className="text-gray-400 font-bold">-</span>
                                                            <div className="flex-1">
                                                                <input
                                                                    type="number"
                                                                    value={range.end || ''}
                                                                    onChange={(e) => updatePincodeRange(index, 'end', parseInt(e.target.value))}
                                                                    className="w-full border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                                    placeholder="End"
                                                                />
                                                            </div>
                                                            {formData.pincodeRanges.length > 1 && (
                                                                <button type="button" onClick={() => removePincodeRange(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                                                    <X size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={addPincodeRange}
                                                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <Plus size={16} /> Add another range
                                                </button>
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between cursor-pointer" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                                        {formData.isActive ? '✓' : '✕'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">Zone Status</div>
                                                        <div className="text-sm text-gray-600">{formData.isActive ? 'Zone will be active immediately' : 'Zone is currently inactive'}</div>
                                                    </div>
                                                </div>
                                                <div className={`w-14 h-8 rounded-full p-1 transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                    <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${formData.isActive ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 border-t bg-gray-50 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentStep > 1) prevStep();
                                    else {
                                        setShowModal(false);
                                        resetForm();
                                        setCurrentStep(1);
                                    }
                                }}
                                className="px-6 py-2.5 text-gray-600 font-medium hover:text-gray-900 transition-colors"
                            >
                                {currentStep === 1 ? 'Cancel' : 'Back'}
                            </button>

                            <div className="flex gap-3">
                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                                    >
                                        Next Step <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        form="geoZoneForm"
                                        disabled={loading}
                                        className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Saving...' : <><Save size={18} /> Complete Setup</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeoZoneManager;
