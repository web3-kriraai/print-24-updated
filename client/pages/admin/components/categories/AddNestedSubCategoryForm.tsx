import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Image as ImageIcon, Loader, Plus, Save, X, Sparkles } from 'lucide-react';
import { ReviewFilterDropdown } from '../../../../components/ReviewFilterDropdown';
import RichTextEditor from '../../../../components/RichTextEditor';

interface SubCategoryFormState {
    name: string;
    description: string;
    shortDescription: string;
    category: string;
    parent: string;
    type: string;
    slug: string;
    sortOrder: number;
    image: null | File;
    existingImage: string;
}

interface AddNestedSubCategoryFormProps {
    categories: any[];
    subCategories: any[];
    subCategoryForm: SubCategoryFormState;
    setSubCategoryForm: (form: SubCategoryFormState) => void;
    subCategoryFormErrors: any;
    setSubCategoryFormErrors: (errors: any) => void;
    isSlugManuallyEdited: boolean;
    setIsSlugManuallyEdited: (isEdited: boolean) => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    loading: boolean;
    error: string | null;
    success: string | null;
    editingSubCategoryId: string | null;
}

const AddNestedSubCategoryForm: React.FC<AddNestedSubCategoryFormProps> = ({
    categories,
    subCategories,
    subCategoryForm,
    setSubCategoryForm,
    subCategoryFormErrors,
    setSubCategoryFormErrors,
    isSlugManuallyEdited,
    setIsSlugManuallyEdited,
    onSubmit,
    loading,
    error,
    success,
    editingSubCategoryId,
}) => {
    const [isUploadHover, setIsUploadHover] = useState(false);

    // Filter subcategories based on selected parent category
    const parentSubCategories = subCategories.filter(sc =>
        (typeof sc.category === 'object' ? sc.category?._id : sc.category) === subCategoryForm.category &&
        !sc.parent
    );

    // Auto-calculate sort order when parent subcategory changes
    useEffect(() => {
        if (subCategoryForm.parent) {
            const existingNested = subCategories.filter(sc =>
                (typeof sc.parent === 'object' ? sc.parent?._id : sc.parent) === subCategoryForm.parent
            );

            const maxSortOrder = existingNested.reduce((max, sc) => Math.max(max, sc.sortOrder || 0), 0);
            setSubCategoryForm({
                ...subCategoryForm,
                sortOrder: maxSortOrder + 1
            });
        }
    }, [subCategoryForm.parent, subCategories]);

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            onSubmit={onSubmit}
            className="space-y-4 md:space-y-6"
        >
            {/* Header - Yellow Theme */}
            <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-yellow-50 rounded-xl p-4 md:p-6 text-slate-800 shadow-sm border border-yellow-100"
            >
                <div className="relative z-10 flex items-center gap-4">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-white backdrop-blur-sm rounded-xl flex items-center justify-center border border-yellow-200 shadow-sm"
                    >
                        <Sparkles className="text-yellow-500" size={20} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800">
                            {editingSubCategoryId ? 'Edit Nested Subcategory' : 'Add Nested Subcategory'}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-600 mt-1">
                            Configure nested subcategory details under a parent subcategory
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Form Content */}
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Type Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Type <span className="text-red-500">*</span>
                        </label>
                        <ReviewFilterDropdown
                            label="Select Type"
                            value={subCategoryForm.type}
                            onChange={(value) => {
                                setSubCategoryForm({
                                    ...subCategoryForm,
                                    type: value as string,
                                    category: "",
                                    parent: "",
                                });
                            }}
                            options={[
                                { value: "", label: "Select Type" },
                                { value: "Digital", label: "Digital" },
                                { value: "Bulk", label: "Bulk" },
                            ]}
                            className="w-full text-sm"
                            theme="yellow"
                        />
                    </div>

                    {/* Top-Level Category Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Filter by Category
                        </label>
                        <ReviewFilterDropdown
                            label="Select Top Category"
                            value={subCategoryForm.category}
                            onChange={(value) => {
                                const category = categories.find((c) => c._id === value);
                                setSubCategoryForm({
                                    ...subCategoryForm,
                                    category: value as string,
                                    type: category?.type || subCategoryForm.type,
                                    parent: "",
                                });
                            }}
                            options={[
                                { value: "", label: "Select Category" },
                                ...categories
                                    .filter(cat => !subCategoryForm.type || cat.type === subCategoryForm.type)
                                    .map((cat) => ({
                                        value: cat._id,
                                        label: cat.name,
                                    })),
                            ]}
                            className="w-full text-sm"
                            theme="yellow"
                        />
                    </div>

                    {/* Parent Subcategory Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Parent Subcategory <span className="text-red-500">*</span>
                        </label>
                        <ReviewFilterDropdown
                            label="Select Parent Subcategory"
                            value={subCategoryForm.parent}
                            onChange={(value) => {
                                setSubCategoryForm({
                                    ...subCategoryForm,
                                    parent: value as string,
                                });
                                if (subCategoryFormErrors.category) {
                                    setSubCategoryFormErrors({ ...subCategoryFormErrors, category: undefined });
                                }
                            }}
                            options={[
                                { value: "", label: subCategoryForm.category ? "Select Parent Subcategory" : "Select Category First" },
                                ...parentSubCategories.map((sc) => ({
                                    value: sc._id,
                                    label: sc.name,
                                })),
                            ]}
                            className="w-full text-sm"
                            theme="yellow"
                        />
                        {subCategoryFormErrors.category && !subCategoryForm.parent && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-1 text-xs text-red-600 flex items-center gap-1"
                            >
                                <AlertCircle size={10} />
                                Parent Subcategory required
                            </motion.p>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Nested Subcategory Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={subCategoryForm.name}
                            onChange={(e) => {
                                const name = e.target.value;
                                const updates: any = { name };
                                if (!isSlugManuallyEdited) {
                                    updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                }
                                setSubCategoryForm({ ...subCategoryForm, ...updates });
                                if (subCategoryFormErrors.name) {
                                    setSubCategoryFormErrors({ ...subCategoryFormErrors, name: undefined });
                                }
                            }}
                            className={`w-full px-3 py-2.5 text-sm bg-white border rounded-lg focus:ring-2 transition-all ${subCategoryFormErrors.name
                                ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                                : 'border-slate-300 hover:border-slate-400 focus:border-yellow-400 focus:ring-yellow-100'
                                }`}
                            placeholder="e.g., Premium Cards"
                        />
                        {subCategoryFormErrors.name && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-1 text-xs text-red-600 flex items-center gap-1"
                            >
                                <AlertCircle size={10} />
                                {subCategoryFormErrors.name}
                            </motion.p>
                        )}
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            URL Slug
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={subCategoryForm.slug}
                                onChange={(e) => {
                                    setSubCategoryForm({ ...subCategoryForm, slug: e.target.value });
                                    setIsSlugManuallyEdited(true);
                                }}
                                className="w-full pl-3 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all font-mono"
                                placeholder="url-slug"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">URL</span>
                            </div>
                        </div>
                    </div>

                    {/* Sort Order */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Sort Order
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={subCategoryForm.sortOrder}
                                onChange={(e) => setSubCategoryForm({ ...subCategoryForm, sortOrder: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <span className="text-xs text-slate-500 text-[10px]">#{subCategoryForm.sortOrder}</span>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Auto-calculated based on parent subcategory
                        </p>
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Cover Image
                        </label>
                        <motion.div
                            onHoverStart={() => setIsUploadHover(true)}
                            onHoverEnd={() => setIsUploadHover(false)}
                            className="relative"
                        >
                            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden group ${subCategoryForm.image ? 'border-yellow-400 bg-yellow-50' : 'border-slate-300 hover:border-yellow-400 hover:bg-slate-50'
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {subCategoryForm.image ? (
                                        <motion.div
                                            key="preview"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="relative w-full h-full"
                                        >
                                            <img
                                                src={URL.createObjectURL(subCategoryForm.image)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                        </motion.div>
                                    ) : subCategoryForm.existingImage ? (
                                        <motion.div
                                            key="existing"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative w-full h-full"
                                        >
                                            <img
                                                src={subCategoryForm.existingImage}
                                                alt="Existing"
                                                className="w-full h-full object-cover"
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
                                            <motion.div
                                                animate={{
                                                    y: isUploadHover ? -2 : 0,
                                                    scale: isUploadHover ? 1.05 : 1
                                                }}
                                                transition={{ type: "spring", stiffness: 300 }}
                                            >
                                                <ImageIcon className="w-8 h-8 mb-2 text-slate-400 group-hover:text-yellow-500 transition-colors" />
                                            </motion.div>
                                            <p className="text-xs text-slate-600 font-medium">
                                                <span className="text-yellow-600">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP (5MB max)</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <input
                                    id="nested-image-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setSubCategoryForm({ ...subCategoryForm, image: e.target.files[0] });
                                        }
                                    }}
                                />
                            </label>

                            {subCategoryForm.image && (
                                <motion.button
                                    type="button"
                                    onClick={() => setSubCategoryForm({ ...subCategoryForm, image: null })}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white p-1 rounded-full shadow-sm z-10"
                                >
                                    <X size={12} />
                                </motion.button>
                            )}
                        </motion.div>
                    </div>

                    {/* Short Description */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Short Description <span className="text-slate-400 font-normal">(displayed on card)</span>
                        </label>
                        <input
                            type="text"
                            value={subCategoryForm.shortDescription || ''}
                            onChange={(e) => setSubCategoryForm({ ...subCategoryForm, shortDescription: e.target.value })}
                            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                            placeholder="Brief summary for display on cards..."
                        />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                            Description
                        </label>
                        <RichTextEditor
                            value={subCategoryForm.description}
                            onChange={(value) => setSubCategoryForm({ ...subCategoryForm, description: value })}
                            placeholder="Enter nested subcategory description..."
                        />
                    </div>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 p-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg"
                        >
                            <p className="text-xs text-red-600 flex items-center gap-2">
                                <AlertCircle size={14} />
                                {error}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 flex justify-end"
                >
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={!loading ? { scale: 1.02 } : {}}
                        whileTap={!loading ? { scale: 0.98 } : {}}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-sm transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm font-medium"
                    >
                        {loading ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Loader size={16} />
                                </motion.div>
                                Creating Nested Subcategory...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {editingSubCategoryId ? 'Update Nested Subcategory' : 'Create Nested Subcategory'}
                            </>
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </motion.form>
    );
};

export default AddNestedSubCategoryForm;