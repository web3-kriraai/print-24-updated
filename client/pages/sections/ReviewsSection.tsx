// sections/ReviewsSection.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Edit3, ArrowRight, Star } from "lucide-react";
import { ReviewFilterDropdown } from "../components/ReviewFilterDropdown";
import ReviewCard from "../components/ReviewCard";
import ReviewStatistics from "../components/ReviewStatistics";

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

interface ReviewsSectionProps {
  reviews: Review[];
  loadingReviews: boolean;
  isLoggedIn: boolean;
  isClient: boolean;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  loadingReviews,
  isLoggedIn,
  isClient
}) => {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<string>("newest");
  const [showMoreReviews, setShowMoreReviews] = useState(false);
  const [viewAllReviews, setViewAllReviews] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );

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

  return (
    <section className="pt-8 sm:pt-12 pb-6 sm:pb-8 bg-cream-50">
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
          <ReviewStatistics reviews={reviews} />
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

              {/* Write Review Button */}
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
                  <ReviewCard
                    key={review._id}
                    review={review}
                    index={index}
                    isExpanded={expandedComments.has(review._id)}
                    onToggleExpand={() => {
                      const newExpanded = new Set(expandedComments);
                      if (expandedComments.has(review._id)) {
                        newExpanded.delete(review._id);
                      } else {
                        newExpanded.add(review._id);
                      }
                      setExpandedComments(newExpanded);
                    }}
                    view="list"
                    isClient={isClient}
                  />
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
                  <ReviewCard
                    key={review._id}
                    review={review}
                    index={index}
                    isExpanded={expandedComments.has(review._id)}
                    onToggleExpand={() => {
                      const newExpanded = new Set(expandedComments);
                      if (expandedComments.has(review._id)) {
                        newExpanded.delete(review._id);
                      } else {
                        newExpanded.add(review._id);
                      }
                      setExpandedComments(newExpanded);
                    }}
                    view="grid"
                    isClient={isClient}
                  />
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
                className={`transition-transform ${
                  showMoreReviews ? "rotate-90" : ""
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
    </section>
  );
};

export default ReviewsSection;