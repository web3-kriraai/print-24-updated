// API Configuration
// Frontend is on Cloud Storage, Backend is on Cloud Run

// Detect if we're in production
const isProduction = (import.meta as any).env.PROD;

// Use VITE_API_BASE_URL from environment
// In production: set via .env.production
// In development: defaults to localhost:5000
export const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_BASE_URL_WITH_API = `${API_BASE_URL}/api`;

// Helper function to get base headers
export const getBaseHeaders = () => {
  return {
    "Accept": "application/json",
  };
};

// Helper function to get auth headers
export const getAuthHeaders = (includeContentType = false) => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    ...getBaseHeaders(),
    Authorization: `Bearer ${token}`,
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};
