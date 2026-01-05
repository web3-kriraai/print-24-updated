import React, { useState, useEffect } from "react";
import { useClientOnly } from "../hooks/useClientOnly";
import { useInactivitySlider } from "../hooks/useInactivitySlider";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Star,
  Filter,
  X,
  Edit3,
} from "lucide-react";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import ServicesMorph from "../components/ServicesMorph";
import ServiceBanner from "../components/ServiceBanner";
import ServiceProducts from "../components/ServiceProducts";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";

interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  type?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Icon mapping based on category names






// Hero Slider Images
const heroSlides = [
  {
    id: 1,
    image: "/banner.jpg",
    alt: "Prints 24 Banner",
  },
];

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

const Home: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string>("newest");
  const [showMoreReviews, setShowMoreReviews] = useState(false);
  const [viewAllReviews, setViewAllReviews] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );
  const [selectedService, setSelectedService] = useState('printing'); // Default service for banner

  // Client-only flag for SSR hydration safety
  const isClient = useClientOnly();

  // Auto-rotate slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Check if user is logged in (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const filteredReviews = reviews.filter((review) => {
    if (filterRating && review.rating !== filterRating) {
      return false;
    }
    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (filterDate === "newest") {
      return dateB - dateA;
    } else if (filterDate === "oldest") {
      return dateA - dateB;
    }
    return dateB - dateA;
  });

  const displayedReviews = viewAllReviews
    ? sortedReviews
    : showMoreReviews
      ? sortedReviews
      : sortedReviews.slice(0, 6);

  // Calculate statistics
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  return (
    <div className="w-full overflow-hidden">
      {/* Morphing Services Section */}
      <ServicesMorph onServiceSelect={setSelectedService} />

      {/* Service Banner */}
      <ServiceBanner selectedService={selectedService} />

      {/* Dynamic Service Products Section */}
      <ServiceProducts selectedService={selectedService} />

      {/* Existing Services Grid */}


      {/* Reviews Section */}
      < section className="pt-8 sm:pt-12 pb-6 sm:pb-8 bg-cream-50" >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-cream-900 mb-3 sm:mb-4">
              Customer Reviews
            </h2>
            <p className="text-sm sm:text-base text-cream-600 max-w-xl mx-auto mb-4 sm:mb-6">
              See what our customers have to say about their experience with
              Prints24.
            </p>

            {/* Statistics */}
            {totalReviews > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-md border border-cream-200">
                  <p className="text-xs sm:text-sm text-cream-600 mb-1">
                    Total Reviews
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-cream-900">
                    {totalReviews}
                  </p>
                </div>
                <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-md border border-cream-200">
                  <p className="text-xs sm:text-sm text-cream-600 mb-1">
                    Average Rating
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={`sm:w-5 sm:h-5 ${star <= Math.round(averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-cream-300"
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-cream-900">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md border border-cream-200">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                  <Filter size={18} className="sm:w-5 sm:h-5 text-cream-600" />
                  <span className="text-sm sm:text-base font-medium text-cream-900">
                    Filters:
                  </span>
                </div>

                {/* Rating Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="text-xs sm:text-sm text-cream-700 sm:whitespace-nowrap">
                    Rating:
                  </label>
                  <ReviewFilterDropdown
                    label="All Ratings"
                    value={filterRating}
                    onChange={(value) =>
                      setFilterRating(value as number | null)
                    }
                    options={[
                      { value: null, label: "All Ratings" },
                      { value: 5, label: "5 Stars" },
                      { value: 4, label: "4 Stars" },
                      { value: 3, label: "3 Stars" },
                      { value: 2, label: "2 Stars" },
                      { value: 1, label: "1 Star" },
                    ]}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="text-xs sm:text-sm text-cream-700 sm:whitespace-nowrap">
                    Sort by:
                  </label>
                  <ReviewFilterDropdown
                    label="Newest First"
                    value={filterDate}
                    onChange={(value) => setFilterDate(value as string)}
                    options={[
                      { value: "newest", label: "Newest First" },
                      { value: "oldest", label: "Oldest First" },
                    ]}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Clear Filters */}
                {(filterRating || filterDate !== "newest") && (
                  <button
                    onClick={() => {
                      setFilterRating(null);
                      setFilterDate("newest");
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-cream-700 hover:text-cream-900 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    <X size={14} className="sm:w-4 sm:h-4" />
                    Clear Filters
                  </button>
                )}

                {/* Write Review Button (for all users) */}
                <Link
                  to="/reviews"
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-cream-900 text-cream-50 rounded-lg text-sm sm:text-base font-medium hover:bg-cream-800 transition-all shadow-md hover:shadow-lg sm:ml-auto"
                >
                  <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Write Review
                </Link>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {loadingReviews ? (
            <div className="text-center py-12">
              <p className="text-cream-600">Loading reviews...</p>
            </div>
          ) : sortedReviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-cream-600">
                {filterRating
                  ? `No reviews found with ${filterRating} star rating.`
                  : "No reviews yet. Be the first to review!"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewAllReviews ? (
                // Line by line layout for all reviews
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="max-w-4xl mx-auto space-y-4"
                >
                  {displayedReviews.map((review, index) => (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                      className="bg-white p-6 rounded-2xl shadow-md border border-cream-100 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-cream-900 font-bold text-lg">
                            {review.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-cream-900">
                              {review.userName}
                            </h4>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-cream-300"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                          {(() => {
                            const maxLength = 200;
                            const isExpanded = expandedComments.has(review._id);
                            const isLong = review.comment.length > maxLength;
                            const displayText =
                              isExpanded || !isLong
                                ? review.comment
                                : review.comment.substring(0, maxLength) +
                                "...";

                            return (
                              <div className="mb-2">
                                <p className="text-cream-700 leading-relaxed">
                                  {displayText}
                                </p>
                                {isLong && (
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(
                                        expandedComments
                                      );
                                      if (isExpanded) {
                                        newExpanded.delete(review._id);
                                      } else {
                                        newExpanded.add(review._id);
                                      }
                                      setExpandedComments(newExpanded);
                                    }}
                                    className="text-cream-900 hover:text-cream-700 text-sm font-medium mt-1 underline"
                                  >
                                    {isExpanded ? "Show Less" : "Show More"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-cream-500">
                            {new Date(review.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                // Grid layout for initial display
                <motion.div
                  key="grid-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
                >
                  {displayedReviews.map((review, index) => (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.05,
                        ease: "easeOut",
                      }}
                      className="bg-white p-6 rounded-2xl shadow-md border border-cream-100 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-cream-200 rounded-full flex items-center justify-center">
                          <span className="text-cream-900 font-bold text-lg">
                            {review.userName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-cream-900">
                            {review.userName}
                          </h4>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                className={
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-cream-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const maxLength = 100;
                        const isLong = review.comment.length > maxLength;
                        const displayText = isLong
                          ? review.comment.substring(0, maxLength) + "..."
                          : review.comment;

                        return (
                          <p className="text-cream-700 leading-relaxed mb-4">
                            {displayText}
                          </p>
                        );
                      })()}
                      <p className="text-xs text-cream-500">
                        {!isClient
                          ? 'Loading...'
                          : new Date(review.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        }
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Show More / Show Less Button */}
          {sortedReviews.length > 6 && !viewAllReviews && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowMoreReviews(!showMoreReviews)}
                className="inline-flex items-center gap-2 bg-cream-900 text-cream-50 px-6 py-3 rounded-xl font-medium hover:bg-cream-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                {showMoreReviews
                  ? "Show Less"
                  : `Show More (${sortedReviews.length - 6} more)`}
                <ArrowRight
                  size={18}
                  className={`transition-transform ${showMoreReviews ? "rotate-90" : ""
                    }`}
                />
              </button>
            </div>
          )}

          {/* View All Button */}
          {sortedReviews.length > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setViewAllReviews(!viewAllReviews);
                  if (!viewAllReviews) {
                    setShowMoreReviews(false);
                  }
                }}
                className="inline-flex items-center gap-2 bg-cream-900 text-cream-50 px-5 py-2.5 rounded-lg font-medium hover:bg-cream-800 transition-all shadow-md hover:shadow-lg"
              >
                {viewAllReviews ? "Show Less" : "View All"}
              </button>
            </div>
          )}
        </div>
      </section >

      {/* About Section */}
      < section className="pt-8 pb-24 bg-cream-100 relative overflow-hidden" >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white p-10 md:p-16 rounded-3xl shadow-xl"
            >
              <div className="text-center mb-12">
                <h2 className="font-serif text-3xl font-bold text-cream-900 mb-2">
                  About Prints24
                </h2>
                <div className="w-24 h-1 bg-cream-400 mx-auto rounded-full"></div>
              </div>

              <div className="space-y-8 text-cream-800 leading-relaxed">
                <p className="text-lg">
                  Prints24 is a modern, fast-growing{" "}
                  <span className="font-semibold">
                    Digital & Offset Printing Company
                  </span>
                  , whose aim is to provide Fast, Creative, and High-Quality
                  printing solutions to customers.
                </p>
                <p>
                  We started Prints24 with the idea that today's digital
                  generation should get a platform where they can avail all
                  types of printing services, from small quantities (Short Run)
                  to Bulk Printing, in an easy, fast, and reliable manner.
                </p>

                <div className="grid md:grid-cols-2 gap-8 mt-12">
                  <div className="bg-cream-50 p-6 rounded-xl border border-cream-200">
                    <h3 className="font-serif text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-cream-900 text-white rounded-full flex items-center justify-center text-sm">
                        V
                      </span>{" "}
                      Vision
                    </h3>
                    <p className="text-sm">
                      To make Affordable, Stylish, and Premium Quality Printing
                      easily accessible to every individual and every business.
                    </p>
                  </div>
                  <div className="bg-cream-50 p-6 rounded-xl border border-cream-200">
                    <h3 className="font-serif text-xl font-bold text-cream-900 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-cream-900 text-white rounded-full flex items-center justify-center text-sm">
                        M
                      </span>{" "}
                      Mission
                    </h3>
                    <ul className="text-sm space-y-2 list-disc list-inside">
                      <li>
                        To make Modern Printing easy and accessible to everyone.
                      </li>
                      <li>
                        To provide smart solutions with Quick Delivery + High
                        Quality.
                      </li>
                      <li>
                        To make better options available according to every
                        budget.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section >

      {/* Upload Teaser Section */}
      < section className="pt-24 pb-8 bg-cream-900 text-cream-50 text-center" >
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="mb-8 inline-flex items-center justify-center w-16 h-16 bg-cream-800 rounded-full">
              <ArrowRight size={32} className="text-amber-300" />
            </div>
            <h2 className="font-serif text-4xl font-bold mb-6">
              Have a Design Ready?
            </h2>
            <p className="text-xl text-cream-200 max-w-2xl mx-auto mb-10">
              Skip the templates and upload your own artwork. Our automated
              system checks for errors instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-cream-300 mb-10">
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                PDF
              </span>
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                AI
              </span>
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                PSD
              </span>
              <span className="px-4 py-1 bg-cream-800 rounded-full border border-cream-700">
                JPG/PNG
              </span>
            </div>
            <Link
              to="/upload"
              className="bg-cream-50 text-cream-900 px-10 py-4 rounded-full text-lg font-bold hover:bg-cream-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Upload Now
            </Link>
          </motion.div>
        </div>
      </section >
    </div >
  );
};

export default Home;
