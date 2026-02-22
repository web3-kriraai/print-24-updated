import express from "express";
import { getAbout, updateAbout } from "../controllers/aboutController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminAuth } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/", getAbout);
router.put("/", authMiddleware, adminAuth, updateAbout);

export default router;
