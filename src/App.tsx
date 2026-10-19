/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
console.log("App.tsx module is being evaluated");

import React, { useState, useCallback, useMemo, useEffect, useRef, createContext, useContext, Component, Suspense } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Wrench, 
  Zap, 
  Car, 
  Shield, 
  Cpu, 
  Phone, 
  MapPin, 
  Clock,
  Mail,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  X,
  Hammer,
  Menu,
  Instagram,
  MessageCircle,
  Star,
  Quote,
  HelpCircle,
  Tag,
  Camera,
  Send,
  Loader2,
  History,
  Search,
  FileText,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  LogIn,
  Trash2,
  Plus,
  PlusCircle,
  User,
  MessageSquare,
  AlertCircle,
  Bell,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Globe,
  Palette,
  Layout,
  Share2,
  Eye,
  EyeOff,
  AlignLeft,
  ShieldAlert,
  Twitter,
  Facebook,
  Youtube,
  MousePointer2,
  Edit3,
  Filter,
  Check,
  ExternalLink,
  PhoneCall,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Radio,
  Save,
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
  FileCheck
} from 'lucide-react';
import { 
  CustomerProvider, 
  CustomerNavButton, 
  useCustomer,
  cleanCarMake,
  cleanCarYear,
  cleanCarModel,
  areCarsEqual,
  getCarSignature,
  deduplicateCarsList
} from './components/CustomerAccountSystem';
import { BookingTimeSlotPicker } from './components/BookingTimeSlotPicker';
import { BookingCtaSection } from './components/BookingCtaSection';
import { generateTechnicianAssignmentWhatsAppUrl } from './lib/whatsappUtils';
import { 
  MaintenanceRecord,
  StaffUser, 
  StaffRole, 
  StaffPermissions, 
  DEFAULT_SUPER_ADMIN_PERMISSIONS, 
  ROLE_PRESETS,
  Partner,
  DEFAULT_PARTNERS,
  Contract,
  ContractVehicle,
  DEFAULT_SAMPLE_CONTRACTS,
  getBookingTimestamp,
  sortBookingsNewestFirst,
  BookingStatus,
  PricingBreakdown,
  CustomerRepairApproval,
  AuditLogEntry,
  WarrantyDetails,
  ServiceComplaint,
  TechnicianDetailedReview
} from './types';
import { useForm } from 'react-hook-form';
import { cn } from './lib/utils';
import { phoneMatchesSearch, unifySaudiPhone, formatSaudiPhoneForWhatsApp } from './lib/phoneUtils';
import { useScrollLock } from './lib/scrollLock';
import { DEFAULT_PRIVACY_POLICY, DEFAULT_TERMS_OF_SERVICE } from './components/LegalModal';
import { LanguageProvider, useLanguage, LanguageToggle, type Language } from './context/LanguageContext';


// Code-Splitting: Lazy Loaded Admin Dashboard, Routes, and Modals
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const ServiceTimelineModal = React.lazy(() => import('./components/ServiceTimelineModal').then(m => ({ default: m.ServiceTimelineModal })));
const PartnersPage = React.lazy(() => import('./components/PartnersPage').then(m => ({ default: m.PartnersPage })));
const LegalModal = React.lazy(() => import('./components/LegalModal').then(m => ({ default: m.LegalModal })));
const ServiceWorkflowGuideModal = React.lazy(() => import('./components/ServiceWorkflowGuideModal').then(m => ({ default: m.ServiceWorkflowGuideModal })));
const InteractiveLocationPicker = React.lazy(() => import('./components/InteractiveLocationPicker').then(m => ({ default: m.InteractiveLocationPicker })));

const ComponentLoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center" dir="rtl">
    <div className="w-12 h-12 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-4 shadow-lg shadow-brand-red/5">
      <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
    </div>
    <div className="text-sm font-bold text-gray-300">جاري تحميل البيانات...</div>
  </div>
);

const ScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      let attempts = 0;
      const maxAttempts = 25;
      const interval = setInterval(() => {
        attempts++;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  return null;
};
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  where,
  getDocs,
  deleteDoc,
  limit 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from './firebase';
import { translations } from './translations';

// --- Firebase Utilities ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const str = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  return (
    str.includes('Quota limit exceeded') ||
    str.includes('Quota exceeded') ||
    str.includes('quota metric') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('exceeded free quota') ||
    str.includes('Free daily read units per project')
  );
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);

  if (isFirestoreQuotaError(error)) {
    try {
      sessionStorage.setItem('drfix_firestore_quota_exceeded', 'true');
    } catch {}
    console.warn(`[Firestore Quota Fallback] Free daily quota reached for path: ${path || 'unknown'}. Smoothly operating in local cached mode.`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { 
        detail: { path, error: errStr } 
      }));
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}



// --- UI Components ---



// --- Types ---
interface TestimonialData {
  id?: string;
  name: string;
  comment: string;
  rating: number;
  reply?: string;
  createdAt: Timestamp | any;
}
interface BookingFormData {
  customerName?: string;
  carMake: string;
  carModel: string;
  carYear: string;
  serviceType: string;
  description: string;
  phone: string;
}

// --- Global Auth Guard ---
const ADMIN_CREDENTIALS = {
  username: 'DRFIX',
  password: 'ADMIN2468'
};

export const safeFormatDate = (dateVal: any, locale = 'ar-SA', options?: Intl.DateTimeFormatOptions): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') return dateVal;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    try {
      return dateVal.toDate().toLocaleDateString(locale, options);
    } catch {
      return '';
    }
  }
  if (dateVal.seconds) {
    try {
      return new Date(dateVal.seconds * 1000).toLocaleDateString(locale, options);
    } catch {
      return '';
    }
  }
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? '' : dateVal.toLocaleDateString(locale, options);
  }
  return '';
};

// --- Components ---

const normalizeCredentialsInput = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .trim();
};

const LoginPage = ({ onLogin, isAdmin }: { onLogin: (staff?: StaffUser) => void; isAdmin?: boolean }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const cleanUser = normalizeCredentialsInput(username);
    const cleanPass = normalizeCredentialsInput(password);

    // 1. Check Master Super Admin Credentials (case-insensitive for username, flexible for mobile keyboards)
    const isMasterUser = cleanUser.toUpperCase() === ADMIN_CREDENTIALS.username.toUpperCase();
    const isMasterPass = cleanPass === ADMIN_CREDENTIALS.password || cleanPass.toUpperCase() === ADMIN_CREDENTIALS.password.toUpperCase();

    if (isMasterUser && isMasterPass) {
      const masterUser: StaffUser = {
        id: 'master-super-admin',
        username: 'DRFIX',
        password: '••••••••',
        fullName: 'المدير العام (Master Admin)',
        role: 'super_admin',
        roleTitleAr: 'المدير العام',
        permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS,
        isActive: true
      };
      onLogin(masterUser);
      setIsSubmitting(false);
      navigate('/admin', { replace: true });
      return;
    }

    // 2. Check Staff Collection in Firestore
    try {
      const staffQuery = query(
        collection(db, 'staff'),
        where('username', '==', cleanUser.toLowerCase())
      );
      const snap = await getDocs(staffQuery);

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const staffData = { id: userDoc.id, ...userDoc.data() } as StaffUser;

        const staffPass = normalizeCredentialsInput(staffData.password || '');
        if (staffPass === cleanPass) {
          if (staffData.isActive === false) {
            setError(lang === 'ar' ? 'عذراً، هذا الحساب معطل حالياً من قِبل الإدارة.' : 'This account has been deactivated by admin.');
            setIsSubmitting(false);
            return;
          }

          // Update last login timestamp in background
          updateDoc(doc(db, 'staff', userDoc.id), {
            lastLogin: serverTimestamp()
          }).catch(console.error);

          onLogin(staffData);
          setIsSubmitting(false);
          navigate('/admin', { replace: true });
          return;
        }
      }

      setError(t.login.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من اتصال الإنترنت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 sm:p-8 w-full max-w-md border-brand-red/20 shadow-2xl rounded-2xl sm:rounded-3xl relative"
      >
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 bg-brand-red/20 border border-brand-red/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-red shadow-lg shadow-brand-red/20">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black italic uppercase">
            {t.login.title} <span className="text-brand-red">{t.login.titleAccent}</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-2">تسجيل دخول الإدارة وفريق العمل الفني</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-widest block">
              {t.login.username}
            </label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-red transition-all text-white text-base font-mono"
              placeholder={t.login.usernamePlaceholder || "DRFIX"}
              required
              disabled={isSubmitting}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                {t.login.password}
              </label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pe-12 focus:outline-none focus:border-brand-red transition-all text-white text-base font-mono"
                placeholder={t.login.passwordPlaceholder || "••••••••"}
                required
                disabled={isSubmitting}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-white p-2 transition-colors cursor-pointer"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-brand-red/15 border border-brand-red/30 rounded-xl text-brand-red text-xs sm:text-sm text-center font-bold"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] py-4 bg-brand-red rounded-xl font-display font-black italic uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 text-white cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>{t.login.login}</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link 
              to="/" 
              className="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5 py-2 px-3 rounded-lg hover:bg-white/5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للموقع الرئيسي</span>
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

interface AppSettings {
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

// Built-in Instant Brand Defaults to completely eliminate any reload/refresh flicker
export const DEFAULT_APP_SETTINGS: AppSettings = {
  siteName: "Dr.Fix",
  heroTitle: "نصلح سيارتك",
  heroSubtitle: "في مكانك",
  heroBadge: "",
  heroImageUrl: "/hero-custom.jpg",
  logoUrl: "/logo-custom.png",
  phone: "0546870807",
  whatsapp: "966546870807",
  email: "info@drfix.repair",
  appDownloadUrl: "https://drive.google.com/drive/folders/1dfh85Zi8ZELc7EfUkIPcTlPJjiM9kflh?usp=sharing",
  snapchat: "https://www.snapchat.com",
  tiktok: "https://www.tiktok.com",
  instagram: "https://www.instagram.com",
  twitter: "https://x.com",
  heroButtonText: "احجز الآن",
  heroImageBadgeTitle: "خدمة متنقلة وسريعة",
  heroImageBadgeSubtitle: "نصلك أينما كنت بجدة",
  tickerText: "",
  primaryColor: "#E31837",
  accentColor: "#0A0A0A",
  borderRadius: "1rem",
  fontFamily: "Cairo",
  secondaryFont: "Inter",
  buttonStyle: "solid",
  showHeroImageBadge: true,
  showServices: true,
  showOffers: true,
  showGallery: true,
  showTestimonials: true,
  showContact: true,
  showStats: true,
  showPartners: true,
  enableCustomerAccounts: true,
  showPrivacyPolicy: true,
  showTermsOfService: true,
  copyrightText: "© 2026 جميع الحقوق محفوظة لدى DRFIX",
  privacyPolicyText: "",
  termsOfServiceText: ""
};

// Audio synthesized notification chimes for bookings and technician assignments
import { 
  playNewBookingSound, 
  playTaskAssignedSound, 
  playNotificationSound,
  initAudioUnlocker 
} from './lib/audioAlerts';
export { 
  playNewBookingSound, 
  playTaskAssignedSound, 
  playNotificationSound,
  initAudioUnlocker 
};

// Permanent Fixed Telegram Bot Configuration
export const DEFAULT_TELEGRAM_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
export const DEFAULT_TELEGRAM_CHAT_ID = '867105778';

export const escapeTelegramHtml = (text: any): string => {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// Telegram instant message dispatcher with support for multiple Chat IDs and group chats
export const sendTelegramNotification = async (
  messageText: string, 
  botToken?: string, 
  chatId?: string,
  replyMarkup?: any
): Promise<boolean> => {
  const activeToken = (botToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  const rawChatId = (chatId || DEFAULT_TELEGRAM_CHAT_ID).trim();
  if (!activeToken || !rawChatId) return false;

  // Split multiple chat IDs if separated by commas, newlines, semicolons, or spaces
  const chatIds = rawChatId
    .split(/[\n,;\s]+/)
    .map(id => id.trim())
    .filter(Boolean);

  if (chatIds.length === 0) return false;

  const results = await Promise.allSettled(
    chatIds.map(async (singleChatId) => {
      try {
        const payload: Record<string, any> = {
          chat_id: singleChatId,
          text: messageText,
          parse_mode: 'HTML'
        };
        if (replyMarkup) {
          payload.reply_markup = replyMarkup;
        }
        const url = `https://api.telegram.org/bot${activeToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.ok) return true;
        }

        // Fallback without HTML parse_mode if Telegram rejected formatting
        const plainPayload: Record<string, any> = {
          chat_id: singleChatId,
          text: String(messageText).replace(/<[^>]*>/g, '')
        };
        if (replyMarkup) {
          plainPayload.reply_markup = replyMarkup;
        }
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload)
        });
        return retryRes.ok;
      } catch (err) {
        console.error(`Telegram notification error for ID ${singleChatId}:`, err);
        return false;
      }
    })
  );

  return results.some(r => r.status === 'fulfilled' && r.value === true);
};

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 بايت';
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} كيلوبايت`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} ميجابايت`;
};

export const getBase64SizeInBytes = (base64: string): number => {
  if (!base64 || !base64.startsWith('data:')) return 0;
  const parts = base64.split(',');
  if (!parts[1]) return 0;
  const padding = parts[1].endsWith('==') ? 2 : parts[1].endsWith('=') ? 1 : 0;
  return Math.max(0, Math.round((parts[1].length * 3) / 4) - padding);
};

export interface UploadedImageInfo {
  name: string;
  origSize: string;
  origSizeBytes: number;
  compSize: string;
  compSizeBytes: number;
  origDim: string;
  compDim: string;
  savings?: string;
}

const compressImage = (
  base64Str: string, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.75,
  preservePng = false
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const isPng = preservePng || base64Str.startsWith('data:image/png');
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

const ImageUploadSizeBadge = ({ 
  meta, 
  imageUrl, 
  recommended 
}: { 
  meta?: UploadedImageInfo; 
  imageUrl?: string; 
  recommended: { dimensions: string; idealSize: string; formats: string } 
}) => {
  const [liveInfo, setLiveInfo] = useState<{ dim?: string; size?: string } | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setLiveInfo(null);
      return;
    }
    if (meta) {
      setLiveInfo(null);
      return;
    }

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const dim = img.naturalWidth ? `${img.naturalWidth} × ${img.naturalHeight} بكسل` : undefined;
      const size = imageUrl.startsWith('data:') ? formatBytes(getBase64SizeInBytes(imageUrl)) : undefined;
      setLiveInfo({ dim, size });
    };
    img.onerror = () => {
      setLiveInfo(null);
    };
  }, [imageUrl, meta]);

  return (
    <div className="space-y-2 mt-2 w-full text-right" dir="rtl">
      {/* Recommended Specs Box */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-gray-300">
        <div className="flex items-center gap-1.5 font-bold text-gray-200 mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-brand-red shrink-0" />
          <span>المقاسات والمواصفات الموصى بها:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
          <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400 block">الأبعاد الموصى بها:</span>
            <span className="font-bold text-white font-mono">{recommended.dimensions}</span>
          </div>
          <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400 block">الحجم الأقصى المثالي:</span>
            <span className="font-bold text-emerald-400 font-mono">{recommended.idealSize}</span>
          </div>
          <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400 block">الصيغ المفضلة:</span>
            <span className="font-bold text-gray-300 font-mono">{recommended.formats}</span>
          </div>
        </div>
      </div>

      {/* Selected Image Information Badge */}
      {meta ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="line-clamp-1">بيانات الصورة المرفوعة: {meta.name}</span>
            </div>
            {meta.savings && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                توفير {meta.savings} عبر التحسين والضغط الذكي
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-black/50 p-2 rounded-lg border border-white/5">
              <span className="text-gray-400 block text-[10px]">الحجم الأصلي قبل الرفع:</span>
              <span className="font-bold text-white font-mono text-xs">{meta.origSize}</span>
              <span className="text-gray-400 text-[9px] block font-mono">({meta.origDim})</span>
            </div>
            <div className="bg-black/50 p-2 rounded-lg border border-brand-red/20">
              <span className="text-brand-red block text-[10px] font-bold">الحجم الفعلي المحفوظ:</span>
              <span className="font-bold text-white font-mono text-xs">{meta.compSize}</span>
              <span className="text-gray-400 text-[9px] block font-mono">({meta.compDim})</span>
            </div>
            <div className="bg-black/50 p-2 rounded-lg border border-white/5 col-span-2 sm:col-span-1 flex flex-col justify-center">
              <span className="text-gray-400 block text-[10px]">سرعة العرض والتصفح:</span>
              <span className="font-bold text-white text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                فائقة السرعة ومثالية ✓
              </span>
            </div>
          </div>
        </div>
      ) : liveInfo ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-gray-300">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-[11px] text-gray-400">بيانات الصورة الحالية:</span>
            {liveInfo.dim && <span className="font-mono text-white text-[11px] bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{liveInfo.dim}</span>}
          </div>
          {liveInfo.size ? (
            <span className="font-mono font-bold text-white bg-brand-red/15 px-2 py-0.5 rounded text-[11px] border border-brand-red/30">
              حجم الملف: {liveInfo.size} (محسّنة للويب)
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">رابط صورة خارجي مباشر</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

const Ticker = ({ settings }: { settings: AppSettings }) => {
  const { t, lang } = useLanguage();
  
  const items = (lang === 'ar' && settings.tickerText)
    ? settings.tickerText.split('•').map(s => s.trim()).filter(Boolean)
    : lang === 'en'
    ? [
        '24/7 Mobile Car Maintenance',
        'Free Car Wash with Every Service',
        'Available Round the Clock',
        'DR. FIX AUTO SERVICES',
        'Certified Technicians to Your Doorstep',
        'Fast Response & Guaranteed Quality'
      ]
    : [
        'خدمة صيانة متنقلة 24/7',
        'غسيل مجاني مع كل صيانة',
        'متاح 24 ساعة طوال الأسبوع',
        'DR. FIX AUTO SERVICES',
        'فنيين معتمدين حتى موقعك',
        'خدمة سريعة وضمان معتمد'
      ];

  const renderList = (keyPrefix: string) => (
    <div className="animate-ticker flex shrink-0 items-center justify-around gap-6 select-none will-change-transform">
      {items.map((item, idx) => (
        <span
          key={`${keyPrefix}-${idx}`}
          className="text-white font-display font-black text-xs sm:text-xs md:text-sm italic tracking-wide inline-flex items-center gap-3 drop-shadow-sm whitespace-nowrap px-2"
        >
          <span>{item}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0 inline-block" />
        </span>
      ))}
    </div>
  );

  return (
    <div 
      dir="ltr"
      className="bg-brand-red py-2 fixed top-0 left-0 right-0 z-[60] shadow-md overflow-hidden flex items-center border-b border-red-600/40 pointer-events-none select-none touch-none"
    >
      {renderList('set1')}
      {renderList('set2')}
    </div>
  );
};

const Navbar = ({ 
  settings, 
  isAdmin, 
  isMaintenance 
}: { 
  settings: AppSettings; 
  isAdmin?: boolean; 
  isMaintenance?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { customer, setIsPortalOpen, setIsAuthOpen } = useCustomer();

  const logoClicksRef = useRef(0);
  const lastLogoClickTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret keyboard shortcut: Alt + L or Ctrl + Shift + A
      if ((e.altKey && (e.key === 'L' || e.key === 'l')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a'))) {
        e.preventDefault();
        navigate(isAdmin ? '/admin' : '/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, navigate]);

  const handleLogoClick = (e: React.MouseEvent) => {
    // In maintenance mode, prevent default navigation to avoid page jitter during clicks
    if (isMaintenance && !isAdmin) {
      e.preventDefault();
    }

    const now = Date.now();
    if (now - lastLogoClickTimeRef.current > 2500) {
      logoClicksRef.current = 1;
    } else {
      logoClicksRef.current += 1;
    }
    lastLogoClickTimeRef.current = now;

    // Secret: 5 rapid clicks on logo opens /login (or /admin if already logged in)
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      e.preventDefault();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
      navigate(isAdmin ? '/admin' : '/login');
    }
  };

  const navLinks = [
    { name: t.nav.home, path: '/' },
    ...(settings.showServices !== false ? [{ name: t.nav.services, path: '/#services' }] : []),
    ...(settings.showOffers !== false ? [{ name: t.nav.offers, path: '/#offers' }] : []),
    ...(settings.showPartners !== false ? [{ name: t.nav.partners || 'شركاء النجاح', path: '/partners' }] : []),
    ...(settings.showGallery !== false ? [{ name: t.nav.gallery, path: '/#gallery' }] : []),
  ];

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    if (path.startsWith('/#')) {
      const id = path.replace('/#', '');
      if (location.pathname === '/') {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        navigate({ pathname: '/', hash: `#${id}` });
      }
    } else {
      navigate(path);
    }
  };

  const handleBookNow = () => {
    setIsOpen(false);
    navigate('/booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-8 md:top-8.5 left-0 right-0 z-50 bg-brand-black/95 backdrop-blur-xl border-b border-white/10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-4">
        {/* Brand Logo */}
        <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2.5 sm:gap-3 group select-none shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-black rounded-xl p-1 flex items-center justify-center border border-white/10 shadow-lg overflow-hidden group-hover:border-brand-red/50 transition-colors shrink-0">
            <img 
              src={settings.logoUrl || '/logo-custom.png'} 
              alt={settings.siteName || "DR.FIX"} 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer" 
              loading="eager"
              decoding="async"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-sm md:text-base tracking-tight group-hover:text-brand-red transition-colors whitespace-nowrap">
              {settings.siteName || 'Dr. Fix'}
            </span>
            <span className="text-[10px] text-gray-400 hidden sm:inline-block whitespace-nowrap">
              {lang === 'ar' ? 'صيانة سيارات احترافية' : 'Mobile Auto Care'}
            </span>
          </div>
        </Link>
        
        {/* Desktop Menu */}
        {isMaintenance && !isAdmin ? (
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <LanguageToggle />
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-3 xl:gap-5 text-xs xl:text-sm font-bold uppercase tracking-wider shrink-0">
            {navLinks.map((link) => (
              <button 
                key={link.path} 
                onClick={() => handleNavClick(link.path)}
                className={cn(
                  "transition-colors hover:text-brand-red cursor-pointer py-1 px-1.5 whitespace-nowrap", 
                  location.pathname === link.path ? "text-brand-red font-black" : "text-gray-200"
                )}
              >
                {link.name}
              </button>
            ))}

            <div className="h-4 w-px bg-white/15 mx-0.5 shrink-0" />

            <LanguageToggle />

            {settings.enableCustomerAccounts !== false && (
              <CustomerNavButton />
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <a 
                href={`tel:${settings.phone || '0546870807'}`} 
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-brand-red hover:border-brand-red transition-all shrink-0"
                title={lang === 'ar' ? 'اتصال هاتفي' : 'Phone Call'}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a 
                href={`https://wa.me/${(settings.whatsapp || '966546870807').replace(/\+/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-brand-red hover:border-brand-red transition-all shadow-sm shrink-0 group"
                title={lang === 'ar' ? 'واتساب' : 'WhatsApp'}
              >
                <MessageCircle className="w-3.5 h-3.5 text-brand-red group-hover:text-white transition-colors" />
              </a>
            </div>

            <button 
              onClick={handleBookNow} 
              className="px-4 py-2 bg-brand-red hover:bg-red-700 rounded-full text-white font-display font-black text-xs red-glow-hover transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-md shadow-brand-red/30"
            >
              <Car className="w-3.5 h-3.5" />
              <span>{t.nav.bookNow}</span>
            </button>
          </div>
        )}

        {/* Mobile / Tablet Menu Toggle */}
        {isMaintenance && !isAdmin ? (
          <div className="flex items-center gap-2 lg:hidden shrink-0">
            <LanguageToggle />
          </div>
        ) : (
          <div className="flex items-center gap-2 lg:hidden shrink-0">
            <LanguageToggle />
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:text-brand-red hover:border-brand-red/30 transition-all cursor-pointer"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {!isMaintenance && (
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-brand-dark/98 backdrop-blur-2xl border-b border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="flex flex-col p-5 sm:p-6 gap-4 text-base font-bold">
                {navLinks.map((link) => (
                  <button 
                    key={link.path} 
                    onClick={() => handleNavClick(link.path)}
                    className={cn(
                      "text-right py-2 px-3 rounded-xl transition-all flex items-center justify-between hover:bg-white/5",
                      location.pathname === link.path ? "text-brand-red bg-brand-red/10" : "text-white"
                    )}
                  >
                    <span>{link.name}</span>
                    <ChevronLeft className="w-4 h-4 opacity-50" />
                  </button>
                ))}

                {settings.enableCustomerAccounts !== false && (
                  <div className="pt-1">
                    <CustomerNavButton isMobile onAction={() => setIsOpen(false)} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a 
                    href={`tel:${settings.phone || '0546870807'}`} 
                    onClick={() => setIsOpen(false)}
                    className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm text-white hover:bg-white/10 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-brand-red" />
                    <span>{lang === 'ar' ? 'اتصال هاتفي' : 'Phone Call'}</span>
                  </a>
                  <a 
                    href={`https://wa.me/${(settings.whatsapp || '966546870807').replace(/\+/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={() => setIsOpen(false)}
                    className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm text-white hover:bg-white/10 hover:border-brand-red transition-colors group"
                  >
                    <MessageCircle className="w-4 h-4 text-brand-red" />
                    <span>{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
                  </a>
                </div>

                <button 
                  onClick={handleBookNow} 
                  className="bg-brand-red py-3.5 px-6 rounded-xl text-center font-display text-white font-black text-sm shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2"
                >
                  <Car className="w-4 h-4" />
                  {t.nav.bookNow}
                </button>

                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 px-1 font-mono border-t border-white/5">
                  <span>Dr. Fix Auto Services</span>
                  <span>v2.5 • Verified</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </nav>
  );
};

const MobileQuickBar = ({ settings }: { settings: AppSettings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [hasActiveModal, setHasActiveModal] = useState(false);

  useEffect(() => {
    const checkModal = () => {
      const activeModal = document.querySelector(
        '.fixed.inset-0:not(.pointer-events-none):not([aria-hidden="true"]), [role="dialog"], .modal-backdrop'
      );
      setHasActiveModal(!!activeModal);
    };

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    checkModal();

    return () => observer.disconnect();
  }, []);

  if (hasActiveModal) return null;

  const handleBookClick = () => {
    navigate('/booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsappNumber = (settings.whatsapp || '966546870807').replace(/\+/g, '').replace(/[^0-9]/g, '');
  const phoneNumber = settings.phone || '0546870807';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-brand-black/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-4 gap-1.5 max-w-md mx-auto items-center">
        {/* Book Button */}
        <button
          onClick={handleBookClick}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-brand-red text-white font-bold transition-transform active:scale-95 shadow-md shadow-brand-red/30 cursor-pointer"
        >
          <Car className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap font-display font-black">{t.nav.bookNow}</span>
        </button>

        {/* WhatsApp Button */}
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-brand-red transition-all active:scale-95 group"
        >
          <MessageCircle className="w-5 h-5 mb-0.5 text-brand-red" />
          <span className="text-[10px] whitespace-nowrap font-bold">واتساب</span>
        </a>

        {/* Call Button */}
        <a
          href={`tel:${phoneNumber}`}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-brand-red transition-all active:scale-95"
        >
          <Phone className="w-5 h-5 mb-0.5 text-brand-red" />
          <span className="text-[10px] whitespace-nowrap font-bold">اتصال</span>
        </a>

        {/* Customer Account Button */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('drfix_open_portal'));
          }}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="حسابي وكرت الصيانة"
        >
          <User className="w-5 h-5 mb-0.5 text-brand-red" />
          <span className="text-[10px] whitespace-nowrap font-bold">حسابي</span>
        </button>
      </div>
    </div>
  );
};

const Hero = ({ settings }: { settings: AppSettings }) => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Lock background scrolling when image zoom modal is open
  useScrollLock(isImageModalOpen);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsImageModalOpen(false);
    };
    if (isImageModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageModalOpen]);

  const handleBookNow = () => {
    navigate('/booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[auto] sm:min-h-[85vh] lg:min-h-screen flex items-center pt-4 sm:pt-10 md:pt-20 pb-8 sm:pb-12 md:pb-16 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 md:opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-red/25 via-transparent to-transparent" />
        <div className="grid grid-cols-6 md:grid-cols-12 h-full w-full border-x border-white/5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="border-r border-white/5 h-full" />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={cn("text-center lg:text-right", lang === 'en' && "lg:text-left")}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs sm:text-sm font-bold mb-4 sm:mb-6 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
            {lang === 'ar' ? (settings.heroBadge || t.hero.badge) : t.hero.badge}
          </motion.div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black leading-tight sm:leading-tight md:leading-[1.15] mb-4 sm:mb-6 italic uppercase tracking-tight">
            {lang === 'ar' ? (settings.heroTitle || t.hero.title) : t.hero.title} <br className="hidden sm:inline" />
            <span className="text-brand-red relative inline-block mt-1 sm:mt-0">
              {lang === 'ar' ? (settings.heroSubtitle || t.hero.titleAccent) : t.hero.titleAccent}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="absolute -bottom-1 left-0 h-1 sm:h-1.5 bg-brand-red/30 rounded-full"
              />
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-gray-300 mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            {t.hero.description}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
            <button 
              onClick={handleBookNow} 
              className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-brand-red text-white font-display font-black rounded-xl red-glow-hover transition-all flex items-center justify-center gap-3 text-base sm:text-lg shadow-lg shadow-brand-red/20 active:scale-95 cursor-pointer"
            >
              <Car className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{t.hero.ctaBook}</span>
            </button>
            <div className="grid grid-cols-2 sm:flex gap-2.5 sm:gap-3 w-full sm:w-auto">
              <a 
                href={`tel:${settings.phone || '0546870807'}`} 
                className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2.5 text-sm sm:text-base hover:bg-white/10 transition-all active:scale-95 cursor-pointer" 
                title="اتصال هاتفي"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red" />
                <span>{t.hero.ctaServices}</span>
              </a>
              <a 
                href={`https://wa.me/${(settings.whatsapp || '966546870807').replace(/\+/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2.5 text-sm sm:text-base hover:bg-white/10 hover:border-brand-red transition-all active:scale-95 cursor-pointer group text-white" 
                title="واتساب"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red group-hover:scale-110 transition-transform" />
                <span>واتساب</span>
              </a>
            </div>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 sm:mt-10 text-[11px] sm:text-xs text-gray-500 italic font-medium"
          >
            {t.hero.prayer}
          </motion.p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 1, y: 0 }}
          animate={{ 
            y: [0, -8, 0]
          }}
          transition={{ 
            y: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="relative px-1 sm:px-4 md:px-0"
        >
          <div 
            onClick={() => setIsImageModalOpen(true)}
            className="relative z-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 red-glow shadow-2xl cursor-pointer group select-none transition-all duration-300 active:scale-[0.99] hover:border-brand-red/60"
            title={lang === 'ar' ? "انقر لعرض الصورة كاملة" : "Click to view full image"}
          >
            <img 
              src={settings.heroImageUrl || "/hero-custom.jpg"} 
              alt="Dr. Fix Car Maintenance" 
              className="w-full h-[250px] sm:h-[320px] md:h-[380px] lg:h-[440px] object-cover object-center bg-neutral-950 transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-transparent to-transparent opacity-60 pointer-events-none" />

            {/* Tap to zoom hint badge */}
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-white/90 text-[11px] font-medium shadow-lg opacity-90 group-hover:opacity-100 group-hover:bg-brand-red transition-all">
              <ZoomIn className="w-3.5 h-3.5 text-white" />
              <span>{lang === 'ar' ? 'عرض كامل' : 'Full view'}</span>
            </div>
            
            {/* Quick floating stat badge on image */}
            {settings.showHeroImageBadge !== false && (
              <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 bg-brand-black/90 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5 sm:gap-3 shadow-xl pointer-events-none">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 animate-ping shrink-0" />
                <div className="text-right">
                  <div className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                    {settings.heroImageBadgeTitle || (lang === 'ar' ? "خدمة متنقلة وسريعة" : "Fast & Mobile Service")}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                    {settings.heroImageBadgeSubtitle || (lang === 'ar' ? "نصلك أينما كنت بجدة" : "We reach you anywhere in Jeddah")}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute -top-5 -right-5 md:-top-10 md:-right-10 w-28 h-28 md:w-48 md:h-48 bg-brand-red/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-5 -left-5 md:-bottom-10 md:-left-10 w-36 h-36 md:w-64 md:h-64 bg-brand-red/15 blur-3xl rounded-full pointer-events-none" />
        </motion.div>
      </div>

      {/* Full Image Lightbox Modal */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsImageModalOpen(false)}
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-2.5 sm:p-6 cursor-zoom-out overscroll-contain"
          >
            {/* Top action bar */}
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 flex justify-between items-center z-20 pointer-events-auto">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/15 text-xs text-white/90 font-medium">
                <ZoomIn className="w-4 h-4 text-brand-red" />
                <span>{lang === 'ar' ? 'عرض الصورة كاملة' : 'Full Image View'}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageModalOpen(false);
                }}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-brand-red text-white flex items-center justify-center transition-all duration-200 border border-white/20 active:scale-95 shadow-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Full Image Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center"
            >
              <img
                src={settings.heroImageUrl || "/hero-custom.jpg"}
                alt="Dr. Fix Full"
                className="max-h-[82vh] max-w-full w-auto h-auto object-contain rounded-xl sm:rounded-2xl border border-white/15 shadow-2xl"
              />
            </motion.div>

            {/* Bottom helper tip */}
            <div className="absolute bottom-4 sm:bottom-6 text-center text-xs text-gray-400 pointer-events-none">
              {lang === 'ar' ? 'انقر في أي مكان للإغلاق' : 'Click anywhere to close'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const ServiceCard = React.memo(({ icon: Icon, title, description, onClick }: { icon: any, title: string, description: string, onClick?: () => void }) => {
  const { t, lang } = useLanguage();
  return (
    <motion.div 
      whileHover={{ 
        y: -15,
        rotateX: 8,
        rotateY: -8,
        scale: 1.05,
        transition: { type: "spring", stiffness: 400, damping: 20 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card p-4 md:p-5 group hover:border-brand-red/50 transition-all cursor-pointer relative overflow-hidden h-full flex flex-col whitespace-normal"
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-red/10 transition-colors" />
      
      <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center mb-2 group-hover:bg-brand-red transition-all duration-500 relative z-10 shadow-xl shadow-black/20">
        <Icon className="w-4 h-4 text-brand-red group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-base font-display font-black mb-2 italic uppercase tracking-tight relative z-10 group-hover:text-brand-red transition-colors whitespace-normal">{title}</h3>
      <p className="text-gray-400 text-[10px] leading-relaxed relative z-10 flex-1 whitespace-normal line-clamp-3">{description}</p>
      
      <div className={cn("mt-6 flex items-center gap-2 text-brand-red font-bold italic text-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all sm:group-hover:translate-x-2", lang === 'en' && "sm:group-hover:-translate-x-2")} style={{ transform: 'translateZ(15px)' }}>
        <span>{t.services.bookNow}</span>
        <ArrowLeft className={cn("w-3.5 h-3.5 transition-transform", lang === 'en' && "rotate-180")} />
      </div>
    </motion.div>
  );
});

const STATIC_SERVICES = [
  { id: 's1', title: 'خدمة من الباب للباب', titleEn: 'Door to Door Service', description: 'نستلم سيارتك من بيتك، نسوي الصيانة اللازمة، نغسلها، ونسلمها لك جاهزة.', descriptionEn: 'We pick up your car, perform maintenance, wash it, and deliver it back.', icon: 'Car' },
  { id: 's2', title: 'ميكانيكا عامة', titleEn: 'General Mechanics', description: 'إصلاح المحركات، الجيربوكس، وأنظمة التعليق بأعلى معايير الجودة.', descriptionEn: 'Engine, gearbox, and suspension repairs with high quality standards.', icon: 'Wrench' },
  { id: 's3', title: 'كهرباء وبرمجة', titleEn: 'Electrical & Programming', description: 'فحص كمبيوتر، برمجة مفاتيح، وإصلاح كافة المشاكل الكهربائية المعقدة.', descriptionEn: 'Computer diagnostics, key programming, and complex electrical repairs.', icon: 'Zap' },
  { id: 's4', title: 'تكييف وتبريد', titleEn: 'AC & Cooling', description: 'فحص تسريب الفريون، تعبئة فريون أصلي، وإصلاح الكمبروسر.', descriptionEn: 'Freon leak check, original freon refill, and compressor repair.', icon: 'Cpu' },
  { id: 's5', title: 'سمكرة وطلاء', titleEn: 'Body & Paint', description: 'إصلاح الصدمات وطلاء فرن حراري بأجود أنواع البويات العالمية.', descriptionEn: 'Accident repair and thermal oven painting with top-quality paints.', icon: 'Hammer' },
  { id: 's6', title: 'فحص قبل الشراء', titleEn: 'Pre-purchase Inspection', description: 'فحص شامل للسيارة (ميكانيكا، كهرباء، بودي) مع تقرير مفصل.', descriptionEn: 'Comprehensive car inspection (mechanics, electrical, body) with a detailed report.', icon: 'Shield' },
];

const Services = ({ onServiceSelect }: { onServiceSelect: (type: string) => void }) => {
  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_services');
      if (cached) return JSON.parse(cached);
    } catch {}
    return STATIC_SERVICES as any;
  });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'services'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: ServiceItem[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as ServiceItem);
      });
      setServices(results);
      try { localStorage.setItem('drfix_cached_services', JSON.stringify(results)); } catch {}
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
      
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Car, Wrench, Zap, Cpu, Hammer, Shield, Star, Tool: Wrench
    };
    return icons[iconName] || Wrench;
  };

  const allServices = React.useMemo(() => {
    const seen = new Set<string>();
    const merged: ServiceItem[] = [];

    services.forEach(s => {
      const key = s.id || s.title;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(s);
      }
    });

    STATIC_SERVICES.forEach(staticS => {
      const key = staticS.id || staticS.title;
      if (!seen.has(key) && !merged.some(m => m.title === staticS.title)) {
        seen.add(key);
        merged.push(staticS as any);
      }
    });

    return merged.length > 0 ? merged : (STATIC_SERVICES as any);
  }, [services]);

  if (loading) return null;

  return (
    <section id="services" className="py-10 sm:py-16 md:py-24 bg-brand-dark relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 md:mb-16 gap-4">
          <div className={cn("text-center md:text-right", lang === 'en' && "md:text-left")}>
            <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
              {t.services.title} <span className="text-brand-red">{t.services.titleAccent}</span>
            </h2>
            <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto md:mx-0 rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll(lang === 'ar' ? 'right' : 'left')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer"
              aria-label="Previous services"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll(lang === 'ar' ? 'left' : 'right')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer"
              aria-label="Next services"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          className={cn(
            "flex overflow-x-auto gap-4 md:gap-6 pb-8 no-scrollbar touch-pan-x select-none",
            isMouseDown ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {allServices.map((service) => (
            <div key={service.id} className="w-[85vw] max-w-[280px] sm:max-w-[320px] md:max-w-[340px] shrink-0 h-full">
              <ServiceCard 
                icon={getIcon(service.icon)} 
                title={lang === 'ar' ? service.title : (service.titleEn || service.title)} 
                description={lang === 'ar' ? service.description : (service.descriptionEn || service.description)}
                onClick={() => onServiceSelect(service.title)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

interface Offer {
  id: string;
  title: string;
  titleEn?: string;
  price: string;
  subtitle?: string;
  subtitleEn?: string;
  features: string[];
  featuresEn?: string[];
  icon: 'tag' | 'zap';
  active?: boolean;
  createdAt: Timestamp;
}

const STATIC_OFFERS: Offer[] = [];

const Offers = ({ onOfferSelect }: { onOfferSelect?: (offer: Offer) => void }) => {
  const [offers, setOffers] = useState<Offer[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_offers');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((o: any) => !o.id?.startsWith('off-'));
        }
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Offer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Offer;
        if (data.active !== false) { // Default to active if not specified
          results.push({ id: doc.id, ...data } as Offer);
        }
      });
      setOffers(results);
      try { localStorage.setItem('drfix_cached_offers', JSON.stringify(results)); } catch {}
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offers');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const allOffers = offers;

  if (loading || allOffers.length === 0) return null;

  const handleClaim = (offer: Offer) => {
    if (onOfferSelect) {
      onOfferSelect(offer);
    } else {
      navigate('/booking');
    }
  };

  return (
    <section id="offers" className="py-10 sm:py-16 md:py-24 bg-brand-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className={cn("text-center mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
            {t.offers.title} <span className="text-brand-red">{t.offers.titleAccent}</span>
          </h2>
          <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {allOffers.map((offer) => (
            <motion.div 
              key={offer.id}
              whileHover={{ 
                y: -15,
                rotateX: 5,
                rotateY: 5,
                scale: 1.03,
                transition: { type: "spring", stiffness: 400, damping: 20 }
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="glass-card p-5 sm:p-6 md:p-8 border-brand-red/20 relative overflow-hidden group h-full flex flex-col"
              style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-red shadow-[0_0_15px_rgba(255,51,51,0.5)]" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center group-hover:bg-brand-red transition-all duration-500 shadow-xl shadow-black/20">
                  {offer.icon === 'zap' ? <Zap className="w-6 h-6 text-brand-red group-hover:text-white transition-colors" /> : <Tag className="w-6 h-6 text-brand-red group-hover:text-white transition-colors" />}
                </div>
                <div className={cn("text-left", lang === 'ar' && "text-right")}>
                  <span className="text-3xl font-display font-black text-brand-red italic drop-shadow-2xl">{offer.price}</span>
                  {offer.subtitle && (
                    <div className="text-[10px] text-brand-red font-bold uppercase mt-1 tracking-widest">
                      {lang === 'ar' 
                        ? offer.subtitle 
                        : (offer.subtitleEn || offer.subtitle.replace(/ريال فقط/g, 'SAR only').replace(/ريال شامل/g, 'SAR inclusive').replace(/ريال/g, 'SAR'))}
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-display font-black mb-4 italic uppercase tracking-tight">
                {lang === 'ar' ? offer.title : (offer.titleEn || offer.title)}
              </h3>
              <ul className="space-y-3 text-gray-400 mb-8 flex-1">
                {(lang === 'ar' ? offer.features : (offer.featuresEn || offer.features)).map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-brand-red flex-shrink-0" />
                    <span className="text-xs">{feature}</span>
                  </li>
                ))}
              </ul>
              <button 
                type="button"
                onClick={() => handleClaim(offer)}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-display font-black italic text-center hover:bg-brand-red hover:border-brand-red transition-all group-hover:shadow-lg group-hover:shadow-brand-red/20 cursor-pointer active:scale-95" 
                style={{ transform: 'translateZ(25px)' }}
              >
                {t.offers.claimOffer}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const STATIC_GALLERY: GalleryItem[] = [
  { id: 'g1', title: 'صيانة محركات', titleEn: 'Engine Maintenance', imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000', category: 'صيانة', categoryEn: 'Maintenance', createdAt: Timestamp.now() },
  { id: 'g2', title: 'فحص كمبيوتر', titleEn: 'Computer Diagnostics', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000', category: 'صيانة', categoryEn: 'Diagnostics', createdAt: Timestamp.now() },
  { id: 'g3', title: 'تعديل بودي', titleEn: 'Body Repair', imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=1000', category: 'سمكرة', categoryEn: 'Bodywork', createdAt: Timestamp.now() },
  { id: 'g4', title: 'تلميع ساطع', titleEn: 'Deep Detailing', imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=1000', category: 'تلميع', categoryEn: 'Detailing', createdAt: Timestamp.now() },
];

const Gallery = () => {
  const [items, setItems] = useState<GalleryItem[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_gallery');
      if (cached) return JSON.parse(cached);
    } catch {}
    return STATIC_GALLERY;
  });
  const [loading, setLoading] = useState(false);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(8));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: GalleryItem[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as GalleryItem);
      });
      setItems(results);
      try { localStorage.setItem('drfix_cached_gallery', JSON.stringify(results)); } catch {}
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const allItems = React.useMemo(() => {
    const seen = new Set<string>();
    const merged: GalleryItem[] = [];

    items.forEach(item => {
      const key = item.id || item.title;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    });

    STATIC_GALLERY.forEach(staticItem => {
      const key = staticItem.id || staticItem.title;
      if (!seen.has(key) && !merged.some(item => item.title === staticItem.title)) {
        seen.add(key);
        merged.push(staticItem);
      }
    });

    return merged.length > 0 ? merged : STATIC_GALLERY;
  }, [items]);

  if (loading) return null;

  return (
    <section id="gallery" className="py-10 sm:py-16 md:py-24 bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className={cn("text-center mb-12 sm:mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-3 italic uppercase">
            {t.gallery.title} <span className="text-brand-red">{t.gallery.titleAccent}</span>
          </h2>
          <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
          <p className="mt-3 text-xs sm:text-sm text-gray-400/80 font-normal max-w-xl mx-auto tracking-wide leading-relaxed">
            {t.gallery.description}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {allItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true, margin: "-50px" }}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg"
            >
              <img 
                src={item.imageUrl} 
                alt={lang === 'ar' ? item.title : (item.titleEn || item.title)} 
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              {/* Permanent elegant gradient with visible title & category */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-3.5 sm:p-4 transition-all">
                <span className="text-brand-red text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">
                  {lang === 'ar' ? item.category : (item.categoryEn || item.category)}
                </span>
                <h4 className="text-white text-xs sm:text-sm font-bold line-clamp-2 leading-snug drop-shadow-md">
                  {lang === 'ar' ? item.title : (item.titleEn || item.title)}
                </h4>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BookingForm = ({ 
  selectedService, 
  settings,
  existingBookings = [],
  onOpenWorkflowGuide
}: { 
  selectedService?: string; 
  settings?: AppSettings;
  existingBookings?: MaintenanceRecord[];
  onOpenWorkflowGuide?: () => void;
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationHelp, setShowLocationHelp] = useState(false);

  // Booking Date Selection States
  const [selectedServiceDate, setSelectedServiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isImmediateBooking, setIsImmediateBooking] = useState<boolean>(false);
  
  const { t, lang } = useLanguage();
  const { customer, loginWithGoogle, logout, setIsAuthOpen } = useCustomer();
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BookingFormData>();

  const isGoogleUser = Boolean(customer && (customer.googleUid || customer.email));

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setGoogleAuthError(null);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setGoogleAuthError(res.error || (lang === 'ar' ? 'تعذر تسجيل الدخول عبر Google. يرجى المحاولة مجدداً.' : 'Google sign-in failed. Please try again.'));
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setGoogleAuthError(err?.message || (lang === 'ar' ? 'حدث خطأ أثناء الاتصال بحساب Google.' : 'Error connecting to Google.'));
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  React.useEffect(() => {
    if (customer) {
      if (customer.name) setValue('customerName', customer.name);
      if (customer.phone) setValue('phone', customer.phone);
    }
  }, [customer, setValue]);

  React.useEffect(() => {
    const handlePrefill = (e: any) => {
      if (e.detail) {
        if (e.detail.customerName) setValue('customerName', e.detail.customerName);
        if (e.detail.customerPhone) setValue('phone', e.detail.customerPhone);
        if (e.detail.carMake) setValue('carMake', e.detail.carMake);
        if (e.detail.carModel) setValue('carModel', e.detail.carModel);
        if (e.detail.carYear) setValue('carYear', e.detail.carYear);
      }
    };
    window.addEventListener('drfix_prefill_booking', handlePrefill);
    return () => window.removeEventListener('drfix_prefill_booking', handlePrefill);
  }, [setValue]);

  const normalizeServiceType = (val?: string): string => {
    if (!val) return '';
    const lower = val.toLowerCase();
    if (lower.includes('باب') || lower.includes('door')) return 'home-service';
    if (lower.includes('ميكانيك') || lower.includes('mechanic')) return 'mechanic';
    if (lower.includes('كهرب') || lower.includes('electric')) return 'electric';
    if (lower.includes('برمج') || lower.includes('program')) return 'programming';
    if (lower.includes('سمكر') || lower.includes('بودي') || lower.includes('body') || lower.includes('طلاء') || lower.includes('دهان')) return 'bodywork';
    if (lower.includes('تكييف') || lower.includes('تبريد') || lower.includes('فريون') || lower.includes('ac')) return 'ac';
    if (lower.includes('فرامل') || lower.includes('فحمات') || lower.includes('brake')) return 'brakes';
    if (lower.includes('فحص') || lower.includes('شراء') || lower.includes('inspect')) return 'inspection';
    if (lower.includes('كفر') || lower.includes('إطار') || lower.includes('tire')) return 'tires';
    if (lower.includes('بطار') || lower.includes('battery')) return 'battery';
    if (lower.includes('تلميع') || lower.includes('detail')) return 'detailing';
    if (lower.includes('دور') || lower.includes('صيان') || lower.includes('maint')) return 'maintenance';
    return val;
  };

  React.useEffect(() => {
    if (selectedService) {
      const key = normalizeServiceType(selectedService);
      setValue('serviceType', key);
      if (selectedService.includes('عرض:') || selectedService.includes('باقة')) {
        setValue('description', `طلب الاستفادة من ${selectedService}`);
      }
    }
  }, [selectedService, setValue]);

  // Reverse geocode lat/long to readable Saudi district or city name
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ar`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        const addr = json.address || {};
        const district = addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || addr.district || '';
        const city = addr.city || addr.town || addr.municipality || 'جدة';
        if (district) {
          return `${city} - حي ${district.replace(/^حي\s+/, '')}`;
        } else if (json.display_name) {
          return json.display_name.split(',').slice(0, 2).join(' - ');
        }
      }
    } catch {}
    return '';
  };

  const applyLocationSuccess = async (pos: GeolocationPosition) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    setCoords({ latitude: lat, longitude: lon });
    setLocationError(null);
    setShowLocationHelp(false);

    const prettyAddress = await reverseGeocode(lat, lon);
    if (prettyAddress) {
      setLocationName(prettyAddress);
    } else {
      setLocationName(lang === 'ar' ? `موقع محدد عبر GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})` : `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
    }
    setLocating(false);
  };

  // Resilient multi-tier geolocation specifically optimized for iPhone / iOS Safari
  const handleGetLocation = () => {
    setLocationError(null);
    const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    if (!navigator || !navigator.geolocation) {
      setLocationError(lang === 'ar' ? 'خاصية تحديد الموقع غير مدعومة في متصفحك الحالي.' : 'Geolocation is not supported by your browser.');
      setShowLocationHelp(true);
      return;
    }

    if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setLocationError(lang === 'ar' ? 'يتطلب تحديد الموقع اتصالاً آمناً (HTTPS).' : 'Location requires a secure HTTPS connection.');
      setShowLocationHelp(true);
      return;
    }

    setLocating(true);

    // Tier 1: Try GPS with 8s timeout and allow recent cache (60s)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocationSuccess(pos);
      },
      (err) => {
        console.warn('Geolocation Tier 1 error:', err);

        // If user actively denied permission on iOS/Safari, guide them on how to unblock
        if (err.code === 1) { // PERMISSION_DENIED
          setLocating(false);
          const msg = isIOS
            ? (lang === 'ar' 
                ? 'تم رفض إذن الموقع في متصفح سفاري (Safari). لتفعيله: اضغط على رمز (aA) أو القفل بجانب شريط العنوان > إعدادات موقع الويب > الموقع > السماح.' 
                : 'Location denied in Safari. Tap (aA) next to address bar > Website Settings > Location > Allow.')
            : (lang === 'ar' 
                ? 'تم رفض إذن الوصول للموقع في متصفحك. يرجى تفعيل إذن الموقع من شريط العنوان أو كتابة الحي يدوياً.' 
                : 'Location access denied. Please allow location in browser or type district manually.');
          setLocationError(msg);
          setShowLocationHelp(true);
          return;
        }

        // Tier 2 Fallback: If TIMEOUT (code 3) or POSITION_UNAVAILABLE (code 2), retry with low accuracy & longer cache!
        // This resolves the classic iPhone Safari timeout indoors by using Wi-Fi / Cell tower triangulation.
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            applyLocationSuccess(fallbackPos);
          },
          (fallbackErr) => {
            console.warn('Geolocation Tier 2 error:', fallbackErr);
            setLocating(false);
            if (fallbackErr.code === 1) {
              const msg = isIOS
                ? (lang === 'ar' 
                    ? 'تم رفض إذن الموقع. لتفعيله: اضغط على (aA) بجانب شريط العنوان > إعدادات موقع الويب > الموقع > السماح.' 
                    : 'Location denied. Tap (aA) > Website Settings > Location > Allow.')
                : (lang === 'ar' ? 'تم رفض إذن الموقع في المتصفح.' : 'Location permission denied.');
              setLocationError(msg);
            } else {
              const msg = lang === 'ar'
                ? 'تعذر التقاط إشارة GPS بدقة حالياً. يمكنك كتابة الحي أو العنوان في الخانة أدناه بسهولة.'
                : 'Could not acquire GPS signal. You can type your district or address below.';
              setLocationError(msg);
            }
            setShowLocationHelp(true);
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000 // 5 minutes cache
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000 // 1 minute cache
      }
    );
  };

  const onSubmit = async (data: BookingFormData) => {
    if (isLoading) return;

    const rawPhone = data.phone || customer?.phone || '';
    const cleanPhone = unifySaudiPhone(normalizeCredentialsInput(rawPhone)) || normalizeCredentialsInput(rawPhone);

    // Validate phone number
    if (!cleanPhone || cleanPhone.length < 8) {
      setBookingError(
        lang === 'ar'
          ? 'يرجى إدخال رقم جوال صحيح للتواصل وتأكيد موعد استلام السيارة.'
          : 'Please enter a valid mobile number.'
      );
      return;
    }

    setIsLoading(true);
    setBookingError(null);

    const serviceLabels: Record<string, string> = {
      'home-service': t.booking.services.doorToDoor,
      'mechanic': t.booking.services.mechanic,
      'electric': t.booking.services.electric,
      'programming': t.booking.services.programming,
      'bodywork': t.booking.services.bodywork,
      'maintenance': t.booking.services.maintenance,
      'ac': t.booking.services.ac,
      'brakes': t.booking.services.brakes,
      'inspection': t.booking.services.inspection,
      'tires': t.booking.services.tires,
      'battery': t.booking.services.battery,
      'detailing': t.booking.services.detailing,
      'other': t.booking.services.other
    };

    const serviceTitle = serviceLabels[data.serviceType] || data.serviceType || 'صيانة متنقلة';
    const uniqueBookingId = `DRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Write strictly to Firebase Firestore first
      const resolvedCustomerId = customer?.id || customer?.googleUid || `cust_${cleanPhone.replace(/\D/g, '') || Date.now()}`;
      const resolvedCustomerName = customer?.name || data.customerName?.trim() || 'عميل كريم';
      const resolvedCustomerEmail = customer?.email || '';
      const resolvedGoogleUid = customer?.googleUid || '';
      const normalizedMake = cleanCarMake(data.carMake, data.carModel);
      const normalizedYear = cleanCarYear(data.carYear, data.carModel) || (data.carYear || '').toString().trim() || new Date().getFullYear().toString();
      const normalizedPlate = ((data as any).plateNumber || '').trim();
      const normalizedModel = cleanCarModel(normalizedMake, data.carModel.trim(), normalizedYear);

      const bookingDocData = {
        bookingId: uniqueBookingId,
        customerId: resolvedCustomerId,
        customerEmail: resolvedCustomerEmail,
        customerGoogleUid: resolvedGoogleUid,
        customerPhone: cleanPhone,
        customerName: resolvedCustomerName,
        carMake: normalizedMake,
        carModel: normalizedModel || data.carModel.trim(),
        carYear: normalizedYear,
        plateNumber: normalizedPlate,
        serviceType: serviceTitle,
        notes: data.description.trim(),
        location: locationName || 'جدة',
        coordinates: coords || null,
        status: 'new',
        cost: 0,
        source: 'website',
        createdAt: serverTimestamp(),
        serviceDate: selectedServiceDate,
        serviceTimeSlot: selectedTimeSlot,
        isImmediate: isImmediateBooking
      };

      await addDoc(collection(db, 'maintenance'), bookingDocData);
      
      // 1b. Automatically open/update customer file in Firestore (توحيد كرت وملف العميل بدون أي تكرار)
      try {
        const carInfo = {
          make: normalizedMake,
          model: normalizedModel,
          year: normalizedYear
        };

        const carItem = {
          id: 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          make: normalizedMake,
          model: normalizedModel,
          year: normalizedYear,
          plateNumber: normalizedPlate,
          color: '',
          addedAt: new Date().toISOString()
        };

        const carSignature = getCarSignature(normalizedMake, normalizedModel, normalizedPlate, normalizedYear);

        // 1. Identify canonical master document ID
        // If customer is logged in, their Google UID / customer.id is the master ID; otherwise cleanPhone
        const masterDocId = customer?.id || customer?.googleUid || cleanPhone;
        const masterRef = doc(db, 'customers', masterDocId);

        // 2. Gather all related candidate documents to prevent and clean duplicates
        const candidateDocs: { id: string; ref: any; data: any }[] = [];
        const seenCandidateIds = new Set<string>();

        // Check master doc
        try {
          const masterSnap = await getDoc(masterRef);
          if (masterSnap.exists()) {
            seenCandidateIds.add(masterSnap.id);
            candidateDocs.push({ id: masterSnap.id, ref: masterRef, data: masterSnap.data() });
          }
        } catch (e) {}

        // Query by phone
        try {
          const phoneSnap = await getDocs(query(collection(db, 'customers'), where('phone', '==', cleanPhone)));
          phoneSnap.forEach(d => {
            if (!seenCandidateIds.has(d.id)) {
              seenCandidateIds.add(d.id);
              candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() });
            }
          });
        } catch (e) {}

        // Query by googleUid if known
        if (customer?.googleUid) {
          try {
            const gSnap = await getDocs(query(collection(db, 'customers'), where('googleUid', '==', customer.googleUid)));
            gSnap.forEach(d => {
              if (!seenCandidateIds.has(d.id)) {
                seenCandidateIds.add(d.id);
                candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() });
              }
            });
          } catch (e) {}
        }

        // Query by email if known
        if (customer?.email) {
          try {
            const eSnap = await getDocs(query(collection(db, 'customers'), where('email', '==', customer.email)));
            eSnap.forEach(d => {
              if (!seenCandidateIds.has(d.id)) {
                seenCandidateIds.add(d.id);
                candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() });
              }
            });
          } catch (e) {}
        }

        // 3. Merge all vehicles, cars, and visits from all candidates
        let allCars: any[] = [];
        let allVehicles: any[] = [];
        let allRemoved: string[] = [];
        let totalVisits = 0;
        let totalSpent = 0;
        let bestName = resolvedCustomerName || customer?.name || '';
        let bestEmail = customer?.email || '';
        let bestGoogleUid = customer?.googleUid || (customer?.id !== cleanPhone ? customer?.id : '');
        let existingNotes = '';

        candidateDocs.forEach(c => {
          const d = c.data;
          if (Array.isArray(d.cars)) allCars.push(...d.cars);
          if (Array.isArray(d.vehicles)) allVehicles.push(...d.vehicles);
          if (Array.isArray(d.removedCars)) allRemoved.push(...d.removedCars);
          totalVisits = Math.max(totalVisits, Number(d.totalVisits || 0));
          totalSpent = Math.max(totalSpent, Number(d.totalSpent || 0));
          if (d.name && !bestName && d.name !== 'عميل كريم' && d.name !== 'عميل') bestName = d.name;
          if (d.email && !bestEmail) bestEmail = d.email;
          if (d.googleUid && !bestGoogleUid) bestGoogleUid = d.googleUid;
          if (d.notes && !existingNotes.includes(d.notes)) {
            existingNotes = existingNotes ? `${existingNotes}\n${d.notes}` : d.notes;
          }
        });

        // Deduplicate vehicles
        const hasCarInVehicles = allVehicles.some(v => 
          areCarsEqual(
            { make: v.make || '', model: v.model || '', year: v.year || '' }, 
            carItem
          )
        );
        const updatedVehicles = hasCarInVehicles ? allVehicles : [...allVehicles, carInfo];

        // Deduplicate cars
        const alreadyInCars = allCars.some(c => areCarsEqual(c, carItem));
        const wasExplicitlyRemoved = allRemoved.includes(carSignature);
        let updatedCars = deduplicateCarsList(allCars, allRemoved);
        if (!alreadyInCars && !wasExplicitlyRemoved) {
          updatedCars = deduplicateCarsList([...updatedCars, carItem], allRemoved);
        }

        const newVisits = totalVisits + 1;
        const finalName = bestName || resolvedCustomerName || 'عميل كريم';

        // 4. Save to the single canonical master document
        await setDoc(masterRef, {
          id: masterDocId,
          name: finalName,
          phone: cleanPhone,
          email: bestEmail || '',
          googleUid: bestGoogleUid || '',
          city: 'جدة',
          address: locationName || 'جدة',
          vehicles: updatedVehicles,
          cars: updatedCars,
          totalVisits: newVisits,
          totalSpent: totalSpent,
          lastVisitDate: new Date().toISOString(),
          status: newVisits >= 3 ? 'vip' : 'regular',
          notes: existingNotes ? `${existingNotes}\n• حجز جديد: ${serviceTitle}` : `حجز خدمة: ${serviceTitle}`,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 5. Clean up any redundant duplicate docs from old bookings so customer list has NO duplicates
        for (const candidate of candidateDocs) {
          if (candidate.id !== masterDocId) {
            try {
              await deleteDoc(candidate.ref);
              console.log(`Cleaned redundant customer document: ${candidate.id}`);
            } catch (err) {
              console.warn('Could not remove duplicate doc:', err);
            }
          }
        }

        // Sync localStorage session if active customer matches, or auto-activate session for the booking customer
        try {
          const savedSession = localStorage.getItem('drfix_customer_session');
          if (savedSession) {
            const sObj = JSON.parse(savedSession);
            if (sObj.id === masterDocId || sObj.phone === cleanPhone) {
              sObj.cars = updatedCars;
              sObj.phone = cleanPhone;
              localStorage.setItem('drfix_customer_session', JSON.stringify(sObj));
              localStorage.removeItem('drfix_customer_logged_out');
            }
          } else {
            // Auto-login newly booking customer so they can view their card & cars immediately
            const activeProfile = {
              id: masterDocId,
              name: finalName,
              phone: cleanPhone,
              cars: updatedCars,
              totalVisits: 1,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem('drfix_customer_session', JSON.stringify(activeProfile));
            localStorage.removeItem('drfix_customer_logged_out');
          }
        } catch {}

        // Dispatch browser event to instantly update "My Cars" for logged-in customer
        window.dispatchEvent(new CustomEvent('drfix_customer_cars_updated', {
          detail: { phone: cleanPhone, car: carItem }
        }));
      } catch (custFileErr) {
        console.warn('Error opening/updating customer file on booking:', custFileErr);
      }

      // Save phone to localStorage for auto-tracking
      localStorage.setItem('drfix_customer_phone', cleanPhone);
      setConfirmedBookingId(uniqueBookingId);

      // 2. Trigger Server-side Telegram Notification & Webhook
      let serverNotified = false;
      try {
        const notifyRes = await fetch('/api/notify-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: uniqueBookingId,
            customerPhone: cleanPhone,
            customerName: resolvedCustomerName,
            carModel: `${data.carMake.trim()} ${data.carModel.trim()} (${data.carYear.trim()})`,
            serviceType: serviceTitle,
            notes: data.description.trim(),
            location: locationName || 'جدة',
            coordinates: coords,
            serviceDate: selectedServiceDate,
            serviceTimeSlot: selectedTimeSlot,
            isImmediate: isImmediateBooking
          })
        });
        if (notifyRes.ok) {
          const resJson = await notifyRes.json();
          if (resJson && resJson.ok && resJson.result && resJson.result.ok) {
            serverNotified = true;
          }
        }
      } catch (notifyErr) {
        console.warn('API notification error (will fallback to direct if configured):', notifyErr);
      }

      // Fallback Direct Telegram only if server-side notification was not delivered
      if (!serverNotified) {
        let intPhone = cleanPhone.replace(/\D/g, '');
        if (intPhone.startsWith('00966')) {
          intPhone = intPhone.slice(2);
        } else if (intPhone.startsWith('05')) {
          intPhone = '966' + intPhone.slice(1);
        } else if (intPhone.startsWith('5') && intPhone.length === 9) {
          intPhone = '966' + intPhone;
        } else if (intPhone.startsWith('0') && !intPhone.startsWith('966')) {
          intPhone = '966' + intPhone.replace(/^0+/, '');
        } else if (!intPhone.startsWith('966') && intPhone.length === 9) {
          intPhone = '966' + intPhone;
        }
        const waLink = `https://wa.me/${intPhone}`;
        const mapsUrl = coords 
          ? `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((locationName || 'جدة') + ' جدة')}`;

        const safeBkId = escapeTelegramHtml(uniqueBookingId);
        const safePhone = escapeTelegramHtml(cleanPhone);
        const safeCar = escapeTelegramHtml(`${data.carMake} ${data.carModel} (${data.carYear})`);
        const safeService = escapeTelegramHtml(serviceTitle);
        const safeLoc = escapeTelegramHtml(locationName || 'جدة');
        const safeDesc = data.description ? escapeTelegramHtml(data.description) : 'بدون تفاصيل إضافية';
        const safeTime = escapeTelegramHtml(new Date().toLocaleTimeString('ar-SA'));
        const safeSlot = isImmediateBooking ? '⚡ خدمة فورية عاجلة' : escapeTelegramHtml(selectedTimeSlot ? `${selectedServiceDate} (${selectedTimeSlot})` : selectedServiceDate);

        const tgText = `🔔 <b>حجز جديد مؤكد في DR.FIX!</b> 🚗⚡\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🔖 <b>رقم الحجز:</b> <code>${safeBkId}</code>\n` +
          `👤 <b>العميل:</b> <code>${safePhone}</code>\n` +
          `🚘 <b>السيارة:</b> ${safeCar}\n` +
          `🔧 <b>الخدمة:</b> ${safeService}\n` +
          `📅 <b>الموعد المطلوب:</b> ${safeSlot}\n` +
          `📍 <b>الموقع:</b> ${safeLoc}\n` +
          `📝 <b>الوصف:</b> ${safeDesc}\n` +
          `⏰ <b>وقت التسجيل:</b> ${safeTime}\n` +
          `━━━━━━━━━━━━━━━━━━`;

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-67s7t2ibowkgamyonguwv5-138630195296.europe-west2.run.app';

        const inline_keyboard = [
          [
            { text: '📍 موقع العميل', url: mapsUrl },
            { text: '💬 فتح واتساب العميل الآن', url: waLink }
          ],
          [
            { text: '✅ قبول الطلب', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(uniqueBookingId)}&status=accepted` },
            { text: '❌ رفض الطلب', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(uniqueBookingId)}&status=cancelled` }
          ],
          [
            { text: '🚗 الفني بالطريق', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(uniqueBookingId)}&status=on_the_way` },
            { text: '🏁 تم الإنجاز', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(uniqueBookingId)}&status=completed` }
          ]
        ];

        sendTelegramNotification(
          tgText, 
          settings?.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN, 
          settings?.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID,
          { inline_keyboard }
        );
      }

      // Track conversion in Google Analytics 4 (G-63DGX8ECEL)
      try {
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'generate_lead', {
            event_category: 'Service Booking',
            event_label: serviceTitle,
            booking_id: uniqueBookingId,
            car: `${data.carMake} ${data.carModel}`,
            service: serviceTitle
          });
        }
      } catch (gtagErr) {
        console.warn('GA4 event tracking notice:', gtagErr);
      }

      // 3. Prepare WhatsApp Message with Unique Booking ID
      const messageText = lang === 'ar' ? (
        `*طلب حجز مؤكد من موقع DR.FIX*\n` +
        `🔖 *رقم الحجز:* ${uniqueBookingId}\n\n` +
        `*ماركة السيارة:* ${data.carMake}\n` +
        `*موديل السيارة:* ${data.carModel}\n` +
        `*سنة الصنع:* ${data.carYear}\n` +
        `*نوع الخدمة:* ${serviceTitle}\n` +
        `*وصف المشكلة:* ${data.description}\n` +
        `*رقم الجوال:* ${cleanPhone}\n` +
        (coords ? `*الموقع الجغرافي:* https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : (locationName.trim() ? `*الموقع/الحي:* ${locationName.trim()}` : `*المدينة:* جدة`))
      ) : (
        `*Confirmed Booking Request from DR.FIX*\n` +
        `🔖 *Booking ID:* ${uniqueBookingId}\n\n` +
        `*Car Make:* ${data.carMake}\n` +
        `*Car Model:* ${data.carModel}\n` +
        `*Year:* ${data.carYear}\n` +
        `*Service:* ${serviceTitle}\n` +
        `*Issue:* ${data.description}\n` +
        `*Phone:* ${cleanPhone}\n` +
        (coords ? `*Location:* https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : (locationName.trim() ? `*Location/District:* ${locationName.trim()}` : `*City:* Jeddah`))
      );

      // 4. Show Success & Redirect to WhatsApp
      setTimeout(() => {
        setIsLoading(false);
        setIsSubmitted(true);

        const targetPhone = (settings?.whatsapp || '966546870807').replace(/[^0-9]/g, '');
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
          setIsSubmitted(false);
          reset();
          setCoords(null);
          setLocationName('');
          setLocationError(null);
          setShowLocationHelp(false);
        }, 8000);
      }, 1500);

    } catch (dbError) {
      console.error('Failed to write booking to Firebase:', dbError);
      setIsLoading(false);
      setBookingError(lang === 'ar' 
        ? 'عذراً، حدث خطأ أثناء حفظ الحجز في قاعدة البيانات. يُرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.' 
        : 'An error occurred while saving your booking. Please check your connection and try again.');
    }
  };

  return (
    <section id="booking" className="py-8 sm:py-14 md:py-24 pb-32 sm:pb-36 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
        <motion.div 
          whileHover={{ rotateX: 1, rotateY: -1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-4 sm:p-6 md:p-10 lg:p-12 border-brand-red/20 shadow-2xl relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Back to Home Link */}
          <div className="mb-6 pb-4 border-b border-white/10 flex items-center justify-start">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs sm:text-sm font-bold transition-all border border-white/10 cursor-pointer shadow-sm group"
            >
              {lang === 'ar' ? (
                <>
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-brand-red" />
                  <span>العودة للرئيسية</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-brand-red" />
                  <span>Back to Home</span>
                </>
              )}
            </Link>
          </div>

          <div className={cn("text-center mb-10 md:mb-12", lang === 'en' && "md:text-left")}>
            <h2 className="text-2xl md:text-3xl font-display font-black mb-4 italic">
              {t.booking.title} <span className="text-brand-red">{t.booking.titleAccent}</span>
            </h2>
            <p className="text-gray-400">{t.booking.description}</p>
            {onOpenWorkflowGuide && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onOpenWorkflowGuide}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/35 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <span>📖 شرح خطوات طلب وفحص الصيانة للعميل (خطوة بخطوة)</span>
                </button>
              </div>
            )}
          </div>

          {bookingError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p>{bookingError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8 animate-fadeIn">
            {/* Google Authentication Status / Optional Quick Login Bar */}
            {isGoogleUser && customer ? (
              <div className="p-4 rounded-2xl bg-black/60 border border-brand-red/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {customer?.photoURL ? (
                    <img src={customer.photoURL} alt={customer.name} className="w-11 h-11 rounded-full border-2 border-brand-red/40 object-cover shadow-sm shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-brand-red/20 border-2 border-brand-red/40 flex items-center justify-center text-brand-red font-black text-base shrink-0">
                      {customer?.name?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="text-right flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{customer?.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-brand-red" />
                        {lang === 'ar' ? 'مسجل وموثق بحساب Google' : 'Verified Google Account'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono block truncate">{customer?.email || customer?.phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full sm:w-auto text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تبديل الحساب' : 'Switch Account'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-900/90 via-black/80 to-neutral-900/90 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3 text-right">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>{lang === 'ar' ? 'تسجيل وتوثيق سريع بحساب Google' : 'Sign in with Google'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-red/20 text-brand-red font-bold">
                        {lang === 'ar' ? 'اختياري وموصى به' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {lang === 'ar' 
                        ? 'لحفظ سجل سياراتك وتتبع الفني المباشر بالخريطة، أو عَبّئ بيانات الموعد مباشرة بالأسفل.' 
                        : 'Enables live tracking & vehicle history, or fill form directly below.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSigningIn}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md active:scale-95"
                >
                  {isGoogleSigningIn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>{lang === 'ar' ? 'جارٍ التحقق...' : 'Signing in...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'ar' ? 'دخول سريع بـ Google' : 'Quick Sign in'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {customer && customer.cars && customer.cars.length > 0 && (
              <div className="p-3.5 bg-brand-red/10 border border-brand-red/25 rounded-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-brand-red" />
                    سياراتك المحفوظة في حسابك:
                  </span>
                  <span className="text-[10px] text-gray-400">انقر لتعبئة بيانات السيارة فوراً</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.cars.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setValue('carMake', c.make);
                        setValue('carModel', c.model);
                        setValue('carYear', c.year);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-brand-red border border-white/10 hover:border-brand-red text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group"
                    >
                      <span>🚗 {c.make} {c.model} ({c.year})</span>
                      {c.plateNumber && <span className="text-[10px] text-gray-400 group-hover:text-white font-mono">[{c.plateNumber}]</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.carMake}</label>
                <input 
                  {...register('carMake', { required: true })}
                  placeholder={t.booking.carMakePlaceholder}
                  autoComplete="organization"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all text-sm md:text-base text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.carModel}</label>
                <input 
                  {...register('carModel', { required: true })}
                  placeholder={t.booking.carModelPlaceholder}
                  autoComplete="model"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all text-sm md:text-base text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.carYear}</label>
                <input 
                  {...register('carYear', { required: true })}
                  placeholder={t.booking.carYearPlaceholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all text-sm md:text-base text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.serviceType}</label>
              <select 
                {...register('serviceType', { required: true })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all appearance-none text-sm md:text-base text-white"
              >
                <option value="" className="bg-brand-black">{t.booking.selectService}</option>
                {selectedService && !['home-service', 'mechanic', 'electric', 'programming', 'bodywork', 'maintenance', 'ac', 'brakes', 'inspection', 'tires', 'battery', 'detailing', 'other'].includes(normalizeServiceType(selectedService)) && (
                  <option value={normalizeServiceType(selectedService)} className="bg-brand-black text-brand-red font-bold">⭐ {selectedService}</option>
                )}
                <option value="home-service" className="bg-brand-black">{t.booking.services.doorToDoor}</option>
                <option value="mechanic" className="bg-brand-black">{t.booking.services.mechanic}</option>
                <option value="electric" className="bg-brand-black">{t.booking.services.electric}</option>
                <option value="programming" className="bg-brand-black">{t.booking.services.programming}</option>
                <option value="bodywork" className="bg-brand-black">{t.booking.services.bodywork}</option>
                <option value="maintenance" className="bg-brand-black">{t.booking.services.maintenance}</option>
                <option value="ac" className="bg-brand-black">{t.booking.services.ac}</option>
                <option value="brakes" className="bg-brand-black">{t.booking.services.brakes}</option>
                <option value="inspection" className="bg-brand-black">{t.booking.services.inspection}</option>
                <option value="tires" className="bg-brand-black">{t.booking.services.tires}</option>
                <option value="battery" className="bg-brand-black">{t.booking.services.battery}</option>
                <option value="detailing" className="bg-brand-black">{t.booking.services.detailing}</option>
                <option value="other" className="bg-brand-black">{t.booking.services.other}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.problemDesc}</label>
              <textarea 
                {...register('description', { required: true })}
                rows={3}
                placeholder={t.booking.problemDescPlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all resize-none text-sm md:text-base text-white"
              />
            </div>

            {/* Interactive Location Picker with GPS, District selector and Map */}
            <InteractiveLocationPicker
              coords={coords}
              locationName={locationName}
              locating={locating}
              locationError={locationError}
              onGetLocation={handleGetLocation}
              onClearLocation={() => {
                setCoords(null);
                setLocationName('');
                setLocationError(null);
              }}
              onLocationNameChange={(val) => setLocationName(val)}
              onSelectDistrict={(district) => {
                setCoords({ latitude: district.lat, longitude: district.lng });
                setLocationName(lang === 'ar' ? `جدة - حي ${district.nameAr}` : `Jeddah - ${district.nameEn} District`);
                setLocationError(null);
              }}
              lang={lang}
            />

            {/* Booking Date & Time Slots with Available Slots indicator */}
            <BookingTimeSlotPicker
              selectedDate={selectedServiceDate}
              selectedTimeSlot={selectedTimeSlot}
              selectedSlot={selectedTimeSlot}
              isImmediate={isImmediateBooking}
              existingBookings={existingBookings}
              onDateChange={(date) => setSelectedServiceDate(date)}
              onSelectDate={(date) => setSelectedServiceDate(date)}
              onTimeSlotChange={(slot) => setSelectedTimeSlot(slot)}
              onSelectSlot={(slot) => setSelectedTimeSlot(slot)}
              onImmediateChange={(immediate) => setIsImmediateBooking(immediate)}
              onToggleImmediate={(immediate) => setIsImmediateBooking(immediate)}
              lang={lang}
            />

            <div className="p-4 rounded-xl bg-brand-red/5 border border-brand-red/20 flex items-start gap-3">
              <Camera className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                <strong className="text-brand-red block mb-1">{t.booking.cameraNoteBold}</strong>
                {t.booking.cameraNoteText}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.customerName}</label>
                <input 
                  {...register('customerName')}
                  placeholder={t.booking.customerNamePlaceholder}
                  autoComplete="name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all text-sm md:text-base text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs md:text-sm font-display font-bold text-gray-400 uppercase tracking-wider">{t.booking.phone}</label>
                <input 
                  {...register('phone', { required: true })}
                  type="tel"
                  placeholder={t.booking.phonePlaceholder}
                  autoComplete="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all text-sm md:text-base text-white"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-brand-red text-white font-display font-black rounded-xl red-glow-hover transition-all text-lg md:text-xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (lang === 'ar' ? 'جارٍ تسجيل الحجز...' : 'Processing...') : t.booking.confirm}
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </form>

          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-brand-black/95 flex flex-col items-center justify-center text-center p-8 z-50 rounded-2xl"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 text-brand-red mb-6"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
                  </svg>
                </motion.div>
                <h3 className="text-2xl font-black italic">{t.booking.processing}</h3>
                <p className="text-gray-400 mt-2">{t.booking.wait}</p>
                <p className="text-xs text-brand-red mt-4 font-bold">{lang === 'ar' ? 'جاري تأكيد حجزك وإرسال الإشعار للفني المختص...' : 'Confirming your booking and dispatching...'}</p>
              </motion.div>
            )}

            {isSubmitted && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 bg-brand-black/95 flex flex-col items-center justify-center text-center p-8 z-50 rounded-2xl"
              >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black mb-2 italic">{t.booking.successTitle}</h3>
                {confirmedBookingId && (
                  <div className="my-3 px-4 py-2 bg-brand-red/10 border border-brand-red/30 rounded-xl font-mono text-brand-red font-bold text-lg">
                    {lang === 'ar' ? `رقم الحجز: ${confirmedBookingId}` : `Booking ID: ${confirmedBookingId}`}
                  </div>
                )}
                <p className="text-gray-300 text-base max-w-md">{t.booking.successDesc}</p>
                <p className="text-xs text-gray-400 mt-3">
                  {lang === 'ar' ? 'تم إرسال طلبك بنجاح وجاري تجهيز الخدمة فوراً.' : 'Your request was successfully submitted and is being processed.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${(settings.whatsapp || '966546870807').replace(/\+/g, '').replace(/[^0-9]/g, '')}&text=${encodeURIComponent(lang === 'ar' ? `السلام عليكم، حجزت صيانة سيارة عبر الموقع برقم #${confirmedBookingId || ''}` : `Hello, I booked a car service appointment #${confirmedBookingId || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تأكيد عبر واتساب' : 'Confirm via WhatsApp'}</span>
                  </a>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      window.dispatchEvent(new CustomEvent('drfix_open_portal'));
                    }}
                    className="px-5 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-brand-red/20 cursor-pointer transition-all active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'متابعة حالة الحجز في كرت الصيانة' : 'Track Booking in Service Card'}</span>
                  </button>
                  <Link
                    to="/"
                    onClick={() => setIsSubmitted(false)}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{lang === 'ar' ? 'العودة للرئيسية 🏠' : 'Back to Home 🏠'}</span>
                  </Link>
                  <button 
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    {t.booking.close}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

const TestimonialCard = React.memo(({ name, comment, rating, reply }: { name?: string, comment?: string, rating?: number, reply?: string }) => {
  const { t, lang } = useLanguage();
  const safeName = name && name.trim() ? name.trim() : (lang === 'ar' ? 'عميل معتمد' : 'Customer');
  const initial = safeName.charAt(0).toUpperCase();
  const safeRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : 5;
  const rawComment = comment?.trim() || '';

  return (
    <div 
      className="glass-card relative p-4 rounded-2xl border border-white/10 hover:border-brand-red/40 transition-all duration-300 shadow-md flex flex-col justify-between overflow-hidden whitespace-normal break-words w-full box-border h-[195px] sm:h-[205px] bg-gradient-to-b from-white/[0.04] to-black/40 group select-none"
    >
      <Quote className="w-6 h-6 text-white/[0.03] group-hover:text-brand-red/[0.08] transition-colors absolute top-3 left-3 pointer-events-none rotate-180" />

      <div className="relative z-10 flex-1 min-h-0 flex flex-col">
        {/* Author Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-brand-red/30 to-brand-red/10 border border-brand-red/30 flex items-center justify-center font-bold text-brand-red text-xs shrink-0 shadow-inner">
              {initial}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-white truncate block max-w-[120px] sm:max-w-[150px]">{safeName}</span>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                <CheckCircle2 className="w-2.5 h-2.5 text-brand-red shrink-0" />
                <span>{lang === 'ar' ? 'عميل موثق' : 'Verified'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-0.5 shrink-0 bg-white/[0.03] px-1.5 py-0.5 rounded-md border border-white/5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={cn("w-2.5 h-2.5 sm:w-3 sm:h-3", i < safeRating ? "text-brand-red fill-brand-red" : "text-gray-700")} />
            ))}
          </div>
        </div>

        {/* Comment Text */}
        <p className="text-gray-200 text-xs leading-relaxed break-words font-sans line-clamp-3 flex-1 overflow-hidden mt-0.5">
          "{rawComment || (lang === 'ar' ? 'خدمة صيانة وفحص ممتازة، شكراً لفريق دكتور فيكس.' : 'Great service, highly recommended.')}"
        </p>
      </div>

      {/* Reply or Footer */}
      <div className="relative z-10 mt-2 pt-2 border-t border-white/5 shrink-0">
        {reply ? (
          <div className={cn(
            "bg-brand-red/10 px-2.5 py-1.5 rounded-lg border-brand-red text-xs transition-all",
            lang === 'ar' ? "border-r-2" : "border-l-2"
          )}>
            <div className="text-[9px] font-bold text-brand-red uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
              <span>{lang === 'ar' ? 'رد الإدارة' : t.testimonials.adminReply}</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-snug break-words font-sans line-clamp-1">
              {reply}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="text-gray-400 truncate">
              {lang === 'ar' ? 'صيانة وفحص متنقل بجدة' : 'Mobile Car Repair'}
            </span>
            <span className="font-mono text-brand-red font-bold shrink-0">{safeRating}.0 / 5.0 ★</span>
          </div>
        )}
      </div>
    </div>
  );
});

const STATIC_TESTIMONIALS = [
  { id: 'st1', name: "أم ميهو", comment: "والله ما قصر المهندس محمد، استلم سيارتي من عند باب البيت ورجعها في نفس اليوم مصلحة ونظيفة وريحتها تفتح النفس! خدمة تريح البال خصوصاً للأمهات اللي ما يمديهم يروحون الورش.", rating: 5, reply: "الله يسعدك يا أم ميهو، تشرفنا بخدمتك وخدمة عائلتك الكريمة دائماً." },
  { id: 'st2', name: "أحمد القحطاني", comment: "خدمة ممتازة جداً، استلموا السيارة من البيت ورجعوها في نفس اليوم نظيفة ومصلحة. المهندس محمد قمة في الأخلاق والأمانة.", rating: 5, reply: "شكراً لثقتك يا أستاذ أحمد، تشرفنا بخدمتك دائماً." },
  { id: 'st3', name: "فارس الغامدي", comment: "عجبني إنه يغسل السيارة قبل لا يجيبها ههههههههههههههههه، صراحة خدمة فندقية مو بس صيانة! الله يبارك لكم.", rating: 5, reply: "الله يسعدك أستاذ فارس، رضاكم وغسيل السيارة واجبنا." },
  { id: 'st4', name: "أم راكان", comment: "أول مرة أتعامل مع دكتور فيكس وانبهرت من الصدق والأمانة. حددوا المشكلة بدقة وصلحوها بسعر جداً مناسب.", rating: 5, reply: "شهادة نعتز فيها يا أم راكان، في خدمتكم دوماً." },
  { id: 'st5', name: "خالد الحربي", comment: "أفضل مركز صيانة تعاملت معه في جدة. دقة في المواعيد وشغل احترافي وسعر منافس جداً مقارنة بالوكالة.", rating: 5 },
  { id: 'st6', name: "مرام السلمي", comment: "وفروا علي عناء الذهاب للورشة، الخدمة من الباب للباب مريحة جداً. شكراً دكتور فيكس على الاحترافية.", rating: 5 },
  { id: 'st7', name: "أبو فهد الزهراني", comment: "صيانة كهرباء وبرمجة كومبيوتر على أعلى مستوى. فحصوا السيارة بالكامل وطلعوا العطل بدون لف ودوران.", rating: 5, reply: "حياك الله يا أبو فهد، دائماً في خدمتكم." },
  { id: 'st8', name: "سلطان العتيبي", comment: "المهندس محمد سندي فنان ومحترف، صلح لي مشكلة معقدة في الكهرباء عجزت عنها الوكالة وبسعر معقول جداً.", rating: 5, reply: "شهادة نعتز بها يا أستاذ سلطان، في خدمتكم دائماً." },
  { id: 'st9', name: "أم عبدالعزيز", comment: "سيارتي طفت علي بالشارع وجاني الفني بسرعة فائقة وشغلها، وبعدين كملوا الصيانة عندهم بالمركز. قمة الاحترام وسرعة التجاوب.", rating: 5, reply: "الحمد لله على سلامتك يا أم عبدالعزيز، هدفنا راحتكم وسلامتكم." },
  { id: 'st10', name: "خلود العمودي", comment: "أفضل شيء إنهم يجونك لين البيت، ما عاد أشيل هم الورش والزحمة. تعامل راقي وأمانة لا يعلى عليها.", rating: 5 },
  { id: 'st11', name: "عبدالله الشريف", comment: "غيرت الفحمات وزيت القير، الشغل نظيف ودقيق جداً وفحصوا السيارة بالكامل بالكمبيوتر مجاناً.", rating: 5 },
  { id: 'st12', name: "سارة باهبري", comment: "تجربة ممتازة وخدمة سريعة ومريحة جداً، كل شيء تم وأنا في بيتي وبكل شفافية في الأسعار.", rating: 5 },
  { id: 'st13', name: "فيصل باوزير", comment: "برمجة الحساسات وفحص الماكينة كان ممتاز وسريع، استلمت تقرير مفصل عن حالة السيارة.", rating: 5 },
  { id: 'st14', name: "نورة الشهري", comment: "تعامل راقي وسرعة استجابة مذهلة. سيارتي تعطلت فجأة وجاني الفني للبيت وصلحها في وقت قياسي.", rating: 5, reply: "الحمد لله على سلامتك وسلامة سيارتك أخت نورة." },
  { id: 'st15', name: "أبو تالين", comment: "السمكرة والدهان عندهم ما شاء الله لا قوة إلا بالله، رجعت السيارة وكالة كأنها ما انصدمت أبداً.", rating: 5, reply: "ألف سلامة عليك يا أبو تالين، وتتهنى بالموتر إن شاء الله." },
  { id: 'st16', name: "ماجد الدوسري", comment: "سمكرة ورش صدام بجودة وكالة تماماً بدون أي فرق باللون. فنانين بمعنى الكلمة!", rating: 5 },
  { id: 'st17', name: "رائد باجعفر", comment: "فحص شامل وتكييف السيارة رجع ثلج بعد صيانة الكمبروسر. أسعارهم واضحة وشغلهم مضمون.", rating: 5 },
  { id: 'st18', name: "طارق المالكي", comment: "سرعة في الإنجاز وشفافية في الأسعار بدون أي مبالغة. أفضل تجربة صيانة سيارات في جدة بلا منازع.", rating: 5 }
];

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<TestimonialData[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_testimonials');
      if (cached) return JSON.parse(cached);
    } catch {}
    return STATIC_TESTIMONIALS as any;
  });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const { t, lang } = useLanguage();

  useEffect(() => {
    // Listen to testimonials collection without restrictive orderBy so all docs load
    const q = collection(db, 'testimonials');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestimonialData[];
      
      // Sort with safe timestamp parsing so missing createdAt docs are never excluded
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
        return timeB - timeA;
      });
      
      setTestimonials(data);
      try { localStorage.setItem('drfix_cached_testimonials', JSON.stringify(data)); } catch {}
      setLoading(false);
    }, (error) => {
      if (!isFirestoreQuotaError(error)) {
        console.error("Error fetching testimonials:", error);
      } else {
        console.warn("[Firestore Quota] Testimonials using offline/static fallback.");
      }
      handleFirestoreError(error, OperationType.LIST, 'testimonials');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      
      scrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const displayData = React.useMemo(() => {
    const seen = new Set<string>();
    const merged: TestimonialData[] = [];

    testimonials.forEach(t => {
      const key = t.id || `${t.name}-${t.comment}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(t);
      }
    });

    STATIC_TESTIMONIALS.forEach(staticT => {
      const key = staticT.id;
      const textKey = `${staticT.name}-${staticT.comment}`;
      const duplicate = merged.some(m => m.id === staticT.id || (m.name === staticT.name && m.comment === staticT.comment));
      if (!seen.has(key) && !seen.has(textKey) && !duplicate) {
        seen.add(key);
        seen.add(textKey);
        merged.push(staticT as any);
      }
    });

    return merged.length > 0 ? merged : (STATIC_TESTIMONIALS as any);
  }, [testimonials]);

  if (loading) return null;

  return (
    <section id="testimonials" className="py-8 sm:py-12 md:py-16 bg-brand-dark relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6 sm:mb-8 gap-4">
          <div className={cn("text-center md:text-right", lang === 'en' && "md:text-left")}>
            <h2 className="text-2xl md:text-4xl font-display font-black mb-3 italic uppercase tracking-tight">
              {t.testimonials.title} <span className="text-brand-red">{t.testimonials.titleAccent}</span>
            </h2>
            <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto md:mx-0 rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll(lang === 'ar' ? 'right' : 'left')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer shadow-md"
              aria-label="Previous testimonials"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll(lang === 'ar' ? 'left' : 'right')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer shadow-md"
              aria-label="Next testimonials"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
          className={cn(
            "flex items-stretch overflow-x-auto gap-3.5 sm:gap-4 md:gap-5 pb-4 no-scrollbar touch-pan-x select-none",
            isMouseDown ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {displayData.map((review, idx) => (
            <div key={review.id || idx} className="w-[260px] sm:w-[280px] md:w-[300px] shrink-0 flex flex-col">
              <TestimonialCard 
                name={review.name} 
                comment={review.comment} 
                rating={review.rating} 
                reply={review.reply}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 sm:mt-10 max-w-xl mx-auto w-full px-2 sm:px-0 box-border">
          <AddTestimonialForm />
        </div>
      </div>
    </section>
  );
};

const AddTestimonialForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t, lang } = useLanguage();
  const { customer, openAuthModal } = useCustomer();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<{ name: string, comment: string }>();

  // If customer is logged in, auto-fill their name
  useEffect(() => {
    if (customer?.name) {
      setValue('name', customer.name);
    }
  }, [customer, setValue]);

  const onSubmit = async (data: { name: string, comment: string }) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonials'), {
        name: data.name.trim(),
        comment: data.comment.trim(),
        rating: rating,
        createdAt: serverTimestamp(),
        customerId: customer?.id || null
      });

      // Notify Telegram Bot Admin
      let reviewNotified = false;
      try {
        const reviewRes = await fetch('/api/notify-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name.trim(),
            rating: rating,
            comment: data.comment.trim()
          })
        });
        if (reviewRes.ok) {
          const resJson = await reviewRes.json();
          if (resJson && resJson.ok && resJson.result && resJson.result.ok) {
            reviewNotified = true;
          }
        }
      } catch (err) {
        console.warn('Review notification API error:', err);
      }

      if (!reviewNotified) {
        const stars = '⭐'.repeat(Math.min(5, Math.max(1, rating || 5)));
        const tgReviewText = `🌟 <b>تقييم ورأي جديد في DR.FIX</b>\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>العميل:</b> ${data.name.trim()} ${customer?.phone ? `(${customer.phone})` : ''}\n` +
          `⭐ <b>التقييم:</b> ${stars} (${rating}/5)\n` +
          `💬 <b>التعليق:</b> ${data.comment.trim()}\n` +
          `⏱️ <b>الوقت:</b> ${new Date().toLocaleString('ar-SA')}\n` +
          `━━━━━━━━━━━━━━━━━━`;
        sendTelegramNotification(tgReviewText);
      }

      setIsSuccess(true);
      reset();
      setRating(5);
      if (customer?.name) {
        setValue('name', customer.name);
      }
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 3500);
    } catch (error) {
      console.error("Error adding testimonial:", error);
      handleFirestoreError(error, OperationType.CREATE, 'testimonials');
      alert(lang === 'ar' ? "حدث خطأ أثناء إضافة التعليق. يرجى المحاولة مرة أخرى." : "An error occurred while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-brand-red/40 hover:bg-white/[0.08] text-white font-bold text-xs sm:text-sm transition-all shadow-md group cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-brand-red group-hover:scale-110 transition-transform" />
          <span>{lang === 'ar' ? 'شاركنا رأيك وتجربتك مع DR.FIX' : 'Share Your DR.FIX Experience'}</span>
        </button>
      </div>
    );
  }

  // If customer is not logged in, prompt them gracefully to sign in
  if (!customer) {
    return (
      <div className="w-full max-w-full glass-card p-5 sm:p-6 border-brand-red/20 text-center rounded-2xl shadow-xl overflow-hidden box-border relative">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/30 rounded-xl flex items-center justify-center mx-auto mb-3 text-brand-red shadow-lg shadow-brand-red/10">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-base sm:text-lg font-display font-black mb-1.5 italic text-white">
          {t.testimonials.loginPromptTitle || (lang === 'ar' ? 'أضف رأيك وتجربتك في DR.FIX' : 'Share Your DR.FIX Experience')}
        </h3>
        <p className="text-gray-300 text-xs max-w-md mx-auto mb-4 leading-relaxed">
          {t.testimonials.loginPromptDesc || (lang === 'ar' 
            ? 'نعتز بآراء وتجارب عملائنا الكرام. لإضافة تعليقك وتوثيقه باسمك في المنصة، يُرجى تسجيل الدخول أولاً.'
            : 'We cherish our customers authentic feedback. To leave your review and verify your identity, please sign in first.')}
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="w-full sm:w-auto px-5 py-2.5 bg-brand-red text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-brand-red/25 cursor-pointer mx-auto text-xs sm:text-sm"
        >
          <UserCheck className="w-4 h-4" />
          <span>{t.testimonials.loginButton || (lang === 'ar' ? 'تسجيل الدخول لإضافة رأيك' : 'Sign in to Leave a Review')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full glass-card p-4 sm:p-6 border-brand-red/20 rounded-2xl shadow-2xl box-border overflow-hidden relative">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
        <div className="text-start">
          <h3 className="text-base sm:text-lg font-display font-black italic text-white">
            {t.testimonials.addTitle} <span className="text-brand-red">{t.testimonials.addTitleAccent}</span>
          </h3>
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium mt-0.5">
            <CheckCircle2 className="w-3 h-3 text-brand-red" />
            <span>{customer.name} ({t.testimonials.verifiedCustomer || (lang === 'ar' ? 'عميل موثق' : 'Verified')})</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {isSuccess ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6"
        >
          <div className="w-12 h-12 bg-brand-red/15 border border-brand-red/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-brand-red" />
          </div>
          <p className="text-base font-bold text-white">{t.testimonials.thankYou}</p>
          <p className="text-gray-400 text-xs mt-1">{t.testimonials.successMessage}</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-full box-border">
          <div className="flex justify-center gap-1.5 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110 p-0.5 cursor-pointer"
                aria-label={`Rating ${star} stars`}
              >
                <Star 
                  className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7", 
                    star <= rating ? "text-brand-red fill-brand-red" : "text-gray-600"
                  )} 
                />
              </button>
            ))}
          </div>

          <div className="space-y-1 w-full">
            <input 
              {...register('name', { required: true })}
              placeholder={t.testimonials.namePlaceholder}
              defaultValue={customer.name}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus:border-brand-red focus:outline-none transition-all text-xs sm:text-sm text-white box-border"
            />
            {errors.name && <span className="text-brand-red text-[11px]">{t.testimonials.nameError}</span>}
          </div>

          <div className="space-y-1 w-full">
            <textarea 
              {...register('comment', { required: true })}
              rows={3}
              placeholder={t.testimonials.commentPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus:border-brand-red focus:outline-none transition-all resize-none text-xs sm:text-sm text-white box-border leading-relaxed"
            />
            {errors.comment && <span className="text-brand-red text-[11px]">{t.testimonials.commentError}</span>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-brand-red text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-brand-red/20 box-border text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className={cn("w-3.5 h-3.5", lang === 'ar' ? "" : "rotate-180")} />
                  <span>{t.testimonials.submitReview}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

interface GalleryItem {
  id: string;
  imageUrl: string;
  title: string;
  titleEn?: string;
  category: string;
  categoryEn?: string;
  createdAt: Timestamp;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  price?: string;
  order?: number;
}

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang } = useLanguage();
  return (
    <div className="border-b border-white/5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn("w-full py-6 flex justify-between items-center hover:text-brand-red transition-colors cursor-pointer", lang === 'ar' ? "text-right" : "text-left")}
      >
        <span className="text-base font-bold">{question}</span>
        <ChevronDown className={cn("w-5 h-5 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-gray-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const { t, lang } = useLanguage();
  return (
    <section id="faq" className="py-10 sm:py-16 md:py-24 bg-brand-black">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <div className={cn("text-center mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
            {t.faq.title} <span className="text-brand-red">{t.faq.titleAccent}</span>
          </h2>
          <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
        </div>

        <div className="space-y-2">
          <FAQItem 
            question={t.faq.q1} 
            answer={t.faq.a1} 
          />
          <FAQItem 
            question={t.faq.q2} 
            answer={t.faq.a2} 
          />
          <FAQItem 
            question={t.faq.q3} 
            answer={t.faq.a3} 
          />
        </div>
      </div>
    </section>
  );
};

const Footer = React.memo(({ settings, isAdmin }: { settings: AppSettings; isAdmin?: boolean }) => {
  const [visitors, setVisitors] = useState<number | null>(() => {
    try {
      const cached = localStorage.getItem('drfix_cached_visitors');
      if (cached) return Number(cached);
    } catch {}
    return 1250;
  });
  const [legalModalState, setLegalModalState] = useState<{ isOpen: boolean; tab: 'privacy' | 'terms' }>({
    isOpen: false,
    tab: 'privacy'
  });
  const { t, lang } = useLanguage();

  useEffect(() => {
    if (sessionStorage.getItem('drfix_firestore_quota_exceeded') === 'true') {
      return;
    }

    const updateVisitors = async () => {
      const statsRef = doc(db, 'stats', 'global');
      
      try {
        const statsDoc = await getDoc(statsRef);
        
        if (!statsDoc.exists()) {
          // Create initial doc
          await setDoc(statsRef, { visitorCount: 1 });
          setVisitors(1);
          try { localStorage.setItem('drfix_cached_visitors', '1'); } catch {}
        } else {
          // Check if already counted in this session
          const hasVisited = sessionStorage.getItem('hasVisited');
          if (!hasVisited) {
            await updateDoc(statsRef, {
              visitorCount: increment(1)
            });
            sessionStorage.setItem('hasVisited', 'true');
          }
        }
        
        // Listen for real-time updates
        const unsubscribe = onSnapshot(statsRef, (doc) => {
          if (doc.exists()) {
            const count = doc.data().visitorCount;
            setVisitors(count);
            try { localStorage.setItem('drfix_cached_visitors', String(count)); } catch {}
          }
        }, (error) => {
          if (!isFirestoreQuotaError(error)) {
            handleFirestoreError(error, OperationType.GET, 'stats/global');
          } else {
            console.warn('[Firestore Quota] Real-time visitor sync paused.');
          }
        });
        
        return unsubscribe;
      } catch (error) {
        if (!isFirestoreQuotaError(error)) {
          console.error("Error updating visitor count:", error);
        } else {
          console.warn("[Firestore Quota] Visitor count offline fallback, using local value.");
          try { sessionStorage.setItem('drfix_firestore_quota_exceeded', 'true'); } catch {}
        }
        return () => {};
      }
    };

    let unsub: () => void;
    updateVisitors().then(u => unsub = u);
    
    return () => {
      if (unsub) unsub();
    };
  }, []);

  return (
    <footer className="bg-brand-black border-t border-white/5 pt-10 sm:pt-12 pb-36 sm:pb-40 md:pb-14">
      <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12", lang === 'ar' ? "text-right" : "text-left")}>
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black rounded-2xl p-1.5 flex items-center justify-center border border-white/10 shadow-xl overflow-hidden">
              <img 
                src={settings.logoUrl || '/logo-custom.png'} 
                alt="Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
                loading="eager"
                decoding="async" 
              />
            </div>
          </div>
          <p className="text-gray-500 max-w-sm leading-relaxed">
            {lang === 'ar' ? (settings.footerDescription || t.footer.description) : t.footer.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <a 
              href={`mailto:${settings.email || 'info@drfix.repair'}`} 
              className="flex items-center gap-1.5 hover:text-brand-red transition-colors font-mono"
              title="راسلنا عبر البريد الإلكتروني"
            >
              <Mail className="w-4 h-4 text-brand-red shrink-0" />
              <span>{settings.email || 'info@drfix.repair'}</span>
            </a>
            <a 
              href={`tel:${settings.phone || '0546870807'}`} 
              className="flex items-center gap-1.5 hover:text-brand-red transition-colors font-mono"
            >
              <Phone className="w-4 h-4 text-brand-red shrink-0" />
              <span>{settings.phone || '0546870807'}</span>
            </a>
          </div>
          
          {visitors !== null && (
            <div className="mt-8 flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              <span>{t.footer.visitors}: {visitors.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        <div>
          <h4 className="font-display font-black mb-6 uppercase tracking-widest text-sm text-brand-red">{t.footer.quickLinks}</h4>
          <ul className="space-y-4 text-gray-500 font-bold">
            <li><Link to="/" className="hover:text-brand-red transition-colors">{t.nav.home}</Link></li>
            {settings.showServices !== false && (
              <li><Link to="/services" className="hover:text-brand-red transition-colors">{t.nav.services}</Link></li>
            )}
            {settings.showOffers !== false && (
              <li><Link to="/offers" className="hover:text-brand-red transition-colors">{t.nav.offers}</Link></li>
            )}
            {settings.showPartners !== false && (
              <li><Link to="/partners" className="hover:text-brand-red transition-colors">{t.nav.partners || (lang === 'ar' ? 'شركاء النجاح' : 'Success Partners')}</Link></li>
            )}
            {settings.showGallery !== false && (
              <li><Link to="/#gallery" className="hover:text-brand-red transition-colors">{t.nav.gallery}</Link></li>
            )}
            <li><Link to="/booking" className="hover:text-brand-red transition-colors">{t.nav.bookNow}</Link></li>
          </ul>
        </div>

      <div>
        <h4 className="font-display font-black mb-6 uppercase tracking-widest text-sm text-brand-red">{t.footer.followUs}</h4>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 max-w-full">
          {/* Snapchat */}
          {(settings.snapchat || DEFAULT_APP_SETTINGS.snapchat) && (
            <motion.a 
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={settings.snapchat || DEFAULT_APP_SETTINGS.snapchat} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-900/90 rounded-xl p-2 flex items-center justify-center border border-white/10 hover:border-brand-red hover:shadow-[0_0_12px_rgba(227,24,55,0.4)] transition-all shadow-sm group cursor-pointer shrink-0"
              title="Snapchat - سناب شات"
            >
              <img 
                src="/social/snapchat.svg" 
                alt="سناب شات - Snapchat" 
                className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" 
                loading="lazy"
              />
            </motion.a>
          )}

          {/* TikTok */}
          {(settings.tiktok || DEFAULT_APP_SETTINGS.tiktok) && (
            <motion.a 
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={settings.tiktok || DEFAULT_APP_SETTINGS.tiktok} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-900/90 rounded-xl p-2 flex items-center justify-center border border-white/10 hover:border-brand-red hover:shadow-[0_0_12px_rgba(227,24,55,0.4)] transition-all shadow-sm group cursor-pointer shrink-0"
              title="TikTok - تيك توك"
            >
              <img 
                src="/social/tiktok.svg" 
                alt="تيك توك - TikTok" 
                className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" 
                loading="lazy"
              />
            </motion.a>
          )}

          {/* Instagram */}
          {(settings.instagram || DEFAULT_APP_SETTINGS.instagram) && (
            <motion.a 
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={settings.instagram || DEFAULT_APP_SETTINGS.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-900/90 rounded-xl p-2 flex items-center justify-center border border-white/10 hover:border-brand-red hover:shadow-[0_0_12px_rgba(227,24,55,0.4)] transition-all shadow-sm group cursor-pointer shrink-0"
              title="Instagram - إنستغرام"
            >
              <img 
                src="/social/instagram.svg" 
                alt="إنستغرام - Instagram" 
                className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" 
                loading="lazy"
              />
            </motion.a>
          )}

          {/* X / Twitter */}
          {(settings.twitter || DEFAULT_APP_SETTINGS.twitter) && (
            <motion.a 
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={settings.twitter || DEFAULT_APP_SETTINGS.twitter} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-900/90 rounded-xl p-2 flex items-center justify-center border border-white/10 hover:border-brand-red hover:shadow-[0_0_12px_rgba(227,24,55,0.4)] transition-all shadow-sm group cursor-pointer shrink-0"
              title="X (Twitter) - منصة إكس"
            >
              <img 
                src="/social/twitter.svg" 
                alt="منصة إكس - X" 
                className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" 
                loading="lazy"
              />
            </motion.a>
          )}

          {/* WhatsApp */}
          {(settings.whatsapp || DEFAULT_APP_SETTINGS.whatsapp) && (
            <motion.a 
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={`https://wa.me/${(settings.whatsapp || DEFAULT_APP_SETTINGS.whatsapp || '966546870807').replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-900/90 rounded-xl p-2 flex items-center justify-center border border-white/10 hover:border-brand-red hover:shadow-[0_0_12px_rgba(227,24,55,0.4)] transition-all shadow-sm group cursor-pointer shrink-0"
              title="WhatsApp - واتساب"
            >
              <img 
                src="/social/whatsapp.svg" 
                alt="واتساب - WhatsApp" 
                className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" 
                loading="lazy"
              />
            </motion.a>
          )}

          {/* Facebook */}
          {settings.facebook && (
            <motion.a 
              whileHover={{ y: -2, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href={settings.facebook} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-neutral-900/90 rounded-xl p-2 flex items-center justify-center border border-white/10 hover:border-brand-red hover:shadow-[0_0_12px_rgba(227,24,55,0.4)] transition-all shadow-sm group cursor-pointer shrink-0"
              title="Facebook - فيسبوك"
            >
              <img 
                src="/social/facebook.svg" 
                alt="فيسبوك - Facebook" 
                className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" 
                loading="lazy"
              />
            </motion.a>
          )}
        </div>
        <div className="mt-8 flex justify-start">
          <ScrollToTopButton />
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs sm:text-sm font-mono">
      <div className="text-center md:text-start">{settings.copyrightText || `© ${new Date().getFullYear()} DR. FIX AUTO SERVICES. ${t.footer.rights}`}</div>
      
      {/* Privacy Policy & Terms of Service Links */}
      {((settings.showPrivacyPolicy !== false) || (settings.showTermsOfService !== false)) && (
        <div className="flex items-center gap-4 text-xs font-sans">
          {settings.showPrivacyPolicy !== false && (
            <button
              type="button"
              onClick={() => setLegalModalState({ isOpen: true, tab: 'privacy' })}
              className="text-gray-400 hover:text-brand-red transition-colors underline-offset-4 hover:underline cursor-pointer flex items-center gap-1.5"
              title="سياسة الخصوصية وحماية البيانات الشخصية"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-red" />
              <span>{lang === 'ar' ? 'سياسة الخصوصية (PDPL)' : 'Privacy Policy'}</span>
            </button>
          )}
          {settings.showPrivacyPolicy !== false && settings.showTermsOfService !== false && (
            <span className="text-gray-700">•</span>
          )}
          {settings.showTermsOfService !== false && (
            <button
              type="button"
              onClick={() => setLegalModalState({ isOpen: true, tab: 'terms' })}
              className="text-gray-400 hover:text-brand-red transition-colors underline-offset-4 hover:underline cursor-pointer flex items-center gap-1.5"
              title="شروط وأحكام الخدمة والضمان"
            >
              <FileText className="w-3.5 h-3.5 text-brand-red" />
              <span>{lang === 'ar' ? 'شروط الخدمة والضمان' : 'Terms of Service'}</span>
            </button>
          )}
        </div>
      )}
    </div>

    {/* Legal Modal (Privacy Policy & Terms of Service) */}
    <LegalModal
      isOpen={legalModalState.isOpen}
      onClose={() => setLegalModalState(prev => ({ ...prev, isOpen: false }))}
      initialTab={legalModalState.tab}
      settings={settings}
    />
  </footer>
  );
});

const ProcessStep = React.memo(({ number, title, description }: { number: string, title: string, description: string }) => (
  <motion.div 
    whileHover={{ scale: 1.05, rotateZ: 1 }}
    className="relative p-8 glass-card border-white/5 hover:border-brand-red/30 transition-all group shadow-xl"
    style={{ transformStyle: 'preserve-3d' }}
  >
    <motion.div 
      initial={{ scale: 0.8 }}
      whileInView={{ scale: 1 }}
      className="absolute -top-6 -right-6 w-12 h-12 bg-brand-red rounded-full flex items-center justify-center text-lg font-display font-black italic shadow-lg z-10"
    >
      {number}
    </motion.div>
    <h3 className="text-lg font-display font-bold mb-3 mt-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    
    {/* 3D Depth effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl md:rounded-3xl" />
  </motion.div>
));

const Process = () => {
  const { t, lang } = useLanguage();
  return (
    <section id="process" className="py-10 sm:py-16 md:py-24 bg-brand-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className={cn("text-center mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
            {t.process.title} <span className="text-brand-red">{t.process.titleAccent}</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t.process.description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" style={{ perspective: '2000px' }}>
          <ProcessStep 
            number="01" 
            title={t.process.step1Title} 
            description={t.process.step1Desc}
          />
          <ProcessStep 
            number="02" 
            title={t.process.step2Title} 
            description={t.process.step2Desc}
          />
          <ProcessStep 
            number="03" 
            title={t.process.step3Title} 
            description={t.process.step3Desc}
          />
          <ProcessStep 
            number="04" 
            title={t.process.step4Title} 
            description={t.process.step4Desc}
          />
        </div>
      </div>
    </section>
  );
};

const Stats = React.memo(() => {
  const { t } = useLanguage();
  return (
    <section className="py-8 sm:py-12 bg-brand-black border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-brand-red mb-1 sm:mb-2">+5000</div>
            <div className="text-gray-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs md:text-sm">{t.stats.cars}</div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-brand-red mb-1 sm:mb-2">100%</div>
            <div className="text-gray-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs md:text-sm">{t.stats.wash}</div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-brand-red mb-1 sm:mb-2">+10</div>
            <div className="text-gray-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs md:text-sm">{t.stats.experience}</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});


function DynamicStyles({ settings }: { settings: AppSettings }) {
  const primaryColor = settings.primaryColor || '#E31E24';
  const accentColor = settings.accentColor || '#FFFFFF';
  const borderRadius = settings.borderRadius || '12px';
  const fontFamily = settings.fontFamily || 'Inter';
  const secondaryFont = settings.secondaryFont || 'Inter';

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --brand-primary: ${primaryColor};
        --brand-accent: ${accentColor};
        --brand-radius: ${borderRadius};
        --font-primary: '${fontFamily}', sans-serif;
        --font-secondary: '${secondaryFont}', sans-serif;
      }
      
      .bg-brand-red { background-color: var(--brand-primary) !important; }
      .text-brand-red { color: var(--brand-primary) !important; }
      .border-brand-red { border-color: var(--brand-primary) !important; }
      .red-glow { box-shadow: 0 0 20px ${primaryColor}40 !important; }
      .red-glow-hover:hover { box-shadow: 0 0 30px ${primaryColor}60 !important; }
      
      body {
        font-family: var(--font-primary);
      }
      
      .font-display {
        font-family: var(--font-secondary);
      }
      
      .rounded-xl { border-radius: var(--brand-radius) !important; }
      .rounded-2xl { border-radius: calc(var(--brand-radius) * 1.5) !important; }
      .rounded-full { border-radius: 9999px !important; }

      ${settings.buttonStyle === 'brutal' ? `
        .rounded-xl, .rounded-2xl, .rounded-full { border-radius: 0 !important; }
        .bg-brand-red { border: 2px solid black !important; box-shadow: 4px 4px 0px black !important; }
      ` : ''}

      ${settings.buttonStyle === 'soft' ? `
        .rounded-xl { border-radius: 24px !important; }
        .rounded-2xl { border-radius: 32px !important; }
      ` : ''}
    `}} />
  );
};

const MaintenancePage = ({ 
  message, 
  onSecretTrigger 
}: { 
  message?: string; 
  onSecretTrigger?: () => void;
}) => {
  const secretClicks = useRef(0);
  const lastClickTime = useRef(0);

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastClickTime.current > 2500) {
      secretClicks.current = 1;
    } else {
      secretClicks.current += 1;
    }
    lastClickTime.current = now;

    if (secretClicks.current >= 5) {
      secretClicks.current = 0;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
      onSecretTrigger?.();
    }
  };

  return (
    <div className="w-full flex items-center justify-center p-6 text-center select-none">
      <div className="max-w-md">
        <div 
          onClick={handleIconClick}
          className="w-20 h-20 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-brand-red/20 cursor-pointer transition-transform active:scale-90 hover:border-brand-red/40 shadow-lg shadow-brand-red/5"
          title="Dr. Fix"
        >
          <ShieldAlert className="w-10 h-10 text-brand-red" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-black mb-4 uppercase italic">الموقع تحت الصيانة</h1>
        <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
          {message || 'نحن نقوم ببعض التحديثات والتحسينات الدورية. سنعود لخدمتكم قريباً!'}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};


const ContactSection = ({ settings }: { settings: AppSettings }) => {
  const { t, lang } = useLanguage();
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    // Send Telegram Notification to Admin
    try {
      fetch('/api/notify-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: emailOrPhone.trim() || 'غير محدد',
          serviceType: 'استفسار وتواصل مباشر',
          notes: message.trim(),
          location: 'جدة'
        })
      }).catch(err => console.warn('Inquiry notify error:', err));
    } catch {}

    const text = lang === 'ar'
      ? `*استفسار جديد من موقع Dr. Fix*\n\n*الاسم:* ${name}\n*وسيلة التواصل:* ${emailOrPhone || 'غير محدد'}\n*الرسالة:* ${message}`
      : `*New Inquiry from Dr. Fix Website*\n\n*Name:* ${name}\n*Contact Info:* ${emailOrPhone || 'N/A'}\n*Message:* ${message}`;
    const targetPhone = (settings.whatsapp || '966546870807').replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    setSent(true);
    setName('');
    setEmailOrPhone('');
    setMessage('');
    setTimeout(() => setSent(false), 5000);
  };
  
  return (
    <section id="contact" className="py-10 sm:py-16 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-display font-black italic mb-6 uppercase tracking-tighter">
              {t.contact.title} <span className="text-brand-red">{t.contact.titleAccent}</span>
            </h2>
            <div className="h-2 w-24 bg-brand-red mx-auto mb-8" />
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-red transition-colors shrink-0">
                  <Phone className="w-6 h-6 text-brand-red group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">{t.contact.phone}</h4>
                  <a href={`tel:${settings.phone || '0546870807'}`} className="text-gray-400 font-mono hover:text-brand-red transition-colors">
                    {settings.phone || '0546870807'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-red transition-colors shrink-0">
                  <Mail className="w-6 h-6 text-brand-red group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">{t.contact.email}</h4>
                  <a 
                    href={`mailto:${settings.email || 'info@drfix.repair'}`} 
                    className="text-gray-400 font-mono hover:text-brand-red transition-colors inline-block"
                  >
                    {settings.email || 'info@drfix.repair'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-red transition-colors shrink-0">
                  <MapPin className="w-6 h-6 text-brand-red group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">{t.contact.location}</h4>
                  <p className="text-gray-400">{settings.location || t.contact.locationVal}</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center group-hover:bg-brand-red transition-colors shrink-0">
                  <Clock className="w-6 h-6 text-brand-red group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1">{t.contact.workingHours}</h4>
                  <p className="text-gray-400">{t.contact.workingHoursVal}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 border-white/5 relative">
              <h3 className="text-2xl font-bold mb-6">{t.contact.formTitle}</h3>
              {sent ? (
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-white font-bold">{t.contact.successTitle}</p>
                  <p className="text-gray-400 text-xs mt-1">{t.contact.successDesc}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input 
                    placeholder={t.contact.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red transition-colors text-white"
                  />
                  <input 
                    placeholder={t.contact.phonePlaceholder}
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red transition-colors text-white"
                  />
                  <textarea 
                    placeholder={t.contact.messagePlaceholder}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red transition-colors text-white resize-none"
                  />
                  <button 
                    type="submit"
                    className="w-full py-4 bg-brand-red rounded-xl font-bold italic uppercase tracking-widest hover:bg-red-700 transition-all text-white shadow-lg shadow-brand-red/20 cursor-pointer"
                  >
                    {t.contact.sendButton}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ScrollToTopButton = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={scrollToTop}
      className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center shadow-2xl text-white red-glow"
      title="العودة للأعلى"
    >
      <ArrowUp className="w-6 h-6" />
    </motion.button>
  );
};

function MainContent() {
  const [selectedService, setSelectedService] = useState<string>('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      const sessionVal = sessionStorage.getItem('drfix_admin_logged_in');
      const localVal = localStorage.getItem('drfix_admin_logged_in');
      return sessionVal === 'true' || localVal === 'true';
    } catch {
      return false;
    }
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const cached = localStorage.getItem('drfix_app_settings');
      if (cached) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(cached) };
      }
    } catch (e) {
      console.error('Error loading cached settings:', e);
    }
    return DEFAULT_APP_SETTINGS;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t } = useLanguage();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    initAudioUnlocker();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  useEffect(() => {
    // Listen for settings updates
    const statsRef = doc(db, 'stats', 'global');
    const unsubscribe = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as AppSettings;
        const merged = { ...DEFAULT_APP_SETTINGS, ...data };
        setSettings(merged);
        try {
          localStorage.setItem('drfix_app_settings', JSON.stringify(merged));
        } catch {
          try {
            // If quota limit exceeded due to large base64 strings, store critical visual keys
            const trimmed: Partial<AppSettings> = {
              siteName: data.siteName || DEFAULT_APP_SETTINGS.siteName,
              heroTitle: data.heroTitle || DEFAULT_APP_SETTINGS.heroTitle,
              heroSubtitle: data.heroSubtitle || DEFAULT_APP_SETTINGS.heroSubtitle,
              heroBadge: data.heroBadge,
              heroButtonText: data.heroButtonText || DEFAULT_APP_SETTINGS.heroButtonText,
              logoUrl: data.logoUrl || DEFAULT_APP_SETTINGS.logoUrl,
              heroImageUrl: data.heroImageUrl || DEFAULT_APP_SETTINGS.heroImageUrl,
              whatsapp: data.whatsapp || DEFAULT_APP_SETTINGS.whatsapp,
              phone: data.phone || DEFAULT_APP_SETTINGS.phone,
              tickerText: data.tickerText,
              showHeroImageBadge: data.showHeroImageBadge,
              heroImageBadgeTitle: data.heroImageBadgeTitle,
              heroImageBadgeSubtitle: data.heroImageBadgeSubtitle
            };
            localStorage.setItem('drfix_app_settings', JSON.stringify(trimmed));
          } catch {}
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'stats/global'));

    return unsubscribe;
  }, []);

  const [partners, setPartners] = useState<Partner[]>(() => {
    try {
      const cached = localStorage.getItem('drfix_partners');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Error loading cached partners:', e);
    }
    return DEFAULT_PARTNERS;
  });

  useEffect(() => {
    const q = query(collection(db, 'partners'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Partner));
        setPartners(list);
        try {
          localStorage.setItem('drfix_partners', JSON.stringify(list));
        } catch {}
      } else {
        setPartners(DEFAULT_PARTNERS);
      }
    }, (error) => {
      console.warn('Partners fetch fallback in MainContent:', error);
      setPartners(DEFAULT_PARTNERS);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Deep linking: Direct modal opening for tracking link (?track=BOOKING_ID)
  const [trackBookingRecord, setTrackBookingRecord] = useState<MaintenanceRecord | null>(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [trackErrorMsg, setTrackErrorMsg] = useState<string | null>(null);
  const [staffListForTrack, setStaffListForTrack] = useState<StaffUser[]>([]);
  const trackUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const trackParam = searchParams.get('track');
    if (!trackParam) {
      setStaffListForTrack([]);
      return;
    }

    // Load staff list only when tracking modal is actually requested
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as StaffUser));
      setStaffListForTrack(list);
    }, (err) => console.warn('Staff fetch for track:', err));

    return () => unsubStaff();
  }, [location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const trackParam = searchParams.get('track');

    if (!trackParam) {
      if (trackUnsubscribeRef.current) {
        trackUnsubscribeRef.current();
        trackUnsubscribeRef.current = null;
      }
      return;
    }

    const cleanCode = trackParam.trim().replace(/^#/, '');
    if (!cleanCode) return;

    setIsTrackLoading(true);
    setTrackErrorMsg(null);

    // Query Firestore for this booking by bookingId or document ID
    const maintenanceCol = collection(db, 'maintenance');
    const qByBookingId = query(maintenanceCol, where('bookingId', '==', cleanCode), limit(1));

    const unsub = onSnapshot(qByBookingId, async (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setTrackBookingRecord({ id: docSnap.id, ...(docSnap.data() as any) } as MaintenanceRecord);
        setIsTrackLoading(false);
        setTrackErrorMsg(null);
      } else {
        // Fallback: Check if cleanCode is the direct firestore document ID or uppercase variant
        try {
          const docDirectRef = doc(db, 'maintenance', cleanCode);
          const docDirectSnap = await getDoc(docDirectRef);
          if (docDirectSnap.exists()) {
            setTrackBookingRecord({ id: docDirectSnap.id, ...(docDirectSnap.data() as any) } as MaintenanceRecord);
            setIsTrackLoading(false);
            setTrackErrorMsg(null);
          } else {
            // Also check lowercase or uppercase bookingId match if any
            const qFallback = query(maintenanceCol, where('bookingId', '==', cleanCode.toUpperCase()), limit(1));
            const snapFallback = await getDocs(qFallback);
            if (!snapFallback.empty) {
              const dSnap = snapFallback.docs[0];
              setTrackBookingRecord({ id: dSnap.id, ...(dSnap.data() as any) } as MaintenanceRecord);
              setIsTrackLoading(false);
              setTrackErrorMsg(null);
            } else {
              setIsTrackLoading(false);
              setTrackErrorMsg(`عذراً، لم يتم العثور على طلب صيانة برقم السند (#${cleanCode}). يرجى التأكد من صحة الرابط.`);
            }
          }
        } catch (err) {
          console.error('Error fetching track doc directly:', err);
          setIsTrackLoading(false);
          setTrackErrorMsg(`عذراً، لم يتم العثور على الطلب (#${cleanCode}).`);
        }
      }
    }, (err) => {
      console.error('Track booking query error:', err);
      setIsTrackLoading(false);
      setTrackErrorMsg('حدث خطأ أثناء تحميل بيانات الطلب، يرجى المحاولة مرة أخرى.');
    });

    trackUnsubscribeRef.current = unsub;

    return () => {
      if (trackUnsubscribeRef.current) {
        trackUnsubscribeRef.current();
        trackUnsubscribeRef.current = null;
      }
    };
  }, [location.search]);

  const handleCloseTrackModal = () => {
    setTrackBookingRecord(null);
    setTrackErrorMsg(null);
    setIsTrackLoading(false);
    if (trackUnsubscribeRef.current) {
      trackUnsubscribeRef.current();
      trackUnsubscribeRef.current = null;
    }
    // Remove track query param smoothly from URL without reload
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('track');
    const newSearch = searchParams.toString();
    navigate({
      pathname: location.pathname,
      search: newSearch ? `?${newSearch}` : ''
    }, { replace: true });
  };

  const [currentStaffUser, setCurrentStaffUser] = useState<StaffUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('drfix_current_staff') || localStorage.getItem('drfix_current_staff');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing saved staff session:', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      const savedAdmin = sessionStorage.getItem('drfix_admin_logged_in') || localStorage.getItem('drfix_admin_logged_in');
      if (savedAdmin === 'true') {
        setIsAdminLoggedIn(true);
        if (!currentStaffUser) {
          const savedStaff = sessionStorage.getItem('drfix_current_staff') || localStorage.getItem('drfix_current_staff');
          if (savedStaff) {
            try {
              setCurrentStaffUser(JSON.parse(savedStaff));
            } catch {
              // fallback
            }
          } else {
            setCurrentStaffUser({
              id: 'master-super-admin',
              username: 'DRFIX',
              password: '••••••••',
              fullName: 'المدير العام (Master Admin)',
              role: 'super_admin',
              roleTitleAr: 'المدير العام',
              permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS,
              isActive: true
            });
          }
        }
      }
    } catch (e) {
      console.error('Auth verification error:', e);
    }
  }, []);

  const handleAdminLoginSuccess = (staff?: StaffUser) => {
    setIsAdminLoggedIn(true);
    try {
      sessionStorage.setItem('drfix_admin_logged_in', 'true');
      localStorage.setItem('drfix_admin_logged_in', 'true');
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
    const userToSave: StaffUser = staff || {
      id: 'master-super-admin',
      username: 'DRFIX',
      password: '••••••••',
      fullName: 'المدير العام (Master Admin)',
      role: 'super_admin',
      roleTitleAr: 'المدير العام',
      permissions: DEFAULT_SUPER_ADMIN_PERMISSIONS,
      isActive: true
    };
    setCurrentStaffUser(userToSave);
    try {
      sessionStorage.setItem('drfix_current_staff', JSON.stringify(userToSave));
      localStorage.setItem('drfix_current_staff', JSON.stringify(userToSave));
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
    navigate('/admin', { replace: true });
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentStaffUser(null);
    try {
      sessionStorage.removeItem('drfix_admin_logged_in');
      localStorage.removeItem('drfix_admin_logged_in');
      sessionStorage.removeItem('drfix_current_staff');
      localStorage.removeItem('drfix_current_staff');
    } catch (e) {
      console.warn('Storage remove failed:', e);
    }
    navigate('/');
  };

  const handleServiceSelect = (serviceType: string) => {
    setSelectedService(serviceType);
    navigate('/booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfferSelect = (offer: Offer) => {
    const offerTitle = lang === 'ar' ? offer.title : (offer.titleEn || offer.title);
    setSelectedService(`عرض خاص: ${offerTitle} (${offer.price})`);
    navigate('/booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAuthOrAdminRoute = location.pathname === '/login' || 
                             location.pathname.startsWith('/login/') || 
                             location.pathname === '/admin' || 
                             location.pathname.startsWith('/admin/');

  const isMaintenanceActive = Boolean(settings.maintenanceMode && !isAdminLoggedIn);

  if (isMaintenanceActive && !isAuthOrAdminRoute) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-brand-black text-white flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <DynamicStyles settings={settings} />
        <Ticker settings={{
          ...settings,
          tickerText: 'الموقع تحت الصيانة والتحديث المؤقت • نعود لخدمتكم قريباً • DR. FIX AUTO SERVICES'
        }} />
        <Navbar settings={settings} isAdmin={isAdminLoggedIn} isMaintenance={true} />
        
        <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-24 sm:pb-28 flex items-center justify-center">
          <MaintenancePage 
            message={settings.maintenanceMessage} 
            onSecretTrigger={() => navigate('/login')} 
          />
        </main>
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname.startsWith('/login');

  if (isAdminRoute || isLoginRoute) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#090A0C] text-[#F5F6F8] flex flex-col w-full overflow-x-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <DynamicStyles settings={settings} />
        <main className="flex-1 w-full min-h-screen">
          <Routes>
            <Route path="/admin" element={<Suspense fallback={<ComponentLoadingFallback />}><AdminDashboard isAdmin={isAdminLoggedIn} onLogout={handleAdminLogout} settings={settings} currentStaffUser={currentStaffUser} /></Suspense>} />
            <Route path="/admin/*" element={<Suspense fallback={<ComponentLoadingFallback />}><AdminDashboard isAdmin={isAdminLoggedIn} onLogout={handleAdminLogout} settings={settings} currentStaffUser={currentStaffUser} /></Suspense>} />
            <Route path="/login" element={<LoginPage onLogin={handleAdminLoginSuccess} isAdmin={isAdminLoggedIn} />} />
            <Route path="/login/*" element={<LoginPage onLogin={handleAdminLoginSuccess} isAdmin={isAdminLoggedIn} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-brand-black text-white flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <DynamicStyles settings={settings} />
      <Ticker settings={settings} />
      <Navbar settings={settings} isAdmin={isAdminLoggedIn} isMaintenance={isMaintenanceActive} />
      
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32 pb-32 sm:pb-36 md:pb-0">
        <Routes>
          <Route path="/" element={
            <>
              <Hero settings={settings} />
              {(settings.showStats !== false) && <Stats />}
              {(settings.showServices !== false) && <Services onServiceSelect={handleServiceSelect} />}
              {(settings.showOffers !== false) && <Offers onOfferSelect={handleOfferSelect} />}
              {(settings.showGallery !== false) && <Gallery />}
              <Process />
              <BookingCtaSection lang={lang} whatsapp={settings.whatsapp} />
              {(settings.showTestimonials !== false) && <Testimonials />}
              <FAQ />
            </>
          } />
          <Route path="/services" element={settings.showServices !== false ? <Services onServiceSelect={handleServiceSelect} /> : <Navigate to="/" replace />} />
          <Route path="/offers" element={settings.showOffers !== false ? <Offers onOfferSelect={handleOfferSelect} /> : <Navigate to="/" replace />} />
          <Route path="/partners" element={
            settings.showPartners !== false ? (
              <Suspense fallback={<ComponentLoadingFallback />}>
                <PartnersPage 
                  partners={partners} 
                  settings={settings} 
                  lang={lang}
                  onSelectPartnerForBooking={(partner) => {
                    setSelectedService(lang === 'ar' ? `صيانة بالتنسيق مع الشريك: ${partner.name}` : `Service via Partner: ${partner.name}`);
                    navigate('/booking');
                  }} 
                />
              </Suspense>
            ) : (
              <Navigate to="/" replace />
            )
          } />
          <Route path="/booking" element={<BookingForm selectedService={selectedService} settings={settings} />} />
          <Route path="/history" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer settings={settings} isAdmin={isAdminLoggedIn} />
      
      <MobileQuickBar settings={settings} />
      
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-8 md:w-80"
          >
            <div className="glass-card p-4 border-brand-red/30 shadow-2xl bg-brand-black/90 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-red rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold mb-1">{t.pwa.title}</h4>
                  <p className="text-xs text-gray-400 mb-3">{t.pwa.desc}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleInstallClick}
                      className="flex-1 py-2 bg-brand-red text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all cursor-pointer"
                    >
                      {t.pwa.install}
                    </button>
                    <button 
                      onClick={() => setShowInstallPrompt(false)}
                      className="px-3 py-2 bg-white/5 text-gray-400 text-xs font-bold rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                    >
                      {t.pwa.later}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direct Tracking Link Modal: Opens ServiceTimelineModal immediately for Technician & Customer via ?track=BOOKING_ID */}
      {trackBookingRecord && (
        <Suspense fallback={<ComponentLoadingFallback />}>
          <ServiceTimelineModal
          record={trackBookingRecord}
          staffList={staffListForTrack}
          allRecords={[trackBookingRecord]}
          currentStaffUser={currentStaffUser}
          initialTab="timeline"
          telegramConfig={{
            botToken: settings.telegramBotToken,
            chatId: settings.telegramChatId
          }}
          onClose={handleCloseTrackModal}
          onUpdateRecord={(updatedRecord) => {
            setTrackBookingRecord(updatedRecord);
          }}
        />
        </Suspense>
      )}

      {/* Direct Tracking Link Loading Indicator */}
      {isTrackLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-3 text-center shadow-2xl max-w-sm mx-4">
            <div className="w-10 h-10 border-3 border-brand-red border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-white">جاري تحميل بيانات السند وتوثيق مراحل الصيانة...</p>
            <p className="text-xs text-gray-400 font-mono">DR.FIX TRACKING SYSTEM</p>
          </div>
        </div>
      )}

      {/* Direct Tracking Link Not Found Dialog */}
      {trackErrorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#121212] border border-red-500/30 p-6 rounded-2xl flex flex-col items-center gap-4 text-center shadow-2xl max-w-md w-full">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-brand-red flex items-center justify-center font-bold text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-2">تنبيه البحث عن السند</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{trackErrorMsg}</p>
            </div>
            <button
              type="button"
              onClick={handleCloseTrackModal}
              className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-red/20"
            >
              إغلاق ومتابعة للموقع
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h1 style={{ color: '#E31E24', marginBottom: '10px' }}>عذراً، حدث خطأ غير متوقع</h1>
          <p style={{ color: '#888', maxWidth: '500px' }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '12px 24px', background: '#E31E24', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>إعادة تحميل الصفحة</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router>
      <ScrollManager />
          <LanguageProvider>
            <CustomerProvider>
              <MainContent />
            </CustomerProvider>
          </LanguageProvider>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

