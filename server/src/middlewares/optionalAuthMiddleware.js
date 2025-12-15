import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

// Optional authentication middleware - doesn't fail if no token provided
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      // Continue without authentication if JWT_SECRET is missing
      req.user = null;
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided - continue without authentication
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      // No token - continue without authentication
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id).select("-password");
        req.user = user || null;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // Invalid or expired token - continue without authentication
      req.user = null;
    }
    
    next();
  } catch (err) {
    // Any other error - continue without authentication
    console.error("Optional auth middleware error:", err);
    req.user = null;
    next();
  }
};

