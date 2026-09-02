import { Timestamp } from 'firebase/firestore';

export interface MaintenanceRecord {
  id: string;
  bookingId?: string;
  customerName?: string;
  name?: string;
  customerPhone: string;
  carModel: string;
  carMake?: string;
  carYear?: string;
  serviceDate: any;
  serviceType: string;
  notes?: string;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  cost?: number | string;
  status: 'new' | 'pending' | 'accepted' | 'on_the_way' | 'in-progress' | 'completed' | 'cancelled';
  createdAt?: any;
}

export interface TestimonialData {
  id?: string;
  name: string;
  comment: string;
  rating: number;
  reply?: string;
  createdAt: Timestamp | any;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  titleEn?: string;
  category: string;
  categoryEn?: string;
  createdAt: Timestamp;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  price?: string;
  titleEn?: string;
  descriptionEn?: string;
  order?: number;
}

export interface Offer {
  id: string;
  title: string;
  titleEn?: string;
  price: string;
  subtitle?: string;
  subtitleEn?: string;
  features: string[];
  featuresEn?: string[];
  icon: string;
  active: boolean;
  createdAt: Timestamp;
  order?: number;
}
