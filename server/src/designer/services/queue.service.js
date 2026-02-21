import redis from "../config/redis.js";

const QUEUE_KEY = "live_queue";
const DESIGNERS_KEY = "designers_available";

/* ADD USER TO QUEUE */
export async function addUserToQueue(userId, tier = "basic") {
    const priorityScore = tier === "premium" ? 10 : 100;

    await redis.zadd(QUEUE_KEY, priorityScore, userId);

    await redis.hmset(`queue:user:${userId}`, {
        userId,
        tier,
        joinedAt: Date.now(),
        status: "waiting",
    });

    return true;
}

/* REMOVE USER */
export async function removeUserFromQueue(userId) {
    await redis.zrem(QUEUE_KEY, userId);
    await redis.del(`queue:user:${userId}`);
}

/* GET NEXT USER */
export async function getNextUser() {
    const users = await redis.zrange(QUEUE_KEY, 0, 0);

    if (!users.length) return null;

    const userId = users[0];
    await redis.zrem(QUEUE_KEY, userId);

    return userId;
}

/* DESIGNER ONLINE */
export async function setDesignerOnline(designerId) {
    await redis.sadd(DESIGNERS_KEY, designerId);
}

/* DESIGNER OFFLINE */
export async function setDesignerOffline(designerId) {
    await redis.srem(DESIGNERS_KEY, designerId);
}

/* ROUND ROBIN DESIGNER */
export async function getNextDesigner() {
    const designers = await redis.smembers(DESIGNERS_KEY);

    if (!designers.length) return null;

    let index = await redis.get("designer_rr_index");
    index = index ? parseInt(index) : 0;

    const designer = designers[index % designers.length];

    /* Mark designer as BUSY by removing from available set */
    await redis.srem(DESIGNERS_KEY, designer);

    /* Update RR index */
    await redis.set("designer_rr_index", index + 1);

    return designer;
}
