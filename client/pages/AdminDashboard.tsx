import React, { useState, useEffect, useMemo } from "react";
import { getAuthHeaders } from "../utils/auth";
import { useClientOnly } from "../hooks/useClientOnly";
import { useNavigate, useSearchParams } from "react-router-dom";
import BackButton from "../components/BackButton";
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
} from "lucide-react";
import { Pagination } from "../components/Pagination";
import { motion, AnimatePresence } from "framer-motion";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import { SearchableDropdown } from "../components/SearchableDropdown";
import RichTextEditor from "../components/RichTextEditor";
import { formatCurrency, calculateOrderBreakdown, OrderForCalculation } from "../utils/pricing";
import { API_BASE_URL_WITH_API as API_BASE_URL } from "../lib/apiConfig";
import { scrollToInvalidField } from "../lib/validationUtils";
import AdminSidebar from "./admin/components/AdminSidebar";
import AddCategoryForm from "./admin/components/categories/AddCategoryForm";
import ManageCategoriesView from "./admin/components/categories/ManageCategoriesView";
import HierarchicalCategorySelector from "./admin/components/categories/HierarchicalCategorySelector";
import ManageUsers from "./admin/components/users/ManageUsers";
import ManageDepartments from "./admin/components/departments/ManageDepartments";
import ManageSequences from "./admin/components/sequences/ManageSequences";
import AddProductForm from "./admin/components/products/AddProductForm";
import ManageProductsView from "./admin/components/products/ManageProductsView";
import SortProductsView from "./admin/components/products/SortProductsView";
import ManageAttributeTypes from "./admin/components/attributes/ManageAttributeTypes";
import ManageAttributeRules from "./admin/components/attributes/ManageAttributeRules";
import ManageSubAttributes from "./admin/components/attributes/ManageSubAttributes";
import AboutManagement from "./admin/components/AboutManagement";
import ServiceManagement from "./admin/components/services/ServiceManagement";
import SiteSettingsManagement from "./admin/components/SiteSettingsManagement";

// Simple placeholder image as data URI (1x1 transparent pixel)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_IMAGE_LARGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-family='sans-serif' font-size='18'%3EImage Not Available%3C/text%3E%3C/svg%3E";

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
    parent?: string | { _id: string; name: string };
  };
  nestedSubcategory?: string | {
    _id: string;
    name: string;
    category?: string | { _id: string; name: string };
    parent?: string | { _id: string; name: string };
  };
  image?: string;
  sortOrder?: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  isEmployee?: boolean;
}

interface Upload {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  height: number;
  width: number;
  description: string;
  frontImage: {
    data: string;
    filename: string;
    size: number;
    contentType: string;
  } | null;
  backImage: {
    data: string;
    filename: string;
    size: number;
    contentType: string;
  } | null;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  product: {
    _id: string;
    name: string;
    image: string;
    basePrice?: number;
    category?: string | { _id: string; name: string };
    subcategory?: { name: string; category?: string | { _id: string; name: string } } | string;
    options?: Array<{ name: string; priceAdd: number; description?: string; image?: string }>;
    discount?: number;
    description?: string;
    instructions?: string;
    attributes?: Array<{ name: string; value: string }>;
    filters?: {
      printingOption?: any[];
      orderQuantity?: any;
      deliverySpeed?: any[];
      textureType?: any[];
    };
    gstPercentage?: number;
    minFileWidth?: number;
    maxFileWidth?: number;
    minFileHeight?: number;
    maxFileHeight?: number;
  };
  quantity: number;
  finish: string;
  shape: string;
  selectedOptions: Array<{
    optionId: string;
    optionName: string;
    priceAdd: number;
    name?: string;
  }>;
  selectedDynamicAttributes?: Array<{
    attributeType: string;
    value: string;
    label?: string;
    attributeName?: string;
    image?: string;
    description?: string;
    priceAdd?: number;
    priceMultiplier?: number;
    uploadedImages?: Array<{
      data: Buffer | string;
      contentType: string;
      filename: string;
    }>;
  }>;
  totalPrice: number;
  status: "request" | "production_ready" | "approved" | "processing" | "completed" | "cancelled" | "rejected";
  deliveryDate: string | null;
  pincode: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  advancePaid?: number;
  departmentStatuses?: Array<{
    department: string | { _id: string; name: string; sequence?: number };
    status: string;
    completedAt?: string;
    startedAt?: string;
    whenAssigned?: string;
    pausedAt?: string;
    stoppedAt?: string;
    operator?: string | { _id: string; name: string };
    notes?: string;
  }>;
  productionTimeline?: {
    estimatedDays?: number;
    startDate?: string;
    endDate?: string;
    length?: number;
    sort?: number;
  };
  currentDepartment?: {
    _id: string;
    name: string;
    sequence: number;
  } | string | null;
  currentDepartmentIndex?: number | null;
  uploadedDesign?: {
    frontImage?: {
      data: string;
      contentType: string;
      filename: string;
    };
    backImage?: {
      data: string;
      contentType: string;
      filename: string;
    };
  };
  notes?: string;
  adminNotes?: string;
}

// HierarchicalCategorySelector is now imported from separate component

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isClient = useClientOnly();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "products");



  // Update URL function
  const updateUrl = (tab: string, action?: string, id?: string) => {
    const currentTab = searchParams.get("tab");
    const currentAction = searchParams.get("action");
    const currentId = searchParams.get("id");

    // Prevent redundant updates to avoid loops
    if (
      currentTab === tab &&
      (currentAction || "") === (action || "") &&
      (currentId || "") === (id || "")
    ) {
      return;
    }

    const params = new URLSearchParams();
    params.set("tab", tab);
    if (action) params.set("action", action);
    if (id) params.set("id", id);
    setSearchParams(params);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  // Field-level errors for product form
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryImage, setEditingCategoryImage] = useState<string | null>(null);

  // Field-level error states for inline validation messages
  const [productFormErrors, setProductFormErrors] = useState<{
    name?: string;
    basePrice?: string;
    category?: string;
    gstPercentage?: string;
    instructions?: string;
  }>({});
  const [categoryFormErrors, setCategoryFormErrors] = useState<{
    name?: string;
    type?: string;
    image?: string;
    sortOrder?: string;
  }>({});
  const [attributeFormErrors, setAttributeFormErrors] = useState<{
    attributeName?: string;
    functionType?: string;
    inputStyle?: string;
    primaryEffectType?: string;
    attributeValues?: string;
  }>({});
  const [departmentFormErrors, setDepartmentFormErrors] = useState<{
    name?: string;
  }>({});
  const [sequenceFormErrors, setSequenceFormErrors] = useState<{
    name?: string;
    printType?: string;
    category?: string;
    selectedDepartments?: string;
  }>({});
  const [subCategoryFormErrors, setSubCategoryFormErrors] = useState<{
    name?: string;
    category?: string;
    image?: string;
    sortOrder?: string;
  }>({});

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    slug: "",
    description: "",
    descriptionArray: [] as string[],
    basePrice: "",
    category: "", // Now using category instead of subcategory
    subcategory: "", // Parent subcategory from SubCategory collection
    nestedSubcategory: "", // Nested subcategory (child of subcategory)
    image: null as File | null,
    options: "",
    filters: {
      printingOption: [] as string[],
      orderQuantity: {
        min: 1000,
        max: 72000,
        multiples: 1000,
        quantityType: "SIMPLE" as "SIMPLE" | "STEP_WISE" | "RANGE_WISE",
        stepWiseQuantities: [] as number[],
        rangeWiseQuantities: [] as Array<{ min: number; max: number | null; priceMultiplier: number; label?: string }>,
      },
      deliverySpeed: [] as string[],
      textureType: [] as string[],
    },
    // Quantity discounts
    quantityDiscounts: [] as Array<{ minQuantity: number; maxQuantity: number | null; discountPercentage: number }>,
    // File upload constraints
    maxFileSizeMB: "",
    minFileWidth: "",
    maxFileWidth: "",
    minFileHeight: "",
    maxFileHeight: "",
    blockCDRandJPG: false,
    // Additional charges and taxes
    additionalDesignCharge: "",
    gstPercentage: "",
    // Price display setting
    showPriceIncludingGst: false, // Default to excluding GST (industry standard)
    // Custom instructions for customers
    instructions: "",
    // Production sequence (custom department order for this product)
    productionSequence: [] as string[],
    // Variants - combinations of attribute values with specific images, prices, and configs
    variants: [] as Array<{
      name: string;
      attributeCombination: { [key: string]: string }; // { attributeTypeId: "value", ... }
      image: string;
      price?: number;
      priceMultiplier?: number;
      description?: string;
      sku?: string;
      isAvailable: boolean;
    }>,
    existingImage: "", // For displaying current image when editing
  });

  // Options table state
  const [optionsTable, setOptionsTable] = useState<
    Array<{ name: string; priceAdd: string | number; description: string; image?: string }>
  >([]);
  const [optionImages, setOptionImages] = useState<{ [key: number]: File | null }>({});
  const [showOptionsTable, setShowOptionsTable] = useState(true);

  // Filter tables state - now with prices
  const [filterPricesEnabled, setFilterPricesEnabled] = useState(false);
  const [printingOptionsTable, setPrintingOptionsTable] = useState<Array<{ name: string; priceAdd?: number }>>([]);
  const [deliverySpeedTable, setDeliverySpeedTable] = useState<Array<{ name: string; priceAdd?: number }>>([]);
  const [textureTypeTable, setTextureTypeTable] = useState<Array<{ name: string; priceAdd?: number }>>([]);

  // Dynamic attributes state - selected attribute types for this product
  const [selectedAttributeTypes, setSelectedAttributeTypes] = useState<Array<{
    attributeTypeId: string;
    isEnabled: boolean;
    isRequired: boolean;
    displayOrder: number;
  }>>([]);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    type: "Digital",
    parent: "", // Optional parent category for hierarchy (empty = top-level)
    sortOrder: 0, // Sort order for displaying subcategories
    slug: "", // URL-friendly identifier
    image: null as File | null,
    existingImage: "",
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isSubCategorySlugManuallyEdited, setIsSubCategorySlugManuallyEdited] = useState(false);
  const [isProductSlugManuallyEdited, setIsProductSlugManuallyEdited] = useState(false);

  // Subcategory form state
  const [subCategoryForm, setSubCategoryForm] = useState({
    name: "",
    description: "",
    category: "",
    parent: "", // Parent subcategory for nesting
    type: "", // Type filter for parent category selection
    slug: "",
    sortOrder: 0,
    image: null as File | null,
    existingImage: "",
  });

  // State for available parent subcategories (for nested subcategories)
  const [availableParentSubcategories, setAvailableParentSubcategories] = useState<any[]>([]);
  const [loadingParentSubcategories, setLoadingParentSubcategories] = useState(false);

  // State to track if nested subcategory mode is active
  const [isNestedSubcategoryMode, setIsNestedSubcategoryMode] = useState(false);
  // State to track if regular subcategory mode is active (adding new subcategory)
  const [isSubCategoryMode, setIsSubCategoryMode] = useState(false);

  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [editingSubCategoryImage, setEditingSubCategoryImage] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);



  // Employees state for department assignment
  const [employees, setEmployees] = useState<User[]>([]);

  // User role update form state
  const [userRoleForm, setUserRoleForm] = useState({
    username: "",
    role: "user",
  });

  // Create employee form state
  const [createEmployeeForm, setCreateEmployeeForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>("");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>("all");
  const [categoryTopLevelFilter, setCategoryTopLevelFilter] = useState<string>("all"); // "all", "top-level", "subcategories"
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState<string>("");
  const [filteredSubCategories, setFilteredSubCategories] = useState<any[]>([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [draggedSubCategoryId, setDraggedSubCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const autoScrollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const categoryListRef = React.useRef<HTMLDivElement | null>(null);

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    productCount: number;
    subcategoryCount: number;
    deleteText: string;
  }>({
    isOpen: false,
    type: 'category',
    id: '',
    name: '',
    productCount: 0,
    subcategoryCount: 0,
    deleteText: '',
  });
  const [availableParentCategories, setAvailableParentCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string>("");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [subcategoryProducts, setSubcategoryProducts] = useState<Product[]>([]);
  const [loadingSubcategoryProducts, setLoadingSubcategoryProducts] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [filteringProducts, setFilteringProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategoryForView, setSelectedSubCategoryForView] = useState<string | null>(null);
  const [categorySubcategories, setCategorySubcategories] = useState<any[]>([]);

  // View description modal state
  const [viewDescriptionModal, setViewDescriptionModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory';
    name: string;
    description: string;
  }>({
    isOpen: false,
    type: 'category',
    name: '',
    description: '',
  });

  // Hierarchical selection state for product form
  const [selectedType, setSelectedType] = useState<string>("");
  const [filteredCategoriesByType, setFilteredCategoriesByType] = useState<Category[]>([]);
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]); // Track the full path: [categoryId, subcategoryId1, subcategoryId2, ...]
  const [categoryChildrenMap, setCategoryChildrenMap] = useState<{ [key: string]: Category[] }>({}); // Map of categoryId -> child categories
  const [loadingCategoryChildren, setLoadingCategoryChildren] = useState<{ [key: string]: boolean }>({});
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);

  // Subcategory management for product form
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<{ [key: string]: any[] }>({}); // Map of categoryId -> subcategories (parent-level only)
  const [nestedSubcategoriesByParent, setNestedSubcategoriesByParent] = useState<{ [key: string]: any[] }>({}); // Map of parentSubcategoryId -> nested subcategories
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Users state moved to ManageUsers component

  // Print Partner Requests state
  interface PrintPartnerRequest {
    _id: string;
    businessName: string;
    ownerName: string;
    mobileNumber: string;
    whatsappNumber: string;
    emailAddress: string;
    gstNumber?: string;
    fullBusinessAddress: string;
    city: string;
    state: string;
    pincode: string;
    proofFileUrl: string;
    status: "pending" | "approved" | "rejected";
    approvedBy?: { _id: string; name: string; email: string };
    approvedAt?: string;
    rejectionReason?: string;
    userId?: { _id: string; name: string; email: string; mobileNumber: string };
    createdAt: string;
    updatedAt: string;
  }
  const [printPartnerRequests, setPrintPartnerRequests] = useState<PrintPartnerRequest[]>([]);
  const [printPartnerRequestFilter, setPrintPartnerRequestFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState({
    status: "",
    deliveryDate: "",
    adminNotes: "",
  });



  // Attribute Types state
  const [attributeTypes, setAttributeTypes] = useState<any[]>([]);
  const [attributeTypeSearch, setAttributeTypeSearch] = useState("");
  const [loadingAttributeTypes, setLoadingAttributeTypes] = useState(false);
  const [editingAttributeTypeId, setEditingAttributeTypeId] = useState<string | null>(null);
  const [showCreateAttributeModal, setShowCreateAttributeModal] = useState(false);

  // Attribute Rules state - REFACTORED to ManageAttributeRules component


  const ITEMS_PER_PAGE = 10;



  const [attributeTypeForm, setAttributeTypeForm] = useState({
    attributeName: "",
    systemName: "",
    inputStyle: "DROPDOWN", // How customer selects
    attributeImage: null as File | null, // Image to be shown when selecting this attribute
    existingImage: null as string | null, // Existing image URL from server
    effectDescription: "", // What this affects - description textbox
    // Options for dropdown/radio - simple list (e.g., "100, 200, 300")
    simpleOptions: "", // Comma-separated options like "100, 200, 300"
    // Checkboxes
    isPriceEffect: false, // Checkbox: Does this affect price?
    isStepQuantity: false, // Checkbox: Is this a step quantity attribute?
    isRangeQuantity: false, // Checkbox: Is this a range quantity attribute?
    // Conditional fields based on checkboxes
    priceEffectAmount: "", // If isPriceEffect is true: how much price effect (per 1000 units)
    stepQuantities: [] as Array<{ quantity: string; price: string }>, // Step quantities with prices
    rangeQuantities: [] as Array<{ min: string; max: string; price: string }>, // Range quantities with prices
    // Legacy fields (kept for backward compatibility)
    isFixedQuantity: false, // Legacy: Is this a fixed quantity attribute?
    fixedQuantityMin: "", // Legacy: minimum quantity
    fixedQuantityMax: "", // Legacy: maximum quantity
    // Conditional fields based on primaryEffectType (kept for backward compatibility)
    primaryEffectType: "INFORMATIONAL", // What this affects
    priceImpactPer1000: "", // If affects PRICE: price change per 1000 units (e.g., "20" = +₹20 per 1000)
    fileRequirements: "", // If affects FILE: file requirements description
    // Options table for dropdown/radio/price effect
    attributeOptionsTable: [] as Array<{
      name: string;
      priceImpactPer1000: string;
      image?: string;
      optionUsage: { price: boolean; image: boolean; listing: boolean };
      priceImpact: string;
      numberOfImagesRequired: number;
      listingFilters: string;
    }>, // Table: name, price impact per 1000, option usage, and related fields
    // Cascading/Dependent Attributes Support
    parentAttribute: "", // Parent attribute ID (if this attribute depends on another)
    showWhenParentValue: [] as string[], // Show this attribute when parent has these values
    hideWhenParentValue: [] as string[], // Hide this attribute when parent has these values
    // Auto-set fields (hidden from user, set based on selections)
    functionType: "GENERAL",
    isPricingAttribute: false,
    isFixedQuantityNeeded: false,
    isFilterable: false,
    attributeValues: [] as Array<{ value: string; label: string; priceMultiplier: number; description: string; image: string }>,
    defaultValue: "",
    isRequired: false,
    displayOrder: 0,
    isCommonAttribute: true, // Default to true for simplicity
    applicableCategories: [] as string[],
    applicableSubCategories: [] as string[],
  });

  // Filtered Attribute Rules



  useEffect(() => {
    // Check if user is admin
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== "admin") {
      navigate("/");
      return;
    }

    fetchCategories();
    fetchProducts();
    fetchSubCategories();
    // fetchUsers(); // Moved to ManageUsers
    fetchUploads();
    fetchOrders();
  }, [navigate]);

  // Fetch attribute types when products tab becomes active
  useEffect(() => {
    if (activeTab === "products") {
      // Fetch fresh attribute types when products tab is activated
      // This ensures attribute types are up-to-date after visiting attribute types page
      fetchAttributeTypes();

    }

    if (activeTab === "categories") {
      // Fetch available parent categories when opening category form
      fetchAvailableParentCategories();
    }
    if (activeTab === "manage-products") {
      // Fetch subcategories to display category/subcategory info in product list
      fetchSubCategories();
      fetchCategories();
    }
    if (activeTab === "attribute-rules") {
      fetchAttributeTypes();
      fetchCategories();
      fetchProducts();
    }
    if (activeTab === "sub-attributes") {
      fetchAttributeTypes();
    }
    if (activeTab === "attribute-types") {
      fetchAttributeTypes();
    }
  }, [activeTab]);

  // Auto-scroll to top when validation error occurs
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // Auto-scroll to top when field-level validation errors occur
  useEffect(() => {
    const hasFieldErrors =
      Object.keys(productFormErrors).length > 0 ||
      Object.keys(categoryFormErrors).length > 0 ||
      Object.keys(departmentFormErrors).length > 0 ||
      Object.keys(sequenceFormErrors).length > 0 ||
      Object.keys(subCategoryFormErrors).length > 0 ||
      Object.keys(attributeFormErrors).length > 0;

    if (hasFieldErrors) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [productFormErrors, categoryFormErrors, departmentFormErrors, sequenceFormErrors, subCategoryFormErrors, attributeFormErrors]);

  // Ensure parent category matches selected type when type changes
  useEffect(() => {
    if (categoryForm.parent && categoryForm.type) {
      const parentCategory = availableParentCategories.find(
        cat => cat._id === categoryForm.parent
      );
      // If parent doesn't match the selected type, clear it
      if (parentCategory && parentCategory.type !== categoryForm.type) {
        setCategoryForm({ ...categoryForm, parent: "", existingImage: "" });
      }
    }
  }, [categoryForm.type, availableParentCategories]);

  // Build hierarchical category tree
  // Categories are from Category collection (top-level only)
  // Subcategories are from SubCategory collection and shown under their parent categories
  // Helper to get next sort order for categories
  const getNextCategorySortOrder = (itemType: string): number => {
    // Filter categories by type (Digital/Bulk) if specified
    const relevantCategories = itemType
      ? categories.filter(c => (c.type || "").toLowerCase() === itemType.toLowerCase())
      : categories;

    if (relevantCategories.length === 0) return 1;

    // Find max sort order
    const maxSort = Math.max(...relevantCategories.map(c => c.sortOrder || 0));
    return maxSort + 1;
  };

  // Helper to get next sort order for subcategories
  const getNextSubCategorySortOrder = (categoryId: string, parentSubId?: string): number => {
    let scopeItems = [];



    if (parentSubId) {
      // Nested subcategory: max sort order among siblings (same parent subcategory)
      scopeItems = subCategories.filter(sc => {
        const pId = sc.parent ? (typeof sc.parent === 'object' ? sc.parent._id : sc.parent) : null;
        return pId === parentSubId;
      });
    } else {
      // Top-level subcategory: max sort order among items in same category
      scopeItems = subCategories.filter(sc => {
        const cId = sc.category ? (typeof sc.category === 'object' ? sc.category._id : sc.category) : null;
        const pId = sc.parent ? (typeof sc.parent === 'object' ? sc.parent._id : sc.parent) : null;
        return cId === categoryId && (!pId || pId === null);
      });
    }

    if (scopeItems.length === 0) return 1;

    const maxSort = Math.max(...scopeItems.map(sc => sc.sortOrder || 0));
    return maxSort + 1;
  };

  // Effect to update Category sort order when type changes or categories load
  useEffect(() => {
    if (!editingCategoryId && categoryForm.type) {
      const nextOrder = getNextCategorySortOrder(categoryForm.type);
      setCategoryForm(prev => {
        if (prev.sortOrder === nextOrder) return prev;
        return { ...prev, sortOrder: nextOrder };
      });
    }
  }, [categories, categoryForm.type, editingCategoryId]);

  // Effect to update Subcategory sort order when category changes or subcategories load
  useEffect(() => {
    if (!editingSubCategoryId && subCategoryForm.category && !isNestedSubcategoryMode) {
      const nextOrder = getNextSubCategorySortOrder(subCategoryForm.category);
      setSubCategoryForm(prev => {
        if (prev.sortOrder === nextOrder) return prev;
        return { ...prev, sortOrder: nextOrder };
      });
    }
  }, [subCategoryForm.category, subCategories, editingSubCategoryId, isNestedSubcategoryMode]);

  // Effect to update Nested Subcategory sort order when parent changes
  useEffect(() => {
    if (!editingSubCategoryId && isNestedSubcategoryMode && subCategoryForm.parent && subCategoryForm.parent !== 'pending') {
      const nextOrder = getNextSubCategorySortOrder(subCategoryForm.category, subCategoryForm.parent);
      setSubCategoryForm(prev => {
        if (prev.sortOrder === nextOrder) return prev;
        return { ...prev, sortOrder: nextOrder };
      });
    }
  }, [subCategoryForm.parent, subCategories, editingSubCategoryId, isNestedSubcategoryMode]);

  type CategoryWithChildren = Category & { children?: any[]; isSubcategory?: boolean };

  const buildCategoryTree = async (cats: Category[]): Promise<CategoryWithChildren[]> => {
    // Since all categories are top-level (no parent), we need to fetch subcategories and add them as children
    const categoryMap = new Map<string, CategoryWithChildren>();

    // Create map of categories
    cats.forEach(cat => {
      categoryMap.set(cat._id, { ...cat, children: [] });
    });

    // Helper function to recursively map subcategories
    const mapSubcategoriesRecursive = (subcategories: any[], parentId: string, parentType: string): any[] => {
      return subcategories.map((sub: any) => ({
        _id: sub._id,
        name: sub.name,
        description: sub.description,
        image: sub.image,
        slug: sub.slug,
        type: sub.category && typeof sub.category === 'object' ? sub.category.type : parentType,
        parent: parentId,
        sortOrder: sub.sortOrder || 0,
        category: sub.category,
        isSubcategory: true,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        children: sub.children ? mapSubcategoriesRecursive(sub.children, sub._id, parentType) : []
      }));
    };

    // Fetch subcategories for each category and add them as children
    const rootCategories: CategoryWithChildren[] = [];
    for (const cat of cats) {
      const category = categoryMap.get(cat._id)!;

      // Fetch subcategories for this category with all nested children
      try {
        const response = await fetch(`${API_BASE_URL}/subcategories/category/${cat._id}?includeChildren=true`, {
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const subcategoriesData = await response.json();
          const subcategories = Array.isArray(subcategoriesData) ? subcategoriesData : [];
          category.children = mapSubcategoriesRecursive(subcategories, cat._id, cat.type);
        }
      } catch (err) {
        console.error(`Error fetching subcategories for category ${cat._id}:`, err);
        category.children = [];
      }

      rootCategories.push(category);
    }

    // Sort by sortOrder recursively
    const sortCategories = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
      return Array.isArray(cats)
        ? [...cats]
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map(cat => ({
            ...cat,
            children: cat.children ? sortCategories(cat.children) : []
          }))
        : [];
    };

    return sortCategories(rootCategories);
  };

  // Flatten tree for display (maintaining hierarchy with indentation info)
  const flattenCategoryTree = (tree: CategoryWithChildren[], level: number = 0, parentPath: string[] = []): Array<Category & { displayLevel: number; path: string[] }> => {
    let result: Array<Category & { displayLevel: number; path: string[] }> = [];
    tree.forEach(cat => {
      const currentPath = [...parentPath, cat._id];
      result.push({ ...cat, displayLevel: level, path: currentPath });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategoryTree(cat.children, level + 1, currentPath));
      }
    });
    return result;
  };

  // Filter categories based on search query and type filter
  // Note: Categories are only top-level (no parent) - subcategories are in SubCategory collection
  useEffect(() => {
    let filtered = [...categories];

    // Apply type filter - only filter by type since categories are top-level only
    if (categoryTypeFilter !== "all") {
      filtered = filtered.filter(cat => cat.type === categoryTypeFilter);
    }

    // Apply top-level filter
    // Note: "all" shows categories with their subcategories (subcategories are fetched in buildCategoryTree)
    // "top-level" shows only top-level categories without subcategories
    // "subcategories" shows only subcategories (will be handled after tree building)

    // Apply search query
    if (categorySearchQuery.trim() !== "") {
      const query = categorySearchQuery.toLowerCase().trim();
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query)) ||
        (cat.type && cat.type.toLowerCase().includes(query))
      );
    }

    // Sort filtered categories by sortOrder before building tree
    filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Build tree and flatten for display
    // Fetch subcategories and build tree with them
    const buildTreeAndFlatten = async () => {
      let tree = await buildCategoryTree(filtered);

      // Apply level filter after building tree
      if (categoryTopLevelFilter === "top-level") {
        // Remove all children (subcategories) from tree
        tree = tree.map(cat => ({ ...cat, children: [] }));
      } else if (categoryTopLevelFilter === "subcategories") {
        // Extract only subcategories (children) from all categories
        const allSubcategories: CategoryWithChildren[] = [];
        tree.forEach(cat => {
          if (cat.children && cat.children.length > 0) {
            allSubcategories.push(...cat.children);
          }
        });
        tree = allSubcategories;
      }
      // If "all", keep tree as is (categories with their subcategories)

      // The tree is already sorted by sortOrder at each level in buildCategoryTree
      // flattenCategoryTree preserves the order (parent, then its children)
      // So we just need to flatten it - no additional sorting needed to maintain hierarchy
      const flattened = flattenCategoryTree(tree);
      setFilteredCategories(flattened as Category[]);
    };

    buildTreeAndFlatten();
  }, [categories, categorySearchQuery, categoryTypeFilter, categoryTopLevelFilter]);

  // Filter subcategories based on search query
  useEffect(() => {
    let filtered = [...subCategories];

    // Apply search query
    if (subCategorySearchQuery.trim() !== "") {
      const query = subCategorySearchQuery.toLowerCase().trim();
      filtered = filtered.filter(subCat =>
        subCat.name.toLowerCase().includes(query) ||
        (subCat.description && subCat.description.toLowerCase().includes(query)) ||
        (subCat.slug && subCat.slug.toLowerCase().includes(query)) ||
        (subCat.category && typeof subCat.category === "object" && subCat.category.name && subCat.category.name.toLowerCase().includes(query))
      );
    }

    // Sort by sortOrder, then by createdAt
    filtered.sort((a, b) => {
      const sortOrderA = a.sortOrder || 0;
      const sortOrderB = b.sortOrder || 0;
      if (sortOrderA !== sortOrderB) {
        return sortOrderA - sortOrderB;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    setFilteredSubCategories(filtered);
  }, [subCategories, subCategorySearchQuery]);

  // Auto-select single option in dropdowns
  useEffect(() => {
    // Auto-select category if only one option available (excluding placeholder)
    if (selectedType && filteredCategoriesByType.length === 1 && !productForm.category) {
      const singleCategory = filteredCategoriesByType[0];
      if (singleCategory && singleCategory._id) {
        setProductForm({
          ...productForm,
          category: singleCategory._id,
          existingImage: productForm.existingImage || "",
        });
        // Trigger category selection logic
        setSelectedCategoryPath([singleCategory._id]);
        fetchCategoryChildren(singleCategory._id);
      }
    }
  }, [selectedType, filteredCategoriesByType, productForm.category]);

  // Auto-select subcategory if only one option available
  useEffect(() => {
    if (productForm.category && categoryChildrenMap[productForm.category]?.length === 1 && !productForm.subcategory) {
      const singleSubcategory = categoryChildrenMap[productForm.category][0];
      if (singleSubcategory && singleSubcategory._id) {
        setProductForm({
          ...productForm,
          subcategory: singleSubcategory._id,
          existingImage: productForm.existingImage || "",
        });
      }
    }
  }, [productForm.category, categoryChildrenMap, productForm.subcategory]);

  // Refetch attribute types when category/subcategory changes (to show relevant attributes)
  useEffect(() => {
    if (activeTab === "products" && (productForm.category || productForm.subcategory)) {
      const categoryId = productForm.category || null;
      const subCategoryId = productForm.subcategory || null;
      fetchAttributeTypes(categoryId, subCategoryId);
    }
  }, [productForm.category, productForm.subcategory, activeTab]);




  // Generate unique slug by checking existing categories and subcategories
  const generateUniqueSlug = (baseSlug: string, excludeCategoryId?: string | null, excludeSubCategoryId?: string | null): string => {
    if (!baseSlug) return "";

    let slug = baseSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let uniqueSlug = slug;
    let counter = 2;

    // Check if slug exists in categories or subcategories (excluding current item if editing)
    let categoryExists = categories.some(cat =>
      cat.slug === uniqueSlug &&
      (!excludeCategoryId || cat._id !== excludeCategoryId)
    );

    let subCategoryExists = subCategories.some(subCat =>
      subCat.slug === uniqueSlug &&
      (!excludeSubCategoryId || subCat._id !== excludeSubCategoryId)
    );

    // If slug exists, append number until unique
    while (categoryExists || subCategoryExists) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;

      // Re-check with new slug
      categoryExists = categories.some(cat =>
        cat.slug === uniqueSlug &&
        (!excludeCategoryId || cat._id !== excludeCategoryId)
      );
      subCategoryExists = subCategories.some(subCat =>
        subCat.slug === uniqueSlug &&
        (!excludeSubCategoryId || subCat._id !== excludeSubCategoryId)
      );
    }

    return uniqueSlug;
  };



  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Filter to ensure only top-level categories (no parent) are included
      // This is a safety check - server should already return only top-level categories
      const topLevelCategories = Array.isArray(data)
        ? data.filter(cat => !cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id))
        : [];
      // Sort by sortOrder to maintain original order
      topLevelCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setCategories(topLevelCategories);
      setFilteredCategories(topLevelCategories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch categories");
    }
  };

  const fetchAvailableParentCategories = async (excludeId?: string) => {
    try {
      const url = excludeId
        ? `${API_BASE_URL}/categories/available-parents?excludeId=${excludeId}`
        : `${API_BASE_URL}/categories/available-parents`;

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available parent categories: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Sort by sortOrder, then by name (since we may not have createdAt)
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => {
          const sortOrderA = a.sortOrder || 0;
          const sortOrderB = b.sortOrder || 0;
          if (sortOrderA !== sortOrderB) {
            return sortOrderA - sortOrderB;
          }
          // If sortOrder is the same, sort by name
          return (a.name || "").localeCompare(b.name || "");
        })
        : [];
      setAvailableParentCategories(sorted);
    } catch (err) {
      console.error("Error fetching available parent categories:", err);
      // Don't show error to user, just log it
    }
  };

  const fetchSubCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subcategories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subcategories: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Check for subcategories with deleted parent categories
      const invalidSubCategories = data.filter((subCat: any) =>
        !subCat.category || subCat._warning
      );

      if (invalidSubCategories.length > 0) {
        setError(
          `Warning: ${invalidSubCategories.length} subcategor${invalidSubCategories.length === 1 ? 'y' : 'ies'} have deleted parent categories. Please reassign them to valid categories.`
        );
      }

      setSubCategories(data);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch subcategories");
    }
  };

  // Fetch parent-level subcategories for a specific category (for product form)
  const fetchSubCategoriesForCategory = async (categoryId: string) => {
    if (!categoryId) return;

    try {
      setLoadingSubcategories(true);
      const response = await fetch(`${API_BASE_URL}/subcategories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subcategories: ${response.status} ${response.statusText}`);
      }

      const allSubcategories = await response.json();

      // Filter to get only parent-level subcategories for this category
      // (subcategories that belong to this category and have no parent)
      const parentSubcategories = allSubcategories.filter((subCat: any) => {
        const subCatCategoryId = typeof subCat.category === 'object' && subCat.category !== null
          ? subCat.category._id
          : subCat.category;
        return subCatCategoryId === categoryId && !subCat.parent;
      });

      // Store in state map
      setSubcategoriesByCategory(prev => ({
        ...prev,
        [categoryId]: parentSubcategories
      }));
    } catch (err) {
      console.error("Error fetching subcategories for category:", err);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  // Fetch nested subcategories for a specific parent subcategory (for product form)
  const fetchNestedSubCategories = async (parentSubcategoryId: string) => {
    if (!parentSubcategoryId) return;

    try {
      setLoadingSubcategories(true);
      const response = await fetch(`${API_BASE_URL}/subcategories`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subcategories: ${response.status} ${response.statusText}`);
      }

      const allSubcategories = await response.json();

      // Filter to get nested subcategories (those with this parent)
      const nestedSubcategories = allSubcategories.filter((subCat: any) => {
        const subCatParentId = typeof subCat.parent === 'object' && subCat.parent !== null
          ? subCat.parent._id
          : subCat.parent;
        return subCatParentId === parentSubcategoryId;
      });

      // Store in state map
      setNestedSubcategoriesByParent(prev => ({
        ...prev,
        [parentSubcategoryId]: nestedSubcategories
      }));
    } catch (err) {
      console.error("Error fetching nested subcategories:", err);
    } finally {
      setLoadingSubcategories(false);
    }
  };


  const fetchProducts = async (categoryId?: string) => {
    try {
      setLoadingProducts(true);
      let url = `${API_BASE_URL}/products`;

      // If categoryId is provided, fetch products for that category/subcategory
      // The /products/category/:categoryId endpoint handles both:
      // - Products where category = categoryId (direct category products)
      // - Products where subcategory = categoryId (subcategory products)
      if (categoryId) {
        url = `${API_BASE_URL}/products/category/${categoryId}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("=== PRODUCTS FETCHED (AdminDashboard) ===");
      console.log("Total products:", Array.isArray(data) ? data.length : 0);
      console.log("Full products data:", JSON.stringify(data, null, 2));
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch products for a specific category/subcategory (for "Existing Products" list in AddProductForm)
  const fetchCategoryProducts = async (categoryId: string) => {
    if (!categoryId) {
      setCategoryProducts([]);
      return;
    }

    try {
      setLoadingCategoryProducts(true);
      const response = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch category products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setCategoryProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching category products:", err);
      // Don't show global error for this auxiliary list
    } finally {
      setLoadingCategoryProducts(false);
    }
  };

  // Filter products by search query and category/subcategory
  useEffect(() => {
    // Show filtering loader if there's an active filter or search query
    const hasActiveFilter = selectedSubCategoryFilter || productSearchQuery.trim();
    if (hasActiveFilter && products.length > 0) {
      setFilteringProducts(true);
      // Small delay to show loader for better UX
      const timer = setTimeout(() => {
        setFilteringProducts(false);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setFilteringProducts(false);
    }

    let filtered = products;

    // Filter by category
    if (selectedCategoryFilter) {
      filtered = filtered.filter((product) => {
        const productCategoryId = product.category && typeof product.category === 'object'
          ? product.category._id
          : product.category;
        return productCategoryId === selectedCategoryFilter;
      });
    }

    // Filter by subcategory
    if (selectedSubCategoryFilter) {
      filtered = filtered.filter((product) => {
        const productSubcategoryId = product.subcategory && typeof product.subcategory === 'object'
          ? product.subcategory._id
          : product.subcategory;
        // Also check if it's a nested subcategory
        const productNestedSubcategoryId = product.nestedSubcategory && typeof product.nestedSubcategory === 'object'
          ? product.nestedSubcategory._id
          : product.nestedSubcategory;

        return productSubcategoryId === selectedSubCategoryFilter || productNestedSubcategoryId === selectedSubCategoryFilter;
      });
    }

    // Filter by search query
    if (productSearchQuery.trim()) {
      const query = productSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const nameMatch = product.name?.toLowerCase().includes(query);
        const descMatch = product.description?.toLowerCase().includes(query);
        const categoryMatch = product.category && typeof product.category === 'object'
          ? product.category.name?.toLowerCase().includes(query)
          : false;
        const subcategoryMatch = product.subcategory && typeof product.subcategory === 'object'
          ? product.subcategory.name?.toLowerCase().includes(query)
          : false;
        return nameMatch || descMatch || categoryMatch || subcategoryMatch;
      });
    }

    setFilteredProducts(filtered);
    setFilteringProducts(false);
  }, [products, selectedCategoryFilter, selectedSubCategoryFilter, productSearchQuery]);

  const handleSubCategoryFilterChange = async (categoryId: string) => {
    setSelectedSubCategoryFilter(categoryId);
    if (categoryId) {
      // Fetch products for selected category (works for both categories and subcategories)
      await fetchProducts(categoryId);
    } else {
      // Fetch all products
      await fetchProducts();
    }
  };

  // Fetch products for selected subcategory in product creation form
  const fetchProductsBySubcategory = async (subcategoryId: string) => {
    if (!subcategoryId) {
      setSubcategoryProducts([]);
      return;
    }

    try {
      setLoadingSubcategoryProducts(true);
      const response = await fetch(`${API_BASE_URL}/products/subcategory/${subcategoryId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("=== PRODUCTS BY SUBCATEGORY FETCHED (AdminDashboard) ===");
      console.log("Subcategory ID:", subcategoryId);
      console.log("Total products:", Array.isArray(data) ? data.length : 0);
      console.log("Full products data:", JSON.stringify(data, null, 2));
      setSubcategoryProducts(data);
    } catch (err) {
      console.error("Error fetching subcategory products:", err);
      setSubcategoryProducts([]);
    } finally {
      setLoadingSubcategoryProducts(false);
    }
  };

  // Fetch child categories (subcategories) by parent category for hierarchical selection
  const fetchCategoryChildren = async (categoryId: string) => {
    if (!categoryId) {
      setCategoryChildrenMap(prev => {
        const newMap = { ...prev };
        delete newMap[categoryId];
        return newMap;
      });
      return;
    }

    try {
      setLoadingCategoryChildren(prev => ({ ...prev, [categoryId]: true }));
      // Use the new subcategories endpoint with nested children
      const response = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}?includeChildren=true`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Try fallback to old endpoint for backward compatibility
        const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
          headers: getAuthHeaders(),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const subcategoriesArray = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
          setCategoryChildrenMap(prev => ({
            ...prev,
            [categoryId]: subcategoriesArray
          }));
          return;
        }

        throw new Error(`Failed to fetch child categories: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Ensure data is an array
      const subcategoriesArray = Array.isArray(data) ? data : (data?.data || []);

      // Flatten nested subcategories for product form selection
      const flattenSubcategories = (subcats: any[]): any[] => {
        let result: any[] = [];
        subcats.forEach((subcat) => {
          result.push(subcat);
          if (subcat.children && subcat.children.length > 0) {
            result = result.concat(flattenSubcategories(subcat.children));
          }
        });
        return result;
      };

      const flattenedSubcategories = flattenSubcategories(subcategoriesArray);

      setCategoryChildrenMap(prev => ({
        ...prev,
        [categoryId]: flattenedSubcategories
      }));
    } catch (err) {
      console.error("Error fetching child categories:", err);
      setCategoryChildrenMap(prev => ({
        ...prev,
        [categoryId]: []
      }));
    } finally {
      setLoadingCategoryChildren(prev => {
        const newMap = { ...prev };
        delete newMap[categoryId];
        return newMap;
      });
    }
  };


  // Helper function to build category path from root to a specific category
  const buildCategoryPath = (rootCategoryId: string, targetCategoryId?: string): string[] => {
    if (!rootCategoryId) return [];

    // If no target or target is root, return just root
    if (!targetCategoryId || targetCategoryId === rootCategoryId) {
      return [rootCategoryId];
    }

    // New Logic: Trace back from target to root using parent pointers
    // We assume fetchCategoryChildren has been called for rootCategoryId, so we have all descendants
    const allDescendants = categoryChildrenMap[rootCategoryId] || [];

    // Helper to find a category object by ID (check descendants, subcategories, then main categories)
    const findCategory = (id: string) => {
      return allDescendants.find(c => c._id === id) ||
        subCategories.find(c => c._id === id) ||
        categories.find(c => c._id === id);
    };

    const path: string[] = [];
    let currentId = targetCategoryId;
    let foundRoot = false;

    // Safety counter to prevent infinite loops
    let iterations = 0;
    while (currentId && iterations < 20) {
      path.unshift(currentId);

      if (currentId === rootCategoryId) {
        foundRoot = true;
        break;
      }

      const category = findCategory(currentId);
      if (!category) {
        break;
      }

      // Get parent ID
      const parentId = category.parent
        ? (typeof category.parent === 'object' ? category.parent._id : category.parent)
        : null;

      if (!parentId) {
        break;
      }

      currentId = parentId;
      iterations++;
    }

    // If we successfully traced back to root, return the path
    if (foundRoot) {
      return path;
    }

    // If tracing failed (e.g. broken chain or missing data), return [root, target] as best effort
    return [rootCategoryId, targetCategoryId];
  };

  // Filter categories by selected type - only show top-level categories (no parent)
  useEffect(() => {
    if (selectedType) {
      // Filter by type and only show top-level categories (those without a parent)
      const filtered = categories.filter(cat =>
        cat.type === selectedType &&
        (!cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id))
      );
      setFilteredCategoriesByType(filtered);
    } else {
      setFilteredCategoriesByType([]);
    }
    // Reset category path when type changes
    if (selectedType) {
      setProductForm(prev => ({
        ...prev,
        category: "",
        subcategory: "",
        nestedSubcategory: "",
        existingImage: prev.existingImage || "",
      }));
      setSelectedCategoryPath([]);
      setCategoryChildrenMap({});
    }
  }, [selectedType, categories]);

  // Fetch child categories when a category in the path is selected
  useEffect(() => {
    // Fetch children for the last category in the path (if any)
    const lastCategoryId = selectedCategoryPath[selectedCategoryPath.length - 1];
    if (lastCategoryId && !categoryChildrenMap[lastCategoryId]) {
      fetchCategoryChildren(lastCategoryId);
    }

    // Also fetch children for all categories in the path to ensure we have the data
    selectedCategoryPath.forEach(categoryId => {
      if (!categoryChildrenMap[categoryId]) {
        fetchCategoryChildren(categoryId);
      }
    });
  }, [selectedCategoryPath]);

  // Helper function to recursively fetch all products from a category and its subcategories
  const fetchAllProductsFromCategory = async (categoryId: string): Promise<Product[]> => {
    const allProducts: Product[] = [];

    try {
      // Fetch products directly under this category
      const productsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        console.log(`=== PRODUCTS FROM CATEGORY (fetchAllProductsFromCategory) ===`);
        console.log(`Category ID: ${categoryId}`);
        console.log(`Products fetched: ${Array.isArray(productsData) ? productsData.length : 0}`);
        console.log("Full products data:", JSON.stringify(productsData, null, 2));
        if (Array.isArray(productsData)) {
          allProducts.push(...productsData);
        }
      }

      // Fetch child categories (subcategories) from SubCategory collection
      const subcategoriesResponse = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      if (subcategoriesResponse.ok) {
        const subcategoriesData = await subcategoriesResponse.json();
        const childCategories = Array.isArray(subcategoriesData) ? subcategoriesData : (subcategoriesData?.data || []);

        // Recursively fetch products from each subcategory
        for (const childCategory of childCategories) {
          const childProducts = await fetchAllProductsFromCategory(childCategory._id);
          allProducts.push(...childProducts);
        }
      } else {
        // Try fallback to old endpoint for backward compatibility
        try {
          const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
            headers: getAuthHeaders(),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const childCategories = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);

            for (const childCategory of childCategories) {
              const childProducts = await fetchAllProductsFromCategory(childCategory._id);
              allProducts.push(...childProducts);
            }
          }
        } catch (fallbackErr) {
          // Ignore fallback errors
        }
      }
    } catch (err) {
      console.error(`Error fetching products from category ${categoryId}:`, err);
    }

    return allProducts;
  };

  // Handle category click to show products directly and allow adding products
  const handleCategoryClick = async (categoryId: string) => {
    if (selectedCategory === categoryId) {
      // If same category clicked, collapse it
      setSelectedCategory(null);
      setCategorySubcategories([]);
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
    } else {
      // Fetch products directly under this category and all subcategories
      setSelectedCategory(categoryId);
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);

      try {
        setLoadingCategoryProducts(true);

        // Fetch products directly under this category (without subcategory)
        const productsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
          headers: getAuthHeaders(),
        });

        let directProducts: Product[] = [];
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log(`=== CATEGORY PRODUCTS (handleCategoryClick) ===`);
          console.log(`Category ID: ${categoryId}`);
          console.log(`Products fetched: ${Array.isArray(productsData) ? productsData.length : 0}`);
          console.log("Full products data:", JSON.stringify(productsData, null, 2));
          // Filter to only include products without subcategory (directly added to category)
          if (Array.isArray(productsData)) {
            directProducts = productsData.filter((product: Product) =>
              !product.subcategory || product.subcategory === null ||
              (typeof product.subcategory === 'string' && product.subcategory === '')
            );
          }
        }

        // Also fetch subcategories for this category from SubCategory collection (with nested children)
        let childCategories: any[] = [];
        try {
          // Fetch subcategories from SubCategory collection with nested children
          const response = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}?includeChildren=true`, {
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const data = await response.json();
            childCategories = Array.isArray(data) ? data : (data?.data || []);
            // Sort by sortOrder, then by createdAt
            childCategories.sort((a, b) => {
              const sortOrderA = a.sortOrder || 0;
              const sortOrderB = b.sortOrder || 0;
              if (sortOrderA !== sortOrderB) {
                return sortOrderA - sortOrderB;
              }
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });
            setCategorySubcategories(childCategories);
          }
        } catch (subcatErr) {
          console.error("Error fetching subcategories:", subcatErr);
          setCategorySubcategories([]);
        }

        // If there are subcategories, also fetch products from all subcategories
        if (childCategories.length > 0) {
          const allSubcategoryProducts: Product[] = [];
          for (const childCategory of childCategories) {
            try {
              // First priority: Fetch products with this subcategory
              let subcategoryProducts: Product[] = [];
              const subProductsResponse = await fetch(`${API_BASE_URL}/products/subcategory/${childCategory._id}`, {
                headers: getAuthHeaders(),
              });
              if (subProductsResponse.ok) {
                const subProductsData = await subProductsResponse.json();
                console.log(`=== SUBCATEGORY PRODUCTS (handleCategoryClick) ===`);
                console.log(`Subcategory ID: ${childCategory._id}`);
                console.log(`Products fetched: ${Array.isArray(subProductsData) ? subProductsData.length : 0}`);
                console.log("Full products data:", JSON.stringify(subProductsData, null, 2));
                if (Array.isArray(subProductsData)) {
                  subcategoryProducts = subProductsData;
                }
              }

              // If no products found with subcategory, fall back to category products
              if (subcategoryProducts.length === 0) {
                const categoryProductsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
                  headers: getAuthHeaders(),
                });
                if (categoryProductsResponse.ok) {
                  const categoryProductsData = await categoryProductsResponse.json();
                  if (Array.isArray(categoryProductsData)) {
                    // Filter to only include products without subcategory (directly added to category)
                    const directCategoryProducts = categoryProductsData.filter((p: Product) =>
                      !p.subcategory || p.subcategory === null ||
                      (typeof p.subcategory === 'string' && p.subcategory === '')
                    );
                    subcategoryProducts = directCategoryProducts;
                  }
                }
              }

              // Deduplicate by product ID before adding
              const existingIds = new Set(allSubcategoryProducts.map(p => p._id));
              const newProducts = subcategoryProducts.filter((p: Product) => !existingIds.has(p._id));
              allSubcategoryProducts.push(...newProducts);
            } catch (err) {
              console.error(`Error fetching products from subcategory ${childCategory._id}:`, err);
            }
          }
          // Combine direct products and subcategory products
          setCategoryProducts([...directProducts, ...allSubcategoryProducts]);
        } else {
          // No subcategories, just show direct products
          setCategoryProducts(directProducts);
        }
      } catch (err) {
        console.error("Error fetching category products:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch category products");
        setCategoryProducts([]);
      } finally {
        setLoadingCategoryProducts(false);
      }
    }
  };

  // Handle subcategory click to show products for that specific subcategory
  const handleSubCategoryClick = async (subcategoryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (selectedSubCategoryForView === subcategoryId) {
      // If same subcategory clicked, collapse it
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
    } else {
      setSelectedSubCategoryForView(subcategoryId);

      try {
        setLoadingCategoryProducts(true);

        // First priority: Fetch products with this specific subcategory
        let subcategoryProducts: Product[] = [];
        try {
          const subcatProductsResponse = await fetch(`${API_BASE_URL}/products/subcategory/${subcategoryId}`, {
            headers: getAuthHeaders(),
          });
          if (subcatProductsResponse.ok) {
            const subcatProductsData = await subcatProductsResponse.json();
            console.log(`=== SUBCATEGORY PRODUCTS (handleSubCategoryClick) ===`);
            console.log(`Subcategory ID: ${subcategoryId}`);
            console.log(`Products fetched: ${Array.isArray(subcatProductsData) ? subcatProductsData.length : 0}`);
            console.log("Full products data:", JSON.stringify(subcatProductsData, null, 2));
            subcategoryProducts = Array.isArray(subcatProductsData) ? subcatProductsData : [];
          }
        } catch (subcatErr) {
          console.error("Error fetching subcategory products:", subcatErr);
        }

        // If no products found with subcategory, fall back to parent category products
        if (subcategoryProducts.length === 0 && selectedCategory) {
          console.log("No products found with subcategory, trying parent category products...");
          try {
            const categoryProductsResponse = await fetch(`${API_BASE_URL}/products/category/${selectedCategory}`, {
              headers: getAuthHeaders(),
            });
            if (categoryProductsResponse.ok) {
              const categoryProductsData = await categoryProductsResponse.json();
              // Filter to only include products without subcategory (directly added to category)
              if (Array.isArray(categoryProductsData)) {
                const directCategoryProducts = categoryProductsData.filter((product: Product) =>
                  !product.subcategory || product.subcategory === null ||
                  (typeof product.subcategory === 'string' && product.subcategory === '')
                );
                subcategoryProducts = directCategoryProducts;
                console.log(`Found ${subcategoryProducts.length} product(s) in parent category ${selectedCategory}`);
              }
            }
          } catch (categoryErr) {
            console.error("Error fetching category products as fallback:", categoryErr);
          }
        }

        setCategoryProducts(subcategoryProducts);
      } catch (err) {
        console.error("Error fetching subcategory products:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch subcategory products");
        setCategoryProducts([]);
      } finally {
        setLoadingCategoryProducts(false);
      }
    }
  };

  // Auto-scroll function for drag and drop with improved smoothness
  const handleAutoScroll = (e: React.DragEvent | MouseEvent, container: HTMLElement | null) => {
    if (!container || !draggedCategoryId) {
      stopAutoScroll();
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const mouseY = (e as MouseEvent).clientY;
    const scrollThreshold = 80; // Distance from edge to trigger scroll
    const maxScrollSpeed = 20; // Maximum pixels to scroll per frame
    const minScrollSpeed = 5; // Minimum pixels to scroll per frame

    // Calculate distance from top and bottom edges
    const distanceFromTop = mouseY - containerRect.top;
    const distanceFromBottom = containerRect.bottom - mouseY;

    // Determine if we should scroll and calculate speed
    let shouldScroll = false;
    let scrollDirection: 'up' | 'down' | null = null;
    let scrollSpeed = 0;

    // Check if near top edge and can scroll up
    if (distanceFromTop < scrollThreshold && container.scrollTop > 0) {
      shouldScroll = true;
      scrollDirection = 'up';
      // Calculate speed based on proximity to edge (closer = faster)
      const proximity = Math.max(0, scrollThreshold - distanceFromTop);
      scrollSpeed = minScrollSpeed + (proximity / scrollThreshold) * (maxScrollSpeed - minScrollSpeed);
    }
    // Check if near bottom edge and can scroll down
    else if (distanceFromBottom < scrollThreshold) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (container.scrollTop < maxScroll) {
        shouldScroll = true;
        scrollDirection = 'down';
        // Calculate speed based on proximity to edge (closer = faster)
        const proximity = Math.max(0, scrollThreshold - distanceFromBottom);
        scrollSpeed = minScrollSpeed + (proximity / scrollThreshold) * (maxScrollSpeed - minScrollSpeed);
      }
    }

    // Clear existing timeout if direction changed or should stop
    if (autoScrollIntervalRef.current) {
      clearTimeout(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    // Start scrolling if needed
    if (shouldScroll && scrollDirection) {
      const scroll = () => {
        if (!container) {
          stopAutoScroll();
          return;
        }

        if (scrollDirection === 'up') {
          if (container.scrollTop > 0) {
            container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
            // Continue scrolling
            autoScrollIntervalRef.current = setTimeout(scroll, 16);
          } else {
            stopAutoScroll();
          }
        } else if (scrollDirection === 'down') {
          const maxScroll = container.scrollHeight - container.clientHeight;
          if (container.scrollTop < maxScroll) {
            container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollSpeed);
            // Continue scrolling
            autoScrollIntervalRef.current = setTimeout(scroll, 16);
          } else {
            stopAutoScroll();
          }
        }
      };

      // Start the scroll loop
      scroll();
    } else {
      stopAutoScroll();
    }
  };

  // Stop auto-scroll
  const stopAutoScroll = () => {
    if (autoScrollIntervalRef.current) {
      clearTimeout(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  };

  // Handle category reorder via drag and drop
  const handleCategoryReorder = async (draggedId: string, targetId: string, targetIndex: number) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to reorder these categories? This will update the sort order for all affected categories."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Get the dragged category - first try filteredCategories (what user sees), then categories
      let draggedCategory = filteredCategories.find(cat => cat._id === draggedId);
      if (!draggedCategory) {
        draggedCategory = categories.find(cat => cat._id === draggedId);
      }

      // If still not found, try to fetch it from the API
      if (!draggedCategory) {
        try {
          const response = await fetch(`${API_BASE_URL}/categories/${draggedId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const fetchedCategory = await response.json();
            draggedCategory = fetchedCategory;
          } else {
            // If not found in categories, it might be a subcategory - try subcategories endpoint
            try {
              const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${draggedId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (subcatResponse.ok) {
                const fetchedSubcat = await subcatResponse.json();
                // Convert subcategory to category-like format for compatibility
                draggedCategory = {
                  ...fetchedSubcat,
                  parent: fetchedSubcat.category,
                  type: fetchedSubcat.category && typeof fetchedSubcat.category === 'object'
                    ? fetchedSubcat.category.type
                    : 'Digital'
                } as Category;
              }
            } catch (subcatErr) {
              console.error("Error fetching dragged subcategory:", subcatErr);
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching dragged category:", fetchErr);
        }
      }

      if (!draggedCategory) {
        setError(`Dragged category not found (ID: ${draggedId}). Please refresh the page and try again.`);
        setLoading(false);
        return;
      }

      // Check if dragged category is actually a subcategory - if so, redirect to subcategory reorder
      const isDraggedSubcategory = (draggedCategory as any).isSubcategory ||
        ((draggedCategory as any).displayLevel && (draggedCategory as any).displayLevel > 0);
      if (isDraggedSubcategory) {
        setError("Subcategories should be reordered in their own section. Please use the subcategory drag and drop.");
        setLoading(false);
        return;
      }

      // Get the target category - first try filteredCategories (what user sees), then categories
      let targetCategory = filteredCategories.find(cat => cat._id === targetId);
      if (!targetCategory) {
        targetCategory = categories.find(cat => cat._id === targetId);
      }

      // If still not found, try to fetch it from the API
      if (!targetCategory) {
        try {
          const response = await fetch(`${API_BASE_URL}/categories/${targetId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const fetchedCategory = await response.json();
            targetCategory = fetchedCategory;
          } else {
            // If not found in categories, it might be a subcategory
            try {
              const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${targetId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (subcatResponse.ok) {
                const fetchedSubcat = await subcatResponse.json();
                // Convert subcategory to category-like format for compatibility
                targetCategory = {
                  ...fetchedSubcat,
                  parent: fetchedSubcat.category,
                  type: fetchedSubcat.category && typeof fetchedSubcat.category === 'object'
                    ? fetchedSubcat.category.type
                    : 'Digital'
                } as Category;
              }
            } catch (subcatErr) {
              console.error("Error fetching target subcategory:", subcatErr);
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching target category:", fetchErr);
        }
      }

      if (!targetCategory) {
        setError(`Target category not found (ID: ${targetId}). Please refresh the page and try again.`);
        setLoading(false);
        return;
      }

      // Check if target category is actually a subcategory - if so, redirect to subcategory reorder
      const isTargetSubcategory = (targetCategory as any).isSubcategory ||
        ((targetCategory as any).displayLevel && (targetCategory as any).displayLevel > 0);
      if (isTargetSubcategory) {
        setError("Subcategories should be reordered in their own section. Please use the subcategory drag and drop.");
        setLoading(false);
        return;
      }

      // Get the parent ID of the dragged category (null for top-level)
      const draggedParentId = draggedCategory.parent
        ? (typeof draggedCategory.parent === 'object' ? draggedCategory.parent._id : draggedCategory.parent)
        : null;

      // Get the parent ID of the target category
      const targetParentId = targetCategory.parent
        ? (typeof targetCategory.parent === 'object' ? targetCategory.parent._id : targetCategory.parent)
        : null;

      // Only allow reordering within the same level (same parent)
      if (draggedParentId !== targetParentId) {
        setError("Cannot reorder categories across different levels. Categories must have the same parent.");
        setLoading(false);
        return;
      }

      // Get all categories at the same level (same parent) from both filtered and main categories
      // Combine and deduplicate by _id
      const allCategoriesCombined = [
        ...categories,
        ...filteredCategories.filter(fc => !categories.find(c => c._id === fc._id))
      ];

      const allSiblings = allCategoriesCombined
        .filter(cat => {
          const catParentId = cat.parent
            ? (typeof cat.parent === 'object' ? cat.parent._id : cat.parent)
            : null;
          return catParentId === draggedParentId;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Get filtered siblings (categories visible in the current filtered view at the same level)
      const filteredSiblings = filteredCategories
        .filter(cat => {
          const catParentId = cat.parent
            ? (typeof cat.parent === 'object' ? cat.parent._id : cat.parent)
            : null;
          return catParentId === draggedParentId;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Find indices in filtered siblings
      const draggedFilteredIndex = filteredSiblings.findIndex(cat => cat._id === draggedId);
      const targetFilteredIndex = filteredSiblings.findIndex(cat => cat._id === targetId);

      if (draggedFilteredIndex === -1 || targetFilteredIndex === -1) {
        setError("Category not found in filtered view");
        setLoading(false);
        return;
      }

      // Get the target category from all siblings
      const targetCategoryInSiblings = allSiblings.find(cat => cat._id === targetId);
      if (!targetCategoryInSiblings) {
        setError("Target category not found in siblings");
        setLoading(false);
        return;
      }

      // Get sortOrder values
      const draggedSortOrder = draggedCategory.sortOrder ?? 0;
      const targetSortOrder = targetCategoryInSiblings.sortOrder ?? 0;

      // If they're the same, no need to update
      if (draggedSortOrder === targetSortOrder) {
        setSuccess("Categories are already in the same position");
        setLoading(false);
        return;
      }

      // Find indices in all siblings
      const draggedIndex = allSiblings.findIndex(cat => cat._id === draggedId);
      const targetIndex = allSiblings.findIndex(cat => cat._id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setError("Could not find categories in siblings list");
        setLoading(false);
        return;
      }

      // Build the list of categories to update with insert logic
      const categoriesToUpdate: { id: string; sortOrder: number }[] = [];

      // The dragged category gets the target's sortOrder
      categoriesToUpdate.push({ id: draggedId, sortOrder: targetSortOrder });

      // Update all items that need to shift based on drag direction
      if (draggedIndex < targetIndex) {
        // Dragging from left to right (e.g., drag position 1 to 4):
        // - Dragged item gets target's sortOrder (4)
        // - Items between dragged and target shift left (decrease by 1)
        // - Target item shifts right (increase by 1)
        for (let i = draggedIndex + 1; i <= targetIndex; i++) {
          const item = allSiblings[i];
          const currentSortOrder = item.sortOrder ?? i;
          if (i === targetIndex) {
            // Target item shifts right (gets +1)
            categoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder + 1 });
          } else {
            // Items between shift left (get -1)
            categoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder - 1 });
          }
        }
      } else {
        // Dragging from right to left (e.g., drag position 4 to 1):
        // - Dragged item gets target's sortOrder (1)
        // - Target item and items between shift right (increase by 1)
        for (let i = targetIndex; i < draggedIndex; i++) {
          const item = allSiblings[i];
          const currentSortOrder = item.sortOrder ?? i;
          // All items from target to dragged shift right (get +1)
          categoriesToUpdate.push({ id: item._id, sortOrder: currentSortOrder + 1 });
        }
      }

      // Update all affected categories
      const updatePromises = categoriesToUpdate.map(async ({ id, sortOrder }) => {
        // Try to get category data from combined sources
        let currentCat = categories.find(c => c._id === id) ||
          filteredCategories.find(c => c._id === id);

        // If not found, fetch from API
        if (!currentCat) {
          try {
            const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
              method: "GET",
              headers: getAuthHeaders(),
            });
            if (response.ok) {
              currentCat = await response.json();
            }
          } catch (fetchErr) {
            console.error(`Error fetching category ${id}:`, fetchErr);
          }
        }

        const formData = new FormData();
        formData.append("sortOrder", sortOrder.toString());

        if (currentCat) {
          formData.append("name", currentCat.name);
          formData.append("description", currentCat.description || "");
          formData.append("type", currentCat.type);
          if (currentCat.parent) {
            const parentId = typeof currentCat.parent === 'object' ? currentCat.parent._id : currentCat.parent;
            formData.append("parent", parentId);
          } else {
            formData.append("parent", "");
          }
          if (currentCat.slug) {
            formData.append("slug", currentCat.slug);
          }
        } else {
          // If we can't find the category, still try to update with just sortOrder
          console.warn(`Category ${id} not found in local state, updating with sortOrder only`);
        }

        const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          throw new Error(`Failed to update category ${id}: ${errorData.error || response.statusText}`);
        }

        return response;
      });

      await Promise.all(updatePromises);

      setSuccess(`Category moved successfully! Category moved from position ${draggedSortOrder + 1} to ${targetSortOrder + 1}.`);
      // Refresh categories to get updated order - this will update the service page too
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder categories");
    } finally {
      setLoading(false);
    }
  };

  // Handle subcategory reorder via drag and drop
  const handleSubCategoryReorder = async (draggedId: string, targetId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to reorder these subcategories? This will update the sort order for all affected subcategories."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Try to find dragged subcategory from categorySubcategories first, then from filteredCategories
      let draggedSubCategory = categorySubcategories.find(subCat => subCat._id === draggedId);
      if (!draggedSubCategory) {
        // Try to find in filteredCategories (main list)
        const draggedFromList = filteredCategories.find(cat => cat._id === draggedId && (cat as any).isSubcategory);
        if (draggedFromList) {
          draggedSubCategory = draggedFromList as any;
        }
      }

      if (!draggedSubCategory) {
        setError("Dragged subcategory not found");
        setLoading(false);
        return;
      }

      // Try to find target subcategory from categorySubcategories first, then from filteredCategories
      let targetSubCategory = categorySubcategories.find(subCat => subCat._id === targetId);
      if (!targetSubCategory) {
        // Try to find in filteredCategories (main list)
        const targetFromList = filteredCategories.find(cat => cat._id === targetId && (cat as any).isSubcategory);
        if (targetFromList) {
          targetSubCategory = targetFromList as any;
        }
      }

      if (!targetSubCategory) {
        setError("Target subcategory not found");
        setLoading(false);
        return;
      }

      // Verify both subcategories belong to the same parent category
      const draggedCategoryId = draggedSubCategory.category
        ? (typeof draggedSubCategory.category === 'object' ? draggedSubCategory.category._id : draggedSubCategory.category)
        : null;
      const targetCategoryId = targetSubCategory.category
        ? (typeof targetSubCategory.category === 'object' ? targetSubCategory.category._id : targetSubCategory.category)
        : null;

      if (draggedCategoryId !== targetCategoryId) {
        setError("Cannot reorder subcategories across different categories.");
        setLoading(false);
        return;
      }

      // Get all subcategories for this category, sorted by current sortOrder
      // First try from categorySubcategories, then from filteredCategories, then fetch from API
      let allSubcategoriesForCategory = [...categorySubcategories];
      if (allSubcategoriesForCategory.length === 0 || !allSubcategoriesForCategory.some(sc => {
        const scCategoryId = sc.category
          ? (typeof sc.category === 'object' ? sc.category._id : sc.category)
          : null;
        return scCategoryId === draggedCategoryId;
      })) {
        // Get from filteredCategories (main list)
        const fromList = filteredCategories
          .filter(cat => {
            const isSub = (cat as any).isSubcategory || (cat as any).displayLevel > 0;
            if (!isSub) return false;
            const scCategoryId = (cat as any).category
              ? (typeof (cat as any).category === 'object' ? (cat as any).category._id : (cat as any).category)
              : ((cat as any).parent ? (typeof (cat as any).parent === 'object' ? (cat as any).parent._id : (cat as any).parent) : null);
            return scCategoryId === draggedCategoryId;
          }) as any[];
        if (fromList.length > 0) {
          allSubcategoriesForCategory = fromList;
        } else {
          // Fetch from API
          try {
            const response = await fetch(`${API_BASE_URL}/subcategories/category/${draggedCategoryId}`, {
              headers: getAuthHeaders(),
            });
            if (response.ok) {
              const data = await response.json();
              allSubcategoriesForCategory = Array.isArray(data) ? data : (data?.data || []);
            }
          } catch (err) {
            console.error("Error fetching subcategories:", err);
          }
        }
      }

      const sortedSubcategories = allSubcategoriesForCategory
        .filter(sc => {
          const scCategoryId = sc.category
            ? (typeof sc.category === 'object' ? sc.category._id : sc.category)
            : (sc.parent ? (typeof sc.parent === 'object' ? sc.parent._id : sc.parent) : null);
          return scCategoryId === draggedCategoryId;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Find indices of dragged and target subcategories
      const draggedIndex = sortedSubcategories.findIndex(sc => sc._id === draggedId);
      const targetIndex = sortedSubcategories.findIndex(sc => sc._id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setError("Could not find subcategories in sorted list");
        setLoading(false);
        return;
      }

      // If they're already in the same position, no need to update
      if (draggedIndex === targetIndex) {
        setSuccess("Subcategories are already in the same position");
        setLoading(false);
        return;
      }

      // Build the list of items to update
      const subcategoriesToUpdate: Array<{ id: string; sortOrder: number }> = [];

      // Create a new array with the reordered items
      const reorderedSubcategories = [...sortedSubcategories];
      const [draggedItem] = reorderedSubcategories.splice(draggedIndex, 1);
      reorderedSubcategories.splice(targetIndex, 0, draggedItem);

      // Assign sequential sort orders based on new positions (0, 1, 2, 3, ...)
      // This prevents sort orders from continuously increasing
      reorderedSubcategories.forEach((item, index) => {
        subcategoriesToUpdate.push({ id: item._id, sortOrder: index });
      });

      // Update all affected subcategories with new sortOrder values
      const updatePromises = subcategoriesToUpdate.map(({ id, sortOrder }) => {
        const formData = new FormData();
        formData.append("sortOrder", sortOrder.toString());
        const currentSubCat = categorySubcategories.find(sc => sc._id === id);
        if (currentSubCat) {
          formData.append("name", currentSubCat.name);
          formData.append("description", currentSubCat.description || "");
          formData.append("category", draggedCategoryId || "");
          if (currentSubCat.slug) {
            formData.append("slug", currentSubCat.slug);
          }
        }
        return fetch(`${API_BASE_URL}/subcategories/${id}`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });
      });

      await Promise.all(updatePromises);

      setSuccess(`Subcategory "${draggedSubCategory.name}" moved successfully!`);

      // Update local state immediately for better UX - insert at new position
      const updatedSubcategories = categorySubcategories.map(subCat => {
        const update = subcategoriesToUpdate.find(u => u.id === subCat._id);
        if (update) {
          return { ...subCat, sortOrder: update.sortOrder };
        }
        return subCat;
      });
      setCategorySubcategories(updatedSubcategories);

      // Refresh subcategories from server to ensure consistency
      if (selectedCategory) {
        await handleCategoryClick(selectedCategory);
      }

      // Refresh categories to update the main list
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder subcategories");
    } finally {
      setLoading(false);
    }
  };





  const handleAddSubCategoryToCategory = (categoryId: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (category) {
      // Pre-populate subcategory form with the selected category and its type
      setSubCategoryForm({
        name: "",
        description: "",
        category: categoryId,
        parent: "",
        type: category.type || "",
        slug: "",
        sortOrder: getNextSubCategorySortOrder(categoryId),
        image: null,
        existingImage: "",
      });
      setEditingSubCategoryId(null);
      setEditingSubCategoryImage(null);
      // Switch to categories tab to show the subcategory form
      setActiveTab("categories");
      setError(null);
      setSuccess(null);
    }
  };

  const handleAddProductToCategory = (categoryId: string, subcategoryId?: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (category) {
      // Set the type and category in the product form
      setSelectedType(category.type || "");

      // Build category path - if subcategory is provided, build the full path
      let categoryPath: string[] = [categoryId];
      if (subcategoryId) {
        // Build path from root category to subcategory
        categoryPath = buildCategoryPath(categoryId, subcategoryId);
      }
      setSelectedCategoryPath(categoryPath);

      // Set category and subcategory in product form
      setProductForm({
        ...productForm,
        category: categoryId,
        subcategory: subcategoryId || "", // Set subcategory if provided
        existingImage: productForm.existingImage || "",
      });

      // Filter categories by type
      if (category.type) {
        const filtered = categories.filter(cat => cat.type === category.type);
        setFilteredCategoriesByType(filtered);
      }

      // If subcategory is provided, fetch its children for the hierarchical selector
      if (subcategoryId) {
        fetchCategoryChildren(subcategoryId);
      }

      // Fetch children for all categories in the path
      categoryPath.forEach(catId => {
        fetchCategoryChildren(catId);
      });

      // Switch to products tab
      setActiveTab("products");
      setError(null);
      setSuccess(null);
    }
  };

  // Handle subcategory selection to show products
  const handleSubCategorySelect = async (subcategoryId: string) => {
    // Validate that we have a subcategoryId
    if (!subcategoryId) {
      console.error("No subcategory ID provided");
      setError("No subcategory ID provided. Please refresh and try again.");
      return;
    }

    // Convert to string and validate it's a proper MongoDB ObjectId (24 hex characters)
    const subcategoryIdString = String(subcategoryId).trim();
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(subcategoryIdString);

    if (!isObjectId) {
      console.error("Invalid subcategory ID format. Expected MongoDB ObjectId (24 hex characters), got:", subcategoryIdString);
      setError(`Invalid subcategory ID format: "${subcategoryIdString}". Please refresh the page and try again.`);
      return;
    }

    // Log the subcategoryId to help debug
    console.log("handleSubCategorySelect called with valid ID:", subcategoryIdString);

    if (selectedSubCategoryForView === subcategoryIdString) {
      // If same subcategory clicked, collapse it
      setSelectedSubCategoryForView(null);
      setCategoryProducts([]);
    } else {
      // Clear previous products immediately
      setCategoryProducts([]);
      setSelectedSubCategoryForView(subcategoryIdString);

      try {
        setLoadingCategoryProducts(true);
        setError(null);

        // Ensure we're using the correct ID format (already validated above)
        const url = `${API_BASE_URL}/products/subcategory/${subcategoryIdString}`;
        console.log("=== Fetching Products by Subcategory ===");
        console.log("Subcategory ID:", subcategoryIdString);
        console.log("Request URL:", url);
        console.log("Request Method: GET");

        const response = await fetch(url, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        console.log("Response Status:", response.status, response.statusText);
        console.log("Response OK:", response.ok);

        if (!response.ok) {
          let errorMessage = `Failed to fetch products: ${response.status} ${response.statusText}`;
          try {
            const errorText = await response.clone().text();
            console.error("API Error Response Text:", errorText);

            // Try to parse as JSON for better error message
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage = errorJson.error;
              }
            } catch {
              // If not JSON, use the text as is
              if (errorText && errorText.trim()) {
                errorMessage = errorText;
              }
            }
          } catch (parseErr) {
            console.error("Error parsing error response:", parseErr);
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("=== Products Response ===");
        console.log("Response Type:", typeof data);
        console.log("Is Array:", Array.isArray(data));
        console.log("Products Count:", Array.isArray(data) ? data.length : "N/A");
        console.log("Products Data:", data);
        console.log("=== FULL PRODUCTS DATA (handleSubCategorySelect) ===");
        console.log(JSON.stringify(data, null, 2));

        // Ensure data is an array
        if (Array.isArray(data)) {
          if (data.length === 0) {
            console.log("No products found for this subcategory");
          } else {
            console.log(`Successfully fetched ${data.length} product(s)`);
            // Log first product structure for debugging
            if (data[0]) {
              console.log("First product structure:", {
                _id: data[0]._id,
                name: data[0].name,
                subcategory: data[0].subcategory,
              });
            }
          }
          setCategoryProducts(data);
        } else {
          console.error("Expected array but got:", typeof data, data);
          setCategoryProducts([]);
          setError("Invalid response format from server. Expected an array of products.");
        }
      } catch (err) {
        console.error("=== Error Fetching Subcategory Products ===");
        console.error("Error Type:", err instanceof Error ? err.constructor.name : typeof err);
        console.error("Error Message:", err instanceof Error ? err.message : String(err));
        console.error("Full Error:", err);

        const errorMessage = err instanceof Error ? err.message : "Failed to fetch products";
        setError(errorMessage);
        setCategoryProducts([]);
      } finally {
        setLoadingCategoryProducts(false);
        console.log("=== Request Complete ===");
      }
    }
  };

  // fetchUsers moved to ManageUsers component

  const fetchPrintPartnerRequests = async () => {
    try {
      const statusParam = printPartnerRequestFilter !== "all" ? `?status=${printPartnerRequestFilter}` : "";
      const response = await fetch(`${API_BASE_URL}/auth/print-partner-requests${statusParam}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch print partner requests");
      }

      const data = await response.json();
      if (data.success) {
        setPrintPartnerRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching print partner requests:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch print partner requests");
    }
  };

  const handleApprovePrintPartnerRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to approve this print partner request? A user account will be created.")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/print-partner-requests/${requestId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to approve request");
      }

      const data = await response.json();
      toast.success(data.message || "Request approved successfully");
      fetchPrintPartnerRequests();
      setSelectedRequestId(null);
    } catch (err) {
      console.error("Error approving request:", err);
      toast.error(err instanceof Error ? err.message : "Failed to approve request");
    }
  };

  const handleRejectPrintPartnerRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    if (!confirm("Are you sure you want to reject this print partner request?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/print-partner-requests/${requestId}/reject`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reject request");
      }

      const data = await response.json();
      toast.success(data.message || "Request rejected successfully");
      fetchPrintPartnerRequests();
      setSelectedRequestId(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Error rejecting request:", err);
      toast.error(err instanceof Error ? err.message : "Failed to reject request");
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/employees`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch employees");
    }
  };

  const fetchUploads = async (includeImages = false) => {
    setLoadingUploads(true);
    try {
      // By default, don't include images to prevent timeout
      // Images can be loaded individually via getUploadById when needed
      const url = `${API_BASE_URL}/admin/uploads${includeImages ? '?includeImages=true' : ''}`;
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      // Use handleNgrokResponse which handles both success and error cases
      // This prevents reading the response body multiple times
      const data = await response.json();

      // Handle timeout errors specifically if needed
      if (response.status === 503) {
        throw new Error(data.error || "Database connection timeout. Try again without images.");
      }
      // Handle both new format (with uploads array) and legacy format (direct array)
      const uploadsList = Array.isArray(data) ? data : (data.uploads || []);
      setUploads(uploadsList);
    } catch (err) {
      console.error("Error fetching uploads:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch uploaded images");
    } finally {
      setLoadingUploads(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  };



  // Attribute Type Management Functions
  const fetchAttributeTypes = async (categoryId?: string, subCategoryId?: string) => {
    setLoadingAttributeTypes(true);
    try {
      // Build URL with optional filters for category/subcategory
      let url = `${API_BASE_URL}/attribute-types`;
      const params = new URLSearchParams();

      // Filter by category/subcategory if provided
      if (categoryId) params.append('categoryId', categoryId);
      if (subCategoryId) params.append('subCategoryId', subCategoryId);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log("Fetching attribute types from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      console.log("Attribute types response status:", response.status, response.statusText);

      // Check response status before parsing
      if (!response.ok) {
        if (response.status === 404) {
          // Route might not exist - return empty array instead of error
          console.warn("Attribute types endpoint not found (404). The server may need to be restarted. Returning empty array.");
          setAttributeTypes([]);
          return;
        }
        throw new Error(`Failed to fetch attribute types: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedAttributes = data.data || data || [];

      // Filter to show common attributes and applicable ones
      const filteredAttributes = fetchedAttributes.filter((attr: any) => {
        // Always show common attributes
        if (attr.isCommonAttribute) return true;

        // If no category/subcategory filter, show all
        if (!categoryId && !subCategoryId) return true;

        // Check if attribute is applicable to current category/subcategory
        const applicableCategories = attr.applicableCategories || [];
        const applicableSubCategories = attr.applicableSubCategories || [];

        // If no restrictions, show it
        if (applicableCategories.length === 0 && applicableSubCategories.length === 0) return true;

        // Check category match
        if (categoryId && applicableCategories.some((cat: any) => {
          const catId = typeof cat === 'object' && cat !== null ? cat._id : cat;
          return catId === categoryId;
        })) return true;

        // Check subcategory match
        if (subCategoryId && applicableSubCategories.some((subCat: any) => {
          const subCatId = typeof subCat === 'object' && subCat !== null ? subCat._id : subCat;
          return subCatId === subCategoryId;
        })) return true;

        return false;
      });

      setAttributeTypes(filteredAttributes);
    } catch (err) {
      console.error("Error fetching attribute types:", err);
      // If it's a 404, just set empty array instead of showing error
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("Not Found"))) {
        console.warn("Attribute types endpoint returned 404. Please restart the server to register the route.");
        setAttributeTypes([]);
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch attribute types");
      }
    } finally {
      setLoadingAttributeTypes(false);
    }
  };

  // Convert simplified form to full attribute type structure
  const convertFormToAttributeType = () => {
    // Convert attributeOptionsTable to attributeValues
    let attributeValues: Array<{ value: string; label: string; priceMultiplier: number; description: string; image: string }> = [];

    // Use attributeOptionsTable if it has entries
    if (attributeTypeForm.attributeOptionsTable && attributeTypeForm.attributeOptionsTable.length > 0) {
      attributeValues = attributeTypeForm.attributeOptionsTable
        .filter(opt => opt.name.trim() !== "") // Only include options with names
        .map((option) => {
          // Use priceImpact if Price checkbox is checked, otherwise fall back to priceImpactPer1000 for backward compatibility
          let priceImpact = 0;
          if (option.optionUsage?.price && option.priceImpact) {
            priceImpact = parseFloat(option.priceImpact) || 0;
          } else if (option.priceImpactPer1000) {
            priceImpact = parseFloat(option.priceImpactPer1000) || 0;
          }

          // Convert price impact to a multiplier
          // If admin enters "20", that means +₹20
          // We'll use a percentage approach: 20 per 1000 = 2% = 1.02 multiplier
          const multiplier = priceImpact > 0 ? 1 + (priceImpact / 1000) : 1.0;

          // Build description with option usage information
          const usageInfo = [];
          if (option.optionUsage?.price) usageInfo.push(`Price Impact: ₹${option.priceImpact || 0}`);
          if (option.optionUsage?.image) usageInfo.push(`Images Required: ${option.numberOfImagesRequired || 0}`);
          if (option.optionUsage?.listing) usageInfo.push(`Filters: ${option.listingFilters || 'None'}`);
          const description = usageInfo.length > 0 ? usageInfo.join(' | ') : "";

          return {
            value: option.name.toLowerCase().replace(/\s+/g, '-'),
            label: option.name,
            priceMultiplier: multiplier,
            description: description,
            image: option.image || "",
          };
        });
    } else if (attributeTypeForm.simpleOptions) {
      // Fallback: parse simpleOptions (comma-separated string) for backward compatibility
      const options = attributeTypeForm.simpleOptions
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt !== "");

      attributeValues = options.map((option) => {
        return {
          value: option.toLowerCase().replace(/\s+/g, '-'),
          label: option,
          priceMultiplier: 1.0,
          description: "",
          image: "",
        };
      });
    } else if (attributeTypeForm.primaryEffectType === "PRICE" && attributeTypeForm.priceImpactPer1000) {
      // For single price impact (non-dropdown/radio), create a single option
      const priceImpact = parseFloat(attributeTypeForm.priceImpactPer1000) || 0;
      const multiplier = priceImpact > 0 ? 1 + (priceImpact / 1000) : 1.0;
      attributeValues = [{
        value: attributeTypeForm.attributeName.toLowerCase().replace(/\s+/g, '-'),
        label: attributeTypeForm.attributeName,
        priceMultiplier: multiplier,
        description: "",
        image: "",
      }];
    }

    // Auto-set fields based on selections
    // Use checkbox value if set, otherwise infer from description
    const isPricingAttribute = attributeTypeForm.isPriceEffect ||
      (attributeTypeForm.effectDescription && attributeTypeForm.effectDescription.toLowerCase().includes('price'));

    // If isPriceEffect is checked but no options table, create a single option with price effect
    if (attributeTypeForm.isPriceEffect && attributeTypeForm.priceEffectAmount && attributeValues.length === 0) {
      // If no options but price effect is set, create a single value
      const priceImpact = parseFloat(attributeTypeForm.priceEffectAmount) || 0;
      const multiplier = priceImpact > 0 ? 1 + (priceImpact / 1000) : 1.0;
      attributeValues = [{
        value: attributeTypeForm.attributeName.toLowerCase().replace(/\s+/g, '-'),
        label: attributeTypeForm.attributeName,
        priceMultiplier: multiplier,
        description: "",
        image: "",
      }];
    }

    // Determine primaryEffectType from description
    let primaryEffectType = attributeTypeForm.primaryEffectType;
    if (attributeTypeForm.effectDescription) {
      const desc = attributeTypeForm.effectDescription.toLowerCase();
      if (desc.includes('price') || desc.includes('cost')) {
        primaryEffectType = "PRICE";
      } else if (desc.includes('file') || desc.includes('upload') || desc.includes('image')) {
        primaryEffectType = "FILE";
      } else if (desc.includes('variant') || desc.includes('version') || desc.includes('type')) {
        primaryEffectType = "VARIANT";
      } else {
        primaryEffectType = "INFORMATIONAL";
      }
    }

    const functionType = attributeTypeForm.primaryEffectType === "FILE"
      ? (attributeTypeForm.inputStyle === "FILE_UPLOAD" ? "PRINTING_IMAGE" : "GENERAL")
      : attributeTypeForm.primaryEffectType === "PRICE" && attributeTypeForm.inputStyle === "NUMBER"
        ? "QUANTITY_PRICING"
        : "GENERAL";

    // Store fixed quantity min/max in attributeValues as metadata (first value's description)
    if (attributeTypeForm.isFixedQuantity && attributeTypeForm.fixedQuantityMin && attributeTypeForm.fixedQuantityMax) {
      const min = parseInt(attributeTypeForm.fixedQuantityMin) || 0;
      const max = parseInt(attributeTypeForm.fixedQuantityMax) || 0;
      // Store in the first attributeValue's description as JSON, or create a special entry
      if (attributeValues.length > 0) {
        attributeValues[0].description = JSON.stringify({ fixedQuantityMin: min, fixedQuantityMax: max });
      } else {
        // Create a placeholder value to store the fixed quantity info
        attributeValues.push({
          value: "fixed-quantity",
          label: "Fixed Quantity",
          priceMultiplier: 1.0,
          description: JSON.stringify({ fixedQuantityMin: min, fixedQuantityMax: max }),
          image: "",
        });
      }
    }

    // Ensure primaryEffectType is always set (required by server)
    const finalPrimaryEffectType = primaryEffectType || attributeTypeForm.primaryEffectType || "INFORMATIONAL";

    return {
      attributeName: attributeTypeForm.attributeName || "",
      systemName: attributeTypeForm.systemName || "",
      functionType: functionType || "GENERAL",
      isPricingAttribute: isPricingAttribute || false,
      inputStyle: attributeTypeForm.inputStyle || "DROPDOWN",
      isFixedQuantityNeeded: attributeTypeForm.isFixedQuantity || (attributeTypeForm.inputStyle === "NUMBER" && finalPrimaryEffectType === "PRICE"),
      primaryEffectType: finalPrimaryEffectType,
      effectDescription: attributeTypeForm.effectDescription || "", // Store the description
      isFilterable: attributeTypeForm.isFilterable !== undefined ? attributeTypeForm.isFilterable : (finalPrimaryEffectType === "INFORMATIONAL" || finalPrimaryEffectType === "VARIANT"),
      attributeValues: attributeValues,
      defaultValue: attributeValues.length > 0 ? attributeValues[0].value : "",
      isRequired: attributeTypeForm.isRequired !== undefined ? attributeTypeForm.isRequired : (finalPrimaryEffectType === "FILE" || finalPrimaryEffectType === "PRICE" || attributeTypeForm.isPriceEffect),
      displayOrder: 0,
      isCommonAttribute: attributeTypeForm.isCommonAttribute !== undefined ? attributeTypeForm.isCommonAttribute : true,
      applicableCategories: [],
      applicableSubCategories: [],
      // Cascading attributes support
      parentAttribute: attributeTypeForm.parentAttribute || null,
      showWhenParentValue: attributeTypeForm.showWhenParentValue || [],
      hideWhenParentValue: attributeTypeForm.hideWhenParentValue || [],
      // Store fixed quantity min/max as custom fields (will be stored in attributeValues description)
      fixedQuantityMin: attributeTypeForm.isFixedQuantity ? parseInt(attributeTypeForm.fixedQuantityMin) || 0 : undefined,
      fixedQuantityMax: attributeTypeForm.isFixedQuantity ? parseInt(attributeTypeForm.fixedQuantityMax) || 0 : undefined,
      // Step and Range quantity settings
      isStepQuantity: attributeTypeForm.isStepQuantity || false,
      isRangeQuantity: attributeTypeForm.isRangeQuantity || false,
      stepQuantities: attributeTypeForm.isStepQuantity && attributeTypeForm.stepQuantities.length > 0
        ? attributeTypeForm.stepQuantities.map(step => ({
          quantity: parseFloat(step.quantity) || 0,
          price: parseFloat(step.price) || 0
        })).filter(step => step.quantity > 0)
        : [],
      rangeQuantities: attributeTypeForm.isRangeQuantity && attributeTypeForm.rangeQuantities.length > 0
        ? attributeTypeForm.rangeQuantities.map(range => ({
          min: parseFloat(range.min) || 0,
          max: range.max ? parseFloat(range.max) : null,
          price: parseFloat(range.price) || 0
        })).filter(range => range.min > 0)
        : [],
    };
  };

  const handleAttributeTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert simplified form to full structure
      const fullAttributeType = convertFormToAttributeType();

      // Validate required fields with auto-scroll
      setAttributeFormErrors({});
      let hasErrors = false;
      const errors: typeof attributeFormErrors = {};

      if (!fullAttributeType.attributeName) {
        errors.attributeName = "Attribute name is required";
        hasErrors = true;
      }
      if (!fullAttributeType.functionType) {
        errors.functionType = "Function type is required";
        hasErrors = true;
      }
      if (!fullAttributeType.inputStyle) {
        errors.inputStyle = "Input style is required";
        hasErrors = true;
      }
      if (!fullAttributeType.primaryEffectType || fullAttributeType.primaryEffectType.trim() === "") {
        errors.primaryEffectType = "Primary effect type is required. Please describe what this attribute affects in the 'What This Affects' field.";
        hasErrors = true;
      }

      // Validate effectDescription is provided (used to determine primaryEffectType)
      if (!attributeTypeForm.effectDescription || attributeTypeForm.effectDescription.trim() === "") {
        errors.primaryEffectType = "Please describe what this attribute affects in the 'What This Affects' field.";
        hasErrors = true;
      }

      // Validate attribute values for dropdown/radio/popup
      if (['DROPDOWN', 'RADIO', 'POPUP'].includes(fullAttributeType.inputStyle)) {
        if (!fullAttributeType.attributeValues || fullAttributeType.attributeValues.length < 2) {
          errors.attributeValues = `${fullAttributeType.inputStyle} requires at least 2 options. Please add options in the table above.`;
          hasErrors = true;
        }
      }

      // Validate that each option has at least one usage checkbox checked
      if (attributeTypeForm.attributeOptionsTable && attributeTypeForm.attributeOptionsTable.length > 0) {
        const invalidOptions = attributeTypeForm.attributeOptionsTable.filter((opt, idx) => {
          if (!opt.name || opt.name.trim() === "") return false; // Skip empty options
          const usage = opt.optionUsage || { price: false, image: false, listing: false };
          return !usage.price && !usage.image && !usage.listing;
        });
        if (invalidOptions.length > 0) {
          errors.attributeValues = "Each option must have at least one usage selected (Price, Image, or Listing).";
          hasErrors = true;
        }
      }

      if (hasErrors) {
        setAttributeFormErrors(errors);
        setError("Please fix the errors below");
        setLoading(false);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField === 'attributeName') scrollToInvalidField("attributeName", "attribute-name");
        else if (firstErrorField === 'functionType') scrollToInvalidField("functionType", "attribute-functionType");
        else if (firstErrorField === 'inputStyle') scrollToInvalidField("inputStyle", "attribute-inputStyle");
        else if (firstErrorField === 'primaryEffectType') scrollToInvalidField("primaryEffectType", "attribute-primaryEffectType");
        else if (firstErrorField === 'attributeValues') {
          // Scroll to options table
          const optionsTable = document.querySelector('[data-attribute-options-table]');
          if (optionsTable) {
            optionsTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }

      // Ensure effectDescription is always included in payload - prioritize form value
      const payload = {
        attributeName: fullAttributeType.attributeName || "",
        systemName: fullAttributeType.systemName || "",
        functionType: fullAttributeType.functionType || "GENERAL",
        isPricingAttribute: fullAttributeType.isPricingAttribute || false,
        inputStyle: fullAttributeType.inputStyle || "DROPDOWN",
        isFixedQuantityNeeded: fullAttributeType.isFixedQuantityNeeded || false,
        primaryEffectType: fullAttributeType.primaryEffectType || "INFORMATIONAL",
        effectDescription: attributeTypeForm.effectDescription || fullAttributeType.effectDescription || "", // Always use form value first
        isFilterable: fullAttributeType.isFilterable || false,
        attributeValues: JSON.stringify(fullAttributeType.attributeValues),
        defaultValue: fullAttributeType.defaultValue || "",
        isRequired: fullAttributeType.isRequired || false,
        displayOrder: fullAttributeType.displayOrder || 0,
        isCommonAttribute: fullAttributeType.isCommonAttribute !== undefined ? fullAttributeType.isCommonAttribute : true,
        applicableCategories: JSON.stringify(fullAttributeType.applicableCategories),
        applicableSubCategories: JSON.stringify(fullAttributeType.applicableSubCategories),
        parentAttribute: fullAttributeType.parentAttribute || null,
        showWhenParentValue: JSON.stringify(fullAttributeType.showWhenParentValue || []),
        hideWhenParentValue: JSON.stringify(fullAttributeType.hideWhenParentValue || []),
      };

      // Debug: Log the payload to verify effectDescription is included
      console.log("=== ATTRIBUTE TYPE PAYLOAD ===");
      console.log("Form effectDescription:", attributeTypeForm.effectDescription);
      console.log("FullAttributeType effectDescription:", fullAttributeType.effectDescription);
      console.log("Payload effectDescription:", payload.effectDescription);
      console.log("==============================");

      const url = editingAttributeTypeId
        ? `${API_BASE_URL}/attribute-types/${editingAttributeTypeId}`
        : `${API_BASE_URL}/attribute-types`;
      const method = editingAttributeTypeId ? "PUT" : "POST";

      console.log("Sending attribute type request:", { url, method, payload: { ...payload, attributeValues: "[stringified]", effectDescription: payload.effectDescription } });

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Attribute type response status:", response.status, response.statusText);

      // Check if response is 404 - route might not exist
      if (response.status === 404) {
        throw new Error("Attribute types API endpoint not found (404). Please ensure the server is running and the route is registered. Try restarting the server.");
      }

      const data = await response.json();

      console.log("Attribute type response data:", {
        success: data.success,
        effectDescription: data.data?.effectDescription,
        fullData: data.data
      });

      if (!response.ok) {
        throw new Error(data.error || data.message || `Failed to save attribute type: ${response.status} ${response.statusText}`);
      }

      setSuccess(editingAttributeTypeId ? "Attribute type updated successfully" : "Attribute type created successfully");
      setAttributeTypeForm({
        attributeName: "",
        systemName: "",
        inputStyle: "DROPDOWN",
        attributeImage: null,
        effectDescription: "",
        simpleOptions: "",
        isPriceEffect: false,
        isStepQuantity: false,
        isRangeQuantity: false,
        priceEffectAmount: "",
        stepQuantities: [],
        rangeQuantities: [],
        isFixedQuantity: false,
        fixedQuantityMin: "",
        fixedQuantityMax: "",
        primaryEffectType: "INFORMATIONAL",
        priceImpactPer1000: "",
        fileRequirements: "",
        attributeOptionsTable: [],
        parentAttribute: "",
        showWhenParentValue: [],
        hideWhenParentValue: [],
        // Reset auto-set fields
        functionType: "GENERAL",
        isPricingAttribute: false,
        isFixedQuantityNeeded: false,
        isFilterable: false,
        attributeValues: [],
        defaultValue: "",
        isRequired: false,
        displayOrder: 0,
        isCommonAttribute: true,
        applicableCategories: [] as string[],
        applicableSubCategories: [] as string[],
        existingImage: null,
      });
      const wasCreatingFromModal = showCreateAttributeModal;
      const createdAttributeId = data?._id || data?.attributeType?._id;

      setEditingAttributeTypeId(null);
      if (showCreateAttributeModal) {
        setShowCreateAttributeModal(false);
      }
      // Refresh attribute types list
      await fetchAttributeTypes();
      // If created from product form, automatically select the new attribute
      if (wasCreatingFromModal && createdAttributeId) {
        // Add the newly created attribute to selected attributes
        setSelectedAttributeTypes([
          ...(selectedAttributeTypes || []),
          {
            attributeTypeId: createdAttributeId,
            isEnabled: true,
            isRequired: false,
            displayOrder: (selectedAttributeTypes || []).length,
          },
        ]);
      }
    } catch (err) {
      console.error("Error saving attribute type:", err);
      setError(err instanceof Error ? err.message : "Failed to save attribute type");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttributeType = async (attributeTypeId: string) => {
    // Fetch full attribute details from API to ensure we have all fields including isStepQuantity, isRangeQuantity, etc.
    try {
      const response = await fetch(`${API_BASE_URL}/attribute-types/${attributeTypeId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch attribute type: ${response.status}`);
      }

      const data = await response.json();
      const attributeType = data.data || data;

      console.log("EDIT AttributeType - Fetched attributeType:", {
        _id: attributeType?._id,
        attributeName: attributeType?.attributeName,
        isStepQuantity: attributeType?.isStepQuantity,
        isRangeQuantity: attributeType?.isRangeQuantity,
        stepQuantities: attributeType?.stepQuantities,
        rangeQuantities: attributeType?.rangeQuantities,
      });

      if (attributeType) {
        // Auto-scroll to top when edit button is clicked
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Convert attributeValues back to attributeOptionsTable
        const attributeOptionsTable = ((attributeType.attributeValues || [])
          .filter((av: any) => (av.label || av.value) && av.value !== "fixed-quantity")
          .map((av: any) => {
            // Convert multiplier back to price impact per 1000
            // multiplier = 1 + (impact/1000), so impact = (multiplier - 1) * 1000
            const priceImpact = av.priceMultiplier ? ((av.priceMultiplier - 1) * 1000).toFixed(2) : "0";
            const hasPrice = parseFloat(priceImpact) > 0;
            
            // Try to parse optionUsage from description if it was saved there
            let parsedUsage = { price: false, image: false, listing: false };
            let numberOfImagesRequired = 0;
            let listingFilters = "";
            
            if (av.description) {
              // Parse the description which may contain: "Price Impact: ₹X | Images Required: Y | Filters: Z"
              if (av.description.includes("Price Impact:")) {
                parsedUsage.price = true;
              }
              if (av.description.includes("Images Required:")) {
                parsedUsage.image = true;
                const imageMatch = av.description.match(/Images Required:\s*(\d+)/);
                if (imageMatch) {
                  numberOfImagesRequired = parseInt(imageMatch[1]) || 0;
                }
              }
              if (av.description.includes("Filters:")) {
                parsedUsage.listing = true;
                const filterMatch = av.description.match(/Filters:\s*([^|]+)/);
                if (filterMatch && filterMatch[1].trim() !== 'None') {
                  listingFilters = filterMatch[1].trim();
                }
              }
            }
            
            // If no usage was parsed from description, fallback to heuristics
            if (!parsedUsage.price && !parsedUsage.image && !parsedUsage.listing) {
              parsedUsage.price = hasPrice;
              parsedUsage.image = !!av.image;
              // Ensure at least one is selected
              if (!parsedUsage.price && !parsedUsage.image) {
                parsedUsage.price = true;
              }
            }
            
            return {
              name: av.label || av.value || "",
              priceImpactPer1000: priceImpact,
              image: av.image || undefined,
              optionUsage: parsedUsage,
              priceImpact: hasPrice ? priceImpact : "",
              numberOfImagesRequired: numberOfImagesRequired || (av.image ? 1 : 0),
              listingFilters: listingFilters
            };
          })) || [];

        // Also create simpleOptions for backward compatibility
        const simpleOptions = (attributeOptionsTable || []).map(opt => opt.name).join(", ");

        // Extract fixed quantity min/max from attributeValues description or custom fields
        let fixedQuantityMin = "";
        let fixedQuantityMax = "";
        let isFixedQuantity = false;

        if (attributeType.fixedQuantityMin !== undefined && attributeType.fixedQuantityMax !== undefined) {
          fixedQuantityMin = String(attributeType.fixedQuantityMin);
          fixedQuantityMax = String(attributeType.fixedQuantityMax);
          isFixedQuantity = true;
        } else if (attributeType.attributeValues && attributeType.attributeValues.length > 0) {
          // Try to extract from description
          try {
            const firstValue = attributeType.attributeValues[0];
            if (firstValue.description) {
              const parsed = JSON.parse(firstValue.description);
              if (parsed.fixedQuantityMin && parsed.fixedQuantityMax) {
                fixedQuantityMin = String(parsed.fixedQuantityMin);
                fixedQuantityMax = String(parsed.fixedQuantityMax);
                isFixedQuantity = true;
              }
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }

        // Check if price effect is set
        const isPriceEffect = attributeType.isPricingAttribute || false;
        let priceEffectAmount = "";
        if (isPriceEffect && attributeType.attributeValues && attributeType.attributeValues.length > 0) {
          const firstValue = attributeType.attributeValues[0];
          if (firstValue.priceMultiplier) {
            priceEffectAmount = ((firstValue.priceMultiplier - 1) * 1000).toFixed(2);
          }
        }

        setAttributeTypeForm({
          attributeName: attributeType.attributeName || "",
          systemName: attributeType.systemName || "",
          inputStyle: attributeType.inputStyle || "DROPDOWN",
          attributeImage: null, // File will be set separately if needed
          existingImage: attributeType.attributeImage || attributeType.image || null,
          effectDescription: attributeType.effectDescription || "",
          simpleOptions: simpleOptions,
          isPriceEffect: isPriceEffect,
          isStepQuantity: (attributeType as any).isStepQuantity || false,
          isRangeQuantity: (attributeType as any).isRangeQuantity || false,
          priceEffectAmount: priceEffectAmount,
          stepQuantities: ((attributeType as any).stepQuantities || []).map((step: any) => ({
            quantity: step.quantity ? String(step.quantity) : "",
            price: step.price ? String(step.price) : ""
          })),
          rangeQuantities: ((attributeType as any).rangeQuantities || []).map((range: any) => ({
            min: range.min ? String(range.min) : "",
            max: range.max ? String(range.max) : "",
            price: range.price ? String(range.price) : ""
          })),
          isFixedQuantity: isFixedQuantity,
          fixedQuantityMin: fixedQuantityMin,
          fixedQuantityMax: fixedQuantityMax,
          primaryEffectType: attributeType.primaryEffectType || "INFORMATIONAL",
          priceImpactPer1000: "",
          fileRequirements: "",
          attributeOptionsTable: attributeOptionsTable,
          // Keep auto-set fields for compatibility
          functionType: attributeType.functionType || "GENERAL",
          isPricingAttribute: attributeType.isPricingAttribute || false,
          isFixedQuantityNeeded: attributeType.isFixedQuantityNeeded || false,
          isFilterable: attributeType.isFilterable || false,
          attributeValues: attributeType.attributeValues || [],
          defaultValue: attributeType.defaultValue || "",
          isRequired: attributeType.isRequired || false,
          displayOrder: attributeType.displayOrder || 0,
          isCommonAttribute: attributeType.isCommonAttribute !== undefined ? attributeType.isCommonAttribute : true,
          applicableCategories: attributeType.applicableCategories?.map((c: any) => c._id || c) || [],
          applicableSubCategories: attributeType.applicableSubCategories?.map((sc: any) => sc._id || sc) || [],
          parentAttribute: (attributeType.parentAttribute && typeof attributeType.parentAttribute === 'object')
            ? attributeType.parentAttribute._id
            : (attributeType.parentAttribute || ""),
          showWhenParentValue: attributeType.showWhenParentValue || [],
          hideWhenParentValue: attributeType.hideWhenParentValue || [],
        });
        setEditingAttributeTypeId(attributeTypeId);
        updateUrl("attribute-types", "edit", attributeTypeId);
      } else {
        setError("Attribute type not found");
      }
    } catch (err) {
      console.error("Error fetching attribute type for editing:", err);
      setError(err instanceof Error ? err.message : "Failed to load attribute type");
      // Fallback to using cached data
      const attributeType = attributeTypes.find((at) => at._id === attributeTypeId);
      if (attributeType) {
        // Use the same logic but with cached data
        const attributeOptionsTable = ((attributeType.attributeValues || [])
          .filter((av: any) => (av.label || av.value) && av.value !== "fixed-quantity")
          .map((av: any) => {
            const priceImpact = av.priceMultiplier ? ((av.priceMultiplier - 1) * 1000).toFixed(2) : "0";
            const hasPrice = parseFloat(priceImpact) > 0;
            
            // Try to parse optionUsage from description if it was saved there
            let parsedUsage = { price: false, image: false, listing: false };
            let numberOfImagesRequired = 0;
            let listingFilters = "";
            
            if (av.description) {
              if (av.description.includes("Price Impact:")) {
                parsedUsage.price = true;
              }
              if (av.description.includes("Images Required:")) {
                parsedUsage.image = true;
                const imageMatch = av.description.match(/Images Required:\s*(\d+)/);
                if (imageMatch) {
                  numberOfImagesRequired = parseInt(imageMatch[1]) || 0;
                }
              }
              if (av.description.includes("Filters:")) {
                parsedUsage.listing = true;
                const filterMatch = av.description.match(/Filters:\s*([^|]+)/);
                if (filterMatch && filterMatch[1].trim() !== 'None') {
                  listingFilters = filterMatch[1].trim();
                }
              }
            }
            
            // If no usage was parsed from description, fallback to heuristics
            if (!parsedUsage.price && !parsedUsage.image && !parsedUsage.listing) {
              parsedUsage.price = hasPrice;
              parsedUsage.image = !!av.image;
              if (!parsedUsage.price && !parsedUsage.image) {
                parsedUsage.price = true;
              }
            }
            
            return {
              name: av.label || av.value || "",
              priceImpactPer1000: priceImpact,
              image: av.image || undefined,
              optionUsage: parsedUsage,
              priceImpact: hasPrice ? priceImpact : "",
              numberOfImagesRequired: numberOfImagesRequired || (av.image ? 1 : 0),
              listingFilters: listingFilters
            };
          })) || [];

        const simpleOptions = (attributeOptionsTable || []).map(opt => opt.name).join(", ");

        let fixedQuantityMin = "";
        let fixedQuantityMax = "";
        let isFixedQuantity = false;

        if (attributeType.fixedQuantityMin !== undefined && attributeType.fixedQuantityMax !== undefined) {
          fixedQuantityMin = String(attributeType.fixedQuantityMin);
          fixedQuantityMax = String(attributeType.fixedQuantityMax);
          isFixedQuantity = true;
        }

        const isPriceEffect = attributeType.isPricingAttribute || false;
        let priceEffectAmount = "";
        if (isPriceEffect && attributeType.attributeValues && attributeType.attributeValues.length > 0) {
          const firstValue = attributeType.attributeValues[0];
          if (firstValue.priceMultiplier) {
            priceEffectAmount = ((firstValue.priceMultiplier - 1) * 1000).toFixed(2);
          }
        }

        setAttributeTypeForm({
          attributeName: attributeType.attributeName || "",
          systemName: attributeType.systemName || "",
          inputStyle: attributeType.inputStyle || "DROPDOWN",
          attributeImage: null,
          existingImage: attributeType.attributeImage || attributeType.image || null,
          effectDescription: attributeType.effectDescription || "",
          simpleOptions: simpleOptions,
          isPriceEffect: isPriceEffect,
          isStepQuantity: (attributeType as any).isStepQuantity || false,
          isRangeQuantity: (attributeType as any).isRangeQuantity || false,
          priceEffectAmount: priceEffectAmount,
          stepQuantities: ((attributeType as any).stepQuantities || []).map((step: any) => ({
            quantity: step.quantity ? String(step.quantity) : "",
            price: step.price ? String(step.price) : ""
          })),
          rangeQuantities: ((attributeType as any).rangeQuantities || []).map((range: any) => ({
            min: range.min ? String(range.min) : "",
            max: range.max ? String(range.max) : "",
            price: range.price ? String(range.price) : ""
          })),
          isFixedQuantity: isFixedQuantity,
          fixedQuantityMin: fixedQuantityMin,
          fixedQuantityMax: fixedQuantityMax,
          primaryEffectType: attributeType.primaryEffectType || "INFORMATIONAL",
          priceImpactPer1000: "",
          fileRequirements: "",
          attributeOptionsTable: attributeOptionsTable,
          functionType: attributeType.functionType || "GENERAL",
          isPricingAttribute: attributeType.isPricingAttribute || false,
          isFixedQuantityNeeded: attributeType.isFixedQuantityNeeded || false,
          isFilterable: attributeType.isFilterable || false,
          attributeValues: attributeType.attributeValues || [],
          defaultValue: attributeType.defaultValue || "",
          isRequired: attributeType.isRequired || false,
          displayOrder: attributeType.displayOrder || 0,
          isCommonAttribute: attributeType.isCommonAttribute !== undefined ? attributeType.isCommonAttribute : true,
          applicableCategories: attributeType.applicableCategories?.map((c: any) => c._id || c) || [],
          applicableSubCategories: attributeType.applicableSubCategories?.map((sc: any) => sc._id || sc) || [],
          parentAttribute: (attributeType.parentAttribute && typeof attributeType.parentAttribute === 'object')
            ? attributeType.parentAttribute._id
            : (attributeType.parentAttribute || ""),
          showWhenParentValue: attributeType.showWhenParentValue || [],
          hideWhenParentValue: attributeType.hideWhenParentValue || [],
        });
        setEditingAttributeTypeId(attributeTypeId);
      }
    }
  };

  const handleDeleteAttributeType = async (attributeTypeId: string) => {
    const attributeType = attributeTypes.find(at => at._id === attributeTypeId);
    if (!attributeType) return;

    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to delete the attribute type "${attributeType.attributeName}"?\n\nNote: This action cannot be undone. If this attribute is being used in any products, the deletion will be prevented.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_BASE_URL}/attribute-types/${attributeTypeId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      // Check response status before parsing
      if (!response.ok) {
        // Clone the response to read it without consuming the body
        const responseClone = response.clone();
        let errorMessage = "Failed to delete attribute type";

        try {
          const errorData = await responseClone.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.log("Error data received:", errorData);
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const text = await response.text();
            errorMessage = text || response.statusText || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
        }

        console.log("Error message:", errorMessage);

        // Check if the error is about attribute being in use
        const isInUseError = errorMessage.toLowerCase().includes("used") ||
          errorMessage.toLowerCase().includes("in use") ||
          errorMessage.toLowerCase().includes("product") ||
          errorMessage.toLowerCase().includes("cannot delete");

        // Show toast notification
        if (isInUseError) {
          toast.error(
            <div>
              <div className="font-semibold">Attribute is in use</div>
              {/* <div className="text-sm mt-1">{errorMessage}</div> */}
            </div>,
            {
              duration: 5000,
              position: "bottom-right",
            }
          );
        } else {
          toast.error(errorMessage, {
            duration: 4000,
            position: "bottom-right",
          });
        }

        setError(errorMessage);
        setLoading(false);
        return; // Exit early, don't throw
      }

      // Parse successful response
      const data = await response.json();

      // Show success toast
      toast.success("Attribute deleted successfully", {
        duration: 3000,
        position: "bottom-right",
      });

      fetchAttributeTypes();
    } catch (err) {
      console.error("Error deleting attribute type:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete attribute type";

      // Check if error is about attribute being in use (in case it wasn't caught above)
      const isInUseError = errorMessage.toLowerCase().includes("used") ||
        errorMessage.toLowerCase().includes("in use") ||
        errorMessage.toLowerCase().includes("product");

      if (isInUseError) {
        toast.error(
          <div>
            <div className="font-semibold">Attribute is in use</div>
            {/* <div className="text-sm mt-1">{errorMessage}</div> */}
          </div>,
          {
            duration: 5000,
            position: "bottom-right",
          }
        );
      } else {
        toast.error(errorMessage, {
          duration: 4000,
          position: "bottom-right",
        });
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Department Management Functions


  const handleUpdateOrderStatus = async (orderId: string, status?: string, action?: string, deliveryDate?: string) => {
    try {
      const updateData: any = {};
      if (action) {
        updateData.action = action;
      }
      if (status) {
        updateData.status = status;
      } else {
        if (orderStatusUpdate.status) updateData.status = orderStatusUpdate.status;
        if (orderStatusUpdate.deliveryDate) updateData.deliveryDate = orderStatusUpdate.deliveryDate;
        if (orderStatusUpdate.adminNotes !== undefined) updateData.adminNotes = orderStatusUpdate.adminNotes;
      }
      if (deliveryDate) {
        updateData.deliveryDate = deliveryDate;
      }

      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update order: ${response.status} ${response.statusText}`);
      }

      await response.json();

      setSuccess("Order updated successfully");
      setShowOrderModal(false);
      setSelectedOrder(null);
      setOrderStatusUpdate({ status: "", deliveryDate: "", adminNotes: "" });
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
      setError(err instanceof Error ? err.message : "Failed to update order");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to reject this order?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to reject order: ${response.status} ${response.statusText}`);
      }

      await response.json();

      setSuccess("Order rejected successfully");
      fetchOrders();
    } catch (err) {
      console.error("Error rejecting order:", err);
      setError(err instanceof Error ? err.message : "Failed to reject order");
    }
  };

  // Helper function to format image data URL
  const getImageUrl = (imageData: string, contentType: string = "image/png"): string | null => {
    if (!imageData || imageData.trim() === "") return null;
    // If already a data URL, return as is
    if (imageData.startsWith("data:")) return imageData;
    // If base64 string, add data URL prefix
    if (imageData.startsWith("/9j/") || imageData.startsWith("iVBORw0KGgo")) {
      return `data:${contentType};base64,${imageData}`;
    }
    // Otherwise, assume it's already a valid URL or base64
    return imageData;
  };

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
      const categoryType = selectedCategory?.type;

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
        // If subcategory is empty, don't append it - product will be created directly under category
      }
      // Product type is no longer used - removed from form

      // Parse description into array format for storage
      // Split by newlines and filter empty lines
      const descriptionLines = productForm.description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (descriptionLines.length > 0) {
        formData.append("descriptionArray", JSON.stringify(descriptionLines));
      }

      // Append filters from tables - Printing options removed (should be attributes)
      const filtersToSend: any = {
        printingOption: [], // Empty - printing options should be attributes
        orderQuantity: productForm.filters.orderQuantity,
        deliverySpeed: deliverySpeedTable.map(item => typeof item === 'string' ? item : item.name).filter(name => name.trim()),
        textureType: textureTypeTable.map(item => typeof item === 'string' ? item : item.name).filter(name => name.trim()),
        filterPricesEnabled: filterPricesEnabled,
      };

      // Add filter prices if enabled (no printing option prices)
      if (filterPricesEnabled) {
        filtersToSend.printingOptionPrices = [];
        filtersToSend.deliverySpeedPrices = deliverySpeedTable
          .filter(item => typeof item === 'object' && item.name && item.name.trim())
          .map(item => ({
            name: item.name.trim(),
            priceAdd: typeof item.priceAdd === 'number' ? item.priceAdd : (item.priceAdd ? parseFloat(item.priceAdd) || 0 : 0)
          }));
        filtersToSend.textureTypePrices = textureTypeTable
          .filter(item => typeof item === 'object' && item.name && item.name.trim())
          .map(item => ({
            name: item.name.trim(),
            priceAdd: typeof item.priceAdd === 'number' ? item.priceAdd : (item.priceAdd ? parseFloat(item.priceAdd) || 0 : 0)
          }));
      } else {
        // Clear filter prices when disabled
        filtersToSend.printingOptionPrices = [];
        filtersToSend.deliverySpeedPrices = [];
        filtersToSend.textureTypePrices = [];
      }

      // Debug: Log filters being sent
      console.log("Filters being sent:", JSON.stringify(filtersToSend, null, 2));
      formData.append("filters", JSON.stringify(filtersToSend));

      // Always use optionsTable if it has data, otherwise use JSON string
      const optionsToSend =
        optionsTable.length > 0
          ? JSON.stringify(optionsTable)
          : productForm.options;
      if (optionsToSend) {
        formData.append("options", optionsToSend);
      }

      // Append dynamic attributes (attribute types assigned to this product)
      // Always send dynamicAttributes, even if empty array, to ensure proper handling
      const dynamicAttributesToSend = (selectedAttributeTypes && selectedAttributeTypes.length > 0)
        ? selectedAttributeTypes
          .filter((sa) => sa && sa.attributeTypeId) // Filter out invalid entries
          .map((sa) => ({
            attributeType: sa.attributeTypeId,
            isEnabled: sa.isEnabled !== undefined ? sa.isEnabled : true,
            isRequired: sa.isRequired !== undefined ? sa.isRequired : false,
            displayOrder: sa.displayOrder !== undefined ? sa.displayOrder : 0,
            customValues: [], // Can be customized per product if needed
          }))
        : [];
      formData.append("dynamicAttributes", JSON.stringify(dynamicAttributesToSend));

      // Append variants
      if (productForm.variants && productForm.variants.length > 0) {
        formData.append("variants", JSON.stringify(productForm.variants));
      }

      // Append quantity discounts
      if (productForm.quantityDiscounts && productForm.quantityDiscounts.length > 0) {
        const discountsToSend = productForm.quantityDiscounts
          .filter(d => d.minQuantity > 0 && d.discountPercentage > 0) // Only send valid discounts
          .map(d => ({
            minQuantity: d.minQuantity,
            maxQuantity: d.maxQuantity,
            discountPercentage: d.discountPercentage,
            priceMultiplier: (100 - d.discountPercentage) / 100, // Calculate multiplier from percentage
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
      // Append price display setting
      formData.append("showPriceIncludingGst", productForm.showPriceIncludingGst ? "true" : "false");

      // Append custom instructions
      if (productForm.instructions) {
        formData.append("instructions", productForm.instructions);
      }

      // Append production sequence (custom department order)
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
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      });

      // Handle response errors
      if (!response.ok) {
        const responseClone = response.clone();
        let errorMessage = "Failed to save product";
        const backendErrors: Record<string, string> = {};

        try {
          const errorData = await responseClone.json();
          errorMessage = errorData.error || errorData.message || errorMessage;

          // Try to map backend errors to fields
          // Common field mappings
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
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }

        // Set field errors if any were mapped
        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
          // Scroll to first error field
          const firstErrorField = Object.keys(backendErrors)[0];
          scrollToInvalidField(firstErrorField, `product-${firstErrorField}`);
        }

        // Show toast error
        toast.error(errorMessage, {
          duration: 5000,
          position: "bottom-right",
        });

        setError(errorMessage);
        setLoading(false);
        return;
      }

      // Use handleNgrokResponse for successful response
      const data = await response.json();

      // Store categoryId before clearing form to use for fetching products
      const createdCategoryId = categoryId;

      // Show success toast
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
        variants: [],
        maxFileHeight: "",
        blockCDRandJPG: false,
        additionalDesignCharge: "",
        gstPercentage: "",
        showPriceIncludingGst: false,
        instructions: "",
        productionSequence: [] as string[],
        existingImage: "",
      });
      setOptionsTable([]);
      setFilterPricesEnabled(false);
      setPrintingOptionsTable([]);
      setDeliverySpeedTable([]);
      setTextureTypeTable([]);
      setSelectedAttributeTypes([]);
      setSubcategoryProducts([]);
      setEditingProductId(null);
      setFieldErrors({}); // Clear field errors on success

      // Refresh products list using the category route based on the category ID used to create the product
      if (createdCategoryId) {
        fetchProducts(createdCategoryId);
      } else {
        fetchProducts();
      }

      // If viewing a category, refresh its products
      if (selectedCategory) {
        handleCategoryClick(typeof selectedCategory === 'string' ? selectedCategory : selectedCategory._id);
      }

      // If viewing a subcategory, refresh its products
      if (selectedSubCategoryForView) {
        handleSubCategoryClick(selectedSubCategoryForView);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingProductId ? "update" : "create"} product`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
      }

      const product = await response.json();

      console.log("=== SINGLE PRODUCT FETCHED (AdminDashboard - Edit) ===");
      console.log("Product ID:", productId);
      console.log("Full product data:", JSON.stringify(product, null, 2));

      // Convert descriptionArray back to text format for editing
      const descriptionText = product.descriptionArray && Array.isArray(product.descriptionArray)
        ? product.descriptionArray.join('\n')
        : product.description || "";

      // Determine category, subcategory, and nested subcategory from product
      // The backend now returns:
      // - category: main category
      // - subcategory: parent subcategory (if nested) OR direct subcategory (if not nested)
      // - nestedSubcategory: child subcategory (if nested) OR null (if not nested)

      let categoryId = "";
      let parentSubcategoryId = ""; // For the subcategory dropdown
      let nestedSubcategoryId = ""; // For the nested subcategory dropdown
      let productType = "";

      // Extract category ID
      const categoryObj = typeof product.category === "object" && product.category !== null
        ? product.category
        : null;
      categoryId = categoryObj ? categoryObj._id : (product.category || "");

      // Determine product type (vital for form filtering)
      if (categoryObj && categoryObj.type) {
        productType = categoryObj.type;
      } else if (categoryId) {
        // Fallback: finding category in local state if it was just an ID
        const foundCat = categories.find((c: any) => c._id === categoryId);
        if (foundCat) {
          productType = foundCat.type;
        }
      }

      console.log("=== CATEGORY EXTRACTION ===");
      console.log("Category ID:", categoryId);
      console.log("Product Type:", productType);
      console.log("Product subcategory:", product.subcategory);
      console.log("Product nestedSubcategory:", product.nestedSubcategory);

      // Extract parent subcategory and nested subcategory IDs
      // The backend now returns:
      // - subcategory: the PARENT subcategory (restructured)
      // - nestedSubcategory: the CHILD subcategory (restructured)
      if (product.nestedSubcategory) {
        console.log("Found explicit nestedSubcategory field in product data");
        const nestedObj = typeof product.nestedSubcategory === "object" ? product.nestedSubcategory : null;
        nestedSubcategoryId = nestedObj ? nestedObj._id : product.nestedSubcategory;

        const subObj = typeof product.subcategory === "object" ? product.subcategory : null;
        parentSubcategoryId = subObj ? subObj._id : (product.subcategory || "");
      } else {
        // Fallback or handle top-level subcategory
        const subObj = typeof product.subcategory === "object" && product.subcategory !== null
          ? product.subcategory
          : null;

        if (subObj) {
          if (subObj.parent) {
            // Found a parent, so this IS a nested subcategory (legacy format handling)
            console.log("Subcategory object has parent -> Identified as Nested Subcategory");
            nestedSubcategoryId = subObj._id;
            parentSubcategoryId = typeof subObj.parent === 'object' ? subObj.parent._id : subObj.parent;
          } else {
            // No parent, so this IS a top-level subcategory
            console.log("Subcategory object has NO parent -> Identified as Parent Subcategory");
            parentSubcategoryId = subObj._id;
            nestedSubcategoryId = "";
          }
        } else if (product.subcategory) {
          console.log("Using product.subcategory ID fallback");
          parentSubcategoryId = typeof product.subcategory === 'string' ? product.subcategory : "";
        }
      }

      console.log("=== HIERARCHY DETERMINED ===");
      console.log("Parent Subcategory ID:", parentSubcategoryId);
      console.log("Nested Subcategory ID:", nestedSubcategoryId);

      // Set type first, then category (this will trigger filtering)
      setSelectedType(productType);

      // Filter categories by type for the dropdown
      if (productType) {
        const filtered = categories.filter(cat => cat.type === productType && !cat.parent);
        setFilteredCategoriesByType(filtered);
      } else {
        setFilteredCategoriesByType([]);
      }

      // Fetch subcategories for the selected category using fetchCategoryChildren
      // This populates the categoryChildrenMap which AddProductForm uses for display
      if (categoryId) {
        await fetchCategoryChildren(categoryId);
      }

      // We don't need to fetch nested subcategories separately because fetchCategoryChildren
      // with the new recursive endpoint (or flatten logic) should handle it.
      // However, to be safe and ensure the map is fully populated for the path:
      if (parentSubcategoryId) {
        // This might be redundant if fetchCategoryChildren gets everything, but safe.
        // Actually, fetchCategoryChildren stores data keyed by the *argument* ID.
        // AddProductForm looks up categoryChildrenMap[productForm.category].
        // It expects ALL children (sub and nested) to be in that one array list if flattened,
        // OR it might expect children of subcategory to be in categoryChildrenMap[subcategoryId]?

        // Let's re-read AddProductForm logic.
        // Col 2: categoryChildrenMap[productForm.category].filter(parent==null)
        // Col 3: categoryChildrenMap[productForm.category].filter(parent==subcategory)

        // So yes, EVERYTHING must be in categoryChildrenMap[productForm.category].
        // The fetchCategoryChildren(categoryId) function I viewed earlier (lines 1632+) 
        // ALREADY does flattening: "result = result.concat(flattenSubcategories(subcat.children));"
        // So calling it once for categoryId is sufficient!
      }

      // Set form data
      setIsProductSlugManuallyEdited(true);
      setProductForm({
        name: product.name || "",
        slug: product.slug || "",
        description: descriptionText,
        descriptionArray: product.descriptionArray || [],
        basePrice: product.basePrice?.toString() || "",
        category: categoryId || "",
        subcategory: parentSubcategoryId || "", // Parent subcategory
        nestedSubcategory: nestedSubcategoryId || "", // Nested subcategory
        image: null,
        options: "",
        filters: {
          ...(product.filters || {}),
          printingOption: product.filters?.printingOption || [],
          orderQuantity: {
            min: product.filters?.orderQuantity?.min || 1000,
            max: product.filters?.orderQuantity?.max || 72000,
            multiples: product.filters?.orderQuantity?.multiples || 1000,
            quantityType: product.filters?.orderQuantity?.quantityType || "SIMPLE",
            stepWiseQuantities: product.filters?.orderQuantity?.stepWiseQuantities || [],
            rangeWiseQuantities: product.filters?.orderQuantity?.rangeWiseQuantities || [],
          },
          deliverySpeed: product.filters?.deliverySpeed || [],
          textureType: product.filters?.textureType || [],
        },
        quantityDiscounts: product.quantityDiscounts && Array.isArray(product.quantityDiscounts)
          ? product.quantityDiscounts.map((qd: any) => ({
            minQuantity: qd.minQuantity || 0,
            maxQuantity: qd.maxQuantity || null,
            discountPercentage: qd.discountPercentage || 0,
          }))
          : [],
        maxFileSizeMB: product.maxFileSizeMB?.toString() || "",
        minFileWidth: product.minFileWidth?.toString() || "",
        maxFileWidth: product.maxFileWidth?.toString() || "",
        minFileHeight: product.minFileHeight?.toString() || "",
        maxFileHeight: product.maxFileHeight?.toString() || "",
        blockCDRandJPG: product.blockCDRandJPG || false,
        additionalDesignCharge: product.additionalDesignCharge?.toString() || "",
        gstPercentage: product.gstPercentage?.toString() || "",
        showPriceIncludingGst: product.showPriceIncludingGst || false,
        instructions: product.instructions || "",
        variants: product.variants && Array.isArray(product.variants) ? product.variants : [],
        productionSequence: product.productionSequence && Array.isArray(product.productionSequence)
          ? product.productionSequence
            .filter((dept: any) => dept !== null && dept !== undefined) // Filter out null/undefined departments
            .map((dept: any) => typeof dept === 'object' && dept !== null ? (dept._id || "") : (dept || ""))
            .filter((id: string) => id) // Filter out empty IDs
          : [],
        existingImage: product.image || "",
      });

      if (product.options && Array.isArray(product.options) && product.options.length > 0) {
        setOptionsTable(product.options);
      } else {
        setOptionsTable([]);
      }

      // Set filter prices enabled state
      setFilterPricesEnabled(product.filters?.filterPricesEnabled || false);

      // Set filter tables from product data - Printing options are now handled via attributes
      setPrintingOptionsTable([]); // Printing options should be configured as attributes

      const deliverySpeeds = product.filters?.deliverySpeed || [];
      const deliveryPrices = product.filters?.deliverySpeedPrices || [];
      setDeliverySpeedTable(deliverySpeeds.map((opt: string | any, idx: number) => {
        if (typeof opt === 'string') {
          const priceData = deliveryPrices.find((p: any) => p.name === opt);
          return { name: opt, priceAdd: priceData?.priceAdd };
        }
        return opt;
      }));

      const textureTypes = product.filters?.textureType || [];
      const texturePrices = product.filters?.textureTypePrices || [];
      setTextureTypeTable(textureTypes.map((opt: string | any, idx: number) => {
        if (typeof opt === 'string') {
          const priceData = texturePrices.find((p: any) => p.name === opt);
          return { name: opt, priceAdd: priceData?.priceAdd };
        }
        return opt;
      }));

      // Load dynamic attributes if they exist
      if (product.dynamicAttributes && Array.isArray(product.dynamicAttributes) && product.dynamicAttributes.length > 0) {
        const loadedAttributes = product.dynamicAttributes
          .filter((da: any) => da && da.attributeType) // Filter out null/undefined attributes
          .map((da: any) => {
            // Handle both populated (object) and unpopulated (string ID) attributeType
            let attributeTypeId = "";
            if (typeof da.attributeType === 'object' && da.attributeType !== null) {
              // Populated attributeType object
              attributeTypeId = da.attributeType._id || da.attributeType.id || "";
            } else if (typeof da.attributeType === 'string') {
              // Unpopulated attributeType ID string
              attributeTypeId = da.attributeType;
            }

            return {
              attributeTypeId: attributeTypeId,
              isEnabled: da.isEnabled !== undefined ? da.isEnabled : true,
              isRequired: da.isRequired !== undefined ? da.isRequired : false,
              displayOrder: da.displayOrder !== undefined ? da.displayOrder : 0,
            };
          })
          .filter((attr: any) => attr.attributeTypeId && attr.attributeTypeId.trim() !== ""); // Filter out attributes without valid IDs

        console.log("Loaded attributes for editing:", loadedAttributes);
        setSelectedAttributeTypes(loadedAttributes);
      } else {
        console.log("No dynamic attributes found in product");
        setSelectedAttributeTypes([]);
      }

      // Fetch attribute types filtered by product's category/subcategory
      const productCategoryId = categoryId || null;
      // Use the deepest subcategory level (nested if exists, otherwise parent)
      const finalSubcategoryId = nestedSubcategoryId || parentSubcategoryId;
      const productSubCategoryId = finalSubcategoryId || null;
      await fetchAttributeTypes(productCategoryId, productSubCategoryId);

      // Build category path for hierarchical selection
      // If subcategory exists, build the path from root category to subcategory
      // Note: finalSubcategoryId is the deepest subcategory level based on nestedSubcategory logic

      // Wait for categories to be loaded, then build path
      if (categoryId) {
        // First, fetch children for the root category
        await fetchCategoryChildren(categoryId);

        // If subcategory exists and is valid, build path to it
        if (finalSubcategoryId && finalSubcategoryId.trim() !== "" && finalSubcategoryId !== categoryId && finalSubcategoryId !== "null") {
          // Wait a bit for children to load, then build path
          setTimeout(() => {
            // Manually construct the path based on the IDs we found
            // This is much more reliable than buildCategoryPath because we know the hierarchy directly from the product object
            const newPath: string[] = [];
            if (categoryId) newPath.push(categoryId);

            // Add parent subcategory if it exists
            if (parentSubcategoryId) {
              newPath.push(parentSubcategoryId);

              // Add nested subcategory only if parent also exists
              if (nestedSubcategoryId) {
                newPath.push(nestedSubcategoryId);
              }
            } else if (nestedSubcategoryId) {
              // Should not happen technically (nested implies parent), but as fallback
              newPath.push(nestedSubcategoryId);
            }

            console.log("Setting selectedCategoryPath manually:", newPath);
            setSelectedCategoryPath(newPath);

            // Fetch children for all categories in the path
            newPath.forEach(catId => {
              if (catId !== categoryId) { // Already fetched root
                fetchCategoryChildren(catId);
              }
            });
          }, 100);
        } else {
          // Only root category selected
          setSelectedCategoryPath([categoryId]);
        }
      } else {
        setSelectedCategoryPath([]);
      }

      // Fetch products for the selected category/subcategory
      const finalCategoryId = finalSubcategoryId || categoryId;
      if (finalCategoryId) {
        try {
          setLoadingCategoryProducts(true);
          const productsResponse = await fetch(`${API_BASE_URL}/products/category/${finalCategoryId}`, {
            headers: getAuthHeaders(),
          });

          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            setCategoryProducts(productsData || []);
          }
        } catch (err) {
          console.error("Error fetching category products:", err);
          setCategoryProducts([]);
        } finally {
          setLoadingCategoryProducts(false);
        }
      }

      setEditingProductId(productId);
      updateUrl("products", "edit", productId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    try {
      setLoading(true);

      // First, try to fetch from categories
      let category = null;
      let isSubcategory = false;

      try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          category = await response.json();
          // Check if it has a parent - if so, it might be in SubCategory collection
          if (category && category.parent) {
            // Try to fetch from subcategories as well
            try {
              const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${categoryId}`, {
                method: "GET",
                headers: getAuthHeaders(),
              });
              if (subcatResponse.ok) {
                const subcategory = await subcatResponse.json();
                // If found in subcategories, use that instead
                category = subcategory;
                isSubcategory = true;
              }
            } catch (subcatErr) {
              // Not found in subcategories, use category data
            }
          }
        }
      } catch (catErr) {
        // Category not found, try subcategory
        try {
          const subcatResponse = await fetch(`${API_BASE_URL}/subcategories/${categoryId}`, {
            method: "GET",
            headers: getAuthHeaders(),
          });
          if (subcatResponse.ok) {
            category = await subcatResponse.json();
            isSubcategory = true;
          } else {
            throw new Error(`Failed to fetch category: ${subcatResponse.status} ${subcatResponse.statusText}`);
          }
        } catch (subcatErr) {
          throw new Error(`Failed to fetch category or subcategory`);
        }
      }

      if (!category) {
        throw new Error("Category not found");
      }

      // Auto-generate slug if not present - always ensure slug is set
      const categorySlug = category.slug || (category.name ? category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : "");

      // If it's a subcategory, map category field to parent
      const parentId = isSubcategory
        ? (category.category && typeof category.category === 'object' && category.category !== null ? category.category._id : (category.category || ""))
        : (category.parent && typeof category.parent === 'object' && category.parent !== null ? category.parent._id : (category.parent || ""));

      setCategoryForm({
        name: category.name || "",
        description: category.description || "",
        type: isSubcategory ? (category.category && typeof category.category === 'object' && category.category !== null ? category.category.type : "Digital") : (category.type || "Digital"),
        parent: parentId,
        sortOrder: category.sortOrder || 0,
        slug: categorySlug, // Always set slug, even if auto-generated
        image: null,
        existingImage: category.image || "",
      });
      setIsSlugManuallyEdited(!!category.slug); // If category has a slug, consider it manually set

      // Set editing state before updating URL
      setEditingCategoryId(categoryId);

      // Update URL instead of setting state directly
      updateUrl("categories", "edit", categoryId);
      setError(null);

      // Fetch available parent categories (excluding current category and its descendants)
      fetchAvailableParentCategories(categoryId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditingCategoryId(null);
    setEditingCategoryImage(null);
    setEditingSubCategoryId(null);
    setSelectedType("");
    setFilteredCategoriesByType([]);
    setFilteredSubCategories([]);
    setIsProductSlugManuallyEdited(false);
    // Reset form modes to default (show category form)
    setIsSubCategoryMode(false);
    setIsNestedSubcategoryMode(false);
    setProductForm({
      name: "",
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
        deliverySpeed: [] as string[],
        textureType: [] as string[],
      },
      maxFileSizeMB: "",
      blockCDRandJPG: false,
      additionalDesignCharge: "",
      gstPercentage: "",
      instructions: "",
      quantityDiscounts: [],
      minFileWidth: "",
      maxFileWidth: "",
      minFileHeight: "",
      maxFileHeight: "",
      productionSequence: [] as string[],
      showPriceIncludingGst: false,
      variants: [],
      existingImage: "",
    });
    setOptionsTable([]);
    setPrintingOptionsTable([]);
    setDeliverySpeedTable([]);
    setTextureTypeTable([]);
    setSubcategoryProducts([]);
    setCategoryForm({
      name: "",
      description: "",
      type: "Digital",
      parent: "",
      sortOrder: getNextCategorySortOrder("Digital"),
      slug: "",
      image: null,
      existingImage: "",
    });
    setIsSlugManuallyEdited(false);
    setSubCategoryForm({
      name: "",
      description: "",
      category: "",
      parent: "",
      type: "",
      slug: "",
      sortOrder: 0,
      image: null,
      existingImage: "",
    });
    setIsSubCategorySlugManuallyEdited(false);
    setEditingSubCategoryImage(null);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete product: ${response.status} ${response.statusText}`);
      }

      await response.json();

      setSuccess("Product deleted successfully!");
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      setCategoryFormErrors({});
      let hasErrors = false;
      const errors: typeof categoryFormErrors = {};

      if (!categoryForm.name || categoryForm.name.trim() === "") {
        errors.name = "Category name is required";
        hasErrors = true;
      }

      if (hasErrors) {
        setCategoryFormErrors(errors);
        setError("Please fix the errors below");
        setLoading(false);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField === 'name') scrollToInvalidField("name", "category-name");
        return;
      }

      // If parent is selected, this should be saved as a subcategory
      if (categoryForm.parent) {
        // Validate parent category is selected
        if (!categoryForm.parent) {
          setError("Parent category is required for subcategory.");
          setLoading(false);
          return;
        }

        // Image is required when creating subcategory (not when updating)
        if (!editingCategoryId && !categoryForm.image) {
          errors.image = "Subcategory image is required. Please upload an image";
          hasErrors = true;
        }

        // Validate sort order uniqueness within the same parent category
        if (categoryForm.parent) {
          const conflictingSubcategory = subCategories.find((subCat: any) => {
            // Get parent category ID
            const parentId = typeof subCat.category === 'object' && subCat.category !== null ? subCat.category._id : subCat.category;
            // Check if same parent
            const sameParent = parentId === categoryForm.parent;
            // Check if same sort order
            const sameSortOrder = (subCat.sortOrder || 0) === categoryForm.sortOrder;
            // Check if it's a different subcategory (not the one being edited)
            const isDifferentSubcategory = subCat._id !== editingCategoryId;

            return sameParent && sameSortOrder && isDifferentSubcategory;
          });

          if (conflictingSubcategory) {
            const parentCategory = categories.find((cat: Category) => cat._id === categoryForm.parent);
            const parentName = parentCategory ? parentCategory.name : 'this category';
            errors.sortOrder = `Sort order ${categoryForm.sortOrder} is already used by another subcategory in ${parentName}. Please use a different sort order.`;
            hasErrors = true;
          }
        }

        if (hasErrors) {
          setCategoryFormErrors(errors);
          setError("Please fix the errors below");
          setLoading(false);
          const firstErrorField = Object.keys(errors)[0];
          if (firstErrorField === 'image') scrollToInvalidField("image", "category-image");
          else if (firstErrorField === 'sortOrder') {
            // Scroll to sort order field
            const sortOrderField = document.querySelector('input[type="number"]');
            if (sortOrderField) {
              sortOrderField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          return;
        }

        // Validate image file type and size if image is provided
        if (categoryForm.image) {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(categoryForm.image.type)) {
            setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
            setLoading(false);
            return;
          }
          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB in bytes
          if (categoryForm.image.size > maxSize) {
            setError("Image size must be less than 5MB. Please compress the image and try again.");
            setLoading(false);
            return;
          }
        }

        // Create/update subcategory
        const formData = new FormData();
        formData.append("name", categoryForm.name.trim());
        formData.append("description", categoryForm.description || "");
        formData.append("category", categoryForm.parent); // parent becomes category in subcategory model
        // Add sort order
        formData.append("sortOrder", categoryForm.sortOrder.toString());
        // Add slug - use provided slug or auto-generate unique slug from name
        const baseSlug = categoryForm.slug || (categoryForm.name ? categoryForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
        const slugToSend = baseSlug ? generateUniqueSlug(baseSlug, editingCategoryId, null) : '';
        if (slugToSend) {
          formData.append("slug", slugToSend.trim());
        }
        if (categoryForm.image) {
          formData.append("image", categoryForm.image);
        }

        const url = editingCategoryId
          ? `${API_BASE_URL}/subcategories/${editingCategoryId}`
          : `${API_BASE_URL}/subcategories`;
        const method = editingCategoryId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });

        // Use handleNgrokResponse which handles both success and error cases
        // This prevents reading the response body multiple times
        const data = await response.json();

        setSuccess(`Subcategory ${editingCategoryId ? "updated" : "created"} successfully!`);
        setCategoryForm({
          name: "",
          description: "",
          type: "Digital",
          parent: "",
          sortOrder: getNextCategorySortOrder("Digital"),
          slug: "",
          image: null,
          existingImage: "",
        });
        setIsSlugManuallyEdited(false);
        setEditingCategoryId(null);
        setEditingCategoryImage(null);
        // Reset form modes to default
        setIsSubCategoryMode(false);
        setIsNestedSubcategoryMode(false);
        // Navigate back to clean categories view
        updateUrl("categories");
        fetchCategories();
        fetchSubCategories(); // Refresh subcategories
        fetchAvailableParentCategories(); // Refresh available parents
      } else {
        // No parent selected - create/update as regular category
        if (!categoryForm.type) {
          errors.type = "Category type is required";
          hasErrors = true;
        }

        // Image is required when creating (not when updating)
        if (!editingCategoryId && !categoryForm.image) {
          errors.image = "Category image is required. Please upload an image";
          hasErrors = true;
        }

        // Validate sort order uniqueness within the same type
        if (categoryForm.type) {
          const conflictingCategory = categories.find((cat: Category) => {
            // Check if it's a main category (no parent)
            const isMainCategory = !cat.parent || (typeof cat.parent === 'object' && cat.parent !== null && !cat.parent._id);
            // Check if same type
            const sameType = cat.type === categoryForm.type;
            // Check if same sort order
            const sameSortOrder = (cat.sortOrder || 0) === categoryForm.sortOrder;
            // Check if it's a different category (not the one being edited)
            const isDifferentCategory = cat._id !== editingCategoryId;

            return isMainCategory && sameType && sameSortOrder && isDifferentCategory;
          });

          if (conflictingCategory) {
            errors.sortOrder = `Sort order ${categoryForm.sortOrder} is already used by another ${categoryForm.type} category (${conflictingCategory.name}). Please use a different sort order.`;
            hasErrors = true;
          }
        }

        if (hasErrors) {
          setCategoryFormErrors(errors);
          setError("Please fix the errors below");
          setLoading(false);
          const firstErrorField = Object.keys(errors)[0];
          if (firstErrorField === 'type') scrollToInvalidField("type", "category-type");
          else if (firstErrorField === 'image') scrollToInvalidField("image", "category-image");
          else if (firstErrorField === 'sortOrder') {
            // Scroll to sort order field
            const sortOrderField = document.querySelector('input[type="number"][value="' + categoryForm.sortOrder + '"]');
            if (sortOrderField) {
              sortOrderField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          return;
        }

        // Validate image file type and size if image is provided
        if (categoryForm.image) {
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
          if (!allowedTypes.includes(categoryForm.image.type)) {
            setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
            setLoading(false);
            return;
          }
          // Validate file size (max 5MB)
          const maxSize = 5 * 1024 * 1024; // 5MB in bytes
          if (categoryForm.image.size > maxSize) {
            setError("Image size must be less than 5MB. Please compress the image and try again.");
            setLoading(false);
            return;
          }
        }

        const formData = new FormData();
        formData.append("name", categoryForm.name.trim());
        formData.append("description", categoryForm.description || "");
        formData.append("type", categoryForm.type);
        formData.append("parent", ""); // Explicitly set to empty for top-level
        // Add sort order
        formData.append("sortOrder", categoryForm.sortOrder.toString());
        // Add slug - use provided slug or auto-generate unique slug from name
        const baseSlug = categoryForm.slug || (categoryForm.name ? categoryForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
        const slugToSend = baseSlug ? generateUniqueSlug(baseSlug, editingCategoryId, null) : '';
        if (slugToSend) {
          formData.append("slug", slugToSend.trim());
        }
        if (categoryForm.image) {
          formData.append("image", categoryForm.image);
        }

        const url = editingCategoryId
          ? `${API_BASE_URL}/categories/${editingCategoryId}`
          : `${API_BASE_URL}/categories`;
        const method = editingCategoryId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        });

        // Use handleNgrokResponse which handles both success and error cases
        // This prevents reading the response body multiple times
        const data = await response.json();

        setSuccess(`Category ${editingCategoryId ? "updated" : "created"} successfully!`);
        setCategoryForm({
          name: "",
          description: "",
          type: "Digital",
          parent: "",
          sortOrder: getNextCategorySortOrder("Digital"),
          slug: "",
          image: null,
          existingImage: "",
        });
        setIsSlugManuallyEdited(false);
        setEditingCategoryId(null);
        setEditingCategoryImage(null);
        // Reset form modes to default
        setIsSubCategoryMode(false);
        setIsNestedSubcategoryMode(false);
        // Navigate back to clean categories view
        updateUrl("categories");
        fetchCategories();
        fetchAvailableParentCategories(); // Refresh available parents
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingCategoryId ? "update" : "create"} ${categoryForm.parent ? "subcategory" : "category"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      setSubCategoryFormErrors({});
      let hasErrors = false;
      const errors: typeof subCategoryFormErrors = {};

      if (!subCategoryForm.name || subCategoryForm.name.trim() === "") {
        errors.name = "Subcategory name is required";
        hasErrors = true;
      }

      if (!subCategoryForm.category || subCategoryForm.category === "pending") {
        errors.category = "Parent category is required";
        hasErrors = true;
      }

      // Image is required when creating (not when updating)
      if (!editingSubCategoryId && !subCategoryForm.image) {
        errors.image = "Subcategory image is required. Please upload an image";
        hasErrors = true;
      }

      // Validate sort order uniqueness within the same parent category
      if (subCategoryForm.category && subCategoryForm.category !== "pending") {
        const conflictingSubcategory = subCategories.find((subCat: any) => {
          // Get parent category ID
          const parentId = typeof subCat.category === 'object' && subCat.category !== null ? subCat.category._id : subCat.category;
          // Check if same parent
          const sameParent = parentId === subCategoryForm.category;
          // Check if same sort order
          const sameSortOrder = (subCat.sortOrder || 0) === subCategoryForm.sortOrder;
          // Check if it's a different subcategory (not the one being edited)
          const isDifferentSubcategory = subCat._id !== editingSubCategoryId;

          return sameParent && sameSortOrder && isDifferentSubcategory;
        });

        if (conflictingSubcategory) {
          const parentCategory = categories.find((cat: Category) => cat._id === subCategoryForm.category);
          const parentName = parentCategory ? parentCategory.name : 'this category';
          errors.sortOrder = `Sort order ${subCategoryForm.sortOrder} is already used by another subcategory in ${parentName}. Please use a different sort order.`;
          hasErrors = true;
        }
      }

      if (hasErrors) {
        setSubCategoryFormErrors(errors);
        setError("Please fix the errors below");
        setLoading(false);
        const firstErrorField = Object.keys(errors)[0];
        if (firstErrorField === 'name') scrollToInvalidField("name", "subcategory-name");
        else if (firstErrorField === 'category') scrollToInvalidField("category", "subcategory-category");
        else if (firstErrorField === 'image') scrollToInvalidField("image", "subcategory-image");
        else if (firstErrorField === 'sortOrder') {
          // Scroll to sort order field
          const sortOrderField = document.querySelector('input[type="number"]');
          if (sortOrderField) {
            sortOrderField.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        return;
      }

      // Validate image file type and size if image is provided
      if (subCategoryForm.image) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(subCategoryForm.image.type)) {
          setError("Invalid image format. Please upload JPG, PNG, or WebP image.");
          setLoading(false);
          return;
        }
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (subCategoryForm.image.size > maxSize) {
          setError("Image size must be less than 5MB. Please compress the image and try again.");
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("name", subCategoryForm.name.trim());
      formData.append("description", subCategoryForm.description || "");
      formData.append("category", subCategoryForm.category);
      if (subCategoryForm.parent && subCategoryForm.parent !== "") {
        formData.append("parent", subCategoryForm.parent);
      }
      formData.append("sortOrder", subCategoryForm.sortOrder.toString());
      // Add slug - use provided slug or auto-generate unique slug from name
      const baseSlug = subCategoryForm.slug || (subCategoryForm.name ? subCategoryForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '');
      const slugToSend = baseSlug ? generateUniqueSlug(baseSlug, null, editingSubCategoryId) : '';
      if (slugToSend) {
        formData.append("slug", slugToSend.trim());
      }
      if (subCategoryForm.image) {
        formData.append("image", subCategoryForm.image);
      }

      const url = editingSubCategoryId
        ? `${API_BASE_URL}/subcategories/${editingSubCategoryId}`
        : `${API_BASE_URL}/subcategories`;
      const method = editingSubCategoryId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingSubCategoryId ? "update" : "create"} subcategory: ${response.status} ${response.statusText}`);
      }

      await response.json();

      setSuccess(`Subcategory ${editingSubCategoryId ? "updated" : "created"} successfully!`);

      // If we were viewing a category, refresh its subcategories
      if (selectedCategory) {
        await handleCategoryClick(selectedCategory);
      }

      setSubCategoryForm({
        name: "",
        description: "",
        category: "",
        parent: "",
        type: "",
        slug: "",
        sortOrder: 0,
        image: null,
        existingImage: "",
      });
      setIsSubCategorySlugManuallyEdited(false);
      setEditingSubCategoryId(null);
      setEditingSubCategoryImage(null);
      // Reset form modes to default
      setIsSubCategoryMode(false);
      setIsNestedSubcategoryMode(false);
      // Navigate back to clean categories view
      updateUrl("categories");
      fetchSubCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingSubCategoryId ? "update" : "create"} subcategory`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubCategory = async (subCategoryId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/subcategories/${subCategoryId}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subcategory: ${response.status} ${response.statusText}`);
      }

      const subCategory = await response.json();

      // Get type from parent category
      const parentCategory = typeof subCategory.category === "object" && subCategory.category !== null
        ? subCategory.category
        : categories.find(c => c._id === subCategory.category);
      const categoryType = parentCategory?.type || "";

      // Auto-generate slug if not present - always ensure slug is set
      const subCategorySlug = subCategory.slug || (subCategory.name ? subCategory.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : "");

      const categoryId = typeof subCategory.category === "object" && subCategory.category !== null ? subCategory.category._id : subCategory.category || "";
      const parentId = typeof subCategory.parent === "object" && subCategory.parent !== null ? subCategory.parent._id : (subCategory.parent || "");

      setSubCategoryForm({
        name: subCategory.name || "",
        description: subCategory.description || "",
        category: categoryId,
        parent: parentId,
        type: categoryType,
        slug: subCategorySlug, // Always set slug, even if auto-generated
        sortOrder: subCategory.sortOrder || 0,
        image: null,
        existingImage: subCategory.image || "",
      });
      setIsSubCategorySlugManuallyEdited(!!subCategory.slug); // If subcategory has a slug, consider it manually set

      // Set form modes based on whether it has a parent subcategory
      // If it has a parent, it's a nested subcategory - show nested form
      // If no parent, it's a regular subcategory - show subcategory form
      const isNested = !!parentId;
      setIsNestedSubcategoryMode(isNested);
      setIsSubCategoryMode(!isNested); // Show subcategory form for non-nested subcategories

      // Fetch available parent subcategories for the category (with nested children)
      if (categoryId) {
        setLoadingParentSubcategories(true);
        try {
          const response = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}?includeChildren=true`);
          if (response.ok) {
            const data = await response.json();
            // Flatten nested subcategories recursively for parent selection
            const flattenSubcategories = (subcats: any[], level: number = 0): any[] => {
              let result: any[] = [];
              subcats.forEach((subcat) => {
                // Filter out the current subcategory and its descendants from parent options to avoid circular references
                if (subcat._id !== subCategoryId) {
                  result.push({ ...subcat, _displayLevel: level });
                  if (subcat.children && subcat.children.length > 0) {
                    result = result.concat(flattenSubcategories(subcat.children, level + 1));
                  }
                }
              });
              return result;
            };
            const flattened = flattenSubcategories(Array.isArray(data) ? data : (data?.data || []));
            setAvailableParentSubcategories(flattened || []);
          } else {
            setAvailableParentSubcategories([]);
          }
        } catch (err) {
          console.error("Error fetching parent subcategories:", err);
          setAvailableParentSubcategories([]);
        } finally {
          setLoadingParentSubcategories(false);
        }
      } else {
        setAvailableParentSubcategories([]);
      }

      setEditingSubCategoryId(subCategoryId);
      setEditingSubCategoryImage(subCategory.image || null);

      // Update URL instead of setting active tab directly
      updateUrl("categories", "edit-sub", subCategoryId);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subcategory");
    } finally {
      setLoading(false);
    }
  };


  // Sync state with URL params
  useEffect(() => {
    const tab = searchParams.get("tab");

    // If no tab is present, default to 'products' and replace history entry
    if (!tab) {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          newParams.set("tab", "products");
          return newParams;
        },
        { replace: true }
      );
      return;
    }

    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }

    // Handle deep linking for edit actions
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    if (tab === "products" && action === "edit" && id) {
      if (id !== editingProductId) {
        // Load product data if not already checked loaded
        handleEditProduct(id);
      }
    } else if (tab === "categories" && action === "edit" && id) {
      if (id !== editingCategoryId) {
        handleEditCategory(id);
      }
    } else if (tab === "categories" && action === "edit-sub" && id) {
      if (id !== editingSubCategoryId) {
        handleEditSubCategory(id);
      }
    } else if (tab === "attribute-types" && action === "edit" && id) {
      if (id !== editingAttributeTypeId) {
        handleEditAttributeType(id);
      }
    } else if (tab === "products" && !action) {
      // Clear editing state if URL is just tabs
      if (editingProductId) setEditingProductId(null);
    } else if (tab === "categories" && !action) {
      if (editingCategoryId) setEditingCategoryId(null);
      if (editingSubCategoryId) setEditingSubCategoryId(null);
    } else if (tab === "attribute-types" && !action) {
      if (editingAttributeTypeId) setEditingAttributeTypeId(null);
    }
  }, [searchParams, activeTab, editingProductId, editingCategoryId, editingSubCategoryId]);

  const handleDeleteSubCategory = async (subCategoryId: string) => {
    const subCategory = subCategories.find(sc => sc._id === subCategoryId);
    if (!subCategory) return;

    // Check for products under this subcategory
    try {
      const productsResponse = await fetch(`${API_BASE_URL}/products/subcategory/${subCategoryId}`, {
        headers: getAuthHeaders(),
      });

      let productCount = 0;
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        productCount = Array.isArray(productsData) ? productsData.length : 0;
      }

      // Open confirmation modal
      setDeleteConfirmModal({
        isOpen: true,
        type: 'subcategory',
        id: subCategoryId,
        name: subCategory.name,
        productCount,
        subcategoryCount: 0,
        deleteText: '',
      });
    } catch (err) {
      console.error("Error checking products:", err);
      // Still open modal, but with 0 product count
      setDeleteConfirmModal({
        isOpen: true,
        type: 'subcategory',
        id: subCategoryId,
        name: subCategory.name,
        productCount: 0,
        subcategoryCount: 0,
        deleteText: '',
      });
    }
  };

  const confirmDeleteSubCategory = async () => {
    if (deleteConfirmModal.deleteText.toLowerCase() !== 'delete') {
      setError('Please type "delete" to confirm');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false });

    try {
      const response = await fetch(`${API_BASE_URL}/subcategories/${deleteConfirmModal.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Failed to delete subcategory: ${response.status} ${response.statusText}`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      await response.json();

      setSuccess("Subcategory deleted successfully!");
      fetchSubCategories();
      // Refresh category subcategories if viewing them
      if (selectedCategory) {
        handleCategoryClick(selectedCategory);
      }
      // Clear selection if deleted subcategory was selected
      if (selectedSubCategoryForView === deleteConfirmModal.id) {
        setSelectedSubCategoryForView(null);
        setCategoryProducts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete subcategory");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;

    try {
      // First check for child categories (subcategories) - if category has subcategories, prevent deletion
      const childCategoriesResponse = await fetch(`${API_BASE_URL}/subcategories/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      let childCategoryCount = 0;
      let childCategories: any[] = [];

      if (childCategoriesResponse.ok) {
        const childCategoriesData = await childCategoriesResponse.json();
        childCategories = Array.isArray(childCategoriesData) ? childCategoriesData : (childCategoriesData?.data || []);
        childCategoryCount = childCategories.length;
      } else {
        // Try fallback to old endpoint for backward compatibility
        try {
          const fallbackResponse = await fetch(`${API_BASE_URL}/categories/parent/${categoryId}`, {
            headers: getAuthHeaders(),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            childCategories = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
            childCategoryCount = childCategories.length;
          }
        } catch (fallbackErr) {
          // Ignore fallback errors
        }
      }

      // If category has child categories, block deletion
      if (childCategoryCount > 0) {
        setError(`Cannot delete category "${category.name}". It has ${childCategoryCount} child categor${childCategoryCount === 1 ? 'y' : 'ies'}. Please delete or reassign all child categories first.`);
        return;
      }

      // Check for products under this category
      const productsResponse = await fetch(`${API_BASE_URL}/products/category/${categoryId}`, {
        headers: getAuthHeaders(),
      });

      let productCount = 0;
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        productCount = Array.isArray(productsData) ? productsData.length : 0;
      }

      // Open confirmation modal
      setDeleteConfirmModal({
        isOpen: true,
        type: 'category',
        id: categoryId,
        name: category.name,
        productCount,
        subcategoryCount: childCategoryCount,
        deleteText: '',
      });
    } catch (err) {
      console.error("Error checking category dependencies:", err);
      setError("Failed to check category dependencies. Please try again.");
    }
  };

  const confirmDeleteCategory = async () => {
    if (deleteConfirmModal.deleteText.toLowerCase() !== 'delete') {
      setError('Please type "delete" to confirm');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false });

    try {
      const response = await fetch(`${API_BASE_URL}/categories/${deleteConfirmModal.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Failed to delete category: ${response.status} ${response.statusText}`;
        setError(errorMessage);
        setLoading(false);
        return;
      }

      await response.json();

      setSuccess("Category deleted successfully!");
      fetchCategories();
      // Clear selection if deleted category was selected
      if (selectedCategory === deleteConfirmModal.id) {
        setSelectedCategory(null);
        setCategorySubcategories([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  // handleUpdateUserRole and handleCreateEmployee moved to ManageUsers



  const handleDeleteUpload = async (uploadId: string) => {
    if (!window.confirm("Are you sure you want to delete this uploaded image?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/uploads/${uploadId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete upload: ${response.status} ${response.statusText}`);
      }

      await response.json();

      setSuccess("Uploaded image deleted successfully!");
      fetchUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete upload");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = (imageData: string, filename: string) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(imageData.split(",")[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/jpeg" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download image");
    }
  };

  const handleProductReorder = async (draggedId: string, targetId: string) => {
    // Optimistic update
    const draggedIndex = products.findIndex((p) => p._id === draggedId);
    const targetIndex = products.findIndex((p) => p._id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newProducts = [...products];
    const [draggedItem] = newProducts.splice(draggedIndex, 1);
    newProducts.splice(targetIndex, 0, draggedItem);

    setProducts(newProducts);

    // Also update filtered products if we are viewing them
    if (filteredProducts.length === products.length) {
      setFilteredProducts(newProducts);
    } else {
      // If filtered, we might need to update filtered list too if it contains both items
      const draggedFilteredIndex = filteredProducts.findIndex(p => p._id === draggedId);
      const targetFilteredIndex = filteredProducts.findIndex(p => p._id === targetId);

      if (draggedFilteredIndex !== -1 && targetFilteredIndex !== -1) {
        const newFiltered = [...filteredProducts];
        const [draggedF] = newFiltered.splice(draggedFilteredIndex, 1);
        newFiltered.splice(targetFilteredIndex, 0, draggedF);
        setFilteredProducts(newFiltered);
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products/reorder`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          draggedId,
          targetId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder products");
      }

      // Fetch to ensure server state
      fetchProducts();
    } catch (err) {
      console.error("Error reordering products:", err);
      toast.error("Failed to reorder products");
      fetchProducts(); // Revert
    }
  };

  const handleAddOptionRow = () => {
    const newIndex = optionsTable.length;
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

  // Helper functions for filter tables
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
          setShowOptionsTable(true);
        } else {
          setError("Options must be an array");
        }
      }
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  const tabs = [
    { id: "products", label: "Add Product", icon: Package },
    { id: "manage-products", label: "Manage Products", icon: Package },
    { id: "attribute-types", label: "Attribute Types", icon: Settings },
    { id: "attribute-rules", label: "Attribute Rules", icon: Settings },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "sequences", label: "Sequences", icon: Settings },
    { id: "categories", label: "Add Category", icon: FolderPlus },
    { id: "manage-categories", label: "Manage Categories", icon: FolderPlus },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "uploads", label: "Uploaded Images", icon: ImageIcon },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "print-partner-requests", label: "Print Partners", icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Admin Sidebar - New Professional Navigation */}
      <AdminSidebar activeTab={activeTab} onTabChange={(tab) => {
        updateUrl(tab);
        setError(null);
        setSuccess(null);
        // Clear edit state when switching tabs
        if (tab !== "products" && tab !== "categories") {
          handleCancelEdit();
        }
        // Fetch data when switching to management tabs
        if (tab === "manage-products") {
          setSelectedSubCategoryFilter("");
          fetchProducts();
        } else if (tab === "sort-products") {
          fetchCategories();
          fetchSubCategories();
          fetchProducts();
        } else if (tab === "manage-categories") {
          fetchCategories();
          fetchSubCategories();

        } else if (tab === "print-partner-requests") {
          fetchPrintPartnerRequests();
        } else if (tab === "orders") {
          fetchOrders();
        } else if (tab === "attribute-types") {
          fetchAttributeTypes();
        } else if (tab === "attribute-rules") {
          fetchAttributeTypes();
          fetchCategories();
          fetchProducts();
        } else if (tab === "products") {
          fetchAttributeTypes();
          fetchProducts();


        } else if (tab === "sub-attributes") {
          fetchAttributeTypes();
        } else if (tab === "uploads") {
          fetchUploads();
        }
      }} />

      {/* Main Content Area - Adjusted for Sidebar */}
      <div className="ml-64 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <BackButton fallbackPath="/" label="Back" className="text-cream-600 hover:text-cream-900 mb-4" />
          </div>
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900 mb-2">
              </h1>
              <p className="text-sm sm:text-base text-cream-600">
              </p>
            </div>
          </div>

          {/* 
            OLD TABS NAVIGATION - Moved to separate file for reference
            See: client/pages/admin/components/OldTabsNavigation.tsx
            This horizontal tabs navigation has been replaced with AdminSidebar component
          */}

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
              >
                <AlertCircle size={20} />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
              >
                <CheckCircle size={20} />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-lg p-6">

            {activeTab === "products" && (
              <AddProductForm
                productForm={productForm}
                setProductForm={setProductForm}
                productFormErrors={productFormErrors}
                setProductFormErrors={setProductFormErrors}
                isProductSlugManuallyEdited={isProductSlugManuallyEdited}
                setIsProductSlugManuallyEdited={setIsProductSlugManuallyEdited}
                optionsTable={optionsTable}
                setOptionsTable={setOptionsTable}
                printingOptionsTable={printingOptionsTable}
                setPrintingOptionsTable={setPrintingOptionsTable}
                deliverySpeedTable={deliverySpeedTable}
                setDeliverySpeedTable={setDeliverySpeedTable}
                textureTypeTable={textureTypeTable}
                setTextureTypeTable={setTextureTypeTable}
                filterPricesEnabled={filterPricesEnabled}
                setFilterPricesEnabled={setFilterPricesEnabled}
                selectedAttributeTypes={selectedAttributeTypes}
                setSelectedAttributeTypes={setSelectedAttributeTypes}
                categories={categories}
                subCategories={subCategories}
                subcategoriesByCategory={subcategoriesByCategory}
                nestedSubcategoriesByParent={nestedSubcategoriesByParent}
                categoryChildrenMap={categoryChildrenMap}
                loading={loading}
                setLoading={setLoading}
                error={error}
                setError={setError}
                success={success}
                setSuccess={setSuccess}
                editingProductId={editingProductId}
                setEditingProductId={setEditingProductId}
                fetchProducts={fetchProducts}
                fetchCategoryProducts={fetchCategoryProducts}
                fetchSubCategories={fetchSubCategories}
                fetchAttributeTypes={fetchAttributeTypes}
                fetchNestedSubCategories={fetchNestedSubCategories}
                fetchSubCategoriesForCategory={fetchSubCategoriesForCategory}
                fetchCategoryChildren={fetchCategoryChildren}
                handleSubCategoryClick={handleSubCategoryClick}
                handleCategoryClick={handleCategoryClick}
                selectedCategory={selectedCategory}
                selectedSubCategoryForView={selectedSubCategoryForView}
                setSubcategoryProducts={setSubcategoryProducts}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                setFilteredCategoriesByType={setFilteredCategoriesByType}
                selectedCategoryPath={selectedCategoryPath}
                setSelectedCategoryPath={setSelectedCategoryPath}
                setCategoryChildrenMap={setCategoryChildrenMap}
                setFieldErrors={setFieldErrors}
                attributeTypeForm={attributeTypeForm}
                setAttributeTypeForm={setAttributeTypeForm}
                attributeFormErrors={attributeFormErrors}
                setAttributeFormErrors={setAttributeFormErrors}
                handleAttributeTypeSubmit={handleAttributeTypeSubmit}
                handleCancelEdit={handleCancelEdit}
                handleEditAttributeType={handleEditAttributeType}
                handleDeleteAttributeType={handleDeleteAttributeType}
                showCreateAttributeModal={showCreateAttributeModal}
                setShowCreateAttributeModal={setShowCreateAttributeModal}
                editingAttributeTypeId={editingAttributeTypeId}
                setEditingAttributeTypeId={setEditingAttributeTypeId}
                updateUrl={updateUrl}
                generateUniqueSlug={generateUniqueSlug}
                loadingCategoryChildren={loadingCategoryChildren}
                categoryProducts={categoryProducts}
                setCategoryProducts={setCategoryProducts}
                loadingCategoryProducts={loadingCategoryProducts}
                setLoadingCategoryProducts={setLoadingCategoryProducts}
                handleEditProduct={handleEditProduct}

                attributeTypes={attributeTypes}
                loadingAttributeTypes={loadingAttributeTypes}
                attributeTypeSearch={attributeTypeSearch}
                setAttributeTypeSearch={setAttributeTypeSearch}
                loadingSubcategories={loadingSubcategories}
              />
            )}

            {/* Add Category Tab - using refactored component */}
            {activeTab === "categories" && (
              <AddCategoryForm
                categories={categories}
                subCategories={subCategories}
                categoryForm={categoryForm}
                setCategoryForm={setCategoryForm}
                subCategoryForm={subCategoryForm}
                setSubCategoryForm={setSubCategoryForm}
                categoryFormErrors={categoryFormErrors}
                setCategoryFormErrors={setCategoryFormErrors}
                subCategoryFormErrors={subCategoryFormErrors}
                setSubCategoryFormErrors={setSubCategoryFormErrors}
                editingCategoryId={editingCategoryId}
                setEditingCategoryId={setEditingCategoryId}
                editingSubCategoryId={editingSubCategoryId}
                setEditingSubCategoryId={setEditingSubCategoryId}
                isNestedSubcategoryMode={isNestedSubcategoryMode}
                setIsNestedSubcategoryMode={setIsNestedSubcategoryMode}
                isSubCategoryMode={isSubCategoryMode}
                setIsSubCategoryMode={setIsSubCategoryMode}
                isSlugManuallyEdited={isSlugManuallyEdited}
                setIsSlugManuallyEdited={setIsSlugManuallyEdited}
                isSubCategorySlugManuallyEdited={isSubCategorySlugManuallyEdited}
                setIsSubCategorySlugManuallyEdited={setIsSubCategorySlugManuallyEdited}
                onCategorySubmit={handleCategorySubmit}
                onSubCategorySubmit={handleSubCategorySubmit}
                onCancelEdit={() => { handleCancelEdit(); updateUrl("categories"); }}
                loading={loading}
                error={error}
                success={success}
                fetchCategories={fetchCategories}
                fetchSubCategories={fetchSubCategories}
              />
            )}




            {/* Orders Management */}
            {activeTab === "orders" && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-cream-900">
                    Orders ({orders.length})
                  </h2>
                  <button
                    onClick={fetchOrders}
                    disabled={loadingOrders}
                    className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingOrders ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Loading...
                      </>
                    ) : (
                      "Refresh"
                    )}
                  </button>
                </div>

                {loadingOrders ? (
                  <div className="text-center py-12">
                    <Loader className="animate-spin text-cream-600 mx-auto mb-4" size={48} />
                    <p className="text-cream-600">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-cream-200">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-50 text-cream-400" />
                    <p className="text-cream-600">No orders found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      // Skip orders with null product
                      if (!order.product) {
                        return (
                          <div
                            key={order._id}
                            className="bg-white rounded-lg border border-cream-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg border border-cream-200 flex items-center justify-center">
                                <Package size={24} className="text-gray-400" />
                              </div>
                              <div>
                                <h3 className="font-bold text-cream-900 text-lg">Product Not Found</h3>
                                <p className="text-sm text-cream-600 font-semibold">Order #{order.orderNumber}</p>
                                <p className="text-xs text-cream-500 mt-1">
                                  {order.user?.name || "Unknown"} ({order.user?.email || "Unknown"})
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={order._id}
                          className="bg-white rounded-lg border border-cream-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-cream-100">
                            <div className="flex items-center gap-4">
                              <img
                                src={order.product?.image || PLACEHOLDER_IMAGE}
                                alt={order.product?.name || "Product"}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-cream-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = PLACEHOLDER_IMAGE;
                                }}
                              />
                              <div>
                                <h3 className="font-bold text-cream-900 text-lg">{order.product?.name || "Unknown Product"}</h3>
                                <p className="text-sm text-cream-600 font-semibold">Order #{order.orderNumber}</p>
                                <p className="text-xs text-cream-500 mt-1">
                                  {order.user?.name || "Unknown"} ({order.user?.email || "Unknown"})
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`px-4 py-2 rounded-full border-2 flex items-center gap-2 ${order.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                                order.status === "processing" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                  order.status === "approved" ? "bg-purple-100 text-purple-800 border-purple-200" :
                                    order.status === "production_ready" ? "bg-orange-100 text-orange-800 border-orange-200" :
                                      order.status === "request" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                        order.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                                          "bg-gray-100 text-gray-800 border-gray-200"
                                }`}>
                                <span className="text-sm font-semibold capitalize">{order.status}</span>
                              </div>
                              {order.currentDepartment && typeof order.currentDepartment === "object" && (
                                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 flex items-center gap-2">
                                  <Building2 size={14} />
                                  <span className="text-xs font-medium">
                                    Current: {order.currentDepartment.name}
                                    {order.currentDepartmentIndex !== null && order.currentDepartmentIndex !== undefined && (
                                      <span className="ml-1 text-indigo-500">(#{order.currentDepartmentIndex + 1})</span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                            <div className="bg-cream-50 rounded-lg p-3">
                              <p className="text-xs text-cream-600 mb-1">Quantity</p>
                              <p className="font-bold text-cream-900">{order.quantity} units</p>
                            </div>
                            <div className="bg-cream-50 rounded-lg p-3">
                              <p className="text-xs text-cream-600 mb-1">Finish</p>
                              <p className="font-bold text-cream-900">{order.finish}</p>
                            </div>
                            <div className="bg-cream-50 rounded-lg p-3">
                              <p className="text-xs text-cream-600 mb-1">Shape</p>
                              <p className="font-bold text-cream-900">{order.shape}</p>
                            </div>
                            <div className="bg-cream-50 rounded-lg p-3">
                              <p className="text-xs text-cream-600 mb-1">Total Price</p>
                              <p className="font-bold text-cream-900">₹{order.totalPrice.toFixed(2)}</p>
                            </div>
                            <div className="bg-cream-50 rounded-lg p-3">
                              <p className="text-xs text-cream-600 mb-1">Mobile</p>
                              <p className="font-bold text-cream-900 text-xs">{order.mobileNumber || "N/A"}</p>
                            </div>
                          </div>

                          {order.selectedOptions && order.selectedOptions.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-cream-600 mb-2">Selected Options</p>
                              <div className="flex flex-wrap gap-2">
                                {order.selectedOptions.map((option, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-cream-100 text-cream-800 rounded text-xs"
                                  >
                                    {typeof option === "string" ? option : option.optionName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Uploaded Front Image Display */}
                          {order.uploadedDesign?.frontImage && (
                            <div className="mb-4 p-3 bg-cream-50 rounded-lg border border-cream-200">
                              <p className="text-xs font-medium text-cream-700 mb-2 flex items-center gap-2">
                                <ImageIcon size={14} />
                                Uploaded Front Design
                              </p>
                              <img
                                src={order.uploadedDesign.frontImage.data || PLACEHOLDER_IMAGE}
                                alt="Front design"
                                className="w-full max-h-48 object-contain rounded border border-cream-300 bg-white"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const errorDiv = document.createElement("div");
                                  errorDiv.className = "w-full h-48 flex items-center justify-center bg-red-50 text-red-600 rounded border border-red-200 text-sm";
                                  errorDiv.textContent = "Failed to load image";
                                  target.parentElement?.appendChild(errorDiv);
                                }}
                              />
                            </div>
                          )}

                          {/* Customer Notes - Small Display */}
                          {order.notes && (
                            <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs font-semibold text-blue-700 mb-1">Customer Notes:</p>
                              <p className="text-xs text-blue-900 line-clamp-2">{order.notes}</p>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setOrderStatusUpdate({
                                  status: order.status,
                                  deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : "",
                                  adminNotes: order.adminNotes || "",
                                });
                                setShowOrderModal(true);
                              }}
                              className="flex-1 px-4 py-2.5 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                            >
                              <Eye size={16} />
                              {order.status !== "cancelled" ? "View & Manage" : "View Details"}
                            </button>
                            {order.status === "request" && (
                              <>
                                <button
                                  onClick={() => handleUpdateOrderStatus(order._id, "production_ready")}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <Check size={16} />
                                  Production Ready
                                </button>
                                <button
                                  onClick={() => handleRejectOrder(order._id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <XCircle size={16} />
                                  Reject
                                </button>
                              </>
                            )}
                            {order.status === "production_ready" && (
                              <>
                                <div className="flex flex-col gap-2">
                                  <input
                                    type="date"
                                    value={order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                      const newDate = e.target.value;
                                      if (newDate) {
                                        handleUpdateOrderStatus(order._id, undefined, undefined, newDate);
                                      }
                                    }}
                                    className="px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 text-sm"
                                    placeholder="Delivery Date"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order._id, undefined, "start_production")}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <Play size={16} />
                                      Start
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Are you sure you want to cancel this order?")) {
                                          handleUpdateOrderStatus(order._id, "cancelled");
                                        }
                                      }}
                                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <XCircle size={16} />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="text-xs text-cream-500 pt-2 border-t border-cream-100">
                            Ordered: {!isClient
                              ? 'Loading...'
                              : new Date(order.createdAt).toLocaleString()
                            }
                            {order.deliveryDate && (
                              <span className="ml-4">
                                Delivery: {!isClient
                                  ? 'Loading...'
                                  : new Date(order.deliveryDate).toLocaleDateString()
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Uploaded Images */}
            {activeTab === "uploads" && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-cream-900">
                    Uploaded Images ({uploads.length})
                  </h2>
                  <button
                    onClick={() => fetchUploads(false)}
                    disabled={loadingUploads}
                    className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingUploads ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Loading...
                      </>
                    ) : (
                      "Refresh"
                    )}
                  </button>
                </div>

                {loadingUploads ? (
                  <div className="text-center py-12">
                    <Loader className="animate-spin text-cream-600 mx-auto mb-4" size={48} />
                    <p className="text-cream-600">Loading uploaded images...</p>
                  </div>
                ) : uploads.length === 0 ? (
                  <div className="text-center py-12 text-cream-600">
                    <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No uploaded images yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {uploads.map((upload) => (
                      <div
                        key={upload._id}
                        className="border border-cream-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative bg-white"
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedUpload(upload);
                            setShowUploadModal(true);
                          }}
                        >
                          {upload.frontImage ? (
                            <div className="aspect-video bg-cream-100 relative group">
                              {imageLoading[`front-${upload._id}`] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-cream-100 z-10">
                                  <Loader className="animate-spin text-cream-600" size={24} />
                                </div>
                              )}
                              <img
                                src={getImageUrl(upload.frontImage.data, upload.frontImage.contentType) || PLACEHOLDER_IMAGE}
                                alt={upload.frontImage.filename}
                                className={`w-full h-full object-cover ${imageLoading[`front-${upload._id}`] ? "opacity-0" : "opacity-100"} transition-opacity`}
                                onLoad={() => setImageLoading(prev => ({ ...prev, [`front-${upload._id}`]: false }))}
                                onError={(e) => {
                                  setImageLoading(prev => ({ ...prev, [`front-${upload._id}`]: false }));
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const errorDiv = document.createElement("div");
                                  errorDiv.className = "absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-xs p-2";
                                  errorDiv.textContent = "Failed to load image";
                                  target.parentElement?.appendChild(errorDiv);
                                }}
                                onLoadStart={() => setImageLoading(prev => ({ ...prev, [`front-${upload._id}`]: true }))}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadImage(
                                    upload.frontImage!.data,
                                    upload.frontImage!.filename || "image.jpg"
                                  );
                                }}
                                className="absolute top-2 left-2 p-2 bg-cream-900/80 text-white rounded-lg hover:bg-cream-900 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 shadow-md z-20"
                                title="Download image"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="aspect-video bg-cream-100 flex items-center justify-center">
                              <p className="text-cream-400 text-sm">No image</p>
                            </div>
                          )}
                          <div className="p-3 sm:p-4">
                            <p className="font-semibold text-sm sm:text-base text-cream-900 truncate">
                              {upload.user.name}
                            </p>
                            <p className="text-xs sm:text-sm text-cream-600 truncate">
                              {upload.user.email}
                            </p>
                            <p className="text-xs text-cream-500 mt-2">
                              {upload.width} × {upload.height}px
                            </p>
                            <p className="text-xs text-cream-500">
                              {!isClient
                                ? 'Loading...'
                                : new Date(upload.createdAt).toLocaleDateString()
                              }
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUpload(upload._id);
                          }}
                          disabled={loading}
                          className="absolute top-2 right-2 p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-1 shadow-md z-20"
                          title="Delete upload"
                        >
                          {loading ? (
                            <Loader className="animate-spin" size={14} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manage Products */}
            {/* Manage Products */}
            {activeTab === "manage-products" && (
              <ManageProductsView
                products={products}
                filteredProducts={filteredProducts}
                productSearchQuery={productSearchQuery}
                setProductSearchQuery={setProductSearchQuery}
                selectedCategoryFilter={selectedCategoryFilter}
                setSelectedCategoryFilter={setSelectedCategoryFilter}
                selectedSubCategoryFilter={selectedSubCategoryFilter}
                setSelectedSubCategoryFilter={setSelectedSubCategoryFilter}
                handleEditProduct={handleEditProduct}
                handleDeleteProduct={handleDeleteProduct}
                fetchProducts={fetchProducts}
                loading={loading || loadingProducts || filteringProducts}
                error={error}
                success={success}
                categories={categories}
                subCategories={subCategories}
              />
            )}

            {/* Sort Products */}
            {activeTab === "sort-products" && (
              <SortProductsView
                categories={categories}
                subCategories={subCategories}
              />
            )}

            {/* Manage Categories */}
            {activeTab === "manage-categories" && (
              <ManageCategoriesView
                categories={categories}
                filteredCategories={filteredCategories}
                subCategories={subCategories}
                filteredSubCategories={filteredSubCategories}
                categorySearchQuery={categorySearchQuery}
                setCategorySearchQuery={setCategorySearchQuery}
                categoryTypeFilter={categoryTypeFilter}
                setCategoryTypeFilter={setCategoryTypeFilter}
                categoryTopLevelFilter={categoryTopLevelFilter}
                setCategoryTopLevelFilter={setCategoryTopLevelFilter}
                subCategorySearchQuery={subCategorySearchQuery}
                setSubCategorySearchQuery={setSubCategorySearchQuery}
                draggedCategoryId={draggedCategoryId}
                setDraggedCategoryId={setDraggedCategoryId}
                draggedSubCategoryId={draggedSubCategoryId}
                setDraggedSubCategoryId={setDraggedSubCategoryId}
                handleCategoryReorder={handleCategoryReorder}
                handleSubCategoryReorder={handleSubCategoryReorder}
                handleEditCategory={handleEditCategory}
                handleDeleteCategory={handleDeleteCategory}
                handleEditSubCategory={handleEditSubCategory}
                handleDeleteSubCategory={handleDeleteSubCategory}
                deleteConfirmModal={deleteConfirmModal}
                setDeleteConfirmModal={setDeleteConfirmModal}
                viewDescriptionModal={viewDescriptionModal}
                setViewDescriptionModal={setViewDescriptionModal}
                loading={loading}
                error={error}
                success={success}
                updateUrl={updateUrl}
                fetchCategories={fetchCategories}
                fetchSubCategories={fetchSubCategories}
                expandedCategories={expandedCategories}
                setExpandedCategories={setExpandedCategories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
            )}

            {/* Attribute Types Management */}
            {activeTab === "attribute-types" && (
              <ManageAttributeTypes
                attributeTypeForm={attributeTypeForm}
                setAttributeTypeForm={setAttributeTypeForm}
                attributeFormErrors={attributeFormErrors}
                setAttributeFormErrors={setAttributeFormErrors}
                editingAttributeTypeId={editingAttributeTypeId}
                setEditingAttributeTypeId={setEditingAttributeTypeId}
                handleAttributeTypeSubmit={handleAttributeTypeSubmit}
                handleEditAttributeType={handleEditAttributeType}
                handleDeleteAttributeType={handleDeleteAttributeType}
                error={error}
                setError={setError}
                success={success}
                loading={loading}
                setLoading={setLoading}
                attributeTypeSearch={attributeTypeSearch}
                setAttributeTypeSearch={setAttributeTypeSearch}
                attributeTypes={attributeTypes}
                loadingAttributeTypes={loadingAttributeTypes}
                getAuthHeaders={getAuthHeaders}
              />
            )}

            {/* Department Management */}
            {activeTab === "departments" && (
              <ManageDepartments
                setError={setError}
                setSuccess={setSuccess}
                loading={loading}
                setLoading={setLoading}
              />
            )}


            {/* Sequences Management */}
            {activeTab === "sequences" && (
              <ManageSequences
                setError={setError}
                setSuccess={setSuccess}
                loading={loading}
                setLoading={setLoading}
                onNavigate={setActiveTab}
              />
            )}




            {/* Attribute Rules Management */}
            {
              activeTab === "attribute-rules" && (
                <ManageAttributeRules
                  attributeTypes={attributeTypes}
                  products={products}
                  categories={categories}
                  setLoading={setLoading}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )
            }

            {
              activeTab === "sub-attributes" && (
                <ManageSubAttributes
                  attributeTypes={attributeTypes}
                  setLoading={setLoading}
                  setError={setError}
                  setSuccess={setSuccess}
                />
              )
            }

            {/* Manage Users */}
            {
              activeTab === "users" && (
                <ManageUsers setError={setError} />
              )
            }

            {/* Print Partner Requests Tab */}
            {
              activeTab === "print-partner-requests" && (
                <div className="bg-white rounded-xl shadow-md border border-cream-200 p-6">
                  <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-cream-900 mb-2">
                        Print Partner Requests
                      </h2>
                      <p className="text-sm text-cream-600">
                        Review and approve print partner registration requests
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={printPartnerRequestFilter}
                        onChange={(e) => {
                          setPrintPartnerRequestFilter(e.target.value as typeof printPartnerRequestFilter);
                          fetchPrintPartnerRequests();
                        }}
                        className="px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 text-sm"
                      >
                        <option value="all">All Requests</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        onClick={fetchPrintPartnerRequests}
                        className="px-4 py-2 bg-cream-200 text-cream-900 rounded-lg hover:bg-cream-300 transition-colors text-sm"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {printPartnerRequests.length === 0 ? (
                    <div className="text-center py-12 text-cream-600">
                      <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
                      <p>No print partner requests found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {printPartnerRequests.map((request) => (
                        <div
                          key={request._id}
                          className={`border - 2 rounded - lg p - 5 transition - all ${request.status === "pending"
                            ? "border-yellow-300 bg-yellow-50"
                            : request.status === "approved"
                              ? "border-green-300 bg-green-50"
                              : "border-red-300 bg-red-50"
                            } `}
                        >
                          <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="text-lg font-bold text-cream-900 mb-1">
                                    {request.businessName}
                                  </h3>
                                  <p className="text-sm text-cream-600">
                                    Owner: {request.ownerName}
                                  </p>
                                </div>
                                <span
                                  className={`px - 3 py - 1 rounded - full text - xs font - semibold ${request.status === "pending"
                                    ? "bg-yellow-200 text-yellow-800"
                                    : request.status === "approved"
                                      ? "bg-green-200 text-green-800"
                                      : "bg-red-200 text-red-800"
                                    } `}
                                >
                                  {request.status.toUpperCase()}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div>
                                  <p className="text-xs text-cream-600 mb-1">Email</p>
                                  <p className="text-sm font-medium text-cream-900">{request.emailAddress}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-cream-600 mb-1">Mobile</p>
                                  <p className="text-sm font-medium text-cream-900">+91 {request.mobileNumber}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-cream-600 mb-1">WhatsApp</p>
                                  <p className="text-sm font-medium text-cream-900">+91 {request.whatsappNumber}</p>
                                </div>
                                {request.gstNumber && (
                                  <div>
                                    <p className="text-xs text-cream-600 mb-1">GST Number</p>
                                    <p className="text-sm font-medium text-cream-900">{request.gstNumber}</p>
                                  </div>
                                )}
                              </div>

                              <div className="mb-3">
                                <p className="text-xs text-cream-600 mb-1">Business Address</p>
                                <p className="text-sm text-cream-900">
                                  {request.fullBusinessAddress}, {request.city}, {request.state} - {request.pincode}
                                </p>
                              </div>

                              {request.proofFileUrl && (
                                <div className="mb-3">
                                  <p className="text-xs text-cream-600 mb-2">Proof Document</p>
                                  <img
                                    src={request.proofFileUrl}
                                    alt="Proof"
                                    className="max-w-xs h-auto rounded-lg border border-cream-200 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(request.proofFileUrl, "_blank")}
                                  />
                                </div>
                              )}

                              {request.status === "approved" && request.userId && (
                                <div className="mt-3 p-3 bg-green-100 rounded-lg">
                                  <p className="text-xs text-green-700 mb-1">User Account Created</p>
                                  <p className="text-sm font-medium text-green-900">
                                    {request.userId.name} ({request.userId.email})
                                  </p>
                                </div>
                              )}

                              {request.status === "rejected" && request.rejectionReason && (
                                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                                  <p className="text-xs text-red-700 mb-1">Rejection Reason</p>
                                  <p className="text-sm text-red-900">{request.rejectionReason}</p>
                                </div>
                              )}

                              <div className="text-xs text-cream-500 mt-3">
                                Submitted: {new Date(request.createdAt).toLocaleString()}
                                {request.approvedAt && (
                                  <> | {request.status === "approved" ? "Approved" : "Rejected"}: {new Date(request.approvedAt).toLocaleString()}</>
                                )}
                              </div>
                            </div>

                            {request.status === "pending" && (
                              <div className="flex flex-col gap-2 lg:w-48">
                                <button
                                  onClick={() => handleApprovePrintPartnerRequest(request._id)}
                                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                  <CheckCircle size={18} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => setSelectedRequestId(request._id)}
                                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                  <XCircle size={18} />
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            {/* Rejection Modal */}
            <AnimatePresence>
              {selectedRequestId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                  onClick={() => {
                    setSelectedRequestId(null);
                    setRejectionReason("");
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                  >
                    <h3 className="text-xl font-bold text-cream-900 mb-4">
                      Reject Print Partner Request
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-cream-700 mb-2">
                        Reason for Rejection <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 resize-none"
                        placeholder="Please provide a reason for rejection..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedRequestId(null);
                          setRejectionReason("");
                        }}
                        className="flex-1 px-4 py-2 border border-cream-300 text-cream-900 rounded-lg hover:bg-cream-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRejectPrintPartnerRequest(selectedRequestId)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div >
        </div >

        {/* Order Details Modal */}
        <AnimatePresence>
          {
            showOrderModal && selectedOrder && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
                >
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-cream-200">
                    <div>
                      <h2 className="text-2xl font-bold text-cream-900">
                        Order #{selectedOrder.orderNumber}
                      </h2>
                      <p className="text-sm text-cream-600 mt-1">
                        {!isClient
                          ? 'Loading...'
                          : new Date(selectedOrder.createdAt).toLocaleString()
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowOrderModal(false);
                        setSelectedOrder(null);
                        setOrderStatusUpdate({ status: "", deliveryDate: "", adminNotes: "" });
                      }}
                      className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Complete Order Information */}
                  <div className="space-y-6 mb-6">
                    {/* Order Status */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-cream-700">Status:</span>
                      <div className={`px - 4 py - 2 rounded - full border - 2 ${selectedOrder.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                        selectedOrder.status === "processing" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          selectedOrder.status === "production_ready" ? "bg-orange-100 text-orange-800 border-orange-200" :
                            selectedOrder.status === "request" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                              selectedOrder.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                                "bg-gray-100 text-gray-800 border-gray-200"
                        } `}>
                        <span className="text-sm font-semibold capitalize">{selectedOrder.status}</span>
                      </div>
                    </div>

                    {/* User Information */}
                    <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                      <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                        <Users size={18} />
                        Customer Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-cream-600 mb-1 font-medium">Customer Name</p>
                          <p className="font-semibold text-cream-900 text-base">{selectedOrder.user.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-cream-600 mb-1 font-medium">Email Address</p>
                          <p className="font-semibold text-cream-900 text-base">{selectedOrder.user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Product Information */}
                    <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                      <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                        <Package size={18} />
                        Product Information
                      </h3>
                      <div className="flex gap-4 mb-3">
                        <img
                          src={selectedOrder.product.image || PLACEHOLDER_IMAGE}
                          alt={selectedOrder.product.name}
                          className="w-24 h-24 object-cover rounded-lg border border-cream-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = PLACEHOLDER_IMAGE;
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-bold text-cream-900 text-lg mb-1">{selectedOrder.product.name}</p>
                          <p className="text-sm text-cream-600 mb-2">
                            Category: {selectedOrder.product.category && typeof selectedOrder.product.category === "object" && selectedOrder.product.category !== null && '_id' in selectedOrder.product.category
                              ? ((selectedOrder.product.category as { _id: string; name: string }).name || "N/A")
                              : (typeof selectedOrder.product.category === 'string' ? selectedOrder.product.category : "N/A")}
                          </p>
                          <p className="text-sm text-cream-600">
                            Base Price: ₹{selectedOrder.product.basePrice?.toFixed(2) || "0.00"} per unit
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order Customization Details */}
                    <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                      <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                        <Settings size={18} />
                        Customization Details
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-cream-600 mb-1">Quantity</p>
                          <p className="font-bold text-cream-900">{selectedOrder.quantity} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-cream-600 mb-1">Finish</p>
                          <p className="font-bold text-cream-900">{selectedOrder.finish}</p>
                        </div>
                        <div>
                          <p className="text-xs text-cream-600 mb-1">Shape</p>
                          <p className="font-bold text-cream-900">{selectedOrder.shape}</p>
                        </div>
                        <div>
                          <p className="text-xs text-cream-600 mb-1">Total Price</p>
                          <p className="font-bold text-cream-900">₹{selectedOrder.totalPrice.toFixed(2)}</p>
                        </div>
                      </div>

                      {selectedOrder.selectedOptions && selectedOrder.selectedOptions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-cream-200">
                          <p className="text-xs text-cream-600 mb-2 font-semibold">Selected Options</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.selectedOptions.map((option, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-cream-200 text-cream-800 rounded-full text-xs font-medium"
                              >
                                {typeof option === "string" ? option : (option.optionName || option.name || "Option")}
                                {typeof option === "object" && option.priceAdd ? ` (+₹${option.priceAdd.toFixed(2)})` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Dynamic Attributes */}
                      {selectedOrder.selectedDynamicAttributes && selectedOrder.selectedDynamicAttributes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-cream-200">
                          <p className="text-xs text-cream-600 mb-2 font-semibold">Selected Attributes</p>
                          <div className="space-y-2">
                            {selectedOrder.selectedDynamicAttributes.map((attr, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-2 rounded-lg bg-cream-100 border border-cream-200"
                              >
                                <div className="flex items-center gap-2">
                                  {attr.image && attr.image.trim() !== "" && (
                                    <img src={attr.image} alt={attr.attributeName} className="w-8 h-8 object-cover rounded" />
                                  )}
                                  <div>
                                    <p className="text-xs font-medium text-cream-900">{attr.attributeName}</p>
                                    <p className="text-xs text-cream-600">{attr.label}</p>
                                    {attr.description && <p className="text-xs text-cream-500 mt-0.5">{attr.description}</p>}
                                  </div>
                                </div>
                                {(attr.priceAdd > 0 || attr.priceMultiplier) && (
                                  <div className="text-right">
                                    {attr.priceAdd > 0 && (
                                      <span className="block text-xs font-bold text-cream-900">
                                        +₹{attr.priceAdd.toFixed(2)}
                                      </span>
                                    )}
                                    {attr.priceMultiplier && attr.priceMultiplier !== 1 && (
                                      <span className="block text-xs text-cream-600">
                                        ×{attr.priceMultiplier.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {/* Display uploaded images if any */}
                                {attr.uploadedImages && attr.uploadedImages.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-cream-200 w-full">
                                    <p className="text-xs text-cream-600 mb-2 font-semibold">Uploaded Images:</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {attr.uploadedImages.map((img, imgIdx) => {
                                        // Convert buffer to base64 data URL for display
                                        let imageUrl = '';
                                        if (img.data) {
                                          if (typeof img.data === 'string') {
                                            imageUrl = `data:${img.contentType || 'image/jpeg'};base64,${img.data}`;
                                          } else if (Buffer.isBuffer(img.data)) {
                                            imageUrl = `data:${img.contentType || 'image/jpeg'};base64,${img.data.toString('base64')}`;
                                          }
                                        }
                                        return imageUrl ? (
                                          <div key={imgIdx} className="relative">
                                            <img
                                              src={imageUrl}
                                              alt={img.filename || `Image ${imgIdx + 1}`}
                                              className="w-full h-24 object-cover rounded border border-cream-200"
                                            />
                                            <p className="text-xs text-cream-500 mt-1 truncate">{img.filename}</p>
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    {(() => {
                      const orderForCalc: OrderForCalculation = {
                        quantity: selectedOrder.quantity,
                        product: {
                          basePrice: selectedOrder.product.basePrice || 0,
                          gstPercentage: selectedOrder.product.gstPercentage || 18,
                          options: selectedOrder.product.options,
                          filters: selectedOrder.product.filters,
                          quantityDiscounts: (selectedOrder.product as any)?.quantityDiscounts || [],
                        },
                        finish: selectedOrder.finish,
                        shape: selectedOrder.shape,
                        selectedOptions: selectedOrder.selectedOptions?.map((opt) => ({
                          name: typeof opt === 'string' ? opt : (opt.optionName || opt.name || 'Option'),
                          optionName: typeof opt === 'string' ? opt : (opt.optionName || opt.name || 'Option'),
                          priceAdd: typeof opt === 'object' ? (opt.priceAdd || 0) : 0,
                        })) || [],
                        selectedDynamicAttributes: selectedOrder.selectedDynamicAttributes?.map((attr) => ({
                          attributeName: attr.attributeName,
                          label: attr.label,
                          priceMultiplier: attr.priceMultiplier,
                          priceAdd: attr.priceAdd,
                        })),
                      };

                      const calculations = calculateOrderBreakdown(orderForCalc);

                      return (
                        <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                          <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                            <CreditCard size={18} />
                            Price Breakdown
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-cream-200">
                              <div className="text-cream-600">
                                <span>
                                  Base Price ({selectedOrder.quantity.toLocaleString()} ×{' '}
                                  {formatCurrency(selectedOrder.product.basePrice || 0)})
                                </span>
                              </div>
                              <span className="font-medium text-cream-900">{formatCurrency(calculations.rawBaseTotal)}</span>
                            </div>

                            {calculations.discountPercentage > 0 && (
                              <div className="flex justify-between items-center text-green-700 bg-green-50 p-2 rounded-md">
                                <div>
                                  <span className="font-semibold">
                                    Bulk Discount ({calculations.discountPercentage}%)
                                  </span>
                                  <p className="text-xs opacity-80">Applied for {selectedOrder.quantity} units</p>
                                </div>
                                <span className="font-bold">
                                  -{formatCurrency(calculations.rawBaseTotal - calculations.discountedBaseTotal)}
                                </span>
                              </div>
                            )}

                            {calculations.optionBreakdowns.map((opt, idx) => (
                              <div key={idx} className="flex justify-between items-center text-cream-600">
                                <span>
                                  {opt.name} {opt.isPerUnit ? `(${selectedOrder.quantity} × ${formatCurrency(opt.priceAdd)})` : ''}
                                </span>
                                <span>+{formatCurrency(opt.cost)}</span>
                              </div>
                            ))}

                            {/* Show dynamic attributes if they have price impact */}
                            {selectedOrder.selectedDynamicAttributes && selectedOrder.selectedDynamicAttributes.length > 0 && (
                              <>
                                {selectedOrder.selectedDynamicAttributes
                                  .filter(attr => attr.priceAdd > 0 || (attr.priceMultiplier && attr.priceMultiplier !== 1))
                                  .map((attr, idx) => {
                                    // Calculate price impact for this attribute
                                    const basePrice = selectedOrder.product.basePrice || 0;
                                    let attributeCost = 0;
                                    let pricePerUnit = 0;
                                    if (attr.priceAdd > 0) {
                                      pricePerUnit = attr.priceAdd;
                                      attributeCost = attr.priceAdd * selectedOrder.quantity;
                                    } else if (attr.priceMultiplier && attr.priceMultiplier !== 1) {
                                      pricePerUnit = basePrice * (attr.priceMultiplier - 1);
                                      attributeCost = pricePerUnit * selectedOrder.quantity;
                                    }

                                    if (attributeCost === 0) return null;

                                    return (
                                      <div key={`attr-${idx}`} className="flex justify-between items-center text-cream-600">
                                        <span>
                                          {attr.attributeName} ({attr.label})
                                        </span>
                                        <span>+{formatCurrency(pricePerUnit)}/unit × {selectedOrder.quantity.toLocaleString()} = {formatCurrency(attributeCost)}</span>
                                      </div>
                                    );
                                  })}
                              </>
                            )}

                            <div className="flex justify-between items-center pt-2 font-medium text-cream-900 border-t border-cream-200">
                              <span>Subtotal</span>
                              <span>{formatCurrency(calculations.subtotal)}</span>
                            </div>

                            <div className="flex justify-between items-center text-cream-600 text-xs">
                              <span>GST ({selectedOrder.product.gstPercentage || 18}%)</span>
                              <span>+{formatCurrency(calculations.gstAmount)}</span>
                            </div>

                            <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-cream-300">
                              <span className="text-base font-bold text-cream-900">Total Amount</span>
                              <span className="text-lg font-bold text-cream-900">{formatCurrency(selectedOrder.totalPrice)}</span>
                            </div>

                            <div className="mt-3 pt-3 border-t border-cream-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-cream-600 text-xs">Advance Paid</span>
                                <span className="font-medium text-green-700">
                                  {formatCurrency(selectedOrder.advancePaid || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-cream-600 text-xs">Balance Due</span>
                                <span
                                  className={`font-bold ${selectedOrder.totalPrice - (selectedOrder.advancePaid || 0) > 0
                                    ? 'text-red-600'
                                    : 'text-cream-500'
                                    }`}
                                >
                                  {formatCurrency(selectedOrder.totalPrice - (selectedOrder.advancePaid || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Delivery Information */}
                    <div className="bg-cream-50 rounded-lg p-4 border border-cream-200">
                      <h3 className="font-bold text-cream-900 mb-3 flex items-center gap-2">
                        <Truck size={18} />
                        Delivery Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-cream-600 mb-1">Complete Address</p>
                          <p className="font-semibold text-cream-900 text-sm whitespace-pre-wrap">{selectedOrder.address || "N/A"}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-cream-600 mb-1">Mobile Number</p>
                            <p className="font-semibold text-cream-900">{selectedOrder.mobileNumber || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cream-600 mb-1">Pincode</p>
                            <p className="font-semibold text-cream-900">{selectedOrder.pincode}</p>
                          </div>
                          <div>
                            <p className="text-xs text-cream-600 mb-1">Delivery Date</p>
                            <p className="font-semibold text-cream-900">
                              {selectedOrder.deliveryDate
                                ? (!isClient
                                  ? 'Loading...'
                                  : new Date(selectedOrder.deliveryDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  }))
                                : "Not set"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Department Status */}
                    {selectedOrder.currentDepartment && (
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-4">
                        <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                          <Building2 size={18} />
                          Current Department
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="px-4 py-2 bg-white rounded-lg border border-indigo-200">
                            <p className="text-xs text-indigo-600 mb-1">Currently Working On</p>
                            <p className="text-lg font-bold text-indigo-900">
                              {typeof selectedOrder.currentDepartment === "object" && selectedOrder.currentDepartment !== null
                                ? (selectedOrder.currentDepartment as { _id: string; name: string; sequence: number }).name
                                : "Department"}
                            </p>
                            {selectedOrder.currentDepartmentIndex !== null && selectedOrder.currentDepartmentIndex !== undefined && (
                              <p className="text-xs text-indigo-500 mt-1">
                                Position in Sequence: #{selectedOrder.currentDepartmentIndex + 1}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Production Progress - Enhanced */}
                    {selectedOrder.departmentStatuses && selectedOrder.departmentStatuses.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-blue-900 flex items-center gap-2">
                            <Truck size={18} />
                            Production Progress
                          </h3>
                          {(() => {
                            const totalStages = selectedOrder.departmentStatuses.length;
                            const completedStages = selectedOrder.departmentStatuses.filter(ds => ds.status === "completed").length;
                            const inProgressStages = selectedOrder.departmentStatuses.filter(ds => ds.status === "in_progress").length;

                            return (
                              <div className="text-xs text-blue-700 font-medium">
                                {completedStages}/{totalStages} Stages Completed
                                {inProgressStages > 0 && ` • ${inProgressStages} In Progress`}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Progress Bar */}
                        {(() => {
                          const totalStages = selectedOrder.departmentStatuses.length;
                          const completedStages = selectedOrder.departmentStatuses.filter(ds => ds.status === "completed").length;
                          const progressPercent = Math.round((completedStages / totalStages) * 100);

                          return (
                            <div className="mb-4">
                              <div className="w-full bg-blue-200 rounded-full h-2.5 mb-1">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <p className="text-xs text-blue-700 text-right">{progressPercent}% Complete</p>
                            </div>
                          );
                        })()}

                        <div className="space-y-2">
                          {selectedOrder.departmentStatuses
                            .sort((a, b) => {
                              const seqA = typeof a.department === "object" ? a.department.sequence : 0;
                              const seqB = typeof b.department === "object" ? b.department.sequence : 0;
                              return seqA - seqB;
                            })
                            .map((deptStatus, idx) => {
                              const deptName = typeof deptStatus.department === "object"
                                ? deptStatus.department.name
                                : "Department";
                              const status = deptStatus.status;

                              // Calculate duration if started and completed
                              let durationText = "";
                              if (deptStatus.startedAt && deptStatus.completedAt) {
                                const start = new Date(deptStatus.startedAt);
                                const end = new Date(deptStatus.completedAt);
                                const durationMs = end.getTime() - start.getTime();
                                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                if (hours > 0) {
                                  durationText = `${hours}h ${minutes}m`;
                                } else {
                                  durationText = `${minutes}m`;
                                }
                              }

                              return (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
                                  <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${status === "completed" ? "bg-green-500" :
                                    status === "in_progress" ? "bg-blue-500 animate-pulse" :
                                      status === "paused" ? "bg-yellow-500" :
                                        status === "stopped" ? "bg-red-500" :
                                          "bg-gray-300"
                                    }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-semibold text-blue-900">{deptName}</span>
                                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${status === "completed" ? "bg-green-100 text-green-800" :
                                        status === "in_progress" ? "bg-blue-100 text-blue-800" :
                                          status === "paused" ? "bg-yellow-100 text-yellow-800" :
                                            status === "stopped" ? "bg-red-100 text-red-800" :
                                              "bg-gray-100 text-gray-800"
                                        }`}>
                                        {status.replace("_", " ").toUpperCase()}
                                      </span>
                                    </div>

                                    {/* Timestamps */}
                                    <div className="space-y-1 mt-2">
                                      {deptStatus.whenAssigned && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <Clock size={12} className="text-purple-600" />
                                          <span className="text-purple-600">
                                            Assigned: {new Date(deptStatus.whenAssigned).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {deptStatus.startedAt && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <Clock size={12} className="text-blue-600" />
                                          <span className="text-blue-600">
                                            Started: {new Date(deptStatus.startedAt).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {deptStatus.completedAt && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <CheckCircle size={12} className="text-green-600" />
                                          <span className="text-green-600">
                                            Completed: {new Date(deptStatus.completedAt).toLocaleString()}
                                            {durationText && ` (Duration: ${durationText})`}
                                          </span>
                                        </div>
                                      )}
                                      {deptStatus.pausedAt && status === "paused" && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <Clock size={12} className="text-yellow-600" />
                                          <span className="text-yellow-600">
                                            Paused: {new Date(deptStatus.pausedAt).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {deptStatus.stoppedAt && status === "stopped" && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <X size={12} className="text-red-600" />
                                          <span className="text-red-600">
                                            Stopped: {new Date(deptStatus.stoppedAt).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      {deptStatus.operator && (
                                        <div className="flex items-center gap-2 text-xs mt-1">
                                          <Users size={12} className="text-cream-600" />
                                          <span className="text-cream-600">
                                            Operator: {typeof deptStatus.operator === "object" && deptStatus.operator && '_id' in deptStatus.operator
                                              ? `${deptStatus.operator.name || 'N/A'} (${('email' in deptStatus.operator && typeof deptStatus.operator.email === 'string' ? deptStatus.operator.email : 'N/A')})`
                                              : 'N/A'}
                                          </span>
                                        </div>
                                      )}
                                      {deptStatus.notes && (
                                        <div className="text-xs text-cream-600 mt-1 italic">
                                          Notes: {deptStatus.notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Production Timeline - Activity Log */}
                    {selectedOrder.productionTimeline && selectedOrder.productionTimeline.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                        <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <Clock size={18} />
                          Production Activity Timeline
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {Array.isArray(selectedOrder.productionTimeline) && selectedOrder.productionTimeline
                            .sort((a: any, b: any) => (new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()))
                            .map((timelineItem: any, idx: number) => {
                              const deptName = typeof timelineItem.department === "object"
                                ? timelineItem.department.name
                                : "Department";
                              const operatorName = timelineItem.operator
                                ? (typeof timelineItem.operator === "object"
                                  ? `${timelineItem.operator.name} (${timelineItem.operator.email})`
                                  : timelineItem.operator)
                                : "System";

                              const actionColors: { [key: string]: string } = {
                                started: "bg-blue-100 text-blue-800 border-blue-300",
                                paused: "bg-yellow-100 text-yellow-800 border-yellow-300",
                                resumed: "bg-green-100 text-green-800 border-green-300",
                                completed: "bg-green-100 text-green-800 border-green-300",
                                stopped: "bg-red-100 text-red-800 border-red-300",
                              };

                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${timelineItem.action === "completed" ? "bg-green-500" :
                                    timelineItem.action === "started" ? "bg-blue-500" :
                                      timelineItem.action === "paused" ? "bg-yellow-500" :
                                        timelineItem.action === "stopped" ? "bg-red-500" :
                                          "bg-gray-400"
                                    }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                                      <span className="text-sm font-semibold text-purple-900">{deptName}</span>
                                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${actionColors[timelineItem.action] || "bg-gray-100 text-gray-800 border-gray-300"
                                        }`}>
                                        {timelineItem.action.toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-purple-600 mb-1">
                                      <Clock size={12} />
                                      <span>{new Date(timelineItem.timestamp).toLocaleString()}</span>
                                    </div>
                                    {operatorName && (
                                      <div className="flex items-center gap-2 text-xs text-purple-600 mb-1">
                                        <Users size={12} />
                                        <span>Operator: {operatorName}</span>
                                      </div>
                                    )}
                                    {timelineItem.notes && (
                                      <div className="text-xs text-purple-700 mt-1 italic bg-purple-50 p-2 rounded border border-purple-100">
                                        {timelineItem.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Customer Notes */}
                    {selectedOrder.notes && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                          <Info size={18} />
                          Customer Notes
                        </h3>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedOrder.notes}</p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {selectedOrder.adminNotes && (
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                          <Settings size={18} />
                          Admin Notes
                        </h3>
                        <p className="text-sm text-amber-900 whitespace-pre-wrap">{selectedOrder.adminNotes}</p>
                      </div>
                    )}

                    {/* Uploaded Designs */}
                    {(selectedOrder.uploadedDesign?.frontImage || selectedOrder.uploadedDesign?.backImage) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200"
                      >
                        <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                          <ImageIcon size={20} />
                          Uploaded Customer Designs
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {selectedOrder.uploadedDesign?.frontImage && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            >
                              <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                Front Design
                              </p>
                              <div className="relative bg-white rounded-lg border-2 border-blue-200 p-4 shadow-md hover:shadow-lg transition-shadow">
                                <img
                                  src={selectedOrder.uploadedDesign.frontImage.data || PLACEHOLDER_IMAGE_LARGE}
                                  alt="Front design"
                                  className="w-full h-80 object-contain rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = PLACEHOLDER_IMAGE_LARGE;
                                  }}
                                />
                                <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">
                                      File: {selectedOrder.uploadedDesign.frontImage.filename || "front-design.png"}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-1">
                                      Type: {selectedOrder.uploadedDesign.frontImage.contentType || "image/png"}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = selectedOrder.uploadedDesign.frontImage.data || PLACEHOLDER_IMAGE_LARGE;
                                      link.download = selectedOrder.uploadedDesign.frontImage.filename || "front-design.png";
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                    title="Download image"
                                  >
                                    <Download size={14} />
                                    Download
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                          {selectedOrder.uploadedDesign?.backImage && (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            >
                              <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                Back Design
                              </p>
                              <div className="relative bg-white rounded-lg border-2 border-blue-200 p-4 shadow-md hover:shadow-lg transition-shadow">
                                <img
                                  src={selectedOrder.uploadedDesign.backImage.data || PLACEHOLDER_IMAGE_LARGE}
                                  alt="Back design"
                                  className="w-full h-80 object-contain rounded-lg"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = PLACEHOLDER_IMAGE_LARGE;
                                  }}
                                />
                                <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-blue-600 font-medium">
                                      File: {selectedOrder.uploadedDesign.backImage.filename || "back-design.png"}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-1">
                                      Type: {selectedOrder.uploadedDesign.backImage.contentType || "image/png"}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = selectedOrder.uploadedDesign.backImage.data || PLACEHOLDER_IMAGE_LARGE;
                                      link.download = selectedOrder.uploadedDesign.backImage.filename || "back-design.png";
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                    title="Download image"
                                  >
                                    <Download size={14} />
                                    Download
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Order Management Section */}
                  {selectedOrder.status !== "cancelled" && (
                    <div className="border-t border-cream-200 pt-6">
                      <h3 className="font-bold text-cream-900 mb-4 flex items-center gap-2">
                        <Settings size={18} />
                        Manage Order
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-cream-900 mb-2">
                            Order Status
                          </label>
                          <ReviewFilterDropdown
                            label="Select Status"
                            value={orderStatusUpdate.status}
                            onChange={(value) =>
                              setOrderStatusUpdate({ ...orderStatusUpdate, status: value as string })
                            }
                            options={[
                              { value: "request", label: "Request" },
                              { value: "processing", label: "Processing" },
                              { value: "completed", label: "Completed" },
                              { value: "rejected", label: "Rejected" },
                            ]}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-cream-900 mb-2">
                            Delivery Date
                          </label>
                          <input
                            type="date"
                            value={orderStatusUpdate.deliveryDate}
                            onChange={(e) =>
                              setOrderStatusUpdate({ ...orderStatusUpdate, deliveryDate: e.target.value })
                            }
                            className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-cream-900 mb-2">
                            Admin Notes
                          </label>
                          <textarea
                            value={orderStatusUpdate.adminNotes}
                            onChange={(e) =>
                              setOrderStatusUpdate({ ...orderStatusUpdate, adminNotes: e.target.value })
                            }
                            rows={4}
                            className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                            placeholder="Add notes for this order..."
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() => handleUpdateOrderStatus(selectedOrder._id)}
                            disabled={loading}
                            className="flex-1 bg-cream-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-cream-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <>
                                <Loader className="animate-spin" size={20} />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Check size={20} />
                                Update Order
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowOrderModal(false);
                              setSelectedOrder(null);
                              setOrderStatusUpdate({ status: "", deliveryDate: "", adminNotes: "" });
                            }}
                            className="px-6 py-3 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )
          }
        </AnimatePresence >

        {/* Upload Modal */}
        <AnimatePresence>
          {
            showUploadModal && selectedUpload && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-cream-900">
                        Upload Details
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (selectedUpload && window.confirm("Are you sure you want to delete this uploaded image?")) {
                              handleDeleteUpload(selectedUpload._id);
                              setShowUploadModal(false);
                              setSelectedUpload(null);
                            }
                          }}
                          disabled={loading}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                          title="Delete upload"
                        >
                          <Trash2 size={20} />
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            setShowUploadModal(false);
                            setSelectedUpload(null);
                          }}
                          className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                        >
                          <X size={24} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-cream-600">User</p>
                        <p className="font-semibold text-cream-900">
                          {selectedUpload.user.name} ({selectedUpload.user.email})
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-cream-600">Dimensions</p>
                        <p className="font-semibold text-cream-900">
                          {selectedUpload.width} × {selectedUpload.height}px
                        </p>
                      </div>

                      {selectedUpload.description && (
                        <div>
                          <p className="text-sm text-cream-600">Description</p>
                          <p className="text-cream-900">{selectedUpload.description}</p>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-cream-600">Front Image</p>
                          {selectedUpload.frontImage && (
                            <button
                              onClick={() =>
                                handleDownloadImage(
                                  selectedUpload.frontImage!.data,
                                  selectedUpload.frontImage!.filename ||
                                  "front-image.jpg"
                                )
                              }
                              className="px-3 py-1 text-xs bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                            >
                              <Download size={14} />
                              Download
                            </button>
                          )}
                        </div>
                        {selectedUpload.frontImage && (
                          <div className="relative">
                            {imageLoading[`modal-front-${selectedUpload._id}`] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-cream-100 rounded-lg">
                                <Loader className="animate-spin text-cream-600" size={32} />
                              </div>
                            )}
                            <img
                              src={getImageUrl(selectedUpload.frontImage.data, selectedUpload.frontImage.contentType) || PLACEHOLDER_IMAGE_LARGE}
                              alt={selectedUpload.frontImage.filename}
                              className={`w-full rounded-lg border border-cream-300 ${imageLoading[`modal-front-${selectedUpload._id}`] ? "opacity-0" : "opacity-100"} transition-opacity`}
                              onLoad={() => setImageLoading(prev => ({ ...prev, [`modal-front-${selectedUpload._id}`]: false }))}
                              onError={() => {
                                setImageLoading(prev => ({ ...prev, [`modal-front-${selectedUpload._id}`]: false }));
                                console.error("Failed to load image:", selectedUpload.frontImage?.filename);
                              }}
                              onLoadStart={() => setImageLoading(prev => ({ ...prev, [`modal-front-${selectedUpload._id}`]: true }))}
                            />
                          </div>
                        )}
                      </div>

                      {selectedUpload.backImage && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-cream-600">Back Image</p>
                            <button
                              onClick={() =>
                                handleDownloadImage(
                                  selectedUpload.backImage!.data,
                                  selectedUpload.backImage!.filename ||
                                  "back-image.jpg"
                                )
                              }
                              className="px-3 py-1 text-xs bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors flex items-center gap-2"
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </div>
                          <div className="relative">
                            {imageLoading[`modal-back-${selectedUpload._id}`] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-cream-100 rounded-lg">
                                <Loader className="animate-spin text-cream-600" size={32} />
                              </div>
                            )}
                            <img
                              src={getImageUrl(selectedUpload.backImage.data, selectedUpload.backImage.contentType) || PLACEHOLDER_IMAGE_LARGE}
                              alt={selectedUpload.backImage.filename}
                              className={`w-full rounded-lg border border-cream-300 ${imageLoading[`modal-back-${selectedUpload._id}`] ? "opacity-0" : "opacity-100"} transition-opacity`}
                              onLoad={() => setImageLoading(prev => ({ ...prev, [`modal-back-${selectedUpload._id}`]: false }))}
                              onError={() => {
                                setImageLoading(prev => ({ ...prev, [`modal-back-${selectedUpload._id}`]: false }));
                                console.error("Failed to load image:", selectedUpload.backImage?.filename);
                              }}
                              onLoadStart={() => setImageLoading(prev => ({ ...prev, [`modal-back-${selectedUpload._id}`]: true }))}
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-cream-600">Uploaded</p>
                        <p className="text-cream-900">
                          {!isClient
                            ? 'Loading...'
                            : new Date(selectedUpload.createdAt).toLocaleString()
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )
          }
        </AnimatePresence >

        {/* Delete Confirmation Modal */}
        {
          deleteConfirmModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-red-600" size={24} />
                  <h3 className="text-xl font-bold text-cream-900">
                    Delete {deleteConfirmModal.type === 'category' ? 'Category' : 'Subcategory'}
                  </h3>
                </div>

                <div className="mb-4">
                  <p className="text-cream-700 mb-3">
                    Are you sure you want to delete <strong>{deleteConfirmModal.name}</strong>?
                  </p>

                  {deleteConfirmModal.subcategoryCount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="text-red-600 mt-0.5" size={20} />
                        <div>
                          <p className="text-red-800 font-semibold mb-1">
                            ⚠️ Cannot Delete: This category has {deleteConfirmModal.subcategoryCount} subcategor{deleteConfirmModal.subcategoryCount === 1 ? 'y' : 'ies'}!
                          </p>
                          <p className="text-red-700 text-sm">
                            Please delete or reassign all subcategories before deleting this category.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {deleteConfirmModal.productCount > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="text-red-600 mt-0.5" size={20} />
                        <div>
                          <p className="text-red-800 font-semibold mb-1">
                            ⚠️ Warning: This will delete {deleteConfirmModal.productCount} product{deleteConfirmModal.productCount !== 1 ? 's' : ''}!
                          </p>
                          <p className="text-red-700 text-sm">
                            All products under this {deleteConfirmModal.type === 'category' ? 'category and its subcategories' : 'subcategory'} will be permanently deleted. This action cannot be undone.
                          </p>
                          <p className="text-red-700 text-sm mt-2 font-medium">
                            Please be careful before proceeding.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-cream-900 mb-2">
                      Type <strong>"delete"</strong> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmModal.deleteText}
                      onChange={(e) => setDeleteConfirmModal({ ...deleteConfirmModal, deleteText: e.target.value })}
                      className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                      placeholder="Type 'delete' to confirm"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmModal({ ...deleteConfirmModal, isOpen: false, deleteText: '' })}
                    className="flex-1 px-4 py-2 border border-cream-300 text-cream-700 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmModal.type === 'category') {
                        confirmDeleteCategory();
                      } else {
                        confirmDeleteSubCategory();
                      }
                    }}
                    disabled={deleteConfirmModal.deleteText.toLowerCase() !== 'delete' || loading || deleteConfirmModal.subcategoryCount > 0}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin inline mr-2" size={16} />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* View Description Modal */}
        {
          viewDescriptionModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Eye className="text-blue-600" size={24} />
                    <h3 className="text-xl font-bold text-cream-900">
                      {viewDescriptionModal.type === 'category' ? 'Category' : 'Subcategory'} Description
                    </h3>
                  </div>
                  <button
                    onClick={() => setViewDescriptionModal({ ...viewDescriptionModal, isOpen: false })}
                    className="text-cream-600 hover:text-cream-900 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-cream-900 mb-2">
                    {viewDescriptionModal.name}
                  </h4>
                  <div className="bg-cream-50 border border-cream-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div
                      className="text-cream-700 leading-relaxed rich-text-content"
                      dangerouslySetInnerHTML={{ __html: viewDescriptionModal.description }}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setViewDescriptionModal({ ...viewDescriptionModal, isOpen: false })}
                    className="px-6 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {/* Services Management */}
        {activeTab === "services" && (
          <ServiceManagement />
        )}

        {/* Site Settings Management */}
        {activeTab === "site-settings" && (
          <SiteSettingsManagement />
        )}

        {/* Create Employee Modal (for Department Section) */}
        <AnimatePresence>

        </AnimatePresence>
      </div >
    </div >
  );
};

// Force rebuild
export default AdminDashboard;
