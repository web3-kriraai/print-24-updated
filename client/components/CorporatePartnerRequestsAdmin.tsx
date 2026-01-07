// Corporate Partner Requests Admin Component
// This component displays corporate partner signup requests for admin approval/rejection

import React, { useState, useEffect } from "react";
import {
    Briefcase, CheckCircle, XCircle, User, Mail, Phone, MapPin,
    FileText, Eye, Clock, RefreshCw, Building2, Search, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";

// Corporate Request interface matching CorporateProfile model
interface CorporateRequest {
    _id: string;
    organizationName: string;
    organizationType: string;
    authorizedPersonName: string;
    designation: string;
    mobileNumber: string;
    whatsappNumber?: string;
    officialEmail: string;
    gstNumber: string;
    address: {
        fullAddress: string;
        city: string;
        state: string;
        pincode: string;
    };
    proofDocument: string;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
    verifiedBy?: { _id: string; name: string; email: string };
    verifiedAt?: string;
    rejectionReason?: string;
    user?: { _id: string; name: string; email: string; mobileNumber: string; approvalStatus?: string; createdAt?: string };
    createdAt: string;
    updatedAt: string;
}

interface CorporatePartnerRequestsAdminProps {
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
}

const CorporatePartnerRequestsAdmin: React.FC<CorporatePartnerRequestsAdminProps> = ({ onSuccess, onError }) => {
    const [requests, setRequests] = useState<CorporateRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal State
    const [selectedRequest, setSelectedRequest] = useState<CorporateRequest | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
        };
    };

    // Fetch corporate requests
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const statusParam = filter !== "all" ? `?status=${filter}` : "";
            const response = await fetch(`${API_BASE_URL}/auth/corporate-requests${statusParam}`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setRequests(data.requests || []);
                setCurrentPage(1); // Reset to first page
            } else {
                throw new Error(data.message || "Failed to fetch requests");
            }
        } catch (error: any) {
            console.error("Fetch corporate requests error:", error);
            onError?.(error.message || "Failed to fetch corporate requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    // Approve request
    const handleApprove = async (requestId: string) => {
        if (!window.confirm("Are you sure you want to approve this request?")) return;

        setActionLoading(requestId);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/corporate-requests/${requestId}/approve`, {
                method: "POST",
                headers: getAuthHeaders(),
            });

            const data = await response.json();
            if (data.success) {
                onSuccess?.("Corporate request approved successfully!");
                fetchRequests();
                if (selectedRequest?._id === requestId) setSelectedRequest(null);
            } else {
                throw new Error(data.message || "Failed to approve");
            }
        } catch (error: any) {
            onError?.(error.message || "Failed to approve request");
        } finally {
            setActionLoading(null);
        }
    };

    // Reject request
    const handleReject = async (requestId: string) => {
        if (!window.confirm("Are you sure you want to reject this request?")) return;

        setActionLoading(requestId);
        try {
            // Allow rejection without reason for now as per current backend implementation
            const response = await fetch(`${API_BASE_URL}/auth/corporate-requests/${requestId}/reject`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ rejectionReason: "Rejected by admin" })
            });

            const data = await response.json();
            if (data.success) {
                onSuccess?.("Corporate request rejected successfully!");
                fetchRequests();
                if (selectedRequest?._id === requestId) setSelectedRequest(null);
            } else {
                throw new Error(data.message || "Failed to reject");
            }
        } catch (error: any) {
            onError?.(error.message || "Failed to reject request");
        } finally {
            setActionLoading(null);
        }
    };

    // Filter and Search Logic
    const filteredRequests = requests.filter(req => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            req.organizationName.toLowerCase().includes(query) ||
            req.authorizedPersonName.toLowerCase().includes(query) ||
            req.officialEmail.toLowerCase().includes(query) ||
            req.mobileNumber.includes(query)
        );
    });

    // Pagination Logic
    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className="space-y-6">
            {/* Header with Search and Filter */}
            <div className="glass-panel p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Corporate Requests</h2>
                            <p className="text-xs text-gray-500">Manage corporate partnerships</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search organization..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as typeof filter)}
                            className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>

                        <button
                            onClick={fetchRequests}
                            disabled={loading}
                            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 text-gray-600"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-medium">
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Authorized Person</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-28"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-12 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : currentItems.length > 0 ? (
                                currentItems.map((request) => (
                                    <tr key={request._id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedRequest(request)}>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                                ${request.verificationStatus === "APPROVED" ? "bg-green-100 text-green-700" :
                                                    request.verificationStatus === "REJECTED" ? "bg-red-100 text-red-700" :
                                                        "bg-yellow-100 text-yellow-700"}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${request.verificationStatus === "APPROVED" ? "bg-green-500" :
                                                        request.verificationStatus === "REJECTED" ? "bg-red-500" :
                                                            "bg-yellow-500"
                                                    }`}></span>
                                                {request.verificationStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{request.organizationName}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {request.authorizedPersonName}
                                            <div className="text-xs text-gray-400">{request.designation}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            <div>{request.mobileNumber}</div>
                                            <div className="text-xs text-gray-400">{request.officialEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">
                                            {request.organizationType}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setSelectedRequest(request)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {request.verificationStatus === "PENDING" && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(request._id)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Approve"
                                                            disabled={actionLoading === request._id}
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(request._id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject"
                                                            disabled={actionLoading === request._id}
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Search size={32} className="opacity-20" />
                                            <p>No requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)}</span> of <span className="font-medium text-gray-900">{totalItems}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-medium text-gray-700 px-2">
                                Page {currentPage} of {Math.max(1, totalPages)}
                            </span>
                            <button
                                onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Request Details</h3>
                                <p className="text-sm text-gray-500">Full information for {selectedRequest.organizationName}</p>
                            </div>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Organization Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Briefcase size={16} className="text-purple-600" />
                                        Organization Information
                                    </h4>
                                    <div className="p-4 rounded-xl bg-gray-50 space-y-3 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Organization Name</span>
                                            <span className="font-medium text-gray-900 text-lg">{selectedRequest.organizationName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Type</span>
                                            <span className="font-medium text-gray-900">{selectedRequest.organizationType}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">GST Number</span>
                                            <span className="font-mono text-gray-700">{selectedRequest.gstNumber || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Address</span>
                                            <span className="text-gray-700">
                                                {[
                                                    selectedRequest.address?.fullAddress,
                                                    selectedRequest.address?.city,
                                                    selectedRequest.address?.state,
                                                    selectedRequest.address?.pincode,
                                                ].filter(Boolean).join(", ") || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <User size={16} className="text-blue-600" />
                                        Authorized Person
                                    </h4>
                                    <div className="p-4 rounded-xl bg-gray-50 space-y-3 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Name</span>
                                            <span className="font-medium text-gray-900">{selectedRequest.authorizedPersonName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Designation</span>
                                            <span className="font-medium text-gray-900">{selectedRequest.designation}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Mobile</span>
                                            <span className="text-gray-700 font-medium">{selectedRequest.mobileNumber}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Official Email</span>
                                            <span className="text-gray-700 break-all">{selectedRequest.officialEmail}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Proof Document */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <FileText size={16} className="text-orange-600" />
                                    Verification Document
                                </h4>
                                {selectedRequest.proofDocument ? (
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Eye size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Proof Document</p>
                                                <p className="text-xs text-gray-500">Business Registration / ID Proof</p>
                                            </div>
                                        </div>
                                        <a
                                            href={selectedRequest.proofDocument}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                        >
                                            View Original
                                        </a>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">
                                        No document uploaded
                                    </div>
                                )}
                            </div>

                            {/* Status Timeline */}
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock size={16} className="text-blue-500" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Request Timeline</span>
                                </div>
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Submitted on:</span>
                                        <span className="font-medium text-gray-900">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                                    </div>
                                    {selectedRequest.verifiedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">{selectedRequest.verificationStatus === "APPROVED" ? "Approved" : "Rejected"} on:</span>
                                            <span className="font-medium text-gray-900">{new Date(selectedRequest.verifiedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                            {selectedRequest.verificationStatus === "PENDING" && (
                                <>
                                    <button
                                        onClick={() => handleReject(selectedRequest._id)}
                                        disabled={actionLoading === selectedRequest._id}
                                        className="px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        <XCircle size={18} />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedRequest._id)}
                                        disabled={actionLoading === selectedRequest._id}
                                        className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        {actionLoading === selectedRequest._id ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                        Approve
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorporatePartnerRequestsAdmin;
