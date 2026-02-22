import { getNextUser, getNextDesigner, setDesignerOnline }
    from "../services/queue.service.js";

import { createSession }
    from "../services/session.service.js";

import SessionArtifact
    from "../models/SessionArtifact.js";

import { getIO }
    from "../config/socket.js";

async function assignQueue() {
    const designerId = await getNextDesigner();
    if (!designerId) return;

    const userId = await getNextUser();
    if (!userId) {
        await setDesignerOnline(designerId);
        return;
    }

    console.log(`Assigning ${userId} → ${designerId}`);

    // ✅ IMPORTANT: Store session
    const session = await createSession(userId, designerId);

    console.log(`\n========================================`);
    console.log(`[Queue] 🟢 SESSION CREATED`);
    console.log(`[Queue] Session ID: ${session._id}`);
    console.log(`[Queue] Room Name:  ${session.roomName}`);
    console.log(`========================================\n`);

    try {
        const io = getIO();

        const payload = {
            sessionId: session._id,
            roomName: session.roomName,
            designerId,
            userId,
        };

        // 🔥 Emit session assigned
        const userRoomSize = io.sockets.adapter.rooms.get(userId)?.size || 0;
        const designerRoomSize = io.sockets.adapter.rooms.get(designerId)?.size || 0;

        console.log(`[QueueWorker] Emitting to User (${userId}) - Sockets: ${userRoomSize}`);
        console.log(`[QueueWorker] Emitting to Designer (${designerId}) - Sockets: ${designerRoomSize}`);

        io.to(userId).emit("SESSION_ASSIGNED", payload);
        io.to(designerId).emit("SESSION_ASSIGNED", payload);

        console.log(`[QueueWorker] SESSION_ASSIGNED sent to ${userId} and ${designerId}`);

        // =========================================
        // 🔥 Step 3 — Load History
        // =========================================

        const history = await SessionArtifact.find({
            userId: userId
        }).sort({ createdAt: 1 });

        // Send history ONLY to designer
        io.to(designerId).emit("SESSION_HISTORY", history);

        console.log(`[QueueWorker] Sent SESSION_HISTORY to designer`);

    } catch (err) {
        console.error("[QueueWorker] Socket emit failed:", err.message);
    }
}

setInterval(assignQueue, 2000);
