import React, { useState, useEffect, useRef } from "react";
import { Upload, Save, Loader, Image as ImageIcon, RefreshCw, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL_WITH_API } from "../../../lib/apiConfig";

interface ScrollSettings {
    autoScrollEnabled: boolean;
    autoScrollInterval: number;
    inactivityTimeout: number;
    smoothScrollEnabled: boolean;
    stickyNavEnabled: boolean;
    scrollToTopOnNavClick: boolean;
    pageAutoScrollEnabled?: boolean;
    pageAutoScrollDelay?: number;
    pageAutoScrollAmount?: number;
}

interface FontSettings {
    navbarNameFontSize: string;
    navbarNameFontWeight: string;
    cardIntroFontSize: string;
    cardIntroFontWeight: string;
    cardTitleFontSize: string;
    cardTitleFontWeight: string;
    cardDescFontSize: string;
    cardDescFontWeight: string;
}

interface NavbarSettings {
    itemWidth: string;
    itemGap: string;
}

interface SiteSettings {
    _id?: string;
    logo: string;
    siteName: string;
    tagline: string;
    scrollSettings?: ScrollSettings;
    fontSettings?: FontSettings;
    navbarSettings?: NavbarSettings;
}

const SiteSettingsManagement: React.FC = () => {
    const [settings, setSettings] = useState<SiteSettings>({
        logo: '/logo.svg',
        siteName: 'Prints24',
        tagline: 'Premium Gifting, Printing & Packaging Solutions',
        scrollSettings: {
            autoScrollEnabled: true,
            autoScrollInterval: 3000,
            inactivityTimeout: 6000,
            smoothScrollEnabled: true,
            stickyNavEnabled: true,
            scrollToTopOnNavClick: true
        },
        fontSettings: {
            navbarNameFontSize: '14px',
            navbarNameFontWeight: '600',
            cardIntroFontSize: '12px',
            cardIntroFontWeight: '400',
            cardTitleFontSize: '24px',
            cardTitleFontWeight: '700',
            cardDescFontSize: '14px',
            cardDescFontWeight: '400'
        },
        navbarSettings: {
            itemWidth: '150px',
            itemGap: '8px'
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingScroll, setSavingScroll] = useState(false);
    const [savingFonts, setSavingFonts] = useState(false);
    const [savingNavbar, setSavingNavbar] = useState(false);
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
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all ${uploading
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
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${saving
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

                {/* Scroll Behavior Settings Section */}
                <div className="p-6 border-t border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Homepage Scroll Behavior
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Control how the homepage scrolls and behaves for visitors
                    </p>


                    <div className="space-y-6">
                        {/* Page Auto-Scroll on Load Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="font-medium text-gray-900">Page Auto-Scroll on Load</label>
                                <p className="text-sm text-gray-500">Automatically scroll down when homepage loads</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({
                                    ...prev,
                                    scrollSettings: {
                                        ...prev.scrollSettings!,
                                        pageAutoScrollEnabled: !prev.scrollSettings?.pageAutoScrollEnabled
                                    }
                                }))}
                                className={`p-2 rounded-full transition-colors ${settings.scrollSettings?.pageAutoScrollEnabled !== false
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}
                            >
                                {settings.scrollSettings?.pageAutoScrollEnabled !== false ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        {/* Page Auto-Scroll Timing Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <label className="block font-medium text-gray-900 mb-2">
                                    Page Scroll Delay (ms)
                                </label>
                                <p className="text-sm text-gray-500 mb-2">Time before page scrolls</p>
                                <input
                                    type="number"
                                    value={settings.scrollSettings?.pageAutoScrollDelay || 2000}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        scrollSettings: {
                                            ...prev.scrollSettings!,
                                            pageAutoScrollDelay: parseInt(e.target.value) || 2000
                                        }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="0"
                                    step="0.000001"
                                />
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <label className="block font-medium text-gray-900 mb-2">
                                    Page Scroll Amount (px)
                                </label>
                                <p className="text-sm text-gray-500 mb-2">How far to scroll down</p>
                                <input
                                    type="number"
                                    value={settings.scrollSettings?.pageAutoScrollAmount || 250}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        scrollSettings: {
                                            ...prev.scrollSettings!,
                                            pageAutoScrollAmount: parseInt(e.target.value) || 250
                                        }
                                    }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="0"
                                    step="0.000001"
                                />
                            </div>
                        </div>

                        {/* Smooth Scroll Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="font-medium text-gray-900">Smooth Scroll</label>
                                <p className="text-sm text-gray-500">Enable smooth scrolling animations</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({
                                    ...prev,
                                    scrollSettings: {
                                        ...prev.scrollSettings!,
                                        smoothScrollEnabled: !prev.scrollSettings?.smoothScrollEnabled
                                    }
                                }))}
                                className={`p-2 rounded-full transition-colors ${settings.scrollSettings?.smoothScrollEnabled
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}
                            >
                                {settings.scrollSettings?.smoothScrollEnabled ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        {/* Sticky Navigation Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="font-medium text-gray-900">Sticky Navigation</label>
                                <p className="text-sm text-gray-500">Keep the navigation bar fixed when scrolling</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({
                                    ...prev,
                                    scrollSettings: {
                                        ...prev.scrollSettings!,
                                        stickyNavEnabled: !prev.scrollSettings?.stickyNavEnabled
                                    }
                                }))}
                                className={`p-2 rounded-full transition-colors ${settings.scrollSettings?.stickyNavEnabled
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}
                            >
                                {settings.scrollSettings?.stickyNavEnabled ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        {/* Scroll to Top on Nav Click Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="font-medium text-gray-900">Scroll to Top on Service Click</label>
                                <p className="text-sm text-gray-500">Scroll to banner when a service is selected</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({
                                    ...prev,
                                    scrollSettings: {
                                        ...prev.scrollSettings!,
                                        scrollToTopOnNavClick: !prev.scrollSettings?.scrollToTopOnNavClick
                                    }
                                }))}
                                className={`p-2 rounded-full transition-colors ${settings.scrollSettings?.scrollToTopOnNavClick
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}
                            >
                                {settings.scrollSettings?.scrollToTopOnNavClick ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        {/* Save Scroll Settings Button */}
                        <button
                            onClick={async () => {
                                try {
                                    setSavingScroll(true);
                                    const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${getToken()}`
                                        },
                                        body: JSON.stringify({
                                            scrollSettings: settings.scrollSettings
                                        })
                                    });

                                    if (response.ok) {
                                        toast.success('Scroll settings saved successfully!');
                                    } else {
                                        throw new Error('Failed to save scroll settings');
                                    }
                                } catch (error) {
                                    console.error('Error saving scroll settings:', error);
                                    toast.error('Failed to save scroll settings');
                                } finally {
                                    setSavingScroll(false);
                                }
                            }}
                            disabled={savingScroll}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${savingScroll
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {savingScroll ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Scroll Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Font Customization Section */}
                <div className="p-6 border-t border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Font Customization
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Control font sizes and weights for all services (navbar and cards)
                    </p>

                    <div className="space-y-6">
                        {/* Navbar Name Font Controls */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-3">Navbar Name</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Size
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.fontSettings?.navbarNameFontSize || '14px'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                navbarNameFontSize: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="14px"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Weight
                                    </label>
                                    <select
                                        value={settings.fontSettings?.navbarNameFontWeight || '600'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                navbarNameFontWeight: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="300">Light (300)</option>
                                        <option value="400">Normal (400)</option>
                                        <option value="500">Medium (500)</option>
                                        <option value="600">Semibold (600)</option>
                                        <option value="700">Bold (700)</option>
                                        <option value="800">Extra Bold (800)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Card Intro Font Controls */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-3">Card Intro ("We Offer...")</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Size
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.fontSettings?.cardIntroFontSize || '12px'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                cardIntroFontSize: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="12px"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Weight
                                    </label>
                                    <select
                                        value={settings.fontSettings?.cardIntroFontWeight || '400'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                cardIntroFontWeight: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="300">Light (300)</option>
                                        <option value="400">Normal (400)</option>
                                        <option value="500">Medium (500)</option>
                                        <option value="600">Semibold (600)</option>
                                        <option value="700">Bold (700)</option>
                                        <option value="800">Extra Bold (800)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Card Title Font Controls */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-3">Card Title (Service Name)</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Size
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.fontSettings?.cardTitleFontSize || '24px'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                cardTitleFontSize: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="24px"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Weight
                                    </label>
                                    <select
                                        value={settings.fontSettings?.cardTitleFontWeight || '700'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                cardTitleFontWeight: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="300">Light (300)</option>
                                        <option value="400">Normal (400)</option>
                                        <option value="500">Medium (500)</option>
                                        <option value="600">Semibold (600)</option>
                                        <option value="700">Bold (700)</option>
                                        <option value="800">Extra Bold (800)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Card Description Font Controls */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-3">Card Description</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Size
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.fontSettings?.cardDescFontSize || '14px'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                cardDescFontSize: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="14px"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Font Weight
                                    </label>
                                    <select
                                        value={settings.fontSettings?.cardDescFontWeight || '400'}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            fontSettings: {
                                                ...prev.fontSettings!,
                                                cardDescFontWeight: e.target.value
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="300">Light (300)</option>
                                        <option value="400">Normal (400)</option>
                                        <option value="500">Medium (500)</option>
                                        <option value="600">Semibold (600)</option>
                                        <option value="700">Bold (700)</option>
                                        <option value="800">Extra Bold (800)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Save Font Settings Button */}
                        <button
                            onClick={async () => {
                                try {
                                    setSavingFonts(true);
                                    const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${getToken()}`
                                        },
                                        body: JSON.stringify({
                                            fontSettings: settings.fontSettings
                                        })
                                    });

                                    if (response.ok) {
                                        toast.success('Font settings saved successfully!');
                                    } else {
                                        throw new Error('Failed to save font settings');
                                    }
                                } catch (error) {
                                    console.error('Error saving font settings:', error);
                                    toast.error('Failed to save font settings');
                                } finally {
                                    setSavingFonts(false);
                                }
                            }}
                            disabled={savingFonts}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${savingFonts
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {savingFonts ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Font Settings
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Navbar Layout Settings Section */}
                <div className="p-6 border-t border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Service Navbar Layout
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Control the width and spacing of service navigation buttons
                    </p>

                    <div className="space-y-6">
                        {/* Navbar Item Width */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium text-gray-900 mb-2">
                                Navbar Button Width
                            </label>
                            <p className="text-sm text-gray-500 mb-2">Width of each service button in the navigation bar</p>
                            <input
                                type="text"
                                value={settings.navbarSettings?.itemWidth || '150px'}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    navbarSettings: {
                                        ...prev.navbarSettings!,
                                        itemWidth: e.target.value
                                    }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="150px"
                            />
                            <p className="text-xs text-gray-400 mt-1">Examples: 150px, 200px, 10rem</p>
                        </div>

                        {/* Navbar Item Gap */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <label className="block font-medium text-gray-900 mb-2">
                                Gap Between Buttons
                            </label>
                            <p className="text-sm text-gray-500 mb-2">Space between service buttons</p>
                            <input
                                type="text"
                                value={settings.navbarSettings?.itemGap || '8px'}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    navbarSettings: {
                                        ...prev.navbarSettings!,
                                        itemGap: e.target.value
                                    }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="8px"
                            />
                            <p className="text-xs text-gray-400 mt-1">Examples: 8px, 12px, 1rem</p>
                        </div>

                        {/* Save Navbar Settings Button */}
                        <button
                            onClick={async () => {
                                try {
                                    setSavingNavbar(true);
                                    const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${getToken()}`
                                        },
                                        body: JSON.stringify({
                                            navbarSettings: settings.navbarSettings
                                        })
                                    });

                                    if (response.ok) {
                                        toast.success('Navbar settings saved successfully!');
                                    } else {
                                        throw new Error('Failed to save navbar settings');
                                    }
                                } catch (error) {
                                    console.error('Error saving navbar settings:', error);
                                    toast.error('Failed to save navbar settings');
                                } finally {
                                    setSavingNavbar(false);
                                }
                            }}
                            disabled={savingNavbar}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${savingNavbar
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                }`}
                        >
                            {savingNavbar ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Navbar Settings
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
