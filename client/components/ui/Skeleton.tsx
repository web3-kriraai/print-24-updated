import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'image' | 'card';
  width?: string;
  height?: string;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton loader component using Tailwind CSS
 * Provides smooth loading states with multiple variants
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  animation = 'pulse',
}) => {
  // Base classes for all skeletons
  const baseClasses = 'bg-gray-200 relative overflow-hidden';

  // Animation classes
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent',
    none: '',
  };

  // Variant-specific classes
  const variantClasses = {
    text: `h-4 ${width || 'w-full'}`,
    circular: `rounded-full ${width || 'w-10'} ${height || 'h-10'}`,
    rectangular: `rounded ${width || 'w-full'} ${height || 'h-full'}`,
    image: `rounded-lg ${width || 'w-full'} ${height || 'h-48'}`,
    card: `rounded-lg ${width || 'w-full'} ${height || 'h-32'}`,
  };

  return (
    <div
      className={`
        ${baseClasses}
        ${animationClasses[animation]}
        ${variantClasses[variant]}
        ${className}
      `}
      role="status"
      aria-label="Loading..."
      style={{ width, height }}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Pre-defined skeleton layouts for common use cases
 */
export const ProductImageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Skeleton variant="image" height="600px" className={className} />
);

export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    <Skeleton variant="image" height="200px" />
    <Skeleton variant="text" className="w-4/5" />
    <Skeleton variant="text" className="w-3/5 h-3" />
    <Skeleton variant="rectangular" height="40px" className="w-2/5" />
  </div>
);

export const AttributeCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    <Skeleton variant="text" className="w-1/2 h-3" />
    <Skeleton variant="rectangular" height="40px" />
  </div>
);

export const ProductDetailSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
    {/* Left: Image */}
    <div className="space-y-4">
      <ProductImageSkeleton />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="image" height="80px" />
        ))}
      </div>
    </div>

    {/* Right: Details */}
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-3/4" />
        <Skeleton variant="text" className="w-11/12" />
        <Skeleton variant="text" className="w-4/5" />
      </div>

      {/* Price */}
      <Skeleton variant="card" height="80px" />

      {/* Attributes */}
      <div className="space-y-4">
        <AttributeCardSkeleton />
        <AttributeCardSkeleton />
        <AttributeCardSkeleton />
      </div>

      {/* Action Button */}
      <Skeleton variant="rectangular" height="48px" />
    </div>
  </div>
);
