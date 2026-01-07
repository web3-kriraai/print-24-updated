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
    const { serviceId, includeHidden } = req.query;

    // Build query
    const query = {};

    // Filter by visibility (default: only visible)
    if (includeHidden !== 'true') {
      query.isVisible = true;
    }

    // Filter by service if provided
    if (serviceId) {
      query.$or = [
        { service: serviceId },
        { placement: 'global' },
        { placement: 'both' }
      ];
    }

    const reviews = await Review.find(query)
      .populate({
        path: "user",
        select: "name email",
        options: { strictPopulate: false } // Allow null user references
      })
      .populate({
        path: "service",
        select: "name color",
        options: { strictPopulate: false }
      })
      .sort({ displayOrder: -1, createdAt: -1 }); // Sort by displayOrder, then latest first

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};

// Update review display settings (admin only)
export const updateReviewSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { service, displayOrder, isVisible, isFeatured, placement } = req.body;

    const updateData = {};
    if (service !== undefined) updateData.service = service || null;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (placement !== undefined) updateData.placement = placement;

    const review = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate("user", "name email")
      .populate("service", "name color");

    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }

    res.status(200).json({
      message: "Review settings updated successfully",
      review,
    });
  } catch (error) {
    console.error("Update review settings error:", error);
    res.status(500).json({ error: "Failed to update review settings." });
  }
};

// Get reviews by service
export const getReviewsByService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { includeHidden } = req.query;

    const query = {
      $or: [
        { service: serviceId },
        { placement: 'global' },
        { placement: 'both' }
      ]
    };

    if (includeHidden !== 'true') {
      query.isVisible = true;
    }

    const reviews = await Review.find(query)
      .populate("user", "name email")
      .populate("service", "name color")
      .sort({ displayOrder: -1, createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Get reviews by service error:", error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};

// Bulk update review order
export const updateReviewOrder = async (req, res) => {
  try {
    const { reviews } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(reviews)) {
      return res.status(400).json({ error: "Reviews must be an array." });
    }

    const updatePromises = reviews.map(({ id, displayOrder }) =>
      Review.findByIdAndUpdate(id, { displayOrder }, { new: true })
    );

    await Promise.all(updatePromises);

    res.status(200).json({ message: "Review order updated successfully" });
  } catch (error) {
    console.error("Update review order error:", error);
    res.status(500).json({ error: "Failed to update review order." });
  }
};

// Toggle review visibility
export const toggleReviewVisibility = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }

    review.isVisible = !review.isVisible;
    await review.save();

    await review.populate("user", "name email");
    await review.populate("service", "name color");

    res.status(200).json({
      message: "Review visibility toggled successfully",
      review,
    });
  } catch (error) {
    console.error("Toggle visibility error:", error);
    res.status(500).json({ error: "Failed to toggle visibility." });
  }
};

// Toggle review featured status
export const toggleReviewFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }

    review.isFeatured = !review.isFeatured;
    await review.save();

    await review.populate("user", "name email");
    await review.populate("service", "name color");

    res.status(200).json({
      message: "Review featured status toggled successfully",
      review,
    });
  } catch (error) {
    console.error("Toggle featured error:", error);
    res.status(500).json({ error: "Failed to toggle featured status." });
  }
};

// Delete review (admin only)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ error: "Review not found." });
    }

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ error: "Failed to delete review." });
  }
};

