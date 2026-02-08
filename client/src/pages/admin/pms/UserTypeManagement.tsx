import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface UserType {
    _id: string;
    name: string;
    code: string;
    description?: string;
    pricingTier?: string;
    parentType?: { _id: string; name: string };
    isActive: boolean;
    privilegeBundleIds?: string[];
    limits?: {
        maxOrdersPerDay?: number;
        maxCreditLimit?: number;
    };
}

const UserTypeManagement: React.FC = () => {
    const [userTypes, setUserTypes] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState<UserType | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        pricingTier: '',
        parentType: '',
        isActive: true,
        maxOrdersPerDay: 0,
        maxCreditLimit: 0,
    });

    useEffect(() => {
        fetchUserTypes();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchUserTypes = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/pms/user-types', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            setUserTypes(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingType(null);
        setFormData({
            name: '',
            code: '',
            description: '',
            pricingTier: '',
            parentType: '',
            isActive: true,
            maxOrdersPerDay: 0,
            maxCreditLimit: 0,
        });
        setShowModal(true);
    };

    const handleEdit = (type: UserType) => {
        setEditingType(type);
        setFormData({
            name: type.name,
            code: type.code,
            description: type.description || '',
            pricingTier: type.pricingTier || '',
            parentType: type.parentType?._id || '',
            isActive: type.isActive,
            maxOrdersPerDay: type.limits?.maxOrdersPerDay || 0,
            maxCreditLimit: type.limits?.maxCreditLimit || 0,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                code: formData.code,
                description: formData.description,
                pricingTier: formData.pricingTier,
                parentType: formData.parentType || null,
                isActive: formData.isActive,
                limits: {
                    maxOrdersPerDay: formData.maxOrdersPerDay,
                    maxCreditLimit: formData.maxCreditLimit,
                },
            };

            const url = editingType
                ? `/api/admin/pms/user-types/${editingType._id}`
                : '/api/admin/pms/user-types';

            const response = await fetch(url, {
                method: editingType ? 'PUT' : 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save');
            }

            setShowModal(false);
            fetchUserTypes();
        } catch (err: any) {
            alert(err.message || 'Failed to save user type');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user type?')) return;

        try {
            const response = await fetch(`/api/admin/pms/user-types/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }
            fetchUserTypes();
        } catch (err: any) {
            alert(err.message || 'Failed to delete user type');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Type Management</h1>
                    <nav className="text-sm text-gray-500 mt-1">
                        <Link to="/admin/pms" className="hover:text-blue-600">PMS Dashboard</Link> / User Types
                    </nav>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Create New Type
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : error ? (
                <div className="text-red-500 bg-red-50 p-4 rounded">{error}</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Tier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {userTypes.map((type) => (
                                <tr key={type._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{type.name}</div>
                                        <div className="text-sm text-gray-500">{type.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.parentType?.name || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.pricingTier || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${type.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {type.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(type)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type._id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {editingType ? 'Edit User Type' : 'Create User Type'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier</label>
                                    <input
                                        type="text"
                                        value={formData.pricingTier}
                                        onChange={(e) => setFormData({ ...formData, pricingTier: e.target.value })}
                                        placeholder="e.g., PREMIUM, STANDARD"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Type</label>
                                    <select
                                        value={formData.parentType}
                                        onChange={(e) => setFormData({ ...formData, parentType: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">None</option>
                                        {userTypes.filter(t => t._id !== editingType?._id).map(t => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders/Day</label>
                                    <input
                                        type="number"
                                        value={formData.maxOrdersPerDay}
                                        onChange={(e) => setFormData({ ...formData, maxOrdersPerDay: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Credit Limit</label>
                                    <input
                                        type="number"
                                        value={formData.maxCreditLimit}
                                        onChange={(e) => setFormData({ ...formData, maxCreditLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {editingType ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserTypeManagement;
