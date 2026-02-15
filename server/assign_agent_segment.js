import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import UserSegment from './src/models/UserSegment.js';

dotenv.config();

async function assignAgentSegment() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        console.log('✅ Connected to MongoDB');

        const agentSegment = await UserSegment.findOne({ code: 'AGENT' });
        if (!agentSegment) {
            console.error('❌ Agent segment not found. Please run create_agent_segment.js first.');
            process.exit(1);
        }

        const result = await User.updateMany(
            { role: 'agent' },
            { $set: { userSegment: agentSegment._id } }
        );

        console.log(`✅ Updated ${result.modifiedCount} users to the AGENT segment.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error assigning agent segment:', error);
        process.exit(1);
    }
}

assignAgentSegment();
