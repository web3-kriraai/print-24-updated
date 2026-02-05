// OrderBulkActions.tsx - Bulk Actions Bar for Selected Orders
import React, { useState } from 'react';
import { Trash2, Download, Loader2 } from 'lucide-react';

interface OrderBulkActionsProps {
    selectedCount: number;
    onClearSelection: () => void;
    onStatusUpdate: (status: string) => Promise<void>;
    onPaymentUpdate: (paymentStatus: string) => Promise<void>;
    onExport: () => Promise<void>;
    onDelete: () => Promise<void>;
}

const OrderBulkActions: React.FC<OrderBulkActionsProps> = ({
    selectedCount,
    onClearSelection,
    onStatusUpdate,
    onPaymentUpdate,
    onExport,
    onDelete,
}) => {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState('');

    const handleStatusUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const status = e.target.value;
        if (!status) return;

        setLoading(true);
        setAction('status');
        try {
            await onStatusUpdate(status);
            e.target.value = ''; // Reset dropdown
        } finally {
            setLoading(false);
            setAction('');
        }
    };

    const handlePaymentUpdate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const paymentStatus = e.target.value;
        if (!paymentStatus) return;

        setLoading(true);
        setAction('payment');
        try {
            await onPaymentUpdate(paymentStatus);
            e.target.value = ''; // Reset dropdown
        } finally {
            setLoading(false);
            setAction('');
        }
    };

    const handleExport = async () => {
        setLoading(true);
        setAction('export');
        try {
            await onExport();
        } finally {
            setLoading(false);
            setAction('');
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedCount} order(s)? This action cannot be undone.`)) {
            return;
        }

        setLoading(true);
        setAction('delete');
        try {
            await onDelete();
        } finally {
            setLoading(false);
            setAction('');
        }
    };

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white shadow-2xl rounded-lg border border-gray-200 p-4 z-50 animate-slideUp">
            <div className="flex items-center gap-6">
                {/* Selected Count */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                        {selectedCount} selected
                    </span>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-300" />

                {/* Status Update */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Status:</label>
                    <select
                        onChange={handleStatusUpdate}
                        disabled={loading}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <option value="">Change Status</option>
                        <option value="APPROVED">Approve</option>
                        <option value="PRODUCTION">Start Production</option>
                        <option value="QC">Move to QC</option>
                        <option value="PACKED">Mark as Packed</option>
                        <option value="DISPATCHED">Dispatch</option>
                        <option value="DELIVERED">Deliver</option>
                    </select>
                    {loading && action === 'status' && <Loader2 size={16} className="animate-spin text-indigo-600" />}
                </div>

                {/* Payment Update */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Payment:</label>
                    <select
                        onChange={handlePaymentUpdate}
                        disabled={loading}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <option value="">Update Payment</option>
                        <option value="PENDING">Pending</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                    </select>
                    {loading && action === 'payment' && <Loader2 size={16} className="animate-spin text-indigo-600" />}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-300" />

                {/* Export Button */}
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                    {loading && action === 'export' ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Download size={16} />
                    )}
                    Export
                </button>

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                    {loading && action === 'delete' ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Trash2 size={16} />
                    )}
                    Delete
                </button>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-300" />

                {/* Clear Selection */}
                <button
                    onClick={onClearSelection}
                    disabled={loading}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default OrderBulkActions;
