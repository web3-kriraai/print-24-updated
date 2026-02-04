/**
 * Admin Complaints Link Component
 * Simple component to add to admin navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export const AdminComplaintsLink: React.FC = () => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/admin/complaints')}
            className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-lg transition-all shadow-sm hover:shadow-md group"
        >
            <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-lg flex items-center justify-center transition-colors">
                <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-left">
                <h3 className="font-semibold text-gray-900">Complaint Management</h3>
                <p className="text-xs text-gray-500">View and manage customer complaints</p>
            </div>
        </button>
    );
};

export default AdminComplaintsLink;
