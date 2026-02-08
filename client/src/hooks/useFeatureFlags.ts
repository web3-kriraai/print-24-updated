import { useState, useEffect } from 'react';
import axios from 'axios';

interface FeatureFlag {
    key: string;
    name: string;
    // ... other fields
}

export const useFeatureFlags = () => {
    const [features, setFeatures] = useState<string[]>([]); // Array of enabled feature keys
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeatures = async () => {
            try {
                setLoading(true);
                // Endpoint to get my enabled features
                const response = await axios.get('/api/user/features');
                // Assuming response structure: { enabledFeatures: ['FEATURE_A', 'FEATURE_B'] }
                setFeatures(response.data.enabledFeatures || []);
            } catch (err) {
                console.error("Failed to fetch feature flags", err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeatures();
    }, []);

    const hasFeature = (key: string) => {
        return features.includes(key);
    };

    return { features, hasFeature, loading };
};
