import React from 'react';
import { useUserPrivileges } from '../../hooks/useUserPrivileges';

interface PrivilegeGateProps {
    resource: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showFallback?: boolean;
}

export const PrivilegeGate: React.FC<PrivilegeGateProps> = ({
    resource,
    action,
    children,
    fallback = null,
    showFallback = false,
}) => {
    const { hasPrivilege, loading } = useUserPrivileges();

    if (loading) {
        return showFallback ? <>{fallback}</> : null;
    }

    if (!hasPrivilege(resource, action)) {
        return showFallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};
