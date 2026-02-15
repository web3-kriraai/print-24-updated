import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserSegment from './src/models/UserSegment.js';

dotenv.config();

async function createAgentSegment() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        console.log('✅ Connected to MongoDB');

        const agentSegmentCode = 'AGENT';
        const existing = await UserSegment.findOne({ code: agentSegmentCode });

        const segmentData = {
            code: agentSegmentCode,
            name: 'Independent Agent',
            description: 'Independent agents who manage multiple clients and earn commissions',
            priority: 10,
            pricingTier: 1,
            isActive: true,
            isSystem: true,
            icon: '👤',
            color: '#4F46E5', // Indigo
            features: [
                {
                    featureKey: 'client_management',
                    isEnabled: true,
                    config: {
                        maxClients: 100,
                        orderOnBehalf: true,
                        commissionTracking: true
                    }
                },
                {
                    featureKey: 'bulk_order_upload',
                    isEnabled: true,
                    config: {}
                }
            ]
        };

        if (existing) {
            console.log(`⚠️ Segment '${agentSegmentCode}' already exists. Updating...`);
            await UserSegment.findByIdAndUpdate(existing._id, segmentData);
            console.log('✅ Segment updated successfully');
        } else {
            console.log(`🌱 Creating segment '${agentSegmentCode}'...`);
            await UserSegment.create(segmentData);
            console.log('✅ Segment created successfully');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating agent segment:', error);
        process.exit(1);
    }
}

createAgentSegment();
