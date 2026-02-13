import express from "express";
import { activateSession, completeSession } from "../services/session.service.js";

const router = express.Router();

router.post("/livekit", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "room_started") {
      await activateSession(event.room.metadata);
    }

    if (event.event === "room_finished") {
      await completeSession(event.room.metadata);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("LiveKit webhook error:", error);
    res.sendStatus(500);
  }
});

export default router;
