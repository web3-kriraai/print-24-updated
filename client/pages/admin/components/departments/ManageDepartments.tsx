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
    AlertCircle,
    ChevronRight,
    GripVertical,
    ArrowUpDown,
    Tag,
    Layers,
    Users,
    Settings,
    XCircle,
    Filter
} from "lucide-react";
import { toast } from "react-hot-toast";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import { motion, AnimatePresence } from "framer-motion";

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
        selectedDepartments: [] as string[],
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

    // Create Department Modal State
    const [showCreateDepartmentModal, setShowCreateDepartmentModal] = useState(false);
    const [createDepartmentModalForm, setCreateDepartmentModalForm] = useState({
        name: "",
        description: "",
        isEnabled: true,
        operators: [] as string[],
    });

    // Search and filter
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
    const [draggedDeptId, setDraggedDeptId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

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

    // Drag and drop handlers for department ordering
    const handleDragStart = (deptId: string) => {
        setDraggedDeptId(deptId);
        setIsDragging(true);
    };

    const handleDragOver = (e: React.DragEvent, deptId: string) => {
        e.preventDefault();
        if (!draggedDeptId || draggedDeptId === deptId) return;

        const draggedIndex = sequenceForm.selectedDepartments.indexOf(draggedDeptId);
        const targetIndex = sequenceForm.selectedDepartments.indexOf(deptId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newOrder = [...sequenceForm.selectedDepartments];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedDeptId);

        setSequenceForm(prev => ({
            ...prev,
            selectedDepartments: newOrder
        }));
    };

    const handleDragEnd = () => {
        setDraggedDeptId(null);
        setIsDragging(false);
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
            if (sequenceForm.selectedDepartments.length === 0) errors.departments = "At least one department is required";

            if (Object.keys(errors).length > 0) {
                setSequenceFormErrors(errors);
                setLoading(false);
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

            toast.success("Sequence loaded for editing");
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

            const deptRes = await fetch(`${API_BASE_URL}/departments`, { headers: getAuthHeaders() });
            if (deptRes.ok) {
                const updatedDepts = await deptRes.json();
                setDepartments(updatedDepts.data || updatedDepts || []);
            }

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

    // Filter sequences based on search and category
    const filteredSequences = sequences.filter(seq => {
        const matchesSearch = seq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (seq.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategoryFilter === "all" ||
            seq.category?._id === selectedCategoryFilter ||
            seq.subcategory?._id === selectedCategoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 24
            }
        }
    };

    const slideInVariants = {
        hidden: { x: -20, opacity: 0 },
        visible: { x: 0, opacity: 1 }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-cream-900">Workflow Sequences</h1>
                    <p className="text-cream-600 mt-1">Define and manage department workflows for order processing</p>
                </div>
                {editingSequenceId && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                            setEditingSequenceId(null);
                            setSequenceForm({
                                name: "",
                                categoryId: "",
                                subCategoryId: "",
                                attributeTypeIds: [],
                                selectedDepartments: [],
                            });
                        }}
                        className="px-4 py-2 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} /> Create New Sequence
                    </motion.button>
                )}
            </motion.div>

            {/* Form Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-white to-cream-50 p-6 rounded-2xl border border-cream-200 shadow-sm"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Layers className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-cream-900">
                            {editingSequenceId ? "✏️ Edit Sequence" : "✨ Create New Sequence"}
                        </h2>
                        <p className="text-sm text-cream-600">
                            {editingSequenceId ? "Update your sequence details below" : "Configure a new workflow sequence"}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSequenceSubmit} className="space-y-6" id="sequence-form">
                    {/* Name */}
                    <motion.div variants={itemVariants}>
                        <label className="block text-sm font-medium text-cream-900 mb-2 flex items-center gap-2">
                            <Tag size={16} />
                            Sequence Name *
                        </label>
                        <input
                            id="sequence-name"
                            type="text"
                            value={sequenceForm.name}
                            onChange={(e) => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${sequenceFormErrors.name ? "border-red-300 bg-red-50 shadow-sm" : "border-cream-300 hover:border-cream-400"
                                }`}
                            placeholder="e.g., Standard Card Printing Workflow"
                        />
                        {sequenceFormErrors.name && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-red-600 mt-2 flex items-center gap-1"
                            >
                                <AlertCircle size={14} /> {sequenceFormErrors.name}
                            </motion.p>
                        )}
                    </motion.div>

                    {/* Category/Subcategory */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-cream-900 flex items-center gap-2">
                                <Filter size={16} />
                                Category
                            </label>
                            <div className="relative">
                                <select
                                    value={sequenceForm.categoryId}
                                    onChange={(e) => setSequenceForm({ ...sequenceForm, categoryId: e.target.value, subCategoryId: "" })}
                                    className="w-full px-4 py-3 border border-cream-300 rounded-xl focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                                >
                                    <option value="">Select Category (Optional)</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                                <ChevronRight className="absolute right-3 top-3.5 text-cream-400 rotate-90" size={20} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-cream-900 flex items-center gap-2">
                                <Settings size={16} />
                                Subcategory
                            </label>
                            <div className="relative">
                                <select
                                    value={sequenceForm.subCategoryId}
                                    onChange={(e) => setSequenceForm({ ...sequenceForm, subCategoryId: e.target.value })}
                                    disabled={!sequenceForm.categoryId}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer ${!sequenceForm.categoryId ? 'bg-cream-100 text-cream-500' : 'bg-white'}`}
                                >
                                    <option value="">Select Subcategory (Optional)</option>
                                    {subCategories
                                        .filter(sub => !sequenceForm.categoryId || sub.parentCategory === sequenceForm.categoryId || (sub.parentCategory && sub.parentCategory._id === sequenceForm.categoryId))
                                        .map(sub => (
                                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                                        ))}
                                </select>
                                <ChevronRight className="absolute right-3 top-3.5 text-cream-400 rotate-90" size={20} />
                            </div>
                        </div>
                    </motion.div>

                    {/* Departments Selection */}
                    <motion.div variants={itemVariants} id="sequence-departments">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-cream-900 flex items-center gap-2">
                                    <Users size={16} />
                                    Department Sequence *
                                </label>
                                <p className="text-xs text-cream-600">
                                    Drag to reorder departments in processing sequence
                                </p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => setShowCreateDepartmentModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 text-sm shadow-sm"
                            >
                                <Plus size={16} /> Add Department
                            </motion.button>
                        </div>

                        {sequenceFormErrors.departments && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-red-600 mb-3 p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-2"
                            >
                                <AlertCircle size={16} /> {sequenceFormErrors.departments}
                            </motion.p>
                        )}

                        <div className={`border-2 ${isDragging ? 'border-blue-300 border-dashed' : 'border-cream-200'} rounded-xl p-4 bg-gradient-to-b from-white to-cream-50/50 min-h-[200px] transition-all duration-300`}>
                            {sequenceForm.selectedDepartments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-12 text-cream-500">
                                    <Building2 size={48} className="mb-3 opacity-50" />
                                    <p className="font-medium">No departments selected</p>
                                    <p className="text-sm mt-1">Click "Add Department" or select from below</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sequenceForm.selectedDepartments.map((deptId, index) => {
                                        const dept = departments.find(d => d._id === deptId);
                                        if (!dept) return null;

                                        return (
                                            <motion.div
                                                key={deptId}
                                                layout
                                                drag="y"
                                                dragConstraints={{ top: 0, bottom: 0 }}
                                                onDragStart={() => handleDragStart(deptId)}
                                                onDragOver={(e) => handleDragOver(e, deptId)}
                                                onDragEnd={handleDragEnd}
                                                whileDrag={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                                                className={`cursor-grab active:cursor-grabbing p-4 rounded-xl border bg-white flex items-center justify-between ${draggedDeptId === deptId ? 'shadow-lg border-blue-300' : 'border-cream-200 shadow-sm'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-cream-100 rounded-lg">
                                                        <GripVertical className="text-cream-500" size={20} />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full font-bold text-sm">
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <span className="font-semibold text-cream-900">{dept.name}</span>
                                                            {dept.description && (
                                                                <p className="text-xs text-cream-600 mt-0.5">{dept.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDepartmentToggle(deptId)}
                                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <XCircle className="text-red-500" size={18} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Available Departments */}
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-cream-900 mb-3 flex items-center gap-2">
                                <Building2 size={16} />
                                Available Departments
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {departments
                                    .filter(dept => !sequenceForm.selectedDepartments.includes(dept._id))
                                    .map(dept => (
                                        <motion.div
                                            key={dept._id}
                                            whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                                            onClick={() => handleDepartmentToggle(dept._id)}
                                            className="p-3 rounded-lg border border-cream-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-cream-900">{dept.name}</span>
                                                <Plus className="text-blue-500" size={16} />
                                            </div>
                                            {dept.description && (
                                                <p className="text-xs text-cream-600 mt-1 truncate">{dept.description}</p>
                                            )}
                                        </motion.div>
                                    ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div variants={itemVariants} className="pt-4">
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cream-900 to-cream-800 text-white px-8 py-4 rounded-xl font-semibold hover:from-cream-800 hover:to-cream-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    {editingSequenceId ? "Updating..." : "Creating..."}
                                </>
                            ) : (
                                <>
                                    {editingSequenceId ? <Edit size={20} /> : <Plus size={20} />}
                                    {editingSequenceId ? "Update Sequence" : "Create Sequence"}
                                </>
                            )}
                        </motion.button>
                        {editingSequenceId && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                type="button"
                                onClick={() => {
                                    setEditingSequenceId(null);
                                    setSequenceForm({
                                        name: "",
                                        categoryId: "",
                                        subCategoryId: "",
                                        attributeTypeIds: [],
                                        selectedDepartments: [],
                                    });
                                }}
                                className="w-full mt-3 px-4 py-2 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                            >
                                Cancel Edit
                            </motion.button>
                        )}
                    </motion.div>
                </form>
            </motion.div>

            {/* List Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="border-t border-cream-200 pt-8"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-cream-900">Existing Sequences</h2>
                        <p className="text-cream-600 text-sm mt-1">
                            {sequences.length} sequence{sequences.length !== 1 ? 's' : ''} available
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search sequences..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-full sm:w-64"
                            />
                            <Search className="absolute left-3 top-3 text-cream-400" size={18} />
                        </div>
                        <select
                            value={selectedCategoryFilter}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                            className="px-4 py-2.5 border border-cream-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loadingSequences ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader className="animate-spin text-cream-500" size={48} />
                        <p className="text-cream-600 mt-4">Loading sequences...</p>
                    </div>
                ) : filteredSequences.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16 px-4 border-2 border-dashed border-cream-200 rounded-2xl bg-gradient-to-b from-white to-cream-50/50"
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-cream-100 rounded-full mb-4">
                            <Layers className="text-cream-500" size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-cream-900 mb-2">No sequences found</h3>
                        <p className="text-cream-600 max-w-md mx-auto">
                            {searchTerm || selectedCategoryFilter !== "all"
                                ? "Try adjusting your search or filter"
                                : "Create your first workflow sequence to get started"}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-4"
                    >
                        {filteredSequences.map(seq => (
                            <motion.div
                                key={seq._id}
                                variants={itemVariants}
                                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}
                                className="bg-white border border-cream-200 rounded-xl p-5 hover:border-cream-300 transition-all"
                            >
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Layers className="text-blue-600" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-cream-900 mb-1">{seq.name}</h3>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {seq.category && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cream-100 text-cream-700 rounded-full text-xs font-medium">
                                                            <Tag size={12} /> {typeof seq.category === 'object' ? seq.category.name : 'Category'}
                                                        </span>
                                                    )}
                                                    {seq.subcategory && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                            <Settings size={12} /> {typeof seq.subcategory === 'object' ? seq.subcategory.name : 'Subcategory'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Department Flow Visualization */}
                                                <div className="flex items-center flex-wrap gap-2 mt-4">
                                                    {seq.departments && seq.departments
                                                        .sort((a: any, b: any) => a.order - b.order)
                                                        .map((d: any, i: number, arr: any[]) => (
                                                            <React.Fragment key={i}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="font-medium text-sm">
                                                                        {typeof d.department === 'object' ? d.department.name : 'Dept'}
                                                                    </span>
                                                                </div>
                                                                {i < arr.length - 1 && (
                                                                    <ChevronRight className="text-cream-400 mx-1" size={16} />
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleEditSequence(seq._id)}
                                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200 hover:border-blue-300"
                                            title="Edit sequence"
                                        >
                                            <Edit size={18} />
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleDeleteSequence(seq._id)}
                                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200 hover:border-red-300"
                                            title="Delete sequence"
                                        >
                                            <Trash2 size={18} />
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            {/* Create Department Modal */}
            <AnimatePresence>
                {showCreateDepartmentModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-cream-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Building2 className="text-blue-600" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-cream-900">Create New Department</h2>
                                </div>
                                <button
                                    onClick={() => setShowCreateDepartmentModal(false)}
                                    className="p-2 hover:bg-cream-100 rounded-xl transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateDepartmentFromModal} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">Department Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={createDepartmentModalForm.name}
                                        onChange={(e) => setCreateDepartmentModalForm({ ...createDepartmentModalForm, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-cream-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                                        placeholder="e.g., Printing Department"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">Description</label>
                                    <textarea
                                        value={createDepartmentModalForm.description}
                                        onChange={(e) => setCreateDepartmentModalForm({ ...createDepartmentModalForm, description: e.target.value })}
                                        className="w-full px-4 py-3 border border-cream-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 min-h-[100px]"
                                        placeholder="Describe the department's role..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-6">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="button"
                                        onClick={() => setShowCreateDepartmentModal(false)}
                                        className="flex-1 px-4 py-3 border border-cream-300 rounded-xl hover:bg-cream-50 transition-colors"
                                    >
                                        Cancel
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader className="animate-spin" size={18} /> Creating...
                                            </span>
                                        ) : "Create Department"}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Search icon component
const Search: React.FC<{ className?: string; size?: number }> = ({ className, size = 18 }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

export default ManageSequences;