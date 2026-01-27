/**
 * Courier API Module
 * 
 * Re-exports courier service functionality for components
 * that need shipping estimate and tracking features.
 */

import { courierService, CourierServiceability, TrackingInfo } from '../src/services/courierService';

// Re-export types
export type { CourierServiceability, TrackingInfo };

// Re-export service methods
export const checkServiceability = courierService.checkServiceability;
export const selectBestCourier = courierService.selectBestCourier;
export const getTracking = courierService.getTracking;
export const getTrackingByOrder = courierService.getTrackingByOrder;

// Default export
export default courierService;
