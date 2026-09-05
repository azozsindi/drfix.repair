import { Timestamp } from 'firebase/firestore';

export interface CustomerCar {
  id: string;
  make: string;
  model: string;
  year: string;
  plateNumber?: string;
  color?: string;
  notes?: string;
  addedAt?: any;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photoURL?: string;
  googleUid?: string;
  address?: string;
  cars: CustomerCar[];
  password?: string;
  createdAt: any;
  updatedAt?: any;
}

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

export type StaffRole = 'super_admin' | 'dispatcher' | 'technician' | 'support' | 'custom';

export interface StaffPermissions {
  canViewDashboard: boolean;
  canManageBookings: boolean;
  canChangeStatus: boolean;
  canViewCalendar: boolean;
  canManageCustomers: boolean;
  canManageTestimonials: boolean;
  canManageNotifications: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
  canManageContent: boolean;
  canManageSettings: boolean;
  canManageStaff: boolean;
}

export interface StaffUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  role: StaffRole;
  roleTitleAr: string;
  permissions: StaffPermissions;
  isActive: boolean;
  createdAt?: any;
  lastLogin?: any;
  notes?: string;
}

export const DEFAULT_SUPER_ADMIN_PERMISSIONS: StaffPermissions = {
  canViewDashboard: true,
  canManageBookings: true,
  canChangeStatus: true,
  canViewCalendar: true,
  canManageCustomers: true,
  canManageTestimonials: true,
  canManageNotifications: true,
  canViewAnalytics: true,
  canViewReports: true,
  canManageContent: true,
  canManageSettings: true,
  canManageStaff: true,
};

export const ROLE_PRESETS: Record<StaffRole, { titleAr: string; titleEn: string; permissions: StaffPermissions }> = {
  super_admin: {
    titleAr: 'مدير عام (كافة الصلاحيات)',
    titleEn: 'Super Admin',
    permissions: { ...DEFAULT_SUPER_ADMIN_PERMISSIONS }
  },
  dispatcher: {
    titleAr: 'مسؤول عمليات واستقبال',
    titleEn: 'Dispatcher / Operations',
    permissions: {
      canViewDashboard: true,
      canManageBookings: true,
      canChangeStatus: true,
      canViewCalendar: true,
      canManageCustomers: true,
      canManageTestimonials: false,
      canManageNotifications: true,
      canViewAnalytics: false,
      canViewReports: true,
      canManageContent: false,
      canManageSettings: false,
      canManageStaff: false,
    }
  },
  technician: {
    titleAr: 'فني صيانة ميداني',
    titleEn: 'Field Technician',
    permissions: {
      canViewDashboard: false,
      canManageBookings: true,
      canChangeStatus: true,
      canViewCalendar: true,
      canManageCustomers: false,
      canManageTestimonials: false,
      canManageNotifications: false,
      canViewAnalytics: false,
      canViewReports: true,
      canManageContent: false,
      canManageSettings: false,
      canManageStaff: false,
    }
  },
  support: {
    titleAr: 'خدمة عملاء واستفسارات',
    titleEn: 'Customer Support',
    permissions: {
      canViewDashboard: false,
      canManageBookings: true,
      canChangeStatus: false,
      canViewCalendar: false,
      canManageCustomers: true,
      canManageTestimonials: true,
      canManageNotifications: false,
      canViewAnalytics: false,
      canViewReports: false,
      canManageContent: false,
      canManageSettings: false,
      canManageStaff: false,
    }
  },
  custom: {
    titleAr: 'صلاحيات مخصصة',
    titleEn: 'Custom Permissions',
    permissions: {
      canViewDashboard: false,
      canManageBookings: true,
      canChangeStatus: true,
      canViewCalendar: true,
      canManageCustomers: false,
      canManageTestimonials: false,
      canManageNotifications: false,
      canViewAnalytics: false,
      canViewReports: false,
      canManageContent: false,
      canManageSettings: false,
      canManageStaff: false,
    }
  }
};
