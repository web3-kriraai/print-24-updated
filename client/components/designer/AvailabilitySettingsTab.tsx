import React, { useState, useEffect } from 'react';
import {
    Clock,
    Calendar,
    Save,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    Plus,
    X,
    Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthHeaders, API_BASE_URL_WITH_API as API_BASE_URL } from '../../lib/apiConfig';

interface Availability {
    inTime: string;
    outTime: string;
    slotDuration: number;
    breakDuration: number;
    weeklySchedule: number[];
    disabledDates: string[];
}

export default function AvailabilitySettingsTab() {
    const [availability, setAvailability] = useState<Availability>({
        inTime: '09:00',
        outTime: '18:00',
        slotDuration: 60,
        breakDuration: 0,
        weeklySchedule: [1, 2, 3, 4, 5, 6],
        disabledDates: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const days = [
        { label: 'Sun', value: 0 },
        { label: 'Mon', value: 1 },
        { label: 'Tue', value: 2 },
        { label: 'Wed', value: 3 },
        { label: 'Thu', value: 4 },
        { label: 'Fri', value: 5 },
        { label: 'Sat', value: 6 }
    ];

    const slotDurations = [15, 30, 45, 60, 90, 120];

    useEffect(() => {
        fetchAvailability();
    }, []);

    const fetchAvailability = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/physical/availability`, {
                headers: getAuthHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setAvailability(data.availability);
            }
        } catch (err) {
            console.error("Failed to fetch availability:", err);
            toast.error("Failed to load availability settings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/physical/availability`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(availability)
            });

            if (response.ok) {
                toast.success("Availability settings saved!");
            } else {
                toast.error("Failed to save settings");
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleDay = (dayValue: number) => {
        setAvailability(prev => {
            if (prev.weeklySchedule.includes(dayValue)) {
                return { ...prev, weeklySchedule: prev.weeklySchedule.filter(d => d !== dayValue) };
            } else {
                return { ...prev, weeklySchedule: [...prev.weeklySchedule, dayValue].sort() };
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading availability settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Working Schedule</h3>
                        <p className="text-sm text-gray-500">Configure your daily hours and slot preferences</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Time Inputs */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500" />
                                Start Time (In Time)
                            </label>
                            <input
                                type="time"
                                value={availability.inTime}
                                onChange={(e) => setAvailability({ ...availability, inTime: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-500" />
                                End Time (Out Time)
                            </label>
                            <input
                                type="time"
                                value={availability.outTime}
                                onChange={(e) => setAvailability({ ...availability, outTime: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Slot Configuration */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                Slot Duration
                            </label>
                            <div className="relative">
                                <select
                                    value={availability.slotDuration}
                                    onChange={(e) => setAvailability({ ...availability, slotDuration: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                >
                                    {slotDurations.map(dur => (
                                        <option key={dur} value={dur}>{dur} Minutes</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                Break Duration
                            </label>
                            <div className="relative">
                                <select
                                    value={availability.breakDuration}
                                    onChange={(e) => setAvailability({ ...availability, breakDuration: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                >
                                    {[0, 5, 10, 15, 20, 30].map(dur => (
                                        <option key={dur} value={dur}>{dur} Minutes</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Weekly Schedule */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Available Days</label>
                        <div className="flex flex-wrap gap-3">
                            {days.map(day => (
                                <button
                                    key={day.value}
                                    onClick={() => toggleDay(day.value)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${availability.weeklySchedule.includes(day.value)
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600 leading-relaxed">
                        These settings define how your available slots are generated for office visits.
                        Users will see slots based on your duration and break time within your working hours.
                        Full day bookings will block all slots for the selected date.
                    </p>
                </div>
            </div>
        </div>
    );
}
