import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Save, X, Star, ShieldCheck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface SignupForm {
    _id: string;
    name: string;
    code: string;
}

interface UserSegment {
    _id: string;
    name: string;
    code: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    isSystem?: boolean;
    signupForm?: SignupForm;
    requiresApproval?: boolean;
    isPubliclyVisible?: boolean;
    icon?: string;
    color?: string;
}

/**
 * USER SEGMENT MANAGER
 * 
 * Manage user segments for segment-based pricing
 * Features:
 * - Create/edit/delete user segments
 * - Set default segment
 * - Activate/deactivate segments
 * - Assign users to segments
 */
const UserSegmentManager: React.FC = () => {
    const [segments, setSegments] = useState<UserSegment[]>([]);
    const [forms, setForms] = useState<SignupForm[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingSegment, setEditingSegment] = useState<UserSegment | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        isDefault: false,
        isActive: true,
        signupForm: '',
        requiresApproval: false,
        isPubliclyVisible: true,
        icon: '',
        color: '',
    });

    // Fetch user segments
    useEffect(() => {
        fetchSegments();
        fetchForms();
    }, []);

    const fetchSegments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/pricing/user-segments', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSegments(data.segments || []);
            }
        } catch (error) {
            console.error('Failed to fetch user segments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchForms = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/forms', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setForms(data.forms || []);
            }
        } catch (error) {
            console.error('Failed to fetch forms:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const url = editingSegment
                ? `/api/admin/pricing/user-segments/${editingSegment._id}`
                : '/api/admin/pricing/user-segments';

            const response = await fetch(url, {
                method: editingSegment ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success(editingSegment ? 'User segment updated!' : 'User segment created!');
                setShowModal(false);
                resetForm();
                fetchSegments();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to save user segment');
            }
        } catch (error) {
            console.error('Error saving user segment:', error);
            toast.error('Failed to save user segment');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user segment?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/pricing/user-segments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                toast.success('User segment deleted successfully!');
                fetchSegments();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Failed to delete user segment');
            }
        } catch (error) {
            console.error('Error deleting user segment:', error);
            toast.error('Failed to delete user segment');
        }
    };

    const handleEdit = (segment: UserSegment) => {
        setEditingSegment(segment);
        setFormData({
            name: segment.name,
            code: segment.code,
            description: segment.description || '',
            isDefault: segment.isDefault,
            isActive: segment.isActive,
            signupForm: segment.signupForm?._id || '',
            requiresApproval: segment.requiresApproval || false,
            isPubliclyVisible: segment.isPubliclyVisible !== undefined ? segment.isPubliclyVisible : true,
            icon: segment.icon || '',
            color: segment.color || '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            description: '',
            isDefault: false,
            isActive: true,
            signupForm: '',
            requiresApproval: false,
            isPubliclyVisible: true,
            icon: '',
            color: '',
        });
        setEditingSegment(null);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="text-purple-600" />
                    User Segment Manager
                </h1>
                <p className="text-gray-600 mt-2">
                    Manage user segments for segment-based pricing (Retail, Corporate, VIP, etc.)
                </p>
            </div>

            {/* Create Button */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create User Segment
                </button>
            </div>

            {/* Segments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                        Loading...
                    </div>
                ) : segments.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                        No user segments found. Create one to get started.
                    </div>
                ) : (
                    segments.map((segment) => (
                        <div
                            key={segment._id}
                            className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-purple-300 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        {segment.name}
                                        {segment.isDefault && (
                                            <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-600 font-mono">{segment.code}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${segment.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {segment.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            {/* Description */}
                            {segment.description && (
                                <p className="text-sm text-gray-600 mb-4">
                                    {segment.description}
                                </p>
                            )}

                            {/* Badges */}
                            <div className="flex gap-2 mb-4">
                                {segment.isDefault && (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                                        <Star size={12} /> Default
                                    </span>
                                )}
                                {segment.isSystem && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center gap-1">
                                        <ShieldCheck size={12} /> System Protected
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t">
                                <button
                                    onClick={() => handleEdit(segment)}
                                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={16} />
                                    Edit
                                </button>
                                {segment.isSystem ? (
                                    <button
                                        disabled
                                        className="flex-1 bg-gray-100 text-gray-400 px-3 py-2 rounded cursor-not-allowed flex items-center justify-center gap-2"
                                        title="System segments cannot be deleted"
                                    >
                                        <Lock size={16} />
                                        Locked
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleDelete(segment._id)}
                                        className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100 flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingSegment ? 'Edit User Segment' : 'Create User Segment'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Segment Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., Retail, Corporate, VIP"
                                    required
                                />
                            </div>

                            {/* Code */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Segment Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., RETAIL, CORPORATE, VIP"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Unique identifier for this segment (uppercase)
                                </p>
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="Optional description"
                                    rows={3}
                                />
                            </div>

                            {/* Default Segment */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium flex items-center gap-1">
                                        <Star size={16} className="text-yellow-500" />
                                        Set as default segment
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                    New users will be assigned to this segment by default
                                </p>
                            </div>

                            {/* Signup Form */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Signup Form</label>
                                <select
                                    value={formData.signupForm}
                                    onChange={(e) => setFormData({ ...formData, signupForm: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">No form assigned</option>
                                    {forms.map((form) => (
                                        <option key={form._id} value={form._id}>
                                            {form.name} ({form.code})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Form users will fill when applying for this segment
                                </p>
                            </div>

                            {/* Requires Approval */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresApproval}
                                        onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium">Requires Admin Approval</span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                    Applications must be reviewed by admin before approval
                                </p>
                            </div>

                            {/* Publicly Visible */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPubliclyVisible}
                                        onChange={(e) => setFormData({ ...formData, isPubliclyVisible: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium">Publicly Visible</span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                    Show this segment on public signup page
                                </p>
                            </div>

                            {/* Icon & Color */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Icon (emoji)</label>
                                    <input
                                        type="text"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="e.g., 👤 💼 🏢"
                                        maxLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Color (hex)</label>
                                    <input
                                        type="text"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="e.g., #3B82F6"
                                    />
                                </div>
                            </div>

                            {/* Active Status */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="rounded"
                                    />
                                    <span className="text-sm font-medium">Active</span>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserSegmentManager;
