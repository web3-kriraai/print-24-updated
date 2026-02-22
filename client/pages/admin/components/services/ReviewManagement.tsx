import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye,
    EyeOff,
    Star,
    Trash2,
    GripVertical,
    Filter,
    Search,
    X,
    ChevronDown,
} from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

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

interface Service {
    _id: string;
    name: string;
    color: string;
}

const ReviewManagement: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterService, setFilterService] = useState<string>('all');
    const [filterVisibility, setFilterVisibility] = useState<string>('all');
    const [filterFeatured, setFilterFeatured] = useState<string>('all');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Fetch reviews (including hidden ones for admin)
            const reviewsRes = await fetch(`${API_BASE_URL_WITH_API}/reviews?includeHidden=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const reviewsData = await reviewsRes.json();
            setReviews(reviewsData);

            // Fetch services
            const servicesRes = await fetch(`${API_BASE_URL_WITH_API}/services`);
            const servicesData = await servicesRes.json();
            setServices(servicesData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVisibility = async (reviewId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL_WITH_API}/reviews/${reviewId}/visibility`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const { review } = await response.json();
                setReviews(reviews.map(r => r._id === reviewId ? review : r));
            }
        } catch (error) {
            console.error('Failed to toggle visibility:', error);
        }
    };

    const handleToggleFeatured = async (reviewId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL_WITH_API}/reviews/${reviewId}/featured`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const { review } = await response.json();
                setReviews(reviews.map(r => r._id === reviewId ? review : r));
            }
        } catch (error) {
            console.error('Failed to toggle featured:', error);
        }
    };

    const handleUpdateSettings = async (reviewId: string, updates: Partial<Review>) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL_WITH_API}/reviews/${reviewId}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            if (response.ok) {
                const { review } = await response.json();
                setReviews(reviews.map(r => r._id === reviewId ? review : r));
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL_WITH_API}/reviews/${reviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setReviews(reviews.filter(r => r._id !== reviewId));
            }
        } catch (error) {
            console.error('Failed to delete review:', error);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newReviews = [...filteredReviews];
        const [draggedItem] = newReviews.splice(draggedIndex, 1);
        newReviews.splice(dropIndex, 0, draggedItem);

        // Update display order
        const updates = newReviews.map((review, index) => ({
            id: review._id,
            displayOrder: newReviews.length - index,
        }));

        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL_WITH_API}/reviews/reorder`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ reviews: updates }),
            });

            loadData(); // Reload to get updated order
        } catch (error) {
            console.error('Failed to update order:', error);
        }

        setDraggedIndex(null);
    };

    // Filter reviews
    const filteredReviews = reviews.filter(review => {
        if (searchTerm && !review.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !review.comment.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        if (filterService !== 'all') {
            if (filterService === 'none' && review.service) return false;
            if (filterService !== 'none' && review.service?._id !== filterService) return false;
        }

        if (filterVisibility !== 'all') {
            if (filterVisibility === 'visible' && !review.isVisible) return false;
            if (filterVisibility === 'hidden' && review.isVisible) return false;
        }

        if (filterFeatured !== 'all') {
            if (filterFeatured === 'featured' && !review.isFeatured) return false;
            if (filterFeatured === 'normal' && review.isFeatured) return false;
        }

        return true;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen relative overflow-hidden">
            {/* Animated Background Decorations */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
                        Review Management
                    </h1>
                    <p className="text-gray-700 font-medium">Control which reviews display on your website and where</p>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-6 mb-6"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={20} className="text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search reviews..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Service Filter */}
                        <select
                            value={filterService}
                            onChange={(e) => setFilterService(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Services</option>
                            <option value="none">No Service</option>
                            {services.map(service => (
                                <option key={service._id} value={service._id}>{service.name}</option>
                            ))}
                        </select>

                        {/* Visibility Filter */}
                        <select
                            value={filterVisibility}
                            onChange={(e) => setFilterVisibility(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Reviews</option>
                            <option value="visible">Visible Only</option>
                            <option value="hidden">Hidden Only</option>
                        </select>

                        {/* Featured Filter */}
                        <select
                            value={filterFeatured}
                            onChange={(e) => setFilterFeatured(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="featured">Featured Only</option>
                            <option value="normal">Normal Only</option>
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {(searchTerm || filterService !== 'all' || filterVisibility !== 'all' || filterFeatured !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterService('all');
                                setFilterVisibility('all');
                                setFilterFeatured('all');
                            }}
                            className="mt-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            <X size={16} />
                            Clear all filters
                        </button>
                    )}
                </motion.div>

                {/* Reviews List */}
                <div className="space-y-4">
                    {filteredReviews.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-md p-12 text-center">
                            <p className="text-gray-600">No reviews found matching your filters.</p>
                        </div>
                    ) : (
                        filteredReviews.map((review, index) => (
                            <motion.div
                                key={review._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e as any, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02, y: -5 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border-2 p-6 cursor-move hover:shadow-2xl transition-all duration-300 ${!review.isVisible
                                    ? 'opacity-60 border-gray-300'
                                    : review.isFeatured
                                        ? 'border-transparent bg-gradient-to-br from-yellow-50 to-orange-50 shadow-yellow-200/50'
                                        : 'border-transparent hover:border-purple-200'
                                    }`}
                                style={{
                                    background: review.isFeatured
                                        ? 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)'
                                        : review.isVisible
                                            ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,250,251,0.9) 100%)'
                                            : undefined
                                }}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Drag Handle */}
                                    <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                                        <GripVertical size={24} />
                                    </div>

                                    {/* Review Content */}
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900">{review.userName}</h3>
                                                    {review.isFeatured && (
                                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                                            Featured
                                                        </span>
                                                    )}
                                                    {!review.isVisible && (
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                                                            Hidden
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 mb-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            size={16}
                                                            className={
                                                                star <= review.rating
                                                                    ? 'fill-yellow-400 text-yellow-400'
                                                                    : 'text-gray-300'
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comment */}
                                        <p className="text-gray-700 mb-3">{review.comment}</p>

                                        {/* Service & Placement */}
                                        <div className="flex flex-wrap gap-3 mb-3">
                                            {/* Service Selector */}
                                            <select
                                                value={review.service?._id || ''}
                                                onChange={(e) => handleUpdateSettings(review._id, {
                                                    service: (e.target.value || null) as any
                                                })}
                                                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">No Service</option>
                                                {services.map(service => (
                                                    <option key={service._id} value={service._id}>
                                                        {service.name}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Placement Selector */}
                                            <select
                                                value={review.placement}
                                                onChange={(e) => handleUpdateSettings(review._id, {
                                                    placement: e.target.value as 'global' | 'service-specific' | 'both'
                                                })}
                                                className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="global">Global</option>
                                                <option value="service-specific">Service-Specific</option>
                                                <option value="both">Both</option>
                                            </select>

                                            {review.service && (
                                                <span
                                                    className="px-3 py-1.5 rounded-lg text-sm text-white"
                                                    style={{ backgroundColor: review.service.color }}
                                                >
                                                    {review.service.name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <p className="text-xs text-gray-500">
                                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleToggleVisibility(review._id)}
                                            className={`p-2 rounded-lg transition-colors ${review.isVisible
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            title={review.isVisible ? 'Hide review' : 'Show review'}
                                        >
                                            {review.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                                        </button>

                                        <button
                                            onClick={() => handleToggleFeatured(review._id)}
                                            className={`p-2 rounded-lg transition-colors ${review.isFeatured
                                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            title={review.isFeatured ? 'Unfeature review' : 'Feature review'}
                                        >
                                            <Star size={20} className={review.isFeatured ? 'fill-current' : ''} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(review._id)}
                                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                            title="Delete review"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewManagement;
