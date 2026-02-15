const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const UserSegmentSchema = new mongoose.Schema({
    name: String,
    code: String,
    features: Array
});
const UserSegment = mongoose.model('UserSegment', UserSegmentSchema, 'usersegments');

async function listSegments() {
    try {
        await mongoose.connect(process.env.MONGO_URI_PRICING || 'mongodb://localhost:27017/print24');
        const segments = await UserSegment.find({});
        let output = 'SEGMENTS_LIST:\n';
        segments.forEach(s => {
            output += `- Name: ${s.name}, Code: ${s.code}, Features: ${JSON.stringify(s.features?.map(f => f.featureKey))}\n`;
        });
        fs.writeFileSync('segments_debug.txt', output);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listSegments();
