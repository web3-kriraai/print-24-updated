import React, { useState, useEffect } from "react";
import {
    Edit,
    Trash2,
    Plus,
    Loader,
    Check,
    X,
    Building2,
    Search,
    AlertCircle,
    GripVertical,
    ArrowRight
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
    onNavigate: (tab: string) => void;
}

const ManageSequences: React.FC<ManageSequencesProps> = ({
    setError,
    setSuccess,
    loading,
    setLoading,
    onNavigate
}) => {
    const [sequences, setSequences] = useState<any[]>([]);
    const [loadingSequences, setLoadingSequences] = useState(false);
    const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);

    const [sequenceForm, setSequenceForm] = useState({
        name: "",
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
    const [attributeTypes, setAttributeTypes] = useState<any[]>([]);

    // Drag and drop state
    const [draggedDeptId, setDraggedDeptId] = useState<string | null>(null);

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
            const [deptRes, attrRes] = await Promise.all([
                fetch(`${API_BASE_URL}/departments`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/attribute-types`, { headers: getAuthHeaders() })
            ]);

            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data.data || data || []);
            }
            if (attrRes.ok) setAttributeTypes(await attrRes.json());

        } catch (err) {
            console.error("Error fetching dependencies for sequences:", err);
        }
    };

    const fetchSequences = async () => {
        setLoadingSequences(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sequences`, {
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
            if (sequenceForm.selectedDepartments.length === 0) errors.departments = "At least one department is required";

            if (Object.keys(errors).length > 0) {
                setSequenceFormErrors(errors);
                setLoading(false);
                return;
            }

            const url = editingSequenceId
                ? `${API_BASE_URL}/sequences/${editingSequenceId}`
                : `${API_BASE_URL}/sequences`;
            const method = editingSequenceId ? "PUT" : "POST";

            const payload = {
                name: sequenceForm.name,
                attributeTypeIds: sequenceForm.attributeTypeIds,
                departments: sequenceForm.selectedDepartments
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
                ? [...sequence.departments].sort((a: any, b: any) => a.order - b.order)
                : [];

            const deptIds = sortedDepts.map((d: any) =>
                typeof d.department === 'object' ? d.department._id : d.department
            );

            setSequenceForm({
                name: sequence.name,
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
            const response = await fetch(`${API_BASE_URL}/sequences/${sequenceId}`, {
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
                // If removing, just filter it out
                return {
                    ...prev,
                    selectedDepartments: prev.selectedDepartments.filter(id => id !== deptId)
                };
            } else {
                // If adding, append to end
                return {
                    ...prev,
                    selectedDepartments: [...prev.selectedDepartments, deptId]
                };
            }
        });
    };

    // Drag and Drop Logic
    const handleDragStart = (e: React.DragEvent, deptId: string) => {
        setDraggedDeptId(deptId);
        // Necessary for drag to work in some browsers
        e.dataTransfer.effectAllowed = 'move';
        // e.dataTransfer.setData('text/plain', deptId); 
    };

    const handleDragOver = (e: React.DragEvent, targetDeptId: string) => {
        e.preventDefault();
        if (!draggedDeptId || draggedDeptId === targetDeptId) return;

        const draggedIndex = sequenceForm.selectedDepartments.indexOf(draggedDeptId);
        const targetIndex = sequenceForm.selectedDepartments.indexOf(targetDeptId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Perform the move in state immediately for visual feedback
        const newOrder = [...sequenceForm.selectedDepartments];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedDeptId);

        setSequenceForm(prev => ({
            ...prev,
            selectedDepartments: newOrder
        }));
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
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
            >
                <h1 className="text-2xl font-bold text-gray-800">Create Sequence</h1>
            </motion.div>

            {/* Form Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            >
                <form onSubmit={handleSequenceSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Sequence Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={sequenceForm.name}
                            onChange={(e) => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                            placeholder="e.g., Standard Card Printing"
                            className={`w-full px-4 py-3 rounded-lg border ${sequenceFormErrors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-gray-200'} focus:outline-none focus:ring-4 transition-all`}
                        />
                        {sequenceFormErrors.name && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle size={14} /> {sequenceFormErrors.name}
                            </p>
                        )}
                    </div>



                    {/* Departments Selection */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-semibold text-gray-700">
                                Department Sequence <span className="text-red-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => onNavigate('departments')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Plus size={16} /> New Department
                            </button>
                        </div>

                        <p className="text-xs text-gray-500">
                            Select active departments below. Drag selected departments to reorder their sequence steps.
                        </p>

                        {sequenceFormErrors.departments && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <AlertCircle size={14} /> {sequenceFormErrors.departments}
                            </p>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Available Departments */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Available Departments</h4>
                                <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto bg-gray-50 p-2 space-y-2">
                                    {departments.map((dept) => {
                                        const isSelected = sequenceForm.selectedDepartments.includes(dept._id);
                                        return (
                                            <div
                                                key={dept._id}
                                                onClick={() => handleDepartmentToggle(dept._id)}
                                                className={`cursor-pointer p-3 rounded-md border flex items-center justify-between transition-all select-none hover:shadow-sm ${isSelected
                                                    ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200 opacity-50"
                                                    : "bg-white border-gray-200 hover:border-blue-300"
                                                    }`}
                                            >
                                                <span className="text-sm font-medium text-gray-800">{dept.name}</span>
                                                {isSelected ? <Check size={16} className="text-blue-600" /> : <Plus size={16} className="text-gray-400" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected Sequence */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Sequence Order (Drag to Reorder)</h4>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg min-h-[320px] bg-white p-2 space-y-2">
                                    {sequenceForm.selectedDepartments.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                            <Building2 size={32} className="mb-2 opacity-50" />
                                            <p className="text-sm">No departments selected</p>
                                        </div>
                                    ) : (
                                        sequenceForm.selectedDepartments.map((deptId, index) => {
                                            const dept = departments.find(d => d._id === deptId);
                                            if (!dept) return null;
                                            return (
                                                <motion.div
                                                    layout
                                                    key={deptId}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e as any, deptId)}
                                                    onDragOver={(e) => handleDragOver(e as any, deptId)}
                                                    className="bg-white border border-gray-200 rounded-md p-3 flex items-center shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-300"
                                                >
                                                    <div className="mr-3 text-gray-400 cursor-grab">
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium text-gray-800">{dept.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleDepartmentToggle(deptId); }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                        {editingSequenceId ? "Update Sequence" : "Create Sequence"}
                    </button>

                    {editingSequenceId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingSequenceId(null);
                                setSequenceForm({
                                    name: "",
                                    attributeTypeIds: [],
                                    selectedDepartments: [],
                                });
                            }}
                            className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
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
                        All Sequences ({sequences.length})
                    </h2>
                    <button
                        onClick={fetchSequences}
                        className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                    </button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    {loadingSequences ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <Loader className="animate-spin mb-2" size={24} />
                            Loading sequences...
                        </div>
                    ) : sequences.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No sequences found. Create one above.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {sequences.map(seq => (
                                <div key={seq._id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-gray-800 text-lg">{seq.name}</h3>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                {seq.departments && seq.departments
                                                    .sort((a: any, b: any) => a.order - b.order)
                                                    .map((d: any, i: number, arr: any[]) => (
                                                        <React.Fragment key={i}>
                                                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                                                <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                                                                    {i + 1}
                                                                </span>
                                                                <span className="text-sm font-medium text-blue-900">
                                                                    {typeof d.department === 'object' ? d.department.name : 'Dept'}
                                                                </span>
                                                            </div>
                                                            {i < arr.length - 1 && (
                                                                <ArrowRight size={14} className="text-gray-400" />
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditSequence(seq._id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSequence(seq._id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Department Modal (Quick Add) */}
            <AnimatePresence>
                {showCreateDepartmentModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
                        >
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800">Create New Department</h2>
                                <button onClick={() => setShowCreateDepartmentModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateDepartmentFromModal} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={createDepartmentModalForm.name}
                                        onChange={(e) => setCreateDepartmentModalForm({ ...createDepartmentModalForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-gray-100"
                                        placeholder="e.g. Layout"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={createDepartmentModalForm.description}
                                        onChange={(e) => setCreateDepartmentModalForm({ ...createDepartmentModalForm, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-gray-100"
                                        rows={2}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateDepartmentModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                                    <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{loading ? "Creating..." : "Create"}</button>
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
