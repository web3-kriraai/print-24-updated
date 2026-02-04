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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminComplaintManagement = () => {
    const [data, setData] = useState({ complaints: [], stats: null });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', type: '', search: '' });

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

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
                <input
                    type="text"
                    placeholder="Search by order number..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="flex-1 px-4 py-2 border rounded-lg"
                />
                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="px-4 py-2 border rounded-lg"
                >
                    <option value="">All Status</option>
                    <option value="NEW">New</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                </select>
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
