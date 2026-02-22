import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '../types/serviceTypes';

interface ServiceBannerCarouselProps {
    banners: Banner[];
    autoSlideDuration?: number;
    fallbackImage?: string;
    className?: string;
}

const ServiceBannerCarousel: React.FC<ServiceBannerCarouselProps> = ({
    banners,
    autoSlideDuration = 5000,
    fallbackImage,
    className = ''
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Filter out invalid banners and use fallback if no banners
    const validBanners = banners?.filter(b => b.imageUrl) || [];
    const displayBanners = validBanners.length > 0
        ? validBanners
        : (fallbackImage ? [{ imageUrl: fallbackImage, sortOrder: 0, altText: 'Service banner' }] : []);

    const totalBanners = displayBanners.length;
    const hasMultipleBanners = totalBanners > 1;

    // Navigate to next slide
    const nextSlide = useCallback(() => {
        if (!hasMultipleBanners) return;
        setCurrentIndex((prev) => (prev + 1) % totalBanners);
    }, [hasMultipleBanners, totalBanners]);

    // Navigate to previous slide
    const prevSlide = useCallback(() => {
        if (!hasMultipleBanners) return;
        setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
    }, [hasMultipleBanners, totalBanners]);

    // Go to specific slide
    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    // Auto-slide effect
    useEffect(() => {
        if (!hasMultipleBanners || isPaused) return;

        const interval = setInterval(() => {
            nextSlide();
        }, autoSlideDuration);

        return () => clearInterval(interval);
    }, [hasMultipleBanners, isPaused, autoSlideDuration, nextSlide]);

    // Keyboard navigation
    useEffect(() => {
        if (!hasMultipleBanners) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasMultipleBanners, nextSlide, prevSlide]);

    if (displayBanners.length === 0) {
        return null;
    }

    return (
        <div
            className={`relative w-full h-full overflow-hidden group ${className}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            {/* Banner Images */}
            <div className="relative w-full h-full">
                {displayBanners.map((banner, index) => (
                    <div
                        key={banner._id || index}
                        className={`absolute inset-0 transition-opacity duration-500 ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <img
                            src={banner.imageUrl}
                            alt={banner.altText || `Banner ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                        />
                    </div>
                ))}
            </div>

            {/* Navigation Arrows (only show if multiple banners) */}
            {hasMultipleBanners && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                        aria-label="Previous banner"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                        aria-label="Next banner"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Pagination Dots (only show if multiple banners) */}
            {hasMultipleBanners && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {displayBanners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`transition-all duration-300 rounded-full ${index === currentIndex
                                    ? 'w-8 h-2 bg-white'
                                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                                }`}
                            aria-label={`Go to banner ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Slide Counter */}
            {hasMultipleBanners && (
                <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full z-10">
                    {currentIndex + 1} / {totalBanners}
                </div>
            )}
        </div>
    );
};

export default ServiceBannerCarousel;
