import express from "express";
import { registerUser, loginUser } from "../controllers/auth/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Test admin-only access
router.get("/admin-access", authMiddleware, adminAuth, (req, res) => {
  res.status(200).json({ message: "Admin access granted." });
});

export default router;
