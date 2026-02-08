import axios from 'axios';
import { UserType, PrivilegeBundle, ViewStyle, ResourceRegistry, FeatureFlag, AuditLog } from '../types/pms.types';

const API_BASE = '/api/admin/pms';

// Response wrapper type from backend
interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// User Types - MATCHES ACTUAL BACKEND
export const userTypeApi = {
    list: (params?: any) =>
        axios.get<ApiResponse<UserType[]>>(`${API_BASE}/user-types`, { params }),
    getById: (id: string) =>
        axios.get<ApiResponse<UserType>>(`${API_BASE}/user-types/${id}`),
    create: (data: Partial<UserType>) =>
        axios.post<ApiResponse<UserType>>(`${API_BASE}/user-types`, data),
    update: (id: string, data: Partial<UserType>) =>
        axios.put<ApiResponse<UserType>>(`${API_BASE}/user-types/${id}`, data),
    delete: (id: string) =>
        axios.delete<ApiResponse<UserType>>(`${API_BASE}/user-types/${id}`),
    duplicate: (id: string, name: string, code: string) =>
        axios.post<ApiResponse<UserType>>(`${API_BASE}/user-types/${id}/duplicate`, { name, code }),
    getHierarchy: () =>
        axios.get<ApiResponse<UserType[]>>(`${API_BASE}/user-types/hierarchy`),
    getUsersByType: (id: string) =>
        axios.get<ApiResponse<any[]>>(`${API_BASE}/user-types/${id}/users`),
    assignBundle: (id: string, bundleId: string) =>
        axios.post<ApiResponse<UserType>>(`${API_BASE}/user-types/${id}/assign-privilege-bundle`, { bundleId }),
    assignViewStyle: (id: string, component: string, styleId: string, overrides?: any) =>
        axios.post<ApiResponse<any>>(`${API_BASE}/user-types/${id}/assign-view-style`, { component, styleId, overrides }),
};

// Privilege Bundles - MATCHES ACTUAL BACKEND
export const privilegeBundleApi = {
    list: () =>
        axios.get<ApiResponse<PrivilegeBundle[]>>(`${API_BASE}/privilege-bundles`),
    getById: (id: string) =>
        axios.get<ApiResponse<PrivilegeBundle>>(`${API_BASE}/privilege-bundles/${id}`),
    create: (data: Partial<PrivilegeBundle>) =>
        axios.post<ApiResponse<PrivilegeBundle>>(`${API_BASE}/privilege-bundles`, data),
    update: (id: string, data: Partial<PrivilegeBundle>) =>
        axios.put<ApiResponse<PrivilegeBundle>>(`${API_BASE}/privilege-bundles/${id}`, data),
    delete: (id: string) =>
        axios.delete<ApiResponse<PrivilegeBundle>>(`${API_BASE}/privilege-bundles/${id}`),
    getAssignedTypes: (id: string) =>
        axios.get<ApiResponse<UserType[]>>(`${API_BASE}/privilege-bundles/${id}/assigned-types`),
};

// View Styles - MATCHES ACTUAL BACKEND
export const viewStyleApi = {
    list: () =>
        axios.get<ApiResponse<ViewStyle[]>>(`${API_BASE}/view-styles`),
    getById: (id: string) =>
        axios.get<ApiResponse<ViewStyle>>(`${API_BASE}/view-styles/${id}`),
    create: (data: Partial<ViewStyle>) =>
        axios.post<ApiResponse<ViewStyle>>(`${API_BASE}/view-styles`, data),
    update: (id: string, data: Partial<ViewStyle>) =>
        axios.put<ApiResponse<ViewStyle>>(`${API_BASE}/view-styles/${id}`, data),
    delete: (id: string) =>
        axios.delete<ApiResponse<ViewStyle>>(`${API_BASE}/view-styles/${id}`),
    clone: (id: string, name: string, code: string) =>
        axios.post<ApiResponse<ViewStyle>>(`${API_BASE}/view-styles/${id}/clone`, { name, code }),
    getPreview: (id: string) =>
        axios.get<ApiResponse<any>>(`${API_BASE}/view-styles/${id}/preview`),
    getDefaults: () =>
        axios.get<ApiResponse<any>>(`${API_BASE}/view-styles/component-defaults`),
};

// Resources - MATCHES ACTUAL BACKEND
export const resourceApi = {
    list: () =>
        axios.get<ApiResponse<ResourceRegistry[]>>(`${API_BASE}/resources`),
    byCategory: () =>
        axios.get<ApiResponse<Record<string, ResourceRegistry[]>>>(`${API_BASE}/resources/by-category`),
    getActions: (name: string) =>
        axios.get<ApiResponse<string[]>>(`${API_BASE}/resources/${name}/actions`),
    search: (query: string) =>
        axios.get<ApiResponse<ResourceRegistry[]>>(`${API_BASE}/resources/search`, { params: { q: query } }),
    validate: (resource: string, action: string) =>
        axios.get<ApiResponse<any>>(`${API_BASE}/resources/validate`, { params: { resource, action } }),
};

// Feature Flags - MATCHES ACTUAL BACKEND
export const featureFlagApi = {
    list: () =>
        axios.get<ApiResponse<FeatureFlag[]>>(`${API_BASE}/feature-flags`),
    create: (data: Partial<FeatureFlag>) =>
        axios.post<ApiResponse<FeatureFlag>>(`${API_BASE}/feature-flags`, data),
    update: (key: string, data: Partial<FeatureFlag>) =>
        axios.put<ApiResponse<FeatureFlag>>(`${API_BASE}/feature-flags/${key}`, data),
    delete: (key: string) =>
        axios.delete<ApiResponse<FeatureFlag>>(`${API_BASE}/feature-flags/${key}`),
    toggleForType: (key: string, userTypeId: string, enabled: boolean) =>
        axios.post<ApiResponse<FeatureFlag>>(`${API_BASE}/feature-flags/${key}/toggle`, { userTypeId, enabled }),
};

// Audit Logs - MATCHES ACTUAL BACKEND  
export const auditLogApi = {
    list: (params?: any) =>
        axios.get<ApiResponse<AuditLog[]> & { pagination: any }>(`${API_BASE}/audit-logs`, { params }),
    getById: (id: string) =>
        axios.get<ApiResponse<AuditLog>>(`${API_BASE}/audit-logs/${id}`),
    recent: (limit?: number) =>
        axios.get<ApiResponse<AuditLog[]>>(`${API_BASE}/audit-logs/recent`, { params: { limit } }),
    forResource: (resourceType: string, resourceId: string) =>
        axios.get<ApiResponse<AuditLog[]>>(`${API_BASE}/audit-logs/resource`, { params: { resourceType, resourceId } }),
    export: (params?: any) =>
        axios.get(`${API_BASE}/audit-logs/export`, { params }),
};
