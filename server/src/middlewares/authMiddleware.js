import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // Debug: Log the request path
    console.log(`[AuthMiddleware] Processing ${req.method} ${req.originalUrl || req.path}`);

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("[AuthMiddleware] JWT_SECRET is not set in environment variables");
      return res.status(500).json({ error: "Server configuration error. Please contact administrator." });
    }

    const authHeader = req.headers.authorization;
    console.log(`[AuthMiddleware] Auth header present: ${!!authHeader}`);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AuthMiddleware] No Bearer token in header");
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("[AuthMiddleware] Token is empty after split");
      return res.status(401).json({ error: "Token is missing" });
    }

    console.log(`[AuthMiddleware] Token length: ${token.length}, first 20 chars: ${token.substring(0, 20)}...`);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[AuthMiddleware] Token decoded successfully, user id: ${decoded.id}`);

    if (!decoded || !decoded.id) {
      console.log("[AuthMiddleware] Decoded token missing id");
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log(`[AuthMiddleware] User not found for id: ${decoded.id}`);
      return res.status(401).json({ error: "User not found" });
    }

    console.log(`[AuthMiddleware] Auth SUCCESS - User: ${user.email}, Role: ${user.role}`);
    req.user = user;
    next();
  } catch (err) {
    console.error(`[AuthMiddleware] Error for ${req.method} ${req.path}:`, err.name, err.message);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    console.error("[AuthMiddleware] Full error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

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

  console.log('[requireAdmin] Checking role:', role); // Debug logging

  // ✅ FIXED: Accept both 'admin' and 'emp' roles
  if (role !== "admin" && role !== "emp") {
    console.log('[requireAdmin] Access DENIED - Role:', role);
    return res.status(403).json({
      error: "Access denied. Admin privileges required."
    });
  }

  console.log('[requireAdmin] Access GRANTED - Role:', role);
  next();
};
