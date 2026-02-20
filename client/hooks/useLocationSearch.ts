import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for location search functionality
 * Handles searching locations, region suggestions, and existing zone detection
 */
export const useLocationSearch = (existingZones = []) => {
    const [locationSearch, setLocationSearch] = useState('');
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Search for locations (database + existing zones + smart suggestions)
     */
    const searchLocations = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setLocationSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Check for smart region suggestions
            const regionPromise = fetch(
                `/api/admin/pricing/locations/suggest-region?query=${encodeURIComponent(query)}`,
                { headers }
            ).then(res => res.json());

            // 2. Search database
            const dbPromise = fetch(
                `/api/admin/pricing/locations/search?query=${encodeURIComponent(query)}`,
                { headers }
            ).then(res => res.json());

            const [regionData, dbData] = await Promise.all([regionPromise, dbPromise]);

            // 3. Search existing zones
            const searchTerm = query.toLowerCase();
            const existingMatches = existingZones
                .filter(zone =>
                    zone.name.toLowerCase().includes(searchTerm) ||
                    zone.code?.toLowerCase().includes(searchTerm)
                )
                .map(zone => ({
                    ...zone,
                    source: 'existing',
                    pincodeRanges: zone.pincodeRanges || []
                }));

            // 4. Combine results: smart suggestion first, then existing, then database
            const combined = [
                ...(regionData.suggestion ? [regionData.suggestion] : []),
                ...existingMatches,
                ...(dbData.locations || [])
            ];

            setLocationSuggestions(combined);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Location search failed:', error);
            setLocationSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, [existingZones]);

    /**
     * Handle search input change
     */
    const handleSearchChange = useCallback((value) => {
        setLocationSearch(value);
        searchLocations(value);
    }, [searchLocations]);

    /**
     * Clear search
     */
    const clearSearch = useCallback(() => {
        setLocationSearch('');
        setLocationSuggestions([]);
        setShowSuggestions(false);
    }, []);

    /**
     * Close suggestions
     */
    const closeSuggestions = useCallback(() => {
        setShowSuggestions(false);
    }, []);

    /**
     * Open suggestions (if there are any)
     */
    const openSuggestions = useCallback(() => {
        if (locationSuggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [locationSuggestions]);

    return {
        locationSearch,
        locationSuggestions,
        showSuggestions,
        isLoading,
        handleSearchChange,
        clearSearch,
        closeSuggestions,
        openSuggestions,
        setLocationSearch
    };
};
