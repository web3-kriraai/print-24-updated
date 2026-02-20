import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from './apiConfig';

// Type definitions matching backend response
export interface UserContext {
    user: {
        id: string | null;
        name: string;
        email: string | null;
        mobileNumber: string | null;
        userType: string;
        role: string;
        isAuthenticated: boolean;
        isGuest: boolean;
    };
    segment: {
        id: string | null;
        code: string;
        name: string;
        pricingTier: number;
    };
    location: {
        pincode: string | null;
        geoZone: {
            id: string | null;
            name: string | null;
        };
        territoryAccess: string[];
        detectionMethod: string;
    };
    pricing: {
        currency: string;
        creditLimit: number | null;
        paymentTerms: string | null;
    };
    meta: {
        timestamp: string;
        source: string;
    };
}

interface UseUserContextReturn {
    context: UserContext | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const LOCATION_CACHE_KEY = 'userLocation';
const LOCATION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedLocation {
    pincode: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    source: 'gps' | 'ip' | 'manual';
    cachedAt: number;
}

/**
 * Reverse-geocode GPS coordinates to an Indian pincode using the backend proxy.
 * Returns null on any failure.
 */
async function reverseGeocodeToPin(lat: number, lon: number): Promise<{ pincode: string; city?: string; state?: string } | null> {
    try {
        const url = `${API_BASE_URL}/api/geocoding/reverse?lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return null;
        const data = await res.json();
        const raw: string | undefined = data?.address?.postcode;
        if (!raw) return null;
        // Indian pincodes are 6 digits; strip spaces & dashes
        const pincode = raw.replace(/[\s-]/g, '');
        if (!/^\d{6}$/.test(pincode)) return null;
        return {
            pincode,
            city: data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || undefined,
            state: data?.address?.state || undefined,
        };
    } catch {
        return null;
    }
}

/**
 * Get pincode via browser GPS → reverse geocode.
 * Saves result to localStorage cache. Returns null on any failure.
 */
function getGPSPincode(): Promise<string | null> {
    return new Promise((resolve) => {
        if (!navigator?.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                console.log(`📡 GPS coords: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                const result = await reverseGeocodeToPin(latitude, longitude);
                if (result?.pincode) {
                    const cached: CachedLocation = {
                        pincode: result.pincode,
                        city: result.city,
                        state: result.state,
                        source: 'gps',
                        cachedAt: Date.now(),
                    };
                    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));
                    console.log(`✅ GPS resolved pincode: ${result.pincode} (${result.city}, ${result.state})`);
                    resolve(result.pincode);
                } else {
                    console.warn('⚠️ GPS reverse geocode returned no valid 6-digit pincode');
                    resolve(null);
                }
            },
            (err) => {
                console.log(`⚠️ GPS unavailable/denied: ${err.message}`);
                resolve(null);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
        );
    });
}

/**
 * Resolve the best available pincode for context fetch:
 *   1. Fresh localStorage cache (≤ 1 hour)
 *   2. Browser GPS → reverse geocode (saves to cache)
 *   3. null → server will use IP-based detection
 */
async function resolvePincodeForContext(): Promise<string | null> {
    // 1. Check fresh cache
    try {
        const raw = localStorage.getItem(LOCATION_CACHE_KEY);
        if (raw) {
            const cached: CachedLocation = JSON.parse(raw);
            if (cached.pincode && Date.now() - (cached.cachedAt || 0) < LOCATION_CACHE_TTL_MS) {
                console.log(`📍 Using cached pincode: ${cached.pincode} (${cached.source}, ` +
                    `${Math.round((Date.now() - cached.cachedAt) / 60000)}min ago)`);
                return cached.pincode;
            }
            // Expired — clear it so GPS can refresh
            localStorage.removeItem(LOCATION_CACHE_KEY);
            console.log('📍 Location cache expired — re-detecting...');
        }
    } catch {
        localStorage.removeItem(LOCATION_CACHE_KEY);
    }

    // 2. Try GPS
    const gpsPin = await getGPSPincode();
    if (gpsPin) return gpsPin;

    // 3. Fallback to server IP detection
    console.log('📍 No GPS — server will detect location from IP');
    return null;
}

/**
 * Hook to fetch and manage user context (segment, location, pricing).
 *
 * Location resolution order:
 *   • localStorage cache (fresh ≤ 1 h)  →  pincode sent to server
 *   • Browser GPS → reverse geocode      →  pincode cached + sent
 *   • null                               →  server uses IP detection
 *
 * Re-fetches on: mount, token change, userLocation change in localStorage.
 */
export function useUserContext(): UseUserContextReturn {
    const [context, setContext] = useState<UserContext | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContext = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Resolve pincode (cache → GPS → null)
            const pincode = await resolvePincodeForContext();

            const token = localStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const requestOptions: RequestInit = {
                method: pincode ? 'POST' : 'GET',
                headers,
                ...(pincode && { body: JSON.stringify({ pincode }) }),
            };

            const response = await fetch(`${API_BASE_URL}/api/user/context`, requestOptions);
            if (!response.ok) throw new Error(`Failed to fetch user context: ${response.status}`);

            const data = await response.json();

            if (data.success) {
                setContext(data);
                console.log('✅ User context loaded:', {
                    user: data.user?.name,
                    segment: data.segment?.name,
                    pincode: data.location?.pincode,
                    detectionMethod: data.location?.detectionMethod,
                });

                // If server resolved a pincode (e.g. via IP) and we don't have one cached, cache it
                if (data.location?.pincode && !pincode) {
                    const cached: CachedLocation = {
                        pincode: data.location.pincode,
                        source: 'ip',
                        cachedAt: Date.now(),
                    };
                    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));
                    console.log(`📍 Cached IP-detected pincode: ${data.location.pincode}`);
                }
            } else {
                throw new Error(data.message || 'Failed to load user context');
            }
        } catch (err: any) {
            console.error('❌ Error fetching user context:', err);
            setError(err.message || 'Network error');

            // Graceful fallback — guest context so app still works
            setContext({
                user: {
                    id: null, name: 'Guest', email: null, mobileNumber: null,
                    userType: 'guest', role: 'guest', isAuthenticated: false, isGuest: true,
                },
                segment: { id: null, code: 'RETAIL', name: 'Retail Customer', pricingTier: 0 },
                location: {
                    pincode: null, geoZone: { id: null, name: null },
                    territoryAccess: [], detectionMethod: 'FALLBACK',
                },
                pricing: { currency: 'INR', creditLimit: null, paymentTerms: null },
                meta: { timestamp: new Date().toISOString(), source: 'FALLBACK' },
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchContext();
    }, [fetchContext]);

    // Re-fetch when auth token or saved location changes
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token') {
                console.log('🔄 Auth token changed — refetching context...');
                fetchContext();
            }
            if (e.key === LOCATION_CACHE_KEY) {
                console.log('🔄 Saved location changed — refetching context...');
                fetchContext();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [fetchContext]);

    return { context, loading, error, refetch: fetchContext };
}
