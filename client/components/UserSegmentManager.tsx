import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Users, Save, X, Star, ShieldCheck, Lock, Check, Shield,
  Building, ShoppingBag, UserPlus, Briefcase, GraduationCap, Heart,
  Truck, Globe, DollarSign, Award, Crown, Gem, Flame, Rocket, Lightbulb
} from 'lucide-react';
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
  icon?: string;        // stores Lucide icon name (e.g., "Users")
  color?: string;
}

// Available Lucide icons for selection
const AVAILABLE_ICONS = [
  'Users', 'Building', 'ShoppingBag', 'Star', 'Shield', 'Lock', 'Check',
  'UserPlus', 'Briefcase', 'GraduationCap', 'Heart', 'Truck', 'Globe',
  'DollarSign', 'Award', 'Crown', 'Gem', 'Flame', 'Rocket', 'Lightbulb'
];

// Map icon names to their Lucide components
const iconComponents: Record<string, React.ElementType> = {
  Users, Building, ShoppingBag, Star, Shield, Lock, Check,
  UserPlus, Briefcase, GraduationCap, Heart, Truck, Globe,
  DollarSign, Award, Crown, Gem, Flame, Rocket, Lightbulb
};

const COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

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
    icon: 'Users',       // default Lucide icon
    color: '#3B82F6',
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
      toast.error('Failed to load user segments');
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
      toast.error('Failed to load signup forms');
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
        toast.success(editingSegment ? 'User segment updated successfully!' : 'User segment created successfully!');
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
        throw new Error('Delete failed');
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
      icon: segment.icon || 'Users',
      color: segment.color || '#3B82F6',
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
      icon: 'Users',
      color: '#3B82F6',
    });
    setEditingSegment(null);
  };

  // Helper to render icon from stored name (fallback to Users)
  const renderIcon = (iconName: string | undefined, size: number = 24, color?: string) => {
    const IconComponent = iconName && iconComponents[iconName] ? iconComponents[iconName] : Users;
    return <IconComponent size={size} style={{ color }} />;
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
              className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-purple-300 transition-colors relative overflow-hidden"
              style={{ borderLeftColor: segment.color || '#3B82F6', borderLeftWidth: '4px' }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">
                      {renderIcon(segment.icon, 24, segment.color)}
                    </span>
                    {segment.name}
                    {segment.isDefault && (
                      <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono mt-1">{segment.code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${segment.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {segment.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Description */}
              {segment.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {segment.description}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {segment.isDefault && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium flex items-center gap-1">
                    <Star size={12} /> Default
                  </span>
                )}
                {segment.isSystem && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium flex items-center gap-1">
                    <ShieldCheck size={12} /> System
                  </span>
                )}
                {segment.isPubliclyVisible && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium flex items-center gap-1">
                    <Users size={12} /> Public
                  </span>
                )}
                {segment.requiresApproval && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium flex items-center gap-1">
                    <Lock size={12} /> Approval
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSegment ? 'Edit User Segment' : 'Create User Segment'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segment Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Retail"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Segment Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., RETAIL"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Brief description of this user segment..."
                  rows={3}
                />
              </div>

              {/* Visual Identity */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Visual Identity</h3>

                {/* Icon Selector (Lucide icons) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                  <div className="grid grid-cols-10 gap-2 mb-2">
                    {AVAILABLE_ICONS.map((iconName) => {
                      const IconComponent = iconComponents[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: iconName })}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                            formData.icon === iconName
                              ? 'bg-purple-100 ring-2 ring-purple-500 scale-110'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent size={20} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500">Select an icon from the Lucide library</p>
                </div>

                {/* Color Palette */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Brand</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-200'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {formData.color === color && <Check className="w-4 h-4 text-white mx-auto" />}
                      </button>
                    ))}
                    <div className="relative ml-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-8 h-8 rounded-full overflow-hidden border-none p-0 cursor-pointer"
                        title="Custom Color"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Configuration</h3>

                {/* Signup Form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signup Form</label>
                  <select
                    value={formData.signupForm}
                    onChange={(e) => setFormData({ ...formData, signupForm: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 form-select"
                  >
                    <option value="">No form assigned</option>
                    {forms.map((form) => (
                      <option key={form._id} value={form._id}>
                        {form.name} ({form.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Star size={14} className="text-yellow-500" /> Default Segment
                      </span>
                      <span className="block text-xs text-gray-500">Auto-assign new users to this segment</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-gray-900 flex items-center gap-1">
                        <ShieldCheck size={14} className="text-blue-500" /> Admin Approval
                      </span>
                      <span className="block text-xs text-gray-500">Review required before activation</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isPubliclyVisible}
                      onChange={(e) => setFormData({ ...formData, isPubliclyVisible: e.target.checked })}
                      className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Users size={14} className="text-green-500" /> Publicly Visible
                      </span>
                      <span className="block text-xs text-gray-500">Show on public signup page</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="block text-sm font-medium text-gray-900">Active</span>
                      <span className="block text-xs text-gray-500">Enable this segment</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Segment
                    </>
                  )}
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