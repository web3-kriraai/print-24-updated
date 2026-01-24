// API configuration helper
// Use this to make all API calls with the correct base URL

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Makes an API request with the correct base URL
 * @param endpoint - The API endpoint (e.g., '/api/admin/pricing/user-segments')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const apiRequest = (endpoint: string, options?: RequestInit): Promise<Response> => {
    const url = `${API_BASE_URL}${endpoint}`;
    return fetch(url, options);
};

/**
 * Gets the full API URL for an endpoint
 * @param endpoint - The API endpoint
 * @returns The full URL
 */
export const getApiUrl = (endpoint: string): string => {
    return `${API_BASE_URL}${endpoint}`;
};

export { API_BASE_URL };
