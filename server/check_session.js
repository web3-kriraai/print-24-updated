import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DesignerSession from './src/designer/models/DesignerSession.js';

dotenv.config();

const SESSION_ID = process.argv[2];

if (!SESSION_ID) {
    console.log("Usage: node check_session.js <sessionId>");
    process.exit(1);
}

async function checkSession() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const session = await DesignerSession.findById(SESSION_ID);
        if (!session) {
            console.log("Session not found in DB.");
        } else {
            console.log("--- Session Details ---");
            console.log("ID:", session._id);
            console.log("Status:", session.status);
            console.log("Room:", session.roomName);
            console.log("UserId:", session.userId);
            console.log("DesignerId:", session.designerId);
            console.log("Paid Status:", session.paymentStatus);
            console.log("-----------------------");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkSession();
