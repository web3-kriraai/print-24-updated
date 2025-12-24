import { LucideIcon } from 'lucide-react';

export interface ServiceItem {
  title: string;
  description: string;
  icon: LucideIcon;
  id: string;
}

export interface Template {
  id: string;
  title: string;
  imageUrl: string;
  category: string;
  price: string;
  dimensions?: { width: number; height: number; unit: string };
}

export interface ProductType {
  id: string;
  title: string;
  description: string;
  basePrice: number; // Base price per unit
  imageUrl: string;
  features: string[];
  defaultFinish: string;
}

export interface NavItem {
  label: string;
  path: string;
}

export type CardShape = 'Standard' | 'Square' | 'Round' | 'Custom';
export type CardFinish = 'Glossy' | 'Matte' | 'Velvet' | 'Foil Gold' | 'Foil Silver' | 'Spot UV' | 'Plastic' | 'Kraft';

export interface UploadedFile {
  file: File;
  preview: string;
  isValid: boolean;
  errors: string[];
}
