import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Upload,
    GripVertical,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    Search,
    Loader,
} from 'lucide-react';
import type { Service, CreateServiceData, UpdateServiceData, ServiceTitle, ServiceItem } from '../types/serviceTypes';
import {
    fetchServices,
    createService,
    updateService,
    deleteService,
    reorderServices,
    uploadServiceBanner,
    toggleServiceStatus,
} from '../lib/serviceApi';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

interface ServiceManagementProps {
    onClose?: () => void;
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({ onClose }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateServiceData>({
        name: '',
        description: '',
        color: '#93357c',
        sortOrder: 0,
        bannerImage: '',
        titles: [],
    });

    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string>('');

    // Title management
    const [expandedTitles, setExpandedTitles] = useState<Set<number>>(new Set());

    // Search states for item selection
    const [productSearch, setProductSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [subcategorySearch, setSubcategorySearch] = useState('');

    // Available items for selection
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);

    useEffect(() => {
        loadServices();
        loadAvailableItems();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            const data = await fetchServices();
            setServices(data);
        } catch (error) {
            toast.error('Failed to load services');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableItems = async () => {
        try {
            const [products, categories, subcategories] = await Promise.all([
                fetch(`${API_BASE_URL_WITH_API}/products`).then(r => r.json()),
                fetch(`${API_BASE_URL_WITH_API}/categories`).then(r => r.json()),
                fetch(`${API_BASE_URL_WITH_API}/subcategories`).then(r => r.json()),
            ]);
            setAvailableProducts(products);
            setAvailableCategories(categories);
            setAvailableSubcategories(subcategories);
        } catch (error) {
            console.error('Failed to load available items:', error);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            if (!formData.name || !formData.description) {
                toast.error('Please fill in all required fields');
                return;
            }

            if (editingService) {
                const updated = await updateService(editingService._id, formData);

                // Upload banner if changed
                if (bannerFile) {
                    await uploadServiceBanner(editingService._id, bannerFile);
                }

                toast.success('Service updated successfully');
            } else {
                const created = await createService(formData);

                // Upload banner if provided
                if (bannerFile && created._id) {
                    await uploadServiceBanner(created._id, bannerFile);
                }

                toast.success('Service created successfully');
            }

            loadServices();
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save service');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            await deleteService(id);
            toast.success('Service deleted successfully');
            loadServices();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete service');
        }
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await toggleServiceStatus(id);
            toast.success('Service status updated');
            loadServices();
        } catch (error: any) {
            toast.error(error.message || 'Failed to toggle status');
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description,
            color: service.color,
            sortOrder: service.sortOrder,
            bannerImage: service.bannerImage,
            titles: service.titles,
        });
        setBannerPreview(service.bannerImage);
        setShowForm(true);
    };

    const resetForm = () => {
        setEditingService(null);
        setFormData({
            name: '',
            description: '',
            color: '#93357c',
            sortOrder: 0,
            bannerImage: '',
            titles: [],
        });
        setBannerFile(null);
        setBannerPreview('');
        setShowForm(false);
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBannerFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Title management functions
    const addTitle = () => {
        setFormData({
            ...formData,
            titles: [
                ...formData.titles,
                {
                    title: '',
                    description: '',
                    sortOrder: formData.titles.length,
                    items: [],
                },
            ],
        });
    };

    const updateTitle = (index: number, field: keyof ServiceTitle, value: any) => {
        const newTitles = [...formData.titles];
        newTitles[index] = { ...newTitles[index], [field]: value };
        setFormData({ ...formData, titles: newTitles });
    };

    const removeTitle = (index: number) => {
        const newTitles = formData.titles.filter((_, i) => i !== index);
        setFormData({ ...formData, titles: newTitles });
    };

    const addItemToTitle = (titleIndex: number, type: 'product' | 'category' | 'subcategory', id: string) => {
        const newTitles = [...formData.titles];
        const title = newTitles[titleIndex];

        // Check if item already exists
        if (title.items.some(item => item.id === id && item.type === type)) {
            toast.error('Item already added');
            return;
        }

        title.items.push({
            type,
            id,
            sortOrder: title.items.length,
        });

        setFormData({ ...formData, titles: newTitles });
    };

    const removeItemFromTitle = (titleIndex: number, itemIndex: number) => {
        const newTitles = [...formData.titles];
        newTitles[titleIndex].items = newTitles[titleIndex].items.filter((_, i) => i !== itemIndex);
        setFormData({ ...formData, titles: newTitles });
    };

    const toggleTitleExpanded = (index: number) => {
        const newExpanded = new Set(expandedTitles);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedTitles(newExpanded);
    };

    // Get item name by type and id
    const getItemName = (type: string, id: string): string => {
        if (type === 'product') {
            return availableProducts.find(p => p._id === id)?.name || 'Unknown Product';
        } else if (type === 'category') {
            return availableCategories.find(c => c._id === id)?.name || 'Unknown Category';
        } else if (type === 'subcategory') {
            return availableSubcategories.find(s => s._id === id)?.name || 'Unknown Subcategory';
        }
        return 'Unknown';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-cream-900" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-cream-900">Service Management</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors"
                >
                    <Plus size={20} />
                    Add Service
                </button>
            </div>

            {/* Services List */}
            <div className="grid gap-4">
                {services.map((service) => (
                    <motion.div
                        key={service._id}
                        layout
                        className="bg-white rounded-lg shadow-md border border-cream-200 p-6"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div
                                        className="w-6 h-6 rounded-full"
                                        style={{ backgroundColor: service.color }}
                                    />
                                    <h3 className="text-xl font-bold text-cream-900">{service.name}</h3>
                                    <span className="text-sm text-cream-600">Order: {service.sortOrder}</span>
                                    {!service.isActive && (
                                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-cream-700 mb-3">{service.description}</p>
                                {service.bannerImage && (
                                    <img
                                        src={service.bannerImage}
                                        alt={service.name}
                                        className="w-full max-w-md h-32 object-cover rounded-lg mb-3"
                                    />
                                )}
                                <div className="text-sm text-cream-600">
                                    {service.titles.length} title(s), {service.titles.reduce((sum, t) => sum + t.items.length, 0)} item(s)
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggleStatus(service._id)}
                                    className="p-2 text-cream-600 hover:text-cream-900 transition-colors"
                                    title={service.isActive ? 'Deactivate' : 'Activate'}
                                >
                                    {service.isActive ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                                <button
                                    onClick={() => handleEdit(service)}
                                    className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    <Edit size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(service._id)}
                                    className="p-2 text-red-600 hover:text-red-800 transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) resetForm();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-cream-200 p-6 flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-cream-900">
                                    {editingService ? 'Edit Service' : 'Create Service'}
                                </h3>
                                <button onClick={resetForm} className="text-cream-600 hover:text-cream-900">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-cream-900 mb-2">
                                            Service Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500"
                                            placeholder="e.g., Printing Services"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-cream-900 mb-2">
                                            Color *
                                        </label>
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-full h-10 px-2 border border-cream-300 rounded-lg cursor-pointer"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-cream-900 mb-2">
                                            Sort Order
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.sortOrder}
                                            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-cream-900 mb-2">
                                            Banner Image
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBannerChange}
                                            className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500"
                                        />
                                        {bannerPreview && (
                                            <img
                                                src={bannerPreview}
                                                alt="Banner preview"
                                                className="mt-2 w-full h-32 object-cover rounded-lg"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-cream-900 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500"
                                        placeholder="Service description..."
                                    />
                                </div>

                                {/* Titles Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-bold text-cream-900">Titles & Items</h4>
                                        <button
                                            onClick={addTitle}
                                            className="flex items-center gap-2 px-3 py-1 bg-cream-100 text-cream-900 rounded-lg hover:bg-cream-200 transition-colors"
                                        >
                                            <Plus size={16} />
                                            Add Title
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {formData.titles.map((title, titleIndex) => (
                                            <div key={titleIndex} className="border border-cream-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={title.title}
                                                            onChange={(e) => updateTitle(titleIndex, 'title', e.target.value)}
                                                            placeholder="Title name"
                                                            className="px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={title.description}
                                                            onChange={(e) => updateTitle(titleIndex, 'description', e.target.value)}
                                                            placeholder="Title description"
                                                            className="px-3 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-500"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-3">
                                                        <button
                                                            onClick={() => toggleTitleExpanded(titleIndex)}
                                                            className="p-1 text-cream-600 hover:text-cream-900"
                                                        >
                                                            {expandedTitles.has(titleIndex) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                        <button
                                                            onClick={() => removeTitle(titleIndex)}
                                                            className="p-1 text-red-600 hover:text-red-800"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {expandedTitles.has(titleIndex) && (
                                                    <div className="mt-4 space-y-3">
                                                        <div className="text-sm font-medium text-cream-900">Items ({title.items.length})</div>

                                                        {/* Item List */}
                                                        <div className="space-y-2">
                                                            {title.items.map((item, itemIndex) => (
                                                                <div key={itemIndex} className="flex items-center justify-between bg-cream-50 px-3 py-2 rounded">
                                                                    <span className="text-sm">
                                                                        <span className="font-medium capitalize">{item.type}:</span> {getItemName(item.type, item.id)}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => removeItemFromTitle(titleIndex, itemIndex)}
                                                                        className="text-red-600 hover:text-red-800"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Add Item Selectors */}
                                                        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cream-200">
                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        addItemToTitle(titleIndex, 'product', e.target.value);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                                className="px-2 py-1 text-sm border border-cream-300 rounded"
                                                            >
                                                                <option value="">+ Add Product</option>
                                                                {availableProducts.map(p => (
                                                                    <option key={p._id} value={p._id}>{p.name}</option>
                                                                ))}
                                                            </select>

                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        addItemToTitle(titleIndex, 'category', e.target.value);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                                className="px-2 py-1 text-sm border border-cream-300 rounded"
                                                            >
                                                                <option value="">+ Add Category</option>
                                                                {availableCategories.map(c => (
                                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                                ))}
                                                            </select>

                                                            <select
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        addItemToTitle(titleIndex, 'subcategory', e.target.value);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                                className="px-2 py-1 text-sm border border-cream-300 rounded"
                                                            >
                                                                <option value="">+ Add Subcategory</option>
                                                                {availableSubcategories.map(s => (
                                                                    <option key={s._id} value={s._id}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white border-t border-cream-200 p-6 flex items-center justify-end gap-3">
                                <button
                                    onClick={resetForm}
                                    className="px-6 py-2 border border-cream-300 text-cream-900 rounded-lg hover:bg-cream-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateOrUpdate}
                                    className="flex items-center gap-2 px-6 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors"
                                >
                                    <Save size={20} />
                                    {editingService ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ServiceManagement;
