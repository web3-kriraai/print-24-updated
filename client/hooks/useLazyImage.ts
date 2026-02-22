import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseLazyImageOptions {
    /** Intersection observer threshold (0-1) */
    threshold?: number;
    /** Root margin for intersection observer */
    rootMargin?: string;
    /** Placeholder image URL for blur-up effect */
    placeholderSrc?: string;
    /** Callback on successful image load */
    onLoad?: () => void;
    /** Callback on image load error */
    onError?: (error: Error) => void;
}

export interface UseLazyImageReturn {
    /** Ref to attach to the image container */
    ref: React.RefObject<HTMLElement>;
    /** Whether the element is in viewport */
    isInView: boolean;
    /** Whether the image has loaded */
    isLoaded: boolean;
    /** Whether the image failed to load */
    isError: boolean;
    /** Current image source (placeholder or actual) */
    currentSrc: string;
}

/**
 * Custom hook for lazy loading images using Intersection Observer
 * 
 * @example
 * ```tsx
 * const { ref, isLoaded, currentSrc } = useLazyImage({
 *   src: 'https://example.com/image.jpg',
 *   placeholderSrc: 'data:image/jpeg;base64,...'
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     <img src={currentSrc} className={isLoaded ? '' : 'blur'} />
 *   </div>
 * );
 * ```
 */
export const useLazyImage = (
    src: string,
    options: UseLazyImageOptions = {}
): UseLazyImageReturn => {
    const {
        threshold = 0.01,
        rootMargin = '50px',
        placeholderSrc = '',
        onLoad,
        onError,
    } = options;

    const ref = useRef<HTMLElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isError, setIsError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(placeholderSrc);

    // Handle image load
    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        setIsError(false);
        onLoad?.();
    }, [onLoad]);

    // Handle image error
    const handleError = useCallback((error: Error) => {
        setIsError(true);
        setIsLoaded(false);
        onError?.(error);
    }, [onError]);

    // Set up intersection observer
    useEffect(() => {
        if (!ref.current) return;

        // Check if IntersectionObserver is supported
        if (typeof IntersectionObserver === 'undefined') {
            // Fallback: load immediately if not supported
            setIsInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        // Stop observing once in view
                        if (ref.current) {
                            observer.unobserve(ref.current);
                        }
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(ref.current);

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [threshold, rootMargin]);

    // Load image when in view
    useEffect(() => {
        if (!isInView || !src) return;

        const img = new Image();

        img.onload = () => {
            setCurrentSrc(src);
            handleLoad();
        };

        img.onerror = () => {
            const error = new Error(`Failed to load image: ${src}`);
            handleError(error);
            // Keep placeholder on error
            setCurrentSrc(placeholderSrc || src);
        };

        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [isInView, src, placeholderSrc, handleLoad, handleError]);

    return {
        ref,
        isInView,
        isLoaded,
        isError,
        currentSrc,
    };
};
