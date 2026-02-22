import express from "express";

import {
    addUserToQueue,
    removeUserFromQueue,
    setDesignerOnline,
    setDesignerOffline,
} from "../services/queue.service.js";

import { checkOfficeHours } from "../middlewares/checkOfficeHours.js";

const router = express.Router();

/* USER JOIN QUEUE */
// Apply Office Hours middleware
router.post("/join", checkOfficeHours, async (req, res) => {
    const { userId, tier } = req.body;

    await addUserToQueue(userId, tier);

    res.json({ message: "Added to queue" });
});

/* USER LEAVE */
router.post("/leave", async (req, res) => {
    const { userId } = req.body;

    await removeUserFromQueue(userId);

    res.json({ message: "Removed from queue" });
});

/* DESIGNER ONLINE */
router.post("/designer/online", async (req, res) => {
    const { designerId } = req.body;

    await setDesignerOnline(designerId);

    res.json({ message: "Designer online" });
});

/* DESIGNER OFFLINE */
router.post("/designer/offline", async (req, res) => {
    const { designerId } = req.body;

    await setDesignerOffline(designerId);

    res.json({ message: "Designer offline" });
});

export default router;
