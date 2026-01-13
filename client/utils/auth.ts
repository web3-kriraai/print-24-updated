export const getAuthHeaders = (includeContentType = false) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
    };

    if (includeContentType) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
};
