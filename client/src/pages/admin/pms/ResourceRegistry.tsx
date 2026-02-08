import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ResourceRegistry: React.FC = () => {
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchResources();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchResources = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/pms/resources', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch resources');
            const data = await response.json();
            setResources(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Resource Registry</h1>
                    <nav className="text-sm text-gray-500 mt-1">
                        <Link to="/admin/pms" className="hover:text-blue-600">PMS Dashboard</Link> / Resources
                    </nav>
                </div>
                <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                    Register Custom Resource
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions Available</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {resources.map((res) => (
                                <tr key={res.resource} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{res.resource}</div>
                                        <div className="text-xs text-gray-500">{res.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.category || 'General'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex flex-wrap gap-1">
                                            {res.actions.map((action: string) => (
                                                <span key={action} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                                    {action}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${res.isSystem ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {res.isSystem ? 'System' : 'Custom'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {!res.isSystem && (
                                            <button className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ResourceRegistry;
