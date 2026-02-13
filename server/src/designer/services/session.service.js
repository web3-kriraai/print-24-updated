import DesignerSession from '../models/DesignerSession.js';
import { v4 as uuidv4 } from 'uuid';

export async function createSession(userId, designerId) {
    console.log("➡️ createSession running");

    const roomName = `session_${uuidv4()}`;

    const session = await DesignerSession.create({
        userId,
        designerId,
        roomName
    });

    return session;
}

export async function activateSession(sessionId) {
    return DesignerSession.findByIdAndUpdate(
        sessionId,
        { status: 'Active', startTime: new Date() },
        { new: true }
    );
}

export async function completeSession(sessionId) {
    return DesignerSession.findByIdAndUpdate(
        sessionId,
        { status: 'Completed', endTime: new Date() },
        { new: true }
    );
}