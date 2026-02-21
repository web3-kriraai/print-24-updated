import { getAuthHeaders, API_BASE_URL_WITH_API as API_BASE_URL } from './apiConfig';

export interface DesignerSession {
    _id: string;
    userId: string;
    designerId: string;
    orderId?: string;
    roomName: string;
    status: 'Scheduled' | 'Active' | 'Completed' | 'Cancelled';
    timeLeft: number;
    totalDuration: number;
    totalAmount: number;
    ratePerMinute: number;
    baseDuration: number;
    basePrice: number;
    extensionDuration: number;
    extensionPrice: number;
    extendedDuration: number;
    transactions: Array<{
        paymentId: string;
        amount: number;
        addedDuration: number;
        timestamp: string;
    }>;
    createdAt: string;
}

export interface SessionResponse {
    success: boolean;
    session: DesignerSession;
}

export interface StartSessionResponse {
    success: boolean;
    sessionId: string;
    roomName: string;
    status: string;
    timeLeft: number;
    userToken: string;
    designerToken: string;
}

export interface ExtendSessionResponse {
    success: boolean;
    message: string;
    newTime?: number;
    skipped?: boolean;
}

export interface CompleteSessionResponse {
    success: boolean;
    status: string;
    duration: number;
    amount: number;
}

/**
 * Get session details
 */
export const getSession = async (sessionId: string): Promise<SessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Start a session
 */
export const startSession = async (sessionId: string): Promise<StartSessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/session/start`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
    }

    return response.json();
};

/**
 * Extend a session (pay-to-extend)
 */
export const extendSession = async (
    sessionId: string,
    duration: number = 900,
    paymentId?: string,
    amount?: number
): Promise<ExtendSessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/extend`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ duration, paymentId, amount }),
    });

    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || response.statusText;
        } catch (e) { /* ignore json parse error */ }
        throw new Error(errorMessage);
    }

    return response.json();
};

/**
 * Complete a session
 */
export const completeSession = async (sessionId: string): Promise<CompleteSessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error(`Failed to complete session: ${response.statusText}`);
    }

    return response.json();
};

export const addArtifact = async (
    sessionId: string,
    type: 'Note' | 'Chat' | 'Reference',
    content: string,
    userId: string,
    createdBy: string
) => {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/artifact`, {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, content, userId, createdBy }),
    });

    if (!response.ok) {
        throw new Error('Failed to add artifact');
    }
    return response.json();
};

export const getArtifacts = async (
    sessionId: string,
    type?: 'Note' | 'Chat' | 'Reference'
) => {
    const url = new URL(`${API_BASE_URL}/session/${sessionId}/artifacts`);
    if (type) url.searchParams.append('type', type);

    const response = await fetch(url.toString(), {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch artifacts');
    }
    return response.json();
};
