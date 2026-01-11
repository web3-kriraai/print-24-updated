import Review from "../models/reviewModal.js";
import { User } from "../models/User.js";

// Create a new review
export const createReview = async (req, res) => {
  try {
    const { rating, comment, userName } = req.body;
    const userId = req.user?.id; // Optional - user might not be logged in

    if (!rating || !comment) {
      return res.status(400).json({ error: "Rating and comment are required." });
    }

    if (!userName || !userName.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    let reviewUserName = userName.trim();
    let reviewUserId = null;

    // If user is logged in, use their account info, otherwise use provided name
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        reviewUserId = userId;
        // Use provided name or fallback to user's name
        reviewUserName = userName.trim() || user.name;
      }
    }

    // Create review
    const review = new Review({
      user: reviewUserId, // Can be null for non-logged-in users
      userName: reviewUserName,
      rating: parseInt(rating),
      comment: comment.trim(),
    });

    await review.save();

    // Populate user field for response if user exists
    if (reviewUserId) {
      await review.populate("user", "name email");
    }

    res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Failed to create review." });
  }
};

// Get all reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate({
        path: "user",
        select: "name email",
        options: { strictPopulate: false } // Allow null user references
      })
      .sort({ createdAt: -1 }); // Latest first

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};


