import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ViewStyleManager: React.FC = () => {
    const [styles, setStyles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStyles();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchStyles = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/pms/view-styles', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch styles');
            const data = await response.json();
            setStyles(data);
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
                    <h1 className="text-2xl font-bold text-gray-900">View Styles</h1>
                    <nav className="text-sm text-gray-500 mt-1">
                        <Link to="/admin/pms" className="hover:text-blue-600">PMS Dashboard</Link> / View Styles
                    </nav>
                </div>
                <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                    Create New Style
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : error ? (
                <div className="text-red-500">{error}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {styles.map((style) => (
                        <div key={style._id} className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{style.name}</h3>
                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{style.code}</span>
                                </div>
                                {style.isDefault && (
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Default</span>
                                )}
                            </div>

                            <p className="text-gray-500 mt-3 text-sm line-clamp-2">{style.description}</p>

                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="text-xs text-gray-500 mb-2">Configured Components:</div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(style.componentConfigs || {}).slice(0, 3).map(key => (
                                        <span key={key} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs capitalize">{key}</span>
                                    ))}
                                    {Object.keys(style.componentConfigs || {}).length > 3 && (
                                        <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-xs">+{Object.keys(style.componentConfigs || {}).length - 3} more</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">Clone</button>
                                <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">Edit</button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Card */}
                    <button className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-colors">
                        <span className="text-4xl mb-2">+</span>
                        <span className="font-medium">Create New Style</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ViewStyleManager;
