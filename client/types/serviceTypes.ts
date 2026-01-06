// Service Types
export interface ServiceItem {
    type: 'product' | 'category' | 'subcategory';
    id: string;
    sortOrder: number;
    data?: {
        _id: string;
        name: string;
        image?: string;
        description?: string;
    };
}

export interface ServiceTitle {
    _id?: string;
    title: string;
    description: string;
    sortOrder: number;
    items: ServiceItem[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Service {
    _id: string;
    name: string;
    description: string;
    color: string;
    sortOrder: number;
    bannerImage: string;
    titles: ServiceTitle[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateServiceData {
    name: string;
    description: string;
    color?: string;
    sortOrder?: number;
    bannerImage?: string;
    titles?: Omit<ServiceTitle, '_id' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdateServiceData extends Partial<CreateServiceData> {
    isActive?: boolean;
}

export interface ServiceOrderUpdate {
    id: string;
    sortOrder: number;
}
