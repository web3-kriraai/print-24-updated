import axios from 'axios';
import { API_BASE_URL_WITH_API } from '../../lib/apiConfig';

/**
 * Courier Service
 * Handles interactions with the backend courier endpoints
 */

export interface CourierServiceability {
    available: boolean;
    couriers: Array<{
        courierId: number;
        courierName: string;
        estimatedDays: number;
        rate: number;
        codCharges: number;
        freightCharge: number;
        etd: string;
    }>;
    recommendedCourier?: {
        courierId: number;
        courierName: string;
        estimatedDays: number;
        rate: number;
    };
    message?: string;
    error?: string;
}

export interface TrackingInfo {
    success: boolean;
    currentStatus?: string;
    currentStatusId?: number;
    originCity?: string;
    destinationCity?: string;
    etd?: string;
    courierName?: string;
    awbCode?: string;
    activities?: Array<{
        status: string;
        location: string;
        date: string;
        time?: string;
        srStatus?: string;
        srStatusLabel?: string;
    }>;
}

export const courierService = {
    /**
     * Check if pincode is serviceable
     */
    checkServiceability: async (
        pickupPincode: string,
        deliveryPincode: string,
        weight: number = 0.5,
        paymentMode: 'PREPAID' | 'COD' = 'PREPAID'
    ): Promise<CourierServiceability> => {
        try {
            const response = await axios.post(`${API_BASE_URL_WITH_API}/courier/check-serviceability`, {
                pickupPincode,
                deliveryPincode,
                weight,
                paymentMode
            });
            return response.data;
        } catch (error: any) {
            console.error('Serviceability check failed:', error);
            return {
                available: false,
                couriers: [],
                message: error.response?.data?.error || 'Failed to check serviceability'
            };
        }
    },

    /**
     * Select best courier (smart routing)
     */
    selectBestCourier: async (
        deliveryPincode: string,
        pickupPincode?: string,
        weight: number = 0.5
    ): Promise<any> => {
        try {
            const response = await axios.post(`${API_BASE_URL_WITH_API}/courier/select-best`, {
                deliveryPincode,
                pickupPincode,
                weight
            });
            return response.data;
        } catch (error: any) {
            console.error('Best courier selection failed:', error);
            return { success: false, error: error.response?.data?.error || 'Failed to select courier' };
        }
    },

    /**
     * Create shipment for an order (called after order creation)
     * @param orderId - The order ID to create shipment for
     * @param courierId - Optional specific courier ID
     * @param city - Optional city for shipping
     * @param state - Optional state for shipping
     */
    createShipment: async (
        orderId: string,
        courierId?: number,
        city?: string,
        state?: string
    ): Promise<any> => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE_URL_WITH_API}/courier/create-user-shipment/${orderId}`,
                { courierId, city, state },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data;
        } catch (error: any) {
            console.error('Create shipment failed:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Failed to create shipment'
            };
        }
    },

    /**
     * Get tracking info by AWB
     */
    getTracking: async (awbCode: string): Promise<TrackingInfo> => {
        try {
            const response = await axios.get(`${API_BASE_URL_WITH_API}/courier/tracking/${awbCode}`);
            return response.data;
        } catch (error: any) {
            console.error('Tracking fetch failed:', error);
            return { success: false };
        }
    },

    /**
     * Get tracking by order ID
     */
    getTrackingByOrder: async (orderId: string): Promise<TrackingInfo> => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL_WITH_API}/courier/tracking/order/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            console.error('Tracking fetch failed:', error);
            return { success: false };
        }
    }
};

export default courierService;
