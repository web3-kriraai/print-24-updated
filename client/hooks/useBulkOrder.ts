import { useState, useEffect } from 'react';
import axios from 'axios';

const DEFAULT_BULK_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB fallback

/**
 * Hook to check if user has bulk order upload permission.
 * Reads the `bulk_upload` feature from the user's segment configuration.
 * Admin sets maxFileSizeMB on the segment's features in the admin panel.
 *
 * @returns {{hasPermission: boolean, config: object|null, loading: boolean, error: string|null}}
 */
export const useBulkOrderPermission = () => {
    const [hasPermission, setHasPermission] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                setHasPermission(false);
                setConfig(null);
                return;
            }

            // Fetch user context which includes segment features
            const response = await axios.get('/api/user/context', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.data?.success) {
                const segmentFeatures: any[] = response.data.segment?.features || [];

                // Find the bulk_upload feature for this segment
                const bulkFeature = segmentFeatures.find(
                    (f: any) => f.featureKey === 'bulk_upload'
                );

                const isEnabled = bulkFeature ? bulkFeature.isEnabled : true; // default: allow
                const featureConfig = bulkFeature?.config || {};

                // maxFileSizeMB set by admin, fallback to 10MB (Cloudinary free limit)
                const maxFileSizeMB = featureConfig.maxFileSizeMB || 10;
                const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

                setHasPermission(isEnabled);
                setConfig({
                    maxDesigns: featureConfig.maxDesigns || 50,
                    maxFileSizeMB,
                    maxFileSize: maxFileSizeBytes, // in bytes for direct comparison
                    maxTotalCopies: featureConfig.maxTotalCopies || 100000,
                    // Pass through any other admin-defined config
                    ...featureConfig,
                });
            } else {
                // API failed gracefully — allow but with default limits
                setHasPermission(true);
                setConfig({
                    maxDesigns: 50,
                    maxFileSizeMB: 10,
                    maxFileSize: DEFAULT_BULK_MAX_FILE_SIZE_BYTES,
                    maxTotalCopies: 100000,
                });
            }
        } catch (err: any) {
            console.error('Error checking bulk order permission:', err);
            setError(err.message || 'Failed to check permissions');
            // On error, still allow with default limits
            setHasPermission(true);
            setConfig({
                maxDesigns: 50,
                maxFileSizeMB: 10,
                maxFileSize: DEFAULT_BULK_MAX_FILE_SIZE_BYTES,
                maxTotalCopies: 100000,
            });
        } finally {
            setLoading(false);
        }
    };

    return { hasPermission, config, loading, error, refetch: checkPermission };
};

/**
 * Hook to upload and track bulk order
 * @returns {{uploadBulkOrder: function, uploadStatus: object, uploading: boolean}}
 */
export const useBulkOrderUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<any>(null);

    const uploadBulkOrder = async (formData: FormData) => {
        try {
            setUploading(true);
            setUploadStatus(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await axios.post('/api/bulk-orders/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setUploadStatus({
                    success: true,
                    bulkOrderId: response.data.data.bulkOrderId,
                    orderNumber: response.data.data.orderNumber,
                    message: response.data.message,
                });
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Upload failed');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
            setUploadStatus({
                success: false,
                error: errorMessage,
            });
            throw new Error(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    return { uploadBulkOrder, uploadStatus, uploading };
};

/**
 * Hook to poll bulk order status
 * @param {string} bulkOrderId - Bulk order ID
 * @param {boolean} enabled - Whether to start polling
 * @returns {{status: object, loading: boolean, error: string|null}}
 */
export const useBulkOrderStatus = (bulkOrderId: string, enabled = false) => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = async () => {
        if (!bulkOrderId) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.get(`/api/bulk-orders/${bulkOrderId}/status`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setStatus(response.data.data);
                return response.data.data;
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled || !bulkOrderId) return;

        let intervalId: any;

        const poll = async () => {
            const data = await fetchStatus();
            if (data && ['ORDER_CREATED', 'FAILED', 'CANCELLED'].includes(data.status)) {
                if (intervalId) clearInterval(intervalId);
            }
        };

        // Initial fetch
        poll();

        // Poll every 5 seconds
        intervalId = setInterval(poll, 5000);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [bulkOrderId, enabled]);

    return { status, loading, error, refetch: fetchStatus };
};

/**
 * Hook to fetch user's bulk orders
 * @param {object} options - Query options (limit, skip, status)
 * @returns {{bulkOrders: array, loading: boolean, error: string|null, refetch: function}}
 */
export const useBulkOrders = (options = {}) => {
    const [bulkOrders, setBulkOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBulkOrders = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await axios.get('/api/bulk-orders', {
                params: options,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setBulkOrders(response.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch bulk orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBulkOrders();
    }, [JSON.stringify(options)]);

    return { bulkOrders, loading, error, refetch: fetchBulkOrders };
};

export default {
    useBulkOrderPermission,
    useBulkOrderUpload,
    useBulkOrderStatus,
    useBulkOrders,
};
