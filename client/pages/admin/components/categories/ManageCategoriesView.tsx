import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderOpen,
    Search,
    X,
    Edit,
    Trash2,
    Loader,
    Filter,
    RefreshCw,
    Eye,
    GripVertical,
    ChevronRight,
    Folder,
    ChevronDown,
    ChevronUp,
    Layers,
} from 'lucide-react';
import { SearchableDropdown } from '../../../../components/SearchableDropdown';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../../../../lib/apiConfig';

interface Category {
    _id: string;
    name: string;
    description?: string;
    type: string;
    image?: string;
    parent?: any;
    sortOrder?: number;
    slug?: string;
}

interface DeleteConfirmModalState {
    isOpen: boolean;
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    deleteText: string;
    subcategoryCount: number;
    productCount: number;
}

interface ViewDescriptionModalState {
    isOpen: boolean;
    type: 'category' | 'subcategory';
    name: string;
    description: string;
}

interface CategoryDetailModalProps {
    isOpen: boolean;
    item: any;
    level: number;
    onClose: () => void;
}

const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({ isOpen, item, level, onClose }) => {
    if (!item || !isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
                >
                    <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${level === 0 ? 'bg-teal-100 text-teal-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {level === 0 ? <FolderOpen size={20} /> : <Layers size={20} />}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${level === 0 ? 'bg-teal-50 text-teal-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                        {level === 0 ? 'Category' : 'Subcategory'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            {/* Image Section */}
                            {item.image && (
                                <div className="aspect-video w-full rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                                    <img
                                        src={item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : `${API_BASE_URL}${item.image.startsWith('/') ? '' : '/'}${item.image}`}
                                        alt={item.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {item.type && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Type</p>
                                        <p className="text-sm font-semibold text-gray-800">{item.type}</p>
                                    </div>
                                )}
                                {item.slug && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Slug</p>
                                        <p className="text-sm font-mono text-gray-800 break-all">{item.slug}</p>
                                    </div>
                                )}
                                {item.sortOrder !== undefined && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Sort Order</p>
                                        <p className="text-sm font-semibold text-gray-800">{item.sortOrder}</p>
                                    </div>
                                )}
                                {item.parent && (
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Parent</p>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {typeof item.parent === 'object' ? item.parent.name : 'Unknown Parent'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-600 whitespace-pre-wrap">
                                    {item.description || <span className="italic text-gray-400">No description available.</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition-all"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

interface ManageCategoriesViewProps {
    categories: Category[];
    filteredCategories: Category[];
    subCategories: any[];
    filteredSubCategories: any[];
    categorySearchQuery: string;
    setCategorySearchQuery: (query: string) => void;
    categoryTypeFilter: string;
    setCategoryTypeFilter: (filter: string) => void;
    categoryTopLevelFilter: string;
    setCategoryTopLevelFilter: (filter: string) => void;
    subCategorySearchQuery: string;
    setSubCategorySearchQuery: (query: string) => void;
    draggedCategoryId: string | null;
    setDraggedCategoryId: (id: string | null) => void;
    draggedSubCategoryId: string | null;
    setDraggedSubCategoryId: (id: string | null) => void;
    handleCategoryReorder: (draggedId: string, targetId: string, targetIndex: number) => Promise<void>;
    handleSubCategoryReorder: (draggedId: string, targetId: string) => Promise<void>;
    handleEditCategory: (id: string) => Promise<void>;
    handleDeleteCategory: (id: string) => Promise<void>;
    handleEditSubCategory: (id: string) => Promise<void>;
    handleDeleteSubCategory: (id: string) => Promise<void>;
    deleteConfirmModal: DeleteConfirmModalState;
    setDeleteConfirmModal: (modal: DeleteConfirmModalState) => void;
    viewDescriptionModal: ViewDescriptionModalState;
    setViewDescriptionModal: (modal: ViewDescriptionModalState) => void;
    loading: boolean;
    error: string | null;
    success: string | null;
    updateUrl: (tab: string, action?: string, id?: string) => void;
    fetchCategories: () => Promise<void>;
    fetchSubCategories: () => Promise<void>;
    expandedCategories: string[];
    setExpandedCategories: (ids: string[] | ((prev: string[]) => string[])) => void;
    selectedCategory: string | null;
    setSelectedCategory: (id: string | null) => void;
}

// Memoized Category Item Component to prevent unnecessary re-renders
const CategoryItem = memo(({
    item,
    level = 0,
    allItems,
    viewMode,
    draggedCategoryId,
    draggedSubCategoryId,
    expandedCategories,
    selectedCategory,
    onToggleExpand,
    onSelect,
    onDragStart,
    onDragEnd,
    onDrop,
    onViewDescription,
    onEdit,
    onDelete,
    getSubcategoriesForItem,
}: {
    item: any;
    level: number;
    allItems: any[];
    viewMode: 'categories' | 'subcategories';
    draggedCategoryId: string | null;
    draggedSubCategoryId: string | null;
    expandedCategories: string[];
    selectedCategory: string | null;
    onToggleExpand: (id: string) => void;
    onSelect: (id: string) => void;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDrop: (draggedId: string, targetId: string, sortOrder?: number, level?: number) => Promise<void>;
    onViewDescription: (item: any, level: number) => void;
    onEdit: (id: string, level: number) => void;
    onDelete: (id: string, level: number) => void;
    getSubcategoriesForItem: (itemId: string) => any[];
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const isExpanded = expandedCategories.includes(item._id);
    const isSelected = selectedCategory === item._id;
    const subItems = getSubcategoriesForItem(item._id);
    const hasSubcategories = subItems.length > 0;
    const isBeingDragged = (viewMode === 'categories' ? draggedCategoryId : draggedSubCategoryId) === item._id;

    const getHoverBorderColor = useCallback((level: number): string => {
        if (level === 0) return 'hover:border-blue-400';
        if (level === 1) return 'hover:border-red-400';
        return 'hover:border-yellow-400';
    }, []);

    const getFolderColor = useCallback((level: number): string => {
        if (level === 0) return 'text-blue-500';
        if (level === 1) return 'text-red-500';
        return 'text-yellow-500';
    }, []);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement> | any) => {
        if (e.stopPropagation) e.stopPropagation(); // Prevent parent drag start
        e.dataTransfer.setData('text/plain', item._id);
        e.dataTransfer.setData('application/json', JSON.stringify({ id: item._id, level })); // Pass level
        onDragStart(item._id);
        setIsHovered(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent parent drop
        setIsDraggingOver(false);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== item._id) {
            await onDrop(draggedId, item._id, item.sortOrder, level);
        }
    };

    return (
        <div className="space-y-1.5">
            <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                layout
                draggable
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onDragStart={handleDragStart}
                onDragEnd={onDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => onSelect(item._id)}
                className={`
                    relative bg-white rounded-lg border transition-all duration-200
                    ${getHoverBorderColor(level)}
                    ${isDraggingOver ? 'border-teal-400 bg-teal-50' : 'border-gray-200'}
                    ${isBeingDragged ? 'opacity-50' : 'opacity-100'}
                    ${isSelected ? 'ring-2 ring-teal-300' : ''}
                    hover:shadow-sm group cursor-move
                    p-3
                `}
                style={{
                    marginLeft: level > 0 ? `${Math.min(level, 4) * 1.25}rem` : '0',
                }}
            >
                <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={handleDragStart}
                    >
                        <GripVertical size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                    </div>

                    {/* Expand/Collapse Button */}
                    {hasSubcategories ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(item._id);
                            }}
                            className="flex-shrink-0 text-gray-500 hover:text-teal-600 transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                        </button>
                    ) : (
                        <div className="w-4 flex-shrink-0" />
                    )}

                    {/* Item Image */}
                    {item.image && (
                        <div className="flex-shrink-0">
                            <img
                                src={item.image.startsWith('http') || item.image.startsWith('data:') ? item.image : `${API_BASE_URL}${item.image.startsWith('/') ? '' : '/'}${item.image}`}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded-md border border-gray-100"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Folder size={16} className={getFolderColor(level)} />
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                    {item.name}
                                </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                {level === 0 && item.type && (
                                    <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs font-medium">
                                        {item.type}
                                    </span>
                                )}
                                {level > 0 && (
                                    <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs font-medium">
                                        Level {level}
                                    </span>
                                )}
                                {item.slug && (
                                    <span className="text-xs text-gray-400 font-mono truncate max-w-[150px]">
                                        /{item.slug}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons - Visible on hover */}
                        <div className={`
                            flex items-center gap-1 transition-opacity duration-200
                            ${isHovered ? 'opacity-100' : 'opacity-0'}
                        `}>
                            {item.description && (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewDescription(item, level);
                                    }}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                    title="View Description"
                                >
                                    <Eye size={14} />
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item._id, level);
                                }}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
                                title="Edit"
                            >
                                <Edit size={14} />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item._id, level);
                                }}
                                className="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Subcategories */}
            <AnimatePresence>
                {isExpanded && hasSubcategories && (
                    <motion.div
                        key={`subcategories-${item._id}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-l-2 border-dashed border-gray-200 ml-4 pl-3"
                    >
                        {subItems.map((subItem) => (
                            <CategoryItem
                                key={subItem._id}
                                item={subItem}
                                level={level + 1}
                                allItems={allItems}
                                viewMode={viewMode}
                                draggedCategoryId={draggedCategoryId}
                                draggedSubCategoryId={draggedSubCategoryId}
                                expandedCategories={expandedCategories}
                                selectedCategory={selectedCategory}
                                onToggleExpand={onToggleExpand}
                                onSelect={onSelect}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                onDrop={onDrop}
                                onViewDescription={onViewDescription}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                getSubcategoriesForItem={getSubcategoriesForItem}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

CategoryItem.displayName = 'CategoryItem';

const ManageCategoriesView: React.FC<ManageCategoriesViewProps> = ({
    categories,
    filteredCategories,
    subCategories,
    filteredSubCategories,
    categorySearchQuery,
    setCategorySearchQuery,
    categoryTypeFilter,
    setCategoryTypeFilter,
    categoryTopLevelFilter,
    setCategoryTopLevelFilter,
    subCategorySearchQuery,
    setSubCategorySearchQuery,
    draggedCategoryId,
    setDraggedCategoryId,
    draggedSubCategoryId,
    setDraggedSubCategoryId,
    handleCategoryReorder,
    handleSubCategoryReorder,
    handleEditCategory,
    handleDeleteCategory,
    handleEditSubCategory,
    handleDeleteSubCategory,
    deleteConfirmModal,
    setDeleteConfirmModal,
    viewDescriptionModal,
    setViewDescriptionModal,
    loading,
    error,
    success,
    updateUrl,
    fetchCategories,
    fetchSubCategories,
    expandedCategories,
    setExpandedCategories,
    selectedCategory,
    setSelectedCategory,
}) => {
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [detailModalState, setDetailModalState] = useState<{ isOpen: boolean, item: any, level: number }>({
        isOpen: false,
        item: null,
        level: 0
    });

    const [viewMode, setViewMode] = useState<'categories' | 'subcategories'>('categories');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollSpeedRef = useRef<number>(0);
    const scrollAnimationFrameRef = useRef<number | null>(null);

    // Get all items based on view mode
    const getAllItems = useCallback(() => {
        if (viewMode === 'categories') {
            return filteredCategories;
        } else {
            // Combine categories and subcategories for subcategory view
            return [...filteredCategories, ...filteredSubCategories];
        }
    }, [viewMode, filteredCategories, filteredSubCategories]);

    // Get subcategories for an item
    const getSubcategoriesForItem = useCallback((itemId: string) => {
        const allItems = getAllItems();
        return allItems.filter(item => {
            if (!item.parent) return false;
            const parentId = typeof item.parent === 'object' ? item.parent._id : item.parent;
            return parentId === itemId;
        });
    }, [getAllItems]);

    // Get top-level items (items without parent)
    const getTopLevelItems = useCallback(() => {
        const allItems = getAllItems();
        return allItems.filter(item => !item.parent);
    }, [getAllItems]);

    // Toggle category expansion
    const toggleCategoryExpansion = useCallback((categoryId: string) => {
        setExpandedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
        setSelectedCategory(categoryId);
    }, [setExpandedCategories, setSelectedCategory]);

    // Handle item selection
    const handleItemSelect = useCallback((itemId: string) => {
        setSelectedCategory(itemId);
    }, [setSelectedCategory]);

    // Handle drag start
    const handleDragStart = useCallback((itemId: string) => {
        if (viewMode === 'categories') {
            // Even in category mode, we might be dragging a subcategory
            // But since we don't know the level here easily without passing it up, 
            // we rely on the fact that if it's a subcategory it should probably be handled as such
            // However, the state 'draggedCategoryId' vs 'draggedSubCategoryId' 
            // might be used for styling.
            // Let's check if the item is in subCategories list
            const isSub = subCategories.some(s => s._id === itemId);
            if (isSub) {
                setDraggedSubCategoryId(itemId);
            } else {
                setDraggedCategoryId(itemId);
            }
        } else {
            setDraggedSubCategoryId(itemId);
        }
    }, [viewMode, subCategories, setDraggedCategoryId, setDraggedSubCategoryId]);

    // Handle drag end
    const handleDragEnd = useCallback(() => {
        setDraggedCategoryId(null);
        setDraggedSubCategoryId(null);
        stopAutoScroll();
    }, [setDraggedCategoryId, setDraggedSubCategoryId]);

    // Handle drop
    const handleItemDrop = useCallback(async (draggedId: string, targetId: string, sortOrder?: number, level?: number) => {
        stopAutoScroll();
        // Determine whether to use category reorder or subcategory reorder based on level
        if (level && level > 0) {
            // It's a subcategory or nested subcategory
            await handleSubCategoryReorder(draggedId, targetId);
        } else {
            // It's a top level category
            await handleCategoryReorder(draggedId, targetId, sortOrder || 0);
        }
    }, [handleCategoryReorder, handleSubCategoryReorder]);

    // Handle view description
    const handleViewDescription = useCallback((item: any, level: number) => {
        setDetailModalState({
            isOpen: true,
            item,
            level
        });
    }, []);

    // Handle edit
    const handleItemEdit = useCallback((itemId: string, level: number) => {
        if (level === 0) {
            handleEditCategory(itemId);
        } else {
            handleEditSubCategory(itemId);
        }
    }, [handleEditCategory, handleEditSubCategory]);

    // Handle delete
    const handleItemDelete = useCallback((itemId: string, level: number) => {
        if (level === 0) {
            handleDeleteCategory(itemId);
        } else {
            handleDeleteSubCategory(itemId);
        }
    }, [handleDeleteCategory, handleDeleteSubCategory]);

    // Auto-scroll functionality
    const stopAutoScroll = () => {
        scrollSpeedRef.current = 0;
        if (scrollAnimationFrameRef.current) {
            cancelAnimationFrame(scrollAnimationFrameRef.current);
            scrollAnimationFrameRef.current = null;
        }
    };

    const handleContainerDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const container = scrollContainerRef.current;
        if (!container) return;

        const { top, bottom, height } = container.getBoundingClientRect();
        const mouseY = e.clientY;
        const threshold = 100; // px
        const maxSpeed = 15;

        // Calculate speed based on distance from edges
        let speed = 0;
        if (mouseY < top + threshold) {
            // Scroll Up
            const intensity = (top + threshold - mouseY) / threshold;
            speed = -maxSpeed * intensity;
        } else if (mouseY > bottom - threshold) {
            // Scroll Down
            const intensity = (mouseY - (bottom - threshold)) / threshold;
            speed = maxSpeed * intensity;
        }

        scrollSpeedRef.current = speed;

        if (speed !== 0 && !scrollAnimationFrameRef.current) {
            const scrollLoop = () => {
                if (scrollSpeedRef.current === 0) {
                    scrollAnimationFrameRef.current = null;
                    return;
                }
                if (container) {
                    container.scrollTop += scrollSpeedRef.current;
                }
                scrollAnimationFrameRef.current = requestAnimationFrame(scrollLoop);
            };
            scrollAnimationFrameRef.current = requestAnimationFrame(scrollLoop);
        }
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (scrollAnimationFrameRef.current) {
                cancelAnimationFrame(scrollAnimationFrameRef.current);
            }
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <CategoryDetailModal
                isOpen={detailModalState.isOpen}
                item={detailModalState.item}
                level={detailModalState.level}
                onClose={() => setDetailModalState(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <FolderOpen size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Manage Categories</h2>
                            <p className="text-teal-100 text-sm mt-1">
                                {viewMode === 'categories'
                                    ? `${filteredCategories.length} categor${filteredCategories.length === 1 ? 'y' : 'ies'} found`
                                    : `${filteredSubCategories.length} subcategor${filteredSubCategories.length === 1 ? 'y' : 'ies'} found`
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">

                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <Filter size={20} className="text-teal-600" />
                    <h3 className="text-lg font-bold text-gray-900">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={`Search ${viewMode}...`}
                                value={viewMode === 'categories' ? categorySearchQuery : subCategorySearchQuery}
                                onChange={(e) => viewMode === 'categories'
                                    ? setCategorySearchQuery(e.target.value)
                                    : setSubCategorySearchQuery(e.target.value)
                                }
                                className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
                            />
                            {(viewMode === 'categories' ? categorySearchQuery : subCategorySearchQuery) && (
                                <button
                                    onClick={() => viewMode === 'categories'
                                        ? setCategorySearchQuery('')
                                        : setSubCategorySearchQuery('')
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Type Filter (Categories only) */}
                    {viewMode === 'categories' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Type</label>
                            <SearchableDropdown
                                label="Filter by Type"
                                value={categoryTypeFilter || ''}
                                onChange={(value) => setCategoryTypeFilter(value as string)}
                                options={[
                                    { value: '', label: 'All Types' },
                                    { value: 'Digital', label: 'Digital' },
                                    { value: 'Bulk', label: 'Bulk' },
                                ]}
                                className="w-full"
                                enableSearch={false}
                                buttonClassName="!border-teal-500 hover:!border-teal-600"
                                dropdownClassName="!border-teal-500"
                            />
                        </div>
                    )}

                    {/* Level Filter (Categories only) */}
                    {viewMode === 'categories' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Level</label>
                            <SearchableDropdown
                                label="Filter by Level"
                                value={categoryTopLevelFilter || ''}
                                onChange={(value) => setCategoryTopLevelFilter(value as string)}
                                options={[
                                    { value: '', label: 'All Levels' },
                                    { value: 'top', label: 'Top-level Only' },
                                    { value: 'sub', label: 'Subcategories Only' },
                                ]}
                                className="w-full"
                                enableSearch={false}
                                buttonClassName="!border-teal-500 hover:!border-teal-600"
                                dropdownClassName="!border-teal-500"
                            />
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                    {((viewMode === 'categories' && (categorySearchQuery || categoryTypeFilter || categoryTopLevelFilter)) ||
                        (viewMode === 'subcategories' && subCategorySearchQuery)) && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={async () => {
                                    if (viewMode === 'categories') {
                                        setCategorySearchQuery('');
                                        setCategoryTypeFilter('');
                                        setCategoryTopLevelFilter('');
                                    } else {
                                        setSubCategorySearchQuery('');
                                    }
                                    await (viewMode === 'categories' ? fetchCategories() : fetchSubCategories());
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 font-medium"
                            >
                                <X size={16} />
                                Clear Filters
                            </motion.button>
                        )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                            await (viewMode === 'categories' ? fetchCategories() : fetchSubCategories());
                        }}
                        className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors flex items-center gap-2 font-medium"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </motion.button>
                </div>
            </div>

            {/* Categories/Subcategories List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader className="animate-spin text-teal-600 mb-4" size={48} />
                    <p className="text-gray-600 font-medium">
                        Loading {viewMode}...
                    </p>
                </div>
            ) : getTopLevelItems().length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl shadow-md p-12 text-center border-2 border-dashed border-gray-300"
                >
                    <FolderOpen size={64} className="mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        No {viewMode === 'categories' ? 'Categories' : 'Subcategories'} Found
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {(viewMode === 'categories' ? categorySearchQuery : subCategorySearchQuery)
                            ? 'Try adjusting your filters'
                            : `Get started by creating your first ${viewMode === 'categories' ? 'category' : 'subcategory'}`}
                    </p>
                </motion.div>
            ) : (
                <div className="relative">
                    {/* Scrollable container */}
                    <div
                        ref={scrollContainerRef}
                        className="space-y-3 max-h-[600px] overflow-y-auto scroll-smooth pb-8 pt-8 px-1"
                        style={{ scrollBehavior: 'auto' }} // Changed to auto for instant DND scrolling
                        onDragOver={handleContainerDragOver}
                    >
                        <AnimatePresence mode="wait">
                            {getTopLevelItems().map((item) => (
                                <CategoryItem
                                    key={item._id}
                                    item={item}
                                    level={0}
                                    allItems={getAllItems()}
                                    viewMode={viewMode}
                                    draggedCategoryId={draggedCategoryId}
                                    draggedSubCategoryId={draggedSubCategoryId}
                                    expandedCategories={expandedCategories}
                                    selectedCategory={selectedCategory}
                                    onToggleExpand={toggleCategoryExpansion}
                                    onSelect={handleItemSelect}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDrop={handleItemDrop}
                                    onViewDescription={handleViewDescription}
                                    onEdit={handleItemEdit}
                                    onDelete={handleItemDelete}
                                    getSubcategoriesForItem={getSubcategoriesForItem}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ManageCategoriesView;