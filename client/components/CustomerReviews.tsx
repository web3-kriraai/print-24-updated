import React from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle } from 'lucide-react';
import ReviewSlider from './ReviewSlider';

interface Review {
    _id: string;
    user?: {
        _id: string;
        name: string;
        email: string;
    };
    userName: string;
    rating: number;
    comment: string;
    service?: {
        _id: string;
        name: string;
        color: string;
    };
    displayOrder: number;
    isVisible: boolean;
    isFeatured: boolean;
    placement: 'global' | 'service-specific' | 'both';
    createdAt: string;
    updatedAt: string;
}

interface CustomerReviewsProps {
    reviews: Review[];
    serviceId?: string;
    limit?: number;
}

const CustomerReviews: React.FC<CustomerReviewsProps> = ({ reviews, serviceId, limit }) => {
    // Filter reviews based on props
    const filteredReviews = reviews.filter(review => {
        // Only show visible reviews
        if (!review.isVisible) return false;

        // Filter by service if serviceId provided
        if (serviceId) {
            if (review.placement === 'global') return false;
            if (review.service?._id !== serviceId && review.placement !== 'both') return false;
        } else {
            // Global section - show global and both placements
            if (review.placement === 'service-specific') return false;
        }

        return true;
    });

    // Sort by featured first, then by displayOrder
    const sortedReviews = [...filteredReviews].sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return b.displayOrder - a.displayOrder;
    });

    // Apply limit if provided
    const displayedReviews = limit ? sortedReviews.slice(0, limit) : sortedReviews;

    // Calculate statistics
    const totalReviews = filteredReviews.length;
    const averageRating =
        totalReviews > 0
            ? filteredReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
            : 0;

    // Get featured reviews
    const featuredReviews = displayedReviews.filter(r => r.isFeatured);
    const normalReviews = displayedReviews.filter(r => !r.isFeatured);

    if (displayedReviews.length === 0) {
        return null;
    }

    return (
        <section className="py-10 bg-white relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-left mb-8 max-w-4xl"
                >
                    <span className="inline-block py-1 px-3 rounded-full bg-[#ec008c]/10 text-[#ec008c] text-sm font-semibold mb-4 border border-[#ec008c]/20">
                        Testimonials
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
                        Loved by thousands of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00aeef] via-[#ec008c] to-[#00aeef] bg-300% animate-gradient">
                            Happy Customers
                        </span>
                    </h2>
                </motion.div>

                {/* Review Slider */}
                <div className="w-full">
                    <ReviewSlider reviews={sortedReviews} />
                </div>
            </div>
        </section>
    );
};

export default CustomerReviews;
