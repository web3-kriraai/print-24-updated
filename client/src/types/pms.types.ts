export interface UserType {
    _id: string;
    name: string;
    code: string;
    displayName?: string;
    description?: string;
    pricingTier: number;
    parentType?: string | UserType;
    inheritFromParent: boolean;
    privilegeBundleIds: string[];
    permissions: Permission[];
    limits: UserTypeLimits;
    territoryRestrictions: string[];
    productCategoryRestrictions: string[];
    autoApproveSignup: boolean;
    maxUsersAllowed: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Permission {
    resource: string;
    actions: string[];
}

export interface UserTypeLimits {
    maxOrdersPerDay?: number;
    maxClients?: number;
    maxCreditLimit?: number;
    allowedPaymentTerms?: string[];
}

export interface PrivilegeBundle {
    _id: string;
    name: string;
    code: string;
    description?: string;
    privileges: Permission[];
    assignedToUserTypes: string[];
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface ViewStyle {
    _id: string;
    name: string;
    code: string;
    description?: string;
    previewUrl?: string;
    componentConfigs: Record<string, any>;
    themeOverrides: ThemeOverrides;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ThemeOverrides {
    colors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        background?: string;
        text?: string;
    };
    typography?: {
        fontFamily?: string;
        fontSize?: string;
    };
    layout?: {
        borderRadius?: string;
        spacing?: string;
    };
    customCSS?: string;
}

export interface ResourceRegistry {
    _id: string;
    resource: string;
    displayName: string;
    description?: string;
    actions: string[];
    category: string;
    isSystem: boolean;
    isActive: boolean;
}

export interface FeatureFlag {
    _id: string;
    key: string;
    name: string;
    description?: string;
    component: string;
    defaultValue: boolean;
    enabledForTypes: string[];
    isGlobal: boolean;
    isActive: boolean;
}

export interface AuditLog {
    _id: string;
    action: 'created' | 'updated' | 'deleted' | 'assigned' | 'unassigned' | 'toggled';
    resourceType: string;
    resourceId: string;
    resourceName: string;
    changes: {
        before: any;
        after: any;
        diff: any;
    };
    changedBy: string;
    changedByName: string;
    changedByEmail: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    timestamp: string;
}
