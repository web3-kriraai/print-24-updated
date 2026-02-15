const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const { User } = require('./src/models/User.js');

async function checkUserSegment() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        const users = await User.find({ role: 'agent' }).populate('userSegment');
        let output = 'AGENT_SEGMENTS:\n';
        users.forEach(u => {
            output += `- User: ${u.email}, Segment: ${u.userSegment ? u.userSegment.name : 'NONE'}, Features: ${JSON.stringify(u.features)}\n`;
        });
        fs.writeFileSync('user_segment_debug.txt', output);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUserSegment();
