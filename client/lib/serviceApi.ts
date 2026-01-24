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

/**
 * Fetch a service by ID with populated items
 * @param serviceId - The ID of the service to fetch
 * @returns Promise with the service data
 */
export async function fetchServiceById(serviceId: string): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/services/${serviceId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch service: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching service by ID:', error);
        throw error;
    }
}

/**
 * Update a service by ID
 * @param serviceId - The ID of the service to update
 * @param updates - Partial service data to update
 * @returns Promise with the updated service data
 */
export async function updateService(serviceId: string, updates: any): Promise<any> {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/services/${serviceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error(`Failed to update service: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating service:', error);
        throw error;
    }
}

/**
 * Fetch all services
 * @param activeOnly - If true, only fetch active services
 * @returns Promise with array of services
 */
export async function fetchServices(activeOnly: boolean = true): Promise<any[]> {
    try {
        const url = activeOnly ? `${API_BASE_URL}/api/services` : `${API_BASE_URL}/api/services?all=true`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch services: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching services:', error);
        throw error;
    }
}

/**
 * Create a new service
 * @param serviceData - Service data to create
 * @returns Promise with the created service
 */
export async function createService(serviceData: any): Promise<any> {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(serviceData),
        });

        if (!response.ok) {
            throw new Error(`Failed to create service: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating service:', error);
        throw error;
    }
}

/**
 * Delete a service by ID
 * @param serviceId - The ID of the service to delete
 * @returns Promise
 */
export async function deleteService(serviceId: string): Promise<void> {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete service: ${response.status}`);
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        throw error;
    }
}

/**
 * Reorder services
 * @param orders - Array of {id, sortOrder} objects
 * @returns Promise
 */
export async function reorderServices(orders: Array<{ id: string; sortOrder: number }>): Promise<void> {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/services/reorder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({ orders }),
        });

        if (!response.ok) {
            throw new Error(`Failed to reorder services: ${response.status}`);
        }
    } catch (error) {
        console.error('Error reordering services:', error);
        throw error;
    }
}

/**
 * Upload a service banner image
 * @param serviceId - The ID of the service
 * @param file - The banner image file
 * @returns Promise with the updated service
 */
export async function uploadServiceBanner(serviceId: string, file: File): Promise<any> {
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('banner', file);

        const response = await fetch(`${API_BASE_URL}/api/services/${serviceId}/banner`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to upload banner: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error uploading service banner:', error);
        throw error;
    }
}

/**
 * Toggle service active status
 * @param serviceId - The ID of the service
 * @returns Promise with the updated service
 */
export async function toggleServiceStatus(serviceId: string): Promise<any> {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/api/services/${serviceId}/toggle-status`, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to toggle service status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error toggling service status:', error);
        throw error;
    }
}
