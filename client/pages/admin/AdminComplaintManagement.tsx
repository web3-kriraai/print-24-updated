/**
 * COMPLAINT MANAGEMENT SYSTEM - Admin Page (Simplified)
 * Created: 2026-02-04
 * 
 * Basic admin complaint management dashboard
 * Can be enhanced based on requirements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Clock, XCircle, Search, Filter } from 'lucide-react';

import { API_BASE_URL_WITH_API } from '../../lib/apiConfig';

const API_URL = API_BASE_URL_WITH_API;

const AdminComplaintManagement = () => {
    const [data, setData] = useState<any>({ complaints: [], stats: null });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        type: '',
        search: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [complaintsRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/complaints`, {
                    headers,
                    params: filters,
                }),
                axios.get(`${API_URL}/complaints/stats/dashboard`, { headers }),
            ]);

            setData({
                complaints: complaintsRes.data.complaints || [],
                stats: statsRes.data.stats || null,
            });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching complaint data:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Complaint Management</h1>

            {/* Stats Cards */}
            {data.stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total</p>
                                <p className="text-2xl font-bold">{data.stats.total}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Open</p>
                                <p className="text-2xl font-bold">{data.stats.open}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Resolved</p>
                                <p className="text-2xl font-bold">{data.stats.resolved}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">SLA Compliance</p>
                                <p className="text-2xl font-bold">{data.stats.sla?.complianceRate}%</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-indigo-500" />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Avg Response</p>
                                <p className="text-2xl font-bold">{data.stats.sla?.avgResponseTime || 0}m</p>
                            </div>
                            <Clock className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Search</label>
                        <input
                            type="text"
                            placeholder="Order number or Complaint ID..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="NEW">New</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="REOPENED">Reopened</option>
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">All Types</option>
                            <option value="PRINTING_QUALITY">Printing Quality</option>
                            <option value="WRONG_CONTENT">Wrong Content</option>
                            <option value="QUANTITY_ISSUE">Quantity Issue</option>
                            <option value="ORDER_DELAY">Order Delay</option>
                            <option value="DAMAGE_DELIVERY">Damage in Delivery</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                        <button
                            onClick={() => setFilters({ status: '', type: '', search: '', startDate: '', endDate: '' })}
                            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Date Range Filter (Second Row) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">From Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">To Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Complaints List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.complaints.map((complaint: any) => (
                            <tr key={complaint._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm">{complaint._id.slice(-8).toUpperCase()}</td>
                                <td className="px-6 py-4 text-sm font-medium">{complaint.orderNumber}</td>
                                <td className="px-6 py-4 text-sm">{complaint.type.replace(/_/g, ' ')}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                        complaint.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {complaint.status}
                                    </span>
                                    {/* SLA Badge */}
                                    {complaint.slaBreached === true && (
                                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                            SLA ⏰
                                        </span>
                                    )}
                                    {complaint.firstResponseTime && !complaint.slaBreached && (
                                        <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                            ✓ On Time
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {new Date(complaint.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <a
                                        href={`/complaints/${complaint._id}`}
                                        className="text-indigo-600 hover:text-indigo-900"
                                    >
                                        View Details
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminComplaintManagement;
