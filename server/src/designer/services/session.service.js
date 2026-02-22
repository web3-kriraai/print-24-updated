import DesignerSession from '../models/DesignerSession.js';
import redis from '../config/redis.js';
import { getRoomService } from '../config/livekit.js';
import { getIO } from '../config/socket.js';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../models/User.js';

/**
 * Creates a new scheduled session.
 */
export async function createSession(userId, designerId, orderId = null, requestId = null) {
    console.log("➡️ createSession running");

    const roomName = `session_${uuidv4()}`;

    // Fetch Designer for custom settings
    console.log(`[SessionService] Preparing session for Designer: ${designerId}`);
    const designer = await User.findById(designerId);

    if (!designer) {
        console.warn(`[SessionService] Designer ${designerId} not found! (User.findById returned null)`);
    } else {
        console.log(`[SessionService] Designer Found: ${designer.email} (${designer._id})`);
        console.log(`[SessionService] Raw sessionSettings from DB:`, designer.sessionSettings);
    }

    // Ensure we have a valid settings object, with defaults if missing
    const settings = {
        baseDuration: designer?.sessionSettings?.baseDuration || 900,
        basePrice: designer?.sessionSettings?.basePrice || 500,
        extensionDuration: designer?.sessionSettings?.extensionDuration || 900,
        extensionPrice: designer?.sessionSettings?.extensionPrice || 300
    };

    console.log(`[SessionService] Settings to be used for this session:`, settings);

    // Snapshot settings
    const session = await DesignerSession.create({
        userId,
        designerId,
        orderId,
        requestId,
        roomName,
        status: 'Scheduled',
        ratePerMinute: settings.basePrice / (settings.baseDuration / 60) || 10,
        totalDuration: 0,
        totalAmount: 0,
        paymentStatus: 'Pending',
        baseDuration: settings.baseDuration || 900,
        basePrice: settings.basePrice || 500,
        extensionDuration: settings.extensionDuration || 900,
        extensionPrice: settings.extensionPrice || 300,
        extendedDuration: 0,
        transactions: []
    });
    console.log("Session created:", session._id);
    return session;
}

/**
 * Starts a session (Part 1).
 */
export async function startSession(sessionId) {
    console.log(`➡️ startSession: ${sessionId}`);

    const session = await DesignerSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status !== "Scheduled" && session.status !== "Active") {
        throw new Error(`Cannot start session with status: ${session.status}`);
    }

    if (session.status === "Active") {
        console.log("Session already active, re-emitting event only.");
    } else {
        session.status = "Active";
        session.startTime = new Date();
        await session.save();
    }

    // Set Redis Key safely (Idempotent)
    const key = `session:${sessionId}:timeLeft`;
    const added = await redis.setnx(key, session.baseDuration);

    if (added) {
        console.log(`[Session] Timer started for ${sessionId} (${session.baseDuration}s)`);
    }

    await redis.set(`session:${sessionId}:status`, "Active");

    // Emit Event
    try {
        const io = getIO();
        io.to(session.roomName).emit("SESSION_STARTED", {
            sessionId,
            startTime: session.startTime,
            timeLeft: session.baseDuration
        });
    } catch (err) {
        console.error("Socket emit warning:", err.message);
    }

    return session;
}

/**
 * Completes a session (Part 3).
 */
export async function completeSession(sessionId) {
    console.log(`➡️ completeSession: ${sessionId}`);

    const session = await DesignerSession.findById(sessionId);
    if (!session) return null;

    if (session.status === "Completed") return session;

    // 1. Calculate Duration & Amount
    const endTime = new Date();
    const startTime = session.startTime || new Date();
    const durationSeconds = Math.max(0, (endTime - startTime) / 1000);

    // Revenue based on rate * duration
    // OR base + extended?
    // Let's stick to rate * duration logic as simplest source of truth
    const amount = Math.ceil((durationSeconds / 60) * session.ratePerMinute);

    // 2. Update DB
    session.status = "Completed";
    session.endTime = endTime;
    session.totalDuration = durationSeconds;
    session.totalAmount = amount;

    await session.save();

    // 3. Clean Redis
    await redis.del(`session:${sessionId}:timeLeft`);
    await redis.del(`session:${sessionId}:status`);

    // 4. Close LiveKit Room
    if (session.roomName) {
        try {
            await getRoomService().deleteRoom(session.roomName);
            console.log(`[Session] Room deleted: ${session.roomName}`);
        } catch (error) {
            console.warn(`[Session] Note: Could not delete room ${session.roomName}`);
        }
    }

    // 5. Emit Event
    try {
        const io = getIO();
        io.to(session.roomName).emit("SESSION_ENDED", {
            sessionId,
            duration: durationSeconds,
            amount
        });
    } catch (err) {
        console.error("Socket emit warning:", err.message);
    }

    return session;
}

/**
 * Extends a session (Part 4).
 * Includes: Idempotency, Grace Period, Transaction Logging.
 */
export async function extendSession(sessionId, additionalSeconds = null, paymentId, amount) {
    const session = await DesignerSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    // Use snapshotted extension settings if additionalSeconds is not provided
    if (additionalSeconds === null) {
        additionalSeconds = session.extensionDuration || 900;
    }

    console.log(`➡️ extendSession: ${sessionId} (+${additionalSeconds}s)`);

    // 1. Idempotency Check
    if (paymentId) {
        const alreadyProcessed = session.transactions.some(t => t.paymentId === paymentId);
        if (alreadyProcessed) {
            console.log(`[Session] Payment ${paymentId} already processed. Skipping.`);
            return { skipped: true };
        }
    }

    // 2. Grace Period Handling
    if (session.status === "Completed") {
        const graceSeconds = session.gracePeriodSeconds || 300;
        const endTime = new Date(session.endTime);
        const now = new Date();
        const diffSeconds = (now - endTime) / 1000;

        if (diffSeconds > graceSeconds) {
            throw new Error("Session expired too long ago to extend");
        }

        console.log(`[Session] Reactivating session ${sessionId} (Grace Period: ${diffSeconds}s ago)`);

        // IMPORTANT: Adjust startTime so that (now - startTime) doesn't include the "Completed" time.
        // This ensures the budget logic doesn't immediately expire the extension.
        if (session.startTime) {
            const originalStartTime = new Date(session.startTime);
            // new startTime = originalStartTime + (now - endTime)
            // Effectively shifting the start time forward by the duration of the "Completed" state.
            session.startTime = new Date(originalStartTime.getTime() + (now.getTime() - endTime.getTime()));
        }

        session.status = "Active";
        session.endTime = null; // Clear end time
        await redis.set(`session:${sessionId}:status`, "Active");
    }

    if (session.status !== "Active") {
        throw new Error("Cannot extend inactive session");
    }

    // 3. Update Redis and Consumed Time
    // If reactivated, we need to ensure the "total duration" logic doesn't immediately expire it.
    // The safest way is to "shift" startTime so that the elapsed time matches what was used.
    if (session.status === "Active" || !session.endTime) {
        // Normal extension while active
    }

    const key = `session:${sessionId}:timeLeft`;
    let newTime;

    const exists = await redis.exists(key);
    if (!exists) {
        // Key might be missing if it just completed or worker cleaned up.
        // We set it to the additionalSeconds (the extension).
        await redis.set(key, additionalSeconds);
        newTime = additionalSeconds;
    } else {
        newTime = await redis.incrby(key, additionalSeconds);
    }

    // 4. Log Transaction and Save
    if (paymentId || amount) {
        session.transactions.push({
            paymentId,
            amount,
            addedDuration: additionalSeconds,
            timestamp: new Date()
        });
    }

    session.extendedDuration = (session.extendedDuration || 0) + additionalSeconds;

    // CRITICAL: Save everything (status, endTime, extendedDuration)
    await session.save();

    console.log(`[Session] Extended ${sessionId}. New time: ${newTime}s`);

    // Emit Event
    try {
        const io = getIO();
        io.to(session.roomName).emit("SESSION_EXTENDED", {
            sessionId,
            timeLeft: newTime,
            added: additionalSeconds
        });
    } catch (err) {
        console.error("Socket emit warning:", err.message);
    }

    return {
        newTime,
        status: session.status,
        timeLeft: newTime
    };
}