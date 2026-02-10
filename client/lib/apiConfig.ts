//API Configuration
// Default to empty string (same-origin) for production
// Only use localhost:5000 if explicitly running in dev mode
const envBaseUrl = (import.meta as any).env.VITE_API_BASE_URL;
const isDev = (import.meta as any).env.DEV;

// Priority: explicit env var > dev mode localhost > production empty string
export const API_BASE_URL = envBaseUrl !== undefined ? envBaseUrl : (isDev ? "http://localhost:5000" : "");
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
