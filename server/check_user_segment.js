import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import UserSegment from './src/models/UserSegment.js';

dotenv.config();

async function checkUserSegment() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        const users = await User.find({ role: 'agent' }).populate('userSegment');
        let output = 'AGENT_SEGMENTS:\n';
        users.forEach(u => {
            output += `- User: ${u.email}, Segment: ${u.userSegment ? u.userSegment.name : 'NONE'}, Features: ${JSON.stringify(u.features)}\n`;
        });
        fs.writeFileSync('user_segment_debug.txt', output);
        console.log('✅ Check completed. Results in user_segment_debug.txt');
        process.exit(0);
    } catch (err) {
        console.error('❌ Check failed:', err);
        process.exit(1);
    }
}

checkUserSegment();
