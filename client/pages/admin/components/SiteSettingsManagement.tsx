import React, { useState, useEffect, useRef } from "react";
import { Upload, Save, Loader, Image as ImageIcon, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL_WITH_API } from "../../../lib/apiConfig";

interface SiteSettings {
    _id?: string;
    logo: string;
    siteName: string;
    tagline: string;
}

const SiteSettingsManagement: React.FC = () => {
    const [settings, setSettings] = useState<SiteSettings>({
        logo: '/logo.svg',
        siteName: 'Prints24',
        tagline: 'Premium Gifting, Printing & Packaging Solutions'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewLogo, setPreviewLogo] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get auth token
    const getToken = () => localStorage.getItem('token');

    // Fetch current settings
    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`);
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setPreviewLogo(data.logo);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load site settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Handle text field changes
    const handleChange = (field: keyof SiteSettings, value: string) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // Save text settings
    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    siteName: settings.siteName,
                    tagline: settings.tagline
                })
            });

            if (response.ok) {
                toast.success('Settings saved successfully!');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!validTypes.includes(file.type) && !file.name.endsWith('.svg')) {
            toast.error('Please upload an image file (PNG, JPG, SVG, etc.)');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        // Preview the file
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewLogo(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload the file
        uploadLogo(file);
    };

    // Upload logo to server
    const uploadLogo = async (file: File) => {
        try {
            setUploading(true);
            
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(prev => ({ ...prev, logo: data.logo }));
                setPreviewLogo(data.logo);
                toast.success('Logo uploaded successfully!');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload logo');
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
            // Revert preview
            setPreviewLogo(settings.logo);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
                <p className="text-gray-600 mt-1">Manage your website logo and branding</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Logo Section */}
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Website Logo
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                            <div className="w-64 h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                                {previewLogo ? (
                                    <img 
                                        src={previewLogo} 
                                        alt="Logo Preview" 
                                        className="max-w-full max-h-full object-contain p-2"
                                    />
                                ) : (
                                    <span className="text-gray-400">No logo</span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Current logo preview
                            </p>
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Upload New Logo
                                    </label>
                                    <p className="text-sm text-gray-500 mb-3">
                                        Supported formats: PNG, JPG, SVG, WebP • Max size: 5MB
                                    </p>
                                    
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,.svg"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    
                                    <label
                                        htmlFor="logo-upload"
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all ${
                                            uploading 
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                : 'bg-purple-600 text-white hover:bg-purple-700'
                                        }`}
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader className="w-4 h-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Choose File
                                            </>
                                        )}
                                    </label>
                                </div>

                                {/* Reset to default */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`, {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${getToken()}`
                                                },
                                                body: JSON.stringify({ logo: '/logo.svg' })
                                            });
                                            if (response.ok) {
                                                setPreviewLogo('/logo.svg');
                                                setSettings(prev => ({ ...prev, logo: '/logo.svg' }));
                                                toast.success('Logo reset to default!');
                                            } else {
                                                toast.error('Failed to reset logo');
                                            }
                                        } catch (error) {
                                            console.error('Error resetting logo:', error);
                                            toast.error('Failed to reset logo');
                                        }
                                    }}
                                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Reset to default logo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Site Name & Tagline Section */}
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Branding
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site Name
                            </label>
                            <input
                                type="text"
                                value={settings.siteName}
                                onChange={(e) => handleChange('siteName', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Your site name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tagline
                            </label>
                            <input
                                type="text"
                                value={settings.tagline}
                                onChange={(e) => handleChange('tagline', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Your site tagline"
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                                saving 
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SiteSettingsManagement;
