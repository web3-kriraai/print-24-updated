import { API_BASE_URL_WITH_API } from './apiConfig';
import type {
    Service,
    CreateServiceData,
    UpdateServiceData,
    ServiceOrderUpdate
} from '../types/serviceTypes';

// Get all services
export const fetchServices = async (activeOnly: boolean = false): Promise<Service[]> => {
    try {
        const url = activeOnly
            ? `${API_BASE_URL_WITH_API}/services?activeOnly=true`
            : `${API_BASE_URL_WITH_API}/services`;

        const response = await fetch(url);

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
export const fetchServiceById = async (id: string): Promise<Service> => {
    try {
        const response = await fetch(`${API_BASE_URL_WITH_API}/services/${id}`);

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
