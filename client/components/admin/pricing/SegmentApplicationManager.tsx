import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface SegmentApplication {
  _id: string;
  email: string;
  applicationNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  userSegment: {
    _id: string;
    name: string;
    code: string;
    icon?: string;
    color?: string;
  };
  signupForm: {
    _id: string;
    name: string;
  };
  formData: Map<string, any>;
  uploadedFiles: Array<{
    fieldId: string;
    fieldLabel: string;
    fileUrl: string;
    fileName: string;
  }>;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const SegmentApplicationManager: React.FC = () => {
  const [applications, setApplications] = useState<SegmentApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [selectedApplication, setSelectedApplication] = useState<SegmentApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchApplications();
  }, [filters]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(`/api/admin/segment-applications?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setApplications(response.data.applications || []);
      setStats(response.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (appId: string) => {
    try {
      const response = await axios.get(`/api/admin/segment-applications/${appId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setSelectedApplication(response.data.application);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load application details');
    }
  };

  const handleApprove = async (appId: string) => {
    const notes = prompt('Approval notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      setLoading(true);
      await axios.post(
        `/api/admin/segment-applications/${appId}/approve`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      await fetchApplications();
      setSelectedApplication(null);
      toast.success('✅ Application approved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve application');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (appId: string) => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;

    const notes = prompt('Additional notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      setLoading(true);
      await axios.post(
        `/api/admin/segment-applications/${appId}/reject`,
        { reason, notes },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      await fetchApplications();
      setSelectedApplication(null);
      toast.success('Application rejected');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Segment Applications</h1>
          <p className="text-gray-600 mt-1">Review and manage user segment applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Applications</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-sm text-yellow-700">Pending Review</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-green-700">Approved</div>
            <div className="text-2xl font-bold text-green-900 mt-1">{stats.approved}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-sm text-red-700">Rejected</div>
            <div className="text-2xl font-bold text-red-900 mt-1">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Email or Application Number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Applications List */}
        {loading && applications.length === 0 ? (
          <div className="text-center py-12">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
            No applications found
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Application #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Segment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {app.applicationNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {app.userSegment?.icon && <span className="mr-2">{app.userSegment.icon}</span>}
                        <span className="text-sm text-gray-900">{app.userSegment?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(app.status)}`}>
                        {app.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(app._id)}
                        className="text-purple-600 hover:text-purple-900 mr-4"
                      >
                        View
                      </button>
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(app._id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(app._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">Application Details</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedApplication.applicationNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium">{selectedApplication.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Segment</div>
                      <div className="font-medium">
                        {selectedApplication.userSegment?.icon} {selectedApplication.userSegment?.name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Status</div>
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${getStatusColor(
                          selectedApplication.status
                        )}`}
                      >
                        {selectedApplication.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Submitted On</div>
                      <div className="font-medium">
                        {new Date(selectedApplication.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Data */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Form Responses</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedApplication.formData || {}).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 p-3 rounded">
                        <div className="text-sm text-gray-500 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="font-medium mt-1">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uploaded Files */}
                {selectedApplication.uploadedFiles && selectedApplication.uploadedFiles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
                    <div className="space-y-2">
                      {selectedApplication.uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div>
                            <div className="font-medium">{file.fieldLabel}</div>
                            <div className="text-sm text-gray-500">{file.fileName}</div>
                          </div>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-900 text-sm"
                          >
                            View File →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Info */}
                {selectedApplication.reviewedAt && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Review Information</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Reviewed By</div>
                          <div className="font-medium">
                            {selectedApplication.reviewedBy?.name || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Reviewed On</div>
                          <div className="font-medium">
                            {new Date(selectedApplication.reviewedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedApplication.status === 'pending' && (
                <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                  <button
                    onClick={() => handleReject(selectedApplication._id)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedApplication._id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentApplicationManager;
