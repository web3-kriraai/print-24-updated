import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Privilege {
    resource: string;
    actions: string[];
}

interface PrivilegeBundle {
    _id: string;
    name: string;
    code: string;
    description?: string;
    privileges: Privilege[];
    isActive: boolean;
}

interface Resource {
    resource: string;
    displayName: string;
    actions: string[];
    category: string;
}

const PrivilegeBundleManager: React.FC = () => {
    const [bundles, setBundles] = useState<PrivilegeBundle[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBundle, setEditingBundle] = useState<PrivilegeBundle | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        privileges: [] as Privilege[],
        isActive: true,
    });

    useEffect(() => {
        fetchBundles();
        fetchResources();
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchBundles = async () => {
        try {
            const response = await fetch('/api/admin/pms/privilege-bundles', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch bundles');
            const data = await response.json();
            setBundles(data);
        } catch (error) {
            console.error('Failed to fetch bundles:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await fetch('/api/admin/pms/resources', {
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch resources');
            const data = await response.json();
            setResources(data);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        }
    };

    const handleCreate = () => {
        setEditingBundle(null);
        setFormData({
            name: '',
            code: '',
            description: '',
            privileges: [],
            isActive: true,
        });
        setShowModal(true);
    };

    const handleEdit = (bundle: PrivilegeBundle) => {
        setEditingBundle(bundle);
        setFormData({
            name: bundle.name,
            code: bundle.code,
            description: bundle.description || '',
            privileges: bundle.privileges,
            isActive: bundle.isActive,
        });
        setShowModal(true);
    };

    const toggleAction = (resource: string, action: string) => {
        const existingPriv = formData.privileges.find(p => p.resource === resource);

        if (existingPriv) {
            if (existingPriv.actions.includes(action)) {
                // Remove action
                const updatedActions = existingPriv.actions.filter(a => a !== action);
                if (updatedActions.length === 0) {
                    // Remove entire privilege if no actions left
                    setFormData({
                        ...formData,
                        privileges: formData.privileges.filter(p => p.resource !== resource)
                    });
                } else {
                    setFormData({
                        ...formData,
                        privileges: formData.privileges.map(p =>
                            p.resource === resource ? { ...p, actions: updatedActions } : p
                        )
                    });
                }
            } else {
                // Add action
                setFormData({
                    ...formData,
                    privileges: formData.privileges.map(p =>
                        p.resource === resource ? { ...p, actions: [...p.actions, action] } : p
                    )
                });
            }
        } else {
            // Create new privilege
            setFormData({
                ...formData,
                privileges: [...formData.privileges, { resource, actions: [action] }]
            });
        }
    };

    const hasAction = (resource: string, action: string): boolean => {
        const priv = formData.privileges.find(p => p.resource === resource);
        return priv ? priv.actions.includes(action) : false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingBundle
                ? `/api/admin/pms/privilege-bundles/${editingBundle._id}`
                : '/api/admin/pms/privilege-bundles';

            const response = await fetch(url, {
                method: editingBundle ? 'PUT' : 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save');
            }

            setShowModal(false);
            fetchBundles();
        } catch (err: any) {
            alert(err.message || 'Failed to save privilege bundle');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this privilege bundle?')) return;

        try {
            const response = await fetch(`/api/admin/pms/privilege-bundles/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }

            fetchBundles();
        } catch (err: any) {
            alert(err.message || 'Failed to delete bundle');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Privilege Bundle Manager</h1>
                    <nav className="text-sm text-gray-500 mt-1">
                        <Link to="/admin/pms" className="hover:text-blue-600">PMS Dashboard</Link> / Privilege Bundles
                    </nav>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Create Bundle
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Privileges</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bundles.map((bundle) => (
                                <tr key={bundle._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{bundle.name}</div>
                                        <div className="text-sm text-gray-500">{bundle.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{bundle.code}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {bundle.privileges.length} resource(s)
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bundle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {bundle.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(bundle)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(bundle._id)}
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {editingBundle ? 'Edit Privilege Bundle' : 'Create Privilege Bundle'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4 mb-6">
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
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3">Privilege Matrix</h3>
                                <div className="border rounded overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                                                {resources[0]?.actions.map(action => (
                                                    <th key={action} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                                        {action}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {resources.map((resource) => (
                                                <tr key={resource.resource} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                        {resource.displayName}
                                                        <div className="text-xs text-gray-500">{resource.category}</div>
                                                    </td>
                                                    {resource.actions.map(action => (
                                                        <td key={action} className="px-4 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={hasAction(resource.resource, action)}
                                                                onChange={() => toggleAction(resource.resource, action)}
                                                                className="h-4 w-4 text-blue-600 rounded"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mb-6">
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

                            <div className="flex justify-end space-x-3">
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
                                    {editingBundle ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrivilegeBundleManager;
