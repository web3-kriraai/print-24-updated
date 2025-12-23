// components/ReviewStatistics.tsx
import React from "react";
import { Star } from "lucide-react";

interface Review {
  rating: number;
}

interface ReviewStatisticsProps {
  reviews: Review[];
}

const ReviewStatistics: React.FC<ReviewStatisticsProps> = ({ reviews }) => {
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

  if (totalReviews === 0) return null;

  return (
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
                className={`sm:w-5 sm:h-5 ${
                  star <= Math.round(averageRating)
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
  );
};

export default ReviewStatistics;