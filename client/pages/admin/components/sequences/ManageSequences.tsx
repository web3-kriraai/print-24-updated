import React, { useState, useEffect } from "react";
import {
    List,
    Edit,
    Trash2,
    Plus,
    Loader,
    X,
    Building2,
    Check,
    AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewFilterDropdown } from "../../../../components/ReviewFilterDropdown";
// Select component import if needed, assuming standard select for now or ReviewFilterDropdown

interface ManageSequencesProps {
    setError: (error: string | null) => void;
    setSuccess: (success: string | null) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

const ManageSequences: React.FC<ManageSequencesProps> = ({
    setError,
    setSuccess,
    loading,
    setLoading
}) => {
    const [sequences, setSequences] = useState<any[]>([]);
    const [loadingSequences, setLoadingSequences] = useState(false);
    const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
    const [sequenceForm, setSequenceForm] = useState({
        name: "",
        categoryId: "",
        subCategoryId: "",
        attributeTypeIds: [] as string[],
        selectedDepartments: [] as string[], // Ordered array of department IDs
    });
    const [sequenceFormErrors, setSequenceFormErrors] = useState<{
        name?: string;
        category?: string;
        departments?: string;
    }>({});

    // Dependencies
    const [departments, setDepartments] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [attributeTypes, setAttributeTypes] = useState<any[]>([]);

    // Create Department Modal State (Quick Add)
    const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
    const [createDepartmentModalForm, setCreateDepartmentModalForm] = useState({
        name: "",
        description: "",
        isEnabled: true,
        operators: [] as string[],
    });

    useEffect(() => {
        fetchSequences();
        fetchDependencies();
    }, []);

    const fetchDependencies = async () => {
        try {
            const [deptRes, catRes, subCatRes, attrRes] = await Promise.all([
                fetch(`${API_BASE_URL}/departments`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/categories`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/subcategories`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/admin/attribute-types`, { headers: getAuthHeaders() })
            ]);

            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data.data || data || []);
            }
            if (catRes.ok) setCategories(await catRes.json());
            if (subCatRes.ok) setSubCategories(await subCatRes.json());
            if (attrRes.ok) setAttributeTypes(await attrRes.json());

        } catch (err) {
            console.error("Error fetching dependencies for sequences:", err);
        }
    };

    const fetchSequences = async () => {
        setLoadingSequences(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/sequences`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setSequences(data.data || data || []);
            }
        } catch (err) {
            console.error("Error fetching sequences:", err);
        } finally {
            setLoadingSequences(false);
        }
    };

    const handleSequenceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setSequenceFormErrors({});

        try {
            // Validation
            const errors: any = {};
            if (!sequenceForm.name.trim()) errors.name = "Sequence name is required";
            // if (!sequenceForm.categoryId && !sequenceForm.subCategoryId) errors.category = "Category or Subcategory is required"; // Optional depending on business logic
            if (sequenceForm.selectedDepartments.length === 0) errors.departments = "At least one department is required";

            if (Object.keys(errors).length > 0) {
                setSequenceFormErrors(errors);
                setLoading(false);
                // Scroll to error
                const firstErrorId = errors.name ? "sequence-name" : errors.departments ? "sequence-departments" : "sequence-form";
                const element = document.getElementById(firstErrorId);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const url = editingSequenceId
                ? `${API_BASE_URL}/admin/sequences/${editingSequenceId}`
                : `${API_BASE_URL}/admin/sequences`;
            const method = editingSequenceId ? "PUT" : "POST";

            const payload = {
                name: sequenceForm.name,
                categoryId: sequenceForm.categoryId || null,
                subCategoryId: sequenceForm.subCategoryId || null,
                attributeTypeIds: sequenceForm.attributeTypeIds,
                departments: sequenceForm.selectedDepartments.map((deptId, index) => ({
                    department: deptId,
                    order: index + 1
                }))
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
                throw new Error(data.message || data.error || `Failed to ${editingSequenceId ? "update" : "create"} sequence`);
            }

            setSuccess(editingSequenceId ? "Sequence updated successfully" : "Sequence created successfully");
            toast.success(editingSequenceId ? "Sequence updated" : "Sequence created");

            // Reset form
            setSequenceForm({
                name: "",
                categoryId: "",
                subCategoryId: "",
                attributeTypeIds: [],
                selectedDepartments: [],
            });
            setEditingSequenceId(null);
            fetchSequences();
        } catch (err) {
            console.error("Error saving sequence:", err);
            setError(err instanceof Error ? err.message : "Failed to save sequence");
            toast.error(err instanceof Error ? err.message : "Failed to save sequence");
        } finally {
            setLoading(false);
        }
    };

    const handleEditSequence = (sequenceId: string) => {
        const sequence = sequences.find((s) => s._id === sequenceId);
        if (sequence) {
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Map departments back to array of IDs in order
            const sortedDepts = sequence.departments
                ? [...sequence.departments].sort((a, b) => a.order - b.order)
                : [];

            const deptIds = sortedDepts.map(d =>
                typeof d.department === 'object' ? d.department._id : d.department
            );

            setSequenceForm({
                name: sequence.name,
                categoryId: sequence.category ? (typeof sequence.category === 'object' ? sequence.category._id : sequence.category) : "",
                subCategoryId: sequence.subcategory ? (typeof sequence.subcategory === 'object' ? sequence.subcategory._id : sequence.subcategory) : "",
                attributeTypeIds: sequence.attributeTypes ? sequence.attributeTypes.map((a: any) => typeof a === 'object' ? a._id : a) : [],
                selectedDepartments: deptIds,
            });
            setEditingSequenceId(sequenceId);
        }
    };

    const handleDeleteSequence = async (sequenceId: string) => {
        if (!window.confirm("Are you sure you want to delete this sequence?")) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/sequences/${sequenceId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete sequence");
            }

            setSuccess("Sequence deleted successfully");
            toast.success("Sequence deleted");
            fetchSequences();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete sequence");
            toast.error(err instanceof Error ? err.message : "Failed to delete sequence");
        } finally {
            setLoading(false);
        }
    };

    const handleDepartmentToggle = (deptId: string) => {
        setSequenceForm(prev => {
            const exists = prev.selectedDepartments.includes(deptId);
            if (exists) {
                return {
                    ...prev,
                    selectedDepartments: prev.selectedDepartments.filter(id => id !== deptId)
                };
            } else {
                return {
                    ...prev,
                    selectedDepartments: [...prev.selectedDepartments, deptId]
                };
            }
        });
    };

    const handleCreateDepartmentFromModal = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/departments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({
                    name: createDepartmentModalForm.name,
                    description: createDepartmentModalForm.description,
                    isEnabled: createDepartmentModalForm.isEnabled,
                    operators: createDepartmentModalForm.operators
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to create department");
            }

            const data = await response.json();
            const newDeptId = data.data?._id || data.data?.id || data._id || data.id;

            toast.success("Department created");
            setCreateDepartmentModalForm({ name: "", description: "", isEnabled: true, operators: [] });
            setShowCreateDepartmentModal(false);

            // Refresh departments
            const deptRes = await fetch(`${API_BASE_URL}/departments`, { headers: getAuthHeaders() });
            if (deptRes.ok) {
                const updatedDepts = await deptRes.json();
                setDepartments(updatedDepts.data || updatedDepts || []);
            }

            // Add to sequence
            if (newDeptId) {
                setSequenceForm(prev => ({
                    ...prev,
                    selectedDepartments: [...prev.selectedDepartments, newDeptId]
                }));
            }

        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create department");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Form Section */}
            <div className="bg-white p-6 rounded-lg border border-cream-200">
                <h2 className="text-xl font-bold text-cream-900 mb-6">
                    {editingSequenceId ? "Edit Sequence" : "Create New Sequence"}
                </h2>

                <form onSubmit={handleSequenceSubmit} className="space-y-6" id="sequence-form">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-cream-900 mb-2">
                            Sequence Name *
                        </label>
                        <input
                            id="sequence-name"
                            type="text"
                            value={sequenceForm.name}
                            onChange={(e) => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${sequenceFormErrors.name ? "border-red-300 bg-red-50" : "border-cream-300"
                                }`}
                            placeholder="e.g., Standard Card Printing"
                        />
                        {sequenceFormErrors.name && (
                            <p className="text-xs text-red-600 mt-1">{sequenceFormErrors.name}</p>
                        )}
                    </div>

                    {/* Category/Subcategory */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-cream-900 mb-2">Category</label>
                            <select
                                value={sequenceForm.categoryId}
                                onChange={(e) => setSequenceForm({ ...sequenceForm, categoryId: e.target.value, subCategoryId: "" })}
                                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500"
                            >
                                <option value="">Select Category (Optional)</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-cream-900 mb-2">Subcategory</label>
                            <select
                                value={sequenceForm.subCategoryId}
                                onChange={(e) => setSequenceForm({ ...sequenceForm, subCategoryId: e.target.value })}
                                className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500"
                            >
                                <option value="">Select Subcategory (Optional)</option>
                                {subCategories
                                    .filter(sub => !sequenceForm.categoryId || sub.parentCategory === sequenceForm.categoryId || (sub.parentCategory && sub.parentCategory._id === sequenceForm.categoryId))
                                    .map(sub => (
                                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Departments Selection */}
                    <div id="sequence-departments">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-cream-900">
                                Department Sequence *
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowCreateDepartmentModal(true)}
                                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                                <Plus size={14} /> Create Department
                            </button>
                        </div>
                        <p className="text-xs text-cream-600 mb-3">
                            Select departments in the order they should be processed.
                        </p>

                        {sequenceFormErrors.departments && (
                            <p className="text-xs text-red-600 mb-2">{sequenceFormErrors.departments}</p>
                        )}

                        <div className="border border-cream-200 rounded-lg p-4 bg-cream-50 max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {departments.map((dept, idx) => {
                                const isSelected = sequenceForm.selectedDepartments.includes(dept._id);
                                const index = sequenceForm.selectedDepartments.indexOf(dept._id);

                                return (
                                    <div
                                        key={dept._id}
                                        onClick={() => handleDepartmentToggle(dept._id)}
                                        className={`cursor-pointer p-3 rounded-lg border flex items-center justify-between transition-all ${isSelected
                                            ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                                            : "bg-white border-cream-200 hover:border-cream-300"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isSelected && (
                                                <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded-full text-xs font-bold">
                                                    {index + 1}
                                                </span>
                                            )}
                                            <span className={`text-sm ${isSelected ? "font-semibold text-blue-900" : "text-cream-700"}`}>
                                                {dept.name}
                                            </span>
                                        </div>
                                        {isSelected && <Check size={16} className="text-blue-600" />}
                                    </div>
                                );
                            })}
                        </div>
                        {sequenceForm.selectedDepartments.length > 0 && (
                            <p className="text-xs text-blue-600 mt-2">
                                Current Order: {sequenceForm.selectedDepartments.map(id => departments.find(d => d._id === id)?.name).join(" → ")}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                        {editingSequenceId ? "Update Sequence" : "Create Sequence"}
                    </button>
                </form>
            </div>

            {/* List Section */}
            <div className="border-t border-cream-200 pt-6">
                <h2 className="text-xl font-bold text-cream-900 mb-4">Existing Sequences</h2>

                {loadingSequences ? (
                    <div className="flex justify-center p-8"><Loader className="animate-spin" size={32} /></div>
                ) : sequences.length === 0 ? (
                    <p className="text-center text-cream-600 py-8">No sequences found.</p>
                ) : (
                    <div className="grid gap-4">
                        {sequences.map(seq => (
                            <div key={seq._id} className="bg-white border border-cream-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-shadow">
                                <div>
                                    <h3 className="font-bold text-cream-900">{seq.name}</h3>
                                    <div className="text-sm text-cream-600 mt-1 flex flex-wrap gap-2">
                                        {seq.category && <span className="bg-cream-100 px-2 py-0.5 rounded text-xs">{typeof seq.category === 'object' ? seq.category.name : 'Category'}</span>}
                                        {seq.subcategory && <span className="bg-cream-100 px-2 py-0.5 rounded text-xs">{typeof seq.subcategory === 'object' ? seq.subcategory.name : 'Subcategory'}</span>}
                                    </div>
                                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                                        {seq.departments && seq.departments.sort((a: any, b: any) => a.order - b.order).map((d: any, i: number) => (
                                            <span key={i} className="text-xs flex items-center">
                                                <span className="font-medium">{typeof d.department === 'object' ? d.department.name : 'Dept'}</span>
                                                {i < seq.departments.length - 1 && <span className="mx-1 text-cream-400">→</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEditSequence(seq._id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                                    <button onClick={() => handleDeleteSequence(seq._id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Department Modal */}
            <AnimatePresence>
                {showCreateDepartmentModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-lg max-w-lg w-full p-6"
                        >
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-cream-200">
                                <h2 className="text-xl font-bold text-cream-900">Create Department</h2>
                                <button onClick={() => setShowCreateDepartmentModal(false)} className="p-2 hover:bg-cream-100 rounded-lg"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleCreateDepartmentFromModal} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createDepartmentModalForm.name}
                                        onChange={(e) => setCreateDepartmentModalForm({ ...createDepartmentModalForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg"
                                        placeholder="Department Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">Description</label>
                                    <textarea
                                        value={createDepartmentModalForm.description}
                                        onChange={(e) => setCreateDepartmentModalForm({ ...createDepartmentModalForm, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateDepartmentModal(false)} className="flex-1 px-4 py-2 border border-cream-300 rounded-lg">Cancel</button>
                                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-cream-900 text-white rounded-lg">{loading ? "Creating..." : "Create"}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageSequences;
