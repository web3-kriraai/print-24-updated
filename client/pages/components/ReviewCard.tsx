// components/ReviewCard.tsx
import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface ReviewCardProps {
  review: {
    _id: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
  };
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  view: 'grid' | 'list';
  isClient: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  index,
  isExpanded,
  onToggleExpand,
  view,
  isClient
}) => {
  const maxLength = view === 'grid' ? 100 : 200;
  const isLong = review.comment.length > maxLength;
  const displayText = isExpanded || !isLong 
    ? review.comment 
    : review.comment.substring(0, maxLength) + "...";

  if (view === 'list') {
    return (
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
            <div className="mb-2">
              <p className="text-cream-700 leading-relaxed">
                {displayText}
              </p>
              {isLong && (
                <button
                  onClick={onToggleExpand}
                  className="text-cream-900 hover:text-cream-700 text-sm font-medium mt-1 underline"
                >
                  {isExpanded ? "Show Less" : "Show More"}
                </button>
              )}
            </div>
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
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
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
      <p className="text-cream-700 leading-relaxed mb-4">
        {displayText}
      </p>
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
  );
};

export default ReviewCard;