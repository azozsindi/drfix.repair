import { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard, 
  Wrench, 
  Calendar, 
  Users, 
  FileCheck, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Tag, 
  Camera, 
  Handshake, 
  Star, 
  Bell, 
  Settings, 
  BookOpen, 
  Briefcase,
  Car
} from 'lucide-react';

export type AdminTabId = 
  | 'overview'        // 1. الرئيسية (/admin)
  | 'bookings'        // 2. الحجوزات والعمليات (/admin/bookings)
  | 'calendar'        // 3. التقويم والمواعيد (/admin/calendar)
  | 'handovers'       // 3.5. استلام وتسليم السيارات (/admin/handovers)
  | 'customers'       // 4. العملاء وسجل السيارات (/admin/customers)
  | 'contracts'       // 5. إدارة العقود (/admin/contracts)
  | 'reports'         // 6. التقارير وسندات الصيانة (/admin/reports)
  | 'analytics'       // 7. التحليلات ومؤشرات الأداء (/admin/analytics)
  | 'team'            // 8. فريق العمل والصلاحيات (/admin/team)
  | 'services'        // 9. إدارة الخدمات (/admin/services)
  | 'offers'          // 10. إدارة العروض (/admin/offers)
  | 'gallery'         // 11. إدارة المعرض (/admin/gallery)
  | 'partners'        // 12. شركاء النجاح (/admin/partners)
  | 'reviews'         // 13. التقييمات والآراء (/admin/reviews)
  | 'notifications'   // 14. الإشعارات وتيليجرام (/admin/notifications)
  | 'settings'        // 15. الإعدادات العامة والهوية (/admin/settings)
  | 'help'            // 16. دليل ومزايا النظام (/admin/help)
  | 'dashboard'       // Legacy alias for overview
  | 'content'         // Legacy alias for services/offers/gallery
  | 'staff'           // Legacy alias for team
  | 'testimonials'    // Legacy alias for reviews
  | 'manual';         // Legacy alias for help

export interface AdminNavItem {
  id: AdminTabId;
  labelAr: string;
  labelEn: string;
  path: string;
  icon: LucideIcon;
  category: 'core' | 'operations' | 'content' | 'system';
  badgeKey?: 'pendingBookings' | 'newReviews' | 'unreadAlerts';
  permissionKey?: string;
  technicianAllowed?: boolean;
}

export const ADMIN_NAV_SECTIONS: { id: 'core' | 'operations' | 'content' | 'system'; titleAr: string; titleEn: string }[] = [
  { id: 'core', titleAr: 'العمليات الأساسية', titleEn: 'Core Operations' },
  { id: 'operations', titleAr: 'العملاء والعقود', titleEn: 'Clients & Fleet' },
  { id: 'content', titleAr: 'المحتوى والتسويق', titleEn: 'Content & Marketing' },
  { id: 'system', titleAr: 'النظام والإدارة', titleEn: 'System & Admin' }
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // Core
  {
    id: 'overview',
    labelAr: 'الرئيسية',
    labelEn: 'Dashboard Overview',
    path: '/admin',
    icon: LayoutDashboard,
    category: 'core',
    technicianAllowed: false
  },
  {
    id: 'bookings',
    labelAr: 'الحجوزات والعمليات',
    labelEn: 'Bookings & Operations',
    path: '/admin/bookings',
    icon: Wrench,
    category: 'core',
    badgeKey: 'pendingBookings',
    permissionKey: 'canManageBookings',
    technicianAllowed: true
  },
  {
    id: 'calendar',
    labelAr: 'التقويم والمواعيد',
    labelEn: 'Calendar & Schedule',
    path: '/admin/calendar',
    icon: Calendar,
    category: 'core',
    technicianAllowed: true
  },
  {
    id: 'reports',
    labelAr: 'التقارير وسندات الصيانة',
    labelEn: 'Reports & Vouchers',
    path: '/admin/reports',
    icon: FileText,
    category: 'core',
    permissionKey: 'canViewAccounting',
    technicianAllowed: false
  },

  // Operations
  {
    id: 'handovers',
    labelAr: 'استلام وتسليم السيارات',
    labelEn: 'Vehicle Handover & Tracking',
    path: '/admin/handovers',
    icon: Car,
    category: 'operations',
    permissionKey: 'workshop_vehicle_intake',
    technicianAllowed: true
  },
  {
    id: 'customers',
    labelAr: 'العملاء وسجل السيارات',
    labelEn: 'Customers & Vehicles',
    path: '/admin/customers',
    icon: Users,
    category: 'operations',
    permissionKey: 'canManageCustomers',
    technicianAllowed: false
  },
  {
    id: 'contracts',
    labelAr: 'إدارة العقود',
    labelEn: 'Contracts Management',
    path: '/admin/contracts',
    icon: FileCheck,
    category: 'operations',
    technicianAllowed: false
  },
  {
    id: 'partners',
    labelAr: 'شركاء النجاح',
    labelEn: 'Success Partners',
    path: '/admin/partners',
    icon: Handshake,
    category: 'operations',
    technicianAllowed: false
  },

  // Content
  {
    id: 'services',
    labelAr: 'إدارة الخدمات',
    labelEn: 'Services Catalog',
    path: '/admin/services',
    icon: Briefcase,
    category: 'content',
    technicianAllowed: false
  },
  {
    id: 'offers',
    labelAr: 'إدارة العروض',
    labelEn: 'Special Offers',
    path: '/admin/offers',
    icon: Tag,
    category: 'content',
    technicianAllowed: false
  },
  {
    id: 'gallery',
    labelAr: 'إدارة المعرض',
    labelEn: 'Media Gallery',
    path: '/admin/gallery',
    icon: Camera,
    category: 'content',
    technicianAllowed: false
  },
  {
    id: 'reviews',
    labelAr: 'التقييمات والآراء',
    labelEn: 'Customer Reviews',
    path: '/admin/reviews',
    icon: Star,
    category: 'content',
    badgeKey: 'newReviews',
    technicianAllowed: false
  },

  // System
  {
    id: 'analytics',
    labelAr: 'التحليلات ومؤشرات الأداء',
    labelEn: 'Analytics & KPIs',
    path: '/admin/analytics',
    icon: TrendingUp,
    category: 'system',
    technicianAllowed: false
  },
  {
    id: 'team',
    labelAr: 'فريق العمل والصلاحيات',
    labelEn: 'Team & Permissions',
    path: '/admin/team',
    icon: ShieldCheck,
    category: 'system',
    permissionKey: 'canManageStaff',
    technicianAllowed: false
  },
  {
    id: 'notifications',
    labelAr: 'الإشعارات وتيليجرام',
    labelEn: 'Notifications & Alerts',
    path: '/admin/notifications',
    icon: Bell,
    category: 'system',
    technicianAllowed: false
  },
  {
    id: 'settings',
    labelAr: 'الإعدادات العامة والهوية',
    labelEn: 'System Settings',
    path: '/admin/settings',
    icon: Settings,
    category: 'system',
    permissionKey: 'canManageSettings',
    technicianAllowed: false
  },
  {
    id: 'help',
    labelAr: 'دليل ومزايا النظام',
    labelEn: 'System Manual & Help',
    path: '/admin/help',
    icon: BookOpen,
    category: 'system',
    technicianAllowed: true
  }
];

export const PATH_TO_TAB: Record<string, AdminTabId> = {
  '/admin': 'overview',
  '/admin/': 'overview',
  '/admin/bookings': 'bookings',
  '/admin/calendar': 'calendar',
  '/admin/handovers': 'handovers',
  '/admin/vehicle-handover': 'handovers',
  '/admin/customers': 'customers',
  '/admin/contracts': 'contracts',
  '/admin/reports': 'reports',
  '/admin/analytics': 'analytics',
  '/admin/team': 'team',
  '/admin/staff': 'team',
  '/admin/services': 'services',
  '/admin/offers': 'offers',
  '/admin/gallery': 'gallery',
  '/admin/partners': 'partners',
  '/admin/reviews': 'reviews',
  '/admin/testimonials': 'reviews',
  '/admin/notifications': 'notifications',
  '/admin/settings': 'settings',
  '/admin/help': 'help',
  '/admin/manual': 'help',

  // Direct administrative route: /ADMINDRFIX (case-normalized to lowercase)
  '/admindrfix': 'overview',
  '/admindrfix/': 'overview',
  '/admindrfix/bookings': 'bookings',
  '/admindrfix/calendar': 'calendar',
  '/admindrfix/handovers': 'handovers',
  '/admindrfix/vehicle-handover': 'handovers',
  '/admindrfix/customers': 'customers',
  '/admindrfix/contracts': 'contracts',
  '/admindrfix/reports': 'reports',
  '/admindrfix/analytics': 'analytics',
  '/admindrfix/team': 'team',
  '/admindrfix/staff': 'team',
  '/admindrfix/services': 'services',
  '/admindrfix/offers': 'offers',
  '/admindrfix/gallery': 'gallery',
  '/admindrfix/partners': 'partners',
  '/admindrfix/reviews': 'reviews',
  '/admindrfix/testimonials': 'reviews',
  '/admindrfix/notifications': 'notifications',
  '/admindrfix/settings': 'settings',
  '/admindrfix/help': 'help',
  '/admindrfix/manual': 'help'
};

export const TAB_TO_PATH: Record<AdminTabId, string> = {
  overview: '/admin',
  bookings: '/admin/bookings',
  calendar: '/admin/calendar',
  handovers: '/admin/handovers',
  customers: '/admin/customers',
  contracts: '/admin/contracts',
  reports: '/admin/reports',
  analytics: '/admin/analytics',
  team: '/admin/team',
  services: '/admin/services',
  offers: '/admin/offers',
  gallery: '/admin/gallery',
  partners: '/admin/partners',
  reviews: '/admin/reviews',
  notifications: '/admin/notifications',
  settings: '/admin/settings',
  help: '/admin/help',
  dashboard: '/admin',
  content: '/admin/services',
  staff: '/admin/team',
  testimonials: '/admin/reviews',
  manual: '/admin/help'
};
