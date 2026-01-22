import { useState, useEffect } from 'react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

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
    logo: string;
    siteName: string;
    tagline: string;
    scrollSettings?: ScrollSettings;
    fontSettings?: FontSettings;
    navbarSettings?: NavbarSettings;
}

const DEFAULT_SCROLL_SETTINGS: ScrollSettings = {
    autoScrollEnabled: true,
    autoScrollInterval: 3000,
    inactivityTimeout: 6000,
    smoothScrollEnabled: true,
    stickyNavEnabled: true,
    scrollToTopOnNavClick: true
};

const DEFAULT_FONT_SETTINGS: FontSettings = {
    navbarNameFontSize: '14px',
    navbarNameFontWeight: '600',
    cardIntroFontSize: '12px',
    cardIntroFontWeight: '400',
    cardTitleFontSize: '24px',
    cardTitleFontWeight: '700',
    cardDescFontSize: '14px',
    cardDescFontWeight: '400'
};

const DEFAULT_NAVBAR_SETTINGS: NavbarSettings = {
    itemWidth: '150px',
    itemGap: '8px'
};

const DEFAULT_SETTINGS: SiteSettings = {
    logo: '/logo.svg',
    siteName: 'Prints24',
    tagline: 'Premium Gifting, Printing & Packaging Solutions',
    scrollSettings: DEFAULT_SCROLL_SETTINGS,
    fontSettings: DEFAULT_FONT_SETTINGS,
    navbarSettings: DEFAULT_NAVBAR_SETTINGS
};

export const useSiteSettings = () => {
    const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`);
            if (response.ok) {
                const data = await response.json();
                setSettings({
                    logo: data.logo || DEFAULT_SETTINGS.logo,
                    siteName: data.siteName || DEFAULT_SETTINGS.siteName,
                    tagline: data.tagline || DEFAULT_SETTINGS.tagline,
                    scrollSettings: {
                        ...DEFAULT_SCROLL_SETTINGS,
                        ...data.scrollSettings
                    },
                    fontSettings: {
                        ...DEFAULT_FONT_SETTINGS,
                        ...data.fontSettings
                    },
                    navbarSettings: {
                        ...DEFAULT_NAVBAR_SETTINGS,
                        ...data.navbarSettings
                    }
                });
            }
        } catch (err) {
            console.error('Error fetching site settings:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch settings');
            // Keep default settings on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return {
        settings,
        loading,
        error,
        refetch: fetchSettings
    };
};

// Simple hook to just get the logo URL with fallback
export const useLogo = () => {
    const { settings, loading } = useSiteSettings();
    return {
        logo: settings.logo || '/logo.svg',
        loading
    };
};

// Hook to get scroll settings
export const useScrollSettings = () => {
    const { settings, loading } = useSiteSettings();
    return {
        scrollSettings: settings.scrollSettings || DEFAULT_SCROLL_SETTINGS,
        loading
    };
};

// Hook to get font settings
export const useFontSettings = () => {
    const { settings, loading } = useSiteSettings();
    return {
        fontSettings: settings.fontSettings || DEFAULT_FONT_SETTINGS,
        loading
    };
};

// Hook to get navbar settings
export const useNavbarSettings = () => {
    const { settings, loading } = useSiteSettings();
    return {
        navbarSettings: settings.navbarSettings || DEFAULT_NAVBAR_SETTINGS,
        loading
    };
};

export default useSiteSettings;
