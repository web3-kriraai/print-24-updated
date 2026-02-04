/**
 * Quick Access Page for Testing Complaint Management
 * Temporary testing page - Access at /test-complaints
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, UserCircle, ShieldCheck } from 'lucide-react';

const ComplaintTestPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-4">
                        <AlertCircle className="w-10 h-10 text-orange-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Complaint Management System
                    </h1>
                    <p className="text-gray-600">Test all complaint features from this page</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Customer Side */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <UserCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Customer Side</h2>
                                <p className="text-sm text-gray-500">Test complaint registration</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/my-orders')}
                                className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between group"
                            >
                                <span>View My Orders</span>
                                <span className="text-blue-200 group-hover:translate-x-1 transition-transform">→</span>
                            </button>

                            <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
                                <strong>Steps:</strong>
                                <ol className="list-decimal list-inside mt-2 space-y-1">
                                    <li>Click "View My Orders"</li>
                                    <li>Click on any order</li>
                                    <li>Click "Register Complaint" button</li>
                                    <li>Fill the form and submit</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Admin Side */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-orange-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Admin Side</h2>
                                <p className="text-sm text-gray-500">Manage complaints</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/admin/complaints')}
                                className="w-full px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors text-left flex items-center justify-between group"
                            >
                                <span>Complaint Dashboard</span>
                                <span className="text-orange-200 group-hover:translate-x-1 transition-transform">→</span>
                            </button>

                            <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
                                <strong>Features:</strong>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>View all complaints</li>
                                    <li>Filter by status/type</li>
                                    <li>Update complaint status</li>
                                    <li>Add messages</li>
                                    <li>View statistics</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* API Testing */}
                <div className="mt-6 bg-gray-900 rounded-2xl shadow-xl p-8 text-white">
                    <h3 className="text-xl font-bold mb-4">📡 API Endpoints Active</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
                        <div>
                            <p className="text-gray-400 mb-2">Customer Endpoints:</p>
                            <ul className="space-y-1 text-green-400">
                                <li>✓ GET /complaints/check-eligibility/:id</li>
                                <li>✓ POST /complaints/register</li>
                                <li>✓ GET /complaints/:id</li>
                                <li>✓ POST /complaints/:id/messages</li>
                            </ul>
                        </div>
                        <div>
                            <p className="text-gray-400 mb-2">Admin Endpoints:</p>
                            <ul className="space-y-1 text-green-400">
                                <li>✓ GET /complaints</li>
                                <li>✓ GET /complaints/stats/dashboard</li>
                                <li>✓ PATCH /complaints/:id/status</li>
                                <li>✓ POST /complaints/:id/reopen</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 mb-3">Quick Access:</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                        >
                            Admin Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
                        >
                            My Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintTestPage;
