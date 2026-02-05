import React, { useState, useEffect } from "react";
import {
    Edit,
    Trash2,
    Plus,
    Search,
    Loader,
    CheckCircle,
    XCircle,
    AlertCircle,
    X,
    Copy,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Save,
    Filter,
    Zap,
    Globe,
    Package,
    Tag,
    Cpu,
    Bell,
    ArrowRight,
    Eye,
    EyeOff,
    ListFilter,
    Grid3x3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { getAuthHeaders } from "../../../../utils/auth";
import { Product } from "../products/ManageProductsView";
import { AdminSearchableDropdown } from "../../../../components/AdminSearchableDropdown";
import { SearchableDropdown } from "../../../../components/SearchableDropdown";

// Interface Definitions
interface AttributeType {
    _id: string;
    attributeName: string;
    systemName?: string;
    attributeValues: Array<{
        value: string;
        label: string;
    }>;
}

interface Category {
    _id: string;
    name: string;
}

interface RuleAction {
    action: "SHOW" | "HIDE" | "SHOW_ONLY" | "SET_DEFAULT" | "QUANTITY";
    targetAttribute: string;
    allowedValues?: string[];
    defaultValue?: string;
    minQuantity?: number;
    maxQuantity?: number;
    stepQuantity?: number;
}

interface Rule {
    _id: string;
    name: string;
    scope: "GLOBAL" | "CATEGORY" | "PRODUCT";
    scopeRefId?: string; // ID of the category or product if scope is not GLOBAL
    applicableCategory?: string | Category; // For display/population
    applicableProduct?: string | Product; // For display/population
    when: {
        attribute: string; // Attribute ID
        value: string;
    };
    then: RuleAction[];
    priority: number;
    isActive: boolean;
}

interface ManageAttributeRulesProps {
    attributeTypes: AttributeType[];
    products: Product[];
    categories: Category[];
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSuccess: (success: string | null) => void;
}

const ManageAttributeRules: React.FC<ManageAttributeRulesProps> = ({
    attributeTypes,
    products,
    categories,
    setLoading,
    setError,
    setSuccess,
}) => {
    // Local State
    const [attributeRules, setAttributeRules] = useState<Rule[]>([]);
    const [loadingAttributeRules, setLoadingAttributeRules] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [showRuleBuilder, setShowRuleBuilder] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    // Search and Filter State
    const [attributeRuleSearch, setAttributeRuleSearch] = useState("");
    const [attributeRuleFilter, setAttributeRuleFilter] = useState(""); // Filter by "When" Attribute ID
    const [ruleActionTypeFilter, setRuleActionTypeFilter] = useState("");
    const [ruleStatusFilter, setRuleStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [ruleScopeFilter, setRuleScopeFilter] = useState<"all" | "global" | "product">("all");
    const [attributeRulePage, setAttributeRulePage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [ruleForm, setRuleForm] = useState({
        name: "",
        scope: "GLOBAL" as "GLOBAL" | "CATEGORY" | "PRODUCT",
        scopeRefId: "",
        when: {
            attribute: "",
            value: "",
        },
        then: [] as RuleAction[],
        priority: 0,
        isActive: true,
    });

    // Fetch Rules
    const fetchAttributeRules = async () => {
        setLoadingAttributeRules(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/attribute-rules`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error("Failed to fetch attribute rules");
            }
            const data = await response.json();
            setAttributeRules(Array.isArray(data) ? data : (data.data || []));
        } catch (err) {
            console.error("Error fetching attribute rules:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch attribute rules");
        } finally {
            setLoadingAttributeRules(false);
        }
    };

    useEffect(() => {
        fetchAttributeRules();
    }, []);

    // Handlers
    const handleRuleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Basic validation
            if (!ruleForm.name.trim()) throw new Error("Rule name is required");
            if (!ruleForm.when.attribute) throw new Error("Condition attribute is required");
            if (!ruleForm.when.value) throw new Error("Condition value is required");
            if (ruleForm.then.length === 0) throw new Error("At least one action is required");
            if (ruleForm.scope !== "GLOBAL" && !ruleForm.scopeRefId) {
                throw new Error(`Scope reference is required for ${ruleForm.scope} scope`);
            }

            // Validate actions
            ruleForm.then.forEach((action, index) => {
                if (action.action !== 'QUANTITY' && !action.targetAttribute) {
                    throw new Error(`Target attribute is required for action #${index + 1}`);
                }
            });

            const payload = {
                name: ruleForm.name,
                scope: ruleForm.scope,
                applicableCategory: ruleForm.scope === "CATEGORY" ? ruleForm.scopeRefId : undefined,
                applicableProduct: ruleForm.scope === "PRODUCT" ? ruleForm.scopeRefId : undefined,
                when: ruleForm.when,
                then: ruleForm.then,
                priority: ruleForm.priority,
                isActive: ruleForm.isActive,
            };

            const url = editingRuleId
                ? `${API_BASE_URL}/admin/attribute-rules/${editingRuleId}`
                : `${API_BASE_URL}/admin/attribute-rules`;
            const method = editingRuleId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${editingRuleId ? "update" : "create"} rule`);
            }

            setSuccess(editingRuleId ? "Rule updated successfully" : "Rule created successfully");
            setShowRuleBuilder(false);
            setEditingRuleId(null);
            setRuleForm({
                name: "",
                scope: "GLOBAL",
                scopeRefId: "",
                when: { attribute: "", value: "" },
                then: [],
                priority: 0,
                isActive: true,
            });
            fetchAttributeRules();
        } catch (err) {
            console.error("Error saving rule:", err);
            setError(err instanceof Error ? err.message : "Failed to save rule");
        } finally {
            setLoading(false);
        }
    };

    const handleEditRule = (rule: Rule) => {
        // Determine scope and scope ref ID from applicableCategory/applicableProduct
        let scope: "GLOBAL" | "CATEGORY" | "PRODUCT" = "GLOBAL";
        let scopeRefId = "";

        // Check if rule has applicableCategory
        if (rule.applicableCategory) {
            scope = "CATEGORY";
            scopeRefId = typeof rule.applicableCategory === 'object'
                ? (rule.applicableCategory as Category)?._id
                : rule.applicableCategory || "";
        }
        // Check if rule has applicableProduct  
        else if (rule.applicableProduct) {
            scope = "PRODUCT";
            scopeRefId = typeof rule.applicableProduct === 'object'
                ? (rule.applicableProduct as Product)?._id
                : rule.applicableProduct || "";
        }
        // If rule.scope is set, use it as fallback
        else if (rule.scope) {
            scope = rule.scope;
        }

        // Extract targetAttribute IDs from populated objects in then array
        const processedThenActions = (rule.then || []).map((action: any) => ({
            action: action.action,
            targetAttribute: typeof action.targetAttribute === 'object' && action.targetAttribute !== null
                ? action.targetAttribute._id
                : (action.targetAttribute || ""),
            allowedValues: action.allowedValues || [],
            defaultValue: action.defaultValue || "",
            minQuantity: action.minQuantity,
            maxQuantity: action.maxQuantity,
            stepQuantity: action.stepQuantity,
        }));

        setRuleForm({
            name: rule.name,
            scope: scope,
            scopeRefId: scopeRefId,
            when: {
                attribute: typeof rule.when.attribute === 'object' ? (rule.when.attribute as any)._id : rule.when.attribute,
                value: rule.when.value,
            },
            then: processedThenActions,
            priority: rule.priority || 0,
            isActive: rule.isActive,
        });
        setEditingRuleId(rule._id);
        setShowRuleBuilder(true);
    };

    const handleDuplicateRule = async (rule: Rule) => {
        setLoading(true);
        try {
            const payload = {
                ...rule,
                name: `${rule.name} (Copy)`,
                _id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                __v: undefined
            };

            // Prepare payload correctly (remove object references if populated)
            const sanitizedPayload = {
                name: `${rule.name} (Copy)`,
                scope: rule.scope,
                applicableCategory: typeof rule.applicableCategory === 'object' ? (rule.applicableCategory as any)?._id : rule.applicableCategory,
                applicableProduct: typeof rule.applicableProduct === 'object' ? (rule.applicableProduct as any)?._id : rule.applicableProduct,
                when: {
                    attribute: typeof rule.when.attribute === 'object' ? (rule.when.attribute as any)?._id : rule.when.attribute,
                    value: rule.when.value
                },
                then: (rule.then || []).map((action: any) => ({
                    action: action.action,
                    targetAttribute: typeof action.targetAttribute === 'object' && action.targetAttribute !== null
                        ? action.targetAttribute._id
                        : (action.targetAttribute || undefined),
                    allowedValues: action.allowedValues || [],
                    defaultValue: action.defaultValue || undefined,
                    minQuantity: action.minQuantity,
                    maxQuantity: action.maxQuantity,
                    stepQuantity: action.stepQuantity,
                })),
                priority: rule.priority,
                isActive: rule.isActive
            };

            const response = await fetch(`${API_BASE_URL}/admin/attribute-rules`, {
                method: "POST",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sanitizedPayload),
            });

            if (!response.ok) throw new Error("Failed to duplicate rule");

            setSuccess("Rule duplicated successfully");
            fetchAttributeRules();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to duplicate rule");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!window.confirm("Are you sure you want to delete this rule?")) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/attribute-rules/${ruleId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error("Failed to delete rule");
            setSuccess("Rule deleted successfully");
            fetchAttributeRules();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete rule");
        } finally {
            setLoading(false);
        }
    };

    const handleAddAction = () => {
        setRuleForm({
            ...ruleForm,
            then: [
                ...ruleForm.then,
                {
                    action: "SHOW",
                    targetAttribute: "",
                },
            ],
        });
    };

    const handleRemoveAction = (index: number) => {
        const newActions = [...ruleForm.then];
        newActions.splice(index, 1);
        setRuleForm({ ...ruleForm, then: newActions });
    };

    const handleActionChange = (index: number, field: keyof RuleAction, value: any) => {
        const newActions = [...ruleForm.then];
        newActions[index] = { ...newActions[index], [field]: value };

        // Clear allowedValues/defaultValue if action type changes to something incompatible
        if (field === 'action') {
            if (value === 'SHOW' || value === 'HIDE' || value === 'QUANTITY') {
                delete newActions[index].allowedValues;
                delete newActions[index].defaultValue;
            }

            // When QUANTITY action is selected, set default targetAttribute to Lamination
            if (value === 'QUANTITY') {
                const laminationAttr = attributeTypes.find(
                    attr => attr.attributeName?.toLowerCase() === 'lamination' ||
                        attr.systemName?.toLowerCase() === 'lamination'
                );
                if (laminationAttr) {
                    newActions[index].targetAttribute = laminationAttr._id;
                }
            }
        }

        setRuleForm({ ...ruleForm, then: newActions });
    };

    // Filter Logic
    const filteredAttributeRules = attributeRules.filter((rule) => {
        // Text Search
        const searchMatch = !attributeRuleSearch ||
            rule.name.toLowerCase().includes(attributeRuleSearch.toLowerCase());

        // Attribute Filter (When)
        let whenAttrId = "";
        if (typeof rule.when.attribute === 'object' && rule.when.attribute !== null) {
            whenAttrId = (rule.when.attribute as any)._id;
        } else {
            whenAttrId = rule.when.attribute;
        }
        const attrMatch = !attributeRuleFilter || whenAttrId === attributeRuleFilter;

        // Action Filter
        const actionMatch = !ruleActionTypeFilter ||
            rule.then.some(action => action.action === ruleActionTypeFilter);

        // Status Filter
        const statusMatch = ruleStatusFilter === "all" ||
            (ruleStatusFilter === "active" ? rule.isActive : !rule.isActive);

        // Scope Filter
        const scopeMatch = ruleScopeFilter === "all" ||
            (ruleScopeFilter === "global" ? rule.scope === "GLOBAL" :
                ruleScopeFilter === "product" ? rule.scope === "PRODUCT" : true);

        return searchMatch && attrMatch && actionMatch && statusMatch && scopeMatch;
    });

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case "SHOW": return <Eye size={14} className="text-emerald-500" />;
            case "HIDE": return <EyeOff size={14} className="text-rose-500" />;
            case "SHOW_ONLY": return <ListFilter size={14} className="text-amber-500" />;
            case "SET_DEFAULT": return <CheckCircle size={14} className="text-blue-500" />;
            case "QUANTITY": return <Grid3x3 size={14} className="text-purple-500" />;
            default: return <Zap size={14} className="text-gray-500" />;
        }
    };

    const getScopeIcon = (scope: string) => {
        switch (scope) {
            case "GLOBAL": return <Globe size={14} className="text-indigo-500" />;
            case "CATEGORY": return <Tag size={14} className="text-emerald-500" />;
            case "PRODUCT": return <Package size={14} className="text-amber-500" />;
            default: return <Cpu size={14} className="text-gray-500" />;
        }
    };

    const truncateText = (text: string | undefined | null, maxLength: number = 50) => {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const attributeOptions = React.useMemo(() => [
        { value: "", label: "All Attributes" },
        ...attributeTypes.map(attr => ({
            value: attr._id,
            label: attr.systemName || attr.attributeName
        }))
    ], [attributeTypes]);

    const actionOptions = [
        { value: "", label: "All Actions" },
        { value: "SHOW", label: "Show" },
        { value: "HIDE", label: "Hide" },
        { value: "SHOW_ONLY", label: "Show Only" },
        { value: "SET_DEFAULT", label: "Set Default" },
        { value: "QUANTITY", label: "Quantity" },
    ];

    const statusOptions = [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
    ];

    const scopeOptions = [
        { value: "all", label: "All Scopes" },
        { value: "global", label: "Global" },
        { value: "product", label: "Product" },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-6 border border-white/20 backdrop-blur-sm"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-lg">
                                <Zap size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                    Attribute Rules ({attributeRules.length})
                                </h2>
                                <p className="text-gray-600 mt-1">Define conditional logic for product attributes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditingRuleId(null);
                                setRuleForm({
                                    name: "",
                                    scope: "GLOBAL",
                                    scopeRefId: "",
                                    when: { attribute: "", value: "" },
                                    then: [],
                                    priority: 0,
                                    isActive: true,
                                });
                                setShowRuleBuilder(true);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            Create Rule
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Search and Filters */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            value={attributeRuleSearch}
                            onChange={(e) => setAttributeRuleSearch(e.target.value)}
                            placeholder="Search rules by name..."
                            className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 w-full hover:border-indigo-300"
                        />
                        <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">View:</span>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`px-3 py-1.5 rounded transition-all duration-300 ${viewMode === "list" ? "bg-white shadow-sm text-indigo-600" : "text-gray-600 hover:text-gray-900"}`}
                                >
                                    <ListFilter size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`px-3 py-1.5 rounded transition-all duration-300 ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-gray-600 hover:text-gray-900"}`}
                                >
                                    <Grid3x3 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1 pl-1">Attribute</label>
                        <SearchableDropdown
                            label="All Attributes"
                            value={attributeRuleFilter}
                            onChange={(value) => setAttributeRuleFilter(value as string)}
                            options={attributeOptions}
                            className="w-full"
                            searchPlaceholder="Search attributes..."
                            enableSearch={true}
                            buttonClassName="!border-gray-200 hover:!border-indigo-300"
                            dropdownClassName="!border-gray-200"
                            searchClassName="!border-gray-200 focus:!border-indigo-400 focus:!ring-indigo-500/30"
                            searchIconClassName="!text-indigo-600 !bg-indigo-50 hover:!bg-indigo-100"
                            scrollbarColor="#6366f1"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1 pl-1">Action Type</label>
                        <SearchableDropdown
                            label="All Actions"
                            value={ruleActionTypeFilter}
                            onChange={(value) => setRuleActionTypeFilter(value as string)}
                            options={actionOptions}
                            className="w-full"
                            searchPlaceholder="Search actions..."
                            enableSearch={true}
                            buttonClassName="!border-gray-200 hover:!border-indigo-300"
                            dropdownClassName="!border-gray-200"
                            searchClassName="!border-gray-200 focus:!border-indigo-400 focus:!ring-indigo-500/30"
                            searchIconClassName="!text-indigo-600 !bg-indigo-50 hover:!bg-indigo-100"
                            scrollbarColor="#6366f1"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1 pl-1">Status</label>
                        <SearchableDropdown
                            label="All Status"
                            value={ruleStatusFilter}
                            onChange={(value) => setRuleStatusFilter(value as any)}
                            options={statusOptions}
                            className="w-full"
                            searchPlaceholder="Search status..."
                            enableSearch={true}
                            buttonClassName="!border-gray-200 hover:!border-indigo-300"
                            dropdownClassName="!border-gray-200"
                            searchClassName="!border-gray-200 focus:!border-indigo-400 focus:!ring-indigo-500/30"
                            searchIconClassName="!text-indigo-600 !bg-indigo-50 hover:!bg-indigo-100"
                            scrollbarColor="#6366f1"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1 pl-1">Scope</label>
                        <SearchableDropdown
                            label="All Scopes"
                            value={ruleScopeFilter}
                            onChange={(value) => setRuleScopeFilter(value as any)}
                            options={scopeOptions}
                            className="w-full"
                            searchPlaceholder="Search scopes..."
                            enableSearch={true}
                            buttonClassName="!border-gray-200 hover:!border-indigo-300"
                            dropdownClassName="!border-gray-200"
                            searchClassName="!border-gray-200 focus:!border-indigo-400 focus:!ring-indigo-500/30"
                            searchIconClassName="!text-indigo-600 !bg-indigo-50 hover:!bg-indigo-100"
                            scrollbarColor="#6366f1"
                        />
                    </div>
                </div>

                {filteredAttributeRules.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-semibold text-indigo-600">{filteredAttributeRules.length}</span> of{" "}
                            <span className="font-semibold">{attributeRules.length}</span> rules
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Priority:</span>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((priority) => (
                                    <div
                                        key={priority}
                                        className={`w-2 h-2 rounded-full ${priority <= 3 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Loading State */}
            {loadingAttributeRules ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-16"
                >
                    <div className="text-center">
                        <div className="inline-flex p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full mb-4 animate-pulse">
                            <Loader size={32} className="text-indigo-500 animate-spin" />
                        </div>
                        <p className="text-gray-600">Loading attribute rules...</p>
                    </div>
                </motion.div>
            ) : attributeRules.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 bg-gradient-to-br from-gray-50/80 to-white rounded-2xl border border-gray-200"
                >
                    <div className="inline-flex p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-4">
                        <Zap size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Attribute Rules Found</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Create rules to define conditional logic for your product attributes.
                    </p>
                    <button
                        onClick={() => setShowRuleBuilder(true)}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create Your First Rule
                    </button>
                </motion.div>
            ) : (
                <>
                    {viewMode === "list" ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rule Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Scope</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Condition</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700" style={{ width: '140px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAttributeRules
                                            .slice((attributeRulePage - 1) * ITEMS_PER_PAGE, attributeRulePage * ITEMS_PER_PAGE)
                                            .map((rule) => {
                                                const validActions = (rule.then || []).filter((action) =>
                                                    action && (action.targetAttribute || action.action === 'QUANTITY')
                                                );

                                                let whenAttrId = "";
                                                if (typeof rule.when.attribute === 'object' && rule.when.attribute !== null) {
                                                    whenAttrId = (rule.when.attribute as any)._id;
                                                } else {
                                                    whenAttrId = rule.when.attribute;
                                                }
                                                const whenAttrObj = attributeTypes.find(at => at._id === whenAttrId);
                                                const whenAttrName = whenAttrObj ? (whenAttrObj.systemName || whenAttrObj.attributeName) : 'Unknown';

                                                const scopeLabel = rule.scope === "GLOBAL" ? "Global" :
                                                    rule.scope === "CATEGORY" ? `Category: ${typeof rule.applicableCategory === 'object' ? (rule.applicableCategory as any)?.name : 'ID: ' + rule.applicableCategory}` :
                                                        rule.scope === "PRODUCT" ? `Product: ${typeof rule.applicableProduct === 'object' ? (rule.applicableProduct as any)?.name : 'ID: ' + rule.applicableProduct}` : rule.scope;

                                                return (
                                                    <motion.tr
                                                        key={rule._id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-gray-100/30 transition-all duration-300 group h-20"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3 max-w-md">
                                                                <div className="flex-shrink-0 p-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                                                    <Zap size={16} className="text-indigo-600" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors duration-300 truncate"
                                                                            title={rule.name}
                                                                        >
                                                                            {truncateText(rule.name, 60)}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                            {validActions.length} action{validActions.length !== 1 ? 's' : ''}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {validActions.slice(0, 2).map((action, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded-full text-xs"
                                                                            >
                                                                                {getActionIcon(action.action)}
                                                                                <span className="text-gray-700 truncate max-w-[80px]">
                                                                                    {action.action.replace('_', ' ')}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                        {validActions.length > 2 && (
                                                                            <span className="text-xs text-gray-500">+{validActions.length - 2} more</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 max-w-xs">
                                                                {getScopeIcon(rule.scope)}
                                                                <span
                                                                    className="text-sm text-gray-700 truncate"
                                                                    title={scopeLabel}
                                                                >
                                                                    {truncateText(scopeLabel, 40)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-lg p-2.5">
                                                                <div className="flex items-center gap-1 text-sm flex-wrap">
                                                                    <span className="font-medium text-indigo-700 whitespace-nowrap">IF</span>
                                                                    <span className="text-gray-700 truncate max-w-[120px]" title={whenAttrName}>
                                                                        {whenAttrName}
                                                                    </span>
                                                                    <span className="text-gray-500">=</span>
                                                                    <span className="font-medium text-gray-800 truncate max-w-[100px]" title={rule.when?.value || ''}>
                                                                        {rule.when?.value || ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${rule.isActive
                                                                ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700'
                                                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
                                                                }`}>
                                                                {rule.isActive ? (
                                                                    <>
                                                                        <CheckCircle size={12} />
                                                                        Active
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <XCircle size={12} />
                                                                        Disabled
                                                                    </>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleEditRule(rule)}
                                                                    className="p-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600 rounded-lg hover:from-blue-100 hover:to-cyan-100 hover:scale-110 transition-all duration-300 group/btn"
                                                                    title="Edit rule"
                                                                >
                                                                    <Edit size={14} className="group-hover/btn:rotate-12 transition-transform duration-300" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDuplicateRule(rule)}
                                                                    className="p-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 rounded-lg hover:from-gray-100 hover:to-gray-200 hover:scale-110 transition-all duration-300 group/btn"
                                                                    title="Duplicate rule"
                                                                >
                                                                    <Copy size={14} className="group-hover/btn:scale-110 transition-transform duration-300" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRule(rule._id)}
                                                                    className="p-2 bg-gradient-to-r from-red-50 to-pink-50 text-red-500 rounded-lg hover:from-red-100 hover:to-pink-100 hover:scale-110 transition-all duration-300 group/btn"
                                                                    title="Delete rule"
                                                                >
                                                                    <Trash2 size={14} className="group-hover/btn:shake-animation" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {filteredAttributeRules
                                .slice((attributeRulePage - 1) * ITEMS_PER_PAGE, attributeRulePage * ITEMS_PER_PAGE)
                                .map((rule) => {
                                    const validActions = (rule.then || []).filter((action) =>
                                        action && (action.targetAttribute || action.action === 'QUANTITY')
                                    );

                                    let whenAttrId = "";
                                    if (typeof rule.when.attribute === 'object' && rule.when.attribute !== null) {
                                        whenAttrId = (rule.when.attribute as any)._id;
                                    } else {
                                        whenAttrId = rule.when.attribute;
                                    }
                                    const whenAttrObj = attributeTypes.find(at => at._id === whenAttrId);
                                    const whenAttrName = whenAttrObj ? (whenAttrObj.systemName || whenAttrObj.attributeName) : 'Unknown';

                                    return (
                                        <motion.div
                                            key={rule._id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                            className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group h-[180px] flex flex-col"
                                        >
                                            <div className="p-4 flex-1">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className="flex-shrink-0 p-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg">
                                                            <Zap size={16} className="text-indigo-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3
                                                                className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors duration-300 truncate"
                                                                title={rule.name}
                                                            >
                                                                {truncateText(rule.name, 40)}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {getScopeIcon(rule.scope)}
                                                                <span className="text-xs text-gray-500 truncate">
                                                                    {rule.scope === "GLOBAL" ? "Global" : "Specific"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${rule.isActive
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {rule.isActive ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>

                                                <div className="mb-3">
                                                    <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-lg p-2 mb-2">
                                                        <p className="text-sm text-gray-700 truncate">
                                                            <span className="font-medium text-indigo-700">IF</span>{" "}
                                                            {whenAttrName} = {rule.when?.value || ''}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {validActions.slice(0, 2).map((action, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs"
                                                            >
                                                                {getActionIcon(action.action)}
                                                                <span className="text-gray-700 truncate max-w-[60px]">
                                                                    {action.action.replace('_', ' ')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {validActions.length > 2 && (
                                                            <span className="text-xs text-gray-500">+{validActions.length - 2} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                                                <div className="text-xs text-gray-500">
                                                    {validActions.length} action{validActions.length !== 1 ? 's' : ''}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEditRule(rule)}
                                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicateRule(rule)}
                                                        className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Duplicate"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule._id)}
                                                        className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </motion.div>
                    )}

                    {/* Pagination */}
                    {filteredAttributeRules.length > ITEMS_PER_PAGE && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex justify-center mt-6"
                        >
                            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2">
                                <button
                                    onClick={() => setAttributeRulePage(Math.max(1, attributeRulePage - 1))}
                                    disabled={attributeRulePage === 1}
                                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-600">
                                    Page <span className="font-semibold text-indigo-600">{attributeRulePage}</span> of{" "}
                                    <span className="font-semibold">{Math.ceil(filteredAttributeRules.length / ITEMS_PER_PAGE)}</span>
                                </span>
                                <button
                                    onClick={() => setAttributeRulePage(Math.min(Math.ceil(filteredAttributeRules.length / ITEMS_PER_PAGE), attributeRulePage + 1))}
                                    disabled={attributeRulePage >= Math.ceil(filteredAttributeRules.length / ITEMS_PER_PAGE)}
                                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </>
            )}

            {/* Rule Builder Modal */}
            <AnimatePresence>
                {showRuleBuilder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        >
                            <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-6 flex justify-between items-center z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                                        <Zap size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                            {editingRuleId ? "Edit Rule" : "Create Rule"}
                                        </h3>
                                        <p className="text-sm text-gray-600">Define conditional logic for attributes</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRuleBuilder(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleRuleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
                                        <input
                                            type="text"
                                            value={ruleForm.name}
                                            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 hover:border-indigo-300"
                                            placeholder="e.g. Hide Finish when Material is Glossy"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                value={ruleForm.priority}
                                                onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
                                                className="flex-1"
                                            />
                                            <span className="text-sm font-medium text-indigo-600 min-w-[30px] text-center">
                                                {ruleForm.priority}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Higher priority rules run later</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Scope</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRuleForm({ ...ruleForm, scope: "GLOBAL" as any, scopeRefId: "" })}
                                                className={`px-4 py-3 rounded-xl border transition-all duration-300 ${ruleForm.scope === "GLOBAL"
                                                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 text-indigo-700'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <Globe size={18} className="mx-auto mb-1" />
                                                <span className="text-xs">Global</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRuleForm({ ...ruleForm, scope: "CATEGORY" as any })}
                                                className={`px-4 py-3 rounded-xl border transition-all duration-300 ${ruleForm.scope === "CATEGORY"
                                                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-700'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                                                    }`}
                                            >
                                                <Tag size={18} className="mx-auto mb-1" />
                                                <span className="text-xs">Category</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRuleForm({ ...ruleForm, scope: "PRODUCT" as any })}
                                                className={`px-4 py-3 rounded-xl border transition-all duration-300 ${ruleForm.scope === "PRODUCT"
                                                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-700'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                                                    }`}
                                            >
                                                <Package size={18} className="mx-auto mb-1" />
                                                <span className="text-xs">Product</span>
                                            </button>
                                        </div>
                                    </div>

                                    {ruleForm.scope === "CATEGORY" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
                                            <select
                                                value={ruleForm.scopeRefId}
                                                onChange={(e) => setRuleForm({ ...ruleForm, scopeRefId: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300 hover:border-emerald-300 bg-white"
                                                required
                                            >
                                                <option value="">Select Category...</option>
                                                {categories.map((cat) => (
                                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {ruleForm.scope === "PRODUCT" && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
                                            <select
                                                value={ruleForm.scopeRefId}
                                                onChange={(e) => setRuleForm({ ...ruleForm, scopeRefId: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all duration-300 hover:border-amber-300 bg-white"
                                                required
                                            >
                                                <option value="">Select Product...</option>
                                                {products.map((prod) => (
                                                    <option key={prod._id} value={prod._id}>{prod.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Condition Section */}
                                <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-5 rounded-xl border border-indigo-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                            <AlertCircle size={20} className="text-indigo-600" />
                                        </div>
                                        <h4 className="font-semibold text-gray-800">Condition (WHEN)</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Attribute</label>
                                            <select
                                                value={ruleForm.when.attribute}
                                                onChange={(e) => setRuleForm({
                                                    ...ruleForm,
                                                    when: { attribute: e.target.value, value: "" }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 hover:border-indigo-300 bg-white"
                                                required
                                            >
                                                <option value="">Select Attribute...</option>
                                                {attributeTypes.map((attr) => (
                                                    <option key={attr._id} value={attr._id}>{attr.systemName || attr.attributeName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Value Equals</label>
                                            <select
                                                value={ruleForm.when.value}
                                                onChange={(e) => setRuleForm({
                                                    ...ruleForm,
                                                    when: { ...ruleForm.when, value: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 hover:border-indigo-300 bg-white"
                                                required
                                                disabled={!ruleForm.when.attribute}
                                            >
                                                <option value="">Select Value...</option>
                                                {ruleForm.when.attribute && attributeTypes
                                                    .find(a => a._id === ruleForm.when.attribute)
                                                    ?.attributeValues.map((val) => (
                                                        <option key={val.value} value={val.value}>{val.label || val.value}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 p-5 rounded-xl border border-emerald-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg">
                                                <Zap size={20} className="text-emerald-600" />
                                            </div>
                                            <h4 className="font-semibold text-gray-800">Actions (THEN)</h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddAction}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 shadow-sm hover:shadow flex items-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Add Action
                                        </button>
                                    </div>

                                    {ruleForm.then.length === 0 && (
                                        <div className="text-center py-8 bg-white/50 rounded-lg border border-dashed border-emerald-200">
                                            <Zap size={32} className="text-emerald-400 mx-auto mb-3" />
                                            <p className="text-gray-600">No actions defined</p>
                                            <p className="text-sm text-gray-500 mt-1">Click "Add Action" to define what happens when the condition is met</p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {ruleForm.then.map((action, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white p-4 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all duration-300 relative group"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAction(index)}
                                                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-2">Action Type</label>
                                                        <select
                                                            value={action.action}
                                                            onChange={(e) => handleActionChange(index, "action", e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 text-sm"
                                                        >
                                                            <option value="SHOW">Show Attribute</option>
                                                            <option value="HIDE">Hide Attribute</option>
                                                            <option value="SHOW_ONLY">Show Only Options</option>
                                                            <option value="SET_DEFAULT">Set Default Value</option>
                                                            <option value="QUANTITY">Set Quantity Limits</option>
                                                        </select>
                                                    </div>

                                                    {action.action !== 'QUANTITY' && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-2">Target Attribute</label>
                                                            <AdminSearchableDropdown
                                                                label="Select Attribute..."
                                                                value={action.targetAttribute}
                                                                onChange={(value) => handleActionChange(index, "targetAttribute", value)}
                                                                options={attributeTypes
                                                                    .filter(a => a._id !== ruleForm.when.attribute)
                                                                    .map((attr) => ({
                                                                        value: attr._id,
                                                                        label: attr.systemName || attr.attributeName
                                                                    }))}
                                                                searchPlaceholder="Search attributes..."
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    {action.action === 'SHOW_ONLY' && action.targetAttribute && (
                                                        <div className="lg:col-span-3">
                                                            <label className="block text-xs font-medium text-gray-600 mb-2">Allowed Options</label>
                                                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                {attributeTypes.find(a => a._id === action.targetAttribute)?.attributeValues.map(val => (
                                                                    <label key={val.value} className="flex items-center gap-2 text-sm p-2 hover:bg-gray-50 rounded transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(action.allowedValues || []).includes(val.value)}
                                                                            onChange={(e) => {
                                                                                const current = action.allowedValues || [];
                                                                                let updated;
                                                                                if (e.target.checked) {
                                                                                    updated = [...current, val.value];
                                                                                } else {
                                                                                    updated = current.filter(v => v !== val.value);
                                                                                }
                                                                                handleActionChange(index, "allowedValues", updated);
                                                                            }}
                                                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500/30"
                                                                        />
                                                                        {val.label || val.value}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {action.action === 'SET_DEFAULT' && action.targetAttribute && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-600 mb-2">Default Value</label>
                                                            <select
                                                                value={action.defaultValue || ""}
                                                                onChange={(e) => handleActionChange(index, "defaultValue", e.target.value)}
                                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 text-sm"
                                                            >
                                                                <option value="">Select Value...</option>
                                                                {attributeTypes.find(a => a._id === action.targetAttribute)?.attributeValues.map(val => (
                                                                    <option key={val.value} value={val.value}>{val.label || val.value}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {action.action === 'QUANTITY' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-2">Min Quantity</label>
                                                                <input
                                                                    type="number"
                                                                    value={action.minQuantity || ""}
                                                                    onChange={(e) => handleActionChange(index, "minQuantity", parseInt(e.target.value) || 0)}
                                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 text-sm"
                                                                    placeholder="Min"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-2">Max Quantity</label>
                                                                <input
                                                                    type="number"
                                                                    value={action.maxQuantity || ""}
                                                                    onChange={(e) => handleActionChange(index, "maxQuantity", parseInt(e.target.value) || 0)}
                                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 text-sm"
                                                                    placeholder="Max"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-2">Step Quantity</label>
                                                                <input
                                                                    type="number"
                                                                    value={action.stepQuantity || ""}
                                                                    onChange={(e) => handleActionChange(index, "stepQuantity", parseInt(e.target.value) || 0)}
                                                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-300 text-sm"
                                                                    placeholder="Step"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="ruleActive"
                                        checked={ruleForm.isActive}
                                        onChange={(e) => setRuleForm({ ...ruleForm, isActive: e.target.checked })}
                                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500/30"
                                    />
                                    <label htmlFor="ruleActive" className="text-sm font-medium text-gray-700">
                                        <span className="font-semibold">Rule is Active</span>
                                        <span className="text-gray-500 text-xs ml-2">(Inactive rules won't be applied)</span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowRuleBuilder(false)}
                                        className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loadingAttributeRules}
                                        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 group"
                                    >
                                        {loadingAttributeRules ? (
                                            <>
                                                <Loader size={18} className="animate-spin" />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} className="group-hover:animate-pulse" />
                                                <span>{editingRuleId ? "Update Rule" : "Create Rule"}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageAttributeRules;