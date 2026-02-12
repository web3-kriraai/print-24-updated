import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';
import { UserData } from '../types';

interface AuthContextType {
    user: UserData | null;
    loading: boolean;
    login: (token: string, userData: UserData) => Promise<void>;
    logout: () => void;
    updateUser: (userData: UserData) => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            // First set from local storage for immediate UI
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    console.error('Error parsing saved user:', e);
                }
            }

            await refreshUser();
            setLoading(false);
        };

        initAuth();
    }, []); // Run only once on mount

    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL_WITH_API}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const freshUser = data.user || data;
                setUser(freshUser);
                localStorage.setItem('user', JSON.stringify(freshUser));
                // Dispatch event for any non-context listeners (legacy support)
                window.dispatchEvent(new Event('user-updated'));
            } else if (response.status === 401) {
                logout();
            }
        } catch (error) {
            console.error('Error refreshing user profile:', error);
        }
    };

    const login = async (token: string, userData: UserData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);

        // Immediately fetch fresh profile to ensure image and other data is the latest
        await refreshUser();
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/login');
    };

    const updateUser = (userData: UserData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        // Dispatch event for any non-context listeners (legacy support)
        window.dispatchEvent(new Event('user-updated'));
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            updateUser,
            refreshUser,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
