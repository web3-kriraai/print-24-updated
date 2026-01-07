import React from 'react';
import { motion } from 'framer-motion';
import { Star, CheckCircle } from 'lucide-react';

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
        <section className="py-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
            {/* Animated Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-30 mix-blend-multiply"
                />
                <motion.div
                    animate={{
                        x: [0, 30, 0],
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-1/3 -right-20 w-80 h-80 bg-purple-200 rounded-full blur-3xl opacity-30 mix-blend-multiply"
                />
                <motion.div
                    animate={{
                        y: [0, 40, 0],
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute -bottom-20 left-1/3 w-96 h-96 bg-pink-200 rounded-full blur-3xl opacity-30 mix-blend-multiply"
                />
            </div>

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-16"
                >
                    <span className="inline-block py-1 px-3 rounded-full bg-white/50 border border-white/60 backdrop-blur-sm text-purple-600 text-sm font-semibold mb-4 shadow-sm">
                        Testimonials
                    </span>
                    <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
                        Loved by thousands of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                            Happy Customers
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Don't just take our word for it. See what people are saying about their printing experience with Prints24.
                    </p>

                    {/* Statistics */}
                    {totalReviews > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.05 }}
                                className="bg-white/70 backdrop-blur-md px-8 py-4 rounded-full shadow-lg border border-white/50 flex flex-col items-center"
                            >
                                <span className="text-3xl font-bold text-gray-900">{totalReviews}+</span>
                                <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Reviews</span>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 }}
                                whileHover={{ scale: 1.05 }}
                                className="bg-white/70 backdrop-blur-md px-8 py-4 rounded-full shadow-lg border border-white/50 flex flex-col items-center"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                                    <div className="flex text-yellow-400">
                                        <Star size={20} fill="currentColor" />
                                    </div>
                                </div>
                                <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Average Rating</span>
                            </motion.div>
                        </div>
                    )}
                </motion.div>

                {/* Featured Reviews - Parallax/Staggered Grid */}
                {featuredReviews.length > 0 && (
                    <div className="mb-20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                            {featuredReviews.map((review, index) => (
                                <motion.div
                                    key={review._id}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.15, duration: 0.6 }}
                                    whileHover={{ y: -10 }}
                                    className="relative group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl transform rotate-1 transition-transform group-hover:rotate-2 opacity-70"></div>
                                    <div className="relative bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                                                    {review.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{review.userName}</h4>
                                                    <div className="flex text-yellow-400 text-sm">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {review.service && (
                                                <span
                                                    className="px-3 py-1 text-xs font-semibold rounded-full text-white shadow-sm"
                                                    style={{ backgroundColor: review.service.color }}
                                                >
                                                    {review.service.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 italic text-lg leading-relaxed mb-4">
                                            "{review.comment}"
                                        </p>
                                        <div className="flex justify-between items-center text-sm text-gray-400 font-medium">
                                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                                            <span className="text-purple-500 flex items-center gap-1">
                                                Verified Purchase <CheckCircle size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Normal Reviews - Masonry-like Grid */}
                {normalReviews.length > 0 && (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        variants={{
                            hidden: {},
                            show: {
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                    >
                        {normalReviews.map((review) => (
                            <motion.div
                                key={review._id}
                                variants={{
                                    hidden: { opacity: 0, scale: 0.9 },
                                    show: { opacity: 1, scale: 1 }
                                }}
                                whileHover={{ scale: 1.03, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                                className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                            {review.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm">{review.userName}</h4>
                                            <div className="flex text-yellow-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {review.service && (
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: review.service.color }}
                                            title={review.service.name}
                                        />
                                    )}
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                    {review.comment.length > 150 ? `${review.comment.substring(0, 150)}...` : review.comment}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default CustomerReviews;
