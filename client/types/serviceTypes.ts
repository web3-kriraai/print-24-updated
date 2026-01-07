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

export interface BannerDecorativeElement {
    shape: 'circle' | 'square' | 'triangle' | 'star' | 'hexagon';
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    size: number;
    color: string;
    animation: 'float' | 'pulse' | 'spin' | 'none';
}

export interface BannerSecondaryIcon {
    icon: string;
    position: 'left' | 'right' | 'center';
    size: number;
}

export interface BannerColorPalette {
    color: string;
    name?: string;
}

export interface BannerIconConfig {
    icon: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    size: number;
    color?: string;
    animation?: 'float' | 'pulse' | 'none';
}

export interface BannerConfig {
    // Legacy fields
    title: string;
    subtitle: string;
    highlightText: string;
    // Four dynamic text sections
    textSection1?: string;
    textSection2?: string;
    textSection3?: string;
    textSection4?: string;
    mainIcon?: string;
    secondaryIcons: BannerSecondaryIcon[];
    decorativeElements: BannerDecorativeElement[];
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    colorPalette: BannerColorPalette[];
    defaultShape?: 'circle' | 'square' | 'triangle' | 'star' | 'hexagon' | 'random';
    defaultShapeSize?: number;
    showIcons: boolean;
    iconPositions: BannerIconConfig[];
}

export interface Service {
    _id: string;
    name: string;
    description: string;
    color: string;
    sortOrder: number;
    bannerImage: string;
    icon?: string;
    navbarIcon?: string;
    serviceHeading?: string;
    serviceDescription?: string;
    bannerConfig?: BannerConfig;
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
    icon?: string;
    navbarIcon?: string;
    serviceHeading?: string;
    serviceDescription?: string;
    bannerConfig?: BannerConfig;
    titles?: Omit<ServiceTitle, '_id' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdateServiceData extends Partial<CreateServiceData> {
    isActive?: boolean;
}

export interface ServiceOrderUpdate {
    id: string;
    sortOrder: number;
}
