import jwt from "jsonwebtoken";
<<<<<<< HEAD
import { User } from "../models/User.js";
=======
import {User} from "../models/User.js";
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6

export const authMiddleware = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ error: "Server configuration error. Please contact administrator." });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
<<<<<<< HEAD

=======
    
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
    if (!token) {
      return res.status(401).json({ error: "Token is missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
};
<<<<<<< HEAD

/**
 * =========================================================================
 * ADMIN AUTHORIZATION MIDDLEWARE
 * =========================================================================
 * 
 * Ensures only admin users can access protected routes.
 * Includes role normalization for safety (different systems store roles differently).
 */
export const requireAdmin = (req, res, next) => {
  // Normalize role (some systems use 'role', others use 'userType')
  const role = req.user?.role || req.user?.userType;

  if (role !== "admin") {
    return res.status(403).json({
      error: "Access denied. Admin privileges required."
    });
  }

  next();
};

=======
>>>>>>> 69f63f00eb5f95529b818f8c84c9a41f95543dc6
