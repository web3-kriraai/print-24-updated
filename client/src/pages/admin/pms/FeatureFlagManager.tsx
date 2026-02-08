import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const FeatureFlagManager: React.FC = () => {
    const [features, setFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFeatures();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchFeatures = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/pms/feature-flags', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch features');
            const data = await response.json();
            setFeatures(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = async (key: string, currentStatus: boolean) => {
        // Implement toggle logic
        console.log(`Toggling ${key} to ${!currentStatus}`);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
                    <nav className="text-sm text-gray-500 mt-1">
                        <Link to="/admin/pms" className="hover:text-blue-600">PMS Dashboard</Link> / Feature Flags
                    </nav>
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                    Create Feature Flag
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {features.map((feature) => (
                                <tr key={feature.key} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-gray-900">{feature.key}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                                        <div className="text-xs text-gray-500">{feature.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{feature.component || 'Global'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${feature.defaultValue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {feature.defaultValue ? 'Enabled Default' : 'Disabled Default'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                        <button className="text-indigo-600 hover:text-indigo-900">Toggle</button>
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

export default FeatureFlagManager;
