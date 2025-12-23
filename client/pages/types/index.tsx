// types/index.ts
export interface ServiceItem {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
  }
  
  export interface Category {
    _id: string;
    name: string;
    description: string;
    image: string;
    type?: string;
    sortOrder?: number;
    createdAt: string;
    updatedAt: string;
    __v: number;
  }
  
  export interface Review {
    _id: string;
    user: {
      _id: string;
      name: string;
      email: string;
    };
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
    updatedAt: string;
  }