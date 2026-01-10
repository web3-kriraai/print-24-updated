import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchServiceById } from '../lib/serviceApi';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';
import type { Service } from '../types/serviceTypes';
import CustomerReviews from './CustomerReviews';

interface ServiceProductsProps {
    service: Service;
}

const ServiceProducts: React.FC<ServiceProductsProps> = ({ service }) => {
    const [serviceData, setServiceData] = useState<Service | null>(service);
    const [loading, setLoading] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

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

    const getItemLink = (item: any): string => {
        if (!item.data) return '#';

        // Provide fallback IDs to prevent crashes if data is missing
        const categoryId = item.data.category || 'uncategorized';

        switch (item.type) {
            case 'product':
                // Check if product has a subcategory
                if (item.data.subcategory) {
                    return `/services/${categoryId}/${item.data.subcategory}/${item.id}`;
                }
                return `/services/${categoryId}/${item.id}`;
            case 'category':
                return `/services/${item.id}`;
            case 'subcategory':
                // For subcategories, we need the parent category ID
                return `/services/${categoryId}/${item.id}`;
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Main Header */}
                <div className="text-center mb-12">
                    <motion.h2
                        key={serviceData._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl md:text-4xl font-bold uppercase mb-4"
                        style={{ color: serviceData.color }}
                    >
                        {serviceData.serviceHeading || `${serviceData.name} SERVICES`}
                    </motion.h2>
                    <motion.p
                        key={serviceData.description}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-gray-600 text-lg max-w-3xl mx-auto"
                    >
                        {serviceData.serviceDescription || serviceData.description}
                    </motion.p>
                </div>

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

                                // Only show title header if there are multiple titles
                                const shouldShowTitleHeader = sortedTitles.length > 1;

                                return (
                                    <div key={title._id || index} className="mb-16 last:mb-0">

                                        {/* Title Header - Only show when multiple titles exist */}
                                        {shouldShowTitleHeader && (
                                            <div className="mb-8 flex flex-col items-start">
                                                <div
                                                    className="inline-block px-8 py-3 rounded-r-full text-white font-bold text-lg uppercase shadow-md mb-1"
                                                    style={{ backgroundColor: serviceData.color }}
                                                >
                                                    {title.title}
                                                </div>
                                                {title.description && (
                                                    <div className="px-8 py-2 bg-gray-200 text-gray-700 font-medium inline-block rounded-r-full text-sm">
                                                        {title.description}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Items Grid */}
                                        {sortedItems.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 justify-items-center">
                                                {sortedItems.map((item, itemIndex) => {
                                                    const itemData = item.data;
                                                    const itemName = itemData?.name || `${item.type} ${item.id}`;
                                                    const itemImage = getItemImage(item);
                                                    const itemLink = getItemLink(item);

                                                    return (
                                                        <Link
                                                            to={itemLink}
                                                            state={{ fromHome: true }}
                                                            key={itemIndex}
                                                            className="group flex flex-col items-center text-center w-full"
                                                        >
                                                            <div className="relative mb-4 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-4 border-white ring-1 ring-gray-100">
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
                                                                className="text-sm font-bold text-gray-800 uppercase group-hover:transition-colors"
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
                                                    );
                                                })}
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
                    </AnimatePresence>
                )}

            </div>

            {/* Service-Specific Reviews */}
            {!loadingReviews && reviews.length > 0 && (
                <div className="mt-16">
                    <CustomerReviews reviews={reviews} serviceId={service._id} limit={6} />
                </div>
            )}
        </div>
    );
};

export default ServiceProducts;
