// API Configuration
// In production (when served from same server), use relative URLs
// In development (Vite dev server), use environment variable or localhost:5000

// Detect if we're in production (served from same origin as API)
const isProduction = (import.meta as any).env.PROD;

// In production, use empty string (relative URLs like /api/...)
// In development, use VITE_API_BASE_URL or default to localhost:5000
export const API_BASE_URL = isProduction
  ? ""
  : ((import.meta as any).env.VITE_API_BASE_URL || "http://localhost:5000");

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
