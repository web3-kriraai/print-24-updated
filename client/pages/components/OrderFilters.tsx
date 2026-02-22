import React from 'react';
import { X } from 'lucide-react';

interface Filters {
    search: string;
    status: string[];
    paymentStatus: string[];
    dateRange: {
        start: string;
        end: string;
    };
    amountRange: {
        min: number;
        max: number;
    };
    deliveryStatus: string[];
    hasComplaint: boolean;
    activeComplaintOnly: boolean;
    customerType: string[];
}

interface OrderFiltersProps {
    filters: Filters;
    onChange: (newFilters: Partial<Filters>) => void;
    onClose: () => void;
}

const OrderFilters: React.FC<OrderFiltersProps> = ({ filters, onChange, onClose }) => {
    const statusOptions = [
        { label: 'Request', value: 'request' },
        { label: 'Production Ready', value: 'production_ready' },
        { label: 'Approved', value: 'approved' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Rejected', value: 'rejected' },
    ];

    const paymentOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'Partial', value: 'partial' },
        { label: 'Completed', value: 'completed' },
    ];

    const handleMultiSelect = (field: keyof Filters, value: string) => {
        const current = filters[field] as string[];
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        onChange({ [field]: updated });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={20} className="text-gray-500" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Status Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
                    <div className="flex flex-wrap gap-2">
                        {statusOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleMultiSelect('status', option.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filters.status.includes(option.value)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-500'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Status Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                    <div className="flex flex-wrap gap-2">
                        {paymentOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleMultiSelect('paymentStatus', option.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filters.paymentStatus.includes(option.value)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-500'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={filters.dateRange.start}
                            onChange={(e) => onChange({ dateRange: { ...filters.dateRange, start: e.target.value } })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="date"
                            value={filters.dateRange.end}
                            onChange={(e) => onChange({ dateRange: { ...filters.dateRange, end: e.target.value } })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Amount Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range (₹)</label>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            placeholder="Min"
                            value={filters.amountRange.min || ''}
                            onChange={(e) => onChange({ amountRange: { ...filters.amountRange, min: Number(e.target.value) } })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.amountRange.max || ''}
                            onChange={(e) => onChange({ amountRange: { ...filters.amountRange, max: Number(e.target.value) } })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Delivery Status Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Status</label>
                    <div className="flex flex-wrap gap-2">
                        {['shipped', 'in_transit', 'delivered', 'returned'].map(status => (
                            <button
                                key={status}
                                onClick={() => handleMultiSelect('deliveryStatus', status)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${filters.deliveryStatus.includes(status)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-500'
                                    }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Boolean Filters */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={filters.hasComplaint}
                        onChange={(e) => onChange({ hasComplaint: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">Has Complaint</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={filters.activeComplaintOnly}
                        onChange={(e) => onChange({ activeComplaintOnly: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors">Active Complaint Only</span>
                </label>
            </div>
        </div>
    );
};

export default OrderFilters;
