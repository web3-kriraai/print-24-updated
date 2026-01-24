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

interface SiteSettings {
    _id?: string;
    logo: string;
    siteName: string;
    tagline: string;
    scrollSettings?: ScrollSettings;
    fontSettings?: FontSettings;
}

// Hook to fetch and use logo
export const useLogo = () => {
    const [logo, setLogo] = useState<string>('/logo.svg');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`);
                if (response.ok) {
                    const data: SiteSettings = await response.json();
                    setLogo(data.logo || '/logo.svg');
                }
            } catch (error) {
                console.error('Error fetching logo:', error);
                // Use default logo on error
                setLogo('/logo.svg');
            } finally {
                setLoading(false);
            }
        };

        fetchLogo();
    }, []);

    return { logo, loading };
};

// Hook to fetch and use scroll settings
export const useScrollSettings = () => {
    const [scrollSettings, setScrollSettings] = useState<ScrollSettings>({
        autoScrollEnabled: true,
        autoScrollInterval: 3000,
        inactivityTimeout: 6000,
        smoothScrollEnabled: true,
        stickyNavEnabled: true,
        scrollToTopOnNavClick: true,
        pageAutoScrollEnabled: true,
        pageAutoScrollDelay: 2000,
        pageAutoScrollAmount: 250,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScrollSettings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`);
                if (response.ok) {
                    const data: SiteSettings = await response.json();
                    if (data.scrollSettings) {
                        setScrollSettings(data.scrollSettings);
                    }
                }
            } catch (error) {
                console.error('Error fetching scroll settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchScrollSettings();
    }, []);

    return { scrollSettings, loading };
};

// Hook to fetch and use font settings
export const useFontSettings = () => {
    const [fontSettings, setFontSettings] = useState<FontSettings>({
        navbarNameFontSize: '14px',
        navbarNameFontWeight: '600',
        cardIntroFontSize: '12px',
        cardIntroFontWeight: '400',
        cardTitleFontSize: '24px',
        cardTitleFontWeight: '700',
        cardDescFontSize: '14px',
        cardDescFontWeight: '400',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFontSettings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`);
                if (response.ok) {
                    const data: SiteSettings = await response.json();
                    if (data.fontSettings) {
                        setFontSettings(data.fontSettings);
                    }
                }
            } catch (error) {
                console.error('Error fetching font settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFontSettings();
    }, []);

    return { fontSettings, loading };
};

// Hook to fetch all site settings
export const useSiteSettings = () => {
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
            scrollToTopOnNavClick: true,
            pageAutoScrollEnabled: true,
            pageAutoScrollDelay: 2000,
            pageAutoScrollAmount: 250,
        },
        fontSettings: {
            navbarNameFontSize: '14px',
            navbarNameFontWeight: '600',
            cardIntroFontSize: '12px',
            cardIntroFontWeight: '400',
            cardTitleFontSize: '24px',
            cardTitleFontWeight: '700',
            cardDescFontSize: '14px',
            cardDescFontWeight: '400',
        },
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch(`${API_BASE_URL_WITH_API}/site-settings`);
                if (response.ok) {
                    const data: SiteSettings = await response.json();
                    setSettings(data);
                }
            } catch (error) {
                console.error('Error fetching site settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    return { settings, loading };
};
