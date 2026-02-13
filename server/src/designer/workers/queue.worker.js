import { getNextUser, getNextDesigner, setDesignerOnline } from "../services/queue.service.js";
import { createSession } from "../services/session.service.js";

async function assignQueue() {
    const designerId = await getNextDesigner();
    if (!designerId) return;

    const userId = await getNextUser();
    if (!userId) {
        // No user waiting? Put designer back online immediately
        await setDesignerOnline(designerId);
        return;
    }

    console.log(`Assigning ${userId} → ${designerId}`);

    await createSession(userId, designerId);

    // TODO: emit websocket event SESSION_ASSIGNED
}

setInterval(assignQueue, 2000);
