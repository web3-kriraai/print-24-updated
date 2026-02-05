// OrderFilters.tsx - Advanced Filter Panel with Enhanced UX
import React from 'react';
import {
    X, Package, CreditCard, Calendar, DollarSign, Truck,
    AlertCircle, Users, Filter, Check, Clock, XCircle
} from 'lucide-react';

interface Filters {
    search: string;
    status: string[];
    paymentStatus: string[];
    dateRange: { start: string; end: string };
    amountRange: { min: number; max: number };
    deliveryStatus: string[];
    hasComplaint: boolean;
    activeComplaintOnly: boolean;
    customerType: string[];
}

interface OrderFiltersProps {
    filters: Filters;
    onChange: (filters: Partial<Filters>) => void;
    onClose: () => void;
}

const ORDER_STATUSES = [
    'REQUESTED', 'DESIGN', 'APPROVED', 'PRODUCTION', 'QC', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED'
];

const PAYMENT_STATUSES = [
    'PENDING', 'PARTIAL', 'COMPLETED', 'FAILED', 'REFUNDED'
];

const DELIVERY_STATUSES = [
    'PENDING', 'DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'
];

const CUSTOMER_TYPES = [
    { value: 'user', label: 'Customer' },
    { value: 'agent', label: 'Agent' },
    { value: 'distributor', label: 'Distributor' },
    { value: 'corporate', label: 'Corporate' },
];

const DATE_PRESETS = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'This month', days: 0, month: true },
];

const OrderFilters: React.FC<OrderFiltersProps> = ({ filters, onChange, onClose }) => {
    const handleStatusToggle = (status: string) => {
        const newStatuses = filters.status.includes(status)
            ? filters.status.filter(s => s !== status)
            : [...filters.status, status];
        onChange({ status: newStatuses });
    };

    const handlePaymentStatusToggle = (status: string) => {
        const newStatuses = filters.paymentStatus.includes(status)
            ? filters.paymentStatus.filter(s => s !== status)
            : [...filters.paymentStatus, status];
        onChange({ paymentStatus: newStatuses });
    };

    const handleDeliveryStatusToggle = (status: string) => {
        const newStatuses = filters.deliveryStatus.includes(status)
            ? filters.deliveryStatus.filter(s => s !== status)
            : [...filters.deliveryStatus, status];
        onChange({ deliveryStatus: newStatuses });
    };

    const handleCustomerTypeToggle = (type: string) => {
        const newTypes = filters.customerType.includes(type)
            ? filters.customerType.filter(t => t !== type)
            : [...filters.customerType, type];
        onChange({ customerType: newTypes });
    };

    const handleDatePreset = (preset: { days: number; month?: boolean }) => {
        const end = new Date().toISOString().split('T')[0];
        let start = '';

        if (preset.month) {
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        } else {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - preset.days);
            start = startDate.toISOString().split('T')[0];
        }

        onChange({ dateRange: { start, end } });
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.status.length) count++;
        if (filters.paymentStatus.length) count++;
        if (filters.deliveryStatus.length) count++;
        if (filters.customerType.length) count++;
        if (filters.hasComplaint) count++;
        if (filters.dateRange.start || filters.dateRange.end) count++;
        if (filters.amountRange.min || filters.amountRange.max) count++;
        return count;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Filter className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                        {getActiveFilterCount() > 0 && (
                            <p className="text-xs text-gray-500">
                                {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Order Status */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-blue-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Order Status
                        </label>
                        {filters.status.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                                {filters.status.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {ORDER_STATUSES.map((status) => (
                            <label
                                key={status}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/70 transition-colors group"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.status.includes(status)}
                                    onChange={() => handleStatusToggle(status)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">{status}</span>
                                {filters.status.includes(status) && (
                                    <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Payment Status */}
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-green-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Payment Status
                        </label>
                        {filters.paymentStatus.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                                {filters.paymentStatus.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {PAYMENT_STATUSES.map((status) => (
                            <label
                                key={status}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/70 transition-colors group"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.paymentStatus.includes(status)}
                                    onChange={() => handlePaymentStatusToggle(status)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">{status}</span>
                                {filters.paymentStatus.includes(status) && (
                                    <Check className="w-3.5 h-3.5 text-green-600 ml-auto" />
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Date Range */}
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Date Range
                        </label>
                        {(filters.dateRange.start || filters.dateRange.end) && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-purple-600 text-white rounded-full">
                                <Clock className="w-3 h-3" />
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {/* Presets */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {DATE_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handleDatePreset(preset)}
                                    className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        {/* Custom Range */}
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">From</label>
                            <input
                                type="date"
                                value={filters.dateRange.start}
                                onChange={(e) =>
                                    onChange({
                                        dateRange: { ...filters.dateRange, start: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">To</label>
                            <input
                                type="date"
                                value={filters.dateRange.end}
                                onChange={(e) =>
                                    onChange({
                                        dateRange: { ...filters.dateRange, end: e.target.value },
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Amount Range */}
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Amount Range (₹)
                        </label>
                        {(filters.amountRange.min || filters.amountRange.max) && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-amber-600 text-white rounded-full">
                                ₹
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Min</label>
                            <input
                                type="number"
                                min="0"
                                value={filters.amountRange.min || ''}
                                onChange={(e) =>
                                    onChange({
                                        amountRange: {
                                            ...filters.amountRange,
                                            min: Number(e.target.value),
                                        },
                                    })
                                }
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Max</label>
                            <input
                                type="number"
                                min="0"
                                value={filters.amountRange.max || ''}
                                onChange={(e) =>
                                    onChange({
                                        amountRange: {
                                            ...filters.amountRange,
                                            max: Number(e.target.value),
                                        },
                                    })
                                }
                                placeholder="No limit"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Delivery Status */}
                <div className="bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Truck className="w-4 h-4 text-cyan-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Delivery Status
                        </label>
                        {filters.deliveryStatus.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-cyan-600 text-white rounded-full">
                                {filters.deliveryStatus.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {DELIVERY_STATUSES.map((status) => (
                            <label
                                key={status}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/70 transition-colors group"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.deliveryStatus.includes(status)}
                                    onChange={() => handleDeliveryStatusToggle(status)}
                                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">{status}</span>
                                {filters.deliveryStatus.includes(status) && (
                                    <Check className="w-3.5 h-3.5 text-cyan-600 ml-auto" />
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Complaint Filters */}
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Complaints
                        </label>
                        {filters.hasComplaint && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-600 text-white rounded-full">
                                <AlertCircle className="w-3 h-3" />
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/70 transition-colors group">
                            <input
                                type="checkbox"
                                checked={filters.hasComplaint}
                                onChange={(e) => onChange({ hasComplaint: e.target.checked })}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">Has Complaint</span>
                            {filters.hasComplaint && (
                                <XCircle className="w-3.5 h-3.5 text-red-600 ml-auto" />
                            )}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/70 transition-colors group">
                            <input
                                type="checkbox"
                                checked={filters.activeComplaintOnly}
                                onChange={(e) => onChange({ activeComplaintOnly: e.target.checked })}
                                disabled={!filters.hasComplaint}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900 disabled:opacity-50">Active Only</span>
                            {filters.activeComplaintOnly && (
                                <Clock className="w-3.5 h-3.5 text-red-600 ml-auto" />
                            )}
                        </label>
                    </div>
                </div>

                {/* Customer Type */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <label className="text-sm font-semibold text-gray-900">
                            Customer Type
                        </label>
                        {filters.customerType.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded-full">
                                {filters.customerType.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        {CUSTOMER_TYPES.map((type) => (
                            <label
                                key={type.value}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/70 transition-colors group"
                            >
                                <input
                                    type="checkbox"
                                    checked={filters.customerType.includes(type.value)}
                                    onChange={() => handleCustomerTypeToggle(type.value)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">{type.label}</span>
                                {filters.customerType.includes(type.value) && (
                                    <Check className="w-3.5 h-3.5 text-indigo-600 ml-auto" />
                                )}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderFilters;
