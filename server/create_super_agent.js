import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import UserSegment from './src/models/UserSegment.js';
import bcrypt from 'bcrypt';

dotenv.config();

async function createSuperAgent() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        console.log('✅ Connected to MongoDB');

        const hashedPassword = await bcrypt.hash('password123', 10);
        const agentSegment = await UserSegment.findOne({ code: 'AGENT' });

        await User.deleteMany({ email: 'super_agent@print24.com' });

        const user = await User.create({
            name: 'Super Agent',
            email: 'super_agent@print24.com',
            password: hashedPassword,
            role: 'agent',
            approvalStatus: 'approved',
            userSegment: agentSegment._id
        });

        console.log(`✅ Super Agent created: ${user.email}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating super agent:', error);
        process.exit(1);
    }
}

createSuperAgent();
