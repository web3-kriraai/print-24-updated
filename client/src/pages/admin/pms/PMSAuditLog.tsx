import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PMSAuditLog: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/pms/audit-logs', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch logs');
            const data = await response.json();
            setLogs(data.logs || []); // Assuming paginated response structure { logs: [], total: ... }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATED': return 'bg-green-100 text-green-800';
            case 'UPDATED': return 'bg-blue-100 text-blue-800';
            case 'DELETED': return 'bg-red-100 text-red-800';
            case 'ASSIGNED': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
                    <nav className="text-sm text-gray-500 mt-1">
                        <Link to="/admin/pms" className="hover:text-blue-600">PMS Dashboard</Link> / Audit Logs
                    </nav>
                </div>
                <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50">
                    Export CSV
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div className="text-red-500">{error}</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log: any) => (
                                    <tr key={log._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {log.resourceType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.changedBy?.name || 'System'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                                            {JSON.stringify(log.changes || {})}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PMSAuditLog;
