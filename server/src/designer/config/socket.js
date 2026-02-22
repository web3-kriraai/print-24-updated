import { Server } from "socket.io";

let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust this based on your security requirements
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        socket.on("join_room", (room) => {
            socket.join(room);
            console.log(`[Socket] User ${socket.id} joined room: ${room}`);
        });

        // Join Physical Booking Slot room
        socket.on("joinSlotRoom", ({ designerId, visitDate }) => {
            const roomName = `slots-${designerId}-${visitDate}`;
            socket.join(roomName);
            console.log(`[Socket] User ${socket.id} joined slot room: ${roomName}`);
        });

        // Handle Chat Message
        socket.on("send_message", async (data) => {
            try {
                const { sessionId, message, userId, createdBy, type = 'Chat' } = data;
                console.log(`[Socket] Message in session ${sessionId}:`, message);

                // Save to DB (Persistent History)
                const SessionArtifact = (await import("../models/SessionArtifact.js")).default;
                const artifact = await SessionArtifact.create({
                    sessionId,
                    userId,
                    createdBy,
                    type,
                    content: message
                });

                // Broadcast to room
                io.to(`session_${sessionId}`).emit("receive_message", {
                    ...data,
                    _id: artifact._id,
                    createdAt: artifact.createdAt
                });
            } catch (err) {
                console.error("[Socket] Message Error:", err.message);
            }
        });

        // Handle Designer Identity for Pause/Resume
        socket.on("register_designer", async (designerId) => {
            socket.designerId = designerId;
            console.log(`[Socket] Registered Designer ${designerId} on socket ${socket.id}`);

            // Auto-Resume if paused
            try {
                const { resumeDesignerSession } = await import("../services/pause.service.js");
                await resumeDesignerSession(designerId);
            } catch (err) {
                console.error("Auto-resume failed:", err.message);
            }
        });

        socket.on("disconnect", async () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);

            if (socket.designerId) {
                console.log(`[Socket] Designer ${socket.designerId} disconnected. Pausing session...`);
                // Dynamically import to avoid circular dependency issues if any
                const { pauseDesignerSession } = await import("../services/pause.service.js");
                await pauseDesignerSession(socket.designerId);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
