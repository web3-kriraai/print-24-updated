import { useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE_URL_WITH_API as API_BASE_URL } from '@/lib/apiConfig';

/**
 * useProductConfigurator Hook
 * 
 * Provides O(1) image resolution for the visual configurator.
 * Handles preloading of adjacent combinations for instant feedback.
 * 
 * Usage:
 * const { configuratorImage, isLoading, updateSelections } = useProductConfigurator(product);
 * 
 * When user changes an attribute:
 * updateSelections({ ...currentSelections, material: 'leather' });
 */

interface ConfiguratorSettings {
    isConfiguratorEnabled: boolean;
    configuratorAttributes?: any[];
    attributeOrder?: string[];
    defaultConfiguratorImage?: string;
    enablePreloading?: boolean;
}

interface Product {
    _id: string;
    image: string;
    configuratorSettings?: ConfiguratorSettings;
}

interface UseProductConfiguratorResult {
    configuratorImage: string;
    isLoading: boolean;
    isFallback: boolean;
    error: string | null;
    updateSelections: (selections: Record<string, string>) => void;
    preloadedCount: number;
}

export default function useProductConfigurator(
    product: Product | null
): UseProductConfiguratorResult {
    const [configuratorImage, setConfiguratorImage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFallback, setIsFallback] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preloadedCount, setPreloadedCount] = useState(0);

    // Cache for preloaded images
    const imageCache = useRef<Map<string, string>>(new Map());
    const preloadQueue = useRef<Set<string>>(new Set());

    // Set default image when product changes
    useEffect(() => {
        if (product) {
            const defaultImage =
                product.configuratorSettings?.defaultConfiguratorImage || product.image;
            setConfiguratorImage(defaultImage);
            setIsFallback(true);

            // Clear cache when product changes
            imageCache.current.clear();
            preloadQueue.current.clear();
            setPreloadedCount(0);
        }
    }, [product?._id]);

    /**
     * Resolve image for current selections
     */
    const resolveImage = useCallback(
        async (selections: Record<string, string>) => {
            if (!product || !product.configuratorSettings?.isConfiguratorEnabled) {
                return;
            }

            // Generate cache key from selections
            const cacheKey = Object.entries(selections)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}:${v}`)
                .join('|');

            // Check cache first
            if (imageCache.current.has(cacheKey)) {
                const cachedUrl = imageCache.current.get(cacheKey)!;
                setConfiguratorImage(cachedUrl);
                setIsFallback(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const queryParams = new URLSearchParams(selections).toString();
                const response = await fetch(
                    `${API_BASE_URL}/product-configurator/${product._id}/resolve-image?${queryParams}`
                );

                if (!response.ok) {
                    throw new Error('Failed to resolve image');
                }

                const data = await response.json();

                if (data.success) {
                    const imageUrl = data.data.imageUrl;
                    setConfiguratorImage(imageUrl);
                    setIsFallback(data.data.isFallback);

                    // Cache the result
                    if (!data.data.isFallback) {
                        imageCache.current.set(cacheKey, imageUrl);
                    }
                }
            } catch (err: any) {
                console.error('Configurator resolve error:', err);
                setError(err.message);
                // Fall back to default
                setConfiguratorImage(
                    product.configuratorSettings?.defaultConfiguratorImage || product.image
                );
                setIsFallback(true);
            } finally {
                setIsLoading(false);
            }
        },
        [product]
    );

    /**
     * Preload adjacent images for faster UX
     */
    const preloadAdjacent = useCallback(
        async (currentSelections: Record<string, string>) => {
            if (
                !product ||
                !product.configuratorSettings?.isConfiguratorEnabled ||
                !product.configuratorSettings?.enablePreloading
            ) {
                return;
            }

            try {
                const queryParams = new URLSearchParams(currentSelections).toString();
                const response = await fetch(
                    `${API_BASE_URL}/product-configurator/${product._id}/preload-urls?${queryParams}`
                );

                if (!response.ok) return;

                const data = await response.json();

                if (data.success && data.data.urls) {
                    let loaded = 0;

                    for (const item of data.data.urls) {
                        // Skip if already preloading
                        if (preloadQueue.current.has(item.hash)) continue;
                        preloadQueue.current.add(item.hash);

                        // Preload image
                        const img = new Image();
                        img.onload = () => {
                            // Cache the hash -> URL mapping
                            const cacheKey = item.hash;
                            imageCache.current.set(cacheKey, item.url);
                            loaded++;
                            setPreloadedCount(imageCache.current.size);
                        };
                        img.onerror = () => {
                            preloadQueue.current.delete(item.hash);
                        };
                        img.src = item.url;
                    }
                }
            } catch (err) {
                console.warn('Preload failed:', err);
            }
        },
        [product]
    );

    /**
     * Update selections and trigger image resolution
     */
    const updateSelections = useCallback(
        (selections: Record<string, string>) => {
            // Filter out empty selections
            const filtered = Object.fromEntries(
                Object.entries(selections).filter(([, v]) => v && v !== '')
            );

            if (Object.keys(filtered).length === 0) {
                // No selections, use default
                setConfiguratorImage(
                    product?.configuratorSettings?.defaultConfiguratorImage || product?.image || ''
                );
                setIsFallback(true);
                return;
            }

            // Resolve image for current selections
            resolveImage(filtered);

            // Start preloading adjacent images
            preloadAdjacent(filtered);
        },
        [resolveImage, preloadAdjacent, product]
    );

    return {
        configuratorImage,
        isLoading,
        isFallback,
        error,
        updateSelections,
        preloadedCount,
    };
}

/**
 * Preload a single image URL
 */
export function preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Generate selection object from attribute name-value pairs
 */
export function buildSelections(
    attributes: Array<{ systemName?: string; name: string; selectedValue: string }>
): Record<string, string> {
    const selections: Record<string, string> = {};

    for (const attr of attributes) {
        const key =
            attr.systemName ||
            attr.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (attr.selectedValue) {
            selections[key] = attr.selectedValue;
        }
    }

    return selections;
}
