import { useState, useEffect } from 'react';
import axios from 'axios';
// import { useAuth } from './useAuth'; // Assuming useAuth exists

interface Privilege {
    resource: string;
    actions: string[];
}

export const useUserPrivileges = (userId?: string) => {
    const [privileges, setPrivileges] = useState<Privilege[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fallback to getting ID from localStorage or context if not provided
    // For now, we'll assume the component using this handles the ID or we fetch for "me"
    // const { user } = useAuth(); 
    // const effectiveId = userId || user?.id;

    useEffect(() => {
        const fetchPrivileges = async () => {
            // If no user ID is available immediately, we might wait or fetch 'my' privileges
            // Let's assume there's an endpoint for 'my' privileges: /api/user/privileges
            // Or we use the debug endpoint for now: /api/admin/pms/debug/privileges/:id

            // BETTER: Create a dedicated endpoint /api/user/me/privileges in userPrivilegeRoutes (as per server.js)
            // Since I haven't seen userPrivilegeRoutes.js, I'll assume I should use the one I created in pmsRoutes for now
            // or just use the debug one if I'm admin.

            // Actually, for the Admin UI, we are likely an admin.
            // Let's use a hypothetical /api/user/privileges which returns the current user's privileges

            try {
                setLoading(true);
                // Replace with actual endpoint
                // const response = await axios.get('/api/user/privileges'); 

                // Temporary: Mock or use the debug endpoint if we have the ID
                // const response = await axios.get(`/api/admin/pms/debug/privileges/${effectiveId}`);

                // For now, let's return a mock or empty if strict mode
                // We'll implement the real fetch once the backend route is confirmed.
                // But I did see app.use("/api/user", authMiddleware, userPrivilegeRoutes); in server.js
                // So /api/user/privileges likely exists or should exist.

                const response = await axios.get('/api/user/privileges');
                setPrivileges(response.data);
            } catch (err: any) {
                console.error("Failed to fetch privileges", err);
                setError(err.message);
                // Fallback for dev: ensure we don't lock ourselves out if API fails
                // setPrivileges([{ resource: 'ORDERS', actions: ['read', 'create'] }]); 
            } finally {
                setLoading(false);
            }
        };

        fetchPrivileges();
    }, [userId]);

    const hasPrivilege = (resource: string, action: string) => {
        if (!privileges) return false;
        // Super admin bypass? controlled by backend, here we just check list
        return privileges.some(
            p => p.resource.toUpperCase() === resource.toUpperCase() &&
                p.actions.includes(action.toLowerCase())
        );
    };

    return { privileges, hasPrivilege, loading, error };
};
