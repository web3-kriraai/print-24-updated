import express from "express";

import { createSession } from "../services/session.service.js";
import { generateToken } from "../config/livekit.js";
import { startTimer } from "../services/timer.service.js";

const router = express.Router();

router.post("/start", async (req, res) => {
    try {
        console.log("➡️ session.routes.js /start called");
        const { userId, designerId } = req.body;

        const session = await createSession(userId, designerId);

        const userToken = await generateToken(userId, session.roomName);
        const designerToken = await generateToken(designerId, session.roomName);

        await startTimer(session._id.toString(), session.roomName, 900);

        res.json({
            sessionId: session._id,
            roomName: session.roomName,
            userToken,
            designerToken,
        });
    } catch (error) {
        console.error("Start session error:", error);
        res.status(500).json({ message: "Failed to start session" });
    }
});

export default router;
