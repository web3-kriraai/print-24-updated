import React, { useState } from 'react';
import { Quote, Star, X } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';

interface Review {
    _id: string;
    userName: string;
    rating: number;
    comment: string;
    service?: {
        name: string;
        color: string;
    };
    createdAt: string;
}

interface ReviewSliderProps {
    reviews: Review[];
}

const ReviewCard = ({ review }: { review: Review }) => {
    const [showFullReview, setShowFullReview] = useState(false);
    const isLongReview = review.comment.length > 150;

    return (
        <>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 h-full flex flex-col relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
                {/* Decorative Quote */}
                <div className="absolute top-4 right-4 text-[#ec008c]/10 transform rotate-12 group-hover:rotate-0 transition-transform">
                    <Quote size={60} fill="currentColor" />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#00aeef] to-[#ec008c] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md">
                            {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 line-clamp-1">{review.userName}</h4>
                            <div className="flex text-yellow-400 text-sm mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={14}
                                        fill={i < review.rating ? "currentColor" : "none"}
                                        className={i < review.rating ? "" : "text-gray-300"}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow">
                        <p className="text-slate-600 leading-relaxed text-[15px] mb-4 line-clamp-4 font-normal">
                            "{review.comment}"
                        </p>
                        {isLongReview && (
                            <button
                                onClick={() => setShowFullReview(true)}
                                className="text-blue-600 text-xs font-semibold hover:text-blue-800 underline decoration-blue-300 underline-offset-4"
                            >
                                Read Complete Review
                            </button>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        {review.service && (
                            <span
                                className="px-2 py-1 rounded-full text-white font-semibold shadow-sm"
                                style={{ backgroundColor: review.service.color }}
                            >
                                {review.service.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Full Review Modal */}
            {showFullReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowFullReview(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowFullReview(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 overflow-y-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-[#00aeef] to-[#ec008c] rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                    {review.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-xl">{review.userName}</h3>
                                    <div className="flex text-yellow-400 mt-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={16}
                                                fill={i < review.rating ? "currentColor" : "none"}
                                                className={i < review.rating ? "" : "text-gray-300"}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-blue max-w-none">
                                <p className="text-slate-700 leading-relaxed text-lg font-normal">
                                    "{review.comment}"
                                </p>
                            </div>

                            <div className="mt-8 flex justify-between items-center text-sm text-gray-500 pt-6 border-t border-gray-100">
                                <span>Posted on {new Date(review.createdAt).toLocaleDateString()}</span>
                                {review.service && (
                                    <span
                                        className="px-3 py-1 rounded-full text-white font-semibold shadow-sm"
                                        style={{ backgroundColor: review.service.color }}
                                    >
                                        {review.service.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const ReviewSlider: React.FC<ReviewSliderProps> = ({ reviews }) => {
    return (
        <div className="w-full py-10 relative">
            <Swiper
                effect={'coverflow'}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={'auto'}
                initialSlide={Math.floor(reviews.length / 2)}
                coverflowEffect={{
                    rotate: 0,
                    stretch: 0,
                    depth: 100,
                    modifier: 2.5,
                    slideShadows: false,
                }}
                pagination={false}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                }}
                modules={[EffectCoverflow, Autoplay]}
                className="mySwiper w-full !pb-12"
            >
                {reviews.map((review) => (
                    <SwiperSlide
                        key={review._id}
                        className="!w-[300px] md:!w-[350px] !h-auto"
                    >
                        <ReviewCard review={review} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};
export default ReviewSlider;
