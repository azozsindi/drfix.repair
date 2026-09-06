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

export interface Partner {
  id?: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  locationUrl: string;
  address: string;
  phone?: string;
  whatsapp?: string;
  discountRate?: string;
  workingHours?: string;
  rating?: number;
  isActive: boolean;
  order?: number;
  createdAt?: any;
}

export const DEFAULT_PARTNERS: Partner[] = [
  {
    id: 'partner-1',
    name: 'مركز النخبة لصيانة وتوضيب المحركات',
    category: 'ميكانيكا وتوضيب',
    description: 'متخصصون في تشخيص وصيانة المحركات والجيربكس الأوتوماتيكي لجميع السيارات الأمريكية واليابانية والكورية بأحدث أجهزة الفحص.',
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
    locationUrl: 'https://maps.google.com/?q=Jeddah+Industrial+Area',
    address: 'جدة - حي بني مالك، شارع فلسطين',
    phone: '0546870807',
    whatsapp: '966546870807',
    discountRate: 'خصم 15% لعملاء Dr.Fix',
    workingHours: '8:00 ص - 10:00 م',
    rating: 4.9,
    isActive: true,
    order: 1
  },
  {
    id: 'partner-2',
    name: 'ورشة الأمان لسمكرة ودهان الأفران الحرارية',
    category: 'سمكرة ودهان',
    description: 'أفران طلاء حرارية إيطالية حديثة مع مطابقة ألوان الكمبيوتر الأصلية وضمان 3 سنوات على الدهان.',
    imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?q=80&w=800&auto=format&fit=crop',
    locationUrl: 'https://maps.google.com/?q=Jeddah+Car+Services',
    address: 'جدة - صناعية الشمال، عسفان',
    phone: '0546870807',
    whatsapp: '966546870807',
    discountRate: 'خصم 10% + تلميع ساطع مجاني',
    workingHours: '8:30 ص - 9:30 م',
    rating: 4.8,
    isActive: true,
    order: 2
  },
  {
    id: 'partner-3',
    name: 'مركز كولد تك لتكييف وكهرباء السيارات',
    category: 'كهرباء وتكييف',
    description: 'تعبئة فريون أصلي 134a و R1234yf، تبديل الكمبروسرات، إصلاح دورة التبريد وفحص تسريبات الفريون بجهاز الليزر.',
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop',
    locationUrl: 'https://maps.google.com/?q=Jeddah+Automotive+AC',
    address: 'جدة - حي الصفا، طريق الأمير متعب',
    phone: '0546870807',
    whatsapp: '966546870807',
    discountRate: 'فحص دورة التكييف مجاناً مع أي إصلاح',
    workingHours: '9:00 ص - 11:00 م',
    rating: 4.9,
    isActive: true,
    order: 3
  },
  {
    id: 'partner-4',
    name: 'مؤسسة الدقة لقطع غيار السيارات الأصلية',
    category: 'قطع غيار وزيوت',
    description: 'توفير وتأمين قطع الغيار الأصلية والمصنعية وكالة لجميع الموديلات والماركات مع إمكانية التوصيل الفوري لموقع الفني.',
    imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop',
    locationUrl: 'https://maps.google.com/?q=Jeddah+Auto+Parts',
    address: 'جدة - حي مشرفة، شارع التحلية',
    phone: '0546870807',
    whatsapp: '966546870807',
    discountRate: 'أسعار جملة خاصة لعملاء Dr.Fix',
    workingHours: '8:00 ص - 10:30 م',
    rating: 4.7,
    isActive: true,
    order: 4
  }
];

