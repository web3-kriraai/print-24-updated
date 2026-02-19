import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import CKEditor from "../../../../components/CKEditor";
import { useClientOnly } from "../../../../hooks/useClientOnly";
import { useNavigate, useSearchParams } from "react-router-dom";
import BackButton from "../../../../components/BackButton";
import toast from "react-hot-toast";
import {
    Package,
    FolderPlus,
    Image as ImageIcon,
    UserPlus,
    Plus,
    X,
    Loader,
    CheckCircle,
    AlertCircle,
    Sliders,
    Eye,
    Trash2,
    Users,
    Edit,
    Settings,
    Download,
    ShoppingBag,
    Calendar,
    Truck,
    Check,
    XCircle,
    Info,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    CreditCard,
    Search,
    Building2,
    Play,
    Pause,
    Square,
    CheckCircle2,
    Clock,
    FileText,
    Copy,
    Briefcase,
    Filter,
    Globe,
    GripVertical,
    ChevronUp,
    Layers,
    AlertTriangle,
    ShieldAlert,
} from "lucide-react";
import { Pagination } from "../../../../components/Pagination";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewFilterDropdown } from "../../../../components/ReviewFilterDropdown";
import { SearchableDropdown } from "../../../../components/SearchableDropdown";

import CreateAttributeModal from "../attributes/CreateAttributeModal";
import { formatCurrency, formatNumberFull, calculateOrderBreakdown, OrderForCalculation } from "../../../../utils/pricing";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../../../../lib/apiConfig";
import { scrollToInvalidField } from "../../../../lib/validationUtils";
import HierarchicalCategorySelector from "../categories/HierarchicalCategorySelector";

// Interfaces (Duplicated from AdminDashboard to maintain "as is" logic)
interface Category {
    _id: string;
    name: string;
    description: string;
    type: string;
    image?: string;
    parent?: string | { _id: string } | null;
    sortOrder?: number;
    slug?: string;
}

interface Product {
    _id: string;
    name: string;
    slug?: string;
    description: string;
    basePrice: number;
    category?: string | { _id: string; name: string };
    subcategory?: string | {
        _id: string;
        name: string;
        category?: string | { _id: string; name: string };
    };
    image?: string;
}

interface AddProductFormProps {
    productForm: any;
    setProductForm: (form: any) => void;
    productFormErrors: any;
    setProductFormErrors: (errors: any) => void;
    isProductSlugManuallyEdited: boolean;
    setIsProductSlugManuallyEdited: (isEdited: boolean) => void;
    optionsTable: any[];
    setOptionsTable: (table: any[]) => void;
    printingOptionsTable: any[];
    setPrintingOptionsTable: (table: any[]) => void;
    deliverySpeedTable: any[];
    setDeliverySpeedTable: (table: any[]) => void;
    textureTypeTable: any[];
    setTextureTypeTable: (table: any[]) => void;
    filterPricesEnabled: boolean;
    setFilterPricesEnabled: (enabled: boolean) => void;
    selectedAttributeTypes: any[];
    setSelectedAttributeTypes: (types: any[]) => void;
    categories: Category[];
    subCategories: any[];
    subcategoriesByCategory: { [key: string]: any[] };
    nestedSubcategoriesByParent: { [key: string]: any[] };
    categoryChildrenMap: { [key: string]: Category[] };
    loading: boolean;
    setLoading: (loading: boolean) => void;
    error: string | null;
    setError: (error: string | null) => void;
    success: string | null;
    setSuccess: (success: string | null) => void;
    editingProductId: string | null;
    setEditingProductId: (id: string | null) => void;
    fetchProducts: (categoryId?: string) => Promise<void>;
    fetchCategoryProducts: (categoryId: string) => Promise<void>;
    fetchSubCategories: () => Promise<void>;
    fetchAttributeTypes: (categoryId?: string | null, subCategoryId?: string | null) => Promise<void>;
    fetchNestedSubCategories: (parentId: string) => Promise<void>;
    fetchSubCategoriesForCategory: (categoryId: string) => Promise<void>;
    fetchCategoryChildren: (categoryId: string) => Promise<void>;
    handleSubCategoryClick: (subCategoryId: string) => void;
    handleCategoryClick: (categoryId: string) => void;
    selectedCategory: string | null;
    selectedSubCategoryForView: string | null;
    setSubcategoryProducts: (products: Product[]) => void;
    selectedType: string;
    setSelectedType: (type: string) => void;
    setFilteredCategoriesByType: (categories: Category[]) => void;
    selectedCategoryPath: string[];
    setSelectedCategoryPath: (path: string[]) => void;
    setCategoryChildrenMap: (map: { [key: string]: Category[] }) => void;
    setFieldErrors: (errors: any) => void;
    attributeTypeForm: any;
    setAttributeTypeForm: (form: any) => void;
    attributeFormErrors: any;
    setAttributeFormErrors: (errors: any) => void;
    handleAttributeTypeSubmit: (e: React.FormEvent) => Promise<boolean>;
    handleCancelEdit: () => void;
    handleEditAttributeType: (id: string) => void;
    handleDeleteAttributeType: (id: string) => Promise<void>;
    showCreateAttributeModal: boolean;
    setShowCreateAttributeModal: (show: boolean) => void;
    editingAttributeTypeId: string | null;
    setEditingAttributeTypeId: (id: string | null) => void;
    updateUrl: (tab: string, action?: string, id?: string) => void;
    generateUniqueSlug: (baseSlug: string, excludeCategoryId?: string | null, excludeSubCategoryId?: string | null) => string;
    loadingCategoryChildren: { [key: string]: boolean };
    categoryProducts: Product[];
    setCategoryProducts: (products: Product[]) => void;
    loadingCategoryProducts: boolean;
    setLoadingCategoryProducts: (loading: boolean) => void;
    handleEditProduct: (productId: string) => void;

    attributeTypes: any[];
    loadingAttributeTypes: boolean;
    attributeTypeSearch: string;
    setAttributeTypeSearch: (search: string) => void;
    loadingSubcategories: boolean;
}

const AddProductForm: React.FC<AddProductFormProps> = ({
    productForm,
    setProductForm,
    productFormErrors,
    setProductFormErrors,
    isProductSlugManuallyEdited,
    setIsProductSlugManuallyEdited,
    optionsTable,
    setOptionsTable,
    printingOptionsTable,
    setPrintingOptionsTable,
    deliverySpeedTable,
    setDeliverySpeedTable,
    textureTypeTable,
    setTextureTypeTable,
    filterPricesEnabled,
    setFilterPricesEnabled,
    selectedAttributeTypes,
    setSelectedAttributeTypes,
    categories,
    subCategories,
    subcategoriesByCategory,
    nestedSubcategoriesByParent,
    categoryChildrenMap,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    editingProductId,
    setEditingProductId,
    fetchProducts,
    fetchCategoryProducts,
    fetchSubCategories,
    fetchAttributeTypes,
    fetchNestedSubCategories,
    fetchSubCategoriesForCategory,
    fetchCategoryChildren,
    handleSubCategoryClick,
    handleCategoryClick,
    selectedCategory,
    selectedSubCategoryForView,
    setSubcategoryProducts,
    selectedType,
    setSelectedType,
    setFilteredCategoriesByType,
    selectedCategoryPath,
    setSelectedCategoryPath,
    setCategoryChildrenMap,
    setFieldErrors,
    attributeTypeForm,
    setAttributeTypeForm,
    attributeFormErrors,
    setAttributeFormErrors,
    handleAttributeTypeSubmit,
    handleCancelEdit,
    handleEditAttributeType,
    handleDeleteAttributeType,
    showCreateAttributeModal,
    setShowCreateAttributeModal,
    editingAttributeTypeId,
    setEditingAttributeTypeId,
    updateUrl,
    generateUniqueSlug,
    loadingCategoryChildren,
    categoryProducts,
    setCategoryProducts,
    loadingCategoryProducts,
    setLoadingCategoryProducts,
    handleEditProduct,

    attributeTypes,
    loadingAttributeTypes,
    attributeTypeSearch,
    setAttributeTypeSearch,
    loadingSubcategories,
}) => {
    // Retry counter to prevent infinite loading - track fetch attempts per category
    const [fetchAttempts, setFetchAttempts] = React.useState<Record<string, number>>({});
    const MAX_FETCH_ATTEMPTS = 3;

    // Sub-attributes state
    const [subAttributes, setSubAttributes] = useState<any[]>([]);

    // Attribute usage popup state
    const [usagePopup, setUsagePopup] = useState<{ show: boolean; attributeName: string; productCount: number; productNames: string[] }>({
        show: false, attributeName: "", productCount: 0, productNames: []
    });

    // Fetch sub-attributes
    const fetchSubAttributes = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/sub-attributes?isEnabled=true`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                // Sort by displayOrder
                const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) =>
                    (a.displayOrder || 0) - (b.displayOrder || 0)
                );
                setSubAttributes(sorted);
            }
        } catch (error) {
            console.error("Error fetching sub-attributes:", error);
        }
    }, []);

    useEffect(() => {
        fetchSubAttributes();
    }, [fetchSubAttributes]);

    // Drag-and-drop state for configured attributes reordering
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    // Expanded state for attribute options panel
    const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

    // Drag-and-drop state for attribute options reordering
    const [optionDragState, setOptionDragState] = useState<{ parentAttrId: string; dragIndex: number | null; dragOverIndex: number | null } | null>(null);
    // Drag-and-drop state for sub-attributes reordering
    const [subAttrDragState, setSubAttrDragState] = useState<{ parentAttrId: string; parentValue: string; dragIndex: number | null; dragOverIndex: number | null } | null>(null);

    const toggleAttributeExpanded = useCallback((attributeTypeId: string) => {
        setExpandedAttributes(prev => {
            const next = new Set(prev);
            if (next.has(attributeTypeId)) {
                next.delete(attributeTypeId);
            } else {
                next.add(attributeTypeId);
            }
            return next;
        });
    }, []);

    const handleDragStart = useCallback((index: number) => {
        setDragIndex(index);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }
        const reordered = [...selectedAttributeTypes];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        // Update displayOrder to match new positions
        const withOrder = reordered.map((item, i) => ({ ...item, displayOrder: i }));
        setSelectedAttributeTypes(withOrder);
        setDragIndex(null);
        setDragOverIndex(null);
    }, [dragIndex, selectedAttributeTypes, setSelectedAttributeTypes]);

    const handleDragEnd = useCallback(() => {
        setDragIndex(null);
        setDragOverIndex(null);
    }, []);

    // --- Attribute Options Drag-and-Drop Handlers ---
    const handleOptionDragStart = useCallback((parentAttrId: string, idx: number) => {
        setOptionDragState({ parentAttrId, dragIndex: idx, dragOverIndex: null });
    }, []);

    const handleOptionDragOver = useCallback((e: React.DragEvent, parentAttrId: string, idx: number) => {
        e.preventDefault();
        setOptionDragState(prev => prev && prev.parentAttrId === parentAttrId ? { ...prev, dragOverIndex: idx } : prev);
    }, []);

    const handleOptionDrop = useCallback(async (e: React.DragEvent, parentAttrId: string, dropIndex: number, options: any[]) => {
        e.preventDefault();
        if (!optionDragState || optionDragState.parentAttrId !== parentAttrId || optionDragState.dragIndex === null || optionDragState.dragIndex === dropIndex) {
            setOptionDragState(null);
            return;
        }
        const reordered = [...options];
        const [moved] = reordered.splice(optionDragState.dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        setOptionDragState(null);

        // Persist to backend
        try {
            const orderedValues = reordered.map((o: any) => o.value || o.name || o.label);
            await fetch(`${API_BASE_URL}/attribute-types/${parentAttrId}/reorder-values`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(true) },
                body: JSON.stringify({ orderedValues }),
            });
            // Refresh attribute types to reflect new order
            fetchAttributeTypes(productForm.category, productForm.subcategory);
        } catch (err) {
            console.error('Error reordering attribute options:', err);
        }
    }, [optionDragState, fetchAttributeTypes, productForm.category, productForm.subcategory]);

    const handleOptionDragEnd = useCallback(() => {
        setOptionDragState(null);
    }, []);

    // --- Sub-Attribute Drag-and-Drop Handlers ---
    const handleSubAttrDragStart = useCallback((parentAttrId: string, parentValue: string, idx: number) => {
        setSubAttrDragState({ parentAttrId, parentValue, dragIndex: idx, dragOverIndex: null });
    }, []);

    const handleSubAttrDragOver = useCallback((e: React.DragEvent, parentAttrId: string, parentValue: string, idx: number) => {
        e.preventDefault();
        setSubAttrDragState(prev =>
            prev && prev.parentAttrId === parentAttrId && prev.parentValue === parentValue
                ? { ...prev, dragOverIndex: idx }
                : prev
        );
    }, []);

    const handleSubAttrDrop = useCallback(async (e: React.DragEvent, parentAttrId: string, parentValue: string, dropIndex: number, subs: any[]) => {
        e.preventDefault();
        if (!subAttrDragState || subAttrDragState.parentAttrId !== parentAttrId || subAttrDragState.parentValue !== parentValue || subAttrDragState.dragIndex === null || subAttrDragState.dragIndex === dropIndex) {
            setSubAttrDragState(null);
            return;
        }
        const reordered = [...subs];
        const [moved] = reordered.splice(subAttrDragState.dragIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        setSubAttrDragState(null);

        // Update local state immediately for visual feedback
        setSubAttributes(prev => {
            const otherSubs = prev.filter((sa: any) => {
                const parentId = typeof sa.parentAttribute === 'object' ? sa.parentAttribute._id : sa.parentAttribute;
                return !(parentId === parentAttrId && (sa.parentValue === parentValue));
            });
            return [...otherSubs, ...reordered.map((s: any, i: number) => ({ ...s, displayOrder: i }))];
        });

        // Persist to backend
        try {
            await fetch(`${API_BASE_URL}/admin/sub-attributes/reorder`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(true) },
                body: JSON.stringify({ subAttributes: reordered.map((s: any) => ({ _id: s._id })) }),
            });
        } catch (err) {
            console.error('Error reordering sub-attributes:', err);
        }
    }, [subAttrDragState]);

    const handleSubAttrDragEnd = useCallback(() => {
        setSubAttrDragState(null);
    }, []);

    // Helper functions
    const getAuthHeaders = (includeContentType = false) => {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        };

        if (includeContentType) {
            headers["Content-Type"] = "application/json";
        }

        return headers;
    };

    // Auto-load category children if category is selected but children not loaded (Critical for Edit Mode)
    useEffect(() => {
        if (productForm.category && (!categoryChildrenMap[productForm.category] || categoryChildrenMap[productForm.category].length === 0)) {
            const attempts = fetchAttempts[productForm.category] || 0;
            // Only fetch if we haven't already trying to load AND haven't exceeded max attempts
            if (!loadingCategoryChildren[productForm.category] && attempts < MAX_FETCH_ATTEMPTS) {
                console.log(`Auto-loading children for existing category selection (attempt ${attempts + 1}/${MAX_FETCH_ATTEMPTS}):`, productForm.category);
                setFetchAttempts(prev => ({ ...prev, [productForm.category]: attempts + 1 }));
                fetchCategoryChildren(productForm.category);
            } else if (attempts >= MAX_FETCH_ATTEMPTS) {
                console.log(`Max fetch attempts (${MAX_FETCH_ATTEMPTS}) reached for category:`, productForm.category);
            }
        }
    }, [productForm.category, categoryChildrenMap, loadingCategoryChildren, fetchCategoryChildren, fetchAttempts]);

    // Reset fetch attempts when category children are successfully loaded
    useEffect(() => {
        if (productForm.category && categoryChildrenMap[productForm.category] && categoryChildrenMap[productForm.category].length > 0) {
            // Successfully loaded children, reset the counter for this category
            setFetchAttempts(prev => {
                const updated = { ...prev };
                delete updated[productForm.category];
                return updated;
            });
        }
    }, [productForm.category, categoryChildrenMap]);

    // Initialize selectedType from product's category if not set (for Edit mode)
    useEffect(() => {
        if (!selectedType && productForm.category && categories.length > 0) {
            // Check if category is an object or ID
            const catId = typeof productForm.category === 'object' ? productForm.category._id : productForm.category;

            const currentCategory = categories.find(c => c._id === catId);
            if (currentCategory) {
                console.log("Initializing selectedType from category:", currentCategory.type);
                setSelectedType(currentCategory.type);
                setFilteredCategoriesByType(categories.filter(c => c.type === currentCategory.type));
            }
        }
    }, [productForm.category, categories, selectedType, setSelectedType, setFilteredCategoriesByType]);

    // Sync selectedCategoryPath with productForm when editing
    useEffect(() => {
        if (productForm.category) {
            const path = [productForm.category];
            if (productForm.subcategory) path.push(productForm.subcategory);
            if (productForm.nestedSubcategory) path.push(productForm.nestedSubcategory);

            // Only update if path is different to avoid infinite loops
            const currentPathStr = selectedCategoryPath.join(',');
            const newPathStr = path.join(',');

            if (currentPathStr !== newPathStr) {
                console.log("Syncing selectedCategoryPath from productForm:", path);
                setSelectedCategoryPath(path);
            }
        }
    }, [productForm.category, productForm.subcategory, productForm.nestedSubcategory, setSelectedCategoryPath, selectedCategoryPath]);

    // Fetch products when category/subcategory changes
    useEffect(() => {
        // Determine the most specific category ID selected
        let idToFetch = "";

        if (productForm.nestedSubcategory) {
            idToFetch = productForm.nestedSubcategory;
        } else if (productForm.subcategory) {
            idToFetch = productForm.subcategory;
        } else if (productForm.category) {
            idToFetch = productForm.category;
        }

        if (idToFetch) {
            fetchCategoryProducts(idToFetch);
        } else {
            // Clear if nothing selected (passing empty string usually clears it in the parent function)
            setCategoryProducts([]);
        }
    }, [productForm.category, productForm.subcategory, productForm.nestedSubcategory]);

    // Ensure category children are fetched when editing a product
    useEffect(() => {
        if (productForm.category && (!categoryChildrenMap[productForm.category] || categoryChildrenMap[productForm.category].length === 0)) {
            const attempts = fetchAttempts[productForm.category] || 0;
            // Only fetch if not already loading AND haven't exceeded max attempts
            if (!loadingCategoryChildren[productForm.category] && attempts < MAX_FETCH_ATTEMPTS) {
                console.log(`Fetching children for existing category (attempt ${attempts + 1}/${MAX_FETCH_ATTEMPTS}):`, productForm.category);
                setFetchAttempts(prev => ({ ...prev, [productForm.category]: attempts + 1 }));
                fetchCategoryChildren(productForm.category);
            } else if (attempts >= MAX_FETCH_ATTEMPTS) {
                console.log(`Max fetch attempts (${MAX_FETCH_ATTEMPTS}) reached for category:`, productForm.category);
            }
        }
    }, [productForm.category, categoryChildrenMap, fetchAttempts]);

    // Fix for nested subcategory selection: If a subcategory has a parent, treat it as a nested subcategory
    useEffect(() => {
        if (productForm.subcategory && !productForm.nestedSubcategory) {
            // Helper to find subcategory object
            const findSubcategory = (id: string) => {
                // Check in subCategories prop
                if (subCategories) {
                    const found = subCategories.find(s => s._id === id);
                    if (found) return found;
                }

                // Check in categoryChildrenMap
                if (categoryChildrenMap) {
                    for (const key in categoryChildrenMap) {
                        if (categoryChildrenMap[key]) {
                            const found = categoryChildrenMap[key].find(s => s._id === id);
                            if (found) return found;
                        }
                    }
                }
                return null;
            };

            const sub = findSubcategory(productForm.subcategory);

            // If subcategory exists and has a parent, it's a nested subcategory
            if (sub && sub.parent) {
                const parentId = typeof sub.parent === 'object' ? sub.parent._id : sub.parent;

                console.log("Auto-correcting nested subcategory assignment:", {
                    originalSub: productForm.subcategory,
                    newSub: parentId,
                    newNested: sub._id
                });

                const updates = {
                    ...productForm,
                    subcategory: parentId,
                    nestedSubcategory: sub._id
                };

                setProductForm(updates);

                // Also update the path if category is known
                if (productForm.category) {
                    setSelectedCategoryPath([productForm.category, parentId, sub._id]);
                }
            }
        }
    }, [productForm.subcategory, productForm.nestedSubcategory, subCategories, categoryChildrenMap]);

    const handleAddOptionRow = () => {
        setOptionsTable([
            ...optionsTable,
            { name: "", priceAdd: "", description: "", image: "" },
        ]);
    };

    const handleUpdateOptionRow = (
        index: number,
        field: string,
        value: string | number
    ) => {
        const updated = [...optionsTable];
        updated[index] = { ...updated[index], [field]: value };
        setOptionsTable(updated);
    };

    const handleRemoveOptionRow = (index: number) => {
        setOptionsTable(optionsTable.filter((_, i) => i !== index));
    };

    const handleAddFilterRow = (type: 'printingOption' | 'deliverySpeed' | 'textureType') => {
        const newItem = { name: '', priceAdd: filterPricesEnabled ? 0 : undefined };
        if (type === 'printingOption') {
            setPrintingOptionsTable([...printingOptionsTable, newItem]);
        } else if (type === 'deliverySpeed') {
            setDeliverySpeedTable([...deliverySpeedTable, newItem]);
        } else if (type === 'textureType') {
            setTextureTypeTable([...textureTypeTable, newItem]);
        }
    };

    const handleUpdateFilterRow = (
        type: 'printingOption' | 'deliverySpeed' | 'textureType',
        index: number,
        field: 'name' | 'priceAdd',
        value: string | number
    ) => {
        if (type === 'printingOption') {
            const updated = [...printingOptionsTable];
            updated[index] = { ...updated[index], [field]: field === 'priceAdd' ? (value === '' ? undefined : parseFloat(value as string) || 0) : value };
            setPrintingOptionsTable(updated);
        } else if (type === 'deliverySpeed') {
            const updated = [...deliverySpeedTable];
            updated[index] = { ...updated[index], [field]: field === 'priceAdd' ? (value === '' ? undefined : parseFloat(value as string) || 0) : value };
            setDeliverySpeedTable(updated);
        } else if (type === 'textureType') {
            const updated = [...textureTypeTable];
            updated[index] = { ...updated[index], [field]: field === 'priceAdd' ? (value === '' ? undefined : parseFloat(value as string) || 0) : value };
            setTextureTypeTable(updated);
        }
    };

    const handleRemoveFilterRow = (
        type: 'printingOption' | 'deliverySpeed' | 'textureType',
        index: number
    ) => {
        if (type === 'printingOption') {
            setPrintingOptionsTable(printingOptionsTable.filter((_, i) => i !== index));
        } else if (type === 'deliverySpeed') {
            setDeliverySpeedTable(deliverySpeedTable.filter((_, i) => i !== index));
        } else if (type === 'textureType') {
            setTextureTypeTable(textureTypeTable.filter((_, i) => i !== index));
        }
    };

    const handleConvertOptionsToJSON = () => {
        const jsonString = JSON.stringify(optionsTable, null, 2);
        alert(`JSON Format:\n\n${jsonString}`);
    };

    const handleLoadOptionsFromJSON = () => {
        try {
            if (productForm.options) {
                const parsed = JSON.parse(productForm.options);
                if (Array.isArray(parsed)) {
                    setOptionsTable(parsed);
                } else {
                    setError("Options must be an array");
                }
            }
        } catch (err) {
            setError("Invalid JSON format");
        }
    };

    // Main Submit Handler
    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        setError(null);
        setSuccess(null);
        // Clear previous errors
        setProductFormErrors({});

        try {
            // Validate required fields with auto-scroll and field-level errors
            let firstErrorField: string | null = null;
            let firstErrorId: string | null = null;
            const errors: typeof productFormErrors = {};

            if (!productForm.name || !productForm.name.trim()) {
                errors.name = "Product name is required";
                if (!firstErrorField) {
                    firstErrorField = "name";
                    firstErrorId = "product-name";
                }
            }

            if (!productForm.basePrice || !productForm.basePrice.toString().trim()) {
                errors.basePrice = "Base price is required";
                if (!firstErrorField) {
                    firstErrorField = "basePrice";
                    firstErrorId = "product-basePrice";
                }
            }

            // Validate category (required)
            if (!productForm.category) {
                errors.category = "Please select a category";
                if (!firstErrorField) {
                    firstErrorField = "category";
                    firstErrorId = "product-category";
                }
            }

            // Get type from selected category
            const selectedCategory = categories.find(cat => cat._id === productForm.category);
            if (!selectedCategory && productForm.category) {
                errors.category = "Selected category not found. Please select a valid category.";
                if (!firstErrorField) {
                    firstErrorField = "category";
                    firstErrorId = "product-category";
                }
            }

            // Category ID - always use the selected category (parent category)
            const categoryId = productForm.category;

            // Validate GST Percentage (required field marked with *)
            if (!productForm.gstPercentage || !productForm.gstPercentage.toString().trim()) {
                errors.gstPercentage = "GST % is required for invoice calculation";
                if (!firstErrorField) {
                    firstErrorField = "gstPercentage";
                    firstErrorId = "product-gstPercentage";
                }
            }

            // Validate Instructions (required field marked with *)
            if (!productForm.instructions || !productForm.instructions.trim()) {
                errors.instructions = "Instructions are required";
                if (!firstErrorField) {
                    firstErrorField = "instructions";
                    firstErrorId = "product-instructions";
                }
            }

            // If there are validation errors, show them and scroll to first error
            if (Object.keys(errors).length > 0) {
                setProductFormErrors(errors);
                setError("Please fix the errors below");
                setLoading(false);

                // Show toast with error summary
                const errorMessages = Object.values(errors).filter((msg): msg is string => !!msg);
                toast.error(
                    <div>
                        <div className="font-semibold">Please fix the following errors:</div>
                        <ul className="list-disc list-inside mt-1 text-sm">
                            {errorMessages.map((msg, idx) => (
                                <li key={idx}>{msg}</li>
                            ))}
                        </ul>
                    </div>,
                    { duration: 5000, position: "bottom-right" }
                );

                // Scroll to first error field
                if (firstErrorField && firstErrorId) {
                    scrollToInvalidField(firstErrorField, firstErrorId);
                }
                return;
            }

            // If using subcategory, validate it exists in SubCategory collection and belongs to selected category
            let subcategoryId: string | undefined = undefined;
            if (productForm.subcategory && productForm.subcategory.trim() !== "") {
                // Determine which subcategory ID to send to the backend
                // If nestedSubcategory is selected, send that; otherwise send subcategory
                const subcategoryToSend = productForm.nestedSubcategory || productForm.subcategory;

                // Find the subcategory in the subCategories list (from SubCategory collection)
                const selectedSubCategory = subCategories.find(
                    (sc) => sc._id === subcategoryToSend
                );

                if (!selectedSubCategory) {
                    // Also check in subcategoriesByCategory and nestedSubcategoriesByParent
                    let foundSubcategory: any = null;

                    // Check in subcategoriesByCategory
                    Object.values(subcategoriesByCategory).forEach((subs: any[]) => {
                        if (Array.isArray(subs)) {
                            const found = subs.find(sc => sc._id === subcategoryToSend);
                            if (found) foundSubcategory = found;
                        }
                    });

                    // Check in nestedSubcategoriesByParent
                    if (!foundSubcategory) {
                        Object.values(nestedSubcategoriesByParent).forEach((subs: any[]) => {
                            if (Array.isArray(subs)) {
                                const found = subs.find(sc => sc._id === subcategoryToSend);
                                if (found) foundSubcategory = found;
                            }
                        });
                    }

                    // Also check in categoryChildrenMap in case it's loaded there
                    if (!foundSubcategory) {
                        const allSubcategories: any[] = [];
                        Object.values(categoryChildrenMap).forEach((children: any[]) => {
                            if (Array.isArray(children)) {
                                allSubcategories.push(...children);
                            }
                        });
                        foundSubcategory = allSubcategories.find(sc => sc._id === subcategoryToSend);
                    }

                    if (!foundSubcategory) {
                        setError("Selected subcategory not found. Please select a valid subcategory.");
                        setLoading(false);
                        return;
                    }

                    // Verify subcategory belongs to the selected category
                    const subcategoryCategoryId = foundSubcategory.category
                        ? (typeof foundSubcategory.category === 'object' ? foundSubcategory.category._id : foundSubcategory.category)
                        : null;

                    if (subcategoryCategoryId !== categoryId) {
                        setError("Selected subcategory does not belong to the selected category. Please select a valid subcategory.");
                        setLoading(false);
                        return;
                    }

                    subcategoryId = foundSubcategory._id;
                } else {
                    // Verify subcategory belongs to the selected category
                    const subcategoryCategoryId = selectedSubCategory.category
                        ? (typeof selectedSubCategory.category === 'object' ? selectedSubCategory.category._id : selectedSubCategory.category)
                        : null;

                    if (subcategoryCategoryId !== categoryId) {
                        setError("Selected subcategory does not belong to the selected category. Please select a valid subcategory.");
                        setLoading(false);
                        return;
                    }

                    subcategoryId = selectedSubCategory._id;
                }
            }

            const formData = new FormData();
            formData.append("name", productForm.name);
            formData.append("shortDescription", productForm.shortDescription || "");
            if (productForm.slug) {
                formData.append("slug", productForm.slug);
            }
            formData.append("description", productForm.description || "");
            formData.append("basePrice", productForm.basePrice);

            // Append product image if provided
            if (productForm.image) {
                formData.append("image", productForm.image);
            }

            // Always append category (required field) - this is the parent category
            formData.append("category", categoryId);

            // For updates, always send subcategory (even if empty) to allow clearing it
            // For creates, only send if it's selected and not empty
            if (editingProductId) {
                // Update: explicitly send subcategory (empty string to clear, or value to set)
                formData.append("subcategory", subcategoryId && subcategoryId.trim() !== "" && subcategoryId !== "null" ? subcategoryId : "");
            } else {
                // Create: only append if it's selected and not empty
                if (subcategoryId && subcategoryId.trim() !== "" && subcategoryId !== "null") {
                    formData.append("subcategory", subcategoryId);
                }
            }

            // Parse description into array format for storage
            const descriptionLines = productForm.description
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line.length > 0);

            if (descriptionLines.length > 0) {
                formData.append("descriptionArray", JSON.stringify(descriptionLines));
            }

            // Append filters from tables
            const filtersToSend: any = {
                printingOption: [],
                orderQuantity: productForm.filters.orderQuantity,
                deliverySpeed: deliverySpeedTable.map(item => typeof item === 'string' ? item : item.name).filter(name => name.trim()),
                textureType: textureTypeTable.map(item => typeof item === 'string' ? item : item.name).filter(name => name.trim()),
                filterPricesEnabled: filterPricesEnabled,
            };

            // Add filter prices if enabled
            if (filterPricesEnabled) {
                filtersToSend.printingOptionPrices = [];
                filtersToSend.deliverySpeedPrices = deliverySpeedTable
                    .filter(item => typeof item === 'object' && item.name && item.name.trim())
                    .map(item => ({
                        name: item.name.trim(),
                        priceAdd: typeof item.priceAdd === 'number' ? item.priceAdd : (item.priceAdd ? parseFloat(item.priceAdd as string) || 0 : 0)
                    }));
                filtersToSend.textureTypePrices = textureTypeTable
                    .filter(item => typeof item === 'object' && item.name && item.name.trim())
                    .map(item => ({
                        name: item.name.trim(),
                        priceAdd: typeof item.priceAdd === 'number' ? item.priceAdd : (item.priceAdd ? parseFloat(item.priceAdd as string) || 0 : 0)
                    }));
            } else {
                filtersToSend.printingOptionPrices = [];
                filtersToSend.deliverySpeedPrices = [];
                filtersToSend.textureTypePrices = [];
            }

            formData.append("filters", JSON.stringify(filtersToSend));

            // Always use optionsTable if it has data, otherwise use JSON string
            const optionsToSend =
                optionsTable.length > 0
                    ? JSON.stringify(optionsTable)
                    : productForm.options;
            if (optionsToSend) {
                formData.append("options", optionsToSend);
            }

            // Append dynamic attributes
            const dynamicAttributesToSend = (selectedAttributeTypes && selectedAttributeTypes.length > 0)
                ? selectedAttributeTypes
                    .filter((sa) => sa && sa.attributeTypeId)
                    .map((sa) => ({
                        attributeType: sa.attributeTypeId,
                        isEnabled: sa.isEnabled !== undefined ? sa.isEnabled : true,
                        isRequired: sa.isRequired !== undefined ? sa.isRequired : false,
                        displayOrder: sa.displayOrder !== undefined ? sa.displayOrder : 0,
                        showPrice: sa.showPrice !== undefined ? sa.showPrice : true,
                        customValues: [],
                    }))
                : [];
            console.log('🔍 Sending dynamic attributes:', JSON.stringify(dynamicAttributesToSend, null, 2));
            formData.append("dynamicAttributes", JSON.stringify(dynamicAttributesToSend));

            // Append variants
            if (productForm.variants && productForm.variants.length > 0) {
                formData.append("variants", JSON.stringify(productForm.variants));
            }

            // Append quantity discounts
            if (productForm.quantityDiscounts && productForm.quantityDiscounts.length > 0) {
                const discountsToSend = productForm.quantityDiscounts
                    .filter((d: any) => d.minQuantity > 0 && d.discountPercentage > 0)
                    .map((d: any) => ({
                        minQuantity: d.minQuantity,
                        maxQuantity: d.maxQuantity,
                        discountPercentage: d.discountPercentage,
                        priceMultiplier: (100 - d.discountPercentage) / 100,
                    }));
                if (discountsToSend.length > 0) {
                    formData.append("quantityDiscounts", JSON.stringify(discountsToSend));
                }
            }

            // Append file upload constraints
            if (productForm.maxFileSizeMB) {
                formData.append("maxFileSizeMB", productForm.maxFileSizeMB);
            }
            if (productForm.minFileWidth) {
                formData.append("minFileWidth", productForm.minFileWidth);
            }
            if (productForm.maxFileWidth) {
                formData.append("maxFileWidth", productForm.maxFileWidth);
            }
            if (productForm.minFileHeight) {
                formData.append("minFileHeight", productForm.minFileHeight);
            }
            if (productForm.maxFileHeight) {
                formData.append("maxFileHeight", productForm.maxFileHeight);
            }
            formData.append("blockCDRandJPG", productForm.blockCDRandJPG ? "true" : "false");

            // Append additional charges and taxes
            if (productForm.additionalDesignCharge) {
                formData.append("additionalDesignCharge", productForm.additionalDesignCharge);
            }
            if (productForm.gstPercentage) {
                formData.append("gstPercentage", productForm.gstPercentage);
            }
            formData.append("showPriceIncludingGst", productForm.showPriceIncludingGst ? "true" : "false");
            formData.append("showAttributePrices", productForm.showAttributePrices ? "true" : "false");

            // Append custom instructions
            if (productForm.instructions) {
                formData.append("instructions", productForm.instructions);
            }

            // Append specialization
            if (productForm.specialization) {
                formData.append("specialization", productForm.specialization);
            }

            // Append production sequence
            if (productForm.productionSequence && productForm.productionSequence.length > 0) {
                formData.append("productionSequence", JSON.stringify(productForm.productionSequence));
            }

            const url = editingProductId
                ? `${API_BASE_URL}/products/${editingProductId}`
                : `${API_BASE_URL}/products`;
            const method = editingProductId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    ...getAuthHeaders(),
                },
                body: formData,
            });

            if (!response.ok) {
                const responseClone = response.clone();
                let errorMessage = "Failed to save product";
                const backendErrors: Record<string, string> = {};

                try {
                    const errorData = await responseClone.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;

                    if (errorMessage.toLowerCase().includes("name")) {
                        backendErrors.name = errorMessage;
                    } else if (errorMessage.toLowerCase().includes("price") || errorMessage.toLowerCase().includes("baseprice")) {
                        backendErrors.basePrice = errorMessage;
                    } else if (errorMessage.toLowerCase().includes("category")) {
                        backendErrors.category = errorMessage;
                    } else if (errorMessage.toLowerCase().includes("gst")) {
                        backendErrors.gstPercentage = errorMessage;
                    } else if (errorMessage.toLowerCase().includes("instruction")) {
                        backendErrors.instructions = errorMessage;
                    }
                } catch {
                    errorMessage = response.statusText || errorMessage;
                }

                if (Object.keys(backendErrors).length > 0) {
                    setFieldErrors(backendErrors);
                    const firstErrorField = Object.keys(backendErrors)[0];
                    scrollToInvalidField(firstErrorField, `product-${firstErrorField}`);
                }

                toast.error(errorMessage, {
                    duration: 5000,
                    position: "bottom-right",
                });

                setError(errorMessage);
                setLoading(false);
                return;
            }

            const data = await response.json();
            const createdCategoryId = categoryId;

            toast.success(`Product ${editingProductId ? "updated" : "created"} successfully!`, {
                duration: 3000,
                position: "bottom-right",
            });

            setSuccess(`Product ${editingProductId ? "updated" : "created"} successfully!`);
            setSelectedType("");
            setFilteredCategoriesByType([]);
            setSelectedCategoryPath([]);
            setCategoryChildrenMap({});
            setIsProductSlugManuallyEdited(false);
            setProductForm({
                name: "",
                shortDescription: "",
                slug: "",
                description: "",
                descriptionArray: [],
                basePrice: "",
                category: "",
                subcategory: "",
                nestedSubcategory: "",
                image: null,
                options: "",
                filters: {
                    printingOption: [],
                    orderQuantity: {
                        min: 1000,
                        max: 72000,
                        multiples: 1000,
                        quantityType: "SIMPLE" as "SIMPLE" | "STEP_WISE" | "RANGE_WISE",
                        stepWiseQuantities: [],
                        rangeWiseQuantities: []
                    },
                    deliverySpeed: [],
                    textureType: [],
                },
                quantityDiscounts: [],
                maxFileSizeMB: "",
                minFileWidth: "",
                maxFileWidth: "",
                minFileHeight: "",
                maxFileHeight: "",
                variants: [],
                blockCDRandJPG: false,
                additionalDesignCharge: "",
                gstPercentage: "",
                showPriceIncludingGst: false,
                showAttributePrices: true,
                instructions: "",
                specialization: "",
                productionSequence: [] as string[],
            });
            setOptionsTable([]);
            setFilterPricesEnabled(false);
            setPrintingOptionsTable([]);
            setDeliverySpeedTable([]);
            setTextureTypeTable([]);
            setSelectedAttributeTypes([]);
            setSubcategoryProducts([]);
            setEditingProductId(null);
            setFieldErrors({});

            if (createdCategoryId) {
                fetchProducts(createdCategoryId);
            } else {
                fetchProducts();
            }

            if (selectedCategory) {
                handleCategoryClick(typeof selectedCategory === 'string' ? selectedCategory : selectedCategory._id);
            }

            if (selectedSubCategoryForView) {
                handleSubCategoryClick(selectedSubCategoryForView);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${editingProductId ? "update" : "create"} product`);
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleProductSubmit(e);
                }}
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('.ckeditor-container') || target.closest('[data-ckeditor-button]')) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }}
                className="space-y-6"
            >
                {editingProductId && (
                    <div className="mb-4">
                        <BackButton
                            onClick={() => updateUrl("products")}
                            label="Back"
                            className="mb-4"
                        />
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <p className="text-sm text-blue-800 font-medium">
                                Editing Product: {productForm.name || "Loading..."}
                            </p>
                            <button
                                type="button"
                                onClick={() => updateUrl("products")}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                                Cancel Edit
                            </button>
                        </div>
                    </div>
                )}

                {/* Form Progress Indicator */}
                <div className="mb-6 p-4 bg-sky-50/50 backdrop-blur-sm border border-sky-100/60 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-800">Progress</span>
                        <span className="text-xs font-medium text-sky-600">
                            {(() => {
                                const requiredFields = [
                                    { value: productForm.name?.trim(), label: 'Product Name' },
                                    { value: productForm.basePrice, label: 'Base Price' },
                                    { value: productForm.category || productForm.subcategory, label: 'Category/Subcategory' },
                                    { value: productForm.gstPercentage, label: 'GST %' },
                                    { value: productForm.instructions?.trim(), label: 'Instructions' },
                                ];
                                const completed = requiredFields.filter(f => f.value).length;
                                return `${completed}/${requiredFields.length} completed`;
                            })()}
                        </span>
                    </div>
                    <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-sky-400 to-sky-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${(() => {
                                    const requiredFields = [
                                        productForm.name?.trim(),
                                        productForm.basePrice,
                                        productForm.category || productForm.subcategory,
                                        productForm.gstPercentage,
                                        productForm.instructions?.trim(),
                                    ];
                                    return (requiredFields.filter(Boolean).length / requiredFields.length) * 100;
                                })()}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Basic Information Section */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-white/70 backdrop-blur-md shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                            <Package size={20} />
                        </div>
                        Basic Information
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Product Name <span className="text-red-500">*</span>
                                <div className="group relative">
                                    <Info size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl backdrop-blur-md">
                                        Enter a clear, descriptive name that customers will see. This should be unique and searchable.
                                    </div>
                                </div>
                            </label>
                            <input
                                id="product-name"
                                name="name"
                                type="text"
                                required
                                value={productForm.name}
                                onChange={(e) => {
                                    const newName = e.target.value;
                                    const updates: any = { ...productForm, name: newName };

                                    if (!isProductSlugManuallyEdited) {
                                        updates.slug = newName
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, '-')
                                            .replace(/^-+|-+$/g, '');
                                    }

                                    setProductForm(updates);
                                    if (productFormErrors.name) {
                                        setProductFormErrors({ ...productFormErrors, name: undefined });
                                    }
                                }}
                                className={`w-full px-4 py-2.5 bg-white/50 border rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none ${productFormErrors.name ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                placeholder="e.g., Glossy Business Cards - Premium"
                                maxLength={100}
                            />

                            {productFormErrors.name && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    {productFormErrors.name}
                                </p>
                            )}
                            {productForm.name && productForm.name.length > 80 && (
                                <p className="text-xs text-yellow-600 mt-1">
                                    {100 - productForm.name.length} characters remaining
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Short Description
                                <div className="group relative">
                                    <Info size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl backdrop-blur-md">
                                        A brief description that appears below the product name on the detail page. Keep it concise (max 200 characters).
                                    </div>
                                </div>
                            </label>
                            <textarea
                                id="product-shortDescription"
                                name="shortDescription"
                                value={productForm.shortDescription || ""}
                                onChange={(e) => {
                                    setProductForm({
                                        ...productForm,
                                        shortDescription: e.target.value
                                    });
                                }}
                                className="w-full px-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none hover:border-slate-300 resize-none"
                                placeholder="e.g., Premium quality with vibrant colors and glossy finish"
                                maxLength={200}
                                rows={2}
                            />
                            {productForm.shortDescription && productForm.shortDescription.length > 150 && (
                                <p className="text-xs text-yellow-600 mt-1">
                                    {200 - productForm.shortDescription.length} characters remaining
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Slug (URL Friendly Name)
                                <div className="group relative">
                                    <Info size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl backdrop-blur-md">
                                        The URL-friendly version of the name. It will be automatically generated from the name but you can customize it if needed. Must be unique within the subcategory.
                                    </div>
                                </div>
                            </label>
                            <input
                                type="text"
                                value={productForm.slug}
                                onChange={(e) => {
                                    setIsProductSlugManuallyEdited(true);
                                    setProductForm({
                                        ...productForm,
                                        slug: e.target.value
                                            .toLowerCase()
                                            .replace(/[^a-z0-9-]/g, '')
                                    });
                                }}
                                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none font-mono text-sm"
                                placeholder="auto-generated-slug"
                            />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 border-l-2 border-sky-400 pl-2">
                                Preview: .../products/{productForm.slug || 'auto-generated-slug'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Description
                                <div className="group relative">
                                    <Info size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl backdrop-blur-md">
                                        Detailed product description that customers will see. Use formatting to make it readable and professional. You can insert images using the toolbar buttons.
                                    </div>
                                </div>
                            </label>
                            <CKEditor
                                value={productForm.description}
                                onChange={(html) =>
                                    setProductForm({
                                        ...productForm,
                                        description: html,
                                    })
                                }
                                placeholder="Enter product description. Use the toolbar to format text, insert images, and more."
                            />
                        </div>

                        {/* Product Image Upload */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                Product Image
                                <div className="group relative">
                                    <Info size={14} className="text-slate-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl backdrop-blur-md">
                                        Upload a product image that will be displayed to customers. Supported formats: JPG, PNG, WebP. Max size: 5MB.
                                    </div>
                                </div>
                            </label>
                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-purple-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-6 transition-all hover:bg-white/90">
                                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:border-sky-400/50 transition-colors group/upload">
                                            <input
                                                type="file"
                                                id="product-image-upload"
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                                                        if (!validTypes.includes(file.type)) {
                                                            setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
                                                            return;
                                                        }
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            setError("Image size must be less than 5MB.");
                                                            return;
                                                        }
                                                        setProductForm({ ...productForm, image: file });
                                                        setError(null);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="product-image-upload"
                                                className="flex flex-col items-center justify-center cursor-pointer w-full"
                                            >
                                                <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 mb-4 group-hover/upload:scale-110 group-hover/upload:bg-sky-100 transition-all shadow-sm border border-sky-100/50">
                                                    <Plus size={32} />
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 mb-1">Click to Upload</p>
                                                <p className="text-xs text-slate-400 font-medium italic">JPG, PNG, WebP (Max 5MB)</p>
                                            </label>
                                        </div>

                                        {/* Preview Container */}
                                        {(productForm.image || (editingProductId && productForm.existingImage)) && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-6 pt-6 border-t border-slate-100"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                                        {productForm.image ? 'Previewing New Image' : 'Current Product Image'}
                                                    </p>
                                                    {productForm.image && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setProductForm({ ...productForm, image: null });
                                                                // Also clear the input value so the same file can be re-selected
                                                                const input = document.getElementById('product-image-upload') as HTMLInputElement;
                                                                if (input) input.value = '';
                                                            }}
                                                            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                                        >
                                                            <X size={12} />
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="relative group/preview inline-block">
                                                    <div className="absolute inset-0 bg-sky-500/10 rounded-2xl opacity-0 group-hover/preview:opacity-100 transition-opacity z-10" />
                                                    <img
                                                        src={productForm.image ? URL.createObjectURL(productForm.image) : productForm.existingImage}
                                                        alt="Product Preview"
                                                        className="w-48 h-48 object-cover rounded-2xl border-4 border-white shadow-xl shadow-slate-200/50"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.src = "https://via.placeholder.com/150?text=Error+Loading+Image";
                                                        }}
                                                    />
                                                    {!productForm.image && (
                                                        <div className="mt-4 px-4 py-3 bg-sky-50/50 rounded-xl border border-sky-100/50 flex items-start gap-3">
                                                            <ImageIcon size={16} className="text-sky-500 shrink-0 mt-0.5" />
                                                            <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest leading-relaxed">
                                                                Showing existing image. Upload a new one above to replace it.
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Filters Section - Order Quantity and Other Options */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-slate-50/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                                <Sliders size={20} />
                            </div>
                            Product Filters
                        </h3>
                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-full border border-slate-200/50">
                            <Info size={14} className="text-sky-500" />
                            Use attributes for printing options
                        </div>
                    </div>

                    {/* Order Quantity Configuration */}
                    <div className="mb-8 p-6 bg-white/70 backdrop-blur-md rounded-xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Quantity Configuration <span className="text-red-500">*</span>
                            </label>
                            <div className="text-[10px] font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-2 py-1 rounded">
                                Production Settings
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Quantity Type Selection */}
                            <div className="flex flex-wrap gap-4">
                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all flex-1 min-w-[200px] ${(!productForm.filters.orderQuantity.quantityType || productForm.filters.orderQuantity.quantityType === 'SIMPLE') ? 'bg-sky-50 border-sky-200 ring-1 ring-sky-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="quantityType"
                                        value="SIMPLE"
                                        checked={!productForm.filters.orderQuantity.quantityType || productForm.filters.orderQuantity.quantityType === 'SIMPLE'}
                                        onChange={() => setProductForm({
                                            ...productForm,
                                            filters: {
                                                ...productForm.filters,
                                                orderQuantity: {
                                                    ...productForm.filters.orderQuantity,
                                                    quantityType: 'SIMPLE'
                                                }
                                            }
                                        })}
                                        className="hidden"
                                    />
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${(!productForm.filters.orderQuantity.quantityType || productForm.filters.orderQuantity.quantityType === 'SIMPLE') ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 bg-slate-50'}`}>
                                        {(!productForm.filters.orderQuantity.quantityType || productForm.filters.orderQuantity.quantityType === 'SIMPLE') ? <Check size={16} /> : <span className="w-2 h-2 rounded-full bg-slate-300" />}
                                    </div>
                                    <div>
                                        <span className={`block text-sm font-bold ${(!productForm.filters.orderQuantity.quantityType || productForm.filters.orderQuantity.quantityType === 'SIMPLE') ? 'text-sky-700' : 'text-slate-600'}`}>Simple Range</span>
                                        <span className="text-xs text-slate-500">Min, Max & Multiples</span>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all flex-1 min-w-[200px] ${productForm.filters.orderQuantity.quantityType === 'STEP_WISE' ? 'bg-sky-50 border-sky-200 ring-1 ring-sky-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input
                                        type="radio"
                                        name="quantityType"
                                        value="STEP_WISE"
                                        checked={productForm.filters.orderQuantity.quantityType === 'STEP_WISE'}
                                        onChange={() => setProductForm({
                                            ...productForm,
                                            filters: {
                                                ...productForm.filters,
                                                orderQuantity: {
                                                    ...productForm.filters.orderQuantity,
                                                    quantityType: 'STEP_WISE'
                                                }
                                            }
                                        })}
                                        className="hidden"
                                    />
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${productForm.filters.orderQuantity.quantityType === 'STEP_WISE' ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 bg-slate-50'}`}>
                                        {productForm.filters.orderQuantity.quantityType === 'STEP_WISE' ? <Check size={16} /> : <span className="w-2 h-2 rounded-full bg-slate-300" />}
                                    </div>
                                    <div>
                                        <span className={`block text-sm font-bold ${productForm.filters.orderQuantity.quantityType === 'STEP_WISE' ? 'text-sky-700' : 'text-slate-600'}`}>Step-wise Quantities</span>
                                        <span className="text-xs text-slate-500">Specific exact quantities</span>
                                    </div>
                                </label>
                            </div>

                            {/* Simple Configuration Inputs (Legacy) */}
                            {(!productForm.filters.orderQuantity.quantityType || productForm.filters.orderQuantity.quantityType === 'SIMPLE') && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">
                                            Min Quantity
                                        </label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={productForm.filters.orderQuantity.min}
                                            onChange={(e) =>
                                                setProductForm({
                                                    ...productForm,
                                                    filters: {
                                                        ...productForm.filters,
                                                        orderQuantity: {
                                                            ...productForm.filters.orderQuantity,
                                                            min: parseInt(e.target.value) || 0,
                                                        },
                                                    },
                                                })
                                            }
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">
                                            Max Quantity
                                        </label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={productForm.filters.orderQuantity.max}
                                            onChange={(e) =>
                                                setProductForm({
                                                    ...productForm,
                                                    filters: {
                                                        ...productForm.filters,
                                                        orderQuantity: {
                                                            ...productForm.filters.orderQuantity,
                                                            max: parseInt(e.target.value) || 0,
                                                        },
                                                    },
                                                })
                                            }
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2">
                                            Multiples Of
                                        </label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={productForm.filters.orderQuantity.multiples}
                                            onChange={(e) =>
                                                setProductForm({
                                                    ...productForm,
                                                    filters: {
                                                        ...productForm.filters,
                                                        orderQuantity: {
                                                            ...productForm.filters.orderQuantity,
                                                            multiples: parseInt(e.target.value) || 0,
                                                        },
                                                    },
                                                })
                                            }
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step-wise Configuration Inputs */}
                            {productForm.filters.orderQuantity.quantityType === 'STEP_WISE' && (
                                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            Defined Quantities
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentQuantities = productForm.filters.orderQuantity.stepWiseQuantities || [];
                                                const lastQty = currentQuantities.length > 0 ? Math.max(...currentQuantities) : 0;
                                                // Intelligent suggestion for next quantity
                                                let newQty = 1000;
                                                if (lastQty > 0) {
                                                    if (lastQty < 1000) newQty = lastQty + 100;
                                                    else if (lastQty < 5000) newQty = lastQty + 500;
                                                    else if (lastQty < 10000) newQty = lastQty + 1000;
                                                    else newQty = lastQty + 5000;
                                                }

                                                setProductForm({
                                                    ...productForm,
                                                    filters: {
                                                        ...productForm.filters,
                                                        orderQuantity: {
                                                            ...productForm.filters.orderQuantity,
                                                            stepWiseQuantities: [...currentQuantities, newQty]
                                                        }
                                                    }
                                                });
                                            }}
                                            className="text-xs font-bold text-sky-600 bg-sky-100 hover:bg-sky-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                        >
                                            <Plus size={14} />
                                            Add Quantity
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {!productForm.filters.orderQuantity.stepWiseQuantities || productForm.filters.orderQuantity.stepWiseQuantities.length === 0 ? (
                                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                                <p className="text-sm text-slate-400 italic mb-2">No quantities defined yet.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setProductForm({
                                                        ...productForm,
                                                        filters: {
                                                            ...productForm.filters,
                                                            orderQuantity: {
                                                                ...productForm.filters.orderQuantity,
                                                                stepWiseQuantities: [1000]
                                                            }
                                                        }
                                                    })}
                                                    className="text-sm font-semibold text-sky-500 hover:text-sky-600 hover:underline"
                                                >
                                                    Add First Quantity (1000)
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {(productForm.filters.orderQuantity.stepWiseQuantities || []).map((qty: number, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-white p-2 pl-3 rounded-lg border border-slate-200 shadow-sm group hover:border-sky-300 transition-colors">
                                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={qty}
                                                            onChange={(e) => {
                                                                const newQuantities = [...(productForm.filters.orderQuantity.stepWiseQuantities || [])];
                                                                newQuantities[idx] = parseInt(e.target.value) || 0;
                                                                setProductForm({
                                                                    ...productForm,
                                                                    filters: {
                                                                        ...productForm.filters,
                                                                        orderQuantity: {
                                                                            ...productForm.filters.orderQuantity,
                                                                            stepWiseQuantities: newQuantities
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-slate-700 font-mono"
                                                            placeholder="Qty"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newQuantities = [...(productForm.filters.orderQuantity.stepWiseQuantities || [])];
                                                                newQuantities.splice(idx, 1);
                                                                setProductForm({
                                                                    ...productForm,
                                                                    filters: {
                                                                        ...productForm.filters,
                                                                        orderQuantity: {
                                                                            ...productForm.filters.orderQuantity,
                                                                            stepWiseQuantities: newQuantities
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-60 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {(productForm.filters.orderQuantity.stepWiseQuantities?.length > 0) && (
                                        <p className="mt-3 text-[10px] text-slate-400 italic flex items-center gap-1.5">
                                            <Info size={12} />
                                            Quantities will be automatically sorted in ascending order when saving.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Delivery Speed Table */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Delivery Speed Options
                            </label>
                            <button
                                type="button"
                                onClick={() => handleAddFilterRow('deliverySpeed')}
                                className="px-4 py-2 bg-sky-500/90 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-sm shadow-sky-200"
                            >
                                <Plus size={14} />
                                Add Option
                            </button>
                        </div>
                        <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            {deliverySpeedTable.length === 0 ? (
                                <div className="p-10 text-center">
                                    <p className="text-xs font-medium text-slate-400 italic">
                                        No delivery speed options added. Click "Add Option" to start.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                                    Delivery Speed
                                                </th>
                                                {filterPricesEnabled && (
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                                        Price Add (per 1000 units)
                                                    </th>
                                                )}
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 w-20">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deliverySpeedTable.map((item, index) => {
                                                const itemName = typeof item === 'string' ? item : item.name;
                                                const itemPrice = typeof item === 'object' ? (item.priceAdd ?? 0) : 0;
                                                return (
                                                    <tr key={index} className="hover:bg-slate-50/30 transition-colors group">
                                                        <td className="px-4 py-3 border-b border-slate-100">
                                                            <input
                                                                type="text"
                                                                value={itemName}
                                                                onChange={(e) => handleUpdateFilterRow('deliverySpeed', index, 'name', e.target.value)}
                                                                className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                                placeholder="e.g., Standard"
                                                            />
                                                        </td>
                                                        {filterPricesEnabled && (
                                                            <td className="px-4 py-3 border-b border-slate-100">
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.000001"
                                                                        value={itemPrice}
                                                                        onChange={(e) => handleUpdateFilterRow('deliverySpeed', index, 'priceAdd', e.target.value)}
                                                                        className="w-full pl-7 pr-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all font-mono"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 border-b border-slate-100 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFilterRow('deliverySpeed', index)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Texture Type Table (Optional) */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Texture Type Options <span className="text-[10px] text-slate-400 font-medium normal-case">(optional)</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => handleAddFilterRow('textureType')}
                                className="px-4 py-2 bg-sky-500/90 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-sm shadow-sky-200"
                            >
                                <Plus size={14} />
                                Add Option
                            </button>
                        </div>
                        <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            {textureTypeTable.length === 0 ? (
                                <div className="p-10 text-center">
                                    <p className="text-xs font-medium text-slate-400 italic">
                                        No texture options added.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                                    Texture Type
                                                </th>
                                                {filterPricesEnabled && (
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                                        Price Add
                                                    </th>
                                                )}
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 w-20">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {textureTypeTable.map((item, index) => {
                                                const itemName = typeof item === 'string' ? item : item.name;
                                                const itemPrice = typeof item === 'object' ? (item.priceAdd ?? 0) : 0;
                                                return (
                                                    <tr key={index} className="hover:bg-slate-50/30 transition-colors group">
                                                        <td className="px-4 py-3 border-b border-slate-100">
                                                            <input
                                                                type="text"
                                                                value={itemName}
                                                                onChange={(e) => handleUpdateFilterRow('textureType', index, 'name', e.target.value)}
                                                                className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                                placeholder="e.g., Glossy"
                                                            />
                                                        </td>
                                                        {filterPricesEnabled && (
                                                            <td className="px-4 py-3 border-b border-slate-100">
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.000001"
                                                                        value={itemPrice}
                                                                        onChange={(e) => handleUpdateFilterRow('textureType', index, 'priceAdd', e.target.value)}
                                                                        className="w-full pl-7 pr-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all font-mono"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 border-b border-slate-100 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFilterRow('textureType', index)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quantity Based Discounts */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-white/70 backdrop-blur-md shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                            <CreditCard size={20} />
                        </div>
                        Quantity Based Discounts
                    </h3>
                    <div className="mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setProductForm({
                                    ...productForm,
                                    quantityDiscounts: [
                                        ...(productForm.quantityDiscounts || []),
                                        { minQuantity: 0, maxQuantity: 0, discountPercentage: 0 }
                                    ]
                                });
                            }}
                            className="px-4 py-2 bg-sky-500/90 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-sm shadow-sky-200"
                        >
                            <Plus size={14} />
                            Add Discount Tier
                        </button>
                    </div>

                    {productForm.quantityDiscounts && productForm.quantityDiscounts.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200/60 rounded-xl bg-white/50 backdrop-blur-sm">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Min Qty</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Max Qty</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Discount %</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productForm.quantityDiscounts.map((discount: any, index: number) => (
                                        <tr key={index} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-4 py-3 border-b border-slate-100">
                                                <input
                                                    type="number"
                                                    value={discount.minQuantity}
                                                    onChange={(e) => {
                                                        const updated = [...productForm.quantityDiscounts];
                                                        updated[index] = { ...updated[index], minQuantity: parseInt(e.target.value) || 0 };
                                                        setProductForm({ ...productForm, quantityDiscounts: updated });
                                                    }}
                                                    className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100">
                                                <input
                                                    type="number"
                                                    value={discount.maxQuantity}
                                                    onChange={(e) => {
                                                        const updated = [...productForm.quantityDiscounts];
                                                        updated[index] = { ...updated[index], maxQuantity: parseInt(e.target.value) || 0 };
                                                        setProductForm({ ...productForm, quantityDiscounts: updated });
                                                    }}
                                                    className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                />
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100">
                                                <div className="relative">
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                                                    <input
                                                        type="number"
                                                        value={discount.discountPercentage}
                                                        onChange={(e) => {
                                                            const updated = [...productForm.quantityDiscounts];
                                                            updated[index] = { ...updated[index], discountPercentage: parseFloat(e.target.value) || 0 };
                                                            setProductForm({ ...productForm, quantityDiscounts: updated });
                                                        }}
                                                        className="w-full pl-3 pr-8 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-100 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = productForm.quantityDiscounts.filter((_: any, i: number) => i !== index);
                                                        setProductForm({ ...productForm, quantityDiscounts: updated });
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                            {index < productForm.quantityDiscounts.length - 1 && (
                                                <div className="absolute left-1/2 -translate-x-1/2 h-4 w-px bg-slate-100 z-10" />
                                            )}
                                        </tr >
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p className="text-slate-400 text-xs font-medium italic">No discount tiers added.</p>
                        </div>
                    )}
                </div>

                {/* Pricing & Category */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-white/70 backdrop-blur-md shadow-sm relative z-20">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                            <FolderPlus size={20} />
                        </div>
                        Pricing & Category
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Base Price (per unit) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                    id="product-basePrice"
                                    type="number"
                                    required
                                    step="0.000001"
                                    value={productForm.basePrice}
                                    onChange={(e) => {
                                        setProductForm({ ...productForm, basePrice: e.target.value });
                                        if (productFormErrors.basePrice) {
                                            setProductFormErrors({ ...productFormErrors, basePrice: undefined });
                                        }
                                    }}
                                    className={`w-full pl-8 pr-4 py-2.5 bg-white border rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none ${productFormErrors.basePrice ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    placeholder="0.00"
                                />
                            </div>
                            {productFormErrors.basePrice && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    {productFormErrors.basePrice}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Type</label>
                            <ReviewFilterDropdown
                                label="Type"
                                value={selectedType}
                                onChange={(val) => {
                                    const newType = val as string;
                                    // Only update if changed
                                    if (newType === selectedType) return;

                                    setSelectedType(newType);
                                    if (newType) {
                                        const filtered = categories.filter(cat => cat.type === newType);
                                        setFilteredCategoriesByType(filtered);
                                    } else {
                                        setFilteredCategoriesByType([]);
                                    }

                                    setProductForm({
                                        ...productForm,
                                        category: "",
                                        subcategory: "",
                                        nestedSubcategory: ""
                                    });
                                    setSelectedCategoryPath([]);
                                    setCategoryChildrenMap({});
                                }}
                                className="w-full"
                                theme="blue"
                                options={[
                                    { value: "", label: "Select Type" },
                                    { value: "Digital", label: "Digital Print" },
                                    { value: "Bulk", label: "Bulk Print" },
                                ]}
                            />
                        </div>

                        {selectedType && (
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Category Selection <span className="text-red-500">*</span>
                                </label>

                                <div className="space-y-4">
                                    {/* Breadcrumbs for valid selection */}
                                    {selectedCategoryPath.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 backdrop-blur-sm">
                                            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Selected Path:</span>
                                            {selectedCategoryPath.map((id, index) => {
                                                let name = id;
                                                // Try to resolve name from id
                                                if (index === 0) {
                                                    const cat = categories.find(c => c._id === id);
                                                    if (cat) name = cat.name;
                                                } else {
                                                    // Look in children of MAIN category (index 0)
                                                    // Because categoryChildrenMap is keyed by the Main Category ID,
                                                    // and it contains a flattened list of ALL descendants.
                                                    const mainCategoryId = selectedCategoryPath[0];
                                                    const children = categoryChildrenMap[mainCategoryId] || [];
                                                    const child = children.find(c => c._id === id);
                                                    if (child) name = child.name;
                                                }

                                                return (
                                                    <React.Fragment key={index}>
                                                        {index > 0 && <ChevronRight size={12} className="text-slate-300" />}
                                                        <span className="text-slate-800">{name}</span>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Hierarchical Column View */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-64 border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-sm">
                                        <style>{`
                                            .slim-scrollbar::-webkit-scrollbar {
                                                width: 4px;
                                            }
                                            .slim-scrollbar::-webkit-scrollbar-track {
                                                background: transparent;
                                            }
                                            .slim-scrollbar::-webkit-scrollbar-thumb {
                                                background-color: #cbd5e1;
                                                border-radius: 20px;
                                            }
                                            .slim-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background-color: #94a3b8;
                                            }
                                        `}</style>
                                        {/* Column 1: Parent Categories */}
                                        <div className="border-r border-slate-100 overflow-y-auto slim-scrollbar">
                                            <div className="p-3 bg-slate-50 border-b border-slate-100 sticky top-0 font-bold text-[10px] text-slate-500 uppercase tracking-widest bg-opacity-90 backdrop-blur-md">
                                                Main Categories
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {categories
                                                    .filter(cat => cat.type === selectedType)
                                                    .map(category => (
                                                        <button
                                                            key={category._id}
                                                            type="button"
                                                            onClick={async () => {
                                                                console.log("Selecting category:", category);
                                                                // Select category
                                                                setProductForm({
                                                                    ...productForm,
                                                                    category: category._id,
                                                                    subcategory: "",
                                                                    nestedSubcategory: ""
                                                                });

                                                                // Update path
                                                                setSelectedCategoryPath([category._id]);

                                                                // Load children
                                                                await fetchCategoryChildren(category._id);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all flex items-center justify-between group ${productForm.category === category._id
                                                                ? 'bg-sky-500 text-white shadow-md shadow-sky-100'
                                                                : 'text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <span className="truncate">{category.name}</span>
                                                            <ChevronRight size={14} className={`transition-all ${productForm.category === category._id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Column 2: Subcategories */}
                                        <div className="border-r border-slate-100 overflow-y-auto bg-slate-50/20 slim-scrollbar">
                                            <div className="p-3 bg-slate-50 border-b border-slate-100 sticky top-0 font-bold text-[10px] text-slate-500 uppercase tracking-widest bg-opacity-90 backdrop-blur-md">
                                                Subcategories
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {!productForm.category ? (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase italic text-center py-8">Select a category first</p>
                                                ) : loadingCategoryChildren[productForm.category] ? (
                                                    <div className="flex justify-center py-8"><Loader className="animate-spin text-sky-400" size={20} /></div>
                                                ) : (categoryChildrenMap[productForm.category] || []).length === 0 ? (
                                                    null // Don't show message - it's normal for categories to have no subcategories
                                                ) : (
                                                    (categoryChildrenMap[productForm.category] || [])
                                                        .filter(sub => !sub.parent)
                                                        .map(sub => (
                                                            <button
                                                                key={sub._id}
                                                                type="button"
                                                                onClick={async () => {
                                                                    console.log("Selecting subcategory:", sub);
                                                                    // Select subcategory
                                                                    setProductForm({
                                                                        ...productForm,
                                                                        subcategory: sub._id,
                                                                        nestedSubcategory: ""
                                                                    });

                                                                    // Update path
                                                                    setSelectedCategoryPath([productForm.category, sub._id]);


                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all flex items-center justify-between group ${productForm.subcategory === sub._id
                                                                    ? 'bg-sky-500/90 text-white shadow-md shadow-sky-100'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <span className="truncate">{sub.name}</span>
                                                                <ChevronRight size={14} className={`transition-all ${productForm.subcategory === sub._id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                                                            </button>
                                                        ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Column 3: Nested Subcategories */}
                                        <div className="overflow-y-auto bg-white slim-scrollbar">
                                            <div className="p-3 bg-slate-50 border-b border-slate-100 sticky top-0 font-bold text-[10px] text-slate-500 uppercase tracking-widest bg-opacity-90 backdrop-blur-md">
                                                Nested Subcategories
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {!productForm.subcategory ? (
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase italic text-center py-8">Select a subcategory first</p>
                                                ) : loadingCategoryChildren[productForm.category] ? (
                                                    <div className="flex justify-center py-8"><Loader className="animate-spin text-sky-400" size={20} /></div>
                                                ) : (categoryChildrenMap[productForm.category] || []).filter(n => {
                                                    const pId = typeof n.parent === 'object' ? n.parent?._id : n.parent;
                                                    return pId === productForm.subcategory;
                                                }).length === 0 ? (
                                                    null // Don't show message - it's normal for subcategories to have no nested items
                                                ) : (
                                                    (categoryChildrenMap[productForm.category] || [])
                                                        .filter(nested => {
                                                            const parentId = typeof nested.parent === 'object' ? nested.parent?._id : nested.parent;
                                                            return parentId === productForm.subcategory;
                                                        })
                                                        .map(nested => (
                                                            <button
                                                                key={nested._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    // Select nested subcategory
                                                                    setProductForm({
                                                                        ...productForm,
                                                                        nestedSubcategory: nested._id
                                                                    });

                                                                    // Update path
                                                                    if (productForm.category && productForm.subcategory) {
                                                                        setSelectedCategoryPath([productForm.category, productForm.subcategory, nested._id]);
                                                                    }
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all flex items-center justify-between group ${productForm.nestedSubcategory === nested._id
                                                                    ? 'bg-sky-500/80 text-white shadow-md shadow-sky-100'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <span className="truncate">{nested.name}</span>
                                                                {productForm.nestedSubcategory === nested._id && <Check size={14} className="text-white" />}
                                                            </button>
                                                        ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message for Category */}
                                    {productFormErrors.category && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertCircle size={12} />
                                            {productFormErrors.category}
                                        </p>
                                    )}

                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-2 px-1">
                                        <Info size={12} className="text-sky-500" />
                                        Navigate through columns to select the specific category level for your product.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Show existing products in selected category */}
                    {productForm.category && (
                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShoppingBag size={14} className="text-sky-500" />
                                Existing Products in Category
                            </h4>
                            {loadingCategoryProducts ? (
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <Loader className="animate-spin" size={16} />
                                    Loading...
                                </div>
                            ) : categoryProducts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {categoryProducts.map(prod => (
                                        <div
                                            key={prod._id}
                                            onClick={() => handleEditProduct(prod._id)}
                                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200/60 rounded-xl hover:border-sky-300 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="w-10 h-10 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
                                                {prod.image ? (
                                                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                        <Package size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                                                <p className="text-[10px] font-bold text-sky-600">
                                                    ₹{formatNumberFull(prod.basePrice)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No existing products found.</p>
                            )}
                        </div>
                    )}
                </div>
                {/* Product Options (Legacy) */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-white/70 backdrop-blur-md shadow-sm relative z-10">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                            <Settings size={20} />
                        </div>
                        Product Options (Legacy)
                    </h3>

                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Options Table
                            </label>
                            <button
                                type="button"
                                onClick={handleAddOptionRow}
                                className="px-4 py-2 bg-sky-500/90 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-sm shadow-sky-200"
                            >
                                <Plus size={14} />
                                Add Option
                            </button>
                        </div>
                        <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm shadow-sm">
                            {optionsTable.length === 0 ? (
                                <div className="p-10 text-center">
                                    <p className="text-xs font-medium text-slate-400 italic">
                                        No options added. Use the table or paste JSON above.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Name</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Price Add</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Description</th>
                                                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 w-20">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {optionsTable.map((option: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50/30 transition-colors group">
                                                    <td className="px-4 py-3 border-b border-slate-100">
                                                        <input
                                                            type="text"
                                                            value={option.name}
                                                            onChange={(e) => handleUpdateOptionRow(index, "name", e.target.value)}
                                                            className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-slate-100">
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                                            <input
                                                                type="text"
                                                                value={option.priceAdd}
                                                                onChange={(e) => handleUpdateOptionRow(index, "priceAdd", e.target.value)}
                                                                className="w-full pl-7 pr-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-slate-100">
                                                        <input
                                                            type="text"
                                                            value={option.description}
                                                            onChange={(e) => handleUpdateOptionRow(index, "description", e.target.value)}
                                                            className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-slate-100">
                                                        <input
                                                            type="text"
                                                            value={option.image}
                                                            onChange={(e) => handleUpdateOptionRow(index, "image", e.target.value)}
                                                            className="w-full px-3 py-2 bg-transparent border border-slate-200/60 rounded-lg text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-b border-slate-100 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveOptionRow(index)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* File Upload Constraints & Additional Settings */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-white/70 backdrop-blur-md shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                            <Settings size={20} />
                        </div>
                        Upload Constraints & Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Max File Size (MB)
                            </label>
                            <input
                                type="number"
                                value={productForm.maxFileSizeMB}
                                onChange={(e) => setProductForm({ ...productForm, maxFileSizeMB: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                placeholder="e.g., 50"
                            />
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <div
                                onClick={() => setProductForm({ ...productForm, blockCDRandJPG: !productForm.blockCDRandJPG })}
                                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${productForm.blockCDRandJPG ? 'bg-red-500 shadow-inner' : 'bg-slate-300'}`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${productForm.blockCDRandJPG ? 'translate-x-6' : 'translate-x-0'}`}
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Block CDR and JPG files (PDF/AI/PSD/EPS only)
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Min File Width (px or cm/mm)
                            </label>
                            <input
                                type="text"
                                value={productForm.minFileWidth}
                                onChange={(e) => setProductForm({ ...productForm, minFileWidth: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                placeholder="e.g., 1000"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Min File Height (px or cm/mm)
                            </label>
                            <input
                                type="text"
                                value={productForm.minFileHeight}
                                onChange={(e) => setProductForm({ ...productForm, minFileHeight: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                placeholder="e.g., 1000"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Max File Width (px or cm/mm)
                            </label>
                            <input
                                type="text"
                                value={productForm.maxFileWidth}
                                onChange={(e) => setProductForm({ ...productForm, maxFileWidth: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                placeholder="e.g., 5000"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Max File Height (px or cm/mm)
                            </label>
                            <input
                                type="text"
                                value={productForm.maxFileHeight}
                                onChange={(e) => setProductForm({ ...productForm, maxFileHeight: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                placeholder="e.g., 5000"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Additional Design Charge
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={productForm.additionalDesignCharge}
                                    onChange={(e) => setProductForm({ ...productForm, additionalDesignCharge: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                GST Percentage (%) <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="product-gstPercentage"
                                type="number"
                                required
                                value={productForm.gstPercentage}
                                onChange={(e) => {
                                    setProductForm({ ...productForm, gstPercentage: e.target.value });
                                    if (productFormErrors.gstPercentage) {
                                        setProductFormErrors({ ...productFormErrors, gstPercentage: undefined });
                                    }
                                }}
                                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none ${productFormErrors.gstPercentage ? 'border-red-300 bg-red-50/50' : 'border-slate-200 bg-white'
                                    }`}
                                placeholder="e.g., 18"
                            />
                            {productFormErrors.gstPercentage && (
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2 flex items-center gap-1.5 ml-1">
                                    <AlertCircle size={14} />
                                    {productFormErrors.gstPercentage}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <div
                                onClick={() => setProductForm({ ...productForm, showPriceIncludingGst: !productForm.showPriceIncludingGst })}
                                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${productForm.showPriceIncludingGst ? 'bg-sky-500 shadow-inner' : 'bg-slate-300'}`}
                            >
                                <div
                                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${productForm.showPriceIncludingGst ? 'translate-x-6' : 'translate-x-0'}`}
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Show Price Including GST
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            Custom Instructions (Note for Customer) <span className="text-red-500">*</span>
                            <Info size={14} className="text-sky-500" />
                        </label>
                        <CKEditor
                            value={productForm.instructions}
                            onChange={(html) => {
                                setProductForm({
                                    ...productForm,
                                    instructions: html,
                                    // Also update existing error if any
                                });
                                if (productFormErrors?.instructions) {
                                    setProductFormErrors({ ...productFormErrors, instructions: undefined });
                                }
                            }}
                            placeholder="Enter instructions for the customer regarding file uploads or design..."
                        />
                        {productFormErrors.instructions && (
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-2 flex items-center gap-1.5 ml-1">
                                <AlertCircle size={14} />
                                {productFormErrors.instructions}
                            </p>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                            Product Specialization
                            <Info size={14} className="text-sky-500" />
                        </label>
                        <CKEditor
                            value={productForm.specialization}
                            onChange={(html) => {
                                setProductForm({
                                    ...productForm,
                                    specialization: html,
                                });
                            }}
                            placeholder="Enter product specialization, special features, or highlights..."
                        />
                    </div>
                </div>



                {/* Product Attributes (Advanced) */}
                <div className="border border-slate-200/60 rounded-xl p-6 bg-white/70 backdrop-blur-md shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50">
                                <Sliders size={20} />
                            </div>
                            Product Attributes
                        </h3>
                        <button
                            type="button"
                            onClick={() => {
                                // Pre-populate categories from current product context
                                const categoriesToApply = [];
                                const subCategoriesToApply = [];

                                if (productForm.category) {
                                    categoriesToApply.push(productForm.category);
                                }
                                if (productForm.subcategory) {
                                    subCategoriesToApply.push(productForm.subcategory);
                                }

                                // Update attribute form with current product's categories
                                setAttributeTypeForm(prev => ({
                                    ...prev,
                                    applicableCategories: categoriesToApply,
                                    applicableSubCategories: subCategoriesToApply,
                                    // Set as common attribute by default, or category-specific if category is selected
                                    isCommonAttribute: categoriesToApply.length === 0
                                }));

                                // Open the create attribute modal
                                setShowCreateAttributeModal(true);
                            }}
                            className="px-4 py-2.5 bg-sky-500/90 text-white text-xs font-bold rounded-xl hover:bg-sky-600 transition-all flex items-center gap-2 shadow-lg shadow-sky-100"
                        >
                            <Plus size={14} />
                            Create New Attribute Type
                        </button>
                    </div>

                    <div className="mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                        <Info size={18} className="text-sky-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                            Select dynamic attributes for this product (e.g., Paper Type, Lamination, Corner Cutting).
                            Configure their visibility and requirement status.
                        </p>
                    </div>

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Add Attribute to Product
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={attributeTypeSearch}
                                onChange={(e) => setAttributeTypeSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 transition-all outline-none text-sm placeholder:text-slate-400"
                                placeholder="Search available attributes..."
                            />
                        </div>

                        {loadingAttributeTypes ? (
                            <div className="text-center py-10">
                                <Loader className="animate-spin text-sky-500 mx-auto mb-2" size={24} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading attributes...</p>
                            </div>
                        ) : (
                            <div className="border border-slate-100 rounded-xl max-h-64 overflow-y-auto p-2 bg-slate-50/50 backdrop-blur-sm shadow-inner custom-scrollbar mt-4">
                                {attributeTypes
                                    .filter(at => {
                                        const searchLower = (attributeTypeSearch || "").toLowerCase();
                                        const name = (at.attributeName || "").toLowerCase();
                                        const systemName = (at.systemName || "").toLowerCase();
                                        return (
                                            !selectedAttributeTypes.some(sa => sa.attributeTypeId === at._id) &&
                                            (name.includes(searchLower) || systemName.includes(searchLower))
                                        );
                                    })
                                    .map(at => (
                                        <div key={at._id} className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm group/item mb-1">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                    {at.systemName ? `${at.systemName} ${at.attributeName ? `(${at.attributeName})` : ''}` : at.attributeName}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {at.inputStyle} • {at.attributeValues?.length || 0} options
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        // Check if attribute is used in any products before allowing edit
                                                        try {
                                                            const res = await fetch(`${API_BASE_URL}/attribute-types/${at._id}/check-usage`, {
                                                                headers: getAuthHeaders(),
                                                            });
                                                            const data = await res.json();
                                                            if (data.isInUse) {
                                                                setUsagePopup({
                                                                    show: true,
                                                                    attributeName: at.attributeName || at.systemName,
                                                                    productCount: data.productCount,
                                                                    productNames: data.productNames || []
                                                                });
                                                                return;
                                                            }
                                                        } catch (err) {
                                                            console.error("Error checking attribute usage:", err);
                                                        }
                                                        // Save scroll position to prevent autoscroll on state update
                                                        const savedScrollY = window.scrollY;
                                                        setEditingAttributeTypeId(at._id);
                                                        await handleEditAttributeType(at._id);
                                                        setShowCreateAttributeModal(true);
                                                        // Restore scroll position after state updates cause re-render
                                                        requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
                                                    title="Edit Attribute Type Definition"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAttributeTypes([
                                                            ...selectedAttributeTypes,
                                                            {
                                                                attributeTypeId: at._id,
                                                                name: at.systemName ? `${at.systemName}${at.attributeName ? ` (${at.attributeName})` : ''}` : at.attributeName, // Local display only
                                                                isEnabled: true,
                                                                isRequired: at.isRequired || false,
                                                                displayOrder: selectedAttributeTypes.length,
                                                            }
                                                        ]);
                                                    }}
                                                    className="px-3 py-1.5 text-[10px] font-bold bg-white text-sky-600 border border-sky-100 rounded-lg hover:bg-sky-500 hover:text-white transition-all uppercase tracking-widest shadow-sm shadow-sky-50"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                {attributeTypes.length === 0 && (
                                    <div className="p-4 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No attributes found.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Selected Attributes List */}
                    <div className="space-y-6">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                            Configured Attributes ({selectedAttributeTypes.length})
                        </label>
                        {selectedAttributeTypes.length === 0 ? (
                            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                <p className="text-slate-400 text-xs font-medium italic">No attributes configured for this product.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedAttributeTypes.map((sa, index) => {
                                    // Find the full attribute definition for details
                                    const def = attributeTypes.find(at => at._id === sa.attributeTypeId);
                                    const isExpanded = expandedAttributes.has(sa.attributeTypeId);
                                    const isDragging = dragIndex === index;
                                    const isDragOver = dragOverIndex === index;
                                    // Collect options from the attribute definition
                                    const options: any[] = def?.attributeOptionsTable?.length
                                        ? def.attributeOptionsTable
                                        : (def?.attributeValues?.length ? def.attributeValues : []);

                                    return (
                                        <div
                                            key={sa.attributeTypeId}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            className={`group bg-white border rounded-2xl shadow-sm transition-all duration-200 ${isDragging
                                                ? 'opacity-40 scale-[0.98] border-sky-300 shadow-sky-100'
                                                : isDragOver
                                                    ? 'border-sky-400 shadow-lg shadow-sky-100 scale-[1.01]'
                                                    : 'border-slate-100 hover:shadow-xl hover:border-sky-100'
                                                }`}
                                        >
                                            {/* Main row */}
                                            <div className="flex items-center justify-between p-4 gap-3">
                                                {/* Drag handle + icon + name */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                                                        title="Drag to reorder"
                                                    >
                                                        <GripVertical size={18} />
                                                    </div>
                                                    <div className="w-10 h-10 bg-sky-50/80 rounded-xl flex items-center justify-center text-sky-500 shadow-sm border border-sky-100/50 flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                        <Sliders size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">
                                                            {def ? (def.systemName ? `${def.systemName} (${def.attributeName})` : def.attributeName) : (sa.name || 'Unknown')}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {def ? `${def.inputStyle} • ${def.isPriceEffect ? 'Impacts Price' : 'No Price Impact'}` : 'Definition not found'}
                                                            {options.length > 0 && ` • ${options.length} option${options.length !== 1 ? 's' : ''}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Controls */}
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    {/* Required toggle */}
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                checked={sa.isRequired}
                                                                onChange={() => {
                                                                    const updated = [...selectedAttributeTypes];
                                                                    updated[index] = { ...updated[index], isRequired: !updated[index].isRequired };
                                                                    setSelectedAttributeTypes(updated);
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            <div className={`w-10 h-5 rounded-full transition-colors ${sa.isRequired ? 'bg-sky-500' : 'bg-slate-200'}`}>
                                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${sa.isRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Required</span>
                                                    </label>

                                                    {/* Show Price toggle */}
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                checked={sa.showPrice !== false}
                                                                onChange={() => {
                                                                    const updated = [...selectedAttributeTypes];
                                                                    updated[index] = { ...updated[index], showPrice: updated[index].showPrice === false ? true : false };
                                                                    setSelectedAttributeTypes(updated);
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            <div className={`w-10 h-5 rounded-full transition-colors ${sa.showPrice !== false ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${sa.showPrice !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Show Price</span>
                                                    </label>

                                                    {/* Expand options button */}
                                                    {options.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAttributeExpanded(sa.attributeTypeId)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all"
                                                            title={isExpanded ? 'Hide options' : 'Show options'}
                                                        >
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    )}

                                                    {/* Remove button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = selectedAttributeTypes.filter((_, i) => i !== index);
                                                            setSelectedAttributeTypes(updated);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Collapsible options panel */}
                                            {isExpanded && options.length > 0 && (
                                                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Options / Values (Drag to Reorder)</p>
                                                    <div className="space-y-2">
                                                        {options.map((opt: any, optIdx: number) => {
                                                            const optName = opt.value || opt.name || opt.label || opt.optionName || `Option ${optIdx + 1}`;
                                                            const showsOnDetail = opt.isListingFilter !== false;
                                                            // Calculate price using priceImpact if present, or fall back to priceAdd
                                                            const priceImpact = opt.priceImpact ? parseFloat(opt.priceImpact) : (opt.priceAdd || opt.price || 0);
                                                            const hasPrice = priceImpact > 0;

                                                            // Find related sub-attributes for this option
                                                            const relatedSubAttributes = subAttributes?.filter(sa =>
                                                                sa.parentAttribute &&
                                                                (typeof sa.parentAttribute === 'object' && 'parentAttribute' in sa ? sa.parentAttribute._id : sa.parentAttribute) === sa.attributeTypeId &&
                                                                (sa.parentValue === opt.value || sa.parentValue === optName || sa.parentValue === opt.label)
                                                            );

                                                            const isDragging = optionDragState?.parentAttrId === sa.attributeTypeId && optionDragState?.dragIndex === optIdx;
                                                            const isDragOver = optionDragState?.parentAttrId === sa.attributeTypeId && optionDragState?.dragOverIndex === optIdx;

                                                            return (
                                                                <div
                                                                    key={optIdx}
                                                                    draggable
                                                                    onDragStart={() => handleOptionDragStart(sa.attributeTypeId, optIdx)}
                                                                    onDragOver={(e) => handleOptionDragOver(e, sa.attributeTypeId, optIdx)}
                                                                    onDrop={(e) => handleOptionDrop(e, sa.attributeTypeId, optIdx, options)}
                                                                    onDragEnd={handleOptionDragEnd}
                                                                    className={`flex flex-col gap-2 p-3 bg-slate-50 border rounded-lg transition-all ${isDragging ? 'opacity-50 border-dashed border-sky-400 bg-sky-50' :
                                                                            isDragOver ? 'border-sky-500 ring-2 ring-sky-100 scale-[1.01]' : 'border-slate-200'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="cursor-move text-slate-400 hover:text-slate-600">
                                                                            <GripVertical size={14} />
                                                                        </div>
                                                                        <span className="font-semibold text-slate-700 text-sm">{optName}</span>
                                                                        {showsOnDetail && (
                                                                            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-600 rounded text-[10px] font-bold uppercase tracking-wide">Shown</span>
                                                                        )}
                                                                        {hasPrice && (
                                                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wide">
                                                                                +₹{formatNumberFull(priceImpact)}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Sub-attributes section */}
                                                                    {relatedSubAttributes && relatedSubAttributes.length > 0 && (
                                                                        <div className="mt-2 pl-3 border-l-2 border-slate-300 ml-5">
                                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                                                <Layers size={10} />
                                                                                Triggered Sub-Attributes (Drag to Reorder)
                                                                            </p>
                                                                            <div className="space-y-1">
                                                                                {relatedSubAttributes.map((subAttr: any, subIdx: number) => {
                                                                                    const isSubDragging = subAttrDragState?.parentAttrId === sa.attributeTypeId &&
                                                                                        subAttrDragState?.parentValue === (subAttr.parentValue || opt.value) &&
                                                                                        subAttrDragState?.dragIndex === subIdx;

                                                                                    const isSubDragOver = subAttrDragState?.parentAttrId === sa.attributeTypeId &&
                                                                                        subAttrDragState?.parentValue === (subAttr.parentValue || opt.value) &&
                                                                                        subAttrDragState?.dragOverIndex === subIdx;

                                                                                    return (
                                                                                        <div
                                                                                            key={subAttr._id}
                                                                                            draggable
                                                                                            onDragStart={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleSubAttrDragStart(sa.attributeTypeId, subAttr.parentValue, subIdx);
                                                                                            }}
                                                                                            onDragOver={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleSubAttrDragOver(e, sa.attributeTypeId, subAttr.parentValue, subIdx);
                                                                                            }}
                                                                                            onDrop={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleSubAttrDrop(e, sa.attributeTypeId, subAttr.parentValue, subIdx, relatedSubAttributes);
                                                                                            }}
                                                                                            onDragEnd={handleSubAttrDragEnd}
                                                                                            className={`flex items-center gap-2 text-xs text-slate-600 bg-white p-1.5 rounded border shadow-sm transition-all ${isSubDragging ? 'opacity-50 border-dashed border-sky-400' :
                                                                                                    isSubDragOver ? 'border-sky-500 ring-1 ring-sky-100' : 'border-slate-100'
                                                                                                }`}
                                                                                        >
                                                                                            <div className="cursor-move text-slate-300 hover:text-slate-500">
                                                                                                <GripVertical size={12} />
                                                                                            </div>
                                                                                            <span className="font-medium text-slate-800">{subAttr.label}</span>
                                                                                            {subAttr.priceAdd > 0 && (
                                                                                                <span className="text-emerald-600 font-bold text-[10px]">+₹{formatNumberFull(subAttr.priceAdd)}</span>
                                                                                            )}
                                                                                            {subAttr.image && (
                                                                                                <div className="w-4 h-4 rounded overflow-hidden border border-slate-200">
                                                                                                    <img src={subAttr.image} alt="" className="w-full h-full object-cover" />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>



                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl text-sm font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 group"
                >
                    {loading ? (
                        <>
                            <Loader className="animate-spin text-sky-400" size={20} />
                            <span className="animate-pulse">{editingProductId ? "Updating..." : "Creating..."}</span>
                        </>
                    ) : (
                        <>
                            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:rotate-12">
                                <Plus size={20} />
                            </div>
                            {editingProductId ? "Update Product" : "Create Product"}
                        </>
                    )}
                </button>
            </form >

            {/* Create Attribute Modal - Rendered OUTSIDE form to avoid nested forms */}
            <CreateAttributeModal
                isOpen={showCreateAttributeModal}
                onClose={() => {
                    setShowCreateAttributeModal(false);
                    setEditingAttributeTypeId(null);
                    handleCancelEdit();
                }}
                attributeTypeForm={attributeTypeForm}
                setAttributeTypeForm={setAttributeTypeForm}
                attributeFormErrors={attributeFormErrors}
                setAttributeFormErrors={setAttributeFormErrors}
                editingAttributeTypeId={editingAttributeTypeId}
                setEditingAttributeTypeId={setEditingAttributeTypeId}
                handleAttributeTypeSubmit={handleAttributeTypeSubmit}
                error={error}
                setError={setError}
                loading={loading}
                setLoading={setLoading}
                getAuthHeaders={getAuthHeaders}
                onSuccess={() => {
                    // Refresh attribute types list after successful creation/update
                    console.log('CreateAttributeModal onSuccess: Refreshing attribute types list');
                    fetchAttributeTypes(productForm.category, productForm.subcategory);

                    // Show additional confirmation toast on the product page
                    toast.success('Attribute is now available in the list below!', {
                        duration: 3000,
                        position: 'bottom-right'
                    });
                }}
            />

            {/* Attribute In-Use Popup */}
            {usagePopup.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setUsagePopup({ show: false, attributeName: "", productCount: 0, productNames: [] })}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Attribute Protected</h3>
                                        <p className="text-amber-100 text-sm">This attribute is currently in use</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setUsagePopup({ show: false, attributeName: "", productCount: 0, productNames: [] })}
                                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">
                                        Cannot edit "{usagePopup.attributeName}"
                                    </p>
                                    <p className="text-sm text-amber-700 mt-1">
                                        This attribute is assigned to <span className="font-bold">{usagePopup.productCount}</span> product{usagePopup.productCount !== 1 ? 's' : ''}. Remove it from all products before editing.
                                    </p>
                                </div>
                            </div>

                            {usagePopup.productNames.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Products using this attribute:</p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {usagePopup.productNames.map((name, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                                                <span className="text-sm text-gray-700 truncate">{name}</span>
                                            </div>
                                        ))}
                                        {usagePopup.productCount > usagePopup.productNames.length && (
                                            <p className="text-xs text-gray-500 pl-5 pt-1">
                                                ...and {usagePopup.productCount - usagePopup.productNames.length} more
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setUsagePopup({ show: false, attributeName: "", productCount: 0, productNames: [] })}
                                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 font-medium"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AddProductForm;
