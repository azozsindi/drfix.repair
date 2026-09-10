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
  city?: string;
  cars: CustomerCar[];
  vehicles?: any[];
  removedCars?: string[];
  password?: string;
  totalVisits?: number;
  totalSpent?: number;
  status?: string;
  notes?: string;
  lastVisitDate?: any;
  firstVisitDate?: any;
  lastLoginAt?: any;
  createdAt: any;
  updatedAt?: any;
}

export interface ServiceStepPhoto {
  id: string;
  url: string;
  caption?: string;
  isInternalOnly?: boolean; // true = hidden from customer (admin & technician only), false = visible to customer
  isCustomerVisible?: boolean;
  uploadedAt: any;
  uploadedBy?: string;
  mediaType?: 'image' | 'video'; // image or video inspection
  videoUrl?: string; // Direct or blob/IndexedDB video playback URL
  thumbnailUrl?: string; // Video poster thumbnail
}

export type ServiceStepKey = 'assigned' | 'accepted' | 'on_the_way' | 'arrived_inspection' | 'in_progress' | 'completed' | 'custom';

export type BookingStatus = 'new' | 'pending' | 'accepted' | 'on_the_way' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';

export interface PricingBreakdown {
  laborCost: number;       // سعر الخدمة (أجور اليد)
  partsCost: number;       // تكلفة قطع الغيار
  travelFee: number;       // رسوم الانتقال والميدان
  discount: number;        // الخصم
  taxRate: number;         // نسبة الضريبة % (e.g. 15)
  taxAmount: number;       // مبلغ الضريبة
  grandTotal: number;      // الإجمالي النهائي
  notes?: string;
  updatedBy?: string;
  updatedAt?: any;
}

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isPart: boolean;
}

export interface CustomerRepairApproval {
  id: string;
  quotationNumber: string;
  title: string;
  items: QuotationItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  status: 'draft' | 'sent_to_customer' | 'approved' | 'rejected';
  approvedAt?: any;
  approvedByName?: string;
  customerSignature?: string; // Digital signature / text confirmation
  rejectionReason?: string;
  sentAt?: any;
  createdAt: any;
  createdByStaffName?: string;
  createdByStaffId?: string;
}

export interface AuditLogEntry {
  id: string;
  recordId?: string;
  bookingId?: string;
  actionType: 'status_change' | 'price_update' | 'note_update' | 'technician_assigned' | 'repair_approved' | 'repair_quotation_sent' | 'complaint_logged' | 'complaint_updated' | 'warranty_issued' | 'rescheduled' | 'cancelled' | 'no_show' | 'other';
  actionTitle: string;
  details?: string;
  oldValue?: string;
  newValue?: string;
  performedByStaffId?: string;
  performedByStaffName: string;
  performedByRole?: string;
  timestamp: any;
}

export interface WarrantyDetails {
  hasWarranty: boolean;
  durationDays: number; // e.g., 30, 90, 180, 365
  warrantyPeriodLabel?: string; // "30 يوم", "3 أشهر", "6 أشهر", "سنة"
  startDate: any;
  endDate: any;
  coverageNotes: string; // تشمل أجور اليد، قطع الغيار المستبدلة، إلخ
  status: 'active' | 'expired' | 'voided';
  issuedByStaffName?: string;
  issuedAt?: any;
}

export interface ServiceComplaint {
  id: string;
  recordId: string;
  bookingId?: string;
  customerName: string;
  customerPhone: string;
  carModel: string;
  complaintTitle: string;
  description: string;
  assignedStaffId?: string;
  assignedStaffName?: string; // المسؤول عن متابعة الحل
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'under_investigation' | 'resolved' | 'closed';
  resolutionNotes?: string;
  resolvedAt?: any;
  resolvedBy?: string;
  createdAt: any;
  createdBy: string;
}

export interface TechnicianDetailedReview {
  workQualityRating: number;   // جودة العمل (1-5)
  punctualityRating: number;   // الالتزام بالموعد (1-5)
  mannerRating: number;        // أسلوب الفني وتعاملة (1-5)
  cleanlinessRating: number;   // نظافة الموقع والسيارة (1-5)
  overallRating: number;       // المتوسط الإجمالي
  feedbackNotes?: string;
  submittedAt: any;
  submittedByCustomerName?: string;
}

export interface ServiceZone {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'standard' | 'extended' | 'remote' | 'excluded';
  maxRadiusKm: number;
  travelFee: number; // رسوم إضافية للمنطقة بالريال
  districtsAr: string[];
  color: string;
  descriptionAr: string;
}

export interface ServiceRangeConfig {
  centerLat: number;
  centerLng: number;
  centerName: string;
  autoRejectOutOfRange: boolean;
  maxServiceRadiusKm: number;
  zones: ServiceZone[];
}

export interface ZoneCheckResult {
  isInRange: boolean;
  zone: ServiceZone;
  distanceKm: number;
  travelFee: number;
  statusMessage: string;
  canBook: boolean;
}

export interface ServiceStepLog {
  id: string;
  stepKey: ServiceStepKey;
  title: string;
  note?: string;
  estimatedArrival?: string;
  isInternalOnly?: boolean;
  isCustomerVisible?: boolean;
  photos: ServiceStepPhoto[];
  recordedBy?: string;
  recordedByStaffId?: string;
  recordedAt: any;
  statusChangeTo?: BookingStatus;
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
  plateNumber?: string;
  carPlate?: string;
  serviceDate: any;
  serviceTimeSlot?: string; // e.g. "05:00 م - 07:00 م"
  isImmediate?: boolean;    // true if express emergency / immediate dispatch requested
  serviceType: string;
  notes?: string;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  cost?: number | string;
  status: BookingStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedTechnicianName?: string;
  technicianName?: string;
  assignedStaffPhone?: string;
  assignedAt?: any;
  estimatedArrival?: string;
  completedAt?: any;
  serviceSteps?: ServiceStepLog[];
  createdAt?: any;
  updatedAt?: any;

  // Additional status metadata
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: any;
  rescheduledDate?: any;
  rescheduleReason?: string;
  noShowNotes?: string;
  noShowAt?: any;
  customerConfirmedAt?: any;
  customerConfirmationStatus?: 'confirmed' | 'requested_change' | 'pending';

  // 1. Transparent Pricing Breakdown
  pricing?: PricingBreakdown;

  // 2. Customer Electronic Approval for Repairs
  repairApproval?: CustomerRepairApproval;

  // 3. System Audit Log / Activity Trail
  auditLogs?: AuditLogEntry[];

  // 4. Warranty & Complaints
  warranty?: WarrantyDetails;
  complaints?: ServiceComplaint[];

  // 5. Detailed Technician Review
  techDetailedReview?: TechnicianDetailedReview;
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
  canManageContracts?: boolean;
  canDeleteBookings?: boolean;
}

// ==========================================================
// Contracts Management (Outbound Workshops & Inbound Corporate Fleets)
// ==========================================================
export type ContractType = 'workshop_outbound' | 'company_inbound';
// 'workshop_outbound': عقد ورشة خارجية (نرسل لها سيارات للصيانة المتخصصة)
// 'company_inbound': عقد شركة تجارية / أسطول (نستلم منها سيارات ونقوم بصيانتها)

export type ContractStatus = 'active' | 'expired' | 'suspended' | 'draft';
export type ContractVehicleStatus = 'dispatched' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

export interface ContractVehicle {
  id: string;
  contractId: string;
  plateNumber: string; // رقم اللوحة
  carModel: string; // الماركة والموديل (تويوتا كامري 2023)
  carYear?: string;
  vin?: string;
  driverOrContact?: string; // السائق أو المفوض
  driverPhone?: string; // رقم الجوال
  serviceRequired: string; // العطل أو الأعمال المطلوبة
  dispatchDate: string; // تاريخ الإرسال / الاستلام (YYYY-MM-DD)
  expectedCompletionDate?: string; // تاريخ الإنجاز المتوقع
  actualCompletionDate?: string;
  workshopCost?: number; // تكلفة الورشة الخارجية علينا (في عقود الورش)
  billingAmount?: number; // سعر الفاتورة للشركة أو العميل
  status: ContractVehicleStatus;
  workNotes?: string;
  invoiceNumber?: string;
  warrantyPeriod?: string;
  createdAt?: any;
}

export interface Contract {
  id: string;
  contractNumber: string; // مثال: CTR-WRK-2025-01 أو CTR-CORP-2025-03
  type: ContractType; // 'workshop_outbound' | 'company_inbound'
  title: string; // مسمى الاتفاقية
  partyName: string; // اسم الورشة الشريكة أو اسم الشركة / المؤسسة
  partyLogoUrl?: string; // شعار الورشة الشريكة أو شركة العميل (صورة)
  crNumber?: string; // السجل التجاري
  taxNumber?: string; // الرقم الضريبي
  contactPerson: string; // اسم المسؤول أو مدير الأسطول/الورشة
  contactPhone: string; // رقم الجوال
  contactEmail?: string;
  city: string; // المدينة (جدة)
  address?: string; // الحي أو الموقع
  specializationOrScope?: string; // التخصص للورش (سمكرة، رش، قيرات) أو نطاق العمل للشركات (صيانة أسطول)
  estimatedVehiclesCount?: number; // عدد السيارات المتوقع أو حجم الأسطول
  commissionOrDiscount?: string; // نسبة الخصم المعتمدة أو عمولة المركز (مثل 20%)
  paymentTerms: 'monthly_billing' | 'per_vehicle' | 'credit_30' | 'advance_deposit' | 'custom';
  paymentTermsDetails?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ContractStatus;
  termsConditions?: string; // بنود وشروط الاتفاقية
  notes?: string; // ملاحظات إدارية
  vehicles?: ContractVehicle[]; // سجل السيارات المرتبطة بهذا العقد
  createdAt?: any;
  updatedAt?: any;
}

export const DEFAULT_SAMPLE_CONTRACTS: Contract[] = [
  {
    id: 'contract-wrk-sample-1',
    contractNumber: 'CTR-WRK-2025-01',
    type: 'workshop_outbound',
    title: 'اتفاقية إسناد أعمال سمكرة ودهان أفران وضمان جودة',
    partyName: 'ورشة أوتو فيكس المتخصصة للسمكرة والدهان',
    crNumber: '4030198822',
    taxNumber: '310293847200003',
    contactPerson: 'م. عادل السلمي (مدير الورشة)',
    contactPhone: '0503456789',
    contactEmail: 'autofix.paint.jed@gmail.com',
    city: 'جدة',
    address: 'صناعية عسفان - شارع الورش الرئيسي',
    specializationOrScope: 'سمكرة ألمنيوم وحديد، رش أفران حرارية، تعديل صدمات على البارد PDR، وسحب شاسيه بمقاييس ليزر',
    commissionOrDiscount: '20% خصم خاص لعملاء DR.FIX',
    paymentTerms: 'monthly_billing',
    paymentTermsDetails: 'تسوية كشف الحساب بصفة شهرية نهاية كل شهر ميلادي مع تحويل بنكي رسمي',
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    status: 'active',
    termsConditions: '1. التزام الورشة باستخدام دهانات أوروبية أصلية بضمان لا يقل عن سنتين ضد التقشير وتغير اللون.\n2. إنجاز السيارات المستلمة خلال مدة أقصاها 5 أيام عمل من تاريخ التسليم.\n3. توفير تقرير فحص صور قبل وبعد العمل.',
    notes: 'ورشة موثوقة جداً في رش السيارات الفاخرة، التعامل مباشر مع المهندس عادل.',
    vehicles: [
      {
        id: 'cv-101',
        contractId: 'contract-wrk-sample-1',
        plateNumber: 'أ ب ج 4589',
        carModel: 'تويوتا لاندكروزر 2023',
        driverOrContact: 'عبدالله بن فهد',
        driverPhone: '0501122334',
        serviceRequired: 'سمكرة وتعديل رفرف أمامي يمين ورش فرن حراري مع مطابقة درجة اللون الأصلية',
        dispatchDate: '2026-09-02',
        expectedCompletionDate: '2026-09-08',
        actualCompletionDate: '2026-09-08',
        workshopCost: 1400,
        billingAmount: 1950,
        status: 'ready',
        workNotes: 'تم رش الباب والرفرف بنجاح ومطابقة البوية 100% وبانتظار استلامها من الورشة للمركز.'
      },
      {
        id: 'cv-102',
        contractId: 'contract-wrk-sample-1',
        plateNumber: 'د ر هـ 1022',
        carModel: 'هونداي توسان 2024',
        driverOrContact: 'سارة خالد',
        driverPhone: '0567788990',
        serviceRequired: 'تعديل صدمة شنطة خلفية على البارد PDR ورش صدام خلفي جديد',
        dispatchDate: '2026-09-06',
        expectedCompletionDate: '2026-09-11',
        workshopCost: 650,
        billingAmount: 950,
        status: 'in_progress',
        workNotes: 'السيارة حالياً بداخل كابينة الدهان، سيتم التجفيف والتلميع غداً.'
      }
    ]
  },
  {
    id: 'contract-corp-sample-2',
    contractNumber: 'CTR-CORP-2025-03',
    type: 'company_inbound',
    title: 'اتفاقية صيانة دورية وإصلاح ميكانيكي لأسطول سيارات الشحن السريع',
    partyName: 'شركة النقل السريع للخدمات اللوجستية (أسطول الغربية)',
    crNumber: '4030876541',
    taxNumber: '300987654300003',
    contactPerson: 'أ. ماجد الغامدي (مدير العمليات والأسطول)',
    contactPhone: '0558765432',
    contactEmail: 'fleet.logistics@fasttransport.sa',
    city: 'جدة',
    address: 'المدينة الصناعية - منطقة مستودعات الخمرة',
    specializationOrScope: 'صيانة دورية وقائية لأسطول الفانات والشاحنات، غيار زيوت وبترومين، فحص فرامل، إصلاح كهرباء وتكييف، وخدمة سريعة في المركز وميدانياً',
    estimatedVehiclesCount: 35,
    commissionOrDiscount: '15% خصم عقود الأساطيل السنوية',
    paymentTerms: 'credit_30',
    paymentTermsDetails: 'فواتير ضريبية إلكترونية موحدة تصدر نهاية كل أسبوعين مع مهلة سداد 30 يوماً',
    startDate: '2025-03-01',
    endDate: '2026-03-01',
    status: 'active',
    termsConditions: '1. أولوية دخول فورية لسيارات الأسطول دون انتظار.\n2. استخدام قطع غيار أصلية معتمدة مع ضمان 6 أشهر على كافة الإصلاحات.\n3. توفير تقرير حالة فني إلكتروني لكل مركبة بعد كل صيانة.',
    notes: 'الأسطول يتكون من 30 فان تويوتا هايس وفورد ترانزيت + 5 سيارات إدارية كامري.',
    vehicles: [
      {
        id: 'cv-201',
        contractId: 'contract-corp-sample-2',
        plateNumber: 'س ن ق 7714',
        carModel: 'فورد ترانزيت 2023 (فان بضائع #14)',
        driverOrContact: 'محمد إدريس (سائق توزيع)',
        driverPhone: '0543322110',
        serviceRequired: 'صيانة دورية 40 ألف كم + تغيير زيت 10W-30 وفلتر أصلي + فحمات فرامل أمامية',
        dispatchDate: '2026-09-07',
        expectedCompletionDate: '2026-09-08',
        actualCompletionDate: '2026-09-08',
        billingAmount: 1120,
        status: 'ready',
        workNotes: 'تمت الصيانة بنجاح واختبار قيادة الفرامل، السيارة جاهزة لتسليمها لشركة النقل.'
      },
      {
        id: 'cv-202',
        contractId: 'contract-corp-sample-2',
        plateNumber: 'ك ل م 5590',
        carModel: 'تويوتا هايس 2022 (باص نقل موظفين)',
        driverOrContact: 'طارق الزهراني',
        driverPhone: '0598877665',
        serviceRequired: 'تصفية ماكينة كاملة، فحص تسريب فريون مكيف خلفي وتعبئة غاز أصلي R134a وتغيير راديتر',
        dispatchDate: '2026-09-08',
        expectedCompletionDate: '2026-09-10',
        billingAmount: 1650,
        status: 'in_progress',
        workNotes: 'تم فك الراديتر وتركيب القطعة الأصلية، وجاري اختبار ضغط الفريون للمكيف الخلفي.'
      }
    ]
  }
];

export interface StaffUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  role: StaffRole;
  roleTitleAr: string;
  roleTitleEn?: string;
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
  canManageContracts: true,
  canDeleteBookings: true,
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
      canManageContracts: true,
      canDeleteBookings: false,
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
      canViewReports: false,
      canManageContent: false,
      canManageSettings: false,
      canManageStaff: false,
      canManageContracts: false,
      canDeleteBookings: false,
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

/**
 * Safely extracts epoch milliseconds from any MaintenanceRecord (or booking object).
 * Evaluates: createdAt (Firestore Timestamp, Date, string, seconds),
 * bookingId (base36 timestamp generated at creation), serviceDate, and updatedAt.
 */
export const getBookingTimestamp = (b: any): number => {
  if (!b) return 0;
  
  // 1. Check createdAt (Timestamp, seconds, Date, string)
  if (b.createdAt) {
    if (typeof b.createdAt.toMillis === 'function') {
      const ms = b.createdAt.toMillis();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.createdAt.toDate === 'function') {
      const ms = b.createdAt.toDate().getTime();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.createdAt.seconds === 'number') {
      const ms = b.createdAt.seconds * 1000;
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (b.createdAt instanceof Date) {
      const ms = b.createdAt.getTime();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.createdAt === 'string' || typeof b.createdAt === 'number') {
      const t = new Date(b.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
  }

  // 2. Extract timestamp from bookingId (e.g., DRF-MNDXYZ-1234 uses base-36 ms timestamp)
  if (b.bookingId && typeof b.bookingId === 'string') {
    const parts = b.bookingId.split('-');
    if (parts.length >= 2 && parts[1]) {
      const parsed36 = parseInt(parts[1], 36);
      if (!isNaN(parsed36) && parsed36 > 1600000000000 && parsed36 < 3000000000000) {
        return parsed36;
      }
    }
    const numMatch = b.bookingId.match(/\d{10,13}/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10);
      if (!isNaN(n) && n > 0) return n > 100000000000 ? n : n * 1000;
    }
  }

  // 3. Check serviceDate
  if (b.serviceDate) {
    if (typeof b.serviceDate.toMillis === 'function') {
      const ms = b.serviceDate.toMillis();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.serviceDate.toDate === 'function') {
      const ms = b.serviceDate.toDate().getTime();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.serviceDate.seconds === 'number') {
      const ms = b.serviceDate.seconds * 1000;
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (b.serviceDate instanceof Date) {
      const ms = b.serviceDate.getTime();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.serviceDate === 'string' || typeof b.serviceDate === 'number') {
      const t = new Date(b.serviceDate).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
  }

  // 4. Check updatedAt
  if (b.updatedAt) {
    if (typeof b.updatedAt.toMillis === 'function') {
      const ms = b.updatedAt.toMillis();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof b.updatedAt.seconds === 'number') {
      const ms = b.updatedAt.seconds * 1000;
      if (!isNaN(ms) && ms > 0) return ms;
    }
  }

  return 0;
};

/**
 * Sorts an array of MaintenanceRecords from newest to oldest.
 */
export const sortBookingsNewestFirst = <T extends Partial<MaintenanceRecord>>(records: T[]): T[] => {
  return [...records].sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
};

export type InventoryCategory = 
  | 'oil' 
  | 'filter' 
  | 'brake' 
  | 'battery' 
  | 'spark_plug' 
  | 'fluids' 
  | 'belts' 
  | 'electrical' 
  | 'other';

export interface InventoryItem {
  id: string;
  sku: string;
  nameAr: string;
  nameEn?: string;
  category: InventoryCategory;
  quantity: number;
  unit: string; // 'علبة' | 'لتر' | 'طقم' | 'حبة'
  minAlertLevel: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  storageLocation?: string; // 'مستودع المركز' | 'سيارة الخدمة 1' | 'سيارة الخدمة 2'
  notes?: string;
  compatibility?: string; // e.g. 'تويوتا، كيا، هيونداي'
  lastRestockedAt?: string;
  updatedAt?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment'; // توريد / صرف لطلب صيانة / جرد وتعديل
  quantityChange: number;
  newQuantity: number;
  bookingId?: string;
  technicianName?: string;
  reason?: string;
  timestamp: string;
}

export interface AppSettings {
  logoUrl?: string;
  siteName?: string;
  tickerText?: string;
  // Branding
  primaryColor?: string;
  accentColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  secondaryFont?: string;
  buttonStyle?: 'solid' | 'outline' | 'ghost' | 'brutal' | 'soft';
  // Social & Contact
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  snapchat?: string;
  tiktok?: string;
  location?: string;
  email?: string;
  // Hero Section
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge?: string;
  heroButtonText?: string;
  heroImageUrl?: string;
  heroImageBadgeTitle?: string;
  heroImageBadgeSubtitle?: string;
  showHeroImageBadge?: boolean;
  // Visibility Toggles
  showStats?: boolean;
  showOffers?: boolean;
  showGallery?: boolean;
  showTestimonials?: boolean;
  showServices?: boolean;
  showContact?: boolean;
  showPartners?: boolean;
  enableCustomerAccounts?: boolean;
  // SEO
  metaDescription?: string;
  metaKeywords?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  // Footer
  footerDescription?: string;
  copyrightText?: string;
  // Maintenance
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  // Telegram & Notifications
  telegramBotToken?: string;
  telegramChatId?: string;
  enableSoundAlerts?: boolean;
  appDownloadUrl?: string;
  // Privacy Policy & Terms of Service (PDPL Compliant)
  privacyPolicyText?: string;
  termsOfServiceText?: string;
  showPrivacyPolicy?: boolean;
  showTermsOfService?: boolean;
}

