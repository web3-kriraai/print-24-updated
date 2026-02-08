import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = '/api'; // Use relative URL for same-origin
axios.defaults.withCredentials = true; // CRITICAL: Send cookies with every request

// Add request interceptor to include auth token if available
axios.interceptors.request.use(
    (config) => {
        // Get token from localStorage (if you're using token-based auth)
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login if unauthorized
            console.error('Unauthorized - please login');
            // window.location.href = '/login'; // Uncomment if you want auto-redirect
        }
        return Promise.reject(error);
    }
);

export default axios;
