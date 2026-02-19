
import DesignerSession from './designer/models/DesignerSession.js';
import redis from './designer/config/redis.js';

/**
 * RESTORES REDIS TIMERS ON SERVER RESTART
 * 
 * If the server crashes, Redis keys might be lost (if Redis restarts) 
 * or we just want to ensure consistency.
 * 
 * Logic:
 * 1. Find all 'Active' sessions in MongoDB.
 * 2. Calculate remaining time based on startTime + extensions - now.
 * 3. Set Redis key if missing.
 */
export async function restoreSessions() {
    console.log("[CrashRecovery] 🔄 Checking for active sessions to restore...");

    try {
        const activeSessions = await DesignerSession.find({ status: "Active" });

        if (activeSessions.length === 0) {
            console.log("[CrashRecovery] ✅ No active sessions found.");
            return;
        }

        console.log(`[CrashRecovery] ⚠️ Found ${activeSessions.length} active sessions. Validating timers...`);

        for (const session of activeSessions) {
            const sessionId = session._id.toString();
            const key = `session:${sessionId}:timeLeft`;

            const exists = await redis.exists(key);

            if (!exists) {
                console.log(`[CrashRecovery] 🛠️ Restoring timer for ${sessionId}`);

                const now = new Date();
                const startTime = new Date(session.startTime);

                // Total allowed time = Base (15m) + Extensions
                const totalAllowedSeconds = (session.baseDuration || 180) + (session.extendedDuration || 0);

                // Time elapsed since start
                const elapsedSeconds = (now - startTime) / 1000;

                // Remaining
                const remainingSeconds = Math.ceil(totalAllowedSeconds - elapsedSeconds);

                if (remainingSeconds <= 0) {
                    console.warn(`[CrashRecovery] Session ${sessionId} expired during downtime. Completing...`);
                    // We could call completeSession here, but let's let the timer worker handle it 
                    // by setting a short expiry or status check. 
                    // To be safe, let's set it to 1 second so worker picks it up immediately.
                    await redis.set(key, 1);
                } else {
                    console.log(`[CrashRecovery] ✅ Restored ${sessionId} with ${remainingSeconds}s remaining.`);
                    await redis.set(key, remainingSeconds);
                }

                // Ensure status key exists too
                await redis.set(`session:${sessionId}:status`, "Active");
            } else {
                // console.log(`[CrashRecovery] Timer for ${sessionId} is healthy.`);
            }
        }
    } catch (error) {
        console.error("[CrashRecovery] Error:", error.message);
    }
}
