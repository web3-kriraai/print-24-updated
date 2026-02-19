import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DesignerSession from './src/designer/models/DesignerSession.js';
import Redis from 'ioredis';

dotenv.config();

const SESSION_ID = process.argv[2];

if (!SESSION_ID) {
    console.log("Usage: node reset_session.js <sessionId>");
    process.exit(1);
}

async function resetSession() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await DesignerSession.updateOne(
            { _id: SESSION_ID },
            {
                $set: {
                    status: 'Scheduled',
                    totalDuration: 0,
                    totalAmount: 0,
                    endTime: null,
                    startTime: null,
                    extendedDuration: 0,
                    transactions: []
                }
            }
        );

        console.log(`Session ${SESSION_ID} reset result:`, result);

        // Also clean up Redis keys
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        await redis.del(`session:${SESSION_ID}:timeLeft`);
        await redis.del(`session:${SESSION_ID}:status`);
        console.log('Redis keys cleared');
        redis.disconnect();

    } catch (error) {
        console.error('Reset failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetSession();
