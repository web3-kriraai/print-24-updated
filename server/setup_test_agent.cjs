const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./src/models/User.js');
const bcrypt = require('bcrypt');

async function setupTestData() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        console.log('Connected to MongoDB');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Clean up
        await User.deleteMany({ email: { $in: ['test_agent@print24.com', 'test_client@print24.com'] } });

        // Create client
        const client = await User.create({
            name: 'Test Client',
            email: 'test_client@print24.com',
            password: hashedPassword,
            role: 'user',
            pincode: '400001',
            address: '123 Client St',
            mobileNumber: '9876543210',
            approvalStatus: 'approved'
        });

        // Create agent
        const agent = await User.create({
            name: 'Test Agent',
            email: 'test_agent@print24.com',
            password: hashedPassword,
            role: 'agent',
            approvalStatus: 'approved',
            features: ['client_management'],
            featureOverrides: [{
                featureKey: 'client_management',
                isEnabled: true
            }],
            clients: [client._id]
        });

        console.log(`CREDENTIALS_CREATED:Agent=${agent.email},Client=${client.email},Password=password123`);
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setupTestData();
