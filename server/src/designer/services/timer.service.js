import redis from '../config/redis.js';

export async function startTimer(sessionId, roomName, durationSeconds) {
    console.log("➡️ startTimer called");

    const expiresAt = Date.now() + durationSeconds * 1000;

    await redis.set(`session:${sessionId}:expires_at`, expiresAt);
    await redis.set(`session:${sessionId}:room`, roomName);
}

export async function extendTimer(sessionId, extraSeconds) {
    const key = `session:${sessionId}:expires_at`;
    const current = await redis.get(key);

    if (!current) return;

    const newTime = parseInt(current) + (extraSeconds * 1000);
    await redis.set(key, newTime);
}
