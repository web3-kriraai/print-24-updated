import React, { useState, useEffect } from "react";
import {
    Edit,
    Trash2,
    Plus,
    Loader,
    Check,
    X,
    Users,
    Building2,
    Search,
    AlertCircle,
    Power
} from "lucide-react";
import { toast } from "react-hot-toast";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import { motion, AnimatePresence } from "framer-motion";

interface ManageDepartmentsProps {
    setError: (error: string | null) => void;
    setSuccess: (success: string | null) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

const ManageDepartments: React.FC<ManageDepartmentsProps> = ({
    setError,
    setSuccess,
    loading,
    setLoading
}) => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);

    // Form State
    const [departmentForm, setDepartmentForm] = useState({
        name: "",
        description: "",
        isEnabled: true,
        operators: [] as string[],
    });
    const [formErrors, setFormErrors] = useState<{ name?: string }>({});

    // Dependencies
    const [availableOperators, setAvailableOperators] = useState<any[]>([]);

    useEffect(() => {
        fetchDepartments();
        fetchOperators();
    }, []);

    const fetchOperators = async () => {
        try {
            // Fetch employees and admins potentially
            const response = await fetch(`${API_BASE_URL}/admin/employees`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setAvailableOperators(data.data || data || []);
            }
        } catch (err) {
            console.error("Error fetching operators:", err);
        }
    };

    const fetchDepartments = async () => {
        setLoadingDepartments(true);
        try {
            const response = await fetch(`${API_BASE_URL}/departments`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setDepartments(data.data || data || []);
            }
        } catch (err) {
            console.error("Error fetching departments:", err);
        } finally {
            setLoadingDepartments(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setFormErrors({});

        if (!departmentForm.name.trim()) {
            setFormErrors({ name: "Department Name is required" });
            setLoading(false);
            return;
        }

        try {
            const url = editingDepartmentId
                ? `${API_BASE_URL}/departments/${editingDepartmentId}`
                : `${API_BASE_URL}/departments`;

            const method = editingDepartmentId ? "PUT" : "POST";

            const payload = {
                name: departmentForm.name,
                description: departmentForm.description,
                isEnabled: departmentForm.isEnabled,
                operators: departmentForm.operators
            };

            const response = await fetch(url, {
                method,
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Failed to save department");
            }

            setSuccess(editingDepartmentId ? "Department updated successfully" : "Department created successfully");
            toast.success(editingDepartmentId ? "Department updated" : "Department created");

            // Reset
            setDepartmentForm({
                name: "",
                description: "",
                isEnabled: true,
                operators: [],
            });
            setEditingDepartmentId(null);
            fetchDepartments();
        } catch (err) {
            console.error("Error saving department:", err);
            setError(err instanceof Error ? err.message : "Failed to save department");
            toast.error(err instanceof Error ? err.message : "Failed to save department");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (dept: any) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setDepartmentForm({
            name: dept.name,
            description: dept.description || "",
            isEnabled: dept.isEnabled,
            operators: dept.operators ? dept.operators.map((op: any) => typeof op === 'object' ? op._id : op) : [],
        });
        setEditingDepartmentId(dept._id);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this department?")) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || "Failed to delete department");
            }

            setSuccess("Department deleted successfully");
            toast.success("Department deleted");
            fetchDepartments();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete department");
            toast.error(err instanceof Error ? err.message : "Failed to delete department");
        } finally {
            setLoading(false);
        }
    };

    const toggleOperator = (operatorId: string) => {
        setDepartmentForm(prev => {
            const current = prev.operators;
            if (current.includes(operatorId)) {
                return { ...prev, operators: current.filter(id => id !== operatorId) };
            } else {
                return { ...prev, operators: [...current, operatorId] };
            }
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <h1 className="text-2xl font-bold text-gray-800">Create Department</h1>
            </motion.div>

            {/* Create/Edit Form */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Department Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={departmentForm.name}
                            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                            placeholder="e.g., Prepress, Digital Printing"
                            className={`w-full px-4 py-3 rounded-lg border ${formErrors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-gray-200'} focus:outline-none focus:ring-4 transition-all`}
                        />
                        {formErrors.name && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle size={14} /> {formErrors.name}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Description
                        </label>
                        <textarea
                            value={departmentForm.description}
                            onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                            placeholder="Brief description of department responsibilities"
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all resize-none"
                        />
                    </div>

                    {/* Enabled Toggle */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={departmentForm.isEnabled}
                            onChange={(e) => setDepartmentForm({ ...departmentForm, isEnabled: e.target.checked })}
                            id="dept-enabled"
                            className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                        <label htmlFor="dept-enabled" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                            Enabled
                        </label>
                    </div>

                    {/* Operators */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-semibold text-gray-700">
                                Assign Operators (Optional)
                            </label>

                            {/* NOTE: If you want a "Create Employee" button here like in the screenshot, it can link to employee creation */}
                            {/* <button type="button" className="text-sm text-white bg-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-700 transition">
                                <Users size={14} className="inline mr-1" /> Create Employee
                            </button> */}
                        </div>
                        <p className="text-xs text-gray-500">
                            Select employees who can perform actions for this department. Only employees can be assigned. Leave empty to allow all authenticated users (if applicable).
                        </p>

                        <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-gray-50">
                            {availableOperators.length === 0 ? (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    No employees found. <br />
                                    <span className="text-xs">Go to User Management to add employees.</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {availableOperators.map(op => (
                                        <div
                                            key={op._id}
                                            className={`flex items-center p-3 hover:bg-gray-100 transition-colors cursor-pointer ${departmentForm.operators.includes(op._id) ? 'bg-blue-50' : ''}`}
                                            onClick={() => toggleOperator(op._id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={departmentForm.operators.includes(op._id)}
                                                readOnly
                                                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 mr-3 pointer-events-none"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{op.name}</p>
                                                <p className="text-xs text-gray-500">{op.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                        {editingDepartmentId ? "Update Department" : "Create Department"}
                    </button>

                    {editingDepartmentId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingDepartmentId(null);
                                setDepartmentForm({ name: "", description: "", isEnabled: true, operators: [] });
                            }}
                            className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            Cancel Edit
                        </button>
                    )}
                </form>
            </motion.div>

            {/* List Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        All Departments ({departments.length})
                    </h2>
                    <button
                        onClick={fetchDepartments}
                        className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        title="Refresh List"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                    </button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4 w-1/3">Description</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-left">Operators</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingDepartments ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader className="animate-spin text-gray-400" size={24} />
                                                Loading departments...
                                            </div>
                                        </td>
                                    </tr>
                                ) : departments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No departments found. Create one above.
                                        </td>
                                    </tr>
                                ) : (
                                    departments.map((dept) => (
                                        <tr key={dept._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-800">{dept.name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-gray-600 text-sm line-clamp-2" title={dept.description}>
                                                    {dept.description || "-"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${dept.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {dept.isEnabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {dept.operators?.length || 0} operator(s)
                                                    </span>
                                                    {dept.operators?.length > 0 && (
                                                        <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                                            {dept.operators.map((op: any) => typeof op === 'object' ? op.name : 'User').join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100">
                                                    <button
                                                        onClick={() => handleEdit(dept)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(dept._id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageDepartments;
