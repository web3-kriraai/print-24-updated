import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotFound from '../pages/NotFound';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

/**
 * ProtectedRoute Component
 * 
 * Handles authentication and role-based authorization for routes.
 * If user is not logged in, redirects to login page.
 * If user is logged in but role is not allowed, shows 404 page.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Show 404 (NotFound) if user role is not authorized
        return <NotFound />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
