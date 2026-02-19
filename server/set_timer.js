import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_ID = process.argv[2];
const TIME_LEFT = process.argv[3]; // in seconds

if (!SESSION_ID || !TIME_LEFT) {
    console.log("Usage: node set_timer.js <sessionId> <seconds>");
    process.exit(1);
}

const run = async () => {
    try {
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

        const key = `session:${SESSION_ID}:timeLeft`;
        await redis.set(key, TIME_LEFT);

        console.log(`Updated timer for session ${SESSION_ID} to ${TIME_LEFT} seconds.`);
        console.log("👉 PLEASE REFRESH YOUR BROWSER PAGE TO SEE THE CHANGE.");

        redis.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

run();
