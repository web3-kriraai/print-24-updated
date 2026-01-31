import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '../lib/apiConfig';

/**
 * Custom hook to resolve matrix images based on selected attributes
 * 
 * Optimizations:
 * - Debounced API calls to prevent excessive requests
 * - Caching of resolved images
 * - Loading state management
 */

interface MatrixImageResult {
    imageUrl: string | null;
    thumbnailUrl?: string | null;
    isLoading: boolean;
    error: string | null;
}

interface UseMatrixImageOptions {
    debounceMs?: number; // Default: 300ms
    enabled?: boolean;   // Can disable hook when not needed
}

const imageCache = new Map<string, { imageUrl: string | null; thumbnailUrl: string | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch matrix-resolved product image based on current attribute selections
 * 
 * @param productId - The product ID
 * @param attributeSelections - Object mapping attributeId -> selectedValue
 * @param options - Configuration options
 */
export function useMatrixImage(
    productId: string | undefined,
    attributeSelections: Record<string, string | number | boolean | File | any[] | null>,
    options: UseMatrixImageOptions = {}
): MatrixImageResult {
    const { debounceMs = 300, enabled = true } = options;

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Build cache key from selections
    const buildCacheKey = useCallback((prodId: string, selections: Record<string, any>) => {
        // Only include string values (the actual attribute selections)
        const validSelections: Record<string, string> = {};
        for (const [key, val] of Object.entries(selections)) {
            // Skip File objects, arrays, null values, empty strings
            if (
                val !== null &&
                val !== undefined &&
                val !== '' &&
                typeof val === 'string' &&
                !key.includes('_images') // Skip image arrays
            ) {
                validSelections[key] = val;
            }
        }

        // Sort keys for consistent cache key
        const sortedKeys = Object.keys(validSelections).sort();
        const keyParts = sortedKeys.map(k => `${k}:${validSelections[k]}`);
        return `${prodId}|${keyParts.join('|')}`;
    }, []);

    // Resolve image from API
    const resolveImage = useCallback(async () => {
        if (!productId || !enabled) {
            setImageUrl(null);
            setThumbnailUrl(null);
            return;
        }

        // Build query params from selections
        const queryParams = new URLSearchParams();
        let hasValidSelections = false;

        for (const [key, val] of Object.entries(attributeSelections)) {
            if (
                val !== null &&
                val !== undefined &&
                val !== '' &&
                typeof val === 'string' &&
                !key.includes('_images')
            ) {
                queryParams.append(key, val);
                hasValidSelections = true;
            }
        }

        // No valid selections, return null
        if (!hasValidSelections) {
            setImageUrl(null);
            setThumbnailUrl(null);
            return;
        }

        // Check cache
        const cacheKey = buildCacheKey(productId, attributeSelections);
        const cached = imageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setImageUrl(cached.imageUrl);
            setThumbnailUrl(cached.thumbnailUrl);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE_URL}/products/${productId}/image-matrix/resolve?${queryParams.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to resolve matrix image');
            }

            const data = await response.json();

            // Cache the result
            imageCache.set(cacheKey, {
                imageUrl: data.imageUrl || null,
                thumbnailUrl: data.thumbnailUrl || null,
                timestamp: Date.now()
            });

            setImageUrl(data.imageUrl || null);
            setThumbnailUrl(data.thumbnailUrl || null);
        } catch (err: any) {
            setError(err.message);
            setImageUrl(null);
            setThumbnailUrl(null);
        } finally {
            setIsLoading(false);
        }
    }, [productId, attributeSelections, enabled, buildCacheKey]);

    // Debounced effect
    useEffect(() => {
        if (!enabled) return;

        const timeoutId = setTimeout(resolveImage, debounceMs);
        return () => clearTimeout(timeoutId);
    }, [resolveImage, debounceMs, enabled]);

    return {
        imageUrl,
        thumbnailUrl,
        isLoading,
        error
    };
}

/**
 * Clear the matrix image cache (useful on admin updates)
 */
export function clearMatrixImageCache() {
    imageCache.clear();
}

export default useMatrixImage;
