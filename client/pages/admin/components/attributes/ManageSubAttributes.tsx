import React, { useState, useEffect, useMemo } from "react";
import {
    Edit,
    Trash2,
    Plus,
    Search,
    Loader,
    X,
    Filter,
    Download,
    ChevronDown,
    Eye,
    EyeOff,
    Image as ImageIcon,
    IndianRupee,
    Tag,
    Layers,
    CheckCircle,
    XCircle,
    MoreVertical,
    Copy,
    GripVertical,
    Save,
    ArrowRight,
} from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import { Pagination } from "../../../../components/Pagination";
import { SearchableDropdown } from "../../../../components/SearchableDropdown";
import { formatNumberFull } from "../../../../utils/pricing";
import { AdminSearchableDropdown } from "../../../../components/AdminSearchableDropdown";

interface AttributeValue {
    value: string;
    label: string;
}

interface AttributeType {
    _id: string;
    attributeName: string;
    systemName?: string;
    attributeValues: AttributeValue[];
}

interface SubAttribute {
    _id: string;
    parentAttribute: any;
    parentValue: string;
    value: string;
    label: string;
    image?: string;
    priceAdd: number;
    isEnabled: boolean;
    systemName?: string;
    displayOrder?: number;
}

interface ManageSubAttributesProps {
    attributeTypes: AttributeType[];
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSuccess: (success: string | null) => void;
}

const ITEMS_PER_PAGE = 10;

const SubAttributeRow = ({ subAttr, attributeTypes, isReordering, onToggleStatus, onEdit, onDelete, actionMenu, setActionMenu, handleDelete }: any) => {
    const parentAttrObj = typeof subAttr.parentAttribute === 'object' && subAttr.parentAttribute !== null
        ? subAttr.parentAttribute
        : attributeTypes.find((attr: any) => attr._id === subAttr.parentAttribute);

    const parentAttrName = parentAttrObj
        ? (parentAttrObj.systemName || parentAttrObj.attributeName)
        : 'Unknown';

    const dragControls = useDragControls();

    const Content = (
        <>
            {isReordering && (
                <td className="px-4 py-4 whitespace-nowrap cursor-move touch-none">
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className="p-2 text-gray-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                        <GripVertical size={20} />
                    </div>
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-900">{subAttr.label}</div>
                        {subAttr.systemName && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                {subAttr.systemName}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 font-mono mt-1">{subAttr.value}</div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-700">
                    <div className="font-medium">{parentAttrName}</div>
                    <div className="text-gray-500 text-sm mt-1">{subAttr.parentValue}</div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {subAttr.image ? (
                    <a
                        href={subAttr.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative group"
                        title="Click to view full image"
                    >
                        <img
                            src={subAttr.image}
                            alt={subAttr.label}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity cursor-pointer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center">
                            <Eye className="text-white" size={16} />
                        </div>
                    </a>
                ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <ImageIcon className="text-gray-400" size={20} />
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1 text-lg font-semibold text-gray-800">
                    <IndianRupee size={16} />
                    {formatNumberFull(subAttr.priceAdd || 0)}
                </div>
                <div className="text-xs text-gray-500">Additional</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {!isReordering && (<button
                    onClick={onToggleStatus}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${subAttr.isEnabled
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                >
                    {subAttr.isEnabled ? (
                        <>
                            <CheckCircle size={12} />
                            Enabled
                        </>
                    ) : (
                        <>
                            <XCircle size={12} />
                            Disabled
                        </>
                    )}
                </button>)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                {!isReordering && (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={onEdit}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Edit size={18} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setActionMenu(actionMenu === subAttr._id ? null : subAttr._id)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <MoreVertical size={18} />
                            </button>
                            {actionMenu === subAttr._id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10 text-left">
                                    <button className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2">
                                        <Copy size={16} />
                                        Duplicate
                                    </button>
                                    <div className="border-t border-gray-100">
                                        <button
                                            onClick={onDelete}
                                            className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2"
                                        >
                                            <Trash2 size={16} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </td>
        </>
    );

    if (isReordering) {
        return (
            <Reorder.Item
                value={subAttr}
                as="tr"
                dragListener={false}
                dragControls={dragControls}
                className="hover:bg-gray-50/50 transition-colors group bg-white border-b border-gray-100 last:border-0"
            >
                {Content}
            </Reorder.Item>
        );
    }

    return (
        <tr className="hover:bg-gray-50/50 transition-colors group">
            {Content}
        </tr>
    );
};

const ManageSubAttributes: React.FC<ManageSubAttributesProps> = ({
    attributeTypes,
    setLoading,
    setError,
    setSuccess,
}) => {
    // State
    const [subAttributes, setSubAttributes] = useState<SubAttribute[]>([]);
    const [loadingSubAttributes, setLoadingSubAttributes] = useState(false);
    const [editingSubAttributeId, setEditingSubAttributeId] = useState<string | null>(null);
    const [showSubAttributeForm, setShowSubAttributeForm] = useState(false);
    const [selectedSubAttributes, setSelectedSubAttributes] = useState<string[]>([]);

    const [subAttributeForm, setSubAttributeForm] = useState({
        parentAttribute: "",
        parentValue: "",
        value: "",
        label: "",
        image: null as File | null,
        priceAdd: 0,
        isEnabled: true,
        systemName: "",
    });

    const [multipleSubAttributes, setMultipleSubAttributes] = useState<Array<{
        value: string;
        label: string;
        image: File | null;
        priceAdd: number;
        isEnabled: boolean;
        systemName: string;
    }>>([{ value: "", label: "", image: null, priceAdd: 0, isEnabled: true, systemName: "" }]);

    const [subAttributeFilter, setSubAttributeFilter] = useState({
        attributeId: "",
        parentValue: "",
    });

    const [subAttributeSearch, setSubAttributeSearch] = useState("");
    const [subAttributeStatusFilter, setSubAttributeStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
    const [subAttributePage, setSubAttributePage] = useState(1);
    const [actionMenu, setActionMenu] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState(false);
    const [localSubAttributes, setLocalSubAttributes] = useState<SubAttribute[]>([]);

    // Sync local state with fetched data and sort by displayOrder
    useEffect(() => {
        if (subAttributes.length > 0) {
            // Sort by display order
            const sorted = [...subAttributes].sort((a, b) =>
                (a.displayOrder || 0) - (b.displayOrder || 0)
            );
            setLocalSubAttributes(sorted);
        } else {
            setLocalSubAttributes([]);
        }
    }, [subAttributes]);

    // Fetch sub-attributes
    const fetchSubAttributes = async (customFilters?: { attributeId?: string; parentValue?: string }) => {
        setLoadingSubAttributes(true);
        try {
            const filters = customFilters || subAttributeFilter;
            const params = new URLSearchParams();
            if (filters.attributeId) {
                params.append('attributeId', filters.attributeId);
            }
            if (filters.parentValue) {
                params.append('parentValue', filters.parentValue);
            }

            const url = `${API_BASE_URL}/admin/sub-attributes${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url, {
                method: "GET",
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch sub-attributes: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setSubAttributes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching sub-attributes:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch sub-attributes");
            setSubAttributes([]);
        } finally {
            setLoadingSubAttributes(false);
        }
    };

    useEffect(() => {
        fetchSubAttributes();
    }, []);

    // Filter Logic
    const filteredSubAttributes = useMemo(() => {
        return subAttributes.filter((subAttr) => {
            const searchLower = subAttributeSearch.toLowerCase();

            // 1. Search Logic
            if (subAttributeSearch && subAttributeSearch.length >= 2) {
                const matchesName = subAttr.value?.toLowerCase().includes(searchLower) || false;
                const matchesLabel = subAttr.label?.toLowerCase().includes(searchLower) || false;
                const matchesSystemName = subAttr.systemName?.toLowerCase().includes(searchLower) || false;
                const matchesParentValue = (subAttr.parentValue || "").toLowerCase().includes(searchLower);

                const parentAttrObj = typeof subAttr.parentAttribute === 'object' && subAttr.parentAttribute !== null
                    ? subAttr.parentAttribute
                    : attributeTypes.find(attr => attr._id === subAttr.parentAttribute);

                const parentAttrName = (parentAttrObj?.attributeName || "").toLowerCase();
                const matchesParent = parentAttrName.includes(searchLower);

                if (!matchesName && !matchesLabel && !matchesSystemName && !matchesParentValue && !matchesParent) return false;
            }

            // 2. Filter by Attribute
            if (subAttributeFilter.attributeId) {
                const parentId = typeof subAttr.parentAttribute === 'object' && subAttr.parentAttribute !== null
                    ? String((subAttr.parentAttribute as any)._id)
                    : String(subAttr.parentAttribute);
                if (parentId !== String(subAttributeFilter.attributeId)) return false;
            }

            // 3. Filter by Parent Value
            if (subAttributeFilter.parentValue) {
                if (subAttr.parentValue !== subAttributeFilter.parentValue) return false;
            }

            // 4. Filter by Status
            if (subAttributeStatusFilter !== "all") {
                const isEnabled = subAttr.isEnabled !== false;
                if (subAttributeStatusFilter === "enabled" && !isEnabled) return false;
                if (subAttributeStatusFilter === "disabled" && isEnabled) return false;
            }

            return true;
        });
    }, [subAttributes, subAttributeSearch, subAttributeFilter, subAttributeStatusFilter, attributeTypes]);

    const canReorder = useMemo(() => {
        return subAttributeFilter.attributeId && subAttributeFilter.parentValue && !subAttributeSearch && subAttributeStatusFilter === 'all';
    }, [subAttributeFilter, subAttributeSearch, subAttributeStatusFilter]);

    const handleReorder = (newOrder: SubAttribute[]) => {
        setLocalSubAttributes(newOrder);
        // Optimize: Update the main subAttributes state as well to reflect changes immediately
        // but only for the filtered subset
        // For now, local state handles the UI, save handles the backend
    };

    const handleSaveOrder = async () => {
        setLoading(true);
        try {
            const reorderedItems = localSubAttributes.map((item, index) => ({
                _id: item._id,
                displayOrder: index
            }));

            const response = await fetch(`${API_BASE_URL}/admin/sub-attributes/reorder`, {
                method: "PUT",
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subAttributes: reorderedItems }),
            });

            if (!response.ok) throw new Error("Failed to save order");

            setSuccess("Order saved successfully");
            setIsReordering(false);
            fetchSubAttributes(); // Refresh to get server-side sort if needed
        } catch (err) {
            setError("Failed to save order");
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleSubAttributeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (!subAttributeForm.parentAttribute) throw new Error("Parent attribute is required");
            if (!subAttributeForm.parentValue) throw new Error("Parent value is required");

            const parentAttr = attributeTypes.find(attr => attr._id === subAttributeForm.parentAttribute);
            if (!parentAttr) throw new Error("Parent attribute not found");

            if (editingSubAttributeId) {
                if (!subAttributeForm.value || !subAttributeForm.label) throw new Error("Value and label are required");

                const formData = new FormData();
                formData.append("parentAttribute", parentAttr._id);
                formData.append("parentValue", subAttributeForm.parentValue);
                formData.append("value", subAttributeForm.value);
                formData.append("label", subAttributeForm.label);
                formData.append("priceAdd", subAttributeForm.priceAdd.toString());
                formData.append("isEnabled", subAttributeForm.isEnabled.toString());
                formData.append("systemName", subAttributeForm.systemName || "");

                if (subAttributeForm.image) {
                    formData.append("image", subAttributeForm.image);
                }

                const updateResponse = await fetch(`${API_BASE_URL}/admin/sub-attributes/${editingSubAttributeId}`, {
                    method: "PUT",
                    headers: {
                        Authorization: getAuthHeaders().Authorization,
                        Accept: "application/json",
                    },
                    body: formData,
                });

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.error || "Failed to update sub-attribute");
                }

                const validNewSubAttributes = multipleSubAttributes.filter(sa => sa.value.trim() && sa.label.trim());
                for (const subAttr of validNewSubAttributes) {
                    const createFormData = new FormData();
                    createFormData.append("parentAttribute", parentAttr._id);
                    createFormData.append("parentValue", subAttributeForm.parentValue);
                    createFormData.append("value", subAttr.value.trim());
                    createFormData.append("label", subAttr.label.trim());
                    createFormData.append("priceAdd", subAttr.priceAdd.toString());
                    createFormData.append("isEnabled", subAttr.isEnabled.toString());
                    createFormData.append("systemName", subAttr.systemName || "");
                    if (subAttr.image) createFormData.append("image", subAttr.image);

                    await fetch(`${API_BASE_URL}/admin/sub-attributes`, {
                        method: "POST",
                        headers: {
                            Authorization: getAuthHeaders().Authorization,
                            Accept: "application/json",
                        },
                        body: createFormData,
                    });
                }

                setSuccess("Sub-attribute(s) processed successfully");
            } else {
                const validSubAttributes = multipleSubAttributes.filter(sa => sa.value.trim() && sa.label.trim());
                if (validSubAttributes.length === 0) throw new Error("At least one sub-attribute is required");

                for (const subAttr of validSubAttributes) {
                    const formData = new FormData();
                    formData.append("parentAttribute", parentAttr._id);
                    formData.append("parentValue", subAttributeForm.parentValue);
                    formData.append("value", subAttr.value.trim());
                    formData.append("label", subAttr.label.trim());
                    formData.append("priceAdd", subAttr.priceAdd.toString());
                    formData.append("isEnabled", subAttr.isEnabled.toString());
                    formData.append("systemName", subAttr.systemName || "");
                    if (subAttr.image) formData.append("image", subAttr.image);

                    await fetch(`${API_BASE_URL}/admin/sub-attributes`, {
                        method: "POST",
                        headers: {
                            Authorization: getAuthHeaders().Authorization,
                            Accept: "application/json",
                        },
                        body: formData,
                    });
                }
                setSuccess("Sub-attribute(s) created successfully");
            }

            await fetchSubAttributes();
            handleCancelSubAttributeEdit();
        } catch (err) {
            console.error("Error saving sub-attribute:", err);
            setError(err instanceof Error ? err.message : "Failed to save sub-attribute");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubAttribute = async (subAttributeId: string) => {
        if (!window.confirm("Are you sure you want to delete this sub-attribute?")) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/sub-attributes/${subAttributeId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error("Failed to delete");
            setSuccess("Sub-attribute deleted successfully");
            await fetchSubAttributes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete sub-attribute");
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubAttribute = (subAttr: SubAttribute) => {
        const parentAttrId = typeof subAttr.parentAttribute === 'object' && subAttr.parentAttribute !== null
            ? subAttr.parentAttribute._id
            : subAttr.parentAttribute;

        setSubAttributeForm({
            parentAttribute: parentAttrId || "",
            parentValue: subAttr.parentValue || "",
            value: subAttr.value || "",
            label: subAttr.label || "",
            image: null,
            priceAdd: subAttr.priceAdd || 0,
            isEnabled: subAttr.isEnabled !== undefined ? subAttr.isEnabled : true,
            systemName: subAttr.systemName || "",
        });
        setMultipleSubAttributes([{ value: "", label: "", image: null, priceAdd: 0, isEnabled: true, systemName: "" }]);
        setEditingSubAttributeId(subAttr._id);
        setShowSubAttributeForm(true);
    };

    const handleCancelSubAttributeEdit = () => {
        setEditingSubAttributeId(null);
        setShowSubAttributeForm(false);
        setSubAttributeForm({
            parentAttribute: "",
            parentValue: "",
            value: "",
            label: "",
            image: null,
            priceAdd: 0,
            isEnabled: true,
            systemName: "",
        });
        setMultipleSubAttributes([{ value: "", label: "", image: null, priceAdd: 0, isEnabled: true, systemName: "" }]);
    };

    const addSubAttributeRow = () => {
        setMultipleSubAttributes([
            ...multipleSubAttributes,
            { value: "", label: "", image: null, priceAdd: 0, isEnabled: true, systemName: "" },
        ]);
    };

    const removeSubAttributeRow = (index: number) => {
        if (multipleSubAttributes.length > 1) {
            setMultipleSubAttributes(multipleSubAttributes.filter((_, i) => i !== index));
        }
    };

    const updateSubAttributeRow = (index: number, field: string, value: any) => {
        const updated = [...multipleSubAttributes];
        (updated[index] as any)[field] = value;
        setMultipleSubAttributes(updated);
    };

    const toggleSubAttributeSelection = (id: string) => {
        setSelectedSubAttributes(prev =>
            prev.includes(id)
                ? prev.filter(subId => subId !== id)
                : [...prev, id]
        );
    };

    const handleBulkAction = (action: string) => {
        if (action === "delete") {
            if (confirm(`Delete ${selectedSubAttributes.length} selected sub-attributes?`)) {
                // Implement bulk delete
                setSuccess(`${selectedSubAttributes.length} sub-attributes deleted`);
                setSelectedSubAttributes([]);
            }
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                            <Layers className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-700 bg-clip-text text-transparent">
                                Sub-Attributes
                            </h1>
                            <p className="text-gray-500 mt-1">Manage nested attributes and their properties</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            handleCancelSubAttributeEdit();
                            setShowSubAttributeForm(true);
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-2 text-sm font-medium hover:from-emerald-600 hover:to-teal-700"
                    >
                        <Plus size={18} />
                        Create Sub-Attributes
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col  lg:flex-row items-start lg:items-center lg:justify-between gap-4 flex-1">
                        {/* Search */}
                        <div className="relative w-full lg:w-[35%]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search sub-attributes..."
                                value={subAttributeSearch}
                                onChange={(e) => setSubAttributeSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex-1 flex flex-wrap gap-5">
                            <AdminSearchableDropdown
                                label="All Attributes"
                                value={subAttributeFilter.attributeId}
                                onChange={(value) => setSubAttributeFilter({ ...subAttributeFilter, attributeId: value as string })}
                                options={[
                                    { value: '', label: 'All Attributes' },
                                    ...attributeTypes.map((attr) => ({
                                        value: attr._id,
                                        label: attr.systemName || attr.attributeName
                                    }))
                                ]}
                                searchPlaceholder="Search attributes..."
                                enableSearch={true}
                                className="w-full lg:w-[45%]"
                            />

                            <AdminSearchableDropdown
                                label="All Parent Values"
                                value={subAttributeFilter.parentValue}
                                onChange={(value) => setSubAttributeFilter({ ...subAttributeFilter, parentValue: value as string })}
                                options={(() => {
                                    const baseOption = { value: '', label: 'All Parent Values' };
                                    if (subAttributeFilter.attributeId) {
                                        const attr = attributeTypes.find(a => a._id === subAttributeFilter.attributeId);
                                        return [
                                            baseOption,
                                            ...(attr?.attributeValues?.map(av => ({
                                                value: av.value,
                                                label: av.label
                                            })) || [])
                                        ];
                                    }
                                    return [
                                        baseOption,
                                        ...Array.from(new Set(subAttributes.map(sa => sa.parentValue).filter(Boolean)))
                                            .sort()
                                            .map((pv) => ({ value: pv, label: pv }))
                                    ];
                                })()}
                                searchPlaceholder="Search parent values..."
                                enableSearch={true}
                                className="w-full lg:w-[20%]"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Sub-Attributes List
                            <span className="text-gray-500 font-normal ml-2">
                                ({filteredSubAttributes.length} of {subAttributes.length})
                            </span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {canReorder && (
                            <button
                                onClick={() => {
                                    if (isReordering) {
                                        handleSaveOrder();
                                    } else {
                                        setIsReordering(true);
                                        // Initialize local state with currently filtered and sorted items
                                        setLocalSubAttributes(filteredSubAttributes);
                                    }
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isReordering
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {isReordering ? <Save size={16} /> : <ArrowRight className="rotate-90" size={16} />}
                                {isReordering ? "Save Order" : "Reorder"}
                            </button>
                        )}
                        {isReordering && (
                            <button
                                onClick={() => {
                                    setIsReordering(false);
                                    setLocalSubAttributes(subAttributes); // Reset
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {loadingSubAttributes ? (
                    <div className="flex flex-col justify-center items-center py-20">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-100 rounded-full"></div>
                            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                        </div>
                        <p className="mt-4 text-gray-600">Loading sub-attributes...</p>
                    </div>
                ) : filteredSubAttributes.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-flex p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl mb-4">
                            <Layers size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No sub-attributes found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            {subAttributeSearch || subAttributeFilter.attributeId || subAttributeStatusFilter !== "all"
                                ? "Try adjusting your search or filter criteria"
                                : "Start by creating your first sub-attribute"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        {isReordering && <th className="w-10 px-4 py-4"></th>}
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Sub-Attribute
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Parent</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>

                                {isReordering ? (
                                    <Reorder.Group
                                        as="tbody"
                                        axis="y"
                                        values={localSubAttributes}
                                        onReorder={handleReorder}
                                        className="divide-y divide-gray-100"
                                    >
                                        {localSubAttributes.map((subAttr) => (
                                            <SubAttributeRow
                                                key={subAttr._id}
                                                subAttr={subAttr}
                                                attributeTypes={attributeTypes}
                                                isReordering={true}
                                            />
                                        ))}
                                    </Reorder.Group>
                                ) : (
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredSubAttributes
                                            .slice((subAttributePage - 1) * ITEMS_PER_PAGE, subAttributePage * ITEMS_PER_PAGE)
                                            .map((subAttr) => (
                                                <SubAttributeRow
                                                    key={subAttr._id}
                                                    subAttr={subAttr}
                                                    attributeTypes={attributeTypes}
                                                    isReordering={false}
                                                    onToggleStatus={async () => {
                                                        try {
                                                            const response = await fetch(`${API_BASE_URL}/admin/sub-attributes/${subAttr._id}/toggle`, {
                                                                method: "PATCH",
                                                                headers: getAuthHeaders(),
                                                            });
                                                            if (response.ok) {
                                                                fetchSubAttributes();
                                                                setSuccess(`Sub-attribute ${!subAttr.isEnabled ? 'enabled' : 'disabled'}`);
                                                            }
                                                        } catch (err) {
                                                            setError("Failed to toggle status");
                                                        }
                                                    }}
                                                    onEdit={() => handleEditSubAttribute(subAttr)}
                                                    onDelete={() => handleDeleteSubAttribute(subAttr._id)}
                                                    actionMenu={actionMenu}
                                                    setActionMenu={setActionMenu}
                                                    handleDelete={handleDeleteSubAttribute}
                                                />
                                            ))}
                                    </tbody>
                                )}
                            </table>
                        </div>
                        <div className="p-6 border-t border-gray-100">
                            <Pagination
                                currentPage={subAttributePage}
                                totalItems={filteredSubAttributes.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={setSubAttributePage}
                            />
                        </div>

                        {/* Modal Form */}
                        {showSubAttributeForm && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
                                    <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                                                <Layers className="text-white" size={20} />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900">
                                                {editingSubAttributeId ? "Edit Sub-Attribute" : "Create New Sub-Attributes"}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={handleCancelSubAttributeEdit}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <X className="text-gray-500" size={24} />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubAttributeSubmit} className="p-6 space-y-6">
                                        {/* Parent Selection */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Parent Attribute *</label>
                                                <AdminSearchableDropdown
                                                    label="Select Parent Attribute"
                                                    value={subAttributeForm.parentAttribute}
                                                    onChange={(value) => setSubAttributeForm({ ...subAttributeForm, parentAttribute: value as string, parentValue: "" })}
                                                    options={[
                                                        { value: '', label: 'Select Parent Attribute' },
                                                        ...attributeTypes.map((attr) => ({
                                                            value: attr._id,
                                                            label: attr.systemName ? `${attr.systemName} (${attr.attributeName})` : attr.attributeName
                                                        }))
                                                    ]}
                                                    searchPlaceholder="Search attributes..."
                                                    enableSearch={true}
                                                    required={true}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Parent Value *</label>
                                                <AdminSearchableDropdown
                                                    label="Select Parent Value"
                                                    value={subAttributeForm.parentValue}
                                                    onChange={(value) => setSubAttributeForm({ ...subAttributeForm, parentValue: value as string })}
                                                    options={(() => {
                                                        const selectedAttr = attributeTypes.find(attr => attr._id === subAttributeForm.parentAttribute);
                                                        return [
                                                            { value: '', label: 'Select Parent Value' },
                                                            ...(selectedAttr?.attributeValues?.map((av: any) => ({
                                                                value: av.value,
                                                                label: av.label
                                                            })) || [])
                                                        ];
                                                    })()}
                                                    searchPlaceholder="Search parent values..."
                                                    enableSearch={!!subAttributeForm.parentAttribute}
                                                    disabled={!subAttributeForm.parentAttribute}
                                                    required={true}
                                                />
                                            </div>
                                        </div>

                                        {/* Edit Form Section */}
                                        {editingSubAttributeId && (
                                            <div className="p-6 border border-emerald-100 rounded-xl bg-gradient-to-br from-emerald-50/50 to-white">
                                                <h4 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                                                    <Edit size={16} />
                                                    Editing Current Item
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Value *</label>
                                                        <input
                                                            type="text"
                                                            value={subAttributeForm.value}
                                                            onChange={(e) => setSubAttributeForm({ ...subAttributeForm, value: e.target.value })}
                                                            placeholder="Unique identifier"
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Label *</label>
                                                        <input
                                                            type="text"
                                                            value={subAttributeForm.label}
                                                            onChange={(e) => setSubAttributeForm({ ...subAttributeForm, label: e.target.value })}
                                                            placeholder="Display name"
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Price Addition</label>
                                                        <div className="relative">
                                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                                            <input
                                                                type="number"
                                                                step="0.000001"
                                                                value={subAttributeForm.priceAdd}
                                                                onChange={(e) => setSubAttributeForm({ ...subAttributeForm, priceAdd: parseFloat(e.target.value) || 0 })}
                                                                placeholder="0.00"
                                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                                        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={subAttributeForm.isEnabled}
                                                                onChange={(e) => setSubAttributeForm({ ...subAttributeForm, isEnabled: e.target.checked })}
                                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                                            />
                                                            <div>
                                                                <div className="font-medium">Enabled</div>
                                                                <div className="text-sm text-gray-500">Show in options</div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-sm font-medium text-gray-700">Image</label>
                                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                                                            <input
                                                                type="file"
                                                                onChange={(e) => setSubAttributeForm({ ...subAttributeForm, image: e.target.files?.[0] || null })}
                                                                className="hidden"
                                                                id="editImage"
                                                            />
                                                            <label htmlFor="editImage" className="cursor-pointer">
                                                                <ImageIcon className="mx-auto text-gray-400 mb-2" size={24} />
                                                                <div className="text-sm text-gray-600">Click to upload image</div>
                                                                <div className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Multiple Sub-Attributes Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">
                                                        {editingSubAttributeId ? "Add More Items" : "Sub-Attribute Items"}
                                                    </h4>
                                                    <p className="text-sm text-gray-500">Add multiple sub-attributes at once</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addSubAttributeRow}
                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 text-sm"
                                                >
                                                    <Plus size={16} />
                                                    Add Row
                                                </button>
                                            </div>

                                            {multipleSubAttributes.map((sub, index) => (
                                                <div key={index} className="p-4 border border-gray-200 rounded-xl bg-white hover:border-emerald-300 transition-colors relative">
                                                    {multipleSubAttributes.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSubAttributeRow(index)}
                                                            className="absolute top-3 right-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}

                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-8">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-gray-700">Value</label>
                                                            <input
                                                                type="text"
                                                                value={sub.value}
                                                                onChange={(e) => updateSubAttributeRow(index, "value", e.target.value)}
                                                                placeholder="e.g., small"
                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-gray-700">Label</label>
                                                            <input
                                                                type="text"
                                                                value={sub.label}
                                                                onChange={(e) => updateSubAttributeRow(index, "label", e.target.value)}
                                                                placeholder="e.g., Small"
                                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-gray-700">Price</label>
                                                            <div className="relative">
                                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                <input
                                                                    type="number"
                                                                    step="0.000001"
                                                                    value={sub.priceAdd}
                                                                    onChange={(e) => updateSubAttributeRow(index, "priceAdd", parseFloat(e.target.value) || 0)}
                                                                    placeholder="0.00"
                                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-gray-700">Image</label>
                                                            <input
                                                                type="file"
                                                                onChange={(e) => updateSubAttributeRow(index, "image", e.target.files?.[0] || null)}
                                                                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={handleCancelSubAttributeEdit}
                                                className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md"
                                            >
                                                {editingSubAttributeId ? "Update & Save" : "Create Sub-Attributes"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                    </>
                )}
            </div>
        </div >
    );
};

export default ManageSubAttributes;
