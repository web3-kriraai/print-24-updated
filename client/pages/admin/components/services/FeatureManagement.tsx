import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    Upload,
    Eye,
    EyeOff,
    GripVertical,
    Tag,
    Truck,
    Gift,
    ShoppingBag,
    RotateCcw,
    Package,
    Award,
    Clock,
    Shield,
    Heart,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';
import IconSelector from '../../../../components/IconSelector';

interface Feature {
    _id?: string;
    icon: string;
    iconImage?: string;
    iconShape?: 'circle' | 'square' | 'rounded';
    iconBackgroundColor?: string;
    title: string;
    description: string;
    color: string;
    displayOrder: number;
    isVisible: boolean;
}

// Removed hardcoded iconMap in favor of dynamic lookup from LucideIcons

const FeatureManagement: React.FC = () => {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
    const [formData, setFormData] = useState<Feature>({
        icon: 'Tag',
        title: '',
        description: '',
        color: '#8BC34A',
        displayOrder: 0,
        isVisible: true,
    });
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string>('');
    const [useIconImage, setUseIconImage] = useState(false);
    const [useIconShape, setUseIconShape] = useState(false);
    const [iconShape, setIconShape] = useState<'circle' | 'square' | 'rounded'>('circle');
    const [iconBackgroundColor, setIconBackgroundColor] = useState('#f0f0f0');
    const [saving, setSaving] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        loadFeatures();
    }, []);

    const loadFeatures = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL_WITH_API}/features?_t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                setFeatures(data.sort((a: Feature, b: Feature) => a.displayOrder - b.displayOrder));
            }
        } catch (error) {
            console.error('Failed to load features:', error);
            alert('Failed to load features. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingFeature(null);
        setFormData({
            icon: 'Tag',
            title: '',
            description: '',
            color: '#8BC34A',
            displayOrder: features.length,
            isVisible: true,
        });
        setIconFile(null);
        setIconPreview('');
        setUseIconImage(false);
        setUseIconShape(false);
        setIconShape('circle');
        setIconBackgroundColor('#f0f0f0');
        setShowForm(true);
    };

    const handleEdit = (feature: Feature) => {
        setEditingFeature(feature);
        setFormData(feature);
        setIconFile(null);
        setIconPreview(feature.iconImage || '');
        setUseIconImage(!!feature.iconImage);
        setUseIconShape(!!feature.iconShape);
        setIconShape(feature.iconShape || 'circle');
        setIconBackgroundColor(feature.iconBackgroundColor || '#f0f0f0');
        setShowForm(true);
    };

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setIconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            alert('Feature title is required');
            return;
        }

        try {
            setSaving(true);

            const submissionData = new FormData();
            submissionData.append('icon', formData.icon);
            submissionData.append('title', formData.title);
            submissionData.append('description', formData.description);
            submissionData.append('color', formData.color);
            submissionData.append('displayOrder', formData.displayOrder.toString());
            submissionData.append('isVisible', formData.isVisible.toString());

            if (useIconImage) {
                if (useIconShape) {
                    submissionData.append('iconShape', iconShape);
                    submissionData.append('iconBackgroundColor', iconBackgroundColor);
                } else {
                    submissionData.append('iconShape', '');
                    submissionData.append('iconBackgroundColor', '');
                }
            }

            if (useIconImage && iconFile) {
                submissionData.append('iconImage', iconFile);
            } else if (!useIconImage) {
                // Explicitly clear iconImage if switching to icon library
                submissionData.append('iconImage', '');
            }

            const url = editingFeature
                ? `${API_BASE_URL_WITH_API}/features/${editingFeature._id}`
                : `${API_BASE_URL_WITH_API}/features`;

            const method = editingFeature ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                body: submissionData,
            });

            if (response.ok) {
                await loadFeatures();
                setShowForm(false);
            } else {
                throw new Error('Failed to save feature');
            }
        } catch (error: any) {
            console.error('Failed to save feature:', error);
            alert(error.message || 'Failed to save feature. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this feature?')) return;

        try {
            const response = await fetch(`${API_BASE_URL_WITH_API}/features/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await loadFeatures();
            }
        } catch (error) {
            console.error('Failed to delete feature:', error);
            alert('Failed to delete feature. Please try again.');
        }
    };

    const handleToggleVisibility = async (feature: Feature) => {
        try {
            const response = await fetch(`${API_BASE_URL_WITH_API}/features/${feature._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...feature, isVisible: !feature.isVisible }),
            });

            if (response.ok) {
                await loadFeatures();
            }
        } catch (error) {
            console.error('Failed to toggle visibility:', error);
            alert('Failed to toggle visibility. Please try again.');
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (dropIndex: number) => {
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newFeatures = [...features];
        const [draggedItem] = newFeatures.splice(draggedIndex, 1);
        newFeatures.splice(dropIndex, 0, draggedItem);

        const reorderedFeatures = newFeatures.map((feature, index) => ({
            id: feature._id!,
            displayOrder: index,
        }));

        setFeatures(newFeatures);
        setDraggedIndex(null);

        try {
            await fetch(`${API_BASE_URL_WITH_API}/features/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features: reorderedFeatures }),
            });
        } catch (error) {
            console.error('Failed to reorder features:', error);
            alert('Failed to save new order. Please try again.');
            await loadFeatures();
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Features</h3>
                    <p className="text-sm text-gray-600 mt-1">Manage homepage features</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    Add Feature
                </button>
            </div>

            {/* Features List */}
            <div className="space-y-3">
                {features.map((feature, index) => {
                    const IconComponent = (LucideIcons as any)[feature.icon] || LucideIcons.Tag;
                    return (
                        <motion.div
                            key={feature._id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-move"
                        >
                            <div className="flex items-center gap-4">
                                <GripVertical className="text-gray-400" size={20} />

                                {/* Icon Preview */}
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${feature.color}15` }}
                                >
                                    {feature.iconImage ? (
                                        <img src={feature.iconImage} alt={feature.title} className="w-7 h-7" />
                                    ) : (
                                        <IconComponent className="w-7 h-7" style={{ color: feature.color }} />
                                    )}
                                </div>

                                {/* Feature Info */}
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                                    <p className="text-sm text-gray-500">{feature.description}</p>
                                </div>

                                {/* Color Badge */}
                                <div
                                    className="w-8 h-8 rounded-full border-2 border-gray-300"
                                    style={{ backgroundColor: feature.color }}
                                />

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleVisibility(feature)}
                                        className={`p-2 rounded-lg transition-colors ${feature.isVisible
                                            ? 'text-green-600 hover:bg-green-50'
                                            : 'text-gray-400 hover:bg-gray-50'
                                            }`}
                                        title={feature.isVisible ? 'Visible' : 'Hidden'}
                                    >
                                        {feature.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(feature)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(feature._id!)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {features.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <p>No features yet. Click "Add Feature" to create one.</p>
                    </div>
                )}
            </div>

            {/* Form Modal */}
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
                            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {editingFeature ? 'Edit Feature' : 'Add New Feature'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g., Best prices & offers"
                                            required
                                            disabled={saving}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g., Orders $50 or more"
                                            required
                                            maxLength={60}
                                            disabled={saving}
                                        />
                                        <p className="text-xs text-gray-500 mt-1 text-right">
                                            {formData.description.length}/60 characters
                                        </p>
                                    </div>

                                    {/* Color */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Color
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
                                                placeholder="#8BC34A"
                                                disabled={saving}
                                            />
                                            <div
                                                className="w-10 h-10 rounded-lg border-2 border-gray-300"
                                                style={{ backgroundColor: formData.color }}
                                            />
                                        </div>
                                    </div>

                                    {/* Icon Type Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Icon Type
                                        </label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={!useIconImage}
                                                    onChange={() => setUseIconImage(false)}
                                                    className="mr-2"
                                                    disabled={saving}
                                                />
                                                <span className="text-sm">Icon Library</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={useIconImage}
                                                    onChange={() => setUseIconImage(true)}
                                                    className="mr-2"
                                                    disabled={saving}
                                                />
                                                <span className="text-sm">Upload Image</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Icon Selection or Upload */}
                                    {!useIconImage ? (
                                        <IconSelector
                                            label="Icon"
                                            value={formData.icon}
                                            onChange={(iconName) => setFormData({ ...formData, icon: iconName })}
                                            placeholder="Select feature icon"
                                            disabled={saving}
                                        />
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Upload Icon Image
                                            </label>
                                            <div className="flex items-center gap-4 mb-4">
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                                                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                                        <p className="text-sm text-gray-600">Click to upload icon</p>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleIconChange}
                                                            className="hidden"
                                                            disabled={saving}
                                                        />
                                                    </div>
                                                </label>
                                                {iconPreview && (
                                                    <div className="flex flex-col gap-2">
                                                        <div
                                                            className={`w-16 h-16 flex items-center justify-center border border-gray-200 ${useIconShape
                                                                ? iconShape === 'circle' ? 'rounded-full' : iconShape === 'rounded' ? 'rounded-lg' : 'rounded-none'
                                                                : ''
                                                                }`}
                                                            style={{
                                                                backgroundColor: useIconShape ? iconBackgroundColor : 'transparent'
                                                            }}
                                                        >
                                                            <img src={iconPreview} alt="Preview" className="w-8 h-8 object-contain" />
                                                        </div>
                                                        <span className="text-xs text-center text-gray-500">Preview</span>
                                                    </div>
                                                )}
                                            </div>

                                            {iconPreview && (
                                                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={useIconShape}
                                                            onChange={(e) => setUseIconShape(e.target.checked)}
                                                            className="mr-2"
                                                            disabled={saving}
                                                        />
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Display inside shape
                                                        </label>
                                                    </div>

                                                    {useIconShape && (
                                                        <div className="space-y-3 pl-6">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                                    Shape
                                                                </label>
                                                                <div className="flex gap-2">
                                                                    {['circle', 'square', 'rounded'].map((shape) => (
                                                                        <button
                                                                            key={shape}
                                                                            type="button"
                                                                            onClick={() => setIconShape(shape as any)}
                                                                            className={`px-3 py-1 text-sm rounded border transition-colors ${iconShape === shape
                                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                                                }`}
                                                                        >
                                                                            {shape.charAt(0).toUpperCase() + shape.slice(1)}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                                    Background Color
                                                                </label>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="color"
                                                                        value={iconBackgroundColor}
                                                                        onChange={(e) => setIconBackgroundColor(e.target.value)}
                                                                        className="h-8 w-12 rounded cursor-pointer"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={iconBackgroundColor}
                                                                        onChange={(e) => setIconBackgroundColor(e.target.value)}
                                                                        className="px-2 py-1 text-sm border border-gray-300 rounded w-24"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Visibility */}
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.isVisible}
                                            onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                                            className="mr-2"
                                            disabled={saving}
                                        />
                                        <label className="text-sm font-medium text-gray-700">
                                            Visible on homepage
                                        </label>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                {editingFeature ? 'Update' : 'Create'}
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

export default FeatureManagement;
