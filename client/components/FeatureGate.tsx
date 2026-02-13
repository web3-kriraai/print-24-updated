import React, { useEffect, useState } from 'react';

interface FeatureGateProps {
    feature?: string;           // Single feature key
    features?: string[];        // Multiple features  
    mode?: 'all' | 'any';      // For multiple features: all or any
    fallback?: React.ReactNode; // What to show if no access
    children: React.ReactNode;
    showLoader?: boolean;       // Show loader while checking
}

/**
 * FeatureGate Component
 * 
 * Wraps content and only displays if user has required feature access.
 * Checks user's segment features + any user-specific overrides.
 * 
 * Usage:
 * - <FeatureGate feature="bulk_order_upload">...</FeatureGate>
 * - <FeatureGate features={["feature1", "feature2"]} mode="any">...</FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({
    feature,
    features = [],
    mode = 'all',
    fallback = null,
    children,
    showLoader = false
}) => {
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAccess();
    }, [feature, features]);

    const checkAccess = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');

            if (!token) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            // Build feature list
            const featureList = feature ? [feature] : features;

            if (featureList.length === 0) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            // Check each feature
            const checks = await Promise.all(
                featureList.map(async (f) => {
                    try {
                        const response = await fetch(`/api/user/check-feature?feature=${f}`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return false;
                        }

                        const data = await response.json();
                        return data.hasFeature || false;
                    } catch (error) {
                        console.error(`FeatureGate check error for ${f}:`, error);
                        return false;
                    }
                })
            );

            // Determine access based on mode
            const access = mode === 'all'
                ? checks.every(c => c === true)
                : checks.some(c => c === true);

            setHasAccess(access);
        } catch (error) {
            console.error('FeatureGate error:', error);
            setHasAccess(false);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        if (showLoader) {
            return (
                <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            );
        }
        return null; // Silent loading
    }

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default FeatureGate;
