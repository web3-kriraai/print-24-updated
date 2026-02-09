import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    Settings,
    MapPin,
    Calendar,
    Save,
    Plus,
    Trash2,
    Edit2,
    Clock,
    Package,
    Truck,
    Calculator,
    Play,
    AlertTriangle,
} from 'lucide-react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../../lib/apiConfig';

const DeliveryManagement = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('settings'); // settings, zones, holidays

    // Form states
    const [bufferDays, setBufferDays] = useState(1);
    const [courierPreference, setCourierPreference] = useState('external');
    const [defaultLogisticsDays, setDefaultLogisticsDays] = useState(3);
    const [skipWeekends, setSkipWeekends] = useState(true);

    // Zone form
    const [zoneForm, setZoneForm] = useState({
        zoneName: '',
        pincodes: '',
        deliveryDays: 1,
    });
    const [editingZoneId, setEditingZoneId] = useState(null);

    // Holiday form
    const [holidayForm, setHolidayForm] = useState({
        date: '',
        name: '',
        recurring: false,
    });

    // EDD Test state
    const [eddTestForm, setEddTestForm] = useState({
        pincode: '',
        productionDays: 1,
        courierDays: '',
    });
    const [eddTestResult, setEddTestResult] = useState(null);
    const [eddTesting, setEddTesting] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/delivery/settings`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch settings');

            const data = await response.json();
            setSettings(data);

            // Populate form
            setBufferDays(data.bufferDays || 1);
            setCourierPreference(data.courierPreference || 'external');
            setDefaultLogisticsDays(data.defaultLogisticsDays || 3);
            setSkipWeekends(data.skipWeekends !== false);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching delivery settings:', error);
            toast.error('Failed to load delivery settings');
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/delivery/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    bufferDays: Number(bufferDays),
                    courierPreference,
                    defaultLogisticsDays: Number(defaultLogisticsDays),
                    skipWeekends,
                }),
            });

            if (!response.ok) throw new Error('Failed to update settings');

            const data = await response.json();
            setSettings(data.settings);
            toast.success('Settings updated successfully!');
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    const handleAddZone = async () => {
        if (!zoneForm.zoneName || !zoneForm.pincodes || !zoneForm.deliveryDays) {
            toast.error('Please fill all zone fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const pincodes = zoneForm.pincodes.split(',').map(p => p.trim());

            const response = await fetch(`${API_BASE_URL}/delivery/zones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    zoneName: zoneForm.zoneName,
                    pincodes,
                    deliveryDays: Number(zoneForm.deliveryDays),
                }),
            });

            if (!response.ok) throw new Error('Failed to add zone');

            const data = await response.json();
            setSettings(data.settings);
            setZoneForm({ zoneName: '', pincodes: '', deliveryDays: 1 });
            toast.success('Zone added successfully!');
        } catch (error) {
            console.error('Error adding zone:', error);
            toast.error('Failed to add zone');
        }
    };

    const handleDeleteZone = async (zoneId) => {
        if (!confirm('Are you sure you want to delete this zone?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/delivery/zones/${zoneId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to delete zone');

            const data = await response.json();
            setSettings(data.settings);
            toast.success('Zone deleted successfully!');
        } catch (error) {
            console.error('Error deleting zone:', error);
            toast.error('Failed to delete zone');
        }
    };

    const handleAddHoliday = async () => {
        if (!holidayForm.date || !holidayForm.name) {
            toast.error('Please fill all holiday fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/delivery/holidays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(holidayForm),
            });

            if (!response.ok) throw new Error('Failed to add holiday');

            const data = await response.json();
            setSettings(data.settings);
            setHolidayForm({ date: '', name: '', recurring: false });
            toast.success('Holiday added successfully!');
        } catch (error) {
            console.error('Error adding holiday:', error);
            toast.error('Failed to add holiday');
        }
    };

    // Test EDD calculation
    const handleTestEDD = async () => {
        if (!eddTestForm.pincode || !eddTestForm.productionDays) {
            toast.error('Please enter pincode and production days');
            return;
        }

        try {
            setEddTesting(true);

            // Calculate locally using current settings
            const tcurrent = new Date();
            const maxProductionDays = Number(eddTestForm.productionDays);

            // Find logistics days from zones or use courier days
            let logisticsDays = defaultLogisticsDays;

            if (eddTestForm.courierDays) {
                // External courier days provided
                logisticsDays = Number(eddTestForm.courierDays);
            } else if (courierPreference === 'internal' || courierPreference === 'hybrid') {
                // Look up in zones
                const zoneMatch = settings?.geoZoneMappings?.find(zone => {
                    if (!zone.isActive) return false;
                    return zone.pincodes.some(pc => {
                        if (pc === eddTestForm.pincode) return true;
                        if (pc.includes('*')) {
                            const pattern = pc.replace(/\*/g, '.*');
                            return new RegExp(`^${pattern}$`).test(eddTestForm.pincode);
                        }
                        return false;
                    });
                });
                if (zoneMatch) {
                    logisticsDays = zoneMatch.deliveryDays;
                }
            }

            const totalDays = maxProductionDays + logisticsDays + bufferDays;

            // Calculate EDD skipping weekends and holidays
            let eddDate = new Date(tcurrent);
            let daysAdded = 0;
            let weekendsSkipped = 0;
            let holidaysSkipped = 0;

            while (daysAdded < totalDays) {
                eddDate.setDate(eddDate.getDate() + 1);

                if (skipWeekends) {
                    const dayOfWeek = eddDate.getDay();
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        weekendsSkipped++;
                        continue;
                    }
                }

                const isHoliday = settings?.holidays?.some(holiday => {
                    const holidayDate = new Date(holiday.date);
                    if (holiday.recurring) {
                        return holidayDate.getMonth() === eddDate.getMonth() &&
                            holidayDate.getDate() === eddDate.getDate();
                    }
                    return holidayDate.toDateString() === eddDate.toDateString();
                });

                if (isHoliday) {
                    holidaysSkipped++;
                    continue;
                }

                daysAdded++;
            }

            setEddTestResult({
                edd: eddDate,
                breakdown: {
                    tcurrent,
                    maxProductionDays,
                    logisticsDays,
                    bufferDays,
                    totalDays,
                    weekendsSkipped,
                    holidaysSkipped,
                    logisticsSource: eddTestForm.courierDays ? 'Courier API' : 'Zone Mapping',
                },
            });

            toast.success('EDD calculated successfully!');
        } catch (error) {
            console.error('Error calculating EDD:', error);
            toast.error('Failed to calculate EDD');
        } finally {
            setEddTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Truck className="w-8 h-8 text-blue-600" />
                        Delivery Management
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Configure delivery settings, zones, and estimated delivery dates (EDD)
                    </p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'settings'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Settings className="w-5 h-5" />
                            General Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('zones')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'zones'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <MapPin className="w-5 h-5" />
                            Delivery Zones
                        </button>
                        <button
                            onClick={() => setActiveTab('holidays')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'holidays'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Calendar className="w-5 h-5" />
                            Holidays
                        </button>
                        <button
                            onClick={() => setActiveTab('edd')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === 'edd'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Calculator className="w-5 h-5" />
                            EDD Engine
                        </button>
                    </div>

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-6">General Delivery Settings</h2>

                            {/* EDD Formula Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    EDD Calculation Formula
                                </h3>
                                <p className="text-blue-800 font-mono text-sm">
                                    EDD = T<sub>current</sub> + max(T<sub>production</sub>) + T<sub>logistics</sub> + T<sub>buffer</sub>
                                </p>
                                <ul className="mt-3 text-sm text-blue-700 space-y-1">
                                    <li>• <strong>T<sub>production</sub></strong>: Longest production time from product sequence</li>
                                    <li>• <strong>T<sub>logistics</sub></strong>: Delivery days from zones or courier API</li>
                                    <li>• <strong>T<sub>buffer</sub></strong>: Safety margin (configured below)</li>
                                </ul>
                            </div>

                            <div className="space-y-6">
                                {/* Buffer Days (Tbuffer) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Buffer Days (T<sub>buffer</sub>) - Safety Margin
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            min="0"
                                            max="30"
                                            value={bufferDays}
                                            onChange={(e) => setBufferDays(Number(e.target.value))}
                                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <span className="text-gray-600">
                                            days added to every delivery estimate
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Recommended: 1-2 days for holidays and unexpected delays
                                    </p>
                                </div>

                                {/* Courier Preference */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Courier Preference
                                    </label>
                                    <select
                                        value={courierPreference}
                                        onChange={(e) => setCourierPreference(e.target.value)}
                                        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="external">External (Shiprocket API)</option>
                                        <option value="internal">Internal (Zone-based)</option>
                                        <option value="hybrid">Hybrid (Both)</option>
                                    </select>
                                </div>

                                {/* Default Logistics Days */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Default Logistics Days
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={defaultLogisticsDays}
                                            onChange={(e) => setDefaultLogisticsDays(Number(e.target.value))}
                                            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <span className="text-gray-600">
                                            days (used when no zone match or API fails)
                                        </span>
                                    </div>
                                </div>

                                {/* Skip Weekends */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="skipWeekends"
                                        checked={skipWeekends}
                                        onChange={(e) => setSkipWeekends(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="skipWeekends" className="text-sm font-medium text-gray-700">
                                        Skip weekends in EDD calculation (Saturday & Sunday)
                                    </label>
                                </div>

                                {/* Save Button */}
                                <div className="pt-4 border-t border-gray-200">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-5 h-5" />
                                        {saving ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Zones Tab */}
                    {activeTab === 'zones' && (
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-6">Delivery Zones</h2>

                            {/* Add Zone Form */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold mb-4">Add New Zone</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Zone Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Zone A - Metro Cities"
                                            value={zoneForm.zoneName}
                                            onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pincodes (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="110001, 110*, 400001"
                                            value={zoneForm.pincodes}
                                            onChange={(e) => setZoneForm({ ...zoneForm, pincodes: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Delivery Days
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={zoneForm.deliveryDays}
                                            onChange={(e) => setZoneForm({ ...zoneForm, deliveryDays: Number(e.target.value) })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddZone}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Zone
                                </button>
                            </div>

                            {/* Zones List */}
                            <div className="space-y-3">
                                {settings?.geoZoneMappings?.length > 0 ? (
                                    settings.geoZoneMappings.map((zone) => (
                                        <div
                                            key={zone._id}
                                            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                                        >
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900">{zone.zoneName}</h4>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {zone.pincodes.join(', ')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {zone.deliveryDays} day{zone.deliveryDays !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs ${zone.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {zone.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteZone(zone._id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No zones configured yet</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Holidays Tab */}
                    {activeTab === 'holidays' && (
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-6">Non-Working Days</h2>

                            {/* Add Holiday Form */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold mb-4">Add Holiday</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={holidayForm.date}
                                            onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Holiday Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., Christmas"
                                            value={holidayForm.name}
                                            onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={holidayForm.recurring}
                                                onChange={(e) => setHolidayForm({ ...holidayForm, recurring: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">Recurring yearly</span>
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddHoliday}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Holiday
                                </button>
                            </div>

                            {/* Holidays List */}
                            <div className="space-y-2">
                                {settings?.holidays?.length > 0 ? (
                                    settings.holidays.map((holiday, index) => (
                                        <div
                                            key={index}
                                            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                                        >
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{holiday.name}</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {new Date(holiday.date).toLocaleDateString()}
                                                    {holiday.recurring && (
                                                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                            Recurring
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No holidays configured yet</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EDD Engine Tab */}
                    {activeTab === 'edd' && (
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-6">EDD Engine - Estimated Delivery Date</h2>

                            {/* Formula Explanation */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                                    <Calculator className="w-6 h-6" />
                                    EDD Calculation Formula
                                </h3>
                                <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
                                    <p className="text-2xl font-mono text-center text-blue-900 font-semibold">
                                        EDD = T<sub>current</sub> + max(T<sub>production</sub>) + T<sub>logistics</sub> + T<sub>buffer</sub>
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                                        <h4 className="font-semibold text-blue-800 mb-2">T<sub>current</sub></h4>
                                        <p className="text-sm text-gray-600">Current date/time when order is placed</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                                        <h4 className="font-semibold text-blue-800 mb-2">max(T<sub>production</sub>)</h4>
                                        <p className="text-sm text-gray-600">Longest production time in cart. E.g., if cart has Visiting Cards (1 day) and 3D Letters (5 days), value is 5 days.</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                                        <h4 className="font-semibold text-blue-800 mb-2">T<sub>logistics</sub></h4>
                                        <p className="text-sm text-gray-600">
                                            <strong>Internal:</strong> From geo_zone_mappings (Zone A = 1 day, Zone B = 3 days)<br />
                                            <strong>External:</strong> Dynamic from Courier API (Shiprocket)
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                                        <h4 className="font-semibold text-blue-800 mb-2">T<sub>buffer</sub></h4>
                                        <p className="text-sm text-gray-600">Safety margin: <strong>{bufferDays} day(s)</strong></p>
                                    </div>
                                </div>
                            </div>

                            {/* Current Settings Summary */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Settings className="w-5 h-5" />
                                    Current EDD Configuration
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg p-4 text-center border">
                                        <p className="text-3xl font-bold text-blue-600">{bufferDays}</p>
                                        <p className="text-sm text-gray-600">Buffer Days</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center border">
                                        <p className="text-3xl font-bold text-green-600">{defaultLogisticsDays}</p>
                                        <p className="text-sm text-gray-600">Default Logistics</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center border">
                                        <p className="text-lg font-bold text-purple-600 capitalize">{courierPreference}</p>
                                        <p className="text-sm text-gray-600">Courier Mode</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center border">
                                        <p className="text-lg font-bold text-orange-600">{skipWeekends ? 'Yes' : 'No'}</p>
                                        <p className="text-sm text-gray-600">Skip Weekends</p>
                                    </div>
                                </div>

                                {/* Zone Summary */}
                                <div className="mt-4">
                                    <h4 className="font-medium text-gray-700 mb-2">Configured Zones:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {settings?.geoZoneMappings?.length > 0 ? (
                                            settings.geoZoneMappings.map((zone) => (
                                                <span
                                                    key={zone._id}
                                                    className={`px-3 py-1 rounded-full text-sm ${zone.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                                >
                                                    {zone.zoneName}: {zone.deliveryDays} day(s)
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-500">No zones configured</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* EDD Test Calculator */}
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Play className="w-5 h-5 text-green-600" />
                                    Test EDD Calculator
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Test the EDD calculation with sample values to verify your configuration.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Delivery Pincode *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., 110001"
                                            value={eddTestForm.pincode}
                                            onChange={(e) => setEddTestForm({ ...eddTestForm, pincode: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Production Days (max) *
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="e.g., 5"
                                            value={eddTestForm.productionDays}
                                            onChange={(e) => setEddTestForm({ ...eddTestForm, productionDays: Number(e.target.value) })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Longest production time in cart</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Courier Days (optional)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="From API"
                                            value={eddTestForm.courierDays}
                                            onChange={(e) => setEddTestForm({ ...eddTestForm, courierDays: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave empty to use zone mapping</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleTestEDD}
                                    disabled={eddTesting}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    <Play className="w-5 h-5" />
                                    {eddTesting ? 'Calculating...' : 'Calculate EDD'}
                                </button>

                                {/* Test Result */}
                                {eddTestResult && (
                                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                                        <h4 className="font-semibold text-green-800 mb-4">Calculation Result</h4>
                                        <div className="text-center mb-4">
                                            <p className="text-sm text-gray-600">Estimated Delivery Date</p>
                                            <p className="text-3xl font-bold text-green-700">
                                                {new Date(eddTestResult.edd).toLocaleDateString('en-IN', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div className="bg-white rounded p-3 text-center">
                                                <p className="font-bold text-blue-600">{eddTestResult.breakdown.maxProductionDays}</p>
                                                <p className="text-gray-600">Production Days</p>
                                            </div>
                                            <div className="bg-white rounded p-3 text-center">
                                                <p className="font-bold text-purple-600">{eddTestResult.breakdown.logisticsDays}</p>
                                                <p className="text-gray-600">Logistics Days</p>
                                                <p className="text-xs text-gray-400">({eddTestResult.breakdown.logisticsSource})</p>
                                            </div>
                                            <div className="bg-white rounded p-3 text-center">
                                                <p className="font-bold text-orange-600">{eddTestResult.breakdown.bufferDays}</p>
                                                <p className="text-gray-600">Buffer Days</p>
                                            </div>
                                            <div className="bg-white rounded p-3 text-center">
                                                <p className="font-bold text-green-600">{eddTestResult.breakdown.totalDays}</p>
                                                <p className="text-gray-600">Total Working Days</p>
                                            </div>
                                        </div>

                                        {(eddTestResult.breakdown.weekendsSkipped > 0 || eddTestResult.breakdown.holidaysSkipped > 0) && (
                                            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>
                                                    Skipped: {eddTestResult.breakdown.weekendsSkipped} weekend day(s), {eddTestResult.breakdown.holidaysSkipped} holiday(s)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryManagement;
