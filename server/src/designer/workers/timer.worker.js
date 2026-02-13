import redis from "../config/redis.js";
import { getRoomService } from "../config/livekit.js";
import DesignerSession from "../models/DesignerSession.js";

/**
 * Checks for expired designer sessions and cleans up resources.
 */
async function checkTimers() {
    try {
        // console.log("⏰ timer worker checking...");
        // Wait for Redis connection to be fully established
        if (redis.status !== "ready") return;

        const keys = await redis.keys("session:*:expires_at");

        for (const key of keys) {
            const expiresAt = await redis.get(key);
            const sessionId = key.split(":")[1];

            // Check if session has timed out
            if (Date.now() >= parseInt(expiresAt)) {
                const roomKey = `session:${sessionId}:room`;
                const roomName = await redis.get(roomKey);

                console.log(`[TimerWorker] Session ${sessionId} expired. Cleaning up...`);

                // 1. Update Database Status
                await DesignerSession.findByIdAndUpdate(sessionId, {
                    status: "Completed",
                    endTime: new Date(),
                });

                // 2. Clean up Redis keys IMMEDIATELY to prevent loop repetition
                // We do this before the potentially failing LiveKit call
                await redis.del(key);
                await redis.del(roomKey);

                // 3. Attempt to delete LiveKit room
                if (roomName) {
                    try {
                        await getRoomService().deleteRoom(roomName);
                        console.log(`[TimerWorker] Room deleted: ${roomName}`);
                    } catch (err) {
                        // LiveKit might return different error codes or messages for "not found"
                        // We log and continue since Redis/DB are already cleaned up
                        console.log(`[TimerWorker] Note: Could not delete room ${roomName} (likely already gone)`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("[TimerWorker] Fatal error:", error);
    }
}

// Poll every second
setInterval(checkTimers, 1000);
