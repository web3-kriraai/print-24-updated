import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderPlus,
    Plus,
    Loader,
    AlertCircle,
    Info,
    Upload,
    X,
    CheckCircle,
    ChevronRight,
    Sparkles,
    Layers,
    FolderTree,
    Image as ImageIcon
} from 'lucide-react';
import { ReviewFilterDropdown } from '../../../../components/ReviewFilterDropdown';
import AddSubCategoryForm from './AddSubCategoryForm';
import AddNestedSubCategoryForm from './AddNestedSubCategoryForm';

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

interface CategoryFormState {
    name: string;
    description: string;
    type: string;
    parent: string;
    sortOrder: number;
    slug: string;
    image: File | null;
    existingImage: string;
}

interface SubCategoryFormState {
    name: string;
    description: string;
    shortDescription: string;
    category: string;
    parent: string;
    type: string;
    slug: string;
    sortOrder: number;
    image: File | null;
    existingImage: string;
}

interface CategoryFormErrors {
    name?: string;
    type?: string;
    image?: string;
    sortOrder?: string;
}

interface SubCategoryFormErrors {
    name?: string;
    category?: string;
    image?: string;
    sortOrder?: string;
}

interface AddCategoryFormProps {
    categories: Category[];
    subCategories: any[];
    categoryForm: CategoryFormState;
    setCategoryForm: (form: CategoryFormState) => void;
    subCategoryForm: SubCategoryFormState;
    setSubCategoryForm: (form: SubCategoryFormState) => void;
    categoryFormErrors: CategoryFormErrors;
    setCategoryFormErrors: (errors: CategoryFormErrors) => void;
    subCategoryFormErrors: SubCategoryFormErrors;
    setSubCategoryFormErrors: (errors: SubCategoryFormErrors) => void;
    editingCategoryId: string | null;
    setEditingCategoryId: (id: string | null) => void;
    editingSubCategoryId: string | null;
    setEditingSubCategoryId: (id: string | null) => void;
    isNestedSubcategoryMode: boolean;
    setIsNestedSubcategoryMode: (mode: boolean) => void;
    isSubCategoryMode: boolean;
    setIsSubCategoryMode: (mode: boolean) => void;
    isSlugManuallyEdited: boolean;
    setIsSlugManuallyEdited: (edited: boolean) => void;
    isSubCategorySlugManuallyEdited: boolean;
    setIsSubCategorySlugManuallyEdited: (edited: boolean) => void;
    onCategorySubmit: (e: React.FormEvent) => Promise<void>;
    onSubCategorySubmit: (e: React.FormEvent) => Promise<void>;
    onCancelEdit: () => void;
    loading: boolean;
    error: string | null;
    success: string | null;
    fetchCategories: () => Promise<void>;
    fetchSubCategories: () => Promise<void>;
}

const AddCategoryForm: React.FC<AddCategoryFormProps> = ({
    categories,
    subCategories,
    categoryForm,
    setCategoryForm,
    subCategoryForm,
    setSubCategoryForm,
    categoryFormErrors,
    setCategoryFormErrors,
    subCategoryFormErrors,
    setSubCategoryFormErrors,
    editingCategoryId,
    setEditingCategoryId,
    editingSubCategoryId,
    setEditingSubCategoryId,
    isNestedSubcategoryMode,
    setIsNestedSubcategoryMode,
    isSubCategoryMode,
    setIsSubCategoryMode,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    isSubCategorySlugManuallyEdited,
    setIsSubCategorySlugManuallyEdited,
    onCategorySubmit,
    onSubCategorySubmit,
    onCancelEdit,
    loading,
    error,
    success,
    fetchCategories,
    fetchSubCategories,
}) => {
    const [isUploadHover, setIsUploadHover] = useState(false);

    // Auto-calculate sort order for Categories
    useEffect(() => {
        if (!editingCategoryId && !isSubCategoryMode && !isNestedSubcategoryMode) {
            const maxSortOrder = categories.reduce((max, cat) => Math.max(max, cat.sortOrder || 0), 0);
            if (categoryForm.sortOrder === 0 && maxSortOrder > 0) {
                setCategoryForm({
                    ...categoryForm,
                    sortOrder: maxSortOrder + 1
                });
            } else if (categoryForm.sortOrder === 0 && categories.length > 0) {
                setCategoryForm({
                    ...categoryForm,
                    sortOrder: maxSortOrder + 1
                });
            }
        }
    }, [categories.length, isSubCategoryMode, isNestedSubcategoryMode, editingCategoryId]);

    // Calculate form completion percentage
    const calculateProgress = () => {
        if (isSubCategoryMode || isNestedSubcategoryMode) {
            const requiredFields = [
                subCategoryForm.name?.trim(),
                subCategoryForm.category,
            ];
            const completed = requiredFields.filter(Boolean).length;
            return (completed / requiredFields.length) * 100;
        } else {
            const requiredFields = [
                categoryForm.name?.trim(),
                categoryForm.type,
            ];
            const completed = requiredFields.filter(Boolean).length;
            return (completed / requiredFields.length) * 100;
        }
    };

    const progress = calculateProgress();
    const isEditing = editingCategoryId || editingSubCategoryId;
    const formTitle = isSubCategoryMode || isNestedSubcategoryMode
        ? (editingSubCategoryId ? 'Edit Subcategory' : 'Add Subcategory')
        : (editingCategoryId ? 'Edit Category' : 'Add Category');

    // Get theme color based on type
    const getThemeColor = () => {
        if (isSubCategoryMode) return 'rose';
        if (isNestedSubcategoryMode) return 'yellow';
        return 'blue'; // Default for category
    };

    const themeColor = getThemeColor();
    const themeColors = {
        blue: {
            bg: 'from-blue-50 via-white to-blue-50',
            border: 'border-blue-100',
            iconBg: 'from-blue-100 to-white',
            iconBorder: 'border-blue-200',
            iconColor: 'text-blue-500',
            statusBg: 'bg-blue-100/50',
            statusBorder: 'border-blue-200',
            buttonActive: 'from-blue-500 to-blue-600',
            buttonHover: 'hover:border-blue-200',
            buttonFocus: 'focus:border-blue-400 focus:ring-blue-100',
            progressColor: 'from-blue-400 to-blue-500'
        },
        rose: {
            bg: 'from-rose-50 via-white to-rose-50',
            border: 'border-rose-100',
            iconBg: 'from-rose-100 to-white',
            iconBorder: 'border-rose-200',
            iconColor: 'text-rose-500',
            statusBg: 'bg-rose-100/50',
            statusBorder: 'border-rose-200',
            buttonActive: 'from-rose-500 to-rose-600',
            buttonHover: 'hover:border-rose-200',
            buttonFocus: 'focus:border-rose-400 focus:ring-rose-100',
            progressColor: 'from-rose-400 to-rose-500'
        },
        yellow: {
            bg: 'from-yellow-50 via-white to-yellow-50',
            border: 'border-yellow-100',
            iconBg: 'from-yellow-100 to-white',
            iconBorder: 'border-yellow-200',
            iconColor: 'text-yellow-500',
            statusBg: 'bg-yellow-100/50',
            statusBorder: 'border-yellow-200',
            buttonActive: 'from-yellow-500 to-yellow-600',
            buttonHover: 'hover:border-yellow-200',
            buttonFocus: 'focus:border-yellow-400 focus:ring-yellow-100',
            progressColor: 'from-yellow-400 to-yellow-500'
        }
    };

    const currentTheme = themeColors[themeColor as keyof typeof themeColors];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 md:space-y-6"
        >

            {/* Mode Selection - Dynamic Theme */}
            <AnimatePresence mode="wait">
                {!isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-xl p-4 shadow-sm border border-slate-200"
                    >
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-800">Category Type</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Select hierarchy level</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                {
                                    key: 'category',
                                    icon: FolderPlus,
                                    title: 'Category',
                                    desc: 'Top-level',
                                    active: !isSubCategoryMode && !isNestedSubcategoryMode,
                                    onClick: () => {
                                        setIsSubCategoryMode(false);
                                        setIsNestedSubcategoryMode(false);
                                    },
                                    theme: 'blue'
                                },
                                {
                                    key: 'subcategory',
                                    icon: Layers,
                                    title: 'Subcategory',
                                    desc: 'Under category',
                                    active: isSubCategoryMode && !isNestedSubcategoryMode,
                                    onClick: () => {
                                        setIsSubCategoryMode(true);
                                        setIsNestedSubcategoryMode(false);
                                    },
                                    theme: 'rose'
                                },
                                {
                                    key: 'nested',
                                    icon: FolderTree,
                                    title: 'Nested',
                                    desc: 'Under subcategory',
                                    active: isNestedSubcategoryMode,
                                    onClick: () => {
                                        setIsSubCategoryMode(false);
                                        setIsNestedSubcategoryMode(true);
                                    },
                                    theme: 'yellow'
                                }
                            ].map((item) => {
                                const itemTheme = themeColors[item.theme as keyof typeof themeColors];
                                return (
                                    <motion.button
                                        key={item.key}
                                        type="button"
                                        onClick={item.onClick}
                                        whileHover={{ scale: 1.01, y: -1 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`relative p-3 rounded-lg border transition-all duration-200 ${item.active
                                            ? `border-${item.theme}-300 bg-gradient-to-br from-${item.theme}-50 to-white shadow-sm`
                                            : `border-slate-200 ${itemTheme.buttonHover} bg-white`
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${item.active
                                                ? `bg-gradient-to-br from-${item.theme}-500 to-${item.theme}-600 text-white shadow-sm`
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                <item.icon size={16} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-semibold ${item.active ? 'text-slate-900' : 'text-slate-700'
                                                    }`}>
                                                    {item.title}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${item.active ? 'text-slate-600' : 'text-slate-500'
                                                    }`}>
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Mode Banner - Dynamic Theme */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`bg-gradient-to-r from-${themeColor}-50 to-indigo-50 rounded-lg p-3 border border-${themeColor}-200 shadow-sm`}
                    >
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-500 rounded-lg flex items-center justify-center shadow-sm`}>
                                    <Info size={14} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                        Editing: {(isSubCategoryMode || isNestedSubcategoryMode ? subCategoryForm.name : categoryForm.name) || 'Loading...'}
                                    </p>
                                </div>
                            </div>
                            <motion.button
                                type="button"
                                onClick={onCancelEdit}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="text-xs px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium border border-slate-300 shadow-sm w-full sm:w-auto mt-2 sm:mt-0"
                            >
                                Cancel Edit
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Indicator - Dynamic Theme */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-200"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 bg-gradient-to-br ${currentTheme.progressColor} rounded-lg flex items-center justify-center shadow-sm`}>
                            <CheckCircle size={14} className="text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-800">Progress</span>
                            <p className="text-xs text-slate-500">Required fields</p>
                        </div>
                    </div>
                    <motion.div
                        key={progress}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className={`text-sm font-bold text-${themeColor}-600`}
                    >
                        {Math.round(progress)}%
                    </motion.div>
                </div>
                <div className="relative">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{
                                type: "spring",
                                stiffness: 100,
                                damping: 20,
                                delay: 0.1
                            }}
                            className={`relative h-2 rounded-full bg-gradient-to-r ${currentTheme.progressColor}`}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Forms Section */}
            <AnimatePresence mode="wait">
                {/* Category Form - Blue Theme */}
                {!isSubCategoryMode && !isNestedSubcategoryMode && (
                    <motion.form
                        key="category-form"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={onCategorySubmit}
                        className="space-y-4 md:space-y-6"
                    >
                        {/* Header */}
                        <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-xl p-4 md:p-6 text-slate-800 shadow-sm border border-blue-100"
                        >
                            <div className="relative z-10 flex items-center gap-4">
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-12 h-12 bg-gradient-to-br from-blue-100 to-white backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-200 shadow-sm"
                                >
                                    <FolderPlus className="text-blue-500" size={20} />
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg md:text-xl font-bold text-slate-800">
                                        {isEditing ? 'Edit Category' : 'Add New Category'}
                                    </h2>
                                    <p className="text-xs md:text-sm text-slate-600 mt-1">
                                        Create a top-level category for your products
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                                        Category Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={categoryForm.name}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            const updates: any = { ...categoryForm, name: newName };

                                            if (!isSlugManuallyEdited) {
                                                updates.slug = newName
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, '-')
                                                    .replace(/^-+|-+$/g, '');
                                            }

                                            setCategoryForm(updates);
                                            if (categoryFormErrors.name) {
                                                setCategoryFormErrors({ ...categoryFormErrors, name: undefined });
                                            }
                                        }}
                                        className={`w-full px-3 py-2.5 text-sm bg-white border rounded-lg focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all ${categoryFormErrors.name
                                            ? 'border-red-300 bg-red-50/50'
                                            : 'border-slate-300 hover:border-slate-400'
                                            }`}
                                        placeholder="e.g., Digital Printing"
                                    />
                                    {categoryFormErrors.name && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <AlertCircle size={10} />
                                            {categoryFormErrors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                                        Type <span className="text-red-500">*</span>
                                    </label>
                                    <ReviewFilterDropdown
                                        label="Select Type"
                                        value={categoryForm.type}
                                        onChange={(value) => {
                                            setCategoryForm({ ...categoryForm, type: String(value) });
                                            if (categoryFormErrors.type) {
                                                setCategoryFormErrors({ ...categoryFormErrors, type: undefined });
                                            }
                                        }}
                                        options={[
                                            { value: '', label: 'Select Type' },
                                            { value: 'Digital', label: 'Digital' },
                                            { value: 'Bulk', label: 'Bulk' },
                                        ]}
                                        className="w-full text-sm"
                                        theme="blue"
                                    />
                                    {categoryFormErrors.type && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <AlertCircle size={10} />
                                            {categoryFormErrors.type}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Slug Field */}
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                                    URL Slug
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={categoryForm.slug}
                                        onChange={(e) => {
                                            setIsSlugManuallyEdited(true);
                                            setCategoryForm({
                                                ...categoryForm,
                                                slug: e.target.value
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9-]/g, ''),
                                            });
                                        }}
                                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all font-mono"
                                        placeholder="auto-generated-slug"
                                    />
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">URL</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all resize-none"
                                    placeholder="Enter category description..."
                                />
                            </div>

                            {/* Image Upload */}
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                                    Category Image
                                </label>
                                <div
                                    onMouseEnter={() => setIsUploadHover(true)}
                                    onMouseLeave={() => setIsUploadHover(false)}
                                    className="relative"
                                >
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden group"
                                        style={{
                                            borderColor: isUploadHover ? '#3b82f6' : '#cbd5e1',
                                            background: isUploadHover ? '#f0f9ff' : '#ffffff'
                                        }}
                                    >
                                        <AnimatePresence mode="wait">
                                            {categoryForm.image ? (
                                                <motion.div
                                                    key="preview"
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="relative w-full h-full"
                                                >
                                                    <img
                                                        src={URL.createObjectURL(categoryForm.image)}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                </motion.div>
                                            ) : categoryForm.existingImage ? (
                                                <motion.div
                                                    key="existing"
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="relative w-full h-full"
                                                >
                                                    <img
                                                        src={categoryForm.existingImage}
                                                        alt="Existing"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="upload"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex flex-col items-center justify-center p-4"
                                                >
                                                    <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    <p className="text-xs text-slate-600 font-medium">
                                                        <span className="text-blue-600">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP (5MB max)</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        setCategoryFormErrors({ ...categoryFormErrors, image: 'Image size must be less than 5MB.' });
                                                        return;
                                                    }
                                                    setCategoryForm({ ...categoryForm, image: file });
                                                    setCategoryFormErrors({ ...categoryFormErrors, image: undefined });
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>

                                    {categoryForm.image && (
                                        <motion.button
                                            type="button"
                                            onClick={() => setCategoryForm({ ...categoryForm, image: null })}
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white p-1 rounded-full shadow-sm z-10"
                                        >
                                            <X size={12} />
                                        </motion.button>
                                    )}
                                </div>
                                {categoryFormErrors.image && (
                                    <p className="mt-2 text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded">
                                        <AlertCircle size={12} />
                                        {categoryFormErrors.image}
                                    </p>
                                )}
                            </div>

                            {/* Sort Order */}
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                                    Sort Order
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={categoryForm.sortOrder}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                                        className="w-24 px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:border-blue-400 focus:ring-blue-100 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="pt-3"
                            >
                                <div className="flex justify-end">
                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        whileHover={!loading ? { scale: 1.01 } : {}}
                                        whileTap={!loading ? { scale: 0.99 } : {}}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm font-medium"
                                    >
                                        {loading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Loader size={16} />
                                            </motion.div>
                                        ) : (
                                            <>
                                                <Plus size={16} />
                                                <span>
                                                    {isEditing ? 'Update Category' : 'Create Category'}
                                                </span>
                                            </>
                                        )}
                                    </motion.button>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-3 p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg"
                                    >
                                        <p className="text-xs text-red-600 flex items-center gap-2">
                                            <AlertCircle size={14} />
                                            {error}
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    </motion.form>
                )}

                {/* Subcategory Form */}
                {isSubCategoryMode && (
                    <motion.div
                        key="subcategory-form"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AddSubCategoryForm
                            categories={categories}
                            subCategories={subCategories}
                            subCategoryForm={subCategoryForm}
                            setSubCategoryForm={setSubCategoryForm}
                            subCategoryFormErrors={subCategoryFormErrors}
                            setSubCategoryFormErrors={setSubCategoryFormErrors}
                            isSlugManuallyEdited={isSubCategorySlugManuallyEdited}
                            setIsSlugManuallyEdited={setIsSubCategorySlugManuallyEdited}
                            onSubmit={onSubCategorySubmit}
                            loading={loading}
                            error={error}
                            success={success}
                            editingSubCategoryId={editingSubCategoryId}
                        />
                    </motion.div>
                )}

                {/* Nested Subcategory Form */}
                {isNestedSubcategoryMode && (
                    <motion.div
                        key="nested-form"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AddNestedSubCategoryForm
                            categories={categories}
                            subCategories={subCategories}
                            subCategoryForm={subCategoryForm}
                            setSubCategoryForm={setSubCategoryForm}
                            subCategoryFormErrors={subCategoryFormErrors}
                            setSubCategoryFormErrors={setSubCategoryFormErrors}
                            isSlugManuallyEdited={isSubCategorySlugManuallyEdited}
                            setIsSlugManuallyEdited={setIsSubCategorySlugManuallyEdited}
                            onSubmit={onSubCategorySubmit}
                            loading={loading}
                            error={error}
                            success={success}
                            editingSubCategoryId={editingSubCategoryId}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AddCategoryForm;