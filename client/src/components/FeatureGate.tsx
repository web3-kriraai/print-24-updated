import React from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

interface FeatureGateProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
    feature,
    children,
    fallback = null
}) => {
    const { hasFeature, loading } = useFeatureFlags();

    if (loading) return null;

    if (!hasFeature(feature)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default FeatureGate;
