import redis from "../config/redis.js";
import DesignerSession from "../models/DesignerSession.js";
import { completeSession } from "../services/session.service.js";
import { getIO } from "../config/socket.js";

/**
 * TIMER WORKER (Revenue Safe)
 * Runs every 1 second.
 * Manually decrements Redis keys for active sessions.
 */
async function runTimerLoop() {
    try {
        // 1. Fetch all ACTIVE sessions from DB
        const activeSessions = await DesignerSession.find({ status: "Active" })
            .select("_id roomName startTime baseDuration extendedDuration");

        if (activeSessions.length === 0) return;

        // console.log(`[TimerWorker] Processing ${activeSessions.length} active sessions`);

        const io = getIO();

        for (const session of activeSessions) {
            const sessionId = session._id.toString();
            const key = `session:${sessionId}:timeLeft`;
            const statusKey = `session:${sessionId}:status`;

            // Check if key exists
            const exists = await redis.exists(key);

            if (!exists) {
                // Double check DB status to avoid race with pauseSession/completeSession
                // IMPORTANT: TimerWorker loop might have a stale session object if status changed recently
                const freshSession = await DesignerSession.findById(sessionId).select("status startTime baseDuration extendedDuration");
                if (!freshSession || freshSession.status !== "Active") {
                    // console.log(`[TimerWorker] Skipping ${sessionId} - status is ${freshSession?.status || 'Unknown'}`);
                    continue;
                }

                // Self-Healing: Check if it SHOULD be active
                const now = new Date();
                const startTime = new Date(freshSession.startTime);
                const totalDuration = (freshSession.baseDuration || 900) + (freshSession.extendedDuration || 0);
                const elapsed = (now - startTime) / 1000;
                const expectedTimeLeft = Math.ceil(totalDuration - elapsed);

                if (expectedTimeLeft > 0) {
                    console.log(`[TimerWorker] 🛠️ Restoring missing timer for ${sessionId}. Time left: ${expectedTimeLeft}s`);
                    await redis.set(key, expectedTimeLeft);
                    continue;
                } else {
                    console.warn(`[TimerWorker] Session ${sessionId} expired (no Redis key). Completing.`);
                    await completeSession(sessionId);
                    continue;
                }
            }

            const currentVal = await redis.get(key);
            if (parseInt(currentVal || 0) <= 0) {
                await completeSession(sessionId);
                continue;
            }
            const timeLeft = await redis.decr(key);

            // Emit Warning at 60s
            if (timeLeft === 60) {
                io.to(session.roomName).emit("SESSION_WARNING", {
                    message: "1 minute remaining",
                    timeLeft
                });
            }

            // End if <= 0
            if (timeLeft <= 0) {
                console.log(`[TimerWorker] Session ${sessionId} time finished. Completing.`);
                await completeSession(sessionId);
            }
        }

    } catch (error) {
        console.error("[TimerWorker] Error in loop:", error.message);
    }
}

// Start Loop
setInterval(runTimerLoop, 1000);
console.log("[TimerWorker] 🚀 Manual decrement worker started");
