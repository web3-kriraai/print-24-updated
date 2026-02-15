import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/User.js';
import UserSegment from './src/models/UserSegment.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24';

async function migrateAgents() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const agentSegment = await UserSegment.findOne({ code: 'AGENT' });
        if (!agentSegment) {
            console.error('❌ AGENT segment not found. Run create_agent_segment.js first.');
            process.exit(1);
        }

        console.log(`Searching for users with role "agent"...`);
        const agents = await User.find({ role: 'agent' });
        console.log(`Found ${agents.length} users to migrate.`);

        for (const agent of agents) {
            console.log(`Migrating ${agent.email}: role -> user, segment -> AGENT`);
            agent.role = 'user';
            agent.userSegment = agentSegment._id;
            await agent.save();
        }

        console.log('✅ Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateAgents();
