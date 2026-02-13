import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redis.on('connect', () => {
    console.log('[Redis] ✅ Connecting to server...');
});

redis.on('ready', () => {
    console.log('[Redis] 🚀 Client ready and connected');
});

redis.on('error', (err) => {
    console.error('[Redis] ❌ Connection error:', err.message);
});

redis.on('end', () => {
    console.log('[Redis] 🔌 Connection closed');
});

export default redis;
