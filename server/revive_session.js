import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DesignerSession from './src/designer/models/DesignerSession.js';

// dotenv.config(); 
const MONGO_URI = "mongodb+srv://print24:XdTuxSHbxpp6JAUt@cluster0.azagder.mongodb.net/";
const SESSION_ID = process.argv[2];

if (!SESSION_ID) {
    console.error("Please provide a session ID");
    process.exit(1);
}

const reviveSession = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const session = await DesignerSession.findById(SESSION_ID);
        if (!session) {
            console.error('Session not found');
            process.exit(1);
        }

        console.log(`Current Status: ${session.status}`);
        console.log(`Current EndTime: ${session.endTime}`);

        // Reset to Active with 3 minutes (Test)
        session.status = 'Active';
        session.startTime = new Date(); // Reset start time so self-healing works
        session.baseDuration = 180; // 3 minutes
        session.extendedDuration = 0;
        session.endTime = undefined;

        await session.save();

        console.log(`\n✅ Session ${SESSION_ID} revived for testing!`);
        console.log(`New Status: ${session.status}`);
        console.log(`Duration: 3 minutes (180s)`);
        console.log(`\n👉 Go back to the browser and REFRESH the page.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

reviveSession();
