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

/**
 * Hook to fetch and manage user context (segment, location, etc.)
 * Fetches from GET /api/user/context
 * 
 * Returns user info, pricing segment, and location (IP-detected if not provided)
 */
export function useUserContext(): UseUserContextReturn {
    const [context, setContext] = useState<UserContext | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContext = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Get auth token if exists
            const token = localStorage.getItem('token');

            // CRITICAL FIX: Get pincode from localStorage (saved by LocationDetector)
            const storedLocation = localStorage.getItem('userLocation');
            let pincode: string | null = null;

            if (storedLocation) {
                try {
                    const locationData = JSON.parse(storedLocation);
                    pincode = locationData.pincode;
                    console.log('📍 Using pincode from LocationDetector:', pincode);
                } catch (e) {
                    console.warn('Failed to parse stored location:', e);
                }
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Send pincode in request if we have it from GPS/manual detection
            const requestOptions: RequestInit = {
                method: pincode ? 'POST' : 'GET',
                headers,
            };

            if (pincode) {
                requestOptions.body = JSON.stringify({ pincode });
            }

            const response = await fetch(`${API_BASE_URL}/api/user/context`, requestOptions);

            if (!response.ok) {
                throw new Error(`Failed to fetch user context: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setContext(data);
                console.log('✅ User context loaded:', {
                    user: data.user.name,
                    segment: data.segment.name,
                    location: data.location.pincode,
                    detectionMethod: data.location.detectionMethod
                });
            } else {
                throw new Error(data.message || 'Failed to load user context');
            }
        } catch (err: any) {
            console.error('❌ Error fetching user context:', err);
            setError(err.message || 'Network error');

            // Fallback to guest context if API fails
            setContext({
                user: {
                    id: null,
                    name: 'Guest',
                    email: null,
                    mobileNumber: null,
                    userType: 'guest',
                    role: 'guest',
                    isAuthenticated: false,
                    isGuest: true
                },
                segment: {
                    id: null,
                    code: 'RETAIL',
                    name: 'Retail Customer',
                    pricingTier: 0
                },
                location: {
                    pincode: null,
                    geoZone: { id: null, name: null },
                    territoryAccess: [],
                    detectionMethod: 'FALLBACK'
                },
                pricing: {
                    currency: 'INR',
                    creditLimit: null,
                    paymentTerms: null
                },
                meta: {
                    timestamp: new Date().toISOString(),
                    source: 'FALLBACK'
                }
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchContext();
    }, [fetchContext]);

    // Re-fetch when token changes (login/logout)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token') {
                console.log('🔄 Token changed, refetching context...');
                fetchContext();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [fetchContext]);

    return {
        context,
        loading,
        error,
        refetch: fetchContext
    };
}
