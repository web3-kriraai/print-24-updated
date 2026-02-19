import mongoose from 'mongoose';
import DesignerSession from './src/designer/models/DesignerSession.js';

const MONGO_URI = "mongodb+srv://print24:XdTuxSHbxpp6JAUt@cluster0.azagder.mongodb.net/";

const listSessions = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const sessions = await DesignerSession.find().sort({ createdAt: -1 }).limit(5);

        console.log('\n--- Recent Sessions ---');
        sessions.forEach(s => {
            console.log(s._id.toString());
            console.log(s.baseDuration);
        });
        console.log('-----------------------\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

listSessions();
