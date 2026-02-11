import { API_BASE_URL_WITH_API } from './apiConfig';
import type {
    Service,
    CreateServiceData,
    UpdateServiceData,
    ServiceOrderUpdate
} from '../types/serviceTypes';

// Get all services
export const fetchServices = async (activeOnly: boolean = false, showAllTitles: boolean = false): Promise<Service[]> => {
    try {
        const params = new URLSearchParams();
        if (activeOnly) params.append('activeOnly', 'true');
        if (showAllTitles) params.append('showAllTitles', 'true');

        const queryString = params.toString();
        const url = `${API_BASE_URL_WITH_API}/services${queryString ? `?${queryString}` : ''}`;

        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch services');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching services:', error);
        throw error;
    }
};

// Get single service by ID
export const fetchServiceById = async (id: string, showAllTitles: boolean = false): Promise<Service> => {
    try {
        const url = `${API_BASE_URL_WITH_API}/services/${id}${showAllTitles ? '?showAllTitles=true' : ''}`;

        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error('Failed to fetch service');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching service:', error);
        throw error;
    }
};

// Create new service (admin only)
export const createService = async (data: CreateServiceData): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create service');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error creating service:', error);
        throw error;
    }
};

// Update service (admin only)
export const updateService = async (id: string, data: UpdateServiceData): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update service');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error updating service:', error);
        throw error;
    }
};

// Delete service (admin only)
export const deleteService = async (id: string): Promise<void> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete service');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        throw error;
    }
};

// Reorder services (admin only)
export const reorderServices = async (orders: ServiceOrderUpdate[]): Promise<Service[]> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/reorder`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orders })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reorder services');
        }

        const result = await response.json();
        return result.services;
    } catch (error) {
        console.error('Error reordering services:', error);
        throw error;
    }
};

// Upload banner image (admin only)
export const uploadServiceBanner = async (id: string, file: File): Promise<string> => {
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('bannerImage', file);

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${id}/banner`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload banner image');
        }

        const result = await response.json();
        return result.bannerImage;
    } catch (error) {
        console.error('Error uploading banner image:', error);
        throw error;
    }
};

// Toggle service active status (admin only)
export const toggleServiceStatus = async (id: string): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${id}/toggle-status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to toggle service status');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error toggling service status:', error);
        throw error;
    }
};

// Upload multiple banners (admin only)
export const uploadServiceBanners = async (id: string, files: File[]): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();

        files.forEach((file) => {
            formData.append('banners', file);
        });

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${id}/banners`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload banners');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error uploading banners:', error);
        throw error;
    }
};

// Delete individual banner (admin only)
export const deleteServiceBanner = async (serviceId: string, bannerId: string): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${serviceId}/banners/${bannerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete banner');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error deleting banner:', error);
        throw error;
    }
};

// Reorder banners (admin only)
export const reorderServiceBanners = async (
    serviceId: string,
    bannerOrders: { bannerId: string; sortOrder: number }[]
): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${serviceId}/banners/reorder`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bannerOrders })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to reorder banners');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error reordering banners:', error);
        throw error;
    }
};

// Update auto-slide duration (admin only)
export const updateAutoSlideDuration = async (serviceId: string, duration: number): Promise<Service> => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${serviceId}/auto-slide-duration`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ duration })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update auto-slide duration');
        }

        const result = await response.json();
        return result.service;
    } catch (error) {
        console.error('Error updating auto-slide duration:', error);
        throw error;
    }
};

