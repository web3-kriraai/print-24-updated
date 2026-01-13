import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Edit,
    Trash2,
    GripVertical,
    Save,
    X,
    Upload,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    Gift,
    Printer,
    Palette,
    Users,
    Package,
    FileText,
    PenTool,
    BookOpen,
    Settings,
    MapPin,
    Monitor,
    Calculator,
} from 'lucide-react';
import {
    fetchServices,
    createService,
    updateService,
    deleteService,
    reorderServices,
    uploadServiceBanner,
    toggleServiceStatus,
} from '../../../../lib/serviceApi';
import type { Service, CreateServiceData, BannerConfig, BannerSecondaryIcon, BannerColorPalette } from '../../../../types/serviceTypes';
import ServiceTitleManager from './ServiceTitleManager.tsx';
import { API_BASE_URL } from '../../../../lib/apiConfig';
import IconSelector from '../../../../components/IconSelector';
import { Select } from '../../../../components/ui/select';
import ReviewManagement from './ReviewManagement';
import FeatureManagement from './FeatureManagement';

interface ServiceFormData {
    name: string;
    description: string;
    color: string;
    sortOrder: number;
    bannerImage: string;
    icon: string;
    navbarIcon: string;
    serviceHeading?: string;
    serviceDescription?: string;
    bannerConfig: BannerConfig;
}



const ServiceManagement: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState<ServiceFormData>({
        name: '',
        description: '',
        color: '#93357c',
        sortOrder: 0,
        bannerImage: '',
        icon: 'Printer',
        navbarIcon: '',
        serviceHeading: '',
        serviceDescription: '',
        bannerConfig: {
            title: 'ORDER BOOK TODAY',
            subtitle: 'WIDE RANGE OF',
            highlightText: '',
            textSection1: '',
            textSection2: '',
            textSection3: '',
            textSection4: '',
            defaultShape: 'circle',
            defaultShapeSize: 12,
            mainIcon: '',
            secondaryIcons: [],
            primaryColor: '',
            secondaryColor: '#0ab2b5',
            accentColor: '#f79a1c',
            colorPalette: [],
            showIcons: true,
            iconPositions: [],
            decorativeElements: [],
        },
    });
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string>('');
    const [useDefaultBanner, setUseDefaultBanner] = useState(true);
    const [expandedService, setExpandedService] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'services' | 'reviews' | 'features'>('services');

    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            const data = await fetchServices(false); // Load all services including inactive
            setServices(data);
        } catch (error) {
            console.error('Failed to load services:', error);
            alert('Failed to load services. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingService(null);
        setFormData({
            name: '',
            description: '',
            color: '#93357c',
            sortOrder: services.length,
            bannerImage: '',
            icon: 'Printer',
            navbarIcon: '',
            serviceHeading: '',
            serviceDescription: '',
            bannerConfig: {
                title: 'ORDER BOOK TODAY',
                subtitle: 'WIDE RANGE OF',
                highlightText: '',
                textSection1: '',
                textSection2: '',
                textSection3: '',
                textSection4: '',
                defaultShape: 'circle',
                defaultShapeSize: 12,
                mainIcon: '',
                secondaryIcons: [],
                primaryColor: '',
                secondaryColor: '#0ab2b5',
                accentColor: '#f79a1c',
                colorPalette: [],
                showIcons: true,
                iconPositions: [],
                decorativeElements: [],
            },
        });
        setBannerFile(null);
        setBannerPreview('');
        setUseDefaultBanner(true);
        setShowForm(true);
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description,
            color: service.color,
            sortOrder: service.sortOrder,
            bannerImage: service.bannerImage,
            icon: service.icon || 'Printer',
            navbarIcon: service.navbarIcon || '',
            serviceHeading: service.serviceHeading || '',
            serviceDescription: service.serviceDescription || '',
            bannerConfig: service.bannerConfig || {
                title: 'ORDER BOOK TODAY',
                subtitle: 'WIDE RANGE OF',
                highlightText: '',
                textSection1: '',
                textSection2: '',
                textSection3: '',
                textSection4: '',
                defaultShape: 'circle',
                defaultShapeSize: 12,
                mainIcon: '',
                secondaryIcons: [],
                primaryColor: '',
                secondaryColor: '#0ab2b5',
                accentColor: '#f79a1c',
                colorPalette: [],
                showIcons: true,
                iconPositions: [],
                decorativeElements: [],
            },
        });
        setBannerFile(null);
        // Correctly construct the full URL for the banner preview
        const fullBannerUrl = service.bannerImage
            ? (service.bannerImage.startsWith('http') ? service.bannerImage : `${API_BASE_URL}${service.bannerImage}`)
            : '';
        setBannerPreview(fullBannerUrl);
        setUseDefaultBanner(!service.bannerImage);
        setShowForm(true);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Service name is required');
            return;
        }

        try {
            setSaving(true);

            // Prepare submission data
            const submissionData = { ...formData };
            if (useDefaultBanner) {
                submissionData.bannerImage = ''; // Clear image if default selected
            }

            if (editingService) {
                // Update existing service
                const updated = await updateService(editingService._id, submissionData);

                // Upload banner if new file selected and NOT default
                if (bannerFile && !useDefaultBanner) {
                    await uploadServiceBanner(editingService._id, bannerFile);
                } else if (useDefaultBanner && editingService.bannerImage) {
                    // Logic to handle clearing existing banner if needed?
                    // Currently updateService updates fields, but uploadServiceBanner is separate.
                    // If we pass bannerImage: '' to updateService, does it persist?
                    // Let's assume updateService updates the text fields. 
                    // We might need to handle image deletion if it was there but now default is selected.
                    // However, updateService in controller typically only updates fields passed.
                    // If we pass bannerImage: '', it should update it.
                }

                setServices(services.map(s => s._id === updated._id ? updated : s));
            } else {
                // Create new service
                const newService = await createService(submissionData);

                // Upload banner if file selected and NOT default
                if (bannerFile && !useDefaultBanner) {
                    await uploadServiceBanner(newService._id, bannerFile);
                }

                setServices([...services, newService]);
            }

            setShowForm(false);
            await loadServices(); // Reload to get updated data
        } catch (error: any) {
            console.error('Failed to save service:', error);
            alert(error.message || 'Failed to save service. Please try again.');
        } finally {
            setSaving(false);
        }
    };



    const handleToggleStatus = async (service: Service) => {
        try {
            const updated = await toggleServiceStatus(service._id);
            setServices(services.map(s => s._id === updated._id ? updated : s));
        } catch (error) {
            console.error('Failed to toggle service status:', error);
            alert('Failed to toggle service status. Please try again.');
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteService(id);
            setDeleteConfirm(null);
            await loadServices();
        } catch (error) {
            console.error('Failed to delete service:', error);
            alert('Failed to delete service. Please try again.');
        }
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/html'));

        if (dragIndex === dropIndex) return;

        const newServices = [...services];
        const [draggedItem] = newServices.splice(dragIndex, 1);
        newServices.splice(dropIndex, 0, draggedItem);

        // Update sort orders
        const orders = newServices.map((service, index) => ({
            id: service._id,
            sortOrder: index,
        }));

        setServices(newServices);

        try {
            await reorderServices(orders);
        } catch (error) {
            console.error('Failed to reorder services:', error);
            alert('Failed to save new order. Please try again.');
            await loadServices(); // Reload on error
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Professional Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Service & Review Management</h2>
                        <p className="text-blue-100 mt-1">Manage your services, customer reviews, and features</p>
                    </div>
                    {activeTab === 'services' && (
                        <button
                            onClick={handleAddNew}
                            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-all shadow-md hover:shadow-lg font-medium"
                        >
                            <Plus size={18} />
                            Add Service
                        </button>
                    )}
                </div>

                {/* Modern Tab Navigation */}
                <div className="mt-6 flex gap-2">
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'services'
                            ? 'bg-white text-blue-600 shadow-md'
                            : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
                            }`}
                    >
                        Services
                    </button>
                    <button
                        onClick={() => setActiveTab('reviews')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'reviews'
                            ? 'bg-white text-blue-600 shadow-md'
                            : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
                            }`}
                    >
                        Customer Reviews
                    </button>
                    <button
                        onClick={() => setActiveTab('features')}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'features'
                            ? 'bg-white text-blue-600 shadow-md'
                            : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
                            }`}
                    >
                        Features
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'reviews' ? (
                <ReviewManagement />
            ) : activeTab === 'features' ? (
                <FeatureManagement />
            ) : (
                <>
                    {/* Service Form Modal */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                                onClick={() => !saving && setShowForm(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <form onSubmit={handleSubmit} className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {editingService ? 'Edit Service' : 'Add New Service'}
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setShowForm(false)}
                                                disabled={saving}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Service Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Service Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="e.g., Printing, Gifting, Design"
                                                    required
                                                    disabled={saving}
                                                />
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Description *
                                                </label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    rows={3}
                                                    placeholder="Brief description of the service"
                                                    required
                                                    disabled={saving}
                                                />
                                            </div>

                                            {/* Service Section Heading */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Service Section Heading
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.serviceHeading || ''}
                                                    onChange={(e) => setFormData({ ...formData, serviceHeading: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder={`${formData.name || 'SERVICE'} SERVICES`}
                                                    disabled={saving}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Heading displayed in the service section (after banner). Leave empty to use service name.
                                                </p>
                                            </div>

                                            {/* Service Section Description */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Service Section Description
                                                </label>
                                                <textarea
                                                    value={formData.serviceDescription || ''}
                                                    onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    rows={2}
                                                    placeholder="Description for the service section"
                                                    disabled={saving}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Description displayed in the service section. Leave empty to use main description.
                                                </p>
                                            </div>

                                            {/* Color Picker */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Service Color
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="color"
                                                        value={formData.color}
                                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                        className="h-10 w-20 rounded cursor-pointer"
                                                        disabled={saving}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={formData.color}
                                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="#93357c"
                                                        disabled={saving}
                                                    />
                                                    <div
                                                        className="w-10 h-10 rounded-lg border-2 border-gray-300"
                                                        style={{ backgroundColor: formData.color }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Sort Order */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Sort Order
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.sortOrder}
                                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    min="0"
                                                    disabled={saving}
                                                />
                                            </div>

                                            {/* Icon Selection */}
                                            <IconSelector
                                                label="Service Icon *"
                                                value={formData.icon}
                                                onChange={(iconName) => setFormData({ ...formData, icon: iconName })}
                                                placeholder="Select service icon"
                                                disabled={saving}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Icon displayed in service cards
                                            </p>

                                            {/* Navbar Icon Selection */}
                                            <div className="mt-4">
                                                <IconSelector
                                                    label="Navbar Icon (Optional)"
                                                    value={formData.navbarIcon}
                                                    onChange={(iconName) => setFormData({ ...formData, navbarIcon: iconName })}
                                                    placeholder="Use Service Icon"
                                                    disabled={saving}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Leave empty to use the service icon
                                                </p>
                                            </div>

                                            {/* Banner Configuration Section */}
                                            <div className="border-t pt-4 mt-4">
                                                <h4 className="text-md font-semibold text-gray-800 mb-3">Banner Configuration</h4>

                                                {/* Main Banner Icon */}
                                                <div className="mb-4">
                                                    <IconSelector
                                                        label="Main Banner Icon"
                                                        value={formData.bannerConfig.mainIcon || ''}
                                                        onChange={(iconName) => setFormData({
                                                            ...formData,
                                                            bannerConfig: { ...formData.bannerConfig, mainIcon: iconName }
                                                        })}
                                                        placeholder="Select main banner icon"
                                                        disabled={saving}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Primary icon displayed in the banner
                                                    </p>
                                                </div>

                                                {/* Secondary Icons Manager */}
                                                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Secondary Banner Icons
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newIcon: BannerSecondaryIcon = {
                                                                    icon: 'Printer',
                                                                    position: 'left',
                                                                    size: 24
                                                                };
                                                                setFormData({
                                                                    ...formData,
                                                                    bannerConfig: {
                                                                        ...formData.bannerConfig,
                                                                        secondaryIcons: [...formData.bannerConfig.secondaryIcons, newIcon]
                                                                    }
                                                                });
                                                            }}
                                                            disabled={saving}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            <Plus size={14} className="inline mr-1" />
                                                            Add Icon
                                                        </button>
                                                    </div>

                                                    {formData.bannerConfig.secondaryIcons.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {formData.bannerConfig.secondaryIcons.map((secIcon, index) => (
                                                                <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                                                                    <div className="flex-1">
                                                                        <IconSelector
                                                                            value={secIcon.icon}
                                                                            onChange={(iconName) => {
                                                                                const updated = [...formData.bannerConfig.secondaryIcons];
                                                                                updated[index] = { ...updated[index], icon: iconName };
                                                                                setFormData({
                                                                                    ...formData,
                                                                                    bannerConfig: { ...formData.bannerConfig, secondaryIcons: updated }
                                                                                });
                                                                            }}
                                                                            placeholder="Select icon"
                                                                            disabled={saving}
                                                                        />
                                                                    </div>
                                                                    <div className="w-32">
                                                                        <Select
                                                                            value={secIcon.position}
                                                                            onValueChange={(val) => {
                                                                                const updated = [...formData.bannerConfig.secondaryIcons];
                                                                                updated[index] = { ...updated[index], position: val as 'left' | 'right' | 'center' };
                                                                                setFormData({
                                                                                    ...formData,
                                                                                    bannerConfig: { ...formData.bannerConfig, secondaryIcons: updated }
                                                                                });
                                                                            }}
                                                                            options={[
                                                                                { value: 'left', label: 'Left' },
                                                                                { value: 'center', label: 'Center' },
                                                                                { value: 'right', label: 'Right' }
                                                                            ]}
                                                                            colorTheme="blue"
                                                                            className="h-10"
                                                                            disabled={saving}
                                                                        />
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={secIcon.size}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.bannerConfig.secondaryIcons];
                                                                            updated[index] = { ...updated[index], size: parseInt(e.target.value) || 24 };
                                                                            setFormData({
                                                                                ...formData,
                                                                                bannerConfig: { ...formData.bannerConfig, secondaryIcons: updated }
                                                                            });
                                                                        }}
                                                                        className="w-16 px-2 py-2 border border-gray-300 rounded text-sm"
                                                                        min="16"
                                                                        max="64"
                                                                        disabled={saving}
                                                                        placeholder="Size"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = formData.bannerConfig.secondaryIcons.filter((_, i) => i !== index);
                                                                            setFormData({
                                                                                ...formData,
                                                                                bannerConfig: { ...formData.bannerConfig, secondaryIcons: updated }
                                                                            });
                                                                        }}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                                        disabled={saving}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 text-center py-2">
                                                            No secondary icons added
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Banner Text Sections (4 Fields) */}
                                                <div className="grid grid-cols-1 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                                    <h5 className="font-semibold text-gray-700">Banner Text Configuration</h5>

                                                    {/* Text Section 1 */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Text Section 1 (Top Subtitle)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.bannerConfig.textSection1 || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, textSection1: e.target.value }
                                                            })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            placeholder="e.g., ORDER BOOK TODAY"
                                                            disabled={saving}
                                                        />
                                                    </div>

                                                    {/* Text Section 2 */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Text Section 2 (Description)
                                                        </label>
                                                        <textarea
                                                            value={formData.bannerConfig.textSection2 || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, textSection2: e.target.value }
                                                            })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            rows={2}
                                                            placeholder="Description text..."
                                                            disabled={saving}
                                                        />
                                                    </div>

                                                    {/* Text Section 3 */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Text Section 3 (Main Heading)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.bannerConfig.textSection3 || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, textSection3: e.target.value }
                                                            })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            placeholder="e.g., WIDE RANGE OF"
                                                            disabled={saving}
                                                        />
                                                    </div>

                                                    {/* Text Section 4 */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Text Section 4 (Highlight Text)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.bannerConfig.textSection4 || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, textSection4: e.target.value }
                                                            })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                            placeholder="Highlighted text"
                                                            disabled={saving}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Animation Shape Selector */}
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Animation Shape
                                                    </label>
                                                    <Select
                                                        value={formData.bannerConfig.defaultShape || 'circle'}
                                                        onValueChange={(val) => setFormData({
                                                            ...formData,
                                                            bannerConfig: {
                                                                ...formData.bannerConfig,
                                                                defaultShape: val as any
                                                            }
                                                        })}
                                                        options={[
                                                            { value: 'circle', label: 'Circle (Round)' },
                                                            { value: 'square', label: 'Square' },
                                                            { value: 'triangle', label: 'Triangle' },
                                                            { value: 'star', label: 'Star' },
                                                            { value: 'hexagon', label: 'Hexagon' },
                                                            { value: 'random', label: 'Random Mix' }
                                                        ]}
                                                        colorTheme="blue"
                                                        disabled={saving}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Shape of the decorative animated elements
                                                    </p>
                                                </div>

                                                {/* Animation Shape Size */}
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Shape Size (px)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formData.bannerConfig.defaultShapeSize || 12}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            bannerConfig: {
                                                                ...formData.bannerConfig,
                                                                defaultShapeSize: parseInt(e.target.value) || 12
                                                            }
                                                        })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        min="4"
                                                        max="100"
                                                        disabled={saving}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Size of the animated shapes (Default: 12)
                                                    </p>
                                                </div>

                                                {/* Banner Colors */}
                                                <div className="grid grid-cols-3 gap-3 mb-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Primary Color
                                                        </label>
                                                        <input
                                                            type="color"
                                                            value={formData.bannerConfig.primaryColor || formData.color}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, primaryColor: e.target.value }
                                                            })}
                                                            className="w-full h-10 rounded cursor-pointer"
                                                            disabled={saving}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Secondary Color
                                                        </label>
                                                        <input
                                                            type="color"
                                                            value={formData.bannerConfig.secondaryColor}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, secondaryColor: e.target.value }
                                                            })}
                                                            className="w-full h-10 rounded cursor-pointer"
                                                            disabled={saving}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Accent Color
                                                        </label>
                                                        <input
                                                            type="color"
                                                            value={formData.bannerConfig.accentColor}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                bannerConfig: { ...formData.bannerConfig, accentColor: e.target.value }
                                                            })}
                                                            className="w-full h-10 rounded cursor-pointer"
                                                            disabled={saving}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Color Palette Manager */}
                                                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Additional Color Palette
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newColor: BannerColorPalette = {
                                                                    color: '#000000',
                                                                    name: ''
                                                                };
                                                                setFormData({
                                                                    ...formData,
                                                                    bannerConfig: {
                                                                        ...formData.bannerConfig,
                                                                        colorPalette: [...formData.bannerConfig.colorPalette, newColor]
                                                                    }
                                                                });
                                                            }}
                                                            disabled={saving}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            <Plus size={14} className="inline mr-1" />
                                                            Add Color
                                                        </button>
                                                    </div>

                                                    {formData.bannerConfig.colorPalette.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {formData.bannerConfig.colorPalette.map((colorItem, index) => (
                                                                <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                                                                    <input
                                                                        type="color"
                                                                        value={colorItem.color}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.bannerConfig.colorPalette];
                                                                            updated[index] = { ...updated[index], color: e.target.value };
                                                                            setFormData({
                                                                                ...formData,
                                                                                bannerConfig: { ...formData.bannerConfig, colorPalette: updated }
                                                                            });
                                                                        }}
                                                                        className="w-16 h-10 rounded cursor-pointer"
                                                                        disabled={saving}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={colorItem.name || ''}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.bannerConfig.colorPalette];
                                                                            updated[index] = { ...updated[index], name: e.target.value };
                                                                            setFormData({
                                                                                ...formData,
                                                                                bannerConfig: { ...formData.bannerConfig, colorPalette: updated }
                                                                            });
                                                                        }}
                                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                                                        placeholder="Color name (optional)"
                                                                        disabled={saving}
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={colorItem.color}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.bannerConfig.colorPalette];
                                                                            updated[index] = { ...updated[index], color: e.target.value };
                                                                            setFormData({
                                                                                ...formData,
                                                                                bannerConfig: { ...formData.bannerConfig, colorPalette: updated }
                                                                            });
                                                                        }}
                                                                        className="w-24 px-2 py-2 border border-gray-300 rounded text-sm font-mono"
                                                                        placeholder="#000000"
                                                                        disabled={saving}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = formData.bannerConfig.colorPalette.filter((_, i) => i !== index);
                                                                            setFormData({
                                                                                ...formData,
                                                                                bannerConfig: { ...formData.bannerConfig, colorPalette: updated }
                                                                            });
                                                                        }}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                                        disabled={saving}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 text-center py-2">
                                                            No additional colors added
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Show Icons Toggle */}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="showBannerIcons"
                                                        checked={formData.bannerConfig.showIcons}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            bannerConfig: { ...formData.bannerConfig, showIcons: e.target.checked }
                                                        })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        disabled={saving}
                                                    />
                                                    <label htmlFor="showBannerIcons" className="text-sm font-medium text-gray-700">
                                                        Show Decorative Icons in Banner
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Banner Image Upload */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id="useDefaultBanner"
                                                        checked={useDefaultBanner}
                                                        onChange={(e) => {
                                                            setUseDefaultBanner(e.target.checked);
                                                            if (e.target.checked) {
                                                                setBannerFile(null);
                                                                setBannerPreview('');
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        disabled={saving}
                                                    />
                                                    <label htmlFor="useDefaultBanner" className="text-sm font-medium text-gray-700">
                                                        Use Default Banner
                                                    </label>
                                                </div>

                                                {!useDefaultBanner && (
                                                    <div className="space-y-3 pl-6 border-l-2 border-gray-100">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Upload Banner Image *
                                                        </label>
                                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer relative">
                                                            <div className="space-y-1 text-center">
                                                                <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                                <div className="flex text-sm text-gray-600 justify-center">
                                                                    <label
                                                                        htmlFor="banner-upload"
                                                                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                                                    >
                                                                        <span>Upload a file</span>
                                                                        <input
                                                                            id="banner-upload"
                                                                            name="banner-upload"
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="sr-only"
                                                                            onChange={handleBannerChange}
                                                                            disabled={saving}
                                                                        />
                                                                    </label>
                                                                    <p className="pl-1">or drag and drop</p>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    PNG, JPG, GIF up to 5MB
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {bannerPreview && (
                                                            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                                <img
                                                                    src={bannerPreview}
                                                                    alt="Banner preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setBannerFile(null);
                                                                        setBannerPreview('');
                                                                        // If editing and had image, clearing preview might mean we want to remove it? 
                                                                        // But usually we just let them select a new one.
                                                                        // If we want to allow removing existing image without replacing, we need more logic.
                                                                        // For now, assume this clears the *newly selected* file.
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-gray-500">
                                                            Recommended size: 1200x350px. Max size: 5MB.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setShowForm(false)}
                                                disabled={saving}
                                                className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md hover:shadow-lg font-medium"
                                            >
                                                {saving ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={18} />
                                                        {editingService ? 'Update Service' : 'Create Service'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Services List */}
                    {services.length === 0 ? (
                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Package size={32} className="text-blue-600" />
                                </div>
                                <p className="text-gray-600 font-medium">No services found</p>
                                <p className="text-sm text-gray-500">Click "Add Service" to create your first service</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {services.map((service, index) => (
                                <div
                                    key={service._id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                                >
                                    {/* Service Header */}
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Drag Handle */}
                                        <div className="cursor-move text-gray-400 hover:text-gray-600">
                                            <GripVertical size={20} />
                                        </div>

                                        {/* Color Preview */}
                                        <div
                                            className="w-12 h-12 rounded-lg border-2 border-gray-300 flex-shrink-0"
                                            style={{ backgroundColor: service.color }}
                                        />

                                        {/* Service Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                    {service.name}
                                                </h3>
                                                <span className={`px-2 py-1 text-xs rounded-full ${service.isActive
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {service.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">{service.description}</p>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                <span>Sort Order: {service.sortOrder}</span>
                                                <span>Titles: {service.titles?.length || 0}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleToggleStatus(service)}
                                                className={`p-2.5 rounded-lg transition-all ${service.isActive
                                                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                                                    }`}
                                                title={service.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {service.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                            <button
                                                onClick={() => setExpandedService(expandedService === service._id ? null : service._id)}
                                                className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                                                title="Manage Titles"
                                            >
                                                {expandedService === service._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(service)}
                                                className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(service._id)}
                                                className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title Manager (Expanded) */}
                                    <AnimatePresence>
                                        {expandedService === service._id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-gray-200 overflow-hidden"
                                            >
                                                <div className="p-4 bg-gray-50">
                                                    <ServiceTitleManager
                                                        service={service}
                                                        onUpdate={loadServices}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Delete Confirmation */}
                                    <AnimatePresence>
                                        {deleteConfirm === service._id && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                                                onClick={() => setDeleteConfirm(null)}
                                            >
                                                <motion.div
                                                    initial={{ scale: 0.9 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0.9 }}
                                                    className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Service?</h3>
                                                    <p className="text-gray-600 mb-6">
                                                        Are you sure you want to delete "{service.name}"? This action cannot be undone.
                                                    </p>
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => setDeleteConfirm(null)}
                                                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(service._id)}
                                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ServiceManagement;