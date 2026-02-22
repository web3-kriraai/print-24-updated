// OrderBulkActions.tsx - Bulk Actions Bar for Selected Orders
import React, { useState } from 'react';
import { Trash2, Download, Loader2 } from 'lucide-react';

interface OrderBulkActionsProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete: () => Promise<void>;
}

const OrderBulkActions: React.FC<OrderBulkActionsProps> = ({
    selectedCount,
    onClearSelection,
    onDelete,
}) => {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState('');

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
;

export default OrderBulkActions;
