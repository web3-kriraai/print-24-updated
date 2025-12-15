// API Configuration
// Using ngrok server for API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://lyndon-gastric-dax.ngrok-free.dev";
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
