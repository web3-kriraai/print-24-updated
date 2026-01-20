import { useState, useEffect } from 'react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

interface SiteSettings {
    logo: string;
    siteName: string;
    tagline: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
    logo: '/logo.svg',
    siteName: 'Prints24',
    tagline: 'Premium Gifting, Printing & Packaging Solutions'
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
                    tagline: data.tagline || DEFAULT_SETTINGS.tagline
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

export default useSiteSettings;
