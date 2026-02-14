import React from 'react';

interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular';
    className?: string;
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    variant = 'rectangular',
    className = '',
    width,
    height
}) => {
    const baseClasses = 'animate-pulse bg-gray-300';

    const variantClasses = {
        text: 'rounded h-4',
        circular: 'rounded-full',
        rectangular: 'rounded'
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};
