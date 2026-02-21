import { startSession, extendSession, completeSession } from "../services/session.service.js";
import { pauseSession, resumeSession } from "../services/pause.service.js";
import { generateToken } from "../config/livekit.js";
import DesignerSession from "../models/DesignerSession.js";
import SessionArtifact from "../models/SessionArtifact.js";

/**
 * START SESSION
 * POST /api/session/start
 */
export const startSessionHandler = async (req, res) => {
    try {
        const { userId, designerId, sessionId } = req.body;

        // If sessionId provided, use it (manual start for existing session)
        // If not, creates new (legacy behavior support if needed, but per specs we likely use existing)

        let session;
        if (sessionId) {
            session = await startSession(sessionId);
        } else {
            // Fallback for legacy "create and start" in one go
            // Ideally we should separate create and start, but keeping this for compatibility
            // or if the frontend sends everything at once.
            // For now, let's assume we are starting an EXISTING session found by ID or creating one.
            // The prompt asked for: POST /api/session/:id/start
            // But let's support the body payload too.
            return res.status(400).json({ message: "Session ID is required to start" });
        }

        // Generate Tokens for LiveKit (Use IDs from session if not in body)
        const tUser = userId || session.userId;
        const tDesigner = designerId || session.designerId;

        console.log(`DEBUG: Token Identity - User: ${tUser}, Designer: ${tDesigner}`);

        if (!tUser || !tDesigner) {
            throw new Error(`Missing identity for token generation. User: ${tUser}, Designer: ${tDesigner}`);
        }

        const userToken = await generateToken(String(tUser), session.roomName);
        const designerToken = await generateToken(String(tDesigner), session.roomName);

        res.json({
            success: true,
            sessionId: session._id,
            roomName: session.roomName,
            status: session.status,
            timeLeft: session.baseDuration,
            userToken,
            designerToken
        });

    } catch (error) {
        console.error("[SessionController] Start Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * EXTEND SESSION (Internal/Webhook use mainly)
 * POST /api/session/:id/extend
 */
export const extendSessionHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { duration } = req.body; // optional custom duration

        // In a real app, you might validte admin/system secret here if called via API

        const result = await extendSession(id, duration); // default 900s

        res.json({
            success: true,
            message: "Session extended",
            status: result.status,
            timeLeft: result.timeLeft,
            ...result
        });
    } catch (error) {
        console.error("[SessionController] Extend Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET SESSION DETAILS
 * GET /api/session/:id
 */
export const getSessionHandler = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await DesignerSession.findById(id);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Get time and status from Redis (Source of Truth for Active/Timer)
        const redis = (await import('../config/redis.js')).default;
        const timeLeftKey = `session:${id}:timeLeft`;
        const statusKey = `session:${id}:status`;

        let [timeLeft, redisStatus] = await Promise.all([
            redis.get(timeLeftKey),
            redis.get(statusKey)
        ]);

        // Use Redis status if available, fallback to DB
        const currentStatus = redisStatus || session.status;
        console.log(`[GetSession] Session: ${id}, DB Status: ${session.status}, Redis Status: ${redisStatus || 'N/A'}`);

        const pausedRemainingKey = `session:${id}:pausedRemaining`;

        // If not in Redis, calculate from session data or default to 0
        if (timeLeft === null) {
            if (currentStatus === 'Active') {
                const now = new Date();
                const start = session.startTime ? new Date(session.startTime) : null;
                if (!start) {
                    timeLeft = session.baseDuration || 900;
                } else {
                    // Use snapshot from DB, fallback to model default if somehow missing
                    const total = (session.baseDuration || 900) + (session.extendedDuration || 0);
                    const elapsed = (now - start) / 1000;
                    timeLeft = Math.max(0, Math.ceil(total - elapsed));
                }

                console.log(`[GetSession] Recalculating Active Time: Total=${total}s, Elapsed=${Math.round(elapsed)}s, Left=${timeLeft}s`);

                // Self-healing: Put back in Redis
                if (timeLeft > 0) {
                    await redis.set(timeLeftKey, timeLeft, 'EX', timeLeft + 300);
                    if (!redisStatus) await redis.set(statusKey, 'Active');
                }
            } else if (currentStatus === 'Paused') {
                const pausedVal = await redis.get(pausedRemainingKey);
                timeLeft = pausedVal ? parseInt(pausedVal, 10) : (session.baseDuration || 900);
                console.log(`[GetSession] Session Paused. Retrieved budget: ${timeLeft}s`);
            } else {
                timeLeft = 0;
            }
        } else {
            timeLeft = Math.max(0, parseInt(timeLeft, 10));
        }

        res.json({
            success: true,
            session: {
                _id: session._id,
                userId: session.userId,
                designerId: session.designerId,
                orderId: session.orderId,
                roomName: session.roomName,
                status: currentStatus,
                timeLeft,
                baseDuration: session.baseDuration,
                basePrice: session.basePrice,
                extensionDuration: session.extensionDuration,
                extensionPrice: session.extensionPrice,
                extendedDuration: session.extendedDuration,
                createdAt: session.createdAt,
            }
        });
    } catch (error) {
        console.error("[SessionController] Get Session Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * COMPLETE SESSION
 * POST /api/session/:id/complete
 */
export const completeSessionHandler = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await completeSession(id);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        res.json({
            success: true,
            status: "Completed",
            duration: session.totalDuration,
            amount: session.totalAmount
        });
    } catch (error) {
        console.error("[SessionController] Complete Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * PAUSE SESSION
 * POST /api/session/:id/pause
 */
export const pauseSessionHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await pauseSession(id);
        res.json({ success: true, message: "Session paused" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * RESUME SESSION
 * POST /api/session/:id/resume
 */
export const resumeSessionHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await resumeSession(id);
        res.json({ success: true, message: "Session resumed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * ADD ARTIFACT (Note, Chat, etc.)
 * POST /api/session/:id/artifact
 */
export const addArtifactHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content, userId, createdBy } = req.body;

        if (!['Note', 'Chat', 'Reference'].includes(type)) {
            return res.status(400).json({ message: "Invalid artifact type" });
        }

        const artifact = await SessionArtifact.create({
            sessionId: id,
            userId,
            createdBy,
            type,
            content
        });

        res.json({ success: true, artifact });
    } catch (error) {
        console.error("[SessionController] Add Artifact Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET ARTIFACTS
 * GET /api/session/:id/artifacts
 */
export const getArtifactsHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query;

        const query = { sessionId: id };
        if (type) query.type = type;

        const artifacts = await SessionArtifact.find(query).sort({ createdAt: 1 });

        res.json({ success: true, artifacts });
    } catch (error) {
        console.error("[SessionController] Get Artifacts Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};
