import { useState } from 'react';

interface DetectedLocation {
    ip?: string;
    country?: string;
    countryName?: string;
    region?: string;
    regionName?: string;
    city?: string;
    zipCode?: string;
    currency?: string;
    timezone?: string;
    detected?: boolean;
    source?: string;
}

interface PincodeRanges {
    available: boolean;
    start?: string;
    end?: string;
    region?: string;
    regionName?: string;
    message?: string;
    suggestion?: string;
}

/**
 * Hook for auto-detecting user location and pincode lookup
 * 
 * Features:
 * - Auto-detect location from IP address
 * - Lookup location by pincode/zipcode
 * - Get pincode ranges for selected locations
 */
export const useAutoLocation = () => {
    const [detecting, setDetecting] = useState(false);
    const [location, setLocation] = useState<DetectedLocation | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Auto-detect location from user's IP address
     */
    const detectLocation = async (): Promise<DetectedLocation | null> => {
        setDetecting(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/locations/detect-from-ip', {
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {}
            });

            const data = await response.json();

            if (data.success && data.data) {
                setLocation(data.data);
                return data.data;
            } else {
                setError(data.message || 'Could not detect location');
                return null;
            }
        } catch (err) {
            console.error('Error detecting location:', err);
            setError('Network error while detecting location');
            return null;
        } finally {
            setDetecting(false);
        }
    };

    /**
     * Lookup location by pincode/zipcode
     * @param pincode - The postal code to lookup
     * @param country - ISO country code (default: IN)
     */
    const lookupPincode = async (
        pincode: string,
        country: string = 'IN'
    ): Promise<DetectedLocation | null> => {
        if (!pincode) return null;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `/api/admin/locations/lookup-pincode?code=${pincode}&country=${country}`,
                {
                    headers: token ? {
                        'Authorization': `Bearer ${token}`
                    } : {}
                }
            );

            const data = await response.json();

            if (data.success && data.data) {
                return data.data;
            }

            return null;
        } catch (err) {
            console.error('Error looking up pincode:', err);
            return null;
        }
    };

    /**
     * Get pincode ranges for a selected region
     * @param country - ISO country code
     * @param region - ISO region/state code
     * @param city - City name (optional)
     */
    const getPincodeRanges = async (
        country: string,
        region: string,
        city?: string
    ): Promise<PincodeRanges | null> => {
        if (!country || !region) return null;

        try {
            const token = localStorage.getItem('token');
            let url = `/api/admin/locations/pincode-ranges?country=${country}&region=${region}`;
            if (city) url += `&city=${encodeURIComponent(city)}`;

            const response = await fetch(url, {
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {}
            });

            const data = await response.json();

            if (data.success && data.data) {
                return data.data;
            }

            return null;
        } catch (err) {
            console.error('Error getting pincode ranges:', err);
            return null;
        }
    };

    return {
        detecting,
        location,
        error,
        detectLocation,
        lookupPincode,
        getPincodeRanges
    };
};
