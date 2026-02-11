import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchServiceById } from '../lib/serviceApi';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';
import type { Service } from '../types/serviceTypes';
import CustomerReviews from './CustomerReviews';

interface ServiceProductsProps {
    service: Service;
}

// Helper function to get number of visible items based on screen width
const getVisibleItems = (screenWidth: number): number => {
    if (screenWidth >= 1536) return 9; // 2xl: 9 items
    if (screenWidth >= 1280) return 8; // xl: 8 items
    if (screenWidth >= 1024) return 6; // lg: 6 items
    if (screenWidth >= 768) return 5; // md: 5 items
    if (screenWidth >= 640) return 4; // sm: 4 items
    return 3; // mobile: 3 items
};

const ServiceProducts: React.FC<ServiceProductsProps> = ({ service }) => {
    const [serviceData, setServiceData] = useState<Service | null>(service);
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [visibleItems, setVisibleItems] = useState<number>(getVisibleItems(window.innerWidth));
    const [scrollStates, setScrollStates] = useState<{ [key: string]: { isAtStart: boolean; isAtEnd: boolean } }>({});

    useEffect(() => {
        const loadServiceWithItems = async () => {
            try {
                setLoading(true);
                // Fetch service with populated items
                const data = await fetchServiceById(service._id);
                setServiceData(data);
            } catch (error) {
                console.error('Failed to load service details:', error);
                setServiceData(service); // Fallback to prop data
            } finally {
                setLoading(false);
            }
        };

        loadServiceWithItems();
    }, [service._id]);

    // Load reviews for this service
    useEffect(() => {
        const loadReviews = async () => {
            try {
                setLoadingReviews(true);
                const response = await fetch(`${API_BASE_URL_WITH_API}/reviews/service/${service._id}`);
                if (response.ok) {
                    const data = await response.json();
                    setReviews(data);
                }
            } catch (error) {
                console.error('Failed to load reviews:', error);
            } finally {
                setLoadingReviews(false);
            }
        };

        loadReviews();
    }, [service._id]);

    // Function to check scroll position
    const checkScrollPosition = (containerId: string) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const isAtStart = scrollLeft <= 0;
        const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 1;

        setScrollStates(prev => ({
            ...prev,
            [containerId]: { isAtStart, isAtEnd }
        }));
    };

    // Update visible items on resize
    useEffect(() => {
        const handleResize = () => {
            setVisibleItems(getVisibleItems(window.innerWidth));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getItemLink = (item: any): string => {
        if (!item.data) return '#';

        // Provide fallback IDs to prevent crashes if data is missing
        const categoryId = item.data.category || 'uncategorized';

        switch (item.type) {
            case 'product':
                // Check if product has a subcategory
                if (item.data.subcategory) {
                    return `/home/allservices/${categoryId}/${item.data.subcategory}/${item.id}`;
                }
                return `/home/allservices/${categoryId}/${item.id}`;
            case 'category':
                return `/home/allservices/${item.id}`;
            case 'subcategory':
                // For subcategories, we need the parent category ID
                return `/home/allservices/${categoryId}/${item.id}`;
            default:
                return '#';
        }
    };

    const getItemImage = (item: any): string => {
        if (item.data?.image) {
            return item.data.image;
        }
        return '/images/products/placeholder.jpg';
    };

    if (loading || !serviceData) {
        return (
            <div className="w-full bg-white py-12 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Sort titles by sortOrder
    const sortedTitles = [...(serviceData.titles || [])].sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <div className="w-full bg-white py-12">
            <div className="max-w-[1920px] mx-auto px-2 sm:px-3 lg:px-4">

                {/* Titles and Items */}
                {sortedTitles.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No content available for this service yet.</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={serviceData._id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                        >
                            {sortedTitles.map((title, index) => {
                                // Sort items by sortOrder
                                const sortedItems = [...(title.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);

                                return (
                                    <div key={title._id || index} className="max-w-[1440px] mx-auto mb-16 last:mb-0">
                                        {/* Title Header - Admin controlled sections */}
                                        {title.title && (
                                            <div className="mb-12 flex flex-col items-center text-center">
                                                <h2
                                                    className="text-3xl md:text-4xl font-bold uppercase mb-4"
                                                    style={{ color: serviceData.color }}
                                                >
                                                    {title.title}
                                                </h2>
                                            </div>
                                        )}

                                        {/* Items Carousel/Grid */}
                                        {sortedItems.length > 0 ? (
                                            <div className="relative group/slider">
                                                {/* Left Arrow - Only show if items overflow and NOT at start */}
                                                {sortedItems.length > visibleItems && !scrollStates[`items-scroll-${title._id || index}`]?.isAtStart && (
                                                    <button
                                                        onClick={() => {
                                                            const containerId = `items-scroll-${title._id || index}`;
                                                            const container = document.getElementById(containerId);
                                                            if (container) {
                                                                const firstItem = container.querySelector('.carousel-item');
                                                                if (firstItem) {
                                                                    const itemWidth = firstItem.getBoundingClientRect().width;
                                                                    const gap = 16; // gap-4 = 1rem = 16px
                                                                    const scrollAmount = itemWidth + gap;
                                                                    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                                                                }
                                                            }
                                                        }}
                                                        className="absolute left-2 sm:left-3 md:left-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-gray-900 hover:text-gray-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                                                        style={{ top: 'calc(50% - 1rem)' }}
                                                    >
                                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                                                    </button>
                                                )}

                                                {/* Right Arrow - Only show if items overflow and NOT at end */}
                                                {sortedItems.length > visibleItems && !scrollStates[`items-scroll-${title._id || index}`]?.isAtEnd && (
                                                    <button
                                                        onClick={() => {
                                                            const containerId = `items-scroll-${title._id || index}`;
                                                            const container = document.getElementById(containerId);
                                                            if (container) {
                                                                const firstItem = container.querySelector('.carousel-item');
                                                                if (firstItem) {
                                                                    const itemWidth = firstItem.getBoundingClientRect().width;
                                                                    const gap = 16; // gap-4 = 1rem = 16px
                                                                    const scrollAmount = itemWidth + gap;
                                                                    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                                                                }
                                                            }
                                                        }}
                                                        className="absolute right-2 sm:right-3 md:right-4 z-10 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/95 hover:bg-white active:bg-white shadow-md sm:shadow-lg rounded-full flex items-center justify-center text-gray-900 hover:text-gray-600 active:scale-95 transition-all opacity-100 sm:opacity-0 sm:group-hover/slider:opacity-100 touch-manipulation"
                                                        style={{ top: 'calc(50% - 1rem)' }}
                                                    >
                                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                                                    </button>
                                                )}

                                                <div
                                                    id={`items-scroll-${title._id || index}`}
                                                    onScroll={() => checkScrollPosition(`items-scroll-${title._id || index}`)}
                                                    className="flex overflow-x-auto overflow-y-hidden pb-2 sm:pb-3 md:pb-4 snap-x snap-mandatory scroll-smooth touch-pan-x gap-4 max-w-[1440px] mx-auto"
                                                    style={{
                                                        scrollbarWidth: 'none',
                                                        msOverflowStyle: 'none',
                                                        scrollBehavior: 'smooth'
                                                    }}
                                                >
                                                    {sortedItems.map((item, itemIndex) => {
                                                        const itemData = item.data;
                                                        const itemName = itemData?.name || `${item.type} ${item.id}`;
                                                        const itemImage = getItemImage(item);
                                                        const itemLink = getItemLink(item);

                                                        return (
                                                            <motion.div
                                                                key={itemIndex}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: itemIndex * 0.03 }}
                                                                className="carousel-item flex-shrink-0 snap-start transition-all duration-500 ease-in-out"
                                                                style={{
                                                                    width: `calc(${100 / visibleItems}% - ${((visibleItems - 1) * 16) / visibleItems}px)`
                                                                }}
                                                            >
                                                                <Link
                                                                    to={itemLink}
                                                                    state={{ fromHome: true }}
                                                                    className="group flex flex-col items-center text-center"
                                                                >
                                                                    <div className="relative mb-2 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-full overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-4 border-white ring-1 ring-gray-100">
                                                                        {/* Image Container */}
                                                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                                            {itemImage && !itemImage.includes('placeholder') ? (
                                                                                <img
                                                                                    src={itemImage}
                                                                                    alt={itemName}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <span className="text-xs p-2">{itemName}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <h4
                                                                        className="text-xs sm:text-sm font-bold text-gray-800 uppercase group-hover:transition-colors line-clamp-2 max-w-[80px] sm:max-w-[100px] md:max-w-[120px]"
                                                                        style={{
                                                                            color: 'inherit',
                                                                            transition: 'color 0.3s'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.color = serviceData.color}
                                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                                                                    >
                                                                        {itemName}
                                                                    </h4>
                                                                </Link>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-500 italic">
                                                No items available in this section.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence >
                )}

            </div >

            {/* Service-Specific Reviews */}
            {
                !loadingReviews && reviews.length > 0 && (
                    <div className="mt-16">
                        <CustomerReviews reviews={reviews} serviceId={service._id} limit={6} />
                    </div>
                )
            }
        </div >
    );
};

export default ServiceProducts;
