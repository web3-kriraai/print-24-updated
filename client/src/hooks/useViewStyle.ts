import { useState, useEffect } from 'react';
import axios from 'axios';
import { ThemeOverrides } from '../types/pms.types';

interface ViewStyleData {
    componentConfigs: Record<string, any>;
    themeOverrides: ThemeOverrides;
}

export const useViewStyle = (component: string) => {
    const [viewStyle, setViewStyle] = useState<ViewStyleData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchViewStyle = async () => {
            try {
                // This would fetch the view style for the current user's type
                // The endpoint would need to be implemented if not already available
                const response = await axios.get(`/api/user/view-style/${component}`);
                setViewStyle(response.data.data);
            } catch (error) {
                console.error('Error fetching view style:', error);
                // Use defaults if not found
                setViewStyle(null);
            } finally {
                setLoading(false);
            }
        };

        fetchViewStyle();
    }, [component]);

    return { viewStyle, loading };
};
