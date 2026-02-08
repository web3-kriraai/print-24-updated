import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface ComponentConfig {
    layout?: string;
    columns?: string[];
    showFilters?: boolean;
    [key: string]: any;
}

interface ViewStyleContextType {
    viewConfig: Record<string, ComponentConfig>;
    getComponentConfig: (component: string) => ComponentConfig;
    loading: boolean;
}

const ViewStyleContext = createContext<ViewStyleContextType | undefined>(undefined);

export const ViewStyleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [viewConfig, setViewConfig] = useState<Record<string, ComponentConfig>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchViewConfig();
    }, []);

    const fetchViewConfig = async () => {
        try {
            // Fetch user's view configuration from backend
            const response = await axios.get('/api/user/view-config');
            setViewConfig(response.data.componentConfigs || {});
        } catch (error) {
            console.error('Failed to fetch view config:', error);
            // Fall back to default configuration
            setViewConfig({
                DASHBOARD: { layout: 'grid', widgets: ['stats', 'recent_orders'] },
                ORDERS: { layout: 'table', columns: ['id', 'date', 'customer', 'total', 'status'] },
                PRODUCTS: { layout: 'grid', showFilters: true },
            });
        } finally {
            setLoading(false);
        }
    };

    const getComponentConfig = (component: string): ComponentConfig => {
        return viewConfig[component] || {};
    };

    return (
        <ViewStyleContext.Provider value={{ viewConfig, getComponentConfig, loading }}>
            {children}
        </ViewStyleContext.Provider>
    );
};

export const useViewStyleContext = () => {
    const context = useContext(ViewStyleContext);
    if (context === undefined) {
        throw new Error('useViewStyleContext must be used within a ViewStyleProvider');
    }
    return context;
};

export default ViewStyleContext;
