import React, { useState, useEffect } from "react";
import {
    UserPlus,
    Search,
    Edit,
    Trash2,
    Mail,
    Shield,
    AlertCircle,
    Loader,
    Users,
    UserCheck,
    MoreVertical,
    Filter,
    Download,
    ChevronDown,
    Check,
    X
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import toast from "react-hot-toast";

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    isEmployee?: boolean;
    status?: 'active' | 'suspended';
}

interface ManageUsersProps {
    setError: (error: string | null) => void;
}

const ManageUsers: React.FC<ManageUsersProps> = ({ setError }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState<string>("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [actionMenu, setActionMenu] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error("Error fetching users:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch users");
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user => {
        if (!user || !user.name || !user.email) return false;

        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = selectedRole === "all" || user.role === selectedRole;

        return matchesSearch && matchesRole;
    });

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
                method: "PATCH",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) throw new Error("Failed to update role");

            setUsers(users.map(user =>
                user._id === userId ? { ...user, role: newRole } : user
            ));
            toast.success("User role updated successfully");
        } catch (err) {
            toast.error("Failed to update user role");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!response.ok) throw new Error("Failed to delete user");

            setUsers(users.filter(user => user._id !== userId));
            toast.success("User deleted successfully");
        } catch (err) {
            toast.error("Failed to delete user");
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleBulkAction = (action: string) => {
        if (action === "delete") {
            if (confirm(`Delete ${selectedUsers.length} selected users?`)) {
                // Implement bulk delete
                toast.success(`${selectedUsers.length} users marked for deletion`);
                setSelectedUsers([]);
            }
        }
    };

    const roleColors: Record<string, string> = {
        admin: "bg-purple-100 text-purple-800",
        user: "bg-blue-100 text-blue-800",
        moderator: "bg-green-100 text-green-800",
        editor: "bg-amber-100 text-amber-800"
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <Shield className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                                User Management
                            </h1>
                            <p className="text-gray-500 mt-1">Manage and oversee all system users</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <button
                            onClick={() => toast.success("Coming soon!")}
                            className="relative bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                        >
                            <UserPlus size={18} />
                            Invite User
                        </button>
                    </div>

                    <button
                        onClick={() => fetchUsers()}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-2 text-sm font-medium hover:from-indigo-600 hover:to-purple-700"
                    >
                        <Users size={18} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
                            <Users className="text-indigo-600" size={24} />
                        </div>
                        <span className="text-sm text-gray-500">Total</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-1">{users.length}</h3>
                    <p className="text-gray-500 text-sm">Users in System</p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                            <Shield className="text-purple-600" size={24} />
                        </div>
                        <span className="text-sm text-gray-500">Admins</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-1">
                        {users.filter(u => u.role === 'admin').length}
                    </h3>
                    <p className="text-gray-500 text-sm">Administrators</p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                            <UserCheck className="text-blue-600" size={24} />
                        </div>
                        <span className="text-sm text-gray-500">Active</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-1">
                        {users.filter(u => u.status !== 'suspended').length}
                    </h3>
                    <p className="text-gray-500 text-sm">Active Users</p>
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl">
                            <Mail className="text-emerald-600" size={24} />
                        </div>
                        <span className="text-sm text-gray-500">Customers</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-1">
                        {users.filter(u => u.role === 'user').length}
                    </h3>
                    <p className="text-gray-500 text-sm">Regular Users</p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        {/* Role Filter */}
                        <div className="relative">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Administrator</option>
                                <option value="user">Customer</option>
                                <option value="moderator">Moderator</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {selectedUsers.length > 0 && (
                            <div className="flex items-center gap-3 mr-4">
                                <span className="text-sm text-gray-600">
                                    {selectedUsers.length} selected
                                </span>
                                <button
                                    onClick={() => handleBulkAction("delete")}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => toast.success("Exporting data...")}
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            User Directory
                            <span className="text-gray-500 font-normal ml-2">
                                ({filteredUsers.length} of {users.length} users)
                            </span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            Admin
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            User
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col justify-center items-center py-20">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                        </div>
                        <p className="mt-4 text-gray-600">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mb-4">
                            <Users size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            {searchTerm || selectedRole !== "all"
                                ? "Try adjusting your search or filter criteria"
                                : "Get started by inviting users to your platform"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.length === filteredUsers.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedUsers(filteredUsers.map(u => u._id));
                                                    } else {
                                                        setSelectedUsers([]);
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            User
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user._id)}
                                                    onChange={() => toggleUserSelection(user._id)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div className="flex items-center">
                                                    <div className="relative">
                                                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-white shadow-sm">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {user.role === 'admin' && (
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-white"></div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                                            {user.isEmployee && (
                                                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                                                    Employee
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <Mail size={14} />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="relative">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                    className={`appearance-none px-3 py-1.5 text-xs font-medium rounded-full border ${roleColors[user.role] || 'bg-gray-100 text-gray-800'} focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-all`}
                                                >
                                                    <option value="admin">Administrator</option>
                                                    <option value="user">Customer</option>
                                                    <option value="moderator">Moderator</option>
                                                    <option value="editor">Editor</option>
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                {user.status === 'suspended' ? (
                                                    <>
                                                        <X size={12} />
                                                        Suspended
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check size={12} />
                                                        Active
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">
                                                {new Date(user.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => toast.success(`Edit ${user.name}`)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActionMenu(actionMenu === user._id ? null : user._id)}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {actionMenu === user._id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                                                            <button className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2">
                                                                <Mail size={16} />
                                                                Send Email
                                                            </button>
                                                            <button className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2">
                                                                <AlertCircle size={16} />
                                                                View Activity
                                                            </button>
                                                            <div className="border-t border-gray-100">
                                                                <button className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2">
                                                                    <Trash2 size={16} />
                                                                    Suspend Account
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="text-center text-sm text-gray-500 py-4">
                <p>Showing {filteredUsers.length} of {users.length} users • Last updated: Just now</p>
            </div>
        </div>
    );
};

export default ManageUsers;