import React from 'react';
import { useUserPrivileges } from '../hooks/useUserPrivileges';

interface PrivilegeGateProps {
    resource: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const PrivilegeGate: React.FC<PrivilegeGateProps> = ({
    resource,
    action,
    children,
    fallback = null
}) => {
    const { hasPrivilege, loading } = useUserPrivileges();

    if (loading) return null; // or <Skeleton />

    if (!hasPrivilege(resource, action)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default PrivilegeGate;
