import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  getDocs, 
  getDoc, 
  setDoc,
  serverTimestamp, 
  Timestamp, 
  doc,
  limit,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useLanguage, LanguageToggle } from '../context/LanguageContext';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  Car, 
  User, 
  Phone, 
  MapPin, 
  Image, 
  Trash2, 
  Check, 
  Settings, 
  Star, 
  MessageSquare, 
  FileText, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Upload, 
  Download, 
  Eye, 
  LogOut, 
  ExternalLink, 
  MessageCircle, 
  Palette, 
  Layout, 
  Tag, 
  Share2, 
  Edit3, 
  HelpCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ShieldAlert, 
  BookOpen, 
  Volume2, 
  VolumeX, 
  Radio, 
  Bell, 
  TrendingUp, 
  Navigation, 
  Compass, 
  CalendarCheck, 
  Printer, 
  DollarSign, 
  ShieldCheck, 
  Users, 
  UserCheck, 
  KeyRound, 
  ZoomIn, 
  Handshake, 
  FileCheck,
  PlusCircle,
  PhoneCall,
  AlignLeft,
  Camera,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  ArrowRight,
  X
} from 'lucide-react';
import { ReportsView } from './ReportsView';
import { StaffManagement } from './StaffManagement';
import { CustomerManager } from './CustomerManager';
import { exportBookingsToWord, exportSingleBookingWord } from '../lib/reportUtils';
import { ServiceTimelineModal } from './ServiceTimelineModal';
import { CustomerRepairApprovalModal } from './CustomerRepairApprovalModal';
import { WarrantyAndComplaintsModal } from './WarrantyAndComplaintsModal';
import { AuditLogModal } from './AuditLogModal';
import { PricingBreakdownModal } from './PricingBreakdownModal';
import { StatusChangeModal } from './StatusChangeModal';
import { TechnicianReviewModal } from './TechnicianReviewModal';
import { AdminPartnersManager } from './AdminPartnersManager';
import { AdminContractsManager } from './AdminContractsManager';
import { SystemManual } from './SystemManual';
import { TechnicianWorkspace } from './TechnicianWorkspace';
import { FastVideoRecorderModal } from './FastVideoRecorderModal';
import { LegalModal, DEFAULT_PRIVACY_POLICY, DEFAULT_TERMS_OF_SERVICE } from './LegalModal';
import { ServiceWorkflowGuideModal } from './ServiceWorkflowGuideModal';
import { AdminFcmManager } from './AdminFcmManager';
import { setupForegroundFcmListener, triggerServerFcmNotification } from '../lib/fcmNotifications';
import { generateTechnicianAssignmentWhatsAppUrl } from '../lib/whatsappUtils';
import { cn } from '../lib/utils';
import { phoneMatchesSearch, unifySaudiPhone, formatSaudiPhoneForWhatsApp } from '../lib/phoneUtils';
import { useScrollLock } from '../lib/scrollLock';
import { 
  AppSettings, 
  DEFAULT_APP_SETTINGS, 
  StaffUser, 
  MaintenanceRecord, 
  ServiceStepKey, 
  AuditLogEntry, 
  PricingBreakdown, 
  WarrantyDetails, 
  CustomerRepairApproval, 
  ServiceComplaint,
  TechnicianDetailedReview,
  Partner, 
  GalleryItem,
  ServiceItem,
  Contract,
  ContractVehicle,
  DEFAULT_SAMPLE_CONTRACTS,
  DEFAULT_PARTNERS,
  InventoryItem,
  CustomerProfile,
  CustomerCar,
  BookingStatus,
  getBookingTimestamp,
  StaffPermissions,
  ROLE_PRESETS,
  DEFAULT_SUPER_ADMIN_PERMISSIONS,
  TestimonialData,
  Offer
} from '../types';
import { formatBytes, getBase64SizeInBytes, compressImage, ImageUploadSizeBadge, UploadedImageInfo } from '../lib/imageUtils';
import { OperationType, handleFirestoreError } from '../lib/firestoreUtils';
import { sendTelegramNotification, escapeTelegramHtml, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID } from '../lib/telegramUtils';
import { safeFormatDate } from '../lib/dateUtils';
import { STATIC_GALLERY, STATIC_TESTIMONIALS } from '../lib/constants';
import { 
  playNewBookingSound, 
  playTaskAssignedSound, 
  playNotificationSound 
} from '../lib/audioAlerts';

const AdminDashboard = ({ 
  isAdmin, 
  onLogout, 
  settings, 
  currentStaffUser 
}: { 
  isAdmin: boolean; 
  onLogout: () => void; 
  settings: AppSettings;
  currentStaffUser?: StaffUser | null;
}) => {
  const { lang, setLang, t } = useLanguage();
  const isTechnician = currentStaffUser?.role === 'technician';
  const dashboardMountTime = useRef<number>(Date.now());
  const knownBookingIds = useRef<Set<string>>(new Set());
  const knownAssignmentMap = useRef<Map<string, string | undefined>>(new Map());
  const isSyncStabilized = useRef<boolean>(false);
  const lastChimeTime = useRef<number>(0);
  const lastAssignmentChimeTime = useRef<number>(0);

  const [records, setRecords] = useState<MaintenanceRecord[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_maintenance');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_partners');
      return cached ? JSON.parse(cached) : DEFAULT_PARTNERS;
    } catch {
      return DEFAULT_PARTNERS;
    }
  });
  const [contracts, setContracts] = useState<Contract[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_contracts');
      return cached ? JSON.parse(cached) : DEFAULT_SAMPLE_CONTRACTS;
    } catch {
      return DEFAULT_SAMPLE_CONTRACTS;
    }
  });
  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_staff');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [quotaExceededInfo, setQuotaExceededInfo] = useState<{ path?: string; message?: string } | null>(null);

  useEffect(() => {
    const handleQuota = (e: any) => {
      setQuotaExceededInfo({
        path: e.detail?.path || '',
        message: e.detail?.error || ''
      });
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'service' | 'offer' | 'gallery' | 'booking' | 'testimonial' } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'calendar' | 'customers' | 'contracts' | 'testimonials' | 'notifications' | 'analytics' | 'reports' | 'content' | 'settings' | 'staff' | 'partners' | 'manual'>('dashboard');
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'batch_bookings' | 'batch_offers' | 'single';
    collectionName?: string;
    id?: string;
    title?: string;
    count?: number;
  } | null>(null);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branding' | 'hero' | 'contact' | 'sections' | 'seo' | 'footer' | 'maintenance' | 'notifications' | 'legal'>('general');
  const [contentTab, setContentTab] = useState<'services' | 'offers' | 'gallery' | 'partners'>('services');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | BookingStatus>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<MaintenanceRecord | null>(null);
  const [timelineBookingRecord, setTimelineBookingRecord] = useState<MaintenanceRecord | null>(null);
  const [timelineInitialTab, setTimelineInitialTab] = useState<'timeline' | 'add_step' | 'assign'>('timeline');
  const [timelineInitialStage, setTimelineInitialStage] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [showWorkflowGuideModal, setShowWorkflowGuideModal] = useState(false);
  const [workflowGuideDefaultRole, setWorkflowGuideDefaultRole] = useState<'customer' | 'technician'>('technician');

  // New Modals for Repair Approval, Warranty & Complaints, Audit Log, Pricing Breakdown, Status Change, and Technician Reviews
  const [repairApprovalRecord, setRepairApprovalRecord] = useState<MaintenanceRecord | null>(null);
  const [warrantyComplaintsRecord, setWarrantyComplaintsRecord] = useState<MaintenanceRecord | null>(null);
  const [auditLogRecord, setAuditLogRecord] = useState<MaintenanceRecord | null>(null);
  const [pricingBreakdownRecord, setPricingBreakdownRecord] = useState<MaintenanceRecord | null>(null);
  const [statusChangeModalData, setStatusChangeModalData] = useState<{ record: MaintenanceRecord; targetStatus: BookingStatus } | null>(null);
  const [techReviewRecord, setTechReviewRecord] = useState<MaintenanceRecord | null>(null);

  // Lock background scrolling when any modal in AdminDashboard is open
  useScrollLock(isAdding || !!selectedBookingDetails || !!deleteConfirmTarget);

  // Active foreground FCM notification chimes
  useEffect(() => {
    const unsub = setupForegroundFcmListener((payload) => {
      console.log('[AdminDashboard] Foreground FCM alert received:', payload);
    });
    return () => unsub();
  }, []);

  const handleSelectBookingDetails = (record: MaintenanceRecord) => {
    if (isTechnician) {
      const staffName = (currentStaffUser?.fullName || '').trim().toLowerCase();
      const isAssigned = (currentStaffUser && record.assignedStaffId === currentStaffUser.id) || 
        Boolean(record.assignedStaffName && staffName && record.assignedStaffName.trim().toLowerCase() === staffName);
      if (!isAssigned) {
        alert('هذا الطلب غير مسند إليك، الصلاحية تقتصر على مهامك فقط.');
        return;
      }
    }
    setSelectedBookingDetails(record);
  };

  const handleOpenTimeline = (record: MaintenanceRecord, tab: 'timeline' | 'add_step' | 'assign' = 'timeline', stage?: 1 | 2 | 3 | 4 | 5) => {
    if (isTechnician && currentStaffUser) {
      const staffName = (currentStaffUser.fullName || '').trim().toLowerCase();
      const isAssigned = record.assignedStaffId === currentStaffUser.id || 
        Boolean(record.assignedStaffName && staffName && record.assignedStaffName.trim().toLowerCase() === staffName);
      if (!isAssigned) {
        alert('هذا الطلب غير مسند إليك، الصلاحية تقتصر على طلباتك فقط.');
        return;
      }
    }
    setTimelineBookingRecord(record);
    const safeTab = (currentStaffUser?.role === 'technician' && tab === 'assign') ? 'timeline' : tab;
    setTimelineInitialTab(safeTab);
    setTimelineInitialStage(stage);
  };
  const [techTaskFilter, setTechTaskFilter] = useState<'all' | 'my_tasks'>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>('all');
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [testimonialRatingFilter, setTestimonialRatingFilter] = useState<number | 'all'>('all');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState<boolean>(false);
  const [testTgLoading, setTestTgLoading] = useState<boolean>(false);
  const [testTgStatus, setTestTgStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [waBanner, setWaBanner] = useState<{
    show: boolean;
    url: string;
    customerName: string;
    statusLabel: string;
    carModel: string;
    bookingId: string;
  } | null>(null);

  const getWhatsAppStatusUrl = (record: MaintenanceRecord, targetStatus: MaintenanceRecord['status']): string => {
    const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('966') 
      ? cleanPhone 
      : cleanPhone.startsWith('05') 
      ? '966' + cleanPhone.slice(1) 
      : cleanPhone.startsWith('5') 
      ? '966' + cleanPhone 
      : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);

    const bId = record.bookingId || record.id || '';
    const car = record.carModel ? (record.carYear ? `${record.carModel} (${record.carYear})` : record.carModel) : 'سيارتك';
    const service = record.serviceType || 'صيانة متنقلة';
    const customer = (record.customerName || record.name || '').trim();
    const customerGreeting = customer ? `هلا ${customer}` : 'هلا بك';
    const customerIntro = customer ? `${customer}، ` : '';

    let msg = '';
    switch (targetStatus) {
      case 'accepted':
        msg = `🚗⚡ DR.FIX | تم تأكيد طلبك\n\n` +
          `${customerGreeting} 👋\n` +
          `طلبك صار مقبول ✅ وفريق DR.FIX بدأ تجهيز خدمتك.\n\n` +
          `🔧 ${service}\n` +
          `🚘 ${car}\n` +
          `🎫 رقم الحجز: #${bId}\n\n` +
          `خلك جاهز... DR.FIX جايك 🚗💨`;
        break;
      case 'on_the_way':
        msg = `🚗💨 DR.FIX | الفني تحرّك!\n\n` +
          `${customerIntro}فني DR.FIX في الطريق إليك الآن 🔧\n\n` +
          `📍 توجه الفني إلى موقعك بدأ\n` +
          `🚘 ${car}\n` +
          `🎫 رقم الحجز: #${bId}\n\n` +
          `جهّز السيارة... والباقي علينا ⚡`;
        break;
      case 'in-progress':
        msg = `🔧⚡ DR.FIX | وصلنا!\n\n` +
          `الفني وصل وبدأ فحص سيارتك الآن ✅\n\n` +
          `🚘 ${car}\n` +
          `🛠️ ${service}\n` +
          `🎫 رقم الحجز: #${bId}\n\n` +
          `خلّ الباقي علينا 😎`;
        break;
      case 'completed':
        msg = `🏁✨ DR.FIX | تمت المهمة!\n\n` +
          `${customerIntro}تم الانتهاء من خدمتك بنجاح ✅\n\n` +
          `🚘 ${car}\n` +
          `🔧 ${service}\n` +
          `🎫 رقم الحجز: #${bId}\n\n` +
          `شكراً لاختيارك DR.FIX 🤍\n\n` +
          `عطل سيارتك؟ إحنا نجيك. 🚗⚡`;
        break;
      case 'cancelled':
        msg = `❌ DR.FIX | تم إلغاء الحجز\n\n` +
          `${customerGreeting} 👋\n` +
          `نحيطك علماً بأنه تم إلغاء حجز الصيانة رقم #${bId} لسيارة (${car}).\n\n` +
          (record.cancellationReason ? `📌 سبب الإلغاء: ${record.cancellationReason}\n\n` : '') +
          `إذا كان لديك أي استفسار أو ترغب في إعادة الجدولة، يسعدنا تواصلكم دائماً 🚗⚡`;
        break;
      case 'rescheduled':
        const resDate = record.rescheduledDate 
          ? new Date(record.rescheduledDate).toLocaleString('ar-SA', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
          : 'الموعد المحدد لاحقاً';
        msg = `📅🔄 DR.FIX | تم تأجيل وإعادة جدولة الموعد\n\n` +
          `${customerGreeting} 👋\n` +
          `تم تحديث وتأجيل موعد الصيانة الميدانية لسيارة (${car}) رقم الحجز #${bId}.\n\n` +
          `🗓️ الموعد الجديد: ${resDate}\n` +
          (record.rescheduleReason ? `📌 ملاحظة: ${record.rescheduleReason}\n\n` : '\n') +
          `ننتظركم في الموعد الجديد، أو تواصل معنا لأي استفسار 🚗💨`;
        break;
      case 'no_show':
        msg = `⚠️ DR.FIX | تعذر التواصل بموقع العميل\n\n` +
          `${customerGreeting} 👋\n` +
          `حضر الفني الميداني لموقعكم المحدد لخدمة سيارة (${car}) رقم الحجز #${bId}، وتعذر اللقاء أو التواصل.\n\n` +
          `نرجو التواصل معنا لتحديد موعد بديل أو تأكيد طلبكم 🚗⚡`;
        break;
      default:
        msg = `🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n` +
          `${customerGreeting} 👋\n` +
          `بخصوص حجزك لسيارة (${car}) رقم الحجز #${bId}\n\n` +
          `كيف نقدر نخدمك؟ 🔧⚡`;
        break;
    }

    return `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
  };

  const getPreAppointmentConfirmationWhatsAppUrl = (record: MaintenanceRecord): string => {
    const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('966') 
      ? cleanPhone 
      : cleanPhone.startsWith('05') 
      ? '966' + cleanPhone.slice(1) 
      : cleanPhone.startsWith('5') 
      ? '966' + cleanPhone 
      : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);

    const bId = record.bookingId || record.id || '';
    const car = record.carModel || 'السيارة';
    const customer = (record.customerName || record.name || '').trim();
    const customerGreeting = customer ? `هلا ${customer}` : 'هلا بك';
    const sDate = record.serviceDate 
      ? getRecordDate(record.serviceDate).toLocaleString('ar-SA', { weekday: 'long', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
      : 'الموعد المحدد';

    const msg = `🚗⚡ DR.FIX | تأكيد موعد الصيانة الميدانية\n\n` +
      `${customerGreeting} 👋\n` +
      `نود تأكيد موعد صيانة سيارتكم (${car}) رقم الحجز #${bId}.\n\n` +
      `📅 الموعد: ${sDate}\n` +
      `🔧 الخدمة: ${record.serviceType}\n\n` +
      `نرجو تأكيد الموعد وجاهزية السيارة بالرد بكلمة (تأكيد ✅)، أو إبلاغنا في حال رغبتكم بتعديل الموعد 🔄\n\n` +
      `فريق DR.FIX في خدمتكم دائماً 🚗💨`;

    return `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
  };

  // Helper to parse dates safely
  const getRecordDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Form States
  const [formData, setFormData] = useState({
    customerPhone: '',
    carModel: '',
    serviceType: '',
    notes: '',
    cost: '',
    serviceDate: '',
    status: 'pending' as MaintenanceRecord['status']
  });

  const [offerForm, setOfferForm] = useState({
    title: '',
    price: '',
    subtitle: '',
    features: '',
    icon: 'tag' as 'tag' | 'zap'
  });

  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    icon: 'Wrench',
    price: ''
  });

  const [galleryForm, setGalleryForm] = useState({
    title: '',
    imageUrl: '',
    category: 'صيانة دورية'
  });

  const [uploadedImageMeta, setUploadedImageMeta] = useState<{
    logo?: UploadedImageInfo;
    hero?: UploadedImageInfo;
    gallery?: UploadedImageInfo;
  }>({});

  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    comment: '',
    rating: 5,
    reply: ''
  });

  const [settingsForm, setSettingsForm] = useState({
    logoUrl: settings.logoUrl || '',
    siteName: settings.siteName || 'Dr.Fix',
    tickerText: settings.tickerText || '',
    primaryColor: settings.primaryColor || '#E31837',
    accentColor: settings.accentColor || '#0A0A0A',
    borderRadius: settings.borderRadius || '1rem',
    fontFamily: settings.fontFamily || 'Cairo',
    secondaryFont: settings.secondaryFont || 'Inter',
    buttonStyle: settings.buttonStyle || 'rounded',
    phone: settings.phone || '',
    whatsapp: settings.whatsapp || '',
    instagram: settings.instagram || '',
    twitter: settings.twitter || '',
    facebook: settings.facebook || '',
    snapchat: settings.snapchat || '',
    tiktok: settings.tiktok || '',
    location: settings.location || '',
    email: settings.email || '',
    heroTitle: settings.heroTitle || '',
    heroSubtitle: settings.heroSubtitle || '',
    heroBadge: settings.heroBadge || '',
    heroButtonText: settings.heroButtonText || 'احجز الآن',
    heroImageUrl: settings.heroImageUrl || '',
    heroImageBadgeTitle: settings.heroImageBadgeTitle || 'خدمة متنقلة وسريعة',
    heroImageBadgeSubtitle: settings.heroImageBadgeSubtitle || 'نصلك أينما كنت بجدة',
    showHeroImageBadge: settings.showHeroImageBadge ?? true,
    showStats: settings.showStats ?? true,
    showOffers: settings.showOffers ?? true,
    showGallery: settings.showGallery ?? true,
    showTestimonials: settings.showTestimonials ?? true,
    showServices: settings.showServices ?? true,
    showContact: settings.showContact ?? true,
    showPartners: settings.showPartners ?? true,
    enableCustomerAccounts: settings.enableCustomerAccounts ?? true,
    metaDescription: settings.metaDescription || '',
    metaKeywords: settings.metaKeywords || '',
    googleAnalyticsId: settings.googleAnalyticsId || '',
    facebookPixelId: settings.facebookPixelId || '',
    footerDescription: settings.footerDescription || '',
    copyrightText: settings.copyrightText || `© ${new Date().getFullYear()} جميع الحقوق محفوظة`,
    maintenanceMode: settings.maintenanceMode ?? false,
    maintenanceMessage: settings.maintenanceMessage || 'الموقع قيد الصيانة حالياً، سنعود قريباً.',
    telegramBotToken: settings.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN,
    telegramChatId: settings.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID,
    enableSoundAlerts: settings.enableSoundAlerts ?? true,
    appDownloadUrl: settings.appDownloadUrl || DEFAULT_APP_SETTINGS.appDownloadUrl || 'https://drive.google.com/drive/folders/1dfh85Zi8ZELc7EfUkIPcTlPJjiM9kflh?usp=sharing',
    showPrivacyPolicy: settings.showPrivacyPolicy ?? true,
    showTermsOfService: settings.showTermsOfService ?? true,
    privacyPolicyText: settings.privacyPolicyText || '',
    termsOfServiceText: settings.termsOfServiceText || ''
  });

  useEffect(() => {
    // Detect PWA status
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsPWAInstalled(!!isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsPWAInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("لتثبيت التطبيق على الآيفون: اضغط زر المشاركة (Share) في المتصفح ثم اختر 'إضافة إلى الصفحة الرئيسية (Add to Home Screen)'. \n\nعلى أندرويد: افتح خيارات المتصفح (⋮) ثم اضغط 'تثبيت التطبيق (Install App)'.");
    }
  };

  const handleTestTelegram = async () => {
    if (!settingsForm.telegramBotToken?.trim() || !settingsForm.telegramChatId?.trim()) {
      alert("يرجى إدخال Bot Token و Chat ID أولاً في الحقول المخصصة");
      return;
    }
    setTestTgLoading(true);
    setTestTgStatus('idle');
    const testMsg = `🔔 <b>تجربة إشعار تيليجرام من Dr. Fix!</b> 🚗\n\n` +
      `✅ <b>مبروك!</b> تم ربط بوت تيليجرام بلوحة تحكم Dr. Fix بنجاح.\n` +
      `⏰ <b>التاريخ والوقت:</b> ${new Date().toLocaleString('ar-SA')}\n\n` +
      `الآن ستصلك تفاصيل أي حجز سيارة جديد فور تسجيل العميل له مباشرة! 🚀\n\n` +
      `🔗 <a href="https://drfix.repair/admin">لوحة الإدارة</a>`;
    const ok = await sendTelegramNotification(testMsg, settingsForm.telegramBotToken, settingsForm.telegramChatId);
    setTestTgLoading(false);
    if (ok) {
      setTestTgStatus('success');
    } else {
      setTestTgStatus('error');
    }
  };

  useEffect(() => {
    setSettingsForm({
      logoUrl: settings.logoUrl || '',
      siteName: settings.siteName || 'Dr.Fix',
      tickerText: settings.tickerText || '',
      primaryColor: settings.primaryColor || '#E31837',
      accentColor: settings.accentColor || '#0A0A0A',
      borderRadius: settings.borderRadius || '1rem',
      fontFamily: settings.fontFamily || 'Cairo',
      secondaryFont: settings.secondaryFont || 'Inter',
      buttonStyle: settings.buttonStyle || 'rounded',
      phone: settings.phone || '',
      whatsapp: settings.whatsapp || '',
      instagram: settings.instagram || '',
      twitter: settings.twitter || '',
      facebook: settings.facebook || '',
      snapchat: settings.snapchat || '',
      tiktok: settings.tiktok || '',
      location: settings.location || '',
      email: settings.email || '',
      heroTitle: settings.heroTitle || '',
      heroSubtitle: settings.heroSubtitle || '',
      heroBadge: settings.heroBadge || '',
      heroButtonText: settings.heroButtonText || 'احجز الآن',
      heroImageUrl: settings.heroImageUrl || '',
      heroImageBadgeTitle: settings.heroImageBadgeTitle || 'خدمة متنقلة وسريعة',
      heroImageBadgeSubtitle: settings.heroImageBadgeSubtitle || 'نصلك أينما كنت بجدة',
      showHeroImageBadge: settings.showHeroImageBadge ?? true,
      showStats: settings.showStats ?? true,
      showOffers: settings.showOffers ?? true,
      showGallery: settings.showGallery ?? true,
      showTestimonials: settings.showTestimonials ?? true,
      showServices: settings.showServices ?? true,
      showContact: settings.showContact ?? true,
      showPartners: settings.showPartners ?? true,
      enableCustomerAccounts: settings.enableCustomerAccounts ?? true,
      metaDescription: settings.metaDescription || '',
      metaKeywords: settings.metaKeywords || '',
      googleAnalyticsId: settings.googleAnalyticsId || '',
      facebookPixelId: settings.facebookPixelId || '',
      footerDescription: settings.footerDescription || '',
      copyrightText: settings.copyrightText || `© ${new Date().getFullYear()} جميع الحقوق محفوظة`,
      maintenanceMode: settings.maintenanceMode ?? false,
      maintenanceMessage: settings.maintenanceMessage || 'الموقع قيد الصيانة حالياً، سنعود قريباً.',
      telegramBotToken: settings.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN,
      telegramChatId: settings.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID,
      enableSoundAlerts: settings.enableSoundAlerts ?? true,
      showPrivacyPolicy: settings.showPrivacyPolicy ?? true,
      showTermsOfService: settings.showTermsOfService ?? true,
      privacyPolicyText: settings.privacyPolicyText || '',
      termsOfServiceText: settings.termsOfServiceText || ''
    });
  }, [settings]);

  useEffect(() => {
    if (isAdmin) {
      // Read notification permission state without prompting automatically
      if (typeof Notification !== 'undefined') {
        setNotificationPermission(Notification.permission);
      }

      // Maintenance
      dashboardMountTime.current = Date.now();
      isSyncStabilized.current = false;

      // 4-second stabilization window: allow Firestore local cache and server catch-up to settle completely
      // This strictly prevents existing bookings from spamming sound/notifications on dashboard open
      const stabilizationTimer = setTimeout(() => {
        isSyncStabilized.current = true;
      }, 4000);

      const qM = query(collection(db, 'maintenance'), orderBy('serviceDate', 'desc'), limit(150));

      const unsubM = onSnapshot(qM, (snapshot) => {
        const results: MaintenanceRecord[] = [];
        
        snapshot.docChanges().forEach((change) => {
          const docId = change.doc.id;
          const wasAlreadyKnown = knownBookingIds.current.has(docId);
          knownBookingIds.current.add(docId);

          // ONLY trigger alerts for records that:
          // 1. Are 'added'
          // 2. We have passed the initial 4-second stabilization window (never on initial load or cache sync)
          // 3. Document ID was not previously seen
          // 4. Not an unsynced local pending write from the current user
          // 5. Booking creation timestamp is genuinely new (after or within 10s before opening dashboard)
          if (change.type === "added" && isSyncStabilized.current && !wasAlreadyKnown && !change.doc.metadata.hasPendingWrites) {
            const newBooking = change.doc.data() as MaintenanceRecord;
            knownAssignmentMap.current.set(docId, newBooking.assignedStaffId);
            const bTimestamp = getBookingTimestamp(newBooking);
            const isFresh = bTimestamp === 0 || bTimestamp >= (dashboardMountTime.current - 10000);

            if (isFresh) {
              const now = Date.now();
              // Throttled sound alert (max 1 sound chime every 3 seconds)
              if (settings.enableSoundAlerts !== false && now - lastChimeTime.current > 3000) {
                lastChimeTime.current = now;
                playNewBookingSound();
              }

              // Desktop browser notification
              if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
                try {
                  const carTitle = newBooking.carModel ? `${newBooking.carModel}` : 'سيارة';
                  const serviceTitle = newBooking.serviceType || 'صيانة متنقلة';
                  new Notification("حجز جديد! 🚗", {
                    body: `حجز جديد لـ ${carTitle} - ${serviceTitle}`,
                    icon: settings.logoUrl || "/favicon.ico"
                  });
                } catch {}
              }
            }
          }

          // Trigger technician assignment alert when assignedStaffId changes or is freshly assigned
          if (change.type === "modified" && isSyncStabilized.current && !change.doc.metadata.hasPendingWrites) {
            const updatedBooking = change.doc.data() as MaintenanceRecord;
            const prevAssignedId = knownAssignmentMap.current.get(docId);
            const currAssignedId = updatedBooking.assignedStaffId;

            if (currAssignedId && currAssignedId !== prevAssignedId) {
              const now = Date.now();
              if (settings.enableSoundAlerts !== false && now - lastAssignmentChimeTime.current > 2000) {
                lastAssignmentChimeTime.current = now;
                playTaskAssignedSound();
              }

              const isMyAssignment = currentStaffUser?.id === currAssignedId || 
                Boolean(currentStaffUser?.fullName && updatedBooking.assignedStaffName && currentStaffUser.fullName.trim().toLowerCase() === updatedBooking.assignedStaffName.trim().toLowerCase());

              if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
                try {
                  const alertTitle = isMyAssignment 
                    ? "تم إسناد مهمة صيانة جديدة إليك! 🔧" 
                    : `تم إسناد الطلب للفني ${updatedBooking.assignedStaffName || ''} 🔧`;
                  new Notification(alertTitle, {
                    body: `${updatedBooking.carModel || 'سيارة'} - ${updatedBooking.serviceType || 'صيانة'} (${updatedBooking.customerName || ''})`,
                    icon: settings.logoUrl || "/favicon.ico"
                  });
                } catch {}
              }
            }
            knownAssignmentMap.current.set(docId, currAssignedId);
          }
        });

        snapshot.forEach((doc) => {
          knownBookingIds.current.add(doc.id);
          const recData = doc.data() as MaintenanceRecord;
          if (!knownAssignmentMap.current.has(doc.id)) {
            knownAssignmentMap.current.set(doc.id, recData.assignedStaffId);
          }
          results.push({ id: doc.id, ...recData } as MaintenanceRecord);
        });
        results.sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));
        setRecords(results);
        try { localStorage.setItem('drfix_cached_maintenance', JSON.stringify(results)); } catch {}
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'maintenance');
        try {
          const cached = localStorage.getItem('drfix_cached_maintenance');
          if (cached) setRecords(JSON.parse(cached));
        } catch {}
      });

      // Testimonials
      const qT = collection(db, 'testimonials');
      const unsubT = onSnapshot(qT, (snapshot) => {
        const results: TestimonialData[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as TestimonialData);
        });
        results.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
          return timeB - timeA;
        });
        setTestimonials(results);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'testimonials'));

      // Offers
      const qO = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
      const unsubO = onSnapshot(qO, (snapshot) => {
        const results: Offer[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as Offer);
        });
        setOffers(results);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'offers'));

      // Services
      const qS = query(collection(db, 'services'));
      const unsubS = onSnapshot(qS, (snapshot) => {
        const results: ServiceItem[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as ServiceItem);
        });
        setServices(results);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'services'));

      // Gallery
      const qG = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
      const unsubG = onSnapshot(qG, (snapshot) => {
        const results: GalleryItem[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as GalleryItem);
        });
        setGallery(results);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'gallery'));

      // Staff Users
      const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'), limit(50));
      const unsubStaff = onSnapshot(qStaff, (snapshot) => {
        const results: StaffUser[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as StaffUser);
        });
        setStaffList(results);
        try { localStorage.setItem('drfix_cached_staff', JSON.stringify(results)); } catch {}
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'staff');
        try {
          const cached = localStorage.getItem('drfix_cached_staff');
          if (cached) setStaffList(JSON.parse(cached));
        } catch {}
      });

      // Partners
      const qPartners = query(collection(db, 'partners'), orderBy('order', 'asc'));
      const unsubPartners = onSnapshot(qPartners, (snapshot) => {
        if (!snapshot.empty) {
          const results: Partner[] = [];
          snapshot.forEach((doc) => {
            results.push({ id: doc.id, ...(doc.data() as any) } as Partner);
          });
          setPartners(results);
          try { localStorage.setItem('drfix_partners', JSON.stringify(results)); } catch {}
        } else {
          setPartners(DEFAULT_PARTNERS);
        }
      }, (error) => {
        console.warn('Partners fetch fallback:', error);
      });

      // Contracts (Workshops & Corporate Fleets)
      const qContracts = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
      const unsubContracts = onSnapshot(qContracts, (snapshot) => {
        if (!snapshot.empty) {
          const results: Contract[] = [];
          snapshot.forEach((doc) => {
            results.push({ id: doc.id, ...(doc.data() as any) } as Contract);
          });
          setContracts(results);
          try { localStorage.setItem('drfix_contracts', JSON.stringify(results)); } catch {}
        } else {
          setContracts(DEFAULT_SAMPLE_CONTRACTS);
        }
      }, (error) => {
        console.warn('Contracts fetch fallback:', error);
      });

      return () => {
        clearTimeout(stabilizationTimer);
        unsubM();
        unsubT();
        unsubO();
        unsubS();
        unsubG();
        unsubStaff();
        unsubPartners();
        unsubContracts();
      };
    }
  }, [isAdmin]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const unifiedCustomerPhone = unifySaudiPhone(formData.customerPhone) || formData.customerPhone.trim();
      const recordDate = formData.serviceDate ? new Date(formData.serviceDate) : new Date();

      if (editingItem && editingItem.type === 'booking') {
        await updateDoc(doc(db, 'maintenance', editingItem.id), {
          ...formData,
          customerPhone: unifiedCustomerPhone,
          serviceDate: formData.serviceDate ? recordDate : (editingItem.serviceDate || serverTimestamp()),
          cost: 0
        });
      } else {
        await addDoc(collection(db, 'maintenance'), {
          ...formData,
          customerPhone: unifiedCustomerPhone,
          cost: 0,
          serviceDate: formData.serviceDate ? recordDate : serverTimestamp(),
          status: 'pending'
        });
      }

      // Automatically sync/open customer file
      if (formData.customerPhone) {
        try {
          const cleanPhone = unifiedCustomerPhone;
          const customersRef = collection(db, 'customers');
          const custSnap = await getDocs(query(customersRef, where('phone', '==', cleanPhone)));
          const carInfo = {
            model: formData.carModel.trim(),
            notes: formData.serviceType
          };

          if (!custSnap.empty) {
            const existingDoc = custSnap.docs[0];
            const existingData = existingDoc.data();
            const existingVehicles: any[] = Array.isArray(existingData.vehicles) ? existingData.vehicles : [];
            const hasCar = existingVehicles.some(v => v.model?.toLowerCase() === carInfo.model.toLowerCase());
            const updatedVehicles = hasCar ? existingVehicles : [...existingVehicles, carInfo];
            await updateDoc(doc(db, 'customers', existingDoc.id), {
              vehicles: updatedVehicles,
              totalVisits: (Number(existingData.totalVisits) || 1) + 1,
              lastVisitDate: new Date().toISOString(),
              updatedAt: serverTimestamp()
            });
          } else {
            await addDoc(customersRef, {
              name: 'عميل كريم',
              phone: cleanPhone,
              city: 'جدة',
              vehicles: [carInfo],
              totalVisits: 1,
              firstVisitDate: new Date().toISOString(),
              lastVisitDate: new Date().toISOString(),
              status: 'new',
              notes: `حجز خدمة: ${formData.serviceType}${formData.notes ? ` - ${formData.notes}` : ''}`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (cErr) {
          console.warn('Customer auto-create error in handleAddRecord:', cErr);
        }
      }

      setFormData({ customerPhone: '', carModel: '', serviceType: '', notes: '', cost: '0', status: 'pending' });
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving record:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...offerForm,
        features: offerForm.features.split('\n').filter(f => f.trim()),
        updatedAt: serverTimestamp()
      };
      if (editingItem && editingItem.type === 'offer' && !editingItem.id.startsWith('static-')) {
        await updateDoc(doc(db, 'offers', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'offers'), { ...data, active: true, createdAt: serverTimestamp() });
      }
      setOfferForm({ title: '', price: '', subtitle: '', features: '', icon: 'tag' });
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'gallery' | 'settings' | 'hero') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const origSizeBytes = file.size;
    const origSizeFormatted = formatBytes(origSizeBytes);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      // Extract original dimensions
      const tempImg = new Image();
      tempImg.src = base64String;
      await new Promise((res) => { tempImg.onload = res; tempImg.onerror = res; });
      const origDim = tempImg.naturalWidth ? `${tempImg.naturalWidth} × ${tempImg.naturalHeight} بكسل` : 'غير محدد';

      // Optimized dimensions according to image role
      const maxWidth = type === 'settings' ? 600 : type === 'hero' ? 1400 : 1000;
      const maxHeight = type === 'settings' ? 600 : type === 'hero' ? 900 : 800;
      const quality = type === 'settings' ? 0.85 : 0.75;
      const isPng = file.type === 'image/png' || base64String.startsWith('data:image/png');

      const compressed = await compressImage(base64String, maxWidth, maxHeight, quality, type === 'settings' && isPng);

      // Extract compressed dimensions & size
      const compImg = new Image();
      compImg.src = compressed;
      await new Promise((res) => { compImg.onload = res; compImg.onerror = res; });
      const compDim = compImg.naturalWidth ? `${compImg.naturalWidth} × ${compImg.naturalHeight} بكسل` : 'غير محدد';

      const compSizeBytes = getBase64SizeInBytes(compressed);
      const compSizeFormatted = formatBytes(compSizeBytes);
      const savings = origSizeBytes > compSizeBytes 
        ? `${Math.round(((origSizeBytes - compSizeBytes) / origSizeBytes) * 100)}%` 
        : undefined;

      const metaInfo: UploadedImageInfo = {
        name: file.name,
        origSize: origSizeFormatted,
        origSizeBytes,
        compSize: compSizeFormatted,
        compSizeBytes,
        origDim,
        compDim,
        savings
      };

      setUploadedImageMeta(prev => ({
        ...prev,
        [type === 'settings' ? 'logo' : type]: metaInfo
      }));
      
      if (type === 'gallery') {
        setGalleryForm(prev => ({ ...prev, imageUrl: compressed }));
      } else if (type === 'hero') {
        setSettingsForm(prev => ({ ...prev, heroImageUrl: compressed }));
      } else {
        setSettingsForm(prev => ({ ...prev, logoUrl: compressed }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem && editingItem.type === 'service') {
        await updateDoc(doc(db, 'services', editingItem.id), serviceForm);
      } else {
        await addDoc(collection(db, 'services'), serviceForm);
      }
      setServiceForm({ title: '', description: '', icon: 'Wrench', price: '' });
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving service:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.imageUrl) return;
    setLoading(true);
    try {
      const data = {
        title: galleryForm.title.trim() || 'صورة من أعمال المركز',
        imageUrl: galleryForm.imageUrl,
        category: galleryForm.category || 'صيانة دورية',
        updatedAt: serverTimestamp()
      };
      if (editingItem && editingItem.type === 'gallery' && !editingItem.id.startsWith('static-')) {
        await updateDoc(doc(db, 'gallery', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'gallery'), { ...data, createdAt: serverTimestamp() });
      }
      setGalleryForm({ title: '', imageUrl: '', category: 'صيانة دورية' });
      setUploadedImageMeta(prev => ({ ...prev, gallery: undefined }));
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving gallery item:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialForm.name.trim() || !testimonialForm.comment.trim()) return;
    setLoading(true);
    try {
      const data = {
        name: testimonialForm.name.trim(),
        comment: testimonialForm.comment.trim(),
        rating: Number(testimonialForm.rating) || 5,
        reply: testimonialForm.reply.trim() || '',
        updatedAt: serverTimestamp()
      };
      if (editingItem && editingItem.type === 'testimonial' && !editingItem.id.startsWith('static-')) {
        await updateDoc(doc(db, 'testimonials', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'testimonials'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setTestimonialForm({ name: '', comment: '', rating: 5, reply: '' });
      setIsAdding(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving testimonial:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartner = async (partnerData: Omit<Partner, 'id'>) => {
    try {
      await addDoc(collection(db, 'partners'), {
        ...partnerData,
        createdAt: serverTimestamp()
      });
      setDeleteToast({ message: 'تمت إضافة الشريك بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error adding partner:', err);
      handleFirestoreError(err, OperationType.CREATE, 'partners');
      throw err;
    }
  };

  const handleUpdatePartner = async (id: string, partnerData: Partial<Partner>) => {
    try {
      if (id.startsWith('partner-')) {
        await setDoc(doc(db, 'partners', id), {
          ...partnerData,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(doc(db, 'partners', id), {
          ...partnerData,
          updatedAt: serverTimestamp()
        });
      }
      setDeleteToast({ message: 'تم تحديث بيانات الشريك بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error updating partner:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'partners');
      throw err;
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      if (!id.startsWith('partner-')) {
        await deleteDoc(doc(db, 'partners', id));
      }
      setPartners(prev => prev.filter(p => p.id !== id));
      setDeleteToast({ message: 'تم حذف الشريك بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error deleting partner:', err);
      handleFirestoreError(err, OperationType.DELETE, 'partners');
      throw err;
    }
  };

  const handleTogglePartnersVisibility = async () => {
    const nextState = !(settings.showPartners !== false);
    setSettingsForm(prev => ({ ...prev, showPartners: nextState }));
    try {
      await updateDoc(doc(db, 'stats', 'global'), {
        showPartners: nextState,
        updatedAt: serverTimestamp()
      });
      try {
        localStorage.setItem('drfix_app_settings', JSON.stringify({
          ...DEFAULT_APP_SETTINGS,
          ...settings,
          showPartners: nextState
        }));
      } catch {}
      setDeleteToast({
        message: nextState ? 'تم تفعيل وإظهار قسم شركاء النجاح في الموقع بنجاح' : 'تم إخفاء قسم شركاء النجاح بالكامل من الموقع',
        type: 'success'
      });
    } catch (err) {
      console.error('Error toggling partners visibility:', err);
    }
  };

  // Contracts & Fleet Management Handlers
  const handleAddContract = async (contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'contracts'), {
        ...contractData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const newContract: Contract = {
        id: docRef.id,
        ...contractData,
        createdAt: new Date().toISOString()
      };
      setContracts(prev => [newContract, ...prev]);
      try {
        localStorage.setItem('drfix_contracts', JSON.stringify([newContract, ...contracts]));
      } catch {}
      setDeleteToast({ message: 'تم إنشاء واعتماد العقد بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error adding contract:', err);
      handleFirestoreError(err, OperationType.CREATE, 'contracts');
      throw err;
    }
  };

  const handleUpdateContract = async (id: string, updates: Partial<Contract>) => {
    try {
      if (id.startsWith('contract-')) {
        await setDoc(doc(db, 'contracts', id), {
          ...updates,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(doc(db, 'contracts', id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
      }
      setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
      try {
        const updatedList = contracts.map(c => c.id === id ? { ...c, ...updates } : c);
        localStorage.setItem('drfix_contracts', JSON.stringify(updatedList));
      } catch {}
      setDeleteToast({ message: 'تم تحديث بيانات العقد بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error updating contract:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'contracts');
      throw err;
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      if (!id.startsWith('contract-')) {
        await deleteDoc(doc(db, 'contracts', id));
      }
      setContracts(prev => prev.filter(c => c.id !== id));
      try {
        const filtered = contracts.filter(c => c.id !== id);
        localStorage.setItem('drfix_contracts', JSON.stringify(filtered));
      } catch {}
      setDeleteToast({ message: 'تم حذف العقد بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error deleting contract:', err);
      handleFirestoreError(err, OperationType.DELETE, 'contracts');
      throw err;
    }
  };

  const handleAddVehicleToContract = async (contractId: string, vehicleData: Omit<ContractVehicle, 'id' | 'createdAt'>) => {
    try {
      const newVehicle: ContractVehicle = {
        id: 'cv-' + Date.now(),
        ...vehicleData,
        createdAt: new Date().toISOString()
      };

      const targetContract = contracts.find(c => c.id === contractId);
      const currentVehicles = targetContract?.vehicles || [];
      const updatedVehicles = [newVehicle, ...currentVehicles];

      if (contractId.startsWith('contract-')) {
        await setDoc(doc(db, 'contracts', contractId), {
          ...targetContract,
          vehicles: updatedVehicles,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(doc(db, 'contracts', contractId), {
          vehicles: updatedVehicles,
          updatedAt: serverTimestamp()
        });
      }

      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, vehicles: updatedVehicles } : c));
      setDeleteToast({ message: 'تم تسجيل السيارة في سجل العقد بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error adding vehicle to contract:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'contracts');
      throw err;
    }
  };

  const handleUpdateVehicleInContract = async (contractId: string, vehicleId: string, updates: Partial<ContractVehicle>) => {
    try {
      const targetContract = contracts.find(c => c.id === contractId);
      if (!targetContract) return;

      const currentVehicles = targetContract.vehicles || [];
      const updatedVehicles = currentVehicles.map(v => v.id === vehicleId ? { ...v, ...updates } : v);

      if (contractId.startsWith('contract-')) {
        await setDoc(doc(db, 'contracts', contractId), {
          ...targetContract,
          vehicles: updatedVehicles,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(doc(db, 'contracts', contractId), {
          vehicles: updatedVehicles,
          updatedAt: serverTimestamp()
        });
      }

      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, vehicles: updatedVehicles } : c));
      setDeleteToast({ message: 'تم تحديث حالة السيارة بنجاح', type: 'success' });
    } catch (err) {
      console.error('Error updating vehicle in contract:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'contracts');
      throw err;
    }
  };

  const handleDeleteVehicleFromContract = async (contractId: string, vehicleId: string) => {
    try {
      const targetContract = contracts.find(c => c.id === contractId);
      if (!targetContract) return;

      const currentVehicles = targetContract.vehicles || [];
      const updatedVehicles = currentVehicles.filter(v => v.id !== vehicleId);

      if (contractId.startsWith('contract-')) {
        await setDoc(doc(db, 'contracts', contractId), {
          ...targetContract,
          vehicles: updatedVehicles,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateDoc(doc(db, 'contracts', contractId), {
          vehicles: updatedVehicles,
          updatedAt: serverTimestamp()
        });
      }

      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, vehicles: updatedVehicles } : c));
      setDeleteToast({ message: 'تم حذف السيارة من سجل العقد', type: 'success' });
    } catch (err) {
      console.error('Error deleting vehicle from contract:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'contracts');
      throw err;
    }
  };

  const handleEdit = (type: 'service' | 'offer' | 'gallery' | 'booking' | 'testimonial', item: any) => {
    if (isTechnician) {
      alert('عذراً، الفني الميداني ليس لديه صلاحية تعديل السجلات أو المحتوى الإداري.');
      return;
    }
    setEditingItem({ id: item.id || ('static-' + (item.title || item.name || 'item')), type });
    if (type === 'service') {
      setServiceForm({
        title: item.title || '',
        description: item.description || '',
        icon: item.icon || 'Wrench',
        price: item.price || ''
      });
    } else if (type === 'offer') {
      setOfferForm({
        title: item.title || '',
        price: item.price || '',
        subtitle: item.subtitle || '',
        features: Array.isArray(item.features) ? item.features.join('\n') : (item.features || ''),
        icon: item.icon || 'tag'
      });
    } else if (type === 'gallery') {
      setGalleryForm({
        title: item.title || '',
        imageUrl: item.imageUrl || '',
        category: item.category || 'صيانة دورية'
      });
      if (item.imageUrl && item.imageUrl.startsWith('data:')) {
        const sz = getBase64SizeInBytes(item.imageUrl);
        setUploadedImageMeta(prev => ({
          ...prev,
          gallery: {
            name: item.title || 'صورة المعرض',
            origSize: formatBytes(sz),
            origSizeBytes: sz,
            compSize: formatBytes(sz),
            compSizeBytes: sz,
            compDim: 'محفوظة مسبقاً'
          }
        }));
      } else {
        setUploadedImageMeta(prev => ({ ...prev, gallery: undefined }));
      }
    } else if (type === 'booking') {
      setFormData({
        customerPhone: item.customerPhone || '',
        carModel: item.carModel || '',
        serviceType: item.serviceType || '',
        notes: item.notes || '',
        cost: item.cost?.toString() || '',
        status: item.status || 'pending'
      });
    } else if (type === 'testimonial') {
      setTestimonialForm({
        name: item.name || '',
        comment: item.comment || '',
        rating: item.rating || 5,
        reply: item.reply || ''
      });
    }
    setIsAdding(true);
  };

  const handleToggleOfferStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'offers', id), {
        active: !currentStatus
      });
    } catch (error) {
      console.error("Error toggling offer status:", error);
    }
  };

  const handleDeleteAllOffers = () => {
    setDeleteConfirmTarget({
      type: 'batch_offers',
      title: 'حذف جميع العروض الترويجية',
      count: offers.length
    });
  };

  const handleDelete = (collectionName: string, id: string, label?: string) => {
    if (isTechnician) {
      alert('عذراً، الفني الميداني ليس لديه صلاحية حذف الحجوزات أو السجلات.');
      return;
    }
    setDeleteConfirmTarget({
      type: 'single',
      collectionName,
      id,
      title: label || (collectionName === 'maintenance' ? 'هذا الحجز' : 'هذا العنصر')
    });
  };

  const handleToggleSelectBooking = (id: string) => {
    if (isTechnician) return;
    setSelectedBookingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFilteredBookings = (allIds: string[]) => {
    if (isTechnician) return;
    if (allIds.length === 0) return;
    const allSelected = allIds.every(id => selectedBookingIds.has(id));
    if (allSelected) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(allIds));
    }
  };

  const handleDeleteSelectedBookings = () => {
    if (isTechnician) {
      alert('عذراً، الفني الميداني ليس لديه صلاحية حذف الحجوزات.');
      return;
    }
    if (selectedBookingIds.size === 0) {
      setDeleteToast({ message: 'يرجى تحديد حجز واحد على الأقل أولاً لحذفه', type: 'error' });
      return;
    }
    setDeleteConfirmTarget({
      type: 'batch_bookings',
      title: `حذف (${selectedBookingIds.size}) حجز محدد`,
      count: selectedBookingIds.size
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    if (isTechnician) {
      setDeleteConfirmTarget(null);
      alert('عذراً، الفني الميداني ليس لديه صلاحية حذف البيانات.');
      return;
    }
    setIsDeletingProcess(true);
    try {
      if (deleteConfirmTarget.type === 'batch_bookings') {
        const ids = Array.from(selectedBookingIds);
        const count = ids.length;

        // Optimistic UI update immediately
        setRecords(prev => prev.filter(r => !selectedBookingIds.has(r.id)));
        setSelectedBookingIds(new Set());

        // Delete all from Firestore in parallel
        await Promise.all(ids.map(id => deleteDoc(doc(db, 'maintenance', String(id)))));

        setDeleteConfirmTarget(null);
        setDeleteToast({ message: `تم حذف (${count}) حجز بنجاح!`, type: 'success' });
      } else if (deleteConfirmTarget.type === 'batch_offers') {
        const offersToDelete = [...offers];
        setOffers([]);
        await Promise.all(offersToDelete.map(o => deleteDoc(doc(db, 'offers', o.id))));
        setDeleteConfirmTarget(null);
        setDeleteToast({ message: 'تم حذف جميع العروض بنجاح!', type: 'success' });
      } else if (deleteConfirmTarget.type === 'single' && deleteConfirmTarget.collectionName && deleteConfirmTarget.id) {
        const { collectionName, id } = deleteConfirmTarget;

        if (collectionName === 'maintenance') {
          setRecords(prev => prev.filter(r => r.id !== id));
          setSelectedBookingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          if (selectedBookingDetails?.id === id) {
            setSelectedBookingDetails(null);
          }
        } else if (collectionName === 'services') {
          setServices(prev => prev.filter(s => s.id !== id));
        } else if (collectionName === 'offers') {
          setOffers(prev => prev.filter(o => o.id !== id));
        } else if (collectionName === 'gallery') {
          setGallery(prev => prev.filter(g => g.id !== id));
        } else if (collectionName === 'testimonials') {
          setTestimonials(prev => prev.filter(t => t.id !== id));
        }

        await deleteDoc(doc(db, collectionName, id));
        setDeleteConfirmTarget(null);
        setDeleteToast({ message: 'تم الحذف بنجاح!', type: 'success' });
      }
    } catch (error) {
      console.error("Error executing deletion:", error);
      setDeleteToast({ message: 'حدث خطأ أثناء محاولة الحذف، يرجى المحاولة ثانية.', type: 'error' });
    } finally {
      setIsDeletingProcess(false);
      setTimeout(() => {
        setDeleteToast(null);
      }, 4000);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: MaintenanceRecord['status']) => {
    const target = records.find(r => r.id === id);

    // Strictly ensure technicians can only change status of tasks assigned to them
    if (isTechnician && currentStaffUser) {
      const staffName = (currentStaffUser.fullName || '').trim().toLowerCase();
      const isAssigned = target?.assignedStaffId === currentStaffUser.id ||
        Boolean(target?.assignedStaffName && staffName && target.assignedStaffName.trim().toLowerCase() === staffName);
      if (!isAssigned) {
        alert('عذراً، لا تملك صلاحية تغيير حالة هذا الحجز لأنه غير مسند إليك.');
        return;
      }
    }

    // Immediate optimistic state update for instant UI feedback & smoothness
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r));
    if (selectedBookingDetails && selectedBookingDetails.id === id) {
      setSelectedBookingDetails(prev => prev ? { ...prev, status: newStatus } : null);
    }

    let waUrl = '';
    let statusLabelAr = 'تحديث الحالة';
    if (newStatus === 'accepted') statusLabelAr = 'تم القبول ✅';
    if (newStatus === 'on_the_way') statusLabelAr = 'الفني بالطريق 🚗';
    if (newStatus === 'in-progress') statusLabelAr = 'قيد العمل 🔧';
    if (newStatus === 'completed') statusLabelAr = 'تم الإنجاز 🏁';
    if (newStatus === 'cancelled') statusLabelAr = 'ملغي ❌';
    if (newStatus === 'new') statusLabelAr = 'جديد 🆕';

    if (!isTechnician && target && target.customerPhone) {
      waUrl = getWhatsAppStatusUrl(target, newStatus);
      
      // Synchronously open WhatsApp immediately in direct click context
      let opened = false;
      try {
        const win = window.open(waUrl, '_blank');
        if (win && !win.closed) {
          opened = true;
        }
      } catch (e) {
        console.warn('Direct popup window open was blocked:', e);
      }

      // If popup was blocked or inside restricted iframe, fallback to anchor click
      if (!opened) {
        try {
          const a = document.createElement('a');
          a.href = waUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          opened = true;
        } catch (err) {
          console.warn('Anchor fallback failed:', err);
        }
      }

      setWaBanner({
        show: true,
        url: waUrl,
        customerName: target.customerName || target.customerPhone,
        statusLabel: statusLabelAr,
        carModel: target.carModel || 'السيارة',
        bookingId: target.bookingId || target.id
      });
    }

    // Persist to Firestore in background
    updateDoc(doc(db, 'maintenance', id), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    }).catch(error => {
      console.error("Error updating status in Firestore:", error);
    });

    // Record in system audit trail
    logAuditEvent(
      id,
      newStatus === 'cancelled' ? 'cancelled' : 'status_change',
      `تحديث حالة الطلب إلى: ${statusLabelAr}`,
      undefined,
      target?.status,
      newStatus
    );

    // Trigger FCM instant notification
    triggerServerFcmNotification({
      title: 'تحديث حالة الطلب 🔧',
      body: `تم تحديث حالة طلب الصيانة #${target?.bookingId || target?.id || id} إلى: ${statusLabelAr}. اضغط لمتابعة التفاصيل.`,
      url: '/admin',
      bookingId: target?.bookingId || target?.id || id,
      eventType: 'status_update'
    }).catch(err => console.warn('Failed to dispatch status FCM:', err));
  };

  const logAuditEvent = async (
    recordId: string, 
    actionType: AuditLogEntry['actionType'], 
    actionTitle: string, 
    details?: string, 
    oldValue?: string, 
    newValue?: string
  ) => {
    const target = records.find(r => r.id === recordId);
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recordId,
      bookingId: target?.bookingId || recordId,
      actionType,
      actionTitle,
      details,
      oldValue,
      newValue,
      performedByStaffName: currentStaffUser?.fullName || 'إدارة المركز',
      performedByRole: currentStaffUser?.roleTitleAr || currentStaffUser?.role || 'الإدارة',
      timestamp: new Date().toISOString()
    };

    const updatedLogs = [newEntry, ...(target?.auditLogs || [])];

    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        auditLogs: updatedLogs,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not persist audit log to firestore:', err);
    }

    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, auditLogs: updatedLogs } : r));
    if (selectedBookingDetails?.id === recordId) {
      setSelectedBookingDetails(prev => prev ? { ...prev, auditLogs: updatedLogs } : null);
    }
  };

  const handleSaveRepairApproval = async (approval: CustomerRepairApproval) => {
    if (!repairApprovalRecord) return;
    const recordId = repairApprovalRecord.id;
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        repairApproval: approval,
        updatedAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, repairApproval: approval } : r));
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(prev => prev ? { ...prev, repairApproval: approval } : null);
      }

      await logAuditEvent(
        recordId,
        approval.status === 'approved' ? 'repair_approved' : 'repair_quotation_sent',
        approval.status === 'approved' ? 'اعتماد موافقة وتوقيع العميل على بدء الإصلاح' : 'إرسال عرض أسعار الإصلاح للعميل',
        `حالة الموافقة: ${approval.status} • الإجمالي: ${approval.grandTotal} ر.س`
      );
    } catch (err) {
      console.error('Error saving repair approval:', err);
      alert('حدث خطأ أثناء حفظ موافقة الإصلاح');
    }
  };

  const handleSavePricing = async (pricing: PricingBreakdown) => {
    if (!pricingBreakdownRecord) return;
    const recordId = pricingBreakdownRecord.id;
    const oldCost = pricingBreakdownRecord.cost || 0;
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        pricing,
        cost: pricing.grandTotal,
        updatedAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, pricing, cost: pricing.grandTotal } : r));
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(prev => prev ? { ...prev, pricing, cost: pricing.grandTotal } : null);
      }

      await logAuditEvent(
        recordId,
        'price_update',
        'تعديل تفاصيل تسعير الطلب والفاتورة',
        `أجور يد: ${pricing.laborCost} ر.س | قطع غيار: ${pricing.partsCost} ر.س | رسوم انتقال: ${pricing.travelFee} ر.س | خصم: ${pricing.discount} ر.س`,
        `${oldCost} ر.س`,
        `${pricing.grandTotal} ر.س`
      );
    } catch (err) {
      console.error('Error saving pricing:', err);
      alert('حدث خطأ أثناء حفظ تفاصيل التسعير');
    }
  };

  const handleSaveWarranty = async (warranty: WarrantyDetails) => {
    if (!warrantyComplaintsRecord) return;
    const recordId = warrantyComplaintsRecord.id;
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        warranty,
        updatedAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, warranty } : r));
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(prev => prev ? { ...prev, warranty } : null);
      }

      await logAuditEvent(
        recordId,
        'warranty_issued',
        'إصدار وتوثيق شهادة الضمان المعتمدة',
        `المدة: ${warranty.warrantyPeriodLabel} • ساري حتى: ${new Date(warranty.endDate).toLocaleDateString('ar-SA')}`
      );
    } catch (err) {
      console.error('Error saving warranty:', err);
      alert('حدث خطأ أثناء حفظ بيانات الضمان');
    }
  };

  const handleAddComplaint = async (complaint: ServiceComplaint) => {
    if (!warrantyComplaintsRecord) return;
    const recordId = warrantyComplaintsRecord.id;
    const existing = warrantyComplaintsRecord.complaints || [];
    const updated = [complaint, ...existing];
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        complaints: updated,
        updatedAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, complaints: updated } : r));
      setWarrantyComplaintsRecord(prev => prev ? { ...prev, complaints: updated } : null);
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(prev => prev ? { ...prev, complaints: updated } : null);
      }

      await logAuditEvent(
        recordId,
        'complaint_logged',
        `تسجيل بلاغ/شكوى جديدة: ${complaint.complaintTitle}`,
        `المسؤول المكلف: ${complaint.assignedStaffName} • الأولوية: ${complaint.priority}`
      );
    } catch (err) {
      console.error('Error adding complaint:', err);
      alert('حدث خطأ أثناء حفظ الشكوى');
    }
  };

  const handleUpdateComplaint = async (complaintId: string, updates: Partial<ServiceComplaint>) => {
    if (!warrantyComplaintsRecord) return;
    const recordId = warrantyComplaintsRecord.id;
    const existing = warrantyComplaintsRecord.complaints || [];
    const updated = existing.map(c => c.id === complaintId ? { ...c, ...updates } : c);
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        complaints: updated,
        updatedAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, complaints: updated } : r));
      setWarrantyComplaintsRecord(prev => prev ? { ...prev, complaints: updated } : null);
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(prev => prev ? { ...prev, complaints: updated } : null);
      }

      await logAuditEvent(
        recordId,
        'complaint_updated',
        'تحديث ومعالجة الشكوى',
        updates.resolutionNotes ? `تم الحل: ${updates.resolutionNotes}` : 'تم تغيير بيانات الشكوى'
      );
    } catch (err) {
      console.error('Error updating complaint:', err);
      alert('حدث خطأ أثناء تحديث الشكوى');
    }
  };

  const handleConfirmStatusChange = async (
    newStatus: BookingStatus,
    details: {
      cancellationReason?: string;
      rescheduledDate?: string;
      rescheduleReason?: string;
      noShowNotes?: string;
    }
  ) => {
    if (!statusChangeModalData) return;
    const { record } = statusChangeModalData;
    const recordId = record.id;
    const oldStatus = record.status;

    try {
      const updatePayload: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...details
      };

      await updateDoc(doc(db, 'maintenance', recordId), updatePayload);

      const updatedRecord = { ...record, ...updatePayload };
      setRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(updatedRecord);
      }

      let actionTitle = `تغيير الحالة إلى ${newStatus}`;
      if (newStatus === 'cancelled') actionTitle = 'إلغاء الطلب وتوثيق السبب';
      if (newStatus === 'rescheduled') actionTitle = 'تأجيل الموعد وإعادة الجدولة';
      if (newStatus === 'no_show') actionTitle = 'توثيق حالة عدم حضور العميل';

      const detailsStr = details.cancellationReason || details.rescheduleReason || details.noShowNotes || '';

      await logAuditEvent(
        recordId,
        newStatus === 'cancelled' ? 'cancelled' : newStatus === 'rescheduled' ? 'rescheduled' : 'status_change',
        actionTitle,
        detailsStr,
        oldStatus,
        newStatus
      );

      // Trigger FCM Instant Push Notification for Status Change
      try {
        fetch('/api/fcm-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'تحديث حالة الطلب 🔧',
            body: `تم تحديث حالة طلب الصيانة #${record.bookingId || recordId} إلى: ${actionTitle}. اضغط لمتابعة التفاصيل.`,
            url: '/admin',
            bookingId: record.bookingId || recordId,
            serverKey: settings.fcmServerKey,
            eventType: 'status_change'
          })
        }).catch(e => console.warn('FCM status change notify error:', e));
      } catch (fcmE) {}

      if (record.customerPhone) {
        const waUrl = getWhatsAppStatusUrl(updatedRecord, newStatus);
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      console.error('Error changing status with details:', err);
      alert('حدث خطأ أثناء تغيير الحالة');
    }
  };

  const handleSaveTechReview = async (review: TechnicianDetailedReview) => {
    if (!techReviewRecord) return;
    const recordId = techReviewRecord.id;
    try {
      await updateDoc(doc(db, 'maintenance', recordId), {
        techDetailedReview: review,
        updatedAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, techDetailedReview: review } : r));
      if (selectedBookingDetails?.id === recordId) {
        setSelectedBookingDetails(prev => prev ? { ...prev, techDetailedReview: review } : null);
      }

      await logAuditEvent(
        recordId,
        'other',
        'تسجيل تقييم تفصيلي لأداء الفني',
        `المتوسط: ${review.overallRating}/5 (جودة: ${review.workQualityRating}، التزام: ${review.punctualityRating}، أسلوب: ${review.mannerRating}، نظافة: ${review.cleanlinessRating})`
      );
    } catch (err) {
      console.error('Error saving tech review:', err);
      alert('حدث خطأ أثناء حفظ التقييم');
    }
  };

  const handleSendPreAppointmentConfirmation = async (record: MaintenanceRecord) => {
    const waUrl = getPreAppointmentConfirmationWhatsAppUrl(record);
    window.open(waUrl, '_blank');

    try {
      await updateDoc(doc(db, 'maintenance', record.id), {
        customerConfirmationStatus: 'sent',
        preAppointmentConfirmationSentAt: new Date().toISOString()
      });

      setRecords(prev => prev.map(r => r.id === record.id ? { 
        ...r, 
        customerConfirmationStatus: 'sent', 
        preAppointmentConfirmationSentAt: new Date().toISOString() 
      } : r));

      await logAuditEvent(
        record.id,
        'other',
        'إرسال تذكير وتأكيد الموعد عبر واتساب',
        'تم إرسال طلب تأكيد الحضور وجاهزية السيارة للعميل'
      );
    } catch (err) {
      console.warn('Could not update confirmation status:', err);
    }
  };

  const handleReply = async (testimonialId: string) => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'testimonials', testimonialId), {
        reply: replyText
      });
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error("Error replying to testimonial:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'stats', 'global'), {
        ...settingsForm,
        updatedAt: serverTimestamp()
      });
      try {
        localStorage.setItem('drfix_app_settings', JSON.stringify({ ...DEFAULT_APP_SETTINGS, ...settings, ...settingsForm }));
      } catch {}
      alert('تم تحديث الإعدادات بنجاح');
    } catch (error) {
      console.error("Error updating settings:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'stats/global');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
        fullDate: d.toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' })
      };
    });

    return last7Days.map(item => {
      const dayRecords = records.filter(r => {
        const d = getRecordDate(r.serviceDate);
        return d.toISOString().split('T')[0] === item.dateStr;
      });
      const revenue = dayRecords.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
      return {
        name: item.dayName,
        fullDate: item.fullDate,
        bookings: dayRecords.length,
        revenue
      };
    });
  };

  const getMonthlyRevenueData = () => {
    const months = [...Array(6)].map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('ar-SA', { month: 'short' })
      };
    });

    return months.map(m => {
      const mRecords = records.filter(r => {
        const d = getRecordDate(r.serviceDate);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const revenue = mRecords.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
      return {
        name: m.label,
        revenue,
        bookings: mRecords.length
      };
    });
  };

  const getServiceStats = () => {
    const stats: Record<string, number> = {};
    records.forEach(r => {
      const sType = r.serviceType || 'صيانة عامة';
      stats[sType] = (stats[sType] || 0) + 1;
    });
    if (Object.keys(stats).length === 0) {
      return [
        { name: 'فحص كمبيوتر', value: 12 },
        { name: 'كهرباء وبطاريات', value: 8 },
        { name: 'ميكانيكا متنقلة', value: 15 },
        { name: 'صيانة دورية', value: 6 }
      ];
    }
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const getStatusStats = () => {
    const statusMap: Record<string, { label: string; count: number; color: string }> = {
      new: { label: 'جديد', count: 0, color: '#A855F7' },
      pending: { label: 'قيد الانتظار', count: 0, color: '#E5E7EB' },
      accepted: { label: 'تم القبول', count: 0, color: '#10B981' },
      on_the_way: { label: 'الفني بالطريق', count: 0, color: '#6366F1' },
      'in-progress': { label: 'قيد العمل', count: 0, color: '#3B82F6' },
      completed: { label: 'مكتمل', count: 0, color: '#22C55E' },
      cancelled: { label: 'ملغي', count: 0, color: '#EF4444' }
    };

    records.forEach(r => {
      const s = r.status || 'pending';
      if (statusMap[s]) {
        statusMap[s].count += 1;
      } else {
        statusMap.pending.count += 1;
      }
    });

    return Object.values(statusMap);
  };

  const getTopCarMakes = () => {
    const makes: Record<string, number> = {};
    records.forEach(r => {
      const car = (r.carModel || '').split(' ')[0] || 'غير محدد';
      makes[car] = (makes[car] || 0) + 1;
    });
    return Object.entries(makes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([make, count]) => ({ make, count }));
  };

  const COLORS = ['#E31837', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#3B82F6', '#10B981'];

  // Strict technician permissions enforcement:
  const userPermissions: StaffPermissions = isTechnician
    ? {
        ...ROLE_PRESETS.technician.permissions,
        ...(currentStaffUser?.permissions || {}),
        canManageSettings: false,
        canManageStaff: false,
        canManageContent: false,
        canManageContracts: false,
        canManageCustomers: false,
        canViewAnalytics: false,
        canManageTestimonials: false,
        canManageNotifications: false,
        canViewDashboard: false,
        canViewReports: false,
        canDeleteBookings: false,
      }
    : (currentStaffUser?.permissions || DEFAULT_SUPER_ADMIN_PERMISSIONS);

  // Strictly filter records for technicians: they can ONLY see tasks assigned to them
  const accessibleRecords = useMemo(() => {
    if (isTechnician && currentStaffUser) {
      const staffName = (currentStaffUser.fullName || '').trim().toLowerCase();
      return records.filter(r => 
        r.assignedStaffId === currentStaffUser.id || 
        (r.assignedStaffName && staffName && r.assignedStaffName.trim().toLowerCase() === staffName)
      );
    }
    return records;
  }, [records, isTechnician, currentStaffUser]);

  // Strictly restrict navigation tabs for technicians to eliminate clutter & permission leaks
  const allowedNavTabs = isTechnician ? [
    { id: 'bookings', label: lang === 'ar' ? 'مهامي الميدانية 🔧' : 'My Field Tasks', icon: Wrench, allowed: true },
    { id: 'calendar', label: lang === 'ar' ? 'جدول مواعيدي 📅' : 'My Schedule', icon: CalendarCheck, allowed: true },
    { id: 'manual', label: lang === 'ar' ? 'دليل الفني الميداني 📖' : 'Field Manual', icon: BookOpen, allowed: true },
  ] : [
    { id: 'dashboard', label: lang === 'ar' ? 'الإحصائيات ونظرة عامة' : 'Dashboard & Overview', icon: BarChart, allowed: userPermissions.canViewDashboard !== false },
    { id: 'bookings', label: lang === 'ar' ? 'الحجوزات والعمليات' : 'Bookings & Operations', icon: Calendar, allowed: userPermissions.canManageBookings !== false },
    { id: 'calendar', label: lang === 'ar' ? 'التقويم والمواعيد' : 'Calendar & Schedule', icon: CalendarCheck, allowed: userPermissions.canViewCalendar !== false },
    { id: 'customers', label: lang === 'ar' ? 'العملاء وسجل السيارات' : 'Customers & Vehicles', icon: User, allowed: userPermissions.canManageCustomers !== false },
    { id: 'contracts', label: lang === 'ar' ? 'إدارة العقود (ورش وشركات)' : 'Contracts (Workshops & Fleets)', icon: FileCheck, allowed: userPermissions.canManageContracts !== false },
    { id: 'reports', label: lang === 'ar' ? 'التقارير وسندات الصيانة (Word & PDF)' : 'Reports & Work Orders (Word & PDF)', icon: Printer, allowed: userPermissions.canViewReports !== false },
    { id: 'analytics', label: lang === 'ar' ? 'التحليلات ومؤشرات الأداء' : 'Analytics & KPIs', icon: TrendingUp, allowed: userPermissions.canViewAnalytics !== false },
    { id: 'staff', label: lang === 'ar' ? 'فريق العمل والصلاحيات' : 'Staff & Permissions', icon: ShieldCheck, allowed: userPermissions.canManageStaff !== false },
    { id: 'content', label: lang === 'ar' ? 'إدارة المحتوى والعروض' : 'Content & Offers', icon: FileText, allowed: userPermissions.canManageContent !== false },
    { id: 'partners', label: lang === 'ar' ? 'شركاء النجاح' : 'Success Partners', icon: Handshake, allowed: userPermissions.canManageContent !== false },
    { id: 'testimonials', label: lang === 'ar' ? 'التقييمات والآراء' : 'Reviews & Feedback', icon: MessageSquare, allowed: userPermissions.canManageTestimonials !== false },
    { id: 'notifications', label: lang === 'ar' ? 'إشعارات FCM وتيليجرام' : 'FCM Push & Telegram', icon: Bell, allowed: userPermissions.canManageNotifications !== false },
    { id: 'settings', label: lang === 'ar' ? 'الإعدادات العامة والهوية' : 'General Settings', icon: Settings, allowed: userPermissions.canManageSettings !== false },
    { id: 'manual', label: lang === 'ar' ? 'دليل ومزايا النظام' : 'System Manual & Guide', icon: BookOpen, allowed: true },
  ].filter(tab => tab.allowed);

  // Enforce auto-redirect: technicians can NEVER land on unauthorized admin tabs
  useEffect(() => {
    if (isTechnician) {
      if (activeTab !== 'bookings' && activeTab !== 'calendar' && activeTab !== 'manual') {
        setActiveTab('bookings');
      }
    } else if (allowedNavTabs.length > 0 && !allowedNavTabs.some(t => t.id === activeTab)) {
      setActiveTab(allowedNavTabs[0].id as any);
    }
  }, [currentStaffUser, isTechnician, activeTab]);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section id="admin" className="py-6 sm:py-12 bg-brand-black border-t border-white/5 min-h-screen w-full max-w-full overflow-x-hidden box-border">
      <div className="w-full max-w-[1550px] mx-auto px-2.5 sm:px-4 md:px-6 lg:px-8 box-border overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 w-full max-w-full box-border">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black italic mb-1.5">
              {isTechnician ? (
                lang === 'ar' ? (
                  <>لوحة <span className="text-brand-red">الفني الميداني</span> 🔧</>
                ) : (
                  <>Field <span className="text-brand-red">Technician Hub</span> 🔧</>
                )
              ) : lang === 'ar' ? (
                <>لوحة تحكم <span className="text-brand-red">المركز والعمليات</span></>
              ) : (
                <>Center & <span className="text-brand-red">Operations Hub</span></>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-gray-400 text-xs sm:text-sm">
              <span>
                {isTechnician
                  ? (lang === 'ar' ? 'متابعة المهام الميدانية وتوثيق الفحص المباشر' : 'Track field tasks & inspect vehicles')
                  : (lang === 'ar' ? 'إدارة الحجوزات والمواعيد والعملاء' : 'Manage bookings, schedules & customers')}
              </span>
              <span className="w-1.5 h-1.5 bg-brand-red rounded-full hidden sm:inline-block" />
              <span className="bg-white/5 px-2 py-0.5 rounded text-gray-300 font-mono font-bold text-[11px] sm:text-xs">
                {isTechnician 
                  ? (lang === 'ar' ? `${accessibleRecords.length} مهمة مسندة إليك` : `${accessibleRecords.length} assigned tasks`) 
                  : (lang === 'ar' ? `${records.length} حجز إجمالي` : `${records.length} total bookings`)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-start lg:justify-end max-w-full">
            {/* Logged-in Staff Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl max-w-full">
              <div className="w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red font-bold text-xs shrink-0">
                {currentStaffUser?.fullName?.charAt(0) || 'D'}
              </div>
              <div className="text-right min-w-0">
                <div className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                  {currentStaffUser?.fullName || (lang === 'ar' ? 'المدير العام' : 'General Manager')}
                </div>
                <div className="text-[10px] text-brand-red font-semibold truncate">
                  {lang === 'ar'
                    ? (currentStaffUser?.roleTitleAr || (currentStaffUser?.role === 'super_admin' ? 'مدير عام' : 'موظف'))
                    : (currentStaffUser?.roleTitleEn || (currentStaffUser?.role === 'super_admin' ? 'Super Admin' : 'Staff'))}
                </div>
              </div>
            </div>

            {/* Language Toggle in Admin Dashboard */}
            <LanguageToggle />

            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white/5 border border-white/10 rounded-xl font-bold text-xs sm:text-sm hover:bg-white/10 transition-all text-gray-300 cursor-pointer"
              title={lang === 'ar' ? 'العودة إلى واجهة الموقع الرئيسية' : 'Back to main website'}
            >
              <ArrowRight className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
            </button>
            
            {/* Sound alert toggle */}
            <button
              onClick={() => {
                const nextVal = !(settingsForm.enableSoundAlerts ?? true);
                setSettingsForm(prev => ({ ...prev, enableSoundAlerts: nextVal }));
                if (nextVal) {
                  playNotificationSound();
                }
              }}
              className={cn(
                "p-2 sm:p-2.5 border rounded-xl transition-all cursor-pointer",
                settingsForm.enableSoundAlerts !== false 
                  ? "bg-brand-red/10 border-brand-red/30 text-brand-red" 
                  : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
              )}
              title={settingsForm.enableSoundAlerts !== false ? (lang === 'ar' ? "الصوت مفعل للحجوزات الجديدة (اضغط للتعطيل)" : "Sound alert enabled (Click to mute)") : (lang === 'ar' ? "تفعيل الصوت التنبيهي" : "Enable sound chime")}
            >
              {settingsForm.enableSoundAlerts !== false ? <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
            </button>

            {/* App Download Link (Google Drive / APK) */}
            <a
              href={settingsForm.appDownloadUrl || settings.appDownloadUrl || "https://drive.google.com/drive/folders/1dfh85Zi8ZELc7EfUkIPcTlPJjiM9kflh?usp=sharing"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title={lang === 'ar' ? "تحميل تطبيق الجوال (Google Drive / APK)" : "Download Mobile App"}
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? "تحميل التطبيق" : "Download App"}</span>
            </a>

            {/* PWA Install Button */}
            <button
              onClick={handleInstallPWA}
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-2 border rounded-xl font-bold text-xs transition-all cursor-pointer",
                isPWAInstalled 
                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              )}
              title={lang === 'ar' ? "تثبيت لوحة التحكم كتطبيق مستقل على جوالك أو جهازك" : "Install dashboard as standalone PWA application"}
            >
              <Download className="w-4 h-4 text-brand-red" />
              <span>{isPWAInstalled ? (lang === 'ar' ? "مثبت ✓" : "Installed ✓") : (lang === 'ar' ? "تثبيت تطبيق (PWA)" : "Install App")}</span>
            </button>

            {!isTechnician && typeof Notification !== 'undefined' && (
              <button 
                onClick={() => {
                  if (notificationPermission === 'default') {
                    Notification.requestPermission().then(setNotificationPermission);
                  } else if (notificationPermission === 'granted') {
                    new Notification("تنبيه تجريبي 🚗", {
                      body: lang === 'ar' ? "التنبيهات تعمل بنجاح في متصفحك!" : "Notifications active in your browser!",
                      icon: settings.logoUrl || "/favicon.ico"
                    });
                  } else {
                    alert(lang === 'ar' ? "التنبيهات محظورة في متصفحك. يرجى تفعيلها من إعدادات المتصفح." : "Notifications blocked in your browser.");
                  }
                }}
                className={cn(
                  "p-2 sm:p-2.5 border rounded-xl transition-all cursor-pointer",
                  notificationPermission === 'granted' ? "bg-green-500/10 border-green-500/20 text-green-500" : 
                  notificationPermission === 'denied' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                  "bg-white/5 border-white/10 text-white hover:bg-white/10"
                )}
                title={notificationPermission === 'granted' ? (lang === 'ar' ? "التنبيهات مفعلة (اضغط للتجربة)" : "Notifications active") : (lang === 'ar' ? "تفعيل التنبيهات" : "Enable browser notifications")}
              >
                {notificationPermission === 'granted' ? <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
              </button>
            )}

            {!isTechnician && userPermissions.canManageBookings !== false && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-red rounded-xl font-bold italic hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 cursor-pointer text-white text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة حجز' : 'Add Booking'}</span>
              </button>
            )}

            <button 
              onClick={onLogout}
              className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-white cursor-pointer"
              title={lang === 'ar' ? "تسجيل الخروج" : "Logout"}
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs with Smooth Horizontal Controls for Laptops & Mobiles */}
        <div className="relative mb-6 sm:mb-8 group w-full max-w-full overflow-hidden">
          {/* Scroll Right Button (in RTL, scrolls back to start) */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('admin-nav-tabs-scroll');
              if (el) el.scrollBy({ left: 260, behavior: 'smooth' });
            }}
            className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-brand-dark/95 border border-white/20 text-white shadow-xl items-center justify-center hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer"
            title="تمرير التبويبات لليمين"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scroll Left Button (in RTL, scrolls forward to end) */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('admin-nav-tabs-scroll');
              if (el) el.scrollBy({ left: -260, behavior: 'smooth' });
            }}
            className="hidden md:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-brand-dark/95 border border-white/20 text-white shadow-xl items-center justify-center hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer"
            title="تمرير التبويبات لليسار"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div 
            id="admin-nav-tabs-scroll"
            className="flex overflow-x-auto gap-1.5 sm:gap-2 bg-white/5 p-1.5 sm:p-2 rounded-2xl border border-white/10 scroll-smooth custom-tabs-scrollbar w-full max-w-full no-scrollbar"
          >
            {allowedNavTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold transition-all shrink-0 text-xs sm:text-sm whitespace-nowrap cursor-pointer",
                  activeTab === tab.id 
                    ? "bg-brand-red text-white shadow-lg shadow-brand-red/20 scale-[1.02]" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Firestore Quota Notice Banner */}
        {quotaExceededInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm sm:text-base text-amber-300">
                    {lang === 'ar' ? 'تنبيه: استهلاك الحصة اليومية المجانية لقاعدة البيانات (Firestore Quota Limit)' : 'Notice: Free Daily Read Quota Exceeded'}
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {lang === 'ar' ? 'البيانات تعمل محلياً (Offline Cache)' : 'Working via Offline Cache'}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                  {lang === 'ar' 
                    ? 'وصلت قاعدة البيانات للحد الأقصى اليومي المجاني (50,000 عملية قراءة/يومياً). سيتم تجديد الحصة تلقائياً غداً، أو يمكنك الترقية لتجنب أي توقف. بيانات الحجوزات والفنيين معروضة حالياً من النسخة المحلية.'
                    : 'Your database reached the free daily Spark limit (50k daily reads). Quota automatically resets tomorrow, or you can upgrade. Local cached data is being displayed.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <a
                href="https://console.firebase.google.com/project/hr-system-2026/firestore/databases/ai-studio-remixremixdrfix-e1e9871e-7d4a-4013-91c4-cbaa38ac0601/data?openUpgradeDialog=true"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-colors"
              >
                <span>{lang === 'ar' ? 'ترقية الخطة في Firebase' : 'Upgrade Plan'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setQuotaExceededInfo(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                title={lang === 'ar' ? 'إخفاء' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isTechnician && activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
                <button onClick={() => setIsAdding(true)} className="p-4 glass-card border-brand-red/20 flex flex-col items-center justify-center gap-2 hover:bg-brand-red/5 transition-all group text-center cursor-pointer">
                  <PlusCircle className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">حجز جديد</span>
                </button>
                <button onClick={() => setActiveTab('contracts')} className="p-4 glass-card border-brand-red/20 flex flex-col items-center justify-center gap-2 hover:bg-brand-red/5 transition-all group text-center cursor-pointer">
                  <FileCheck className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة العقود</span>
                </button>
                <button onClick={() => { setActiveTab('content'); setContentTab('offers'); }} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center cursor-pointer">
                  <Tag className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة العروض الخاصة</span>
                </button>
                <button onClick={() => { setActiveTab('content'); setContentTab('services'); }} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center cursor-pointer">
                  <Wrench className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة الخدمات</span>
                </button>
                <button onClick={() => { setActiveTab('content'); setContentTab('gallery'); }} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center cursor-pointer">
                  <Camera className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة المعرض</span>
                </button>
                <button onClick={() => setActiveTab('partners')} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center cursor-pointer">
                  <Handshake className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">شركاء النجاح</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <div className="glass-card p-6 border-brand-red/20">
                <div className="text-gray-500 text-sm mb-2">إجمالي الحجوزات</div>
                <div className="text-4xl font-display font-black text-brand-red">{records.length}</div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-red" style={{ width: '70%' }} />
                </div>
              </div>
              <div className="glass-card p-6 border-brand-red/20">
                <div className="text-gray-500 text-sm mb-2">الحجوزات المكتملة</div>
                <div className="text-4xl font-display font-black text-emerald-400">
                  {records.filter(r => r.status === 'completed').length}
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${records.length > 0 ? Math.round((records.filter(r => r.status === 'completed').length / records.length) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="glass-card p-6 border-brand-red/20">
                <div className="text-gray-500 text-sm mb-2">الطلبات النشطة</div>
                <div className="text-4xl font-display font-black text-brand-red">
                  {records.filter(r => r.status === 'in-progress' || r.status === 'pending').length}
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-red" style={{ width: '40%' }} />
                </div>
              </div>
              <div className="glass-card p-6 border-brand-red/20">
                <div className="text-gray-500 text-sm mb-2">التعليقات الجديدة</div>
                <div className="text-4xl font-display font-black text-brand-red">
                  {testimonials.filter(t => !t.reply).length}
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-red" style={{ width: '25%' }} />
                </div>
              </div>

              <div className="glass-card p-6 border-brand-red/20">
                <div className="text-gray-500 text-sm mb-2">إجمالي العروض</div>
                <div className="text-4xl font-display font-black text-brand-red">
                  {offers.length}
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-red" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="glass-card p-6 border-brand-red/20">
                <div className="text-gray-500 text-sm mb-2">صور المعرض</div>
                <div className="text-4xl font-display font-black text-brand-red">
                  {gallery.length + STATIC_GALLERY.filter(sg => !gallery.some(g => g.title === sg.title)).length}
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-red" style={{ width: '60%' }} />
                </div>
              </div>

              <div className="md:col-span-3 glass-card p-6 border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">آخر الحجوزات</h3>
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className="text-brand-red text-sm font-bold hover:underline"
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="space-y-4">
                  {records.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{record.carModel}</div>
                          <div className="text-xs text-gray-500">{record.serviceType}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-gray-400">
                          {record.bookingId ? `#${record.bookingId}` : 'طلب صيانة'}
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1",
                          record.status === 'completed' ? "text-green-500 bg-green-500/10" :
                          record.status === 'in-progress' ? "text-blue-500 bg-blue-500/10" :
                          "text-white bg-white/10 border border-white/20"
                        )}>
                          {record.status === 'completed' ? 'مكتمل' : 
                           record.status === 'in-progress' ? 'قيد العمل' : 'قيد الانتظار'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {records.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm italic">لا توجد حجوزات حالياً</div>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="md:col-span-2 glass-card p-6 border-white/5">
                <h3 className="text-lg font-bold mb-6">حركة الحجوزات (آخر 7 أيام)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        itemStyle={{ color: '#FF0000' }}
                      />
                      <Line type="monotone" dataKey="bookings" stroke="#FF0000" strokeWidth={3} dot={{ fill: '#FF0000' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 border-white/5">
                <h3 className="text-lg font-bold mb-6">الخدمات الأكثر طلباً</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getServiceStats()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getServiceStats().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

          {activeTab === 'bookings' && (
            <motion.div 
              key="bookings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {isTechnician ? (
                <TechnicianWorkspace 
                  records={accessibleRecords}
                  currentStaffUser={currentStaffUser}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenTimeline={handleOpenTimeline}
                  onSelectDetails={handleSelectBookingDetails}
                  onOpenWorkflowGuide={() => {
                    setWorkflowGuideDefaultRole('technician');
                    setShowWorkflowGuideModal(true);
                  }}
                  lang={lang}
                />
              ) : (
                <>
                  {/* WhatsApp Live Status Notice Banner */}
              {waBanner && waBanner.show && (
                <motion.div
                  initial={{ opacity: 0, y: -15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-black border-2 border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-950/40"
                >
                  <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 shadow-inner">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>تم تحديث الحالة إلى:</span>
                        <span className="text-emerald-400 font-extrabold">{waBanner.statusLabel}</span>
                      </div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        تم فتح الواتساب للتواصل مع <b>{waBanner.customerName}</b> ({waBanner.carModel}) رقم الحجز: <span className="font-mono text-emerald-300">#{waBanner.bookingId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <a
                      href={waBanner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>فتح واتساب العميل ↗️</span>
                    </a>
                    <button
                      onClick={() => setWaBanner(null)}
                      className="px-3 py-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 text-xs transition-colors cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Filter & Search Bar */}
              <div className="glass-card p-6 border-white/5 space-y-4">
                {/* Mode Selector for Staff / Technicians */}
                {isTechnician ? (
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-brand-red/15 border border-brand-red/30 rounded-2xl w-fit">
                    <Wrench className="w-4 h-4 text-brand-red" />
                    <span className="text-xs font-bold text-white">المهام الميدانية المسندة إليك فقط</span>
                    <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {accessibleRecords.length} مهمة
                    </span>
                  </div>
                ) : currentStaffUser && (
                  <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl w-fit flex-wrap">
                    <button
                      type="button"
                      onClick={() => setTechTaskFilter('all')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        techTaskFilter === 'all'
                          ? "bg-white/15 text-white shadow-sm"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <span>جميع الحجوزات</span>
                      <span className="bg-white/10 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full">{records.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTechTaskFilter('my_tasks')}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        techTaskFilter === 'my_tasks'
                          ? "bg-brand-red text-white shadow-lg shadow-brand-red/25"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <Wrench className="w-3.5 h-3.5 text-white" />
                      <span>مهامي الميدانية المسندة إلي</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        techTaskFilter === 'my_tasks' ? "bg-black/40 text-white" : "bg-white/10 text-gray-300"
                      )}>
                        {accessibleRecords.length}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Status Filter Badges */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'الكل', count: (isTechnician ? accessibleRecords : records).length },
                      { id: 'new', label: 'جديد', count: (isTechnician ? accessibleRecords : records).filter(r => r.status === 'new').length },
                      { id: 'accepted', label: 'تم القبول', count: (isTechnician ? accessibleRecords : records).filter(r => r.status === 'accepted').length },
                      { id: 'on_the_way', label: 'الفني بالطريق', count: (isTechnician ? accessibleRecords : records).filter(r => r.status === 'on_the_way').length },
                      { id: 'in-progress', label: 'قيد العمل', count: (isTechnician ? accessibleRecords : records).filter(r => r.status === 'in-progress').length },
                      { id: 'completed', label: 'مكتمل', count: (isTechnician ? accessibleRecords : records).filter(r => r.status === 'completed').length },
                      { id: 'cancelled', label: 'ملغي', count: (isTechnician ? accessibleRecords : records).filter(r => r.status === 'cancelled').length },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setBookingStatusFilter(f.id as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                          bookingStatusFilter === f.id
                            ? "bg-brand-red text-white shadow-lg shadow-brand-red/20"
                            : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <span>{f.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px]",
                          bookingStatusFilter === f.id ? "bg-black/40 text-white" : "bg-white/10 text-gray-300"
                        )}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        const summary = {
                          title: 'تقرير حجوزات DR.FIX - ميكانيكي متنقل بجدة',
                          periodLabel: bookingStatusFilter === 'all' ? 'جميع الحالات' : `حالة: ${bookingStatusFilter}`,
                          generatedAt: new Date().toLocaleString('ar-SA'),
                          totalBookings: records.length,
                          completedBookings: records.filter(r => r.status === 'completed').length,
                          items: records.filter(r => bookingStatusFilter === 'all' || r.status === bookingStatusFilter)
                        };
                        exportBookingsToWord(summary);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600/90 hover:bg-blue-600 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                      title="تصدير الحجوزات المعروضة لملف وورد رسمي"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تصدير Word (.doc)</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                      title="فتح قسم التقارير الشامل والطباعة"
                    >
                      <Printer className="w-3.5 h-3.5 text-brand-red" />
                      <span>التقارير الشاملة</span>
                    </button>
                    <button 
                      onClick={() => {
                        setFormData({ customerPhone: '', carModel: '', serviceType: '', notes: '', cost: '', status: 'pending' });
                        setEditingItem(null);
                        setIsAdding(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-brand-red rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      إضافة حجز جديد
                    </button>
                  </div>
                </div>

                {/* Search Field */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={bookingSearch}
                    onChange={e => setBookingSearch(e.target.value)}
                    placeholder="ابحث برقم الجوال، اسم الفني، نوع السيارة، الخدمة، أو رقم الحجز..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-xs outline-none focus:border-brand-red transition-all text-white placeholder:text-gray-500"
                  />
                  {bookingSearch && (
                    <button 
                      onClick={() => setBookingSearch('')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bookings Selection & Batch Controls */}
              {(() => {
                const baseRecords = isTechnician 
                  ? accessibleRecords 
                  : (techTaskFilter === 'my_tasks' && currentStaffUser ? accessibleRecords : records);

                const displayedBookings = baseRecords
                  .filter(r => bookingStatusFilter === 'all' || r.status === bookingStatusFilter)
                  .filter(r => {
                    if (!bookingSearch.trim()) return true;
                    const q = bookingSearch.toLowerCase().trim();
                    return (
                      (r.bookingId || '').toLowerCase().includes(q) ||
                      phoneMatchesSearch(r.customerPhone, bookingSearch) ||
                      (r.customerName || '').toLowerCase().includes(q) ||
                      (r.carModel || '').toLowerCase().includes(q) ||
                      (r.serviceType || '').toLowerCase().includes(q) ||
                      (r.location || '').toLowerCase().includes(q) ||
                      (r.notes || '').toLowerCase().includes(q) ||
                      (r.assignedStaffName || '').toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a));

                const allDisplayedSelected = displayedBookings.length > 0 && displayedBookings.every(b => selectedBookingIds.has(b.id));
                const selectedCount = selectedBookingIds.size;

                return (
                  <div className="space-y-4">
                    {/* Batch Selection Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-300 hover:text-white">
                          <input 
                            type="checkbox"
                            checked={allDisplayedSelected}
                            onChange={() => handleSelectAllFilteredBookings(displayedBookings.map(b => b.id))}
                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                          />
                          <span>تحديد الكل ({displayedBookings.length})</span>
                        </label>
                        {selectedCount > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-brand-red/20 text-brand-red font-bold border border-brand-red/30">
                            تم تحديد {selectedCount} حجز
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedCount > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedBookingIds(new Set())}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              إلغاء التحديد
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteSelectedBookings}
                              className="flex items-center gap-1.5 px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-lg shadow-brand-red/20 transition-all cursor-pointer active:scale-95"
                              title="حذف جميع الحجوزات المحددة نهائياً"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف الحجوزات المحددة ({selectedCount})</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (displayedBookings.length > 0) {
                                handleSelectAllFilteredBookings(displayedBookings.map(b => b.id));
                              } else {
                                setDeleteToast({ message: 'لا توجد أي حجوزات معروضة لتحديدها', type: 'error' });
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                            title="اضغط لتحديد الحجوزات أولاً"
                          >
                            <Trash2 className="w-3.5 h-3.5 opacity-60" />
                            <span>حذف الحجوزات (حدد أولاً)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bookings Table (Desktop) / Cards (Mobile) */}
                    <div className="glass-card overflow-hidden border-white/5">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10">
                              <th className="px-4 py-4 w-12 text-center">
                                <input 
                                  type="checkbox"
                                  checked={allDisplayedSelected}
                                  onChange={() => handleSelectAllFilteredBookings(displayedBookings.map(b => b.id))}
                                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                                  title="تحديد الكل"
                                />
                              </th>
                              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">السيارة والتاريخ</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">العميل والموقع</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">الخدمة والملاحظات</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">الحالة</th>
                              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {displayedBookings.map((record) => {
                              const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
                              const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
                              const waCustomer = (record.customerName || record.name || '').trim();
                              const waMsg = encodeURIComponent(`🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n${waCustomer ? `هلا ${waCustomer} 👋\n` : 'هلا بك 👋\n'}بخصوص حجزك (${record.bookingId || ''}) لسيارة (${record.carModel}) لخدمة (${record.serviceType || 'صيانة متنقلة'})\n\nكيف نقدر نخدمك؟ 🔧⚡`);
                              const rDate = getRecordDate(record.serviceDate);
                              const isSelected = selectedBookingIds.has(record.id);

                              return (
                                <tr key={record.id} className={cn("transition-colors", isSelected ? "bg-brand-red/10 border-l-2 border-brand-red" : "hover:bg-white/5")}>
                                  <td className="px-4 py-4 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectBooking(record.id)}
                                      className="w-4 h-4 rounded border-white/20 bg-black/40 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                                      title="تحديد الحجز"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                      <span>{record.carModel}</span>
                                      {record.bookingId && (
                                        <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                                          {record.bookingId}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-gray-500" />
                                      {rDate.toLocaleDateString('ar-SA')}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-sm text-gray-200" dir="ltr">{record.customerPhone}</div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                      <a 
                                        href={`https://api.whatsapp.com/send?phone=${waPhone}&text=${waMsg}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                        title="محادثة واتساب مباشرة"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        واتساب
                                      </a>
                                      <a 
                                        href={`tel:${record.customerPhone}`}
                                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                        title="اتصال هاتفي"
                                      >
                                        <PhoneCall className="w-3 h-3" />
                                        اتصال
                                      </a>
                                      {record.coordinates?.latitude && record.coordinates?.longitude ? (
                                        <a
                                          href={`https://www.google.com/maps?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                          title="فتح موقع العميل GPS على خرائط جوجل"
                                        >
                                          <Navigation className="w-3 h-3" />
                                          GPS
                                        </a>
                                      ) : record.location ? (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                          <MapPin className="w-3 h-3 text-brand-red" />
                                          {record.location}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white inline-flex items-center gap-1.5 max-w-full">
                                        <Wrench className="w-3.5 h-3.5 text-brand-red shrink-0" />
                                        <span className="truncate max-w-[220px]">{record.serviceType || 'صيانة متنقلة'}</span>
                                      </span>
                                    </div>
                                    {record.notes && (
                                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-300 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 max-w-xs" title={record.notes}>
                                        <FileText className="w-3 h-3 text-amber-400/80 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2 leading-relaxed break-words">{record.notes}</span>
                                      </div>
                                    )}
                                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                      {record.assignedStaffName ? (
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenTimeline(record, 'timeline')}
                                            className="min-h-[28px] py-1 px-2.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                                            title="الفني الميداني المسند - اضغط لفتح التوثيق ومراحل العمل"
                                          >
                                            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span className="truncate max-w-[140px]">الفني: {record.assignedStaffName}</span>
                                          </button>
                                          {record.assignedStaffPhone && (
                                            <a
                                              href={generateTechnicianAssignmentWhatsAppUrl(record, record.assignedStaffPhone, record.assignedStaffName)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="w-7 h-7 text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                                              title={`مراسلة الفني (${record.assignedStaffName}) عبر واتساب وإرسال تفاصيل المهمة`}
                                            >
                                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                            </a>
                                          )}
                                        </div>
                                      ) : !isTechnician ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenTimeline(record, 'assign')}
                                          className="min-h-[28px] py-1 px-2.5 text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                                          title="إسناد الطلب لفني صيانة ميداني"
                                        >
                                          <Plus className="w-3.5 h-3.5 shrink-0" />
                                          <span>+ إسناد لفني</span>
                                        </button>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="space-y-1.5">
                                      <select 
                                        value={record.status}
                                        onChange={(e) => handleUpdateStatus(record.id, e.target.value as any)}
                                        className={cn(
                                          "text-xs font-bold px-3 py-1.5 rounded-full bg-black/50 border outline-none cursor-pointer w-full",
                                          record.status === 'completed' ? "text-green-500 border-green-500/30 bg-green-500/10" :
                                          record.status === 'accepted' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                          record.status === 'on_the_way' ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" :
                                          record.status === 'in-progress' ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                                          record.status === 'cancelled' ? "text-red-400 border-red-500/30 bg-red-500/10" :
                                          record.status === 'new' ? "text-purple-400 border-purple-500/30 bg-purple-500/10" :
                                          "text-white border-white/20 bg-white/10"
                                        )}
                                      >
                                        <option value="new" className="bg-brand-dark text-purple-400">جديد</option>
                                        <option value="pending" className="bg-brand-dark text-white">قيد الانتظار</option>
                                        <option value="accepted" className="bg-brand-dark text-emerald-400">تم القبول</option>
                                        <option value="on_the_way" className="bg-brand-dark text-indigo-400">الفني بالطريق</option>
                                        <option value="in-progress" className="bg-brand-dark text-blue-400">قيد العمل</option>
                                        <option value="completed" className="bg-brand-dark text-green-400">مكتمل</option>
                                        <option value="cancelled" className="bg-brand-dark text-red-400">ملغي</option>
                                      </select>

                                      {/* Fast Direct WhatsApp Trigger Pills (Management only) */}
                                      {!isTechnician && (
                                        <div className="flex items-center gap-1">
                                        <a
                                          href={getWhatsAppStatusUrl(record, 'on_the_way')}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => handleUpdateStatus(record.id, 'on_the_way')}
                                          className="px-2 py-0.5 bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-0.5"
                                          title="تحديث الحالة إلى الفني بالطريق وفتح الواتساب مباشرة"
                                        >
                                          🚗 بالطريق
                                        </a>
                                        <a
                                          href={getWhatsAppStatusUrl(record, 'accepted')}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => handleUpdateStatus(record.id, 'accepted')}
                                          className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-0.5"
                                          title="قبول الحجز وفتح الواتساب مباشرة"
                                        >
                                          ✅ قبول
                                        </a>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-1">
                                      {/* Field Photo & Step Documentation */}
                                      <button
                                        type="button"
                                        onClick={() => setTimelineBookingRecord(record)}
                                        className={cn(
                                          "p-2 rounded-lg transition-all cursor-pointer relative",
                                          record.serviceSteps && record.serviceSteps.length > 0
                                            ? "text-brand-red bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/30"
                                            : "text-gray-400 hover:text-white hover:bg-white/10"
                                        )}
                                        title="مراحل العمل وتوثيق الصور الميدانية"
                                      >
                                        <Camera className="w-4 h-4" />
                                        {record.serviceSteps && record.serviceSteps.length > 0 && (
                                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-red text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                                            {record.serviceSteps.length}
                                          </span>
                                        )}
                                      </button>

                                      {!isTechnician && (
                                        <a
                                          href={getWhatsAppStatusUrl(record, record.status)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                          title="إرسال إشعار الحالة للعميل عبر الواتساب"
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                        </a>
                                      )}
                                      {/* زر فيو لمتابعة الفني ومراحل العمل */}
                                      <button 
                                        type="button"
                                        onClick={() => handleOpenTimeline(record, 'timeline')}
                                        className="h-8 px-2.5 bg-brand-red/15 hover:bg-brand-red/30 text-amber-300 border border-brand-red/35 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                                        title="فيو: متابعة مراحل العمل وتوثيق الفني أين وصل"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                        <span>فيو</span>
                                        {(record.serviceSteps?.length || 0) > 0 && (
                                          <span className="px-1.5 py-0.5 bg-brand-red text-white rounded text-[10px] font-bold leading-none">
                                            {record.serviceSteps!.length}
                                          </span>
                                        )}
                                      </button>
                                      <button 
                                        onClick={() => handleSelectBookingDetails(record)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                        title="عرض التفاصيل الكاملة"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleEdit('booking', record)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                        title="تعديل الحجز"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleDelete('maintenance', record.id, `${record.carModel} (${record.customerName || record.customerPhone || ''})`)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-red hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                        title="حذف هذا الحجز"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View (Optimized for Mobile App PWA) */}
                      <div className="md:hidden divide-y divide-white/10">
                        {displayedBookings.map((record) => {
                          const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
                          const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
                          const waCustomer = (record.customerName || record.name || '').trim();
                          const waMsg = encodeURIComponent(`🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n${waCustomer ? `هلا ${waCustomer} 👋\n` : 'هلا بك 👋\n'}بخصوص حجزك (${record.bookingId || ''}) لسيارة (${record.carModel})\n\nكيف نقدر نخدمك؟ 🔧⚡`);
                          const rDate = getRecordDate(record.serviceDate);
                          const isSelected = selectedBookingIds.has(record.id);

                          return (
                            <div key={record.id} className={cn("p-3.5 sm:p-4 space-y-3 transition-colors", isSelected ? "bg-brand-red/10 border-r-4 border-brand-red" : "bg-black/20")}>
                              {/* زر فيو لمتابعة العمل وحالة الفني أين وصل */}
                              <div className="pb-2.5 border-b border-white/10">
                                <button
                                  type="button"
                                  onClick={() => handleOpenTimeline(record, 'timeline')}
                                  className="w-full min-h-[42px] py-2 px-3 bg-gradient-to-r from-brand-red via-red-600 to-brand-red hover:brightness-110 active:scale-98 text-white rounded-xl font-bold flex items-center justify-between gap-2 shadow-md shadow-brand-red/25 border border-red-400/40 transition-all cursor-pointer overflow-hidden select-none"
                                  title="فيو: متابعة مراحل العمل وتوثيق الفني أين وصل"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Eye className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                                    <span className="font-black text-white text-xs sm:text-sm whitespace-nowrap">فيو</span>
                                    <span className="text-[11px] sm:text-xs text-white/90 font-medium truncate">متابعة الفني والعمل</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] bg-black/40 px-2 py-1 rounded-lg border border-white/10 text-amber-300 font-bold shrink-0 whitespace-nowrap">
                                    <span>
                                      {record.status === 'on_the_way' ? '🚗 بالطريق' :
                                       record.status === 'in-progress' ? '🔧 قيد العمل' :
                                       record.status === 'completed' ? '🏁 مكتمل' :
                                       record.status === 'accepted' ? '✅ تم القبول' :
                                       record.status === 'cancelled' ? '❌ ملغي' : '🆕 جديد'}
                                    </span>
                                    {record.serviceSteps && record.serviceSteps.length > 0 && (
                                      <span className="text-white bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none">
                                        {record.serviceSteps.length}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelectBooking(record.id)}
                                    className="w-4 h-4 mt-1 rounded border-white/20 bg-black/40 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red shrink-0"
                                    title="تحديد هذا الحجز"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                                      <span className="truncate">{record.carModel}</span>
                                      {record.bookingId && (
                                        <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300 shrink-0">
                                          {record.bookingId}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-300 mt-1 flex-wrap">
                                      <span className="font-bold text-white flex items-center gap-1 shrink-0">
                                        <User className="w-3 h-3 text-gray-400" />
                                        {record.customerName || record.name || 'عميل'}
                                      </span>
                                      <span className="text-gray-500">•</span>
                                      <span className="font-mono text-gray-400 text-[11px]" dir="ltr">{record.customerPhone}</span>
                                      {record.location && (
                                        <>
                                          <span className="text-gray-500">•</span>
                                          <span className="text-gray-400 flex items-center gap-0.5 truncate max-w-[130px]" title={record.location}>
                                            <MapPin className="w-3 h-3 text-brand-red shrink-0" />
                                            {record.location}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                      <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                                      {rDate.toLocaleDateString('ar-SA')}
                                    </div>
                                  </div>
                                </div>
                                <select 
                                  value={record.status}
                                  onChange={(e) => handleUpdateStatus(record.id, e.target.value as any)}
                                  className={cn(
                                    "text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 border outline-none cursor-pointer shrink-0",
                                    record.status === 'completed' ? "text-green-500 border-green-500/30 bg-green-500/10" :
                                    record.status === 'accepted' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                    record.status === 'on_the_way' ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" :
                                    record.status === 'in-progress' ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                                    record.status === 'cancelled' ? "text-red-400 border-red-500/30 bg-red-500/10" :
                                    record.status === 'new' ? "text-purple-400 border-purple-500/30 bg-purple-500/10" :
                                    "text-white border-white/20 bg-white/10"
                                  )}
                                >
                                  <option value="new" className="bg-brand-dark text-purple-400">جديد</option>
                                  <option value="pending" className="bg-brand-dark text-white">قيد الانتظار</option>
                                  <option value="accepted" className="bg-brand-dark text-emerald-400">تم القبول</option>
                                  <option value="on_the_way" className="bg-brand-dark text-indigo-400">الفني بالطريق</option>
                                  <option value="in-progress" className="bg-brand-dark text-blue-400">قيد العمل</option>
                                  <option value="completed" className="bg-brand-dark text-green-400">مكتمل</option>
                                  <option value="cancelled" className="bg-brand-dark text-red-400">ملغي</option>
                                </select>
                              </div>

                              <div className="bg-white/5 p-3 rounded-xl space-y-2 text-xs border border-white/5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-400 font-medium shrink-0">الخدمة:</span>
                                  <span className="px-2.5 py-1 bg-white/10 border border-white/10 rounded-lg font-bold text-white text-xs inline-flex items-center gap-1.5 min-w-0 max-w-[210px] sm:max-w-none">
                                    <Wrench className="w-3.5 h-3.5 text-brand-red shrink-0" />
                                    <span className="truncate">{record.serviceType || 'صيانة متنقلة'}</span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5">
                                  <span className="text-gray-400 font-medium shrink-0">الفني الميداني:</span>
                                  {record.assignedStaffName ? (
                                    <div className="inline-flex items-center gap-1.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenTimeline(record, 'timeline')}
                                        className="min-h-[30px] py-1 px-2.5 font-bold text-emerald-300 text-xs flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 rounded-lg border border-emerald-500/30 cursor-pointer transition-all active:scale-95 whitespace-nowrap min-w-0"
                                        title="عرض مراحل العمل وتوثيق الصور"
                                      >
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span className="truncate max-w-[120px] sm:max-w-[160px]">الفني: {record.assignedStaffName}</span>
                                      </button>
                                      {record.assignedStaffPhone && (
                                        <a
                                          href={generateTechnicianAssignmentWhatsAppUrl(record, record.assignedStaffPhone, record.assignedStaffName)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-7 h-7 text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 transition-colors inline-flex items-center justify-center cursor-pointer shrink-0"
                                          title={`مراسلة الفني (${record.assignedStaffName}) عبر واتساب`}
                                        >
                                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                        </a>
                                      )}
                                    </div>
                                  ) : !isTechnician ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenTimeline(record, 'assign')}
                                      className="min-h-[30px] py-1 px-2.5 text-white/90 hover:text-white font-bold text-xs flex items-center gap-1.5 bg-white/10 hover:bg-white/15 rounded-lg border border-white/20 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <Plus className="w-3.5 h-3.5 shrink-0" />
                                      <span>+ إسناد لفني</span>
                                    </button>
                                  ) : null}
                                </div>
                                {record.notes && (
                                  <div className="pt-1.5 border-t border-white/5 flex items-start gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5 text-gray-300">
                                    <FileText className="w-3.5 h-3.5 text-amber-400/90 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="text-[10px] text-gray-400 font-bold">الملاحظات:</div>
                                      <div className="text-xs leading-relaxed text-gray-200 break-words">{record.notes}</div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-white/5 space-y-2">
                                {/* الصف الأول: أزرار التواصل والحالة السريعة */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                  {!isTechnician && (
                                    <>
                                      <a
                                        href={getWhatsAppStatusUrl(record, 'on_the_way')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => handleUpdateStatus(record.id, 'on_the_way')}
                                        className="h-8 px-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                                        title="الفني بالطريق وإرسال واتساب"
                                      >
                                        🚗 بالطريق
                                      </a>
                                      <a
                                        href={getWhatsAppStatusUrl(record, 'accepted')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => handleUpdateStatus(record.id, 'accepted')}
                                        className="h-8 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                                        title="قبول الحجز وإرسال واتساب"
                                      >
                                        ✅ قبول
                                      </a>
                                    </>
                                  )}
                                  <a 
                                    href={`https://api.whatsapp.com/send?phone=${waPhone}&text=${waMsg}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    واتساب
                                  </a>
                                  <a 
                                    href={`tel:${record.customerPhone}`}
                                    className="h-8 px-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    اتصال
                                  </a>
                                  {record.coordinates?.latitude && record.coordinates?.longitude && (
                                    <a 
                                      href={`https://www.google.com/maps?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-8 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                                    >
                                      <Navigation className="w-3.5 h-3.5" />
                                      GPS
                                    </a>
                                  )}
                                </div>

                                {/* الصف الثاني: إجراءات الإدارة المنسقة بأحجام متطابقة */}
                                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/5">
                                  <button 
                                    onClick={() => handleSelectBookingDetails(record)}
                                    className="h-8 px-3 text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                    <span>التفاصيل</span>
                                  </button>

                                  <div className="flex items-center gap-1.5">
                                    {!isTechnician && (
                                      <a
                                        href={getWhatsAppStatusUrl(record, record.status)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 flex items-center justify-center text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors cursor-pointer shrink-0 active:scale-95"
                                        title="إرسال إشعار الحالة للعميل عبر الواتساب"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                      </a>
                                    )}
                                    <button 
                                      onClick={() => handleEdit('booking', record)}
                                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer shrink-0 active:scale-95"
                                      title="تعديل الحجز"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleDelete('maintenance', record.id, `${record.carModel} (${record.customerName || record.customerPhone || ''})`)}
                                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-red bg-white/5 hover:bg-brand-red/10 border border-white/10 rounded-lg cursor-pointer shrink-0 active:scale-95"
                                      title="حذف الحجز"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {displayedBookings.length === 0 && (
                        <div className="py-16 text-center text-gray-500 space-y-3">
                          <Calendar className="w-12 h-12 text-gray-700 mx-auto" />
                          <p className="font-bold">
                            {records.length === 0 ? 'لا توجد أي حجوزات مسجلة حتى الآن' : 'لا توجد أي حجوزات مطابقة للبحث أو الفلتر المختار'}
                          </p>
                          {records.length === 0 && (
                            <button 
                              onClick={() => {
                                setFormData({ customerPhone: '', carModel: '', serviceType: '', notes: '', cost: '', status: 'pending' });
                                setEditingItem(null);
                                setIsAdding(true);
                              }}
                              className="px-6 py-2.5 bg-brand-red rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-brand-red/20 cursor-pointer inline-flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              إضافة أول حجز
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
                </>
              )}
            </motion.div>
          )}

          {/* Calendar & Appointments Tab */}
          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Month Navigation & Stats Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 glass-card p-6 border-white/5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">
                        {calendarMonth.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                      </h3>
                      <p className="text-xs text-gray-400">جدول مواعيد صيانة السيارات المتنقلة بجدة</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                      }}
                      className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="الشهر السابق"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCalendarMonth(new Date());
                        setSelectedCalendarDate(new Date());
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-all cursor-pointer"
                    >
                      اليوم
                    </button>
                    <button
                      onClick={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      }}
                      className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="الشهر التالي"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="glass-card p-6 border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">مواعيد هذا الشهر</span>
                    <span className="text-2xl font-black font-display text-brand-red">
                      {(isTechnician ? accessibleRecords : records).filter(r => {
                        const d = getRecordDate(r.serviceDate);
                        return d.getFullYear() === calendarMonth.getFullYear() && d.getMonth() === calendarMonth.getMonth();
                      }).length}
                    </span>
                    <span className="text-xs text-gray-500 mr-2">{isTechnician ? 'مهمة مسندة' : 'حجز مسجل'}</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Month Grid and Selected Date Appointment List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Days Matrix */}
                <div className="lg:col-span-2 glass-card p-6 border-white/5">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 mb-4 pb-2 border-b border-white/5">
                    {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                      <div key={day} className="py-1">{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDayIndex = new Date(year, month, 1).getDay();
                      const totalDays = new Date(year, month + 1, 0).getDate();
                      const days = [];

                      // Padding for previous month
                      for (let i = 0; i < firstDayIndex; i++) {
                        days.push(
                          <div key={`empty-${i}`} className="min-h-[70px] p-2 rounded-xl bg-black/10 border border-transparent opacity-20" />
                        );
                      }

                      // Current month days
                      for (let day = 1; day <= totalDays; day++) {
                        const currentDate = new Date(year, month, day);
                        const dayBookings = (isTechnician ? accessibleRecords : records).filter(r => {
                          const d = getRecordDate(r.serviceDate);
                          return d.toDateString() === currentDate.toDateString();
                        });

                        const isSelected = selectedCalendarDate.toDateString() === currentDate.toDateString();
                        const isToday = new Date().toDateString() === currentDate.toDateString();

                        days.push(
                          <div
                            key={`day-${day}`}
                            onClick={() => setSelectedCalendarDate(currentDate)}
                            className={cn(
                              "min-h-[75px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-right group",
                              isSelected 
                                ? "bg-brand-red/15 border-brand-red shadow-lg shadow-brand-red/10" 
                                : isToday
                                ? "bg-white/10 border-white/20 hover:border-white/30"
                                : "bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center",
                                isToday ? "bg-brand-red text-white" : isSelected ? "text-brand-red font-black" : "text-gray-300"
                              )}>
                                {day}
                              </span>
                              {dayBookings.length > 0 && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-brand-red/20 text-brand-red border border-brand-red/30">
                                  {dayBookings.length}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 mt-1">
                              {dayBookings.slice(0, 2).map((b, idx) => (
                                <div key={idx} className="text-[10px] truncate text-gray-300 bg-white/5 px-1 py-0.5 rounded">
                                  {b.carModel}
                                </div>
                              ))}
                              {dayBookings.length > 2 && (
                                <div className="text-[9px] text-gray-500 font-bold">
                                  +{dayBookings.length - 2} المزيد
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return days;
                    })()}
                  </div>
                </div>

                {/* Selected Day Bookings Detail Panel */}
                <div className="glass-card p-6 border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <h4 className="font-bold text-white text-base">
                        مواعيد {selectedCalendarDate.toLocaleDateString('ar-SA', { weekday: 'long', month: 'numeric', day: 'numeric' })}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {(isTechnician ? accessibleRecords : records).filter(r => getRecordDate(r.serviceDate).toDateString() === selectedCalendarDate.toDateString()).length} {isTechnician ? 'مهام مسندة' : 'مواعيد مجدولة'}
                      </p>
                    </div>
                    {!isTechnician && (
                      <button
                        onClick={() => {
                          const dateObj = new Date(selectedCalendarDate);
                          dateObj.setHours(10, 0, 0, 0);
                          const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setFormData({
                            customerPhone: '',
                            carModel: '',
                            serviceType: '',
                            notes: '',
                            cost: '',
                            serviceDate: localIso,
                            status: 'pending'
                          });
                          setIsAdding(true);
                        }}
                        className="p-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-xl transition-all cursor-pointer"
                        title="حجز موعد جديد في هذا اليوم"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                    {(isTechnician ? accessibleRecords : records)
                      .filter(r => getRecordDate(r.serviceDate).toDateString() === selectedCalendarDate.toDateString())
                      .sort((a, b) => getRecordDate(a.serviceDate).getTime() - getRecordDate(b.serviceDate).getTime())
                      .map((record) => {
                        const waPhone = formatSaudiPhoneForWhatsApp(record.customerPhone);
                        const rDate = getRecordDate(record.serviceDate);

                        return (
                          <div key={record.id} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-white text-sm">{record.carModel}</h5>
                                <span className="text-xs text-brand-red font-semibold">{record.serviceType}</span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                record.status === 'completed' ? "bg-green-500/10 text-green-400 border-green-500/30" :
                                record.status === 'accepted' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                record.status === 'on_the_way' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" :
                                record.status === 'in-progress' ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                                record.status === 'cancelled' ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                "bg-white/10 text-white border-white/20"
                              )}>
                                {record.status === 'completed' ? 'مكتمل' :
                                 record.status === 'accepted' ? 'تم القبول' :
                                 record.status === 'on_the_way' ? 'الفني بالطريق' :
                                 record.status === 'in-progress' ? 'قيد العمل' :
                                 record.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                              </span>
                            </div>

                            <div className="text-xs text-gray-400 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                <span>{rDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {record.location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{record.location}</span>
                                </div>
                              )}
                              {record.notes && (
                                <div className="text-gray-400 italic bg-white/5 p-2 rounded-lg text-[11px]">
                                  "{record.notes}"
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-xs"
                                  title="واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={`tel:${record.customerPhone}`}
                                  className="p-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-lg text-xs"
                                  title="اتصال"
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </a>
                                {record.coordinates?.latitude && record.coordinates?.longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs"
                                    title="خريطة GPS"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>

                              <button
                                onClick={() => handleSelectBookingDetails(record)}
                                className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-white/5 rounded-lg"
                              >
                                عرض التفاصيل
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {(isTechnician ? accessibleRecords : records).filter(r => getRecordDate(r.serviceDate).toDateString() === selectedCalendarDate.toDateString()).length === 0 && (
                      <div className="py-12 text-center text-gray-500 space-y-2">
                        <CalendarCheck className="w-10 h-10 mx-auto text-gray-600" />
                        <p className="text-xs font-bold">لا توجد مواعيد مسجلة في هذا اليوم</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analytics & Business Intelligence Tab */}
          {!isTechnician && activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Financial & Performance KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(() => {
                  const completedBookings = records.filter(r => r.status === 'completed').length;
                  const inProgressBookings = records.filter(r => r.status === 'in-progress' || r.status === 'on_the_way').length;
                  const newOrPendingBookings = records.filter(r => r.status === 'new' || r.status === 'pending').length;
                  const completionRate = records.length > 0 ? Math.round((completedBookings / records.length) * 100) : 100;

                  return (
                    <>
                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">إجمالي الحجوزات</div>
                        <div className="text-3xl font-black font-display text-white">{records.length} <span className="text-sm font-normal text-brand-red">طلب</span></div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-brand-red">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>جميع الطلبات المسجلة في النظام</span>
                        </div>
                      </div>

                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">الحجوزات المكتملة</div>
                        <div className="text-3xl font-black font-display text-emerald-400">{completedBookings} <span className="text-sm font-normal text-gray-400">حجز</span></div>
                        <div className="mt-3 text-xs text-gray-400">تمت خدمتهم بنجاح</div>
                      </div>

                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">نسبة إنجاز الحجوزات</div>
                        <div className="text-3xl font-black font-display text-green-400">{completionRate}%</div>
                        <div className="mt-3 text-xs text-gray-400">{completedBookings} من أصل {records.length}</div>
                      </div>

                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">قيد العمل والانتظار</div>
                        <div className="text-3xl font-black font-display text-white">{inProgressBookings + newOrPendingBookings} <span className="text-sm font-normal text-gray-400">طلب</span></div>
                        <div className="mt-3 text-xs text-blue-400">بحاجة للمتابعة والتنفيذ</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 7-Day Volume Trend Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">منحنى حركة الحجوزات (آخر 7 أيام)</h3>
                      <p className="text-xs text-gray-400">تتبع يومي لعدد الطلبات والحجوزات</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-brand-red" />
                      <span className="text-xs text-gray-400">عدد الحجوزات</span>
                    </div>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getChartData()}>
                        <defs>
                          <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E31837" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#E31837" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis stroke="#666" allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                          formatter={(val: any) => [`${val} حجز`, 'الحجوزات']}
                        />
                        <Area type="monotone" dataKey="bookings" stroke="#E31837" strokeWidth={3} fillOpacity={1} fill="url(#bookingsGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Service Categories Distribution Pie */}
                <div className="glass-card p-6 border-white/5">
                  <h3 className="text-lg font-bold text-white mb-1">الخدمات الأكثر طلباً</h3>
                  <p className="text-xs text-gray-400 mb-6">توزيع الحجوزات حسب نوع الصيانة</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getServiceStats()}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getServiceStats().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2 max-h-[100px] overflow-y-auto no-scrollbar">
                    {getServiceStats().map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-gray-300">{s.name}</span>
                        </div>
                        <span className="font-bold text-white">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Breakdown & Top Car Makes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Pipeline */}
                <div className="glass-card p-6 border-white/5 space-y-4">
                  <h3 className="text-lg font-bold text-white">توزيع حالات الحجوزات والعمليات</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getStatusStats().map((st, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-xs text-gray-400 mb-1">{st.label}</div>
                        <div className="text-2xl font-black" style={{ color: st.color }}>{st.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Car Makes Serviced */}
                <div className="glass-card p-6 border-white/5 space-y-4">
                  <h3 className="text-lg font-bold text-white">أكثر أنواع وماركات السيارات طلباً</h3>
                  <div className="space-y-3">
                    {getTopCarMakes().map((car, idx) => {
                      const totalC = records.length || 1;
                      const pct = Math.round((car.count / totalC) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-white">{car.make}</span>
                            <span className="text-gray-400">{car.count} حجز ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div 
                              className="h-full bg-brand-red rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(pct, 5)}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                    {getTopCarMakes().length === 0 && (
                      <div className="py-6 text-center text-xs text-gray-500">لا توجد بيانات كافية للسيارات بعد</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!isTechnician && activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <ReportsView records={isTechnician ? accessibleRecords : records} />
            </motion.div>
          )}

          {!isTechnician && activeTab === 'content' && (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Content Sub-tabs */}
              <div className="flex gap-4 border-b border-white/5 pb-4 overflow-x-auto custom-tabs-scrollbar">
                {[
                  { id: 'services', label: 'الخدمات' },
                  { id: 'offers', label: 'العروض الخاصة' },
                  { id: 'gallery', label: 'المعرض' },
                  { id: 'partners', label: 'شركاء النجاح' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setContentTab(sub.id as any)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer",
                      contentTab === sub.id
                        ? "bg-white/10 text-white border border-white/10 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {contentTab === 'services' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.length > 0 ? services.map((s) => (
                    <div key={s.id} className="glass-card p-6 border-white/5 group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit('service', s)} className="text-gray-600 hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete('services', s.id)} className="text-gray-600 hover:text-brand-red transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-bold mb-2">{s.title}</h4>
                      <p className="text-gray-500 text-xs line-clamp-2">{s.description}</p>
                    </div>
                  )) : (
                    <div className="md:col-span-2 lg:col-span-3 py-12 text-center glass-card border-dashed border-white/10">
                      <Wrench className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 mb-6">لا توجد خدمات مضافة حالياً</p>
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-2 bg-brand-red/10 text-brand-red border border-brand-red/20 rounded-lg font-bold text-sm hover:bg-brand-red hover:text-white transition-all"
                      >
                        إضافة أول خدمة
                      </button>
                    </div>
                  )}
                </div>
              )}

              {contentTab === 'offers' && (
                <div className="space-y-6">
                  {/* Offers Action Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 glass-card p-4 border-white/5">
                    <div>
                      <h4 className="font-bold text-white text-base">باقات وعروض الصيانة الخاصة</h4>
                      <p className="text-xs text-gray-400">إدارة العروض والخصومات المتاحة لزوار الموقع ({offers.length} عرض نشط)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setEditingItem(null);
                          setOfferForm({ title: '', price: '', subtitle: '', features: '', icon: 'tag' });
                          setIsAdding(true);
                        }}
                        className="px-4 py-2 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-red/20 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة عرض جديد</span>
                      </button>

                      {offers.length > 0 && (
                        <button 
                          onClick={handleDeleteAllOffers}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف كامل العروض</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Offers Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map((o) => (
                      <div key={o.id} className="glass-card p-6 border-white/5 flex flex-col justify-between hover:border-brand-red/30 transition-all group">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="font-display font-black text-brand-red text-2xl">{o.price}</div>
                              <span className="text-xs text-gray-400">{o.subtitle || 'ريال'}</span>
                              <button 
                                onClick={() => handleToggleOfferStatus(o.id, o.active !== false)}
                                className={cn(
                                  "text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all cursor-pointer",
                                  o.active !== false ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                                )}
                              >
                                {o.active !== false ? 'نشط' : 'متوقف'}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit('offer', o)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer" title="تعديل">
                                <FileText className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete('offers', o.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer" title="حذف">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-white text-base mb-2">{o.title}</h4>
                          <div className="space-y-1 mb-4">
                            {Array.isArray(o.features) && o.features.map((feat, fIdx) => (
                              <div key={fIdx} className="text-xs text-gray-400 flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-brand-red shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 pt-3 border-t border-white/5">
                          رمز الأيقونة: {o.icon || 'tag'}
                        </div>
                      </div>
                    ))}
                    {offers.length === 0 && (
                      <div className="md:col-span-2 lg:col-span-3 py-16 text-center glass-card border-dashed border-white/10 space-y-4">
                        <Tag className="w-12 h-12 text-gray-600 mx-auto" />
                        <h4 className="text-lg font-bold text-gray-300">تم تفريغ كامل العروض بنجاح</h4>
                        <p className="text-gray-500 text-xs max-w-md mx-auto">لا توجد أي عروض مضافة حالياً. يمكنك الآن إعادة بناء باقاتك وعروضك المخصصة من جديد بالأسعار والمميزات التي تناسبك.</p>
                        <button 
                          onClick={() => {
                            setEditingItem(null);
                            setOfferForm({ title: '', price: '', subtitle: '', features: '', icon: 'tag' });
                            setIsAdding(true);
                          }}
                          className="px-6 py-3 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-red/20 cursor-pointer inline-flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة أول عرض خاص جديد</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {contentTab === 'gallery' && (
                <div className="space-y-6">
                  {/* Gallery Toolbar */}
                  <div className="glass-card p-6 border-white/5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Category Filter Badges */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'all', label: 'الكل' },
                          { id: 'صيانة دورية', label: 'صيانة دورية' },
                          { id: 'ميكانيكا ومحركات', label: 'ميكانيكا ومحركات' },
                          { id: 'كهرباء وفحص كمبيوتر', label: 'كهرباء وفحص' },
                          { id: 'سمكرة ورش دهان', label: 'سمكرة ودهان' },
                          { id: 'تكييف وتبريد', label: 'تكييف وتبريد' },
                          { id: 'خدمة متنقلة', label: 'خدمة متنقلة' },
                          { id: 'قبل وبعد', label: 'قبل وبعد' },
                        ].map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setGalleryCategoryFilter(cat.id)}
                            className={cn(
                              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                              galleryCategoryFilter === cat.id
                                ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <button 
                        onClick={() => {
                          setGalleryForm({ title: '', imageUrl: '', category: 'صيانة دورية' });
                          setEditingItem(null);
                          setIsAdding(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-red rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        إضافة صورة جديدة
                      </button>
                    </div>
                  </div>

                  {/* Gallery Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...gallery, ...STATIC_GALLERY.filter(sg => !gallery.some(g => g.title === sg.title)).map(sg => ({ ...sg, id: 'static-' + sg.id, isStatic: true }))]
                      .filter(item => galleryCategoryFilter === 'all' || item.category === galleryCategoryFilter || (!item.category && galleryCategoryFilter === 'صيانة دورية'))
                      .map((item) => (
                        <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-lg flex flex-col">
                          <div className="relative aspect-video w-full overflow-hidden bg-black/80">
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            {item.category && (
                              <span className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-white">
                                {item.category}
                              </span>
                            )}
                            {(item as any).isStatic && (
                              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-brand-red/80 backdrop-blur-md rounded-full text-[10px] font-bold text-white">
                                افتراضي
                              </span>
                            )}
                            {item.imageUrl && item.imageUrl.startsWith('data:') ? (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[9px] font-mono text-emerald-400 border border-white/10" dir="ltr">
                                {formatBytes(getBase64SizeInBytes(item.imageUrl))}
                              </span>
                            ) : item.imageUrl ? (
                              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md text-[9px] font-mono text-gray-300 border border-white/10" dir="ltr">
                                رابط ويب
                              </span>
                            ) : null}
                          </div>
                          <div className="p-4 flex items-center justify-between gap-2 flex-1">
                            <div className="text-xs font-bold text-white line-clamp-1 flex-1" title={item.title}>
                              {item.title}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => handleEdit('gallery', item)}
                                className="p-2 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg transition-colors"
                                title="تعديل الصورة والبيانات"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {! (item as any).isStatic && (
                                <button 
                                  onClick={() => handleDelete('gallery', item.id)}
                                  className="p-2 bg-white/5 hover:bg-brand-red/20 text-gray-300 hover:text-brand-red rounded-lg transition-colors"
                                  title="حذف الصورة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {gallery.length === 0 && STATIC_GALLERY.length === 0 && (
                    <div className="py-16 text-center glass-card border-dashed border-white/10 space-y-4">
                      <Camera className="w-12 h-12 text-gray-700 mx-auto" />
                      <p className="text-gray-500 font-bold">المعرض فارغ حالياً</p>
                      <button 
                        onClick={() => {
                          setGalleryForm({ title: '', imageUrl: '', category: 'صيانة دورية' });
                          setEditingItem(null);
                          setIsAdding(true);
                        }}
                        className="px-6 py-2.5 bg-brand-red text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-brand-red/20"
                      >
                        إضافة أول صورة
                      </button>
                    </div>
                  )}
                </div>
              )}

              {contentTab === 'partners' && (
                <AdminPartnersManager
                  partners={partners}
                  onAddPartner={handleAddPartner}
                  onUpdatePartner={handleUpdatePartner}
                  onDeletePartner={handleDeletePartner}
                  isSectionVisible={settings.showPartners !== false}
                  onToggleSectionVisibility={handleTogglePartnersVisibility}
                />
              )}
            </motion.div>
          )}

          {!isTechnician && activeTab === 'customers' && (
            <motion.div 
              key="customers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <CustomerManager records={records} />
            </motion.div>
          )}

          {!isTechnician && activeTab === 'testimonials' && (
            <motion.div 
              key="testimonials"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Testimonials Filter & Search Bar */}
              <div className="glass-card p-6 border-white/5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Rating Filters */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setTestimonialRatingFilter('all')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        testimonialRatingFilter === 'all'
                          ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                          : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      جميع التقييمات ({testimonials.length + STATIC_TESTIMONIALS.filter(st => !testimonials.some(t => t.name === st.name && t.comment === st.comment)).length})
                    </button>
                    {[5, 4, 3, 2, 1].map(r => (
                      <button
                        key={r}
                        onClick={() => setTestimonialRatingFilter(r)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                          testimonialRatingFilter === r
                            ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                            : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <span>{r}</span>
                        <Star className="w-3 h-3 fill-current text-brand-red inline" />
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => {
                      setTestimonialForm({ name: '', comment: '', rating: 5, reply: '' });
                      setEditingItem(null);
                      setIsAdding(true);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-red rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    إضافة تقييم جديد
                  </button>
                </div>

                {/* Search in comments or names */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={testimonialSearch}
                    onChange={e => setTestimonialSearch(e.target.value)}
                    placeholder="ابحث في اسم العميل أو نص التقييم..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-xs outline-none focus:border-brand-red transition-all"
                  />
                  {testimonialSearch && (
                    <button 
                      onClick={() => setTestimonialSearch('')}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Testimonials List */}
              <div className="space-y-4">
                {(() => {
                  const seen = new Set<string>();
                  const adminList: any[] = [];
                  testimonials.forEach(t => {
                    const key = t.id || `${t.name}-${t.comment}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      adminList.push(t);
                    }
                  });
                  STATIC_TESTIMONIALS.forEach(st => {
                    const key = st.id;
                    const textKey = `${st.name}-${st.comment}`;
                    if (!seen.has(key) && !seen.has(textKey) && !adminList.some(a => a.name === st.name && a.comment === st.comment)) {
                      seen.add(key);
                      seen.add(textKey);
                      adminList.push({ ...st, id: 'static-' + st.id, isStatic: true });
                    }
                  });
                  return adminList;
                })()
                  .filter(t => testimonialRatingFilter === 'all' || (t.rating || 5) === testimonialRatingFilter)
                  .filter(t => {
                    if (!testimonialSearch.trim()) return true;
                    const q = testimonialSearch.toLowerCase().trim();
                    return (
                      (t.name || '').toLowerCase().includes(q) ||
                      (t.comment || '').toLowerCase().includes(q) ||
                      (t.reply || '').toLowerCase().includes(q)
                    );
                  })
                  .map((t, idx) => {
                    const displayName = t.name && t.name.trim() ? t.name.trim() : 'زائر';
                    const initialChar = displayName.charAt(0).toUpperCase();
                    const starRating = typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5 ? t.rating : 5;

                    return (
                      <div key={t.id ? `${t.id}` : `adm-t-${idx}`} className="glass-card p-6 border-white/5 space-y-4 hover:border-white/10 transition-colors">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-brand-red/20 border border-brand-red/30 rounded-2xl flex items-center justify-center font-bold text-brand-red shrink-0 text-base">
                              {initialChar}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-base">{displayName}</span>
                                {t.isStatic && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">افتراضي</span>}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={cn("w-3.5 h-3.5", i < starRating ? "fill-brand-red text-brand-red" : "text-gray-700")} />
                                ))}
                                <span className="text-xs text-gray-400 mr-2 font-bold">{starRating}/5</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEdit('testimonial', t)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
                              title="تعديل التقييم بالكامل"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span className="hidden sm:inline">تعديل</span>
                            </button>
                            {!t.isStatic && t.id && (
                              <button 
                                onClick={() => handleDelete('testimonials', t.id!)} 
                                className="p-2 text-gray-400 hover:text-brand-red hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                title="حذف التعليق"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">حذف</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-300 text-sm italic leading-relaxed whitespace-pre-line bg-black/20 p-4 rounded-xl border border-white/5">
                          "{t.comment}"
                        </p>
                        
                        {/* Admin Reply Section */}
                        <div className="pt-2 border-t border-white/5">
                          {replyingTo === t.id ? (
                            <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/10">
                              <label className="text-xs font-bold text-brand-red uppercase tracking-wider block">
                                {t.reply ? 'تعديل رد الإدارة:' : 'كتابة رد إداري:'}
                              </label>
                              <textarea 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-red text-white resize-none"
                                placeholder="اكتب ردك هنا..."
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <button 
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }} 
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 transition-colors"
                                >
                                  إلغاء
                                </button>
                                <button 
                                  onClick={() => handleReply(t.id!)} 
                                  disabled={loading || !replyText.trim()}
                                  className="px-5 py-2 bg-brand-red rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-brand-red/20"
                                >
                                  {loading ? 'جاري الحفظ...' : 'حفظ الرد'}
                                </button>
                              </div>
                            </div>
                          ) : t.reply ? (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-sm space-y-2">
                              <div className="text-brand-red font-bold text-xs flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                رد الإدارة الحالي:
                              </div>
                              <p className="text-gray-300 italic">{t.reply}</p>
                              <button 
                                onClick={() => {
                                  setReplyingTo(t.id!);
                                  setReplyText(t.reply || '');
                                }}
                                className="text-xs text-brand-red font-bold hover:underline inline-block pt-1 cursor-pointer"
                              >
                                تعديل الرد الإداري
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setReplyingTo(t.id!);
                                setReplyText('');
                              }}
                              className="text-xs text-brand-red font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              إضافة رد إداري
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {!isTechnician && activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Official Firebase Cloud Messaging (FCM) Control Center */}
              <AdminFcmManager
                settings={settings}
                currentStaffUser={currentStaffUser}
                onUpdateSettings={async (updatedFields) => {
                  setSettingsForm(prev => ({ ...prev, ...updatedFields }));
                  await updateDoc(doc(db, 'settings', 'global'), updatedFields);
                }}
              />

              {/* Header Card */}
              <div className="glass-card p-6 md:p-8 border-brand-red/20 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold mb-3">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      مركز التنبيهات الفورية وتطبيق الجوال
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-black italic mb-2">
                      تطبيق الإدارة <span className="text-brand-red">وإشعارات تيليجرام</span>
                    </h3>
                    <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
                      استقبل تنبيهات الحجوزات الجديدة مباشرة على تطبيق تيليجرام الخاص بك، وقم بتثبيت لوحة التحكم كتطبيق مستقل وسريع على شاشة هاتفك (PWA).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <a
                      href={settingsForm.appDownloadUrl || settings.appDownloadUrl || "https://drive.google.com/drive/folders/1dfh85Zi8ZELc7EfUkIPcTlPJjiM9kflh?usp=sharing"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل التطبيق (Google Drive)</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    <button
                      onClick={handleInstallPWA}
                      className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-brand-red" />
                      {isPWAInstalled ? "التطبيق مثبت على جهازك ✓" : "تثبيت تطبيق (PWA)"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Two Column Grid: Telegram Bot & App Install */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* 1. Telegram Bot Card */}
                <div className="glass-card p-6 md:p-8 border-white/10 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">إشعارات بوت تيليجرام</h4>
                        <p className="text-xs text-gray-400">تنبيه فوري بتفاصيل العميل والسيارة عند كل حجز</p>
                      </div>
                    </div>

                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold border",
                      settingsForm.telegramBotToken && settingsForm.telegramChatId
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-white/10 border-white/20 text-white"
                    )}>
                      {settingsForm.telegramBotToken && settingsForm.telegramChatId ? "تم الربط ✓" : "بحاجة للإعداد"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300 uppercase flex items-center justify-between">
                        <span>توكن البوت (Telegram Bot Token)</span>
                        <span className="text-[11px] text-sky-400 font-normal">من @BotFather</span>
                      </label>
                      <input 
                        type="text"
                        value={settingsForm.telegramBotToken}
                        onChange={e => setSettingsForm({ ...settingsForm, telegramBotToken: e.target.value })}
                        placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-red font-mono text-gray-200"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-300 uppercase flex items-center justify-between">
                        <span>معرف المحادثة أو القروب (Telegram Chat ID)</span>
                        <span className="text-[11px] text-sky-400 font-normal">شخصي أو مجموعة لفريق العمل</span>
                      </label>
                      <input 
                        type="text"
                        value={settingsForm.telegramChatId}
                        onChange={e => setSettingsForm({ ...settingsForm, telegramChatId: e.target.value })}
                        placeholder="مثال: 867105778 أو عدة أشخاص: 867105778, 123456789 أو قروب: -100123456789"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-red font-mono text-gray-200"
                        dir="ltr"
                      />
                      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-[11px] text-sky-300 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-sky-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>كيف ترسل الإشعارات لعدة أشخاص تختارهم؟</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                          • <strong className="text-white">طريقة القروب (المفضلة):</strong> أنشئ قروب بتيليجرام وأضف البوت فيه كـ مشرف، ثم ضع آيدي القروب (يبدأ بـ <span className="font-mono text-white" dir="ltr">-100...</span>) لتصل الرسائل لجميع أعضاء القروب فوراً مهما كان عددهم.
                        </p>
                        <p className="text-gray-300 leading-relaxed">
                          • <strong className="text-white">طريقة الأشخاص المحددين:</strong> ضع معرفات الأشخاص (Chat IDs) مفصولة بفواصل، مثال: <span className="font-mono text-white" dir="ltr">867105778, 987654321</span> وسيرسل البوت لكل شخص فيهم على حسابه الخاص.
                        </p>
                      </div>
                    </div>

                    {/* Test & Save Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={testTgLoading || !settingsForm.telegramBotToken || !settingsForm.telegramChatId}
                        className="flex-1 px-5 py-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {testTgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {testTgLoading ? "جاري الإرسال للتجربة..." : "إرسال إشعار تجريبي الآن 🚀"}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await setDoc(doc(db, 'settings', 'general'), {
                              ...settings,
                              telegramBotToken: settingsForm.telegramBotToken,
                              telegramChatId: settingsForm.telegramChatId,
                              enableSoundAlerts: settingsForm.enableSoundAlerts
                            }, { merge: true });
                            alert("تم حفظ إعدادات التيليجرام والتنبيهات بنجاح!");
                          } catch (err) {
                            alert("حدث خطأ أثناء الحفظ");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-brand-red/20"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        حفظ الإعدادات
                      </button>
                    </div>

                    {/* Test Status Banner */}
                    {testTgStatus === 'success' && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs flex items-center gap-2 animate-in fade-in">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>تم إرسال الإشعار التجريبي بنجاح! افتح تطبيق تيليجرام للتحقق من الرسالة.</span>
                      </div>
                    )}
                    {testTgStatus === 'error' && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>تعذر إرسال الإشعار. تأكد من صحة الـ Token و Chat ID وأنك قمت ببدء محادثة مع البوت (Start).</span>
                      </div>
                    )}

                    {/* Step by Step Guide in Arabic */}
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2.5 text-xs text-gray-300">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-red" />
                        كيف تفعل بوت تيليجرام في 3 خطوات بسيطة:
                      </div>
                      <ol className="space-y-1.5 list-decimal list-inside text-gray-400 pr-1 leading-relaxed">
                        <li>افتح تيليجرام وابحث عن <code className="text-sky-400 bg-black/40 px-1 py-0.5 rounded">@BotFather</code> وأرسل <code className="text-white">/newbot</code> واختر اسماً ومعرفاً وانسخ الـ Token.</li>
                        <li>لمعرفة الـ Chat ID الخاص بك، افتح بوت <code className="text-sky-400 bg-black/40 px-1 py-0.5 rounded">@userinfobot</code> وأرسل أي رسالة وانسخ رقم الـ Id.</li>
                        <li>افتح البوت الجديد الذي أنشأته واضغط <b>Start</b>، ثم الصق التوكن والـ ID أعلاه واضغط <b>إرسال إشعار تجريبي</b>.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* 2. PWA Mobile App & Sound Alerts */}
                <div className="space-y-6">
                  {/* Sound Alerts Card */}
                  <div className="glass-card p-6 md:p-8 border-white/10 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                          <Volume2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">التنبيهات الصوتية الحية (طلبات جديدة + إسناد الفنيين)</h4>
                          <p className="text-xs text-gray-400">تشغيل نغمات تنبيهية ذكية ومميزة عند وصول حجز جديد وعند إسناد مهمة لأي فني</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !(settingsForm.enableSoundAlerts ?? true);
                          setSettingsForm(prev => ({ ...prev, enableSoundAlerts: nextVal }));
                          if (nextVal) playNewBookingSound();
                        }}
                        className={cn(
                          "w-12 h-6 rounded-full relative transition-all cursor-pointer",
                          settingsForm.enableSoundAlerts !== false ? "bg-brand-red" : "bg-gray-700"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
                          settingsForm.enableSoundAlerts !== false ? "right-0.5" : "left-0.5"
                        )} />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">
                        {settingsForm.enableSoundAlerts !== false 
                          ? "الصوت مفعل - ستسمع نغمة صاعدة عند وصول طلب جديد، ونغمة تنبيهية مميزة عند إسناد الطلب للفني." 
                          : "الصوت معطل حالياً."}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => playNewBookingSound()}
                          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                          title="تجربة نغمة وصول طلب حجز جديد"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-brand-red" />
                          <span>تجربة نغمة طلب جديد 🚗</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => playTaskAssignedSound()}
                          className="px-3.5 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                          title="تجربة نغمة إسناد طلب لفني"
                        >
                          <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                          <span>تجربة نغمة إسناد للفني 🔧</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PWA Mobile App Card */}
                  <div className="glass-card p-6 md:p-8 border-white/10 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">تطبيق الجوال (PWA)</h4>
                          <p className="text-xs text-gray-400">تشغيل لوحة التحكم كبرنامج مستقل على هاتفك</p>
                        </div>
                      </div>

                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        isPWAInstalled ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      )}>
                        {isPWAInstalled ? "تطبيق مثبت" : "جاهز للتثبيت"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>📱</span> على الآيفون (iOS Safari):
                          </div>
                          <p className="text-gray-400 leading-relaxed">
                            اضغط زر <b>المشاركة (Share)</b> في أسفل متصفح Safari، ثم اختر <b>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</b>.
                          </p>
                        </div>

                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>🤖</span> على الأندرويد (Chrome):
                          </div>
                          <p className="text-gray-400 leading-relaxed">
                            اضغط على زر <b>خيارات المتصفح (⋮)</b> في الأعلى، ثم اضغط <b>تثبيت التطبيق (Install App)</b>.
                          </p>
                        </div>
                      </div>

                      {/* Google Drive APK direct link banner */}
                      <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>رابط تحميل تطبيق الأندرويد المباشر (Google Drive / APK)</span>
                          </div>
                          <p className="text-gray-300 text-[11px] leading-relaxed">
                            مجلد Google Drive يحتوي على أحدث نسخة جاهزة للتحميل والتثبيت المباشر على الهاتف.
                          </p>
                        </div>
                        <a
                          href={settingsForm.appDownloadUrl || settings.appDownloadUrl || "https://drive.google.com/drive/folders/1dfh85Zi8ZELc7EfUkIPcTlPJjiM9kflh?usp=sharing"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer w-full sm:w-auto justify-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل التطبيق الآن</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={handleInstallPWA}
                        className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-brand-red" />
                        {isPWAInstalled ? "فتح / إعادة تثبيت تطبيق الويب (PWA)" : "تثبيت تطبيق دكتور فيكس على الشاشة الرئيسية (PWA)"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!isTechnician && activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col lg:flex-row gap-6 sm:gap-8"
            >
              {/* Settings Sub-Tabs Navigation: Horizontal scroll on mobile/tablet, vertical on desktop */}
              <div className="lg:w-64 lg:shrink-0">
                <div className="glass-card p-2.5 sm:p-3.5 lg:p-4 border-white/10 rounded-2xl sm:rounded-3xl shadow-xl">
                  <div className="text-[11px] font-bold text-gray-400 uppercase mb-2 px-1 hidden lg:block">
                    أقسام الإعدادات
                  </div>
                  <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 sm:gap-2 pb-1.5 lg:pb-0 scroll-smooth no-scrollbar">
                    {[
                      { id: 'general', label: 'الإعدادات العامة', icon: Globe },
                      { id: 'notifications', label: 'إشعارات تيليجرام والتطبيق', icon: Bell },
                      { id: 'branding', label: 'الهوية والثيمات', icon: Palette },
                      { id: 'hero', label: 'الواجهة الرئيسية', icon: Layout },
                      { id: 'contact', label: 'التواصل والاجتماعي', icon: Share2 },
                      { id: 'sections', label: 'الأقسام والظهور', icon: Eye },
                      { id: 'seo', label: 'الأرشفة (SEO)', icon: Search },
                      { id: 'footer', label: 'تذييل الصفحة', icon: AlignLeft },
                      { id: 'legal', label: 'سياسة الخصوصية والشروط', icon: ShieldCheck },
                      { id: 'maintenance', label: 'وضع الصيانة', icon: ShieldAlert },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSettingsSubTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer",
                          settingsSubTab === tab.id 
                            ? "bg-brand-red text-white shadow-lg shadow-brand-red/20 scale-[1.01]" 
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <tab.icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-1 min-w-0">
                <div className="glass-card p-4 sm:p-6 lg:p-8 border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl">
                  <form onSubmit={handleUpdateSettings} className="space-y-8">
                    {settingsSubTab === 'general' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Globe className="w-5 h-5 text-brand-red" />
                          الإعدادات العامة
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">اسم الموقع</label>
                            <input 
                              type="text"
                              value={settingsForm.siteName}
                              onChange={e => setSettingsForm({...settingsForm, siteName: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">البريد الإلكتروني الرسمي</label>
                            <input 
                              type="email"
                              value={settingsForm.email}
                              onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">نص الشريط المتحرك (Ticker)</label>
                          <textarea 
                            value={settingsForm.tickerText}
                            onChange={e => setSettingsForm({...settingsForm, tickerText: e.target.value})}
                            rows={3}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red resize-none"
                          />
                        </div>

                        <div className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                              <Download className="w-4 h-4 text-emerald-400" />
                              رابط تحميل التطبيق (Google Drive / APK)
                            </label>
                            {settingsForm.appDownloadUrl && (
                              <a
                                href={settingsForm.appDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
                              >
                                <span>تجربة فتح الرابط</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <input 
                            type="url"
                            value={settingsForm.appDownloadUrl || ''}
                            onChange={e => setSettingsForm({...settingsForm, appDownloadUrl: e.target.value})}
                            placeholder="https://drive.google.com/..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm font-mono text-gray-200"
                          />
                          <p className="text-[11px] text-gray-400">
                            هذا الرابط يظهر في شريط لوحة التحكم وفي قسم التنبيهات وتطبيقات الجوال لتسهيل تحميل وتثبيت التطبيق مباشرة.
                          </p>
                        </div>
                        <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                              <Camera className="w-4 h-4 text-brand-red" />
                              شعار الموقع (Logo)
                            </label>
                            {settingsForm.logoUrl && (
                              <button
                                type="button"
                                onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '' })}
                                className="text-xs text-brand-red hover:underline flex items-center gap-1 font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                استرجاع الشعار الافتراضي
                              </button>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center gap-5">
                            {/* Live Logo Preview Box */}
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-neutral-950 border-2 border-white/20 p-2 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                                {settingsForm.logoUrl ? (
                                  <img 
                                    src={settingsForm.logoUrl} 
                                    alt="Logo Preview" 
                                    className="w-full h-full object-contain" 
                                  />
                                ) : (
                                  <span className="text-brand-red font-display font-black text-xl italic tracking-tighter">
                                    Dr.Fix
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 font-bold">معاينة الشعار المعتمد</span>
                            </div>

                            <div className="flex-1 w-full space-y-3">
                              {/* File Input */}
                              <div className="space-y-1">
                                <label className="text-[11px] text-gray-400 block">رفع صورة من جهازك (PNG, JPG, SVG, WebP):</label>
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'settings')}
                                  className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-red-700 cursor-pointer bg-black/40 border border-white/10 rounded-xl p-1.5"
                                />
                              </div>

                              {/* URL input */}
                              <div className="space-y-1">
                                <label className="text-[11px] text-gray-400 block">أو إدخال رابط الصورة الخارجي مباشرة:</label>
                                <input 
                                  type="text"
                                  value={settingsForm.logoUrl}
                                  onChange={e => setSettingsForm({...settingsForm, logoUrl: e.target.value})}
                                  placeholder="https://example.com/logo.png"
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-red text-white"
                                />
                              </div>

                              {/* Recommended & Uploaded Image Size Info */}
                              <ImageUploadSizeBadge
                                meta={uploadedImageMeta.logo}
                                imageUrl={settingsForm.logoUrl}
                                recommended={{
                                  dimensions: '512 × 512 بكسل (مربع 1:1)',
                                  idealSize: 'أقل من 300 كيلوبايت (KB)',
                                  formats: 'PNG بخلفية مفرغة، WebP'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'notifications' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold flex items-center gap-2">
                            <Bell className="w-5 h-5 text-brand-red" />
                            إعدادات التنبيهات الفورية وبوت تيليجرام
                          </h3>
                        </div>

                        {/* Telegram Settings Box */}
                        <div className="glass-card p-6 border-white/10 space-y-6">
                          <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div>
                              <h4 className="font-bold text-base flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-sky-400" />
                                إشعارات بوت تيليجرام التلقائية
                              </h4>
                              <p className="text-xs text-gray-400">وصول رسالة تفصيلية فورية عند تسجيل أي عميل لحجز جديد</p>
                            </div>
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold border",
                              settingsForm.telegramBotToken && settingsForm.telegramChatId
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-white/10 border-white/20 text-white"
                            )}>
                              {settingsForm.telegramBotToken && settingsForm.telegramChatId ? "مفعل ومربوط ✓" : "غير مكتمل"}
                            </span>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400 uppercase">توكن البوت (Bot Token)</label>
                              <input 
                                type="text"
                                value={settingsForm.telegramBotToken}
                                onChange={e => setSettingsForm({ ...settingsForm, telegramBotToken: e.target.value })}
                                placeholder="مثال: 123456789:ABCdefGh..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-red font-mono"
                                dir="ltr"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400 uppercase flex items-center justify-between">
                                <span>معرف المحادثة أو القروب (Chat ID / Group ID)</span>
                                <span className="text-[10px] text-sky-400">يدعم عدة أشخاص أو قروب</span>
                              </label>
                              <input 
                                type="text"
                                value={settingsForm.telegramChatId}
                                onChange={e => setSettingsForm({ ...settingsForm, telegramChatId: e.target.value })}
                                placeholder="مثال: 867105778 أو عدة أشخاص: 867105778, 123456789 أو قروب: -100123456789"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-red font-mono"
                                dir="ltr"
                              />
                              <p className="text-[10px] text-gray-400">
                                يمكنك وضع معرف قروب تيليجرام (يبدأ بسالب مثل <span className="font-mono text-gray-300" dir="ltr">-100...</span>) أو معرفات عدة أشخاص مفصولة بفواصل.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={handleTestTelegram}
                              disabled={testTgLoading || !settingsForm.telegramBotToken || !settingsForm.telegramChatId}
                              className="px-5 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                            >
                              {testTgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                              {testTgLoading ? "جاري الإرسال..." : "إرسال إشعار تجريبي 🚀"}
                            </button>
                          </div>

                          {testTgStatus === 'success' && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              <span>تم الإرسال بنجاح إلى التيليجرام!</span>
                            </div>
                          )}
                          {testTgStatus === 'error' && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>فشل الإرسال. تأكد من صحة التوكن والـ Chat ID وأنك قمت ببدء محادثة مع البوت.</span>
                            </div>
                          )}
                        </div>

                        {/* Sound Alerts Box */}
                        <div className="glass-card p-6 border-white/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-base flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-brand-red" />
                                التنبيهات الصوتية الحية (طلبات جديدة + إسناد الفنيين)
                              </h4>
                              <p className="text-xs text-gray-400">إصدار صوت رنة مميزة عند وصول حجز جديد وعند إسناد مهمة لفني</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !(settingsForm.enableSoundAlerts ?? true);
                                setSettingsForm(prev => ({ ...prev, enableSoundAlerts: nextVal }));
                                if (nextVal) playNewBookingSound();
                              }}
                              className={cn(
                                "w-12 h-6 rounded-full relative transition-all cursor-pointer",
                                settingsForm.enableSoundAlerts !== false ? "bg-brand-red" : "bg-gray-700"
                              )}
                            >
                              <div className={cn(
                                "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
                                settingsForm.enableSoundAlerts !== false ? "right-0.5" : "left-0.5"
                              )} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-white/5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => playNewBookingSound()}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-brand-red" />
                              <span>تجربة نغمة طلب جديد 🚗</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => playTaskAssignedSound()}
                              className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                              <span>تجربة نغمة إسناد للفني 🔧</span>
                            </button>
                          </div>
                        </div>

                        {/* Google Drive APK Download Section */}
                        <div className="glass-card p-6 border-white/10 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-base flex items-center gap-2">
                                <Download className="w-4 h-4 text-emerald-400" />
                                تطبيق الأندرويد المباشر (Google Drive / APK)
                              </h4>
                              <p className="text-xs text-gray-400">تحميل ملف التثبيت المباشر للتطبيق من مجلد Google Drive المخصص للوحة التحكم</p>
                            </div>
                            <a
                              href={settingsForm.appDownloadUrl || settings.appDownloadUrl || "https://drive.google.com/drive/folders/1dfh85Zi8ZELc7EfUkIPcTlPJjiM9kflh?usp=sharing"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 justify-center"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل التطبيق الآن</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </a>
                          </div>
                        </div>

                        {/* PWA Section */}
                        <div className="glass-card p-6 border-white/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-base flex items-center gap-2">
                                <Download className="w-4 h-4 text-purple-400" />
                                تطبيق الجوال (PWA)
                              </h4>
                              <p className="text-xs text-gray-400">تثبيت لوحة التحكم على الهاتف كبرنامج سريع بدون متصفح</p>
                            </div>
                            <button
                              type="button"
                              onClick={handleInstallPWA}
                              className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {isPWAInstalled ? "التطبيق مثبت ✓" : "تثبيت التطبيق الآن"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'branding' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Palette className="w-5 h-5 text-brand-red" />
                          الهوية والثيمات
                        </h3>

                        {/* Logo & Visual Identity in Branding tab */}
                        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/10 space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <label className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                <Camera className="w-4 h-4 text-brand-red" />
                                شعار وهوية الموقع (Logo & Brand Identity)
                              </label>
                              <p className="text-xs text-gray-400 mt-0.5">
                                يمكنك رفع شعار المركز، وسيتم تكييف أبعاده وتطبيقه تلقائياً على كامل أقسام الموقع ومحركات البحث.
                              </p>
                            </div>
                            {settingsForm.logoUrl && (
                              <button
                                type="button"
                                onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '' })}
                                className="text-xs text-brand-red hover:underline flex items-center gap-1 font-bold cursor-pointer shrink-0 self-start sm:self-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                استرجاع الشعار الافتراضي
                              </button>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                            {/* Main Identity Box */}
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-neutral-950 border-2 border-white/20 p-2.5 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                                {settingsForm.logoUrl ? (
                                  <img 
                                    src={settingsForm.logoUrl} 
                                    alt="Logo Preview" 
                                    className="w-full h-full object-contain" 
                                  />
                                ) : (
                                  <span className="text-brand-red font-display font-black text-2xl italic tracking-tighter">
                                    Dr.Fix
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 font-bold">معاينة الشعار الأصلية</span>
                            </div>

                            <div className="flex-1 w-full space-y-3">
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'settings')}
                                className="w-full text-xs text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-red-700 cursor-pointer bg-black/40 border border-white/10 rounded-xl p-1.5"
                              />

                              {/* Recommended & Uploaded Image Size Info */}
                              <ImageUploadSizeBadge
                                meta={uploadedImageMeta.logo}
                                imageUrl={settingsForm.logoUrl}
                                recommended={{
                                  dimensions: '512 × 512 بكسل (مربع 1:1)',
                                  idealSize: 'أقل من 300 كيلوبايت (KB)',
                                  formats: 'PNG بخلفية مفرغة، WebP، SVG'
                                }}
                              />
                            </div>
                          </div>

                          {/* Multi-Platform Dimensions & Placement Preview */}
                          <div className="pt-4 border-t border-white/10">
                            <h4 className="text-xs font-bold text-gray-300 uppercase mb-3 flex items-center gap-2">
                              <Eye className="w-3.5 h-3.5 text-brand-red" />
                              معاينة أبعاد الشعار الحية عبر المنصة ومحركات البحث:
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {/* 1. Header Preview */}
                              <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center gap-3">
                                <div className="w-11 h-11 bg-black rounded-xl p-1 border border-white/20 flex items-center justify-center shrink-0">
                                  {settingsForm.logoUrl ? (
                                    <img src={settingsForm.logoUrl} alt="Header Preview" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-brand-red text-xs font-black">Dr.Fix</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">الهيدر العلوي (Navbar)</div>
                                  <div className="text-[10px] text-gray-400">الأبعاد: 48×48 بكسل (احتواء كامل)</div>
                                </div>
                              </div>

                              {/* 2. Google Search Result Favicon Preview */}
                              <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-lg p-1 border border-white/20 flex items-center justify-center shrink-0">
                                  <img 
                                    src="/favicon-48x48.png" 
                                    alt="Google Favicon" 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      if (settingsForm.logoUrl) (e.target as HTMLImageElement).src = settingsForm.logoUrl;
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">أيقونة قوقل (Google Favicon)</div>
                                  <div className="text-[10px] text-emerald-400">الأبعاد: 48×48 بكسل (مربع معتمد)</div>
                                </div>
                              </div>

                              {/* 3. Footer Preview */}
                              <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                                <div className="w-12 h-12 bg-black rounded-xl p-1 border border-white/20 flex items-center justify-center shrink-0">
                                  {settingsForm.logoUrl ? (
                                    <img src={settingsForm.logoUrl} alt="Footer Preview" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-brand-red text-xs font-black">Dr.Fix</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">الفوتر وبطاقات العملاء</div>
                                  <div className="text-[10px] text-gray-400">الأبعاد: 64×64 بكسل (واضح وفاخر)</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">اللون الأساسي</label>
                            <div className="flex gap-2">
                              <input 
                                type="color"
                                value={settingsForm.primaryColor}
                                onChange={e => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                                className="w-12 h-12 bg-transparent border-none cursor-pointer"
                              />
                              <input 
                                type="text"
                                value={settingsForm.primaryColor}
                                onChange={e => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">اللون الثانوي</label>
                            <div className="flex gap-2">
                              <input 
                                type="color"
                                value={settingsForm.accentColor}
                                onChange={e => setSettingsForm({...settingsForm, accentColor: e.target.value})}
                                className="w-12 h-12 bg-transparent border-none cursor-pointer"
                              />
                              <input 
                                type="text"
                                value={settingsForm.accentColor}
                                onChange={e => setSettingsForm({...settingsForm, accentColor: e.target.value})}
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">انحناء الحواف (Border Radius)</label>
                            <select 
                              value={settingsForm.borderRadius}
                              onChange={e => setSettingsForm({...settingsForm, borderRadius: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            >
                              <option value="0">حاد (None)</option>
                              <option value="0.5rem">بسيط (Small)</option>
                              <option value="1rem">متوسط (Medium)</option>
                              <option value="1.5rem">كبير (Large)</option>
                              <option value="2rem">دائري جداً (Full)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">ستايل الأزرار</label>
                            <select 
                              value={settingsForm.buttonStyle}
                              onChange={e => setSettingsForm({...settingsForm, buttonStyle: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            >
                              <option value="solid">ممتلئ (Solid)</option>
                              <option value="outline">إطار (Outline)</option>
                              <option value="ghost">شفاف (Ghost)</option>
                              <option value="brutal">بروتالي (Brutal)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">الخط الأساسي</label>
                            <select 
                              value={settingsForm.fontFamily}
                              onChange={e => setSettingsForm({...settingsForm, fontFamily: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            >
                              <option value="Cairo">Cairo (كلاسيكي)</option>
                              <option value="IBM Plex Sans Arabic">IBM Plex Sans (عصري)</option>
                              <option value="Tajawal">Tajawal (ناعم)</option>
                              <option value="Almarai">Almarai (رسمي)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">الخط الثانوي</label>
                            <select 
                              value={settingsForm.secondaryFont}
                              onChange={e => setSettingsForm({...settingsForm, secondaryFont: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            >
                              <option value="Inter">Inter (عالمي)</option>
                              <option value="JetBrains Mono">JetBrains Mono (تقني)</option>
                              <option value="Playfair Display">Playfair Display (فخم)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'hero' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                              <Layout className="w-5 h-5 text-brand-red" />
                              تخصيص الواجهة الرئيسية وصورة المكينة
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              يمكنك تغيير صورة الواجهة (المكينة/السيارة) والنصوص والشارة العائمة "خدمة متنقلة وسريعة" بكل سهولة
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleUpdateSettings}
                            disabled={loading}
                            className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-red/20 flex items-center gap-2 cursor-pointer shrink-0"
                          >
                            <Save className="w-4 h-4" />
                            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات الآن'}
                          </button>
                        </div>

                        <div className="space-y-6">
                          {/* Main Text Content */}
                          <div className="glass-card p-5 md:p-6 border-white/10 space-y-4">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                              <span>📝</span> نصوص الواجهة
                            </h4>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400 uppercase">العنوان الرئيسي</label>
                              <input 
                                type="text"
                                value={settingsForm.heroTitle}
                                onChange={e => setSettingsForm({...settingsForm, heroTitle: e.target.value})}
                                placeholder="مثال: دكتور فيكس - فحص وصيانة سيارات متنقلة"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-red"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-400 uppercase">العنوان الفرعي / الوصف</label>
                              <textarea 
                                value={settingsForm.heroSubtitle}
                                onChange={e => setSettingsForm({...settingsForm, heroSubtitle: e.target.value})}
                                placeholder="مثال: خدمة فحص وبرمجة كمبيوتر وصيانة دورية وسريعة في جدة"
                                rows={2}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-red resize-none"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">نص الشارة العلوية (Badge)</label>
                                <input 
                                  type="text"
                                  value={settingsForm.heroBadge}
                                  onChange={e => setSettingsForm({...settingsForm, heroBadge: e.target.value})}
                                  placeholder="مثال: صيانة سيارات احترافية متنقلة بجدة"
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-red"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">نص زر الحجز الرئيسي</label>
                                <input 
                                  type="text"
                                  value={settingsForm.heroButtonText}
                                  onChange={e => setSettingsForm({...settingsForm, heroButtonText: e.target.value})}
                                  placeholder="مثال: احجز الآن"
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-red"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Hero Image Management */}
                          <div className="glass-card p-5 md:p-6 border-white/10 space-y-5">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>🖼️</span> صورة الواجهة الرئيسية (صورة المكينة/السيارة)
                              </h4>
                              {settingsForm.heroImageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setSettingsForm({ ...settingsForm, heroImageUrl: '' })}
                                  className="text-xs text-brand-red hover:underline cursor-pointer"
                                >
                                  إعادة للصورة الافتراضية
                                </button>
                              )}
                            </div>

                            {/* Live Preview Box with Badge Overlay */}
                            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-xl max-w-2xl mx-auto">
                              <div className="aspect-[16/9] sm:aspect-[21/9] w-full relative">
                                <img 
                                  src={settingsForm.heroImageUrl || "/hero-custom.jpg"} 
                                  alt="Hero Preview" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                
                                {/* Floating Badge Preview */}
                                {settingsForm.showHeroImageBadge !== false && (
                                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-brand-black/90 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-lg">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                                    <div className="text-right">
                                      <div className="text-xs font-bold text-white">
                                        {settingsForm.heroImageBadgeTitle || "خدمة متنقلة وسريعة"}
                                      </div>
                                      <div className="text-[10px] text-gray-400">
                                        {settingsForm.heroImageBadgeSubtitle || "نصلك أينما كنت بجدة"}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-300 border border-white/10">
                                  معاينة حية للصورة الحالية
                                </div>
                              </div>
                            </div>

                            {/* Preset Quick Select Library */}
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-300 block">
                                ⚡ اختر صورة جاهزة بنقرة واحدة من المكتبة:
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                  {
                                    title: 'صورة DR.FIX الحالية (المعتمدة)',
                                    url: '/hero-custom.jpg',
                                    badge: 'الهوية الرسمية'
                                  },
                                  {
                                    title: 'ورشة وميكانيك حديث',
                                    url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1000',
                                    badge: 'ورشة متكاملة'
                                  },
                                  {
                                    title: 'صيانة متنقلة وفحص محركات',
                                    url: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=1000',
                                    badge: 'صيانة متنقلة'
                                  },
                                  {
                                    title: 'فحص وتشخيص كمبيوتر',
                                    url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&q=80&w=1000',
                                    badge: 'فحص كمبيوتر'
                                  },
                                  {
                                    title: 'ميكانيكي وفحص دقيق',
                                    url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1000',
                                    badge: 'فني محترف'
                                  },
                                  {
                                    title: 'صيانة دورية وزيوت',
                                    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000',
                                    badge: 'صيانة سريعة'
                                  }
                                ].map((preset, idx) => {
                                  const isSelected = (settingsForm.heroImageUrl || '/hero-custom.jpg') === preset.url;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => setSettingsForm({ ...settingsForm, heroImageUrl: preset.url })}
                                      className={cn(
                                        "group relative rounded-xl overflow-hidden border transition-all cursor-pointer aspect-[16/10]",
                                        isSelected ? "border-brand-red ring-2 ring-brand-red/50 scale-[1.02]" : "border-white/10 hover:border-white/30"
                                      )}
                                    >
                                      <img src={preset.url} alt={preset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                      <div className="absolute bottom-2 right-2 left-2 text-right">
                                        <div className="text-[11px] font-bold text-white line-clamp-1">{preset.title}</div>
                                        <div className="text-[9px] text-gray-300">{preset.badge}</div>
                                      </div>
                                      {isSelected && (
                                        <div className="absolute top-2 right-2 bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                          <Check className="w-3 h-3" /> تم الاختيار
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Upload & Custom URL Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 block">
                                  📁 أو ارفع صورة خاصة من جهازك / جوالك:
                                </label>
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'hero')}
                                  className="w-full text-xs text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-red-700 cursor-pointer bg-white/5 p-2 rounded-xl border border-white/10"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 block">
                                  🔗 أو ضع رابط صورة مباشر (URL):
                                </label>
                                <input 
                                  type="text"
                                  value={settingsForm.heroImageUrl}
                                  onChange={e => setSettingsForm({...settingsForm, heroImageUrl: e.target.value})}
                                  placeholder="https://example.com/my-car-image.jpg"
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-brand-red"
                                />
                              </div>
                            </div>

                            {/* Recommended & Uploaded Image Size Info for Hero Image */}
                            <ImageUploadSizeBadge
                              meta={uploadedImageMeta.hero}
                              imageUrl={settingsForm.heroImageUrl}
                              recommended={{
                                dimensions: '1200 × 800 أو 1920 × 1080 بكسل (16:9)',
                                idealSize: '300 - 700 كيلوبايت (KB)',
                                formats: 'JPG، WebP، PNG'
                              }}
                            />
                          </div>

                          {/* Floating Stat Badge on Image Configuration */}
                          <div className="glass-card p-5 md:p-6 border-white/10 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>🏷️</span> الشارة العائمة على صورة المكينة (خدمة متنقلة وسريعة)
                                </h4>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  يمكنك تعديل النص المكتوب على الصورة أو إخفاء الشارة تماماً
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSettingsForm({
                                  ...settingsForm,
                                  showHeroImageBadge: !(settingsForm.showHeroImageBadge !== false)
                                })}
                                className={cn(
                                  "w-12 h-6 rounded-full relative transition-all cursor-pointer",
                                  settingsForm.showHeroImageBadge !== false ? "bg-brand-red" : "bg-gray-700"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
                                  settingsForm.showHeroImageBadge !== false ? "right-0.5" : "left-0.5"
                                )} />
                              </button>
                            </div>

                            {settingsForm.showHeroImageBadge !== false ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-400 uppercase">
                                    العنوان الرئيسي للشارة
                                  </label>
                                  <input 
                                    type="text"
                                    value={settingsForm.heroImageBadgeTitle || 'خدمة متنقلة وسريعة'}
                                    onChange={e => setSettingsForm({...settingsForm, heroImageBadgeTitle: e.target.value})}
                                    placeholder="خدمة متنقلة وسريعة"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-red"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-400 uppercase">
                                    النص الفرعي للشارة
                                  </label>
                                  <input 
                                    type="text"
                                    value={settingsForm.heroImageBadgeSubtitle || 'نصلك أينما كنت بجدة'}
                                    onChange={e => setSettingsForm({...settingsForm, heroImageBadgeSubtitle: e.target.value})}
                                    placeholder="نصلك أينما كنت بجدة"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-red"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-400 text-center">
                                الشارة العائمة معطلة حالياً ولن تظهر على الصورة في الصفحة الرئيسية.
                              </div>
                            )}
                          </div>

                          {/* Save Changes Button */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleUpdateSettings}
                              disabled={loading}
                              className="w-full py-4 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-red/25 flex items-center justify-center gap-2 cursor-pointer text-sm"
                            >
                              <Save className="w-5 h-5" />
                              {loading ? 'جاري حفظ التغييرات...' : 'حفظ وتطبيق تغييرات الواجهة والصورة الآن'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'contact' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Share2 className="w-5 h-5 text-brand-red" />
                          التواصل والاجتماعي
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Phone className="w-3 h-3" /> رقم الهاتف
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.phone}
                              onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <MessageCircle className="w-3 h-3" /> واتساب
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.whatsapp}
                              onChange={e => setSettingsForm({...settingsForm, whatsapp: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                              <img src="/social/instagram.svg" alt="Instagram" className="w-4 h-4 object-contain rounded-sm" /> إنستغرام
                            </label>
                            <input 
                              type="text"
                              placeholder="https://instagram.com/your-account"
                              value={settingsForm.instagram}
                              onChange={e => setSettingsForm({...settingsForm, instagram: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                              <img src="/social/twitter.svg" alt="X (Twitter)" className="w-4 h-4 object-contain rounded-sm" /> منصة إكس (تويتر)
                            </label>
                            <input 
                              type="text"
                              placeholder="https://x.com/your-account"
                              value={settingsForm.twitter}
                              onChange={e => setSettingsForm({...settingsForm, twitter: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                              <img src="/social/facebook.svg" alt="Facebook" className="w-4 h-4 object-contain rounded-sm" /> فيسبوك
                            </label>
                            <input 
                              type="text"
                              placeholder="https://facebook.com/your-page"
                              value={settingsForm.facebook}
                              onChange={e => setSettingsForm({...settingsForm, facebook: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                              <img src="/social/snapchat.svg" alt="Snapchat" className="w-4 h-4 object-contain rounded-sm" /> سناب شات
                            </label>
                            <input 
                              type="text"
                              placeholder="https://snapchat.com/add/your-account"
                              value={settingsForm.snapchat}
                              onChange={e => setSettingsForm({...settingsForm, snapchat: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase flex items-center gap-2">
                              <img src="/social/tiktok.svg" alt="TikTok" className="w-4 h-4 object-contain rounded-sm" /> تيك توك
                            </label>
                            <input 
                              type="text"
                              placeholder="https://tiktok.com/@your-account"
                              value={settingsForm.tiktok}
                              onChange={e => setSettingsForm({...settingsForm, tiktok: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <MapPin className="w-3 h-3" /> الموقع (رابط خرائط جوجل)
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.location}
                              onChange={e => setSettingsForm({...settingsForm, location: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'sections' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Eye className="w-5 h-5 text-brand-red" />
                          الأقسام والظهور
                        </h3>

                        {/* Customer Account System Master Switch */}
                        <div className="p-4 rounded-2xl bg-black/40 border border-brand-red/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-brand-red/20 text-brand-red border border-brand-red/30">
                                <Users className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                  نظام تسجيل دخول وحسابات العملاء
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30">ميزة مفعّلة</span>
                                </h4>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  إظهار زر "تسجيل الدخول / حسابي" في أعلى الموقع للعملاء لحفظ سياراتهم وتتبع حالة صيانة حجوزاتهم. يمكنك إيقافه أو تشغيله بنقرة واحدة في أي وقت.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({
                                ...settingsForm,
                                enableCustomerAccounts: !(settingsForm.enableCustomerAccounts ?? true)
                              })}
                              className={cn(
                                "w-12 h-6 rounded-full relative transition-all cursor-pointer shrink-0",
                                (settingsForm.enableCustomerAccounts ?? true) ? "bg-brand-red" : "bg-gray-700"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                (settingsForm.enableCustomerAccounts ?? true) ? "right-1" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { id: 'showStats', label: 'إحصائيات الأرقام', icon: BarChart },
                            { id: 'showOffers', label: 'قسم العروض', icon: Tag },
                            { id: 'showGallery', label: 'معرض الصور', icon: Camera },
                            { id: 'showTestimonials', label: 'آراء العملاء', icon: Star },
                            { id: 'showServices', label: 'قسم الخدمات', icon: Wrench },
                            { id: 'showPartners', label: 'صفحة وقسم شركاء النجاح', icon: Handshake },
                            { id: 'showContact', label: 'قسم تواصل معنا', icon: Phone },
                            { id: 'showPrivacyPolicy', label: 'رابط سياسة الخصوصية (PDPL)', icon: ShieldCheck },
                            { id: 'showTermsOfService', label: 'رابط شروط الخدمة والضمان', icon: FileText },
                          ].map((section) => (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => setSettingsForm({...settingsForm, [section.id]: !settingsForm[section.id as keyof typeof settingsForm]})}
                              className={cn(
                                "flex items-center justify-between p-4 rounded-xl border transition-all",
                                settingsForm[section.id as keyof typeof settingsForm]
                                  ? "bg-brand-red/10 border-brand-red/30 text-white"
                                  : "bg-white/5 border-white/10 text-gray-500"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <section.icon className="w-4 h-4" />
                                <span className="text-sm font-bold">{section.label}</span>
                              </div>
                              <div className={cn(
                                "w-10 h-5 rounded-full relative transition-all",
                                settingsForm[section.id as keyof typeof settingsForm] ? "bg-brand-red" : "bg-gray-700"
                              )}>
                                <div className={cn(
                                  "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                                  settingsForm[section.id as keyof typeof settingsForm] ? "right-1" : "left-1"
                                )} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'seo' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Search className="w-5 h-5 text-brand-red" />
                          الأرشفة (SEO)
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">وصف الموقع (Meta Description)</label>
                            <textarea 
                              value={settingsForm.metaDescription}
                              onChange={e => setSettingsForm({...settingsForm, metaDescription: e.target.value})}
                              rows={3}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red resize-none"
                              placeholder="وصف مختصر يظهر في محركات البحث..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">الكلمات المفتاحية (Keywords)</label>
                            <input 
                              type="text"
                              value={settingsForm.metaKeywords}
                              onChange={e => setSettingsForm({...settingsForm, metaKeywords: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                              placeholder="صيانة سيارات, ميكانيكا, كهرباء سيارات..."
                            />
                            <p className="text-[10px] text-gray-500">افصل بين الكلمات بفاصلة (,)</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">Google Analytics ID</label>
                              <input 
                                type="text"
                                value={settingsForm.googleAnalyticsId}
                                onChange={e => setSettingsForm({...settingsForm, googleAnalyticsId: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                                placeholder="G-XXXXXXXXXX"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">Facebook Pixel ID</label>
                              <input 
                                type="text"
                                value={settingsForm.facebookPixelId}
                                onChange={e => setSettingsForm({...settingsForm, facebookPixelId: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                                placeholder="XXXXXXXXXXXXXXXX"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'footer' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <AlignLeft className="w-5 h-5 text-brand-red" />
                          تذييل الصفحة (Footer)
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">وصف التذييل</label>
                            <textarea 
                              value={settingsForm.footerDescription}
                              onChange={e => setSettingsForm({...settingsForm, footerDescription: e.target.value})}
                              rows={3}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red resize-none"
                              placeholder="وصف مختصر يظهر في أسفل الصفحة..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">نص الحقوق (Copyright)</label>
                            <input 
                              type="text"
                              value={settingsForm.copyrightText}
                              onChange={e => setSettingsForm({...settingsForm, copyrightText: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                              placeholder="جميع الحقوق محفوظة © 2024"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'legal' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                              <ShieldCheck className="w-5 h-5 text-brand-red" />
                              <span>سياسة الخصوصية وشروط الخدمة</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              تخصيص بنود الخصوصية وحماية البيانات الشخصية وفق النظام السعودي (PDPL) وشروط تقديم خدمة الصيانة المتنقلة بجدة
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleUpdateSettings}
                            disabled={loading}
                            className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-red/20 flex items-center gap-2 cursor-pointer shrink-0"
                          >
                            <Save className="w-4 h-4" />
                            {loading ? 'جاري الحفظ...' : 'حفظ التعديلات الآن'}
                          </button>
                        </div>

                        {/* Informational Guidance Alert */}
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-brand-red/10 text-brand-red shrink-0 mt-0.5">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div className="text-xs text-gray-300 leading-relaxed">
                            <div className="font-bold text-white text-sm mb-1">الامتثال لنظام حماية البيانات الشخصية السعودي (PDPL) وإدارة الظهور</div>
                            يمكنك من هنا تعديل بنود الخصوصية وشروط الضمان أو إخفائها وإظهارها في تذييل الموقع بنقرة زر واحدة. عند التفعيل، تظهر الروابط تلقائياً لعملائك وزوار الموقع بجدة.
                          </div>
                        </div>

                        {/* Visibility Toggles for Legal Docs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className={cn(
                            "p-4 rounded-2xl border transition-all flex items-center justify-between gap-3",
                            settingsForm.showPrivacyPolicy !== false ? "bg-black/50 border-brand-red/40" : "bg-white/[0.02] border-white/10"
                          )}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-xl bg-brand-red/15 text-brand-red shrink-0">
                                <ShieldCheck className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-white">ظهور سياسة الخصوصية (PDPL)</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {settingsForm.showPrivacyPolicy !== false ? 'مفعلة وظاهرة في تذييل الموقع' : 'مخفية حالياً من تذييل الموقع'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, showPrivacyPolicy: !(settingsForm.showPrivacyPolicy ?? true) })}
                              className={cn(
                                "w-12 h-6 rounded-full relative transition-all cursor-pointer shrink-0",
                                (settingsForm.showPrivacyPolicy ?? true) ? "bg-brand-red" : "bg-gray-700"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                (settingsForm.showPrivacyPolicy ?? true) ? "right-1" : "left-1"
                              )} />
                            </button>
                          </div>

                          <div className={cn(
                            "p-4 rounded-2xl border transition-all flex items-center justify-between gap-3",
                            settingsForm.showTermsOfService !== false ? "bg-black/50 border-brand-red/40" : "bg-white/[0.02] border-white/10"
                          )}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-xl bg-brand-red/15 text-brand-red shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-white">ظهور شروط الخدمة والضمان</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {settingsForm.showTermsOfService !== false ? 'مفعلة وظاهرة في تذييل الموقع' : 'مخفية حالياً من تذييل الموقع'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, showTermsOfService: !(settingsForm.showTermsOfService ?? true) })}
                              className={cn(
                                "w-12 h-6 rounded-full relative transition-all cursor-pointer shrink-0",
                                (settingsForm.showTermsOfService ?? true) ? "bg-brand-red" : "bg-gray-700"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                (settingsForm.showTermsOfService ?? true) ? "right-1" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>

                        {/* Privacy Policy Editor */}
                        <div className="space-y-3 p-5 rounded-2xl bg-black/40 border border-white/5">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <label className="text-sm font-bold text-white flex items-center gap-2">
                              <FileText className="w-4 h-4 text-brand-red" />
                              <span>نصوص سياسة الخصوصية وحماية البيانات (PDPL)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, privacyPolicyText: DEFAULT_PRIVACY_POLICY })}
                              className="text-xs text-brand-red hover:underline font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              استعادة النص النموذجي المعتمد (PDPL)
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">
                            اترك الحقل فارغاً لاستخدام النموذج القانوني الافتراضي الشامل المحدث لعام 2026، أو قم بكتابة وتعديل بنودك الخاصة أدناه:
                          </p>
                          <textarea
                            value={settingsForm.privacyPolicyText}
                            onChange={e => setSettingsForm({ ...settingsForm, privacyPolicyText: e.target.value })}
                            rows={10}
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-gray-200 leading-relaxed outline-none focus:border-brand-red font-mono resize-y"
                            placeholder={DEFAULT_PRIVACY_POLICY}
                          />
                        </div>

                        {/* Terms of Service Editor */}
                        <div className="space-y-3 p-5 rounded-2xl bg-black/40 border border-white/5">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <label className="text-sm font-bold text-white flex items-center gap-2">
                              <FileText className="w-4 h-4 text-brand-red" />
                              <span>نصوص شروط وأحكام الخدمة والضمان</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, termsOfServiceText: DEFAULT_TERMS_OF_SERVICE })}
                              className="text-xs text-brand-red hover:underline font-bold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              استعادة شروط الخدمة والضمان النموذجية
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">
                            تنظم شروط الخدمة الميدانية بجدة، إقرار التكاليف، حقوق الضمان، ومسؤوليات وقوف المركبة:
                          </p>
                          <textarea
                            value={settingsForm.termsOfServiceText}
                            onChange={e => setSettingsForm({ ...settingsForm, termsOfServiceText: e.target.value })}
                            rows={10}
                            className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-gray-200 leading-relaxed outline-none focus:border-brand-red font-mono resize-y"
                            placeholder={DEFAULT_TERMS_OF_SERVICE}
                          />
                        </div>

                        {/* Save Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleUpdateSettings}
                            disabled={loading}
                            className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-red/25 flex items-center justify-center gap-2 cursor-pointer text-sm"
                          >
                            <Save className="w-4 h-4" />
                            {loading ? 'جاري حفظ التغييرات...' : 'حفظ وتطبيق سياسة الخصوصية وشروط الخدمة الآن'}
                          </button>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'maintenance' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-brand-red" />
                          وضع الصيانة
                        </h3>
                        <div className="glass-card p-6 border-brand-red/20 bg-brand-red/5">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h4 className="font-bold mb-1">تفعيل وضع الصيانة</h4>
                              <p className="text-xs text-gray-500">عند التفعيل، سيظهر الموقع للزوار كصفحة صيانة فقط</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({...settingsForm, maintenanceMode: !settingsForm.maintenanceMode})}
                              className={cn(
                                "w-14 h-7 rounded-full relative transition-all",
                                settingsForm.maintenanceMode ? "bg-brand-red" : "bg-gray-700"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-5 h-5 rounded-full bg-white transition-all",
                                settingsForm.maintenanceMode ? "right-1" : "left-1"
                              )} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">رسالة الصيانة</label>
                            <textarea 
                              value={settingsForm.maintenanceMessage}
                              onChange={e => setSettingsForm({...settingsForm, maintenanceMessage: e.target.value})}
                              rows={3}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red resize-none"
                              placeholder="الموقع تحت الصيانة حالياً، سنعود قريباً..."
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-6 border-t border-white/10 flex justify-end">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto justify-center px-6 sm:px-10 py-3.5 sm:py-4 bg-brand-red rounded-xl font-display font-black italic uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                        {loading ? 'جاري الحفظ...' : 'حفظ جميع الإعدادات'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-white/5 w-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-red" />
                  إدارة محتوى الموقع
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => { setActiveTab('content'); setContentTab('services'); }}
                    className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-brand-red/50 transition-all text-right group"
                  >
                    <Wrench className="w-8 h-8 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
                    <div className="font-bold mb-1">إدارة الخدمات</div>
                    <div className="text-xs text-gray-500">تعديل الخدمات التي تظهر للعملاء</div>
                  </button>
                  <button 
                    onClick={() => { setActiveTab('content'); setContentTab('offers'); }}
                    className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-brand-red/50 transition-all text-right group"
                  >
                    <Tag className="w-8 h-8 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
                    <div className="font-bold mb-1">إدارة العروض الخاصة</div>
                    <div className="text-xs text-gray-500">تعديل العروض الخاصة والخصومات</div>
                  </button>
                  <button 
                    onClick={() => { setActiveTab('content'); setContentTab('gallery'); }}
                    className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-brand-red/50 transition-all text-right group"
                  >
                    <Camera className="w-8 h-8 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
                    <div className="font-bold mb-1">إدارة المعرض</div>
                    <div className="text-xs text-gray-500">رفع صور جديدة لأعمال المركز</div>
                  </button>
                  <button 
                    onClick={() => setActiveTab('partners')}
                    className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:border-brand-red/50 transition-all text-right group"
                  >
                    <Handshake className="w-8 h-8 text-brand-red mb-4 group-hover:scale-110 transition-transform" />
                    <div className="font-bold mb-1">إدارة شركاء النجاح</div>
                    <div className="text-xs text-gray-500">إضافة وتعديل الورش والمحلات ومواقعها</div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {!isTechnician && activeTab === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <StaffManagement 
                staffList={staffList} 
                currentStaffUser={currentStaffUser || null} 
                appUrl={window.location.origin} 
              />
            </motion.div>
          )}

          {!isTechnician && activeTab === 'partners' && (
            <motion.div
              key="partners"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminPartnersManager
                partners={partners}
                onAddPartner={handleAddPartner}
                onUpdatePartner={handleUpdatePartner}
                onDeletePartner={handleDeletePartner}
                isSectionVisible={settings.showPartners !== false}
                onToggleSectionVisibility={handleTogglePartnersVisibility}
              />
            </motion.div>
          )}

          {!isTechnician && activeTab === 'contracts' && (
            <motion.div
              key="contracts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminContractsManager
                contracts={contracts}
                onAddContract={handleAddContract}
                onUpdateContract={handleUpdateContract}
                onDeleteContract={handleDeleteContract}
                onAddVehicleToContract={handleAddVehicleToContract}
                onUpdateVehicleInContract={handleUpdateVehicleInContract}
                onDeleteVehicleFromContract={handleDeleteVehicleFromContract}
                lang={lang}
              />
            </motion.div>
          )}

          {activeTab === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SystemManual lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add New Modal */}
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto overscroll-contain">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative w-full max-w-2xl bg-[#0f0f12] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94dvh] sm:max-h-[88vh] my-auto overflow-hidden overscroll-contain z-10"
              >
                {/* Sticky Header with Title and Close Button */}
                <div className="px-5 sm:px-7 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md flex justify-between items-center shrink-0 z-20">
                  <h3 className="text-lg sm:text-xl font-display font-black italic text-white">
                    {editingItem ? 'تعديل' : 'إضافة'} {activeTab === 'dashboard' || activeTab === 'bookings' ? 'حجز' : 
                          activeTab === 'content' ? (contentTab === 'services' ? 'خدمة' : contentTab === 'offers' ? 'عرض' : 'صورة') : 'جديد'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingItem(null); }} 
                    className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 overscroll-contain">

                {(activeTab === 'dashboard' || activeTab === 'bookings' || activeTab === 'calendar') && (
                  <form onSubmit={handleAddRecord} className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">رقم الجوال</label>
                      <input 
                        required
                        value={formData.customerPhone}
                        onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                        placeholder="05XXXXXXXX أو +9665..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">السيارة</label>
                      <input 
                        required
                        value={formData.carModel}
                        onChange={e => setFormData({...formData, carModel: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">نوع الخدمة</label>
                      <input 
                        required
                        value={formData.serviceType}
                        onChange={e => setFormData({...formData, serviceType: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">تاريخ ووقت الموعد</label>
                      <input 
                        type="datetime-local"
                        value={formData.serviceDate || ''}
                        onChange={e => setFormData({...formData, serviceDate: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-white"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">ملاحظات</label>
                      <textarea 
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red h-24"
                      />
                    </div>
                    <button className="md:col-span-2 py-4 bg-brand-red rounded-xl font-bold italic">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingItem ? 'تحديث السجل' : 'حفظ السجل')}
                    </button>
                  </form>
                )}

                {activeTab === 'content' && contentTab === 'services' && (
                  <form onSubmit={handleAddService} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">اسم الخدمة</label>
                      <input 
                        required
                        value={serviceForm.title}
                        onChange={e => setServiceForm({...serviceForm, title: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">الوصف</label>
                      <textarea 
                        required
                        value={serviceForm.description}
                        onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">السعر (اختياري)</label>
                      <input 
                        value={serviceForm.price}
                        onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <button className="w-full py-4 bg-brand-red rounded-xl font-bold italic">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (editingItem ? 'تحديث الخدمة' : 'إضافة الخدمة')}
                    </button>
                  </form>
                )}

                {activeTab === 'content' && contentTab === 'offers' && (
                  <form onSubmit={handleAddOffer} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">عنوان العرض</label>
                      <input 
                        required
                        value={offerForm.title}
                        onChange={e => setOfferForm({...offerForm, title: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">السعر</label>
                      <input 
                        required
                        value={offerForm.price}
                        onChange={e => setOfferForm({...offerForm, price: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">المميزات (كل سطر ميزة)</label>
                      <textarea 
                        required
                        value={offerForm.features}
                        onChange={e => setOfferForm({...offerForm, features: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red h-32"
                      />
                    </div>
                    <button className="w-full py-4 bg-brand-red rounded-xl font-bold italic">إضافة العرض</button>
                  </form>
                )}

                {activeTab === 'content' && contentTab === 'gallery' && (
                  <form onSubmit={handleAddGallery} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">عنوان الصورة</label>
                      <input 
                        required
                        value={galleryForm.title}
                        onChange={e => setGalleryForm({...galleryForm, title: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">رفع الصورة</label>
                      <div className="flex flex-col gap-4">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'gallery')}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red file:bg-brand-red file:border-none file:rounded-lg file:text-white file:px-4 file:py-1 file:mr-4 file:cursor-pointer"
                        />
                        {galleryForm.imageUrl && (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                            <img src={galleryForm.imageUrl} alt="Preview" className="w-full h-full object-cover" loading="lazy" />
                            <button 
                              type="button"
                              onClick={() => {
                                setGalleryForm({ ...galleryForm, imageUrl: '' });
                                setUploadedImageMeta(prev => ({ ...prev, gallery: undefined }));
                              }}
                              className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-brand-red transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-white/5" />
                          <span className="text-[10px] text-gray-600 uppercase font-bold">أو استخدم رابط</span>
                          <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <input 
                          placeholder="https://example.com/image.jpg"
                          value={galleryForm.imageUrl}
                          onChange={e => setGalleryForm({...galleryForm, imageUrl: e.target.value})}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red text-sm"
                        />

                        {/* Recommended & Uploaded Image Size Info for Gallery */}
                        <ImageUploadSizeBadge
                          meta={uploadedImageMeta.gallery}
                          imageUrl={galleryForm.imageUrl}
                          recommended={{
                            dimensions: '800 × 600 بكسل أو 800 × 800 بكسل',
                            idealSize: 'أقل من 500 كيلوبايت (KB)',
                            formats: 'JPG، WebP، PNG'
                          }}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading || !galleryForm.imageUrl}
                      className="w-full py-4 bg-brand-red rounded-xl font-bold italic disabled:opacity-50"
                    >
                      {loading ? 'جاري الحفظ...' : (editingItem ? 'تحديث الصورة' : 'إضافة للمعرض')}
                    </button>
                  </form>
                )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Full Booking Details Modal */}
        <AnimatePresence>
          {selectedBookingDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-lg w-full max-h-[94dvh] sm:max-h-[88vh] flex flex-col border-brand-red/30 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative my-auto overscroll-contain"
              >
                {/* Sticky Header with Title and Close Button */}
                <div className="px-5 sm:px-6 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center text-brand-red shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{selectedBookingDetails.carModel}</h3>
                      <p className="text-xs text-gray-400">تفاصيل الحجز المسجل</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedBookingDetails(null)}
                    className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-7 overflow-y-auto flex-1 space-y-4 text-sm overscroll-contain">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">رقم جوال العميل</div>
                      <div className="font-bold text-white text-base" dir="ltr">{selectedBookingDetails.customerPhone}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">الضمان والاعتماد</div>
                      <div className="font-bold text-emerald-400 text-base">معتمد بضمان المركز</div>
                    </div>
                  </div>

                  {/* Assigned Technician Card */}
                  <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
                    <div>
                      <div className="text-xs text-gray-400">الفني الميداني المسؤول</div>
                      <div className="font-bold text-white text-sm mt-0.5 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{selectedBookingDetails.assignedStaffName || 'لم يُسند لفني بعد'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenTimeline(selectedBookingDetails, isTechnician ? 'timeline' : (selectedBookingDetails.assignedStaffId ? 'timeline' : 'assign'))}
                      className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 border border-brand-red/40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {isTechnician ? 'عرض التوثيق والسند' : (selectedBookingDetails.assignedStaffId ? 'إدارة التوثيق والفني' : '+ إسناد لفني الآن')}
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl space-y-1">
                    <div className="text-xs text-gray-400">نوع الخدمة المطلوبة</div>
                    <div className="font-bold text-white">{selectedBookingDetails.serviceType}</div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl space-y-1">
                    <div className="text-xs text-gray-400">تاريخ وساعة التسجيل</div>
                    <div className="font-bold text-white">
                      {safeFormatDate(selectedBookingDetails.serviceDate || selectedBookingDetails.createdAt, 'ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'غير متوفر'}
                    </div>
                  </div>

                  {selectedBookingDetails.notes && (
                    <div className="bg-white/5 p-4 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">ملاحظات العميل / الفني</div>
                      <p className="text-gray-200 italic whitespace-pre-line text-xs leading-relaxed">{selectedBookingDetails.notes}</p>
                    </div>
                  )}

                  <div className="bg-white/5 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">حالة الحجز الحالية:</div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        selectedBookingDetails.status === 'completed' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                        selectedBookingDetails.status === 'accepted' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        selectedBookingDetails.status === 'on_the_way' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" :
                        selectedBookingDetails.status === 'in-progress' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        selectedBookingDetails.status === 'cancelled' ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        selectedBookingDetails.status === 'new' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                        "bg-white/10 text-white border border-white/20"
                      )}>
                        {selectedBookingDetails.status === 'completed' ? 'مكتمل 🏁' :
                         selectedBookingDetails.status === 'accepted' ? 'تم القبول ✅' :
                         selectedBookingDetails.status === 'on_the_way' ? 'الفني بالطريق 🚗' :
                         selectedBookingDetails.status === 'in-progress' ? 'قيد العمل 🔧' :
                         selectedBookingDetails.status === 'cancelled' ? 'ملغي ❌' :
                         selectedBookingDetails.status === 'new' ? 'جديد 🆕' : 'قيد الانتظار ⏳'}
                      </span>
                    </div>

                    {/* Quick Status Changers with WhatsApp Trigger - for management only */}
                    {!isTechnician && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="text-[11px] text-gray-400 font-bold">تحديث الحالة والانتقال الفوري للواتساب:</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <a
                            href={getWhatsAppStatusUrl(selectedBookingDetails, 'accepted')}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              handleUpdateStatus(selectedBookingDetails.id, 'accepted');
                              setSelectedBookingDetails(prev => prev ? { ...prev, status: 'accepted' } : null);
                            }}
                            className="px-2 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-center text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            ✅ قبول الحجز
                          </a>
                          <a
                            href={getWhatsAppStatusUrl(selectedBookingDetails, 'on_the_way')}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              handleUpdateStatus(selectedBookingDetails.id, 'on_the_way');
                              setSelectedBookingDetails(prev => prev ? { ...prev, status: 'on_the_way' } : null);
                            }}
                            className="px-2 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 rounded-lg text-center text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            🚗 الفني بالطريق
                          </a>
                          <a
                            href={getWhatsAppStatusUrl(selectedBookingDetails, 'completed')}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              handleUpdateStatus(selectedBookingDetails.id, 'completed');
                              setSelectedBookingDetails(prev => prev ? { ...prev, status: 'completed' } : null);
                            }}
                            className="px-2 py-2 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 rounded-lg text-center text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                          >
                            🏁 تم الإنجاز
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Big Button: Steps & Field Photos Timeline */}
                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={() => setTimelineBookingRecord(selectedBookingDetails)}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-red via-red-600 to-brand-red hover:brightness-110 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer transition-all border border-red-500/40"
                  >
                    <Eye className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                    <span className="font-black">فيو:</span>
                    <span>متابعة مراحل العمل وتوثيق الفني أين وصل ({selectedBookingDetails.serviceSteps?.length || 0} مرحلة) 📸</span>
                  </button>
                </div>

                {/* Quick actions in modal */}
                <div className="space-y-2 pt-2">
                  {!isTechnician && (
                    <a 
                      href={getWhatsAppStatusUrl(selectedBookingDetails, selectedBookingDetails.status)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>إرسال تحديث الحالة للعميل عبر الواتساب 📲</span>
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => exportSingleBookingWord(selectedBookingDetails as any)}
                      className="py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>تصدير سند Word (.doc)</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-brand-red/20"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة السند / PDF</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {!isTechnician && (
                      <a 
                        href={`https://api.whatsapp.com/send?phone=${(selectedBookingDetails.customerPhone || '').replace(/\D/g, '').replace(/^0/, '966')}&text=${encodeURIComponent(`🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n${(selectedBookingDetails.customerName || selectedBookingDetails.name || '').trim() ? `هلا ${(selectedBookingDetails.customerName || selectedBookingDetails.name || '').trim()} 👋\n` : 'هلا بك 👋\n'}بخصوص حجزك (${selectedBookingDetails.carModel || 'السيارة'}) رقم #${selectedBookingDetails.bookingId || selectedBookingDetails.id || ''}\n\nكيف نقدر نخدمك؟ 🔧⚡`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        محادثة عامة
                      </a>
                    )}
                    <a 
                      href={`tel:${selectedBookingDetails.customerPhone}`}
                      className="py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4 text-blue-400" />
                      اتصال هاتفي
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Service Timeline & Photo Documentation Modal */}
        {timelineBookingRecord && (
          <ServiceTimelineModal
            record={timelineBookingRecord}
            staffList={staffList}
            allRecords={records}
            currentStaffUser={currentStaffUser}
            initialTab={timelineInitialTab}
            initialStage={timelineInitialStage}
            telegramConfig={{
              botToken: settingsForm.telegramBotToken,
              chatId: settingsForm.telegramChatId
            }}
            onClose={() => {
              setTimelineBookingRecord(null);
              setTimelineInitialStage(undefined);
            }}
            onUpdateRecord={(updatedRecord) => {
              setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r).sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a)));
              if (selectedBookingDetails?.id === updatedRecord.id) {
                setSelectedBookingDetails(updatedRecord);
              }
              setTimelineBookingRecord(updatedRecord);
            }}
          />
        )}

        {/* Service Workflow Guide Modal */}
        {showWorkflowGuideModal && (
          <ServiceWorkflowGuideModal
            isOpen={showWorkflowGuideModal}
            onClose={() => setShowWorkflowGuideModal(false)}
            defaultRole={workflowGuideDefaultRole}
          />
        )}

        {/* Delete Confirmation Modal (In-App Dialog - Safe for sandboxed iframes) */}
        <AnimatePresence>
          {deleteConfirmTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card max-w-md w-full p-4 sm:p-6 border-brand-red/40 relative space-y-4 sm:space-y-5 bg-[#0f0f12] shadow-2xl rounded-2xl sm:rounded-3xl my-auto max-h-[94dvh] overflow-y-auto overscroll-contain"
              >
                <button 
                  type="button"
                  onClick={() => !isDeletingProcess && setDeleteConfirmTarget(null)}
                  disabled={isDeletingProcess}
                  className="absolute top-5 left-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-brand-red shrink-0">
                    <Trash2 className="w-6 h-6 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {deleteConfirmTarget.type === 'batch_bookings' 
                        ? `تأكيد حذف (${deleteConfirmTarget.count}) حجز` 
                        : deleteConfirmTarget.type === 'batch_offers'
                        ? 'تأكيد حذف كافة العروض'
                        : 'تأكيد الحذف نهائياً'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {deleteConfirmTarget.type === 'batch_bookings'
                        ? 'سيتم حذف جميع الحجوزات المحددة نهائياً من قاعدة البيانات'
                        : deleteConfirmTarget.type === 'batch_offers'
                        ? 'سيتم مسح جميع العروض المسجلة في النظام'
                        : `سيتم حذف: ${deleteConfirmTarget.title || 'هذا العنصر'}`}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 leading-relaxed">
                  ⚠️ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه. هل أنت متأكد من المتابعة؟
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    disabled={isDeletingProcess}
                    className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer text-center"
                  >
                    إلغاء التراجع
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeletingProcess}
                    className="py-3 px-4 rounded-xl bg-brand-red hover:bg-red-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeletingProcess ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحذف...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>{deleteConfirmTarget.type === 'batch_bookings' ? `نعم، حذف (${deleteConfirmTarget.count})` : 'نعم، حذف الآن'}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Toast Notification */}
        <AnimatePresence>
          {deleteToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-bold pointer-events-none"
              style={{
                backgroundColor: deleteToast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                color: '#fff',
                borderColor: deleteToast.type === 'success' ? '#10b981' : '#ef4444'
              }}
            >
              {deleteToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-white" />}
              <span>{deleteToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default AdminDashboard;
export { AdminDashboard };
