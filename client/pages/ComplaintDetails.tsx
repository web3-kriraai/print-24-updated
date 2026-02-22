/**
 * COMPLAINT MANAGEMENT SYSTEM - Frontend Component
 * ComplaintDetails.tsx
 * Created: 2026-02-04
 * 
 * View complaint details with conversation thread
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    MessageCircle, Send, Package, Clock, CheckCircle2, XCircle,
    AlertCircle, RefreshCcw, ArrowLeft, Paperclip, Loader2, Shield
} from 'lucide-react';

import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

const API_URL = API_BASE_URL_WITH_API;

interface Conversation {
    message: string;
    sentBy: { _id?: string; name: string; email: string };
    sentByRole: string;
    timestamp: string;
    isInternal: boolean;
    attachments?: string[];
}

interface Complaint {
    _id: string;
    orderNumber: string;
    type: string;
    status: string;
    description: string;
    images: { url: string }[];
    conversations: Conversation[];
    statusHistory: any[];
    createdAt: string;
    resolutionType?: string;
    mistakeType?: string;
    reopenedCount?: number;
}

const ComplaintDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isInternal, setIsInternal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusNotes, setStatusNotes] = useState('');

    useEffect(() => {
        console.log('🔄 ComplaintDetails mounted/updated with ID:', id);
        fetchComplaint();
        checkUserRole();
    }, [id]);

    const checkUserRole = () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.role === 'admin' || user.role === 'emp');
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [complaint?.conversations]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchComplaint = async () => {
        // ✅ Guard against undefined ID
        if (!id) {
            console.error('❌ Complaint ID is undefined! useParams returned:', { id });
            setError('Invalid complaint ID');
            setLoading(false);
            return;
        }

        console.log('📋 Fetching complaint with ID:', id);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/complaints/${id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load complaint');
            }

            setComplaint(data.complaint);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching complaint:', error);
            setError(error instanceof Error ? error.message : 'Failed to load complaint');
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/complaints/${id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ message: newMessage, isInternal }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            setNewMessage('');
            setIsInternal(false);
            await fetchComplaint(); // Refresh to show new message
        } catch (error) {
            console.error('Error sending message:', error);
            setError(error instanceof Error ? error.message : 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatus) return;

        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/complaints/${id}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: newStatus, notes: statusNotes }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                // Show specific error for 403
                if (response.status === 403) {
                    throw new Error(data.message || 'Permission denied. Only admins can update complaint status.');
                }
                // Show the detailed validation message from backend
                if (response.status === 400 && data.message) {
                    throw new Error(data.message);
                }
                throw new Error(data.error || data.message || 'Failed to update status');
            }

            setNewStatus('');
            setStatusNotes('');
            await fetchComplaint(); // Refresh to show updated status
        } catch (error) {
            console.error('Error updating status:', error);
            setError(error instanceof Error ? error.message : 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            NEW: 'bg-blue-100 text-blue-800',
            UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
            WAITING_FOR_CUSTOMER: 'bg-orange-100 text-orange-800',
            APPROVED_FOR_REPRINT: 'bg-green-100 text-green-800',
            RESOLVED: 'bg-green-100 text-green-800',
            CLOSED: 'bg-gray-100 text-gray-800',
            REJECTED: 'bg-red-100 text-red-800',
            REOPENED: 'bg-purple-100 text-purple-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status: string) => {
        const icons: Record<string, React.ReactNode> = {
            NEW: <AlertCircle className="w-5 h-5" />,
            UNDER_REVIEW: <Clock className="w-5 h-5" />,
            APPROVED_FOR_REPRINT: <CheckCircle2 className="w-5 h-5" />,
            RESOLVED: <CheckCircle2 className="w-5 h-5" />,
            CLOSED: <CheckCircle2 className="w-5 h-5" />,
            REJECTED: <XCircle className="w-5 h-5" />,
            REOPENED: <RefreshCcw className="w-5 h-5" />,
        };
        return icons[status] || <Package className="w-5 h-5" />;
    };

    // ✅ Get available next statuses based on current status
    const getAvailableStatuses = (currentStatus: string | undefined) => {
        if (!currentStatus) return [];

        // Status transition matrix matching backend logic
        const transitions: Record<string, Array<{ value: string; label: string }>> = {
            'NEW': [
                { value: 'UNDER_REVIEW', label: 'Under Review' },
                { value: 'REJECTED', label: 'Rejected' }
            ],
            'UNDER_REVIEW': [
                { value: 'WAITING_FOR_CUSTOMER', label: 'Waiting for Customer' },
                { value: 'APPROVED_FOR_REPRINT', label: 'Approved for Reprint' },
                { value: 'REJECTED', label: 'Rejected' }
            ],
            'WAITING_FOR_CUSTOMER': [
                { value: 'UNDER_REVIEW', label: 'Under Review' }
            ],
            'APPROVED_FOR_REPRINT': [
                { value: 'RESOLVED', label: 'Resolved' }
            ],
            'RESOLVED': [
                { value: 'CLOSED', label: 'Closed' }
            ],
            'CLOSED': [
                { value: 'REOPENED', label: 'Reopened' }
            ],
            'REOPENED': [
                { value: 'UNDER_REVIEW', label: 'Under Review' }
            ],
            'REJECTED': [] // Terminal state
        };

        return transitions[currentStatus] || [];
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !complaint) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-800">{error || 'Complaint not found'}</p>
                    <button
                        onClick={() => navigate('/my-orders')}
                        className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                        Back to Orders
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4">
            {/* Header */}
            <div className="mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Complaint #{complaint._id.slice(-8).toUpperCase()}
                                </h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complaint.status)}`}>
                                    {complaint.status.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Package className="w-4 h-4" />
                                <span>Order: {complaint.orderNumber}</span>
                                <span className="mx-2">•</span>
                                <Clock className="w-4 h-4" />
                                <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {complaint.reopenedCount && complaint.reopenedCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                                <RefreshCcw className="w-4 h-4" />
                                Reopened {complaint.reopenedCount}x
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Admin Controls - Status Update */}
            {isAdmin && (
                <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Admin Controls - Update Status
                    </h3>
                    <form onSubmit={handleStatusUpdate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">Select status...</option>
                                    {getAvailableStatuses(complaint?.status).map(status => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={statusNotes}
                                    onChange={(e) => setStatusNotes(e.target.value)}
                                    placeholder="Add notes about status change..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={updating || !newStatus}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {updating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Update Status
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Content - Conversation */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-md flex flex-col" style={{ height: '600px' }}>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Conversation
                            </h2>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {complaint.conversations.map((conv, index) => {
                                // Get current logged-in user ID from localStorage
                                const userStr = localStorage.getItem('user');
                                let currentUserId = null;
                                if (userStr) {
                                    try {
                                        const user = JSON.parse(userStr);
                                        currentUserId = user.id || user._id; // Handle both formats
                                    } catch (e) {
                                        console.error('Failed to parse user from localStorage');
                                    }
                                }

                                // Determine if this message is from the logged-in user
                                const isMyMessage = currentUserId && conv.sentBy?._id === currentUserId;
                                const isStaff = conv.sentByRole === 'PRINTS24_STAFF';
                                const isInternal = conv.isInternal;

                                return (
                                    <div
                                        key={index}
                                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] ${isMyMessage ? 'bg-indigo-100' : 'bg-gray-100'} rounded-lg p-4 relative`}>
                                            {/* Internal Note Badge */}
                                            {isInternal && (
                                                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 shadow-md">
                                                    <Shield className="w-3 h-3" />
                                                    Internal
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-semibold text-sm ${isMyMessage ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                    {conv.sentBy?.name || 'User'}
                                                </span>
                                                {isStaff && !isInternal && (
                                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Staff</span>
                                                )}
                                                <span className="text-xs text-gray-500">
                                                    {new Date(conv.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{conv.message}</p>
                                            {conv.attachments && conv.attachments.length > 0 && (
                                                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                                    <Paperclip className="w-4 h-4" />
                                                    <span>{conv.attachments.length} attachment(s)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                            {isAdmin && (
                                <div className="mb-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={isInternal}
                                            onChange={(e) => setIsInternal(e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Internal note (not visible to customer)
                                    </label>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar - Details */}
                <div className="space-y-4">
                    {/* Complaint Info */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Complaint Details</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-gray-600">Type:</span>
                                <p className="font-medium text-gray-900">{complaint.type.replace(/_/g, ' ')}</p>
                            </div>

                            {complaint.mistakeType && (
                                <div>
                                    <span className="text-gray-600">Mistake Type:</span>
                                    <p className={`font-medium ${complaint.mistakeType === 'COMPANY_MISTAKE' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {complaint.mistakeType.replace(/_/g, ' ')}
                                    </p>
                                </div>
                            )}

                            {complaint.resolutionType && (
                                <div>
                                    <span className="text-gray-600">Resolution:</span>
                                    <p className="font-medium text-gray-900">{complaint.resolutionType}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Timeline */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Status History</h3>
                        <div className="space-y-3">
                            {complaint.statusHistory.slice().reverse().map((history, index) => (
                                <div key={index} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`p-1 rounded-full ${getStatusColor(history.status)}`}>
                                            {getStatusIcon(history.status)}
                                        </div>
                                        {index < complaint.statusHistory.length - 1 && (
                                            <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-gray-900">
                                            {history.status.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(history.timestamp).toLocaleString()}
                                        </p>
                                        {history.notes && (
                                            <p className="text-xs text-gray-600 mt-1">{history.notes}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Images */}
                    {complaint.images && complaint.images.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Attachments</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {complaint.images.map((img, index) => (
                                    <img
                                        key={index}
                                        src={img.url}
                                        alt={`Attachment ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                                        onClick={() => window.open(img.url, '_blank')}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintDetails;
