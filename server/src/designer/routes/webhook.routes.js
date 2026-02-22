import express from "express";
import { startSession, completeSession, extendSession } from "../services/session.service.js";

const router = express.Router();

/**
 * LIVEKIT WEBHOOK
 * Handles room_started and room_finished events.
 */
router.post("/livekit", async (req, res) => {
  try {
    const event = req.body;

    // console.log("[Webhook] LiveKit Event:", event.event);

    if (event.event === "room_started") {
      // In our new flow, we start session manually via API, so this might be redundant
      // or used for double-check.
      // However, if we use room.metadata for sessionId, we can ensure it's active.
      if (event.room && event.room.metadata) {
        // If metadata contains sessionId, use it to ensure session is active
        try {
          await startSession(event.room.metadata);
        } catch (err) {
          console.log(`[Webhook] Could not start session from webhook: ${err.message}`);
        }
      }
    }

    if (event.event === "room_finished") {
      // If room is closed by LiveKit (e.g. all left), we should complete session.
      if (event.room && event.room.metadata) {
        await completeSession(event.room.metadata);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("LiveKit webhook error:", error);
    res.sendStatus(500);
  }
});

/**
 * PAYMENT WEBHOOK
 * Handles payment success to extend session.
 */
router.post("/payment", async (req, res) => {
  try {
    const signature = req.headers["x-payment-signature"];
    // TODO: Validate signature with process.env.PAYMENT_SECRET

    const { event, data } = req.body;

    if (event === "payment.success") {
      const { sessionId, amount, durationAdded, paymentId } = data.metadata;

      if (!sessionId) {
        return res.status(400).send("Missing sessionId");
      }

      console.log(`[Webhook] Payment success for ${sessionId}`);

      // Extend session
      // Default 15 mins (900s) if not specified
      const seconds = durationAdded ? parseInt(durationAdded) : 900;

      await extendSession(sessionId, seconds, paymentId, amount);

      return res.json({ success: true, message: "Session extended" });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Payment webhook error:", error.message);
    res.sendStatus(500);
  }
});

export default router;
