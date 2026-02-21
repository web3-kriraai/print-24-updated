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
    X,
    Plus, // Added from instruction
    ShieldAlert, // Added from instruction
    ShieldCheck // Added from instruction
} from "lucide-react";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchableDropdown } from '../../../../components/SearchableDropdown';
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
    const [actionMenu, setActionMenu] = useState<string | null>(null);

    // Create User Overlay
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "user",
    });

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
            const response = await fetch(`${API_BASE_URL}/admin/update-user-role`, {
                method: "PUT",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, role: newRole }),
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



    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let endpoint = `${API_BASE_URL}/auth/register`;
            if (createUserForm.role === 'emp') {
                endpoint = `${API_BASE_URL}/admin/create-employee`;
            } else if (createUserForm.role === 'admin') {
                endpoint = `${API_BASE_URL}/admin/create-admin`;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify(createUserForm),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to create user");
            }

            const newUser = await response.json();

            // If the register endpoint returns a token/user structure, extract user
            // Adjust based on your actual auth/register response structure
            const userData = newUser.user || newUser;

            toast.success("User created successfully");
            setShowCreateUserModal(false);
            setCreateUserForm({ name: "", email: "", password: "", role: "user" });
            fetchUsers();
        } catch (err) {
            console.error("Error creating user:", err);
            toast.error(err instanceof Error ? err.message : "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    const roleColors: Record<string, string> = {
        admin: "bg-purple-100 text-purple-800",
        user: "bg-blue-100 text-blue-800",
        emp: "bg-amber-100 text-amber-800"
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
                    </div>

                    <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium hover:bg-indigo-700"
                    >
                        <UserPlus size={18} />
                        Create User
                    </button>

                    <button
                        onClick={() => fetchUsers()}
                        className="bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
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
                        <div className="w-48">
                            <SearchableDropdown
                                label="All Roles"
                                value={selectedRole}
                                onChange={(val) => setSelectedRole(val as string)}
                                options={[
                                    { value: 'all', label: 'All Roles' },
                                    { value: 'admin', label: 'Administrator' },
                                    { value: 'user', label: 'Customer' },
                                    { value: 'emp', label: 'Employee' }
                                ]}
                                className="w-full"
                                enableSearch={false}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* Bulk actions removed */}
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
                    <div className="min-w-full">
                        {/* Desktop Header - Only visible on LG screens */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-4">User</div>
                            <div className="col-span-3">Role</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Joined</div>
                            <div className="col-span-1 text-right">Actions</div>
                        </div>

                        {/* Users List/Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0 p-4 lg:p-0">
                            {filteredUsers.map((user) => (
                                <div
                                    key={user._id}
                                    className="relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 lg:rounded-none lg:border-0 lg:border-b lg:shadow-none lg:hover:shadow-none lg:hover:bg-gray-50/50"
                                >
                                    <div className="p-4 lg:px-6 lg:py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                                        {/* User Info */}
                                        <div className="lg:col-span-4 flex items-center gap-4">
                                            <div className="relative flex-shrink-0">
                                                <div className="h-10 w-10 lg:h-11 lg:w-11 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-white shadow-sm ring-1 ring-gray-100">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                {user.role === 'admin' && (
                                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-white ring-1 ring-white"></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
                                                <div className="text-xs lg:text-sm text-gray-500 flex items-center gap-1.5 truncate mt-0.5">
                                                    <Mail size={12} className="flex-shrink-0 text-gray-400" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Role Select */}
                                        <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-2">
                                            <span className="lg:hidden text-sm font-medium text-gray-500">Role</span>
                                            <div className="relative w-32 lg:w-40 group">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                    className={`appearance-none w-full px-3 py-1.5 text-xs font-medium rounded-full border ${roleColors[user.role] || 'bg-gray-100 text-gray-800'} border-transparent hover:border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-all pr-8 shadow-sm`}
                                                >
                                                    <option value="admin">Administrator</option>
                                                    <option value="user">Customer</option>
                                                    <option value="emp">Employee</option>
                                                </select>
                                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" size={12} />
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                                            <span className="lg:hidden text-sm font-medium text-gray-500">Status</span>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm border border-transparent ${user.status === 'suspended' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {user.status === 'suspended' ? (
                                                    <>
                                                        <X size={12} strokeWidth={2.5} />
                                                        Suspended
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check size={12} strokeWidth={2.5} />
                                                        Active
                                                    </>
                                                )}
                                            </span>
                                        </div>

                                        {/* Joined Date */}
                                        <div className="lg:col-span-2 flex items-center justify-between lg:justify-start gap-2">
                                            <span className="lg:hidden text-sm font-medium text-gray-500">Joined</span>
                                            <div className="text-right lg:text-left">
                                                <div className="text-sm font-medium text-gray-700">
                                                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="lg:col-span-1 flex items-center justify-end border-t lg:border-t-0 pt-3 lg:pt-0 mt-2 lg:mt-0 gap-1">
                                            <button
                                                onClick={() => toast.success(`Edit ${user.name}`)}
                                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                                title="Edit User"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user._id)}
                                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActionMenu(actionMenu === user._id ? null : user._id)}
                                                    className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {actionMenu === user._id && (
                                                    <div className="absolute right-0 bottom-full mb-1 lg:bottom-auto lg:top-full lg:mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-xl z-20 overflow-hidden ring-1 ring-black ring-opacity-5">
                                                        <div className="py-1">
                                                            <button className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2 font-medium">
                                                                <ShieldAlert size={14} />
                                                                Suspend Account
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="text-center text-sm text-gray-500 py-4">
                <p>Showing {filteredUsers.length} of {users.length} users • Last updated: Just now</p>
            </div>

            {/* Create User Modal */}
            <AnimatePresence>
                {showCreateUserModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">Create New User</h3>
                                <button
                                    onClick={() => setShowCreateUserModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createUserForm.name}
                                        onChange={e => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={createUserForm.email}
                                        onChange={e => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={createUserForm.password}
                                        onChange={e => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <SearchableDropdown
                                            label="User"
                                            value={createUserForm.role}
                                            onChange={(val) => setCreateUserForm({ ...createUserForm, role: val as string })}
                                            options={[
                                                { value: 'user', label: 'User' },
                                                { value: 'admin', label: 'Admin' },
                                                { value: 'emp', label: 'Employee' }
                                            ]}
                                            className="w-full"
                                            enableSearch={false}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateUserModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-70 flex justify-center items-center gap-2"
                                    >
                                        {loading ? <Loader size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                        Create User
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default ManageUsers;