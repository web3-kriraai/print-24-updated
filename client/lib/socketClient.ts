import { io, Socket } from 'socket.io-client';

import { API_BASE_URL } from './apiConfig';

const SOCKET_URL = API_BASE_URL;

let socket: Socket | null = null;

export interface SessionEvents {
    SESSION_STARTED: { sessionId: string; startTime: string; timeLeft: number };
    SESSION_WARNING: { message: string; timeLeft: number };
    SESSION_ENDED: { sessionId: string; duration: number; amount: number };
    SESSION_EXTENDED: { sessionId: string; timeLeft: number; added: number };
}

/**
 * Get or create Socket.io connection
 */
export const getSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });
    }

    return socket;
};

/**
 * Get the current socket ID
 */
export const getSocketId = (): string | null => {
    return socket?.id || null;
};

/**
 * Join a session room
 */
export const joinRoom = (roomName: string): void => {
    const sock = getSocket();
    sock.emit('join_room', roomName);
    console.log('[Socket] Joined room:', roomName);
};

/**
 * Register as a designer
 */
export const registerDesigner = (designerId: string): void => {
    const sock = getSocket();
    sock.emit('register_designer', designerId);
    console.log('[Socket] Registered designer:', designerId);
};

/**
 * Join a specific slot room for real-time updates
 */
export const joinSlotRoom = (designerId: string, visitDate: string): void => {
    const sock = getSocket();
    sock.emit('joinSlotRoom', { designerId, visitDate });
    console.log(`[Socket] Requested to join slot room: slots-${designerId}-${visitDate}`);
};

/**
 * Send a chat message
 */
export const sendMessage = (data: { sessionId: string; message: string; userId: string; createdBy: string; type?: string }): void => {
    const sock = getSocket();
    sock.emit('send_message', data);
};

/**
 * Subscribe to chat messages
 */
export const onMessage = (callback: (message: any) => void): void => {
    const sock = getSocket();
    sock.on('receive_message', callback);
};

/**
 * Unsubscribe from chat messages
 */
export const offMessage = (callback?: (message: any) => void): void => {
    const sock = getSocket();
    if (callback) {
        sock.off('receive_message', callback);
    } else {
        sock.off('receive_message');
    }
};

/**
 * Subscribe to a session event
 */
export const onSessionEvent = (
    event: string,
    callback: (...args: any[]) => void
): void => {
    const sock = getSocket();
    sock.on(event, callback);
};

/**
 * Unsubscribe from a session event
 */
export const offSessionEvent = (
    event: string,
    callback?: (...args: any[]) => void
): void => {
    const sock = getSocket();
    if (callback) {
        sock.off(event, callback);
    } else {
        sock.off(event);
    }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[Socket] Disconnected manually');
    }
};
