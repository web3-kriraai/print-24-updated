import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Edit,
    Trash2,
    GripVertical,
    Save,
    X,
    Search,
} from 'lucide-react';
import { updateService } from '../../../../lib/serviceApi';
import { API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';
import type { Service, ServiceTitle, ServiceItem } from '../../../../types/serviceTypes';

interface ServiceTitleManagerProps {
    service: Service;
    onUpdate: () => void;
}

interface TitleFormData {
    title: string;
    description: string;
    sortOrder: number;
}

interface Product {
    _id: string;
    name: string;
    image?: string;
}

interface Category {
    _id: string;
    name: string;
    image?: string;
}

const ServiceTitleManager: React.FC<ServiceTitleManagerProps> = ({ service, onUpdate }) => {
    const [titles, setTitles] = useState<ServiceTitle[]>(service.titles || []);
    const [showTitleForm, setShowTitleForm] = useState(false);
    const [editingTitle, setEditingTitle] = useState<ServiceTitle | null>(null);
    const [titleFormData, setTitleFormData] = useState<TitleFormData>({
        title: '',
        description: '',
        sortOrder: 0,
    });
    const [showItemForm, setShowItemForm] = useState<string | null>(null);
    const [itemType, setItemType] = useState<'product' | 'category' | 'subcategory'>('category');
    const [searchQuery, setSearchQuery] = useState('');
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draggedTitleId, setDraggedTitleId] = useState<string | null>(null);
    const [draggedItemInfo, setDraggedItemInfo] = useState<{ titleId: string; itemIndex: number } | null>(null);

    useEffect(() => {
        // Keep titles sorted by sortOrder in state
        const sortedTitles = [...(service.titles || [])].sort((a, b) => a.sortOrder - b.sortOrder);
        setTitles(sortedTitles);
    }, [service]);

    // Get sorted titles for rendering
    const sortedTitles = [...titles].sort((a, b) => a.sortOrder - b.sortOrder);

    const handleAddTitle = () => {
        setEditingTitle(null);
        setTitleFormData({
            title: '',
            description: '',
            sortOrder: titles.length,
        });
        setShowTitleForm(true);
    };

    const handleEditTitle = (title: ServiceTitle) => {
        setEditingTitle(title);
        setTitleFormData({
            title: title.title,
            description: title.description,
            sortOrder: title.sortOrder,
        });
        setShowTitleForm(true);
    };

    const handleSaveTitle = async () => {
        // Title is now optional per user request
        /* 
        if (!titleFormData.title.trim()) {
            alert('Title is required');
            return;
        }
        */

        try {
            setSaving(true);
            let updatedTitles: ServiceTitle[];

            if (editingTitle) {
                // Update existing title
                updatedTitles = titles.map(t =>
                    t._id === editingTitle._id
                        ? { ...t, ...titleFormData }
                        : t
                );
            } else {
                // Add new title
                const newTitle: ServiceTitle = {
                    ...titleFormData,
                    items: [],
                };
                updatedTitles = [...titles, newTitle];
            }

            await updateService(service._id, { titles: updatedTitles });
            setTitles(updatedTitles);
            setShowTitleForm(false);
            onUpdate();
        } catch (error) {
            console.error('Failed to save title:', error);
            alert('Failed to save title. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTitle = async (titleId: string) => {
        if (!confirm('Are you sure you want to delete this title?')) return;

        try {
            const updatedTitles = titles.filter(t => t._id !== titleId);
            await updateService(service._id, { titles: updatedTitles });
            setTitles(updatedTitles);
            onUpdate();
        } catch (error) {
            console.error('Failed to delete title:', error);
            alert('Failed to delete title. Please try again.');
        }
    };

    const handleTitleDragStart = (e: React.DragEvent, titleId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `title-${titleId}`);
        setDraggedTitleId(titleId);
    };

    const handleTitleDragEnd = () => {
        setDraggedTitleId(null);
    };

    const handleTitleDrop = async (e: React.DragEvent, targetTitleId: string) => {
        e.preventDefault();
        const dragData = e.dataTransfer.getData('text/plain');
        if (!dragData.startsWith('title-')) return;

        const draggedId = dragData.replace('title-', '');
        if (draggedId === targetTitleId) return;

        // Work with sorted titles
        const currentSorted = [...titles].sort((a, b) => a.sortOrder - b.sortOrder);
        const dragIndex = currentSorted.findIndex(t => t._id === draggedId);
        const dropIndex = currentSorted.findIndex(t => t._id === targetTitleId);

        if (dragIndex === -1 || dropIndex === -1) return;

        // Reorder
        const [draggedItem] = currentSorted.splice(dragIndex, 1);
        currentSorted.splice(dropIndex, 0, draggedItem);

        // Update sort orders
        const updatedTitles = currentSorted.map((title, index) => ({
            ...title,
            sortOrder: index,
        }));

        setTitles(updatedTitles);
        setDraggedTitleId(null);

        try {
            await updateService(service._id, { titles: updatedTitles });
            onUpdate();
        } catch (error) {
            console.error('Failed to reorder titles:', error);
            alert('Failed to save new order. Please try again.');
            setTitles(service.titles || []);
        }
    };

    const loadAvailableItems = async (type: 'product' | 'category' | 'subcategory') => {
        try {
            setLoadingItems(true);
            let endpoint = '';

            switch (type) {
                case 'product':
                    endpoint = '/products';
                    break;
                case 'category':
                    endpoint = '/categories';
                    break;
                case 'subcategory':
                    endpoint = '/subcategories';
                    break;
            }

            const response = await fetch(`${API_BASE_URL_WITH_API}${endpoint}`);
            if (!response.ok) throw new Error('Failed to fetch items');

            const data = await response.json();
            setAvailableItems(data);
        } catch (error) {
            console.error('Failed to load items:', error);
            alert('Failed to load items. Please try again.');
        } finally {
            setLoadingItems(false);
        }
    };

    const handleShowItemForm = (titleId: string) => {
        setShowItemForm(titleId);
        setSearchQuery('');
        loadAvailableItems(itemType);
    };

    const handleAddItem = async (titleId: string, itemId: string) => {
        try {
            const updatedTitles = titles.map(title => {
                if (title._id === titleId) {
                    const newItem: ServiceItem = {
                        type: itemType,
                        id: itemId,
                        sortOrder: title.items.length,
                    };
                    return {
                        ...title,
                        items: [...title.items, newItem],
                    };
                }
                return title;
            });

            await updateService(service._id, { titles: updatedTitles });
            setTitles(updatedTitles);
            setShowItemForm(null);
            onUpdate();
        } catch (error) {
            console.error('Failed to add item:', error);
            alert('Failed to add item. Please try again.');
        }
    };

    const handleRemoveItem = async (titleId: string, itemIndex: number) => {
        try {
            const updatedTitles = titles.map(title => {
                if (title._id === titleId) {
                    const newItems = title.items.filter((_, index) => index !== itemIndex);
                    return {
                        ...title,
                        items: newItems.map((item, index) => ({ ...item, sortOrder: index })),
                    };
                }
                return title;
            });

            await updateService(service._id, { titles: updatedTitles });
            setTitles(updatedTitles);
            onUpdate();
        } catch (error) {
            console.error('Failed to remove item:', error);
            alert('Failed to remove item. Please try again.');
        }
    };

    const handleItemDragStart = (e: React.DragEvent, titleId: string, itemId: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `item-${titleId}-${itemId}`);
        setDraggedItemInfo({ titleId, itemIndex: 0 }); // Track drag state
    };

    const handleItemDragEnd = () => {
        setDraggedItemInfo(null);
    };

    const handleItemDrop = async (e: React.DragEvent, titleId: string, targetItemId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const dragData = e.dataTransfer.getData('text/plain');
        if (!dragData.startsWith(`item-${titleId}-`)) return;

        const draggedItemId = dragData.replace(`item-${titleId}-`, '');
        if (draggedItemId === targetItemId) return;

        const updatedTitles = titles.map(title => {
            if (title._id === titleId) {
                // Work with sorted items
                const sortedItems = [...title.items].sort((a, b) => a.sortOrder - b.sortOrder);
                const dragIndex = sortedItems.findIndex(item => item.id === draggedItemId);
                const dropIndex = sortedItems.findIndex(item => item.id === targetItemId);

                if (dragIndex === -1 || dropIndex === -1) return title;

                const [draggedItem] = sortedItems.splice(dragIndex, 1);
                sortedItems.splice(dropIndex, 0, draggedItem);

                return {
                    ...title,
                    items: sortedItems.map((item, index) => ({ ...item, sortOrder: index })),
                };
            }
            return title;
        });

        setTitles(updatedTitles);
        setDraggedItemInfo(null);

        try {
            await updateService(service._id, { titles: updatedTitles });
            onUpdate();
        } catch (error) {
            console.error('Failed to reorder items:', error);
            alert('Failed to save new order. Please try again.');
            setTitles(service.titles || []);
        }
    };

    const filteredItems = availableItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-gray-900">Service Titles & Items</h4>
                <button
                    onClick={handleAddTitle}
                    className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                    <Plus size={16} />
                    Add Title
                </button>
            </div>

            {/* Title Form Modal */}
            <AnimatePresence>
                {showTitleForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => !saving && setShowTitleForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {editingTitle ? 'Edit Title' : 'Add Title'}
                                    </h3>
                                    <button
                                        onClick={() => setShowTitleForm(false)}
                                        disabled={saving}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Title (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={titleFormData.title}
                                            onChange={(e) => setTitleFormData({ ...titleFormData, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g., Digital Printing, Bulk Printing"
                                            disabled={saving}
                                        />
                                    </div>

                                    {/* Description field removed per user request */}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sort Order
                                        </label>
                                        <input
                                            type="number"
                                            value={titleFormData.sortOrder}
                                            onChange={(e) => setTitleFormData({ ...titleFormData, sortOrder: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            min="0"
                                            disabled={saving}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowTitleForm(false)}
                                        disabled={saving}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveTitle}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Save Title
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Titles List */}
            {
                titles.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-sm">No titles yet. Click "Add Title" to create one.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedTitles.map((title, index) => (
                            <div
                                key={title._id || index}
                                draggable
                                onDragStart={(e) => handleTitleDragStart(e, title._id!)}
                                onDragEnd={handleTitleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleTitleDrop(e, title._id!)}
                                className={`bg-white border border-gray-200 rounded-lg p-4 ${draggedTitleId === title._id ? 'opacity-50' : ''}`}
                            >
                                {/* Title Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="cursor-move text-gray-400 hover:text-gray-600 mt-1">
                                        <GripVertical size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-semibold text-gray-900">{title.title || <span className="text-gray-400 italic font-normal">No Title</span>}</h5>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sort Order: {title.sortOrder} | Items: {title.items.length}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEditTitle(title)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Edit Title"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTitle(title._id!)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Delete Title"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div className="ml-8 space-y-2">
                                    {title.items.length > 0 && (
                                        <div className="space-y-1">
                                            {[...title.items]
                                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                                .map((item, itemIndex) => (
                                                    <div
                                                        key={item.id || itemIndex}
                                                        draggable
                                                        onDragStart={(e) => handleItemDragStart(e, title._id!, item.id)}
                                                        onDragEnd={handleItemDragEnd}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleItemDrop(e, title._id!, item.id)}
                                                        className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200 cursor-move"
                                                    >
                                                        <div className="cursor-move text-gray-400">
                                                            <GripVertical size={14} />
                                                        </div>
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                                            {item.type}
                                                        </span>
                                                        <span className="text-sm text-gray-700 flex-1">
                                                            ID: {item.id}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveItem(title._id!, itemIndex)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Add Item Button */}
                                    {showItemForm === title._id ? (
                                        <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                            <div className="space-y-3">
                                                {/* Item Type Selector */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Item Type
                                                    </label>
                                                    <select
                                                        value={itemType}
                                                        onChange={(e) => {
                                                            const newType = e.target.value as 'product' | 'category' | 'subcategory';
                                                            setItemType(newType);
                                                            loadAvailableItems(newType);
                                                        }}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    >
                                                        <option value="category">Category</option>
                                                        <option value="subcategory">Subcategory</option>
                                                        <option value="product">Product</option>
                                                    </select>
                                                </div>

                                                {/* Search */}
                                                <div>
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-2 text-gray-400" size={16} />
                                                        <input
                                                            type="text"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            placeholder="Search items..."
                                                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Available Items */}
                                                <div className="max-h-48 overflow-y-auto space-y-1">
                                                    {loadingItems ? (
                                                        <div className="text-center py-4">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                                                        </div>
                                                    ) : filteredItems.length === 0 ? (
                                                        <p className="text-xs text-gray-500 text-center py-4">No items found</p>
                                                    ) : (
                                                        filteredItems.map((item) => (
                                                            <button
                                                                key={item._id}
                                                                onClick={() => handleAddItem(title._id!, item._id)}
                                                                className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                            >
                                                                {item.name}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => setShowItemForm(null)}
                                                    className="w-full px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleShowItemForm(title._id!)}
                                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            <Plus size={14} />
                                            Add Item
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
};

export default ServiceTitleManager;

