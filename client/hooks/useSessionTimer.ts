import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, joinRoom, onSessionEvent, offSessionEvent } from '../lib/socketClient';
import { getSession, type DesignerSession } from '../lib/designerSessionApi';

interface UseSessionTimerProps {
    sessionId: string;
    roomName?: string;
}

interface UseSessionTimerReturn {
    timeLeft: number;
    session: DesignerSession | null;
    isLoading: boolean;
    error: string | null;
    refreshSession: () => Promise<void>;
}

/**
 * Custom hook for managing session timer with Socket.io synchronization
 */
export const useSessionTimer = ({ sessionId, roomName }: UseSessionTimerProps): UseSessionTimerReturn => {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [session, setSession] = useState<DesignerSession | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch session data from API
    const fetchSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getSession(sessionId);
            setSession(response.session);
            setTimeLeft(response.session.timeLeft);
        } catch (err) {
            console.error('[useSessionTimer] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch session');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    // Initialize session and Socket.io
    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    // Handle room joining and event subscriptions
    useEffect(() => {
        if (!session) return;

        // Auto-join room if we have it
        const currentRoom = roomName || session.roomName;
        if (currentRoom) {
            joinRoom(currentRoom);
            console.log(`[useSessionTimer] Joining room: ${currentRoom}`);
        }

        // Socket event handlers
        const handleSessionStarted = (data: any) => {
            if (data.sessionId !== sessionId) return;
            console.log('[useSessionTimer] SESSION_STARTED:', data);
            setTimeLeft(data.timeLeft);
            setSession(prev => prev ? { ...prev, status: 'Active' } : prev);
        };

        const handleSessionWarning = (data: any) => {
            if (data.sessionId && data.sessionId !== sessionId) return;
            console.log('[useSessionTimer] SESSION_WARNING:', data);
        };

        const handleSessionEnded = (data: any) => {
            if (data.sessionId !== sessionId) return;
            console.log('[useSessionTimer] SESSION_ENDED:', data);
            setTimeLeft(0);
            setSession(prev => prev ? { ...prev, status: 'Completed' } : prev);
        };

        const handleSessionResumed = (data: any) => {
            if (data.sessionId !== sessionId) return;
            console.log('[useSessionTimer] SESSION_RESUMED:', data);
            setTimeLeft(data.timeLeft);
            setSession(prev => prev ? { ...prev, status: 'Active' } : prev);
        };

        const handleSessionExtended = (data: any) => {
            if (data.sessionId !== sessionId) return;
            console.log('[useSessionTimer] SESSION_EXTENDED:', data);
            setTimeLeft(data.timeLeft);
            setSession(prev => prev ? { ...prev, status: 'Active' } : prev);
        };

        // Subscribe to events
        onSessionEvent('SESSION_STARTED', handleSessionStarted);
        onSessionEvent('SESSION_WARNING', handleSessionWarning);
        onSessionEvent('SESSION_ENDED', handleSessionEnded);
        onSessionEvent('SESSION_RESUMED', handleSessionResumed);
        onSessionEvent('SESSION_EXTENDED', handleSessionExtended);

        // Cleanup
        return () => {
            offSessionEvent('SESSION_STARTED', handleSessionStarted);
            offSessionEvent('SESSION_WARNING', handleSessionWarning);
            offSessionEvent('SESSION_ENDED', handleSessionEnded);
            offSessionEvent('SESSION_RESUMED', handleSessionResumed);
            offSessionEvent('SESSION_EXTENDED', handleSessionExtended);
        };
    }, [sessionId, session?.roomName, roomName]);

    // Local timer countdown (syncs with backend via Socket events)
    useEffect(() => {
        if (session?.status !== 'Active') {
            console.log(`[useSessionTimer] Countdown inactive. Status: ${session?.status}`);
            return;
        }

        console.log(`[useSessionTimer] Starting countdown for ${sessionId} at ${timeLeft}s`);
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    console.log('[useSessionTimer] Countdown finished.');
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            console.log('[useSessionTimer] Clearing countdown interval.');
            clearInterval(interval);
        };
    }, [session?.status, sessionId]); // Only restart if status or sessionId changes

    return {
        timeLeft,
        session,
        isLoading,
        error,
        refreshSession: fetchSession,
    };
};
