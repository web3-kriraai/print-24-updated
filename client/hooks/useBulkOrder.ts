import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Hook to check if user has bulk order upload permission
 * @returns {{hasPermission: boolean, config: object|null, loading: boolean, error: string|null}}
 */
export const useBulkOrderPermission = () => {
    const [hasPermission, setHasPermission] = useState(false);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get auth token
            const token = localStorage.getItem('token');

            if (!token) {
                setHasPermission(false);
                setLoading(false);
                return;
            }

            // Check feature permission
            const response = await axios.get('/api/user/check-feature', {
                params: { feature: 'bulk_order_upload' },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setHasPermission(response.data.hasFeature);
                setConfig(response.data.config);
            } else {
                setHasPermission(false);
                setConfig(null);
            }
        } catch (err) {
            console.error('Error checking bulk order permission:', err);
            setError(err.response?.data?.message || 'Failed to check permissions');
            setHasPermission(false);
            setConfig(null);
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
    const [uploadStatus, setUploadStatus] = useState(null);

    const uploadBulkOrder = async (formData) => {
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
        } catch (err) {
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
export const useBulkOrderStatus = (bulkOrderId, enabled = false) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled || !bulkOrderId) return;

        let isMounted = true;
        let intervalId;

        const fetchStatus = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');

                const response = await axios.get(`/api/bulk-orders/${bulkOrderId}/status`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (isMounted && response.data.success) {
                    setStatus(response.data.data);

                    // Stop polling if processing is complete or failed
                    if (['ORDER_CREATED', 'FAILED', 'CANCELLED'].includes(response.data.data.status)) {
                        if (intervalId) {
                            clearInterval(intervalId);
                        }
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.response?.data?.message || 'Failed to fetch status');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        // Initial fetch
        fetchStatus();

        // Poll every 3 seconds
        intervalId = setInterval(fetchStatus, 3000);

        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [bulkOrderId, enabled]);

    return { status, loading, error };
};

/**
 * Hook to fetch user's bulk orders
 * @param {object} options - Query options (limit, skip, status)
 * @returns {{bulkOrders: array, loading: boolean, error: string|null, refetch: function}}
 */
export const useBulkOrders = (options = {}) => {
    const [bulkOrders, setBulkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
        } catch (err) {
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
