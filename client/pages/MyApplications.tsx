import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Application {
  _id: string;
  applicationNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  userSegment: {
    name: string;
    code: string;
    icon?: string;
    color?: string;
  };
  signupForm: {
    name: string;
  };
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const MyApplications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/segment-applications/my-applications', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setApplications(response.data.applications || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✓';
      case 'rejected':
        return '✗';
      default:
        return '⏳';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-purple-600 hover:text-purple-700 mb-4 flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-2">Track the status of your segment applications</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Applications Yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't submitted any segment applications. Apply for a segment to get started!
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Apply for a Segment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app._id}
                className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  {/* Left Section */}
                  <div className="flex-1 mb-4 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      {app.userSegment.icon && (
                        <span className="text-2xl">{app.userSegment.icon}</span>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {app.userSegment.name}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono">
                          {app.applicationNumber}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Form:</span> {app.signupForm.name}
                      </div>
                      <div>
                        <span className="font-medium">Submitted:</span>{' '}
                        {new Date(app.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {app.reviewedAt && (
                        <div>
                          <span className="font-medium">Reviewed:</span>{' '}
                          {new Date(app.reviewedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Section - Status */}
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <div
                      className={`px-4 py-2 rounded-lg border-2 font-semibold flex items-center gap-2 ${getStatusBadge(
                        app.status
                      )}`}
                    >
                      <span className="text-lg">{getStatusIcon(app.status)}</span>
                      <span className="uppercase text-sm">{app.status}</span>
                    </div>

                    {app.status === 'pending' && (
                      <p className="text-xs text-gray-500 text-right">
                        Your application is being reviewed
                      </p>
                    )}

                    {app.status === 'approved' && (
                      <p className="text-xs text-green-600 font-medium text-right">
                        Congratulations! Application approved
                      </p>
                    )}

                    {app.status === 'rejected' && app.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 mt-2 max-w-xs">
                        <p className="text-xs text-red-700">
                          <span className="font-medium">Reason:</span> {app.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline (for visual appeal) */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between relative">
                    {/* Submitted */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white mb-2">
                        ✓
                      </div>
                      <p className="text-xs font-medium text-gray-900">Submitted</p>
                      <p className="text-xs text-gray-500">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-0">
                      <div
                        className={`h-full transition-all ${
                          app.status !== 'pending' ? 'bg-green-500' : 'bg-yellow-500 w-1/2'
                        }`}
                      ></div>
                    </div>

                    {/* Under Review */}
                    <div className="flex flex-col items-center z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 ${
                          app.status === 'pending'
                            ? 'bg-yellow-500 animate-pulse'
                            : app.status === 'approved'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      >
                        {app.status === 'pending' ? '⏳' : '✓'}
                      </div>
                      <p className="text-xs font-medium text-gray-900">Under Review</p>
                      <p className="text-xs text-gray-500">
                        {app.status !== 'pending' && app.reviewedAt
                          ? new Date(app.reviewedAt).toLocaleDateString()
                          : 'In progress'}
                      </p>
                    </div>

                    {/* Final Status */}
                    <div className="flex flex-col items-center z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 ${
                          app.status === 'approved'
                            ? 'bg-green-500'
                            : app.status === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-gray-300'
                        }`}
                      >
                        {app.status === 'approved'
                          ? '✓'
                          : app.status === 'rejected'
                          ? '✗'
                          : '?'}
                      </div>
                      <p className="text-xs font-medium text-gray-900">
                        {app.status === 'approved'
                          ? 'Approved'
                          : app.status === 'rejected'
                          ? 'Rejected'
                          : 'Pending'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.status !== 'pending' && app.reviewedAt
                          ? new Date(app.reviewedAt).toLocaleDateString()
                          : 'Awaiting'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-800">
            If you have questions about your application status, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MyApplications;
