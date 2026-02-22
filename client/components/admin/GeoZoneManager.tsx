import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, MapPin, Save, X, Copy, Upload, FileText, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { CascadingLocationSelect } from '../../common/CascadingLocationSelect';
import { useLocationSearch } from '../../../hooks/useLocationSearch';
import { LocationAutocomplete } from './LocationAutocomplete';
import { handleLocationSelection } from '../../../utils/locationUtils';
import { SUPPORTED_CURRENCIES } from '../../../utils/currencyUtils';
import { AdminSearchableDropdown } from '../../AdminSearchableDropdown';

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
    warehouseName?: string;
    warehousePincode?: string;
}

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
        warehouseName: '',
        warehousePincode: '',
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
            warehouseName: zone.warehouseName || '',
            warehousePincode: zone.warehousePincode || '',
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
            warehouseName: zone.warehouseName || '',
            warehousePincode: zone.warehousePincode || '',
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
            warehouseName: '',
            warehousePincode: '',
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
        <div className="p-0">
            {/* Actions Bar */}
            <div className="mb-6 bg-white border-b border-gray-100 p-6 flex flex-wrap gap-4 justify-between items-center">
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2 font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                >
                    <Plus size={20} />
                    New Geo Zone
                </button>

                <div className="flex gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="text-gray-500 hover:text-gray-900 px-4 py-2.5 border border-gray-200 rounded-xl flex items-center gap-2 font-semibold transition-all hover:bg-gray-50"
                        title="Download CSV Template"
                    >
                        <FileText size={18} />
                        Template
                    </button>
                    <label className="cursor-pointer bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-2.5 rounded-xl hover:bg-emerald-100 flex items-center gap-2 font-bold transition-all">
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
            <div className="p-6">
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full relative">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Code</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Currency</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Level</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pincodes</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Warehouse</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : geoZones.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                            No geo zones found. Create one to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    currentItems.map((zone) => (
                                        <tr key={zone._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-gray-900">{zone.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    {zone.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">{(zone as any).currency_code || (zone as any).currency}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-600 font-semibold">{zone.level}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {zone.pincodeRanges && zone.pincodeRanges.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {zone.pincodeRanges.map((range, idx) => (
                                                            <span key={idx} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                                                {range.start}-{range.end}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">No ranges</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {zone.warehouseName ? (
                                                    <div>
                                                        <span className="text-xs font-semibold text-gray-700">{zone.warehouseName}</span>
                                                        {zone.warehousePincode && (
                                                            <span className="ml-1 text-[10px] text-gray-400">({zone.warehousePincode})</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Not set</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(zone)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicate(zone)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Duplicate"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(zone._id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
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

                    {/* Pagination Footer */}
                    {geoZones.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-4 sm:gap-0 items-center justify-between bg-gray-50/50">
                            <span className="text-xs text-gray-500">
                                Showing <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, geoZones.length)}</span> of <span className="font-bold text-gray-900">{geoZones.length}</span> zones
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-all text-gray-500"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="px-4 py-2 border border-blue-100 bg-blue-50/50 rounded-lg text-xs font-bold text-blue-700 whitespace-nowrap">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-all text-gray-500"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal - Multi-Step Wizard */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    {editingZone ? 'Update Geo Zone' : 'New Geographical Zone'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Configure hierarchical location mapping and coverage.</p>
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

                        {/* Wizard Progress */}
                        <div className="px-12 py-8 bg-gray-50/50 border-b border-gray-100">
                            <div className="relative flex justify-between items-center max-w-2xl mx-auto">
                                <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-200"></div>
                                <div
                                    className="absolute top-5 left-0 h-[2px] bg-indigo-600 transition-all duration-500 ease-out"
                                    style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                ></div>

                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${currentStep >= step ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-200 text-gray-400'}`}>
                                            {step}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${currentStep >= step ? 'text-indigo-600' : 'text-gray-400'}`}>
                                            {step === 1 ? 'Location' : step === 2 ? 'Identity' : 'Configuration'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto px-10 py-10">
                            <form onSubmit={handleSubmit} id="geoZoneForm" className="max-w-2xl mx-auto">
                                {currentStep === 1 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-gray-900">Where is this zone located?</h3>
                                            <p className="text-sm text-gray-500 mt-1">Search for an existing area or define a custom mapping.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Quick Search (India Region)</label>
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
                                            </div>

                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest"><span className="px-4 bg-white text-gray-400">Manual Selection</span></div>
                                            </div>

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

                                                    if (location.country === 'IN' && (location.city || location.state)) {
                                                        try {
                                                            const token = localStorage.getItem('token');
                                                            const region = location.city || location.state;
                                                            const response = await fetch(`/api/admin/locations/pincode-ranges?country=IN&region=${region}`, {
                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                            });
                                                            const data = await response.json();
                                                            if (data.success && data.data.available) {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    pincodeRanges: [{ start: parseInt(data.data.start), end: parseInt(data.data.end) }]
                                                                }));
                                                            }
                                                        } catch (err) { console.error(err); }
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
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-gray-900">Define Zone Identity</h3>
                                            <p className="text-sm text-gray-500 mt-1">Basic information and classification level.</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Zone Name *</label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="e.g., South West Mumbai"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">System Code *</label>
                                                <input
                                                    type="text"
                                                    value={formData.code}
                                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                    className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="SWM"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Active Level *</label>
                                                <AdminSearchableDropdown
                                                    label="Select Level"
                                                    options={[
                                                        { value: 'COUNTRY', label: 'Country' },
                                                        { value: 'STATE', label: 'State' },
                                                        { value: 'UT', label: 'Union Territory' },
                                                        { value: 'DISTRICT', label: 'District' },
                                                        { value: 'CITY', label: 'City' }
                                                    ]}
                                                    value={formData.level}
                                                    onChange={(val) => setFormData({ ...formData, level: val as string })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Settlement Currency *</label>
                                                <AdminSearchableDropdown
                                                    label="Select Currency"
                                                    options={SUPPORTED_CURRENCIES.map(c => ({ value: c.code, label: `${c.code} (${c.symbol}) - ${c.name}` }))}
                                                    value={formData.currency_code}
                                                    onChange={(val) => setFormData({ ...formData, currency_code: val as string })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-gray-900">Advanced Configuration</h3>
                                            <p className="text-sm text-gray-500 mt-1">Pincode ranges and operational status.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                        <MapPin size={14} className="text-indigo-600" />
                                                        Pincode Coverage
                                                    </h4>
                                                    <button type="button" onClick={addPincodeRange} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest">+ Add Range</button>
                                                </div>

                                                <div className="space-y-3">
                                                    {formData.pincodeRanges.map((range, idx) => (
                                                        <div key={idx} className="flex gap-3 items-center">
                                                            <input
                                                                type="number"
                                                                value={range.start || ''}
                                                                onChange={(e) => updatePincodeRange(idx, 'start', parseInt(e.target.value))}
                                                                className="flex-1 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                                                                placeholder="Start"
                                                            />
                                                            <div className="w-2 h-[2px] bg-gray-300"></div>
                                                            <input
                                                                type="number"
                                                                value={range.end || ''}
                                                                onChange={(e) => updatePincodeRange(idx, 'end', parseInt(e.target.value))}
                                                                className="flex-1 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                                                                placeholder="End"
                                                            />
                                                            {formData.pincodeRanges.length > 1 && (
                                                                <button type="button" onClick={() => removePincodeRange(idx)} className="p-2 text-red-400 hover:text-red-600">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Warehouse / Pickup Location */}
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                    <MapPin size={14} className="text-emerald-600" />
                                                    Warehouse / Pickup Location
                                                </h4>
                                                <p className="text-xs text-gray-500 mb-4">Assign a warehouse for shipment pickup from this zone.</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Warehouse Name</label>
                                                        <input
                                                            type="text"
                                                            value={formData.warehouseName}
                                                            onChange={(e) => setFormData({ ...formData, warehouseName: e.target.value })}
                                                            className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                                                            placeholder="e.g. Delhi Warehouse"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Warehouse Pincode</label>
                                                        <input
                                                            type="text"
                                                            value={formData.warehousePincode}
                                                            onChange={(e) => setFormData({ ...formData, warehousePincode: e.target.value })}
                                                            className="w-full border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-mono"
                                                            placeholder="e.g. 110001"
                                                            maxLength={6}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className={`p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${formData.isActive ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50 border-gray-200'}`}
                                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${formData.isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-200 text-gray-500'}`}>
                                                        <Save size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">Active Status</p>
                                                        <p className="text-xs text-gray-500">{formData.isActive ? 'Zone will be operational immediately' : 'Zone will be created in draft mode'}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentStep > 1) prevStep();
                                    else { setShowModal(false); resetForm(); }
                                }}
                                className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                            >
                                {currentStep === 1 ? 'Cancel' : 'Back'}
                            </button>

                            <div className="flex gap-3">
                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                                    >
                                        Next Step <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        form="geoZoneForm"
                                        disabled={loading}
                                        className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : <><Save size={18} /> Save Zone</>}
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
