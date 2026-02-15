import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Feature from './src/models/Feature.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24';

const agentFeature = {
    key: 'client_management',
    name: 'Client Management',
    description: 'Manage clients, place orders on their behalf, and track commissions',
    category: 'AGENTS',
    subcategory: 'CLIENT_MANAGEMENT',
    isActive: true,
    isBeta: false,
    isPremium: true,
    icon: '👥',
    sortOrder: 110,
    configSchema: {
        type: 'object',
        properties: {
            maxClients: {
                type: 'number',
                description: 'Maximum number of clients an agent can manage',
                default: 50
            },
            orderOnBehalf: {
                type: 'boolean',
                description: 'Allow placing orders on behalf of clients',
                default: true
            },
            commissionTracking: {
                type: 'boolean',
                description: 'Enable commission tracking on client orders',
                default: true
            }
        }
    }
};

async function seedAgentFeature() {
    try {
        console.log('🌱 Connecting to database...');
        console.log('URI Prefix:', MONGODB_URI.substring(0, 20) + '...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await Feature.findOne({ key: agentFeature.key });

        if (existing) {
            console.log(`⚠️ Feature '${agentFeature.key}' already exists. Updating...`);
            await Feature.findByIdAndUpdate(existing._id, agentFeature);
            console.log('✅ Feature updated successfully');
        } else {
            console.log(`🌱 Creating feature '${agentFeature.key}'...`);
            await Feature.create(agentFeature);
            console.log('✅ Feature created successfully');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding agent feature:', error);
        process.exit(1);
    }
}

seedAgentFeature();
