import React from 'react';
import { useLazyImage } from '@/hooks/useLazyImage';
import { Skeleton } from './Skeleton';

export interface LazyImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Placeholder image for blur-up effect (optional) */
  placeholderSrc?: string;
  /** Fallback image on error */
  fallbackSrc?: string;
  /** Additional container className */
  containerClassName?: string;
  /** Image className */
  className?: string;
  /** Show skeleton while loading */
  showSkeleton?: boolean;
  /** Skeleton variant */
  skeletonVariant?: 'image' | 'rectangular';
  /** Callback when image loads */
  onImageLoad?: () => void;
  /** Callback on error */
  onImageError?: (error: Error) => void;
}

/**
 * Lazy loading image component with blur-up placeholder
 * Uses Intersection Observer to load images only when visible
 * 
 * @example
 * ```tsx
 * <LazyImage
 *   src="https://cdn.example.com/image.jpg"
 *   alt="Product"
 *   placeholderSrc="/blur-placeholder.jpg"
 *   className="w-full h-auto"
 * />
 * ```
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderSrc,
  fallbackSrc = '/images/placeholder.png',
  containerClassName = '',
  showSkeleton = true,
  skeletonVariant = 'image',
  className = '',
  onImageLoad,
  onImageError,
}) => {
  const { ref, isLoaded, isError, currentSrc } = useLazyImage(src, {
    placeholderSrc,
    threshold: 0.01,
    rootMargin: '100px',
    onLoad: onImageLoad,
    onError: onImageError,
  });

  // Determine final image source
  const finalSrc = isError ? fallbackSrc : currentSrc || placeholderSrc || src;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`relative overflow-hidden ${containerClassName}`}
    >
      {/* Skeleton loader */}
      {!isLoaded && showSkeleton && (
        <div className="absolute inset-0">
          <Skeleton
            variant={skeletonVariant}
            className="w-full h-full"
            animation="wave"
          />
        </div>
      )}

      {/* Actual image */}
      <img
        src={finalSrc}
        alt={alt}
        className={`
          transition-all duration-300
          ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}
          ${className}
        `}
        loading="lazy" // Native lazy loading as fallback
      />

      {/* Error indicator */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Optimized lazy image for Cloudinary with automatic format and quality
 */
export interface CloudinaryLazyImageProps extends LazyImageProps {
  /** Cloudinary public ID or full URL */
  cloudinaryId?: string;
  /** Image width for responsive loading */
  width?: number;
  /** Image height for responsive loading */
  height?: number;
  /** Image quality (1-100) */
  quality?: number;
  /** Enable automatic format (WebP/AVIF) */
  autoFormat?: boolean;
}

export const CloudinaryLazyImage: React.FC<CloudinaryLazyImageProps> = ({
  src,
  cloudinaryId,
  width,
  height,
  quality = 80,
  autoFormat = true,
  ...props
}) => {
  // Extract Cloudinary transformations from src or build from cloudinaryId
  const getOptimizedSrc = () => {
    if (cloudinaryId) {
      // Build Cloudinary URL with transformations
      const transformations = [
        autoFormat ? 'f_auto' : '',
        quality ? `q_${quality}` : '',
        width ? `w_${width}` : '',
        height ? `h_${height}` : '',
        'c_limit', // Don't upscale
      ].filter(Boolean).join(',');

      return src.replace('/upload/', `/upload/${transformations}/`);
    }

    // If src already has transformations or isn't Cloudinary, use as-is
    return src;
  };

  // Generate small placeholder for blur-up
  const getPlaceholderSrc = () => {
    if (!cloudinaryId || !src.includes('cloudinary.com')) return props.placeholderSrc;

    // Create very small blurred version for placeholder
    const placeholderTransform = 'w_50,h_50,q_10,e_blur:500,f_auto';
    return src.replace('/upload/', `/upload/${placeholderTransform}/`);
  };

  return (
    <LazyImage
      {...props}
      src={getOptimizedSrc()}
      placeholderSrc={getPlaceholderSrc()}
    />
  );
};
