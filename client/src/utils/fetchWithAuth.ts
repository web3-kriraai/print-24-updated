// Utility function to add Authorization header to fetch requests
export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    // Merge headers
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Make request with credentials
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Send cookies
    });

    return response;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
    return !!localStorage.getItem('token');
};

// Get current token
export const getToken = (): string | null => {
    return localStorage.getItem('token');
};
