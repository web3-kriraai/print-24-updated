
import DesignerSession from "../models/DesignerSession.js";
import redis from "../config/redis.js";
import { getIO } from "../config/socket.js";

/**
 * PAUSE SESSION (Designer Disconnect)
 */
export async function pauseSession(sessionId) {
    const session = await DesignerSession.findById(sessionId);
    if (!session || session.status !== "Active") return;

    console.log(`[Session] ⏸️ Pausing session ${sessionId} (Designer disconnected)`);

    // 1. Update DB Status FIRST (to avoid race with TimerWorker)
    session.status = "Paused";
    await session.save();

    // 2. Handle Redis
    const key = `session:${sessionId}:timeLeft`;
    const remaining = await redis.get(key);

    if (remaining) {
        await redis.set(`session:${sessionId}:pausedRemaining`, remaining);
        await redis.del(key);
        await redis.set(`session:${sessionId}:status`, "Paused");
    }

    console.log(`[Session] ⏸️ Paused ${sessionId}. Saved budget: ${remaining || 'N/A'}s`);
    getIO().to(session.roomName).emit("SESSION_PAUSED", { sessionId });
}

/**
 * RESUME SESSION (Designer Reconnect)
 */
export async function resumeSession(sessionId) {
    const session = await DesignerSession.findById(sessionId);
    if (!session || session.status !== "Paused") return;

    console.log(`[Session] ▶️ Resuming session ${sessionId}`);

    // Fetch snapshot from Redis
    const remaining = await redis.get(`session:${sessionId}:pausedRemaining`);

    // 2. Restore Timer & Normalize startTime
    let timeLeftFinal;
    if (remaining) {
        timeLeftFinal = parseInt(remaining, 10);
        await redis.set(`session:${sessionId}:timeLeft`, timeLeftFinal);
        await redis.del(`session:${sessionId}:pausedRemaining`);

        // Recalculate startTime so that: Now - startTime = TotalDuration - timeLeft
        // This ensures recalculation logic (like on reload) stays correct.
        const totalDuration = (session.baseDuration || 900) + (session.extendedDuration || 0);
        const elapsedSoFar = totalDuration - timeLeftFinal;
        const newStartTime = new Date(Date.now() - (elapsedSoFar * 1000));

        session.startTime = newStartTime;
        console.log(`[Session] Normalized startTime for ${sessionId}: ${newStartTime.toISOString()}`);
    } else {
        // Fallback if missing? Maybe 60s?
        timeLeftFinal = 60;
        await redis.set(`session:${sessionId}:timeLeft`, timeLeftFinal);
        if (session.baseDuration) {
            session.startTime = new Date(Date.now() - ((session.baseDuration - 60) * 1000));
        }
    }

    // 3. Update DB
    session.status = "Active";
    await session.save();
    await redis.set(`session:${sessionId}:status`, "Active");

    getIO().to(session.roomName).emit("SESSION_RESUMED", {
        sessionId,
        timeLeft: timeLeftFinal
    });
}

/**
 * Helper: Find active session for designer and pause it.
 */
export async function pauseDesignerSession(designerId) {
    // Find ACTIVE session for this designer
    const session = await DesignerSession.findOne({
        designerId,
        status: "Active"
    });

    if (session) {
        await pauseSession(session._id);
    }
}

/**
 * Helper: Find paused session for designer and resume it.
 */
export async function resumeDesignerSession(designerId) {
    const session = await DesignerSession.findOne({
        designerId,
        status: "Paused"
    });

    if (session) {
        await resumeSession(session._id);
    }
}
