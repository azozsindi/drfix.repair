/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
console.log("App.tsx module is being evaluated");

import React, { useState, useCallback, useEffect, useRef, createContext, useContext, Component } from 'react';
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
  Smartphone,
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
  HelpCircle,
  Tag,
  Camera,
  Send,
  Loader2,
  History,
  Search,
  FileText,
  Calendar,
  Settings,
  LogOut,
  LogIn,
  Trash2,
  PlusCircle,
  User,
  MessageSquare,
  AlertCircle,
  Bell,
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
  Monitor,
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
  KeyRound
} from 'lucide-react';
import { ReportsView } from './components/ReportsView';
import { StaffManagement } from './components/StaffManagement';
import { ManualPaymentsManager } from './components/accounting/ManualPaymentsManager';
import { exportBookingsToWord, exportSingleBookingWord } from './lib/reportUtils';
import { 
  StaffUser, 
  StaffRole, 
  StaffPermissions, 
  DEFAULT_SUPER_ADMIN_PERMISSIONS, 
  ROLE_PRESETS 
} from './types';
import { useForm } from 'react-hook-form';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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

// Language Context
type Language = 'ar' | 'en';
interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

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
}

// Audio synthesized notification chime for bookings
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // High-pitched pleasant dual chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.log('Audio notification chime not supported or allowed yet', e);
  }
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

// Telegram instant message dispatcher with auto-retry plain text fallback
export const sendTelegramNotification = async (
  messageText: string, 
  botToken?: string, 
  chatId?: string,
  replyMarkup?: any
): Promise<boolean> => {
  const activeToken = (botToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  const activeChatId = (chatId || DEFAULT_TELEGRAM_CHAT_ID).trim();
  if (!activeToken || !activeChatId) return false;
  try {
    const payload: Record<string, any> = {
      chat_id: activeChatId,
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
      chat_id: activeChatId,
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
    console.error("Telegram notification error:", err);
    return false;
  }
};

const compressImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const Ticker = ({ settings }: { settings: AppSettings }) => {
  const { t, lang } = useLanguage();
  
  const items = (lang === 'ar' && settings.tickerText)
    ? settings.tickerText.split('•').map(s => s.trim()).filter(Boolean)
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
      className="bg-brand-red py-2 fixed top-0 left-0 right-0 z-[60] shadow-md overflow-hidden flex items-center border-b border-red-600/40"
    >
      {renderList('set1')}
      {renderList('set2')}
    </div>
  );
};

const Navbar = ({ settings, isAdmin }: { settings: AppSettings; isAdmin?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const navLinks = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.services, path: '/#services' },
    { name: t.nav.offers, path: '/#offers' },
    { name: t.nav.gallery, path: '/#gallery' },
    { name: t.nav.history, path: '/history' },
  ];

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    if (path.startsWith('/#')) {
      const id = path.replace('/#', '');
      if (location.pathname === '/') {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/');
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else {
      navigate(path);
    }
  };

  const handleBookNow = () => {
    setIsOpen(false);
    if (location.pathname === '/') {
      const element = document.getElementById('booking');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/booking');
    }
  };

  return (
    <nav className="fixed top-7 md:top-8 left-0 right-0 z-50 bg-brand-black/90 backdrop-blur-xl border-b border-white/10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-full flex items-center justify-center border border-white/10 shadow-lg overflow-hidden group-hover:border-brand-red/50 transition-colors">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
            ) : (
              <span className="text-brand-red font-display font-black text-base md:text-lg italic tracking-tighter leading-none">
                Dr.Fix
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-sm md:text-base tracking-tight group-hover:text-brand-red transition-colors">
              {settings.siteName || 'Dr. Fix'}
            </span>
            <span className="text-[10px] text-gray-400 hidden sm:inline-block">صيانة سيارات احترافية</span>
          </div>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-bold uppercase tracking-wider">
          {navLinks.map((link) => (
            <button 
              key={link.path} 
              onClick={() => handleNavClick(link.path)}
              className={cn("transition-colors hover:text-brand-red cursor-pointer py-1", location.pathname === link.path ? "text-brand-red" : "text-white")}
            >
              {link.name}
            </button>
          ))}
          <div className="h-5 w-px bg-white/10" />
          <button 
            onClick={() => handleNavClick(isAdmin ? '/admin' : '/login')}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:text-white hover:border-brand-red/40 hover:bg-brand-red/10 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title={isAdmin ? (lang === 'ar' ? 'لوحة التحكم' : 'Admin') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}
          >
            {isAdmin ? <Shield className="w-3.5 h-3.5 text-brand-red" /> : <LogIn className="w-3.5 h-3.5 text-brand-red" />}
            <span>{isAdmin ? (lang === 'ar' ? 'الإدارة' : 'Admin') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}</span>
          </button>
          <LanguageToggle />
          <div className="flex items-center gap-2">
            <a 
              href={`tel:${settings.phone || '0546870807'}`} 
              className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-brand-red hover:border-brand-red transition-all"
              title="اتصال هاتفي"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a 
              href={`https://wa.me/${(settings.whatsapp || '966546870807').replace(/\+/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="p-2.5 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-sm shadow-green-500/20"
              title="واتساب"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
          <button 
            onClick={handleBookNow} 
            className="px-5 py-2.5 bg-brand-red rounded-full text-white font-display font-black text-xs md:text-sm red-glow-hover transition-all cursor-pointer flex items-center gap-2"
          >
            <Car className="w-4 h-4" />
            {t.nav.bookNow}
          </button>
        </div>

        {/* Mobile / Tablet Menu Toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => handleNavClick(isAdmin ? '/admin' : '/login')}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:text-brand-red hover:border-brand-red/30 transition-all cursor-pointer flex items-center justify-center"
            title={isAdmin ? (lang === 'ar' ? 'لوحة التحكم' : 'Admin') : (lang === 'ar' ? 'تسجيل الدخول' : 'Login')}
            aria-label={isAdmin ? "لوحة التحكم" : "تسجيل الدخول"}
          >
            {isAdmin ? <Shield className="w-4 h-4 text-brand-red" /> : <LogIn className="w-4 h-4 text-brand-red" />}
          </button>
          <LanguageToggle />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:text-brand-red hover:border-brand-red/30 transition-all cursor-pointer"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <a 
                  href={`tel:${settings.phone || '0546870807'}`} 
                  className="py-3 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <Phone className="w-4 h-4 text-brand-red" />
                  <span>اتصال هاتفي</span>
                </a>
                <a 
                  href={`https://wa.me/${(settings.whatsapp || '966546870807').replace(/\+/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="py-3 px-4 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center gap-2 text-sm text-green-400 hover:bg-[#25D366]/30 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>واتساب</span>
                </a>
              </div>

              <button 
                onClick={handleBookNow} 
                className="bg-brand-red py-3.5 px-6 rounded-xl text-center font-display text-white font-black text-sm shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2"
              >
                <Car className="w-4 h-4" />
                {t.nav.bookNow}
              </button>

              <div className="pt-3 border-t border-white/10 space-y-2">
                <button 
                  type="button"
                  onClick={() => handleNavClick(isAdmin ? '/admin' : '/login')}
                  className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-brand-red/10 border border-white/10 hover:border-brand-red/30 flex items-center justify-between text-sm font-bold text-gray-100 transition-all cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-red/20 text-brand-red flex items-center justify-center">
                      {isAdmin ? <Shield className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                    </div>
                    <span>
                      {isAdmin 
                        ? (lang === 'ar' ? 'لوحة تحكم المركز (Admin)' : 'Admin Dashboard')
                        : (lang === 'ar' ? 'تسجيل دخول الإدارة وفريق العمل' : 'Staff & Admin Login')}
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
                <div className="flex justify-between items-center text-[10px] text-gray-500 px-1 font-mono">
                  <span>Dr. Fix Auto Services</span>
                  <span>v2.5 • Verified</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const MobileQuickBar = ({ settings }: { settings: AppSettings }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const handleBookClick = () => {
    if (location.pathname === '/') {
      const el = document.getElementById('booking');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/booking');
    }
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
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-white/5 border border-white/10 text-green-400 hover:text-white hover:bg-[#25D366] transition-all active:scale-95"
        >
          <MessageCircle className="w-5 h-5 mb-0.5" />
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

        {/* History / Status Button */}
        <Link
          to="/history"
          className={cn(
            "flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95",
            location.pathname === '/history' 
              ? "bg-brand-red/20 border border-brand-red/40 text-brand-red" 
              : "bg-white/5 border border-white/10 text-gray-300 hover:text-white"
          )}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] whitespace-nowrap font-bold">سجلي</span>
        </Link>
      </div>
    </div>
  );
};

const Hero = ({ settings }: { settings: AppSettings }) => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBookNow = () => {
    if (location.pathname === '/') {
      const element = document.getElementById('booking');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/booking');
    }
  };

  return (
    <section className="relative min-h-[85vh] lg:min-h-screen flex items-center pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 overflow-hidden">
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
                className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center gap-2.5 text-sm sm:text-base hover:bg-[#128C7E] transition-all active:scale-95 cursor-pointer shadow-lg shadow-green-500/20" 
                title="واتساب"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
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
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -10, 0]
          }}
          transition={{ 
            duration: 1.2, 
            delay: 0.2,
            y: {
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="relative px-2 sm:px-4 md:px-0"
        >
          <div className="relative z-10 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 red-glow shadow-2xl">
            <img 
              src={settings.heroImageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000"} 
              alt="Dr. Fix Car Maintenance" 
              className="w-full h-[200px] sm:h-[280px] md:h-[360px] lg:h-[420px] object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black/90 via-transparent to-transparent opacity-60" />
            
            {/* Quick floating stat badge on image */}
            {settings.showHeroImageBadge !== false && (
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-brand-black/85 backdrop-blur-md border border-white/15 rounded-xl px-3.5 py-2 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
                <div className="text-right">
                  <div className="text-xs font-bold text-white">
                    {settings.heroImageBadgeTitle || (lang === 'ar' ? "خدمة متنقلة وسريعة" : "Fast & Mobile Service")}
                  </div>
                  <div className="text-[10px] text-gray-400">
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
      
      <div className={cn("mt-6 flex items-center gap-2 text-brand-red font-bold italic text-xs opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-2", lang === 'en' && "group-hover:-translate-x-2")} style={{ transform: 'translateZ(15px)' }}>
        <span>{t.services.bookNow}</span>
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
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    const merged = [...services];
    STATIC_SERVICES.forEach(staticS => {
      if (!services.some(s => s.title === staticS.title)) {
        merged.push(staticS as any);
      }
    });
    return merged;
  }, [services]);

  if (loading) return null;

  return (
    <section id="services" className="py-16 md:py-24 bg-brand-dark relative overflow-hidden">
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

const STATIC_OFFERS: Offer[] = [
  { id: 'o1', title: 'فحص شامل للسيارة', titleEn: 'Comprehensive Inspection', price: '199', subtitle: 'ريال فقط', subtitleEn: 'SAR only', features: ['فحص الميكانيكا', 'فحص الكهرباء', 'فحص البودي', 'تقرير مفصل'], featuresEn: ['Mechanical check', 'Electrical check', 'Body check', 'Detailed report'], icon: 'zap', createdAt: Timestamp.now(), active: true },
  { id: 'o2', title: 'تغيير زيت وفلتر', titleEn: 'Oil & Filter Change', price: '250', subtitle: 'ريال شامل', subtitleEn: 'SAR inclusive', features: ['زيت أصلي', 'فلتر وكالة', 'فحص السوائل', 'غسيل مجاني'], featuresEn: ['Original oil', 'Genuine filter', 'Fluids check', 'Free wash'], icon: 'tag', createdAt: Timestamp.now(), active: true },
];

const Offers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

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
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offers');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const allOffers = React.useMemo(() => {
    const merged = [...offers];
    STATIC_OFFERS.forEach(staticOffer => {
      if (!offers.some(o => o.title === staticOffer.title)) {
        merged.push(staticOffer);
      }
    });
    return merged;
  }, [offers]);

  if (loading) return null;

  return (
    <section id="offers" className="py-24 bg-brand-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className={cn("text-center mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
            {t.offers.title} <span className="text-brand-red">{t.offers.titleAccent}</span>
          </h2>
          <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              className="glass-card p-8 border-brand-red/20 relative overflow-hidden group h-full flex flex-col"
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
              <Link to="/booking" className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-display font-black italic text-center hover:bg-brand-red hover:border-brand-red transition-all group-hover:shadow-lg group-hover:shadow-brand-red/20" style={{ transform: 'translateZ(25px)' }}>
                {t.offers.claimOffer}
              </Link>
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
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(8));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: GalleryItem[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as GalleryItem);
      });
      setItems(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const allItems = React.useMemo(() => {
    const merged = [...items];
    STATIC_GALLERY.forEach(staticItem => {
      if (!items.some(item => item.title === staticItem.title)) {
        merged.push(staticItem);
      }
    });
    return merged;
  }, [items]);

  if (loading) return null;

  return (
    <section id="gallery" className="py-24 bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className={cn("text-center mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
            {t.gallery.title} <span className="text-brand-red">{t.gallery.titleAccent}</span>
          </h2>
          <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
          <p className="mt-6 text-gray-400">{t.gallery.description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {allItems.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true, margin: "-50px" }}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10"
            >
              <img 
                src={item.imageUrl} 
                alt={lang === 'ar' ? item.title : (item.titleEn || item.title)} 
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <span className="text-brand-red text-xs font-bold uppercase tracking-widest mb-1">
                  {lang === 'ar' ? item.category : (item.categoryEn || item.category)}
                </span>
                <h4 className="text-white font-bold">
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

const BookingForm = ({ selectedService, settings }: { selectedService?: string, settings?: AppSettings }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationName, setLocationName] = useState('');
  
  const { t, lang } = useLanguage();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BookingFormData>();

  React.useEffect(() => {
    if (selectedService) {
      setValue('serviceType', selectedService);
    }
  }, [selectedService, setValue]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === 'ar' ? 'خاصية تحديد الموقع غير مدعومة في متصفحك.' : 'Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setLocationName(lang === 'ar' ? 'تم تحديد إحداثيات موقعك بنجاح 📍' : 'GPS Coordinates Captured 📍');
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
        alert(lang === 'ar' ? 'تعذر الوصول إلى موقعك تلقائياً. يمكنك كتابة الحي أو العنوان في خانة الوصف.' : 'Unable to access your location. Please specify your district in the description.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const onSubmit = async (data: BookingFormData) => {
    if (isLoading) return;
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
    const cleanPhone = data.phone.trim();
    const uniqueBookingId = `DRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Write strictly to Firebase Firestore first
      const resolvedCustomerName = data.customerName?.trim() || cleanPhone;
      const bookingDocData = {
        bookingId: uniqueBookingId,
        customerPhone: cleanPhone,
        customerName: resolvedCustomerName,
        carMake: data.carMake.trim(),
        carModel: `${data.carMake.trim()} ${data.carModel.trim()} ${data.carYear.trim()}`,
        carYear: data.carYear.trim(),
        serviceType: serviceTitle,
        notes: data.description.trim(),
        location: locationName || 'جدة',
        coordinates: coords || null,
        status: 'new',
        cost: 0,
        source: 'website',
        createdAt: serverTimestamp(),
        serviceDate: new Date().toISOString().split('T')[0]
      };

      await addDoc(collection(db, 'maintenance'), bookingDocData);
      
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
            serviceDate: new Date().toLocaleDateString('ar-SA')
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

        const tgText = `🔔 <b>حجز جديد مؤكد في DR.FIX!</b> 🚗⚡\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🔖 <b>رقم الحجز:</b> <code>${safeBkId}</code>\n` +
          `👤 <b>العميل:</b> <code>${safePhone}</code>\n` +
          `🚘 <b>السيارة:</b> ${safeCar}\n` +
          `🔧 <b>الخدمة:</b> ${safeService}\n` +
          `📍 <b>الموقع:</b> ${safeLoc}\n` +
          `📝 <b>الوصف:</b> ${safeDesc}\n` +
          `⏰ <b>الوقت:</b> ${safeTime}\n` +
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
        (coords ? `*الموقع الجغرافي:* https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : `*المدينة:* جدة`)
      ) : (
        `*Confirmed Booking Request from DR.FIX*\n` +
        `🔖 *Booking ID:* ${uniqueBookingId}\n\n` +
        `*Car Make:* ${data.carMake}\n` +
        `*Car Model:* ${data.carModel}\n` +
        `*Year:* ${data.carYear}\n` +
        `*Service:* ${serviceTitle}\n` +
        `*Issue:* ${data.description}\n` +
        `*Phone:* ${cleanPhone}\n` +
        (coords ? `*Location:* https://www.google.com/maps?q=${coords.latitude},${coords.longitude}` : `*City:* Jeddah`)
      );

      // 4. Show Success & Redirect to WhatsApp
      setTimeout(() => {
        setIsLoading(false);
        setIsSubmitted(true);

        const targetPhone = (settings?.whatsapp || '966546870807').replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`;
        window.open(whatsappUrl, '_blank');

        setTimeout(() => {
          setIsSubmitted(false);
          reset();
          setCoords(null);
          setLocationName('');
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
    <section id="booking" className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
        <motion.div 
          whileHover={{ rotateX: 1, rotateY: -1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-6 md:p-12 border-brand-red/20 shadow-2xl relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className={cn("text-center mb-10 md:mb-12", lang === 'en' && "md:text-left")}>
            <h2 className="text-2xl md:text-3xl font-display font-black mb-4 italic">
              {t.booking.title} <span className="text-brand-red">{t.booking.titleAccent}</span>
            </h2>
            <p className="text-gray-400">{t.booking.description}</p>
          </div>

          {bookingError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p>{bookingError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
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

            {/* GPS Location Selector */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-right">
                <span className="text-2xl">📍</span>
                <div>
                  <div className="text-sm font-bold text-white">
                    {coords ? (lang === 'ar' ? 'تم تحديد موقعك بدقة (GPS)' : 'Location captured (GPS)') : (lang === 'ar' ? 'تحديد موقع السيارة عند المنزل/العمل' : 'Car location at your spot')}
                  </div>
                  <div className="text-xs text-gray-400">
                    {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : (lang === 'ar' ? 'اضغط لتوجيه الفني إليك مباشرة عبر Google Maps' : 'Click to send Google Maps pin to the mechanic')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0",
                  coords 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                    : "bg-brand-red/20 text-brand-red border border-brand-red/30 hover:bg-brand-red hover:text-white"
                )}
              >
                {locating ? (lang === 'ar' ? 'جارٍ التحديد...' : 'Locating...') : (coords ? (lang === 'ar' ? '✓ تم تحديد الموقع' : '✓ Location Set') : (lang === 'ar' ? '📍 تحديد موقعي الحالي' : '📍 Detect Location'))}
              </button>
            </div>

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
                    رقم الحجز: {confirmedBookingId}
                  </div>
                )}
                <p className="text-gray-300 text-base max-w-md">{t.booking.successDesc}</p>
                <p className="text-xs text-gray-400 mt-3">تم فتح محادثة WhatsApp تلقائياً لتأكيد التفاصيل مع المهندس.</p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold text-sm transition-all cursor-pointer"
                >
                  {t.booking.close}
                </button>
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
  const safeName = name && name.trim() ? name.trim() : (lang === 'ar' ? 'زائر' : 'Guest');
  const initial = safeName.charAt(0).toUpperCase();
  const safeRating = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : 5;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-card p-5 sm:p-6 border-white/5 hover:border-brand-red/30 transition-all shadow-xl h-full flex flex-col justify-between overflow-hidden whitespace-normal break-words"
    >
      <div>
        <div className="flex gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={cn("w-4 h-4", i < safeRating ? "text-yellow-500 fill-yellow-500" : "text-gray-600")} />
          ))}
        </div>
        <p className="text-gray-300 text-xs sm:text-sm italic mb-4 leading-relaxed whitespace-pre-line break-words">
          "{comment || (lang === 'ar' ? 'لا يوجد تعليق' : 'No comment')}"
        </p>
      </div>

      <div>
        {reply && (
          <div className={cn("mb-4 bg-brand-red/10 p-3", lang === 'ar' ? "border-r-2 border-brand-red rounded-l-xl" : "border-l-2 border-brand-red rounded-r-xl")}>
            <div className="text-[10px] font-bold text-brand-red uppercase tracking-widest mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {t.testimonials.adminReply}
            </div>
            <p className="text-gray-300 text-xs italic leading-relaxed break-words">{reply}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
          <div className="w-10 h-10 bg-brand-red/20 border border-brand-red/30 rounded-full flex items-center justify-center font-bold text-brand-red text-base shrink-0">
            {initial}
          </div>
          <span className="font-bold text-sm text-white truncate">{safeName}</span>
        </div>
      </div>
    </motion.div>
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
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
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
      setLoading(false);
    }, (error) => {
      console.error("Error fetching testimonials:", error);
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

  const displayData = React.useMemo(() => [...testimonials, ...STATIC_TESTIMONIALS], [testimonials]);

  if (loading) return null;

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-brand-dark relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 md:mb-16 gap-6">
          <div className={cn("text-center md:text-right", lang === 'en' && "md:text-left")}>
            <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
              {t.testimonials.title} <span className="text-brand-red">{t.testimonials.titleAccent}</span>
            </h2>
            <div className={cn("w-20 md:w-24 h-1.5 bg-brand-red mx-auto md:mx-0 rounded-full", lang === 'en' && "md:mr-0 md:ml-auto")} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll(lang === 'ar' ? 'right' : 'left')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer"
              aria-label="Previous testimonials"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll(lang === 'ar' ? 'left' : 'right')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all cursor-pointer"
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
            "flex overflow-x-auto gap-4 md:gap-6 pb-8 no-scrollbar touch-pan-x select-none",
            isMouseDown ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {displayData.map((review, idx) => (
            <div key={review.id || idx} className="w-[85vw] max-w-[320px] sm:max-w-[360px] md:max-w-[380px] shrink-0">
              <TestimonialCard 
                name={review.name} 
                comment={review.comment} 
                rating={review.rating} 
                reply={review.reply}
              />
            </div>
          ))}
        </div>

        <div className="mt-12 md:mt-16 max-w-2xl mx-auto">
          <AddTestimonialForm />
        </div>
      </div>
    </section>
  );
};

const AddTestimonialForm = () => {
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t, lang } = useLanguage();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string, comment: string }>();

  const onSubmit = async (data: { name: string, comment: string }) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonials'), {
        name: data.name.trim(),
        comment: data.comment.trim(),
        rating: rating,
        createdAt: serverTimestamp()
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
          `👤 <b>العميل:</b> ${data.name.trim()}\n` +
          `⭐ <b>التقييم:</b> ${stars} (${rating}/5)\n` +
          `💬 <b>التعليق:</b> ${data.comment.trim()}\n` +
          `⏱️ <b>الوقت:</b> ${new Date().toLocaleString('ar-SA')}\n` +
          `━━━━━━━━━━━━━━━━━━`;
        sendTelegramNotification(tgReviewText);
      }

      setIsSuccess(true);
      reset();
      setRating(5);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (error) {
      console.error("Error adding testimonial:", error);
      handleFirestoreError(error, OperationType.CREATE, 'testimonials');
      alert(lang === 'ar' ? "حدث خطأ أثناء إضافة التعليق. يرجى المحاولة مرة أخرى." : "An error occurred while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-6 md:p-8 border-brand-red/10">
      <h3 className="text-xl md:text-2xl font-display font-black mb-6 italic text-center">
        {t.testimonials.addTitle} <span className="text-brand-red">{t.testimonials.addTitleAccent}</span>
      </h3>
      
      {isSuccess ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-lg md:text-xl font-bold text-white">{t.testimonials.thankYou}</p>
          <p className="text-gray-400 text-sm mt-1">{t.testimonials.successMessage}</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110 p-1"
                aria-label={`Rating ${star} stars`}
              >
                <Star 
                  className={cn(
                    "w-7 h-7 md:w-8 md:h-8", 
                    star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                  )} 
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <input 
              {...register('name', { required: true })}
              placeholder={t.testimonials.namePlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all text-sm md:text-base text-white"
            />
            {errors.name && <span className="text-brand-red text-xs">{t.testimonials.nameError}</span>}
          </div>

          <div className="space-y-2">
            <textarea 
              {...register('comment', { required: true })}
              rows={3}
              placeholder={t.testimonials.commentPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all resize-none text-sm md:text-base text-white"
            />
            {errors.comment && <span className="text-brand-red text-xs">{t.testimonials.commentError}</span>}
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-red/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {t.testimonials.submitReview}
                <Send className={cn("w-4 h-4", lang === 'ar' ? "" : "rotate-180")} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

interface MaintenanceRecord {
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
  cost?: number;
  status: 'new' | 'pending' | 'accepted' | 'on_the_way' | 'in-progress' | 'completed' | 'cancelled';
  createdAt?: any;
}

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
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'service' | 'offer' | 'gallery' | 'booking' | 'testimonial' } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'calendar' | 'customers' | 'testimonials' | 'notifications' | 'analytics' | 'payments' | 'reports' | 'content' | 'settings' | 'staff'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branding' | 'hero' | 'contact' | 'sections' | 'seo' | 'footer' | 'maintenance' | 'notifications'>('general');
  const [contentTab, setContentTab] = useState<'services' | 'offers' | 'gallery'>('services');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'new' | 'pending' | 'accepted' | 'on_the_way' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<MaintenanceRecord | null>(null);
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
          `إذا كان لديك أي استفسار أو ترغب في إعادة الجدولة، يسعدنا تواصلكم دائماً 🚗⚡`;
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
    enableSoundAlerts: settings.enableSoundAlerts ?? true
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
      enableSoundAlerts: settings.enableSoundAlerts ?? true
    });
  }, [settings]);

  useEffect(() => {
    if (isAdmin) {
      // Request notification permission
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }

      // Maintenance
      const qM = query(collection(db, 'maintenance'), orderBy('serviceDate', 'desc'));
      let isInitialLoad = true;

      const unsubM = onSnapshot(qM, (snapshot) => {
        const results: MaintenanceRecord[] = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !isInitialLoad) {
            const newBooking = change.doc.data() as MaintenanceRecord;
            if (settings.enableSoundAlerts !== false) {
              playNotificationSound();
            }
            if (Notification.permission === "granted") {
              new Notification("حجز جديد! 🚗", {
                body: `حجز جديد لسيارة ${newBooking.carModel} - ${newBooking.serviceType}`,
                icon: settings.logoUrl || "/favicon.ico"
              });
            }
          }
        });

        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as MaintenanceRecord);
        });
        setRecords(results);
        isInitialLoad = false;
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'maintenance'));

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
      const qStaff = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
      const unsubStaff = onSnapshot(qStaff, (snapshot) => {
        const results: StaffUser[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as StaffUser);
        });
        setStaffList(results);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'staff'));

      return () => {
        unsubM();
        unsubT();
        unsubO();
        unsubS();
        unsubG();
        unsubStaff();
      };
    }
  }, [isAdmin]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem && editingItem.type === 'booking') {
        await updateDoc(doc(db, 'maintenance', editingItem.id), {
          ...formData,
          cost: Number(formData.cost)
        });
      } else {
        await addDoc(collection(db, 'maintenance'), {
          ...formData,
          cost: Number(formData.cost),
          serviceDate: serverTimestamp(),
          status: 'pending'
        });
      }
      setFormData({ customerPhone: '', carModel: '', serviceType: '', notes: '', cost: '', status: 'pending' });
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

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressed = await compressImage(base64String);
      
      if (type === 'gallery') {
        setGalleryForm({ ...galleryForm, imageUrl: compressed });
      } else if (type === 'hero') {
        setSettingsForm({ ...settingsForm, heroImageUrl: compressed });
      } else {
        setSettingsForm({ ...settingsForm, logoUrl: compressed });
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

  const handleEdit = (type: 'service' | 'offer' | 'gallery' | 'booking' | 'testimonial', item: any) => {
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

  const handleDelete = async (collectionName: string, id: string) => {
    if (window.confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
      }
    }
  };

  const handleUpdateStatus = (id: string, newStatus: MaintenanceRecord['status']) => {
    const target = records.find(r => r.id === id);
    let waUrl = '';
    let statusLabelAr = 'تحديث الحالة';
    if (newStatus === 'accepted') statusLabelAr = 'تم القبول ✅';
    if (newStatus === 'on_the_way') statusLabelAr = 'الفني بالطريق 🚗';
    if (newStatus === 'in-progress') statusLabelAr = 'قيد العمل 🔧';
    if (newStatus === 'completed') statusLabelAr = 'تم الإنجاز 🏁';
    if (newStatus === 'cancelled') statusLabelAr = 'ملغي ❌';
    if (newStatus === 'new') statusLabelAr = 'جديد 🆕';

    if (target && target.customerPhone) {
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
      pending: { label: 'قيد الانتظار', count: 0, color: '#EAB308' },
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

  const userPermissions: StaffPermissions = currentStaffUser?.permissions || DEFAULT_SUPER_ADMIN_PERMISSIONS;

  const allowedNavTabs = [
    { id: 'dashboard', label: 'الإحصائيات ونظرة عامة', icon: BarChart, allowed: userPermissions.canViewDashboard !== false },
    { id: 'bookings', label: 'الحجوزات والعمليات', icon: Calendar, allowed: userPermissions.canManageBookings !== false },
    { id: 'calendar', label: 'التقويم والمواعيد', icon: CalendarCheck, allowed: userPermissions.canViewCalendar !== false },
    { id: 'customers', label: 'العملاء وسجل السيارات', icon: User, allowed: userPermissions.canManageCustomers !== false },
    { id: 'testimonials', label: 'التقييمات والآراء', icon: MessageSquare, allowed: userPermissions.canManageTestimonials !== false },
    { id: 'notifications', label: 'الإشعارات وتيليجرام', icon: Bell, allowed: userPermissions.canManageNotifications !== false },
    { id: 'analytics', label: 'التحليلات المالية والنمو', icon: TrendingUp, allowed: userPermissions.canViewAnalytics !== false },
    { id: 'payments', label: 'المدفوعات اليدوية والرقابة (RBAC)', icon: DollarSign, allowed: userPermissions.canManagePayments !== false },
    { id: 'reports', label: 'التقارير وسندات الصيانة (Word & PDF)', icon: Printer, allowed: userPermissions.canViewReports !== false },
    { id: 'content', label: 'إدارة المحتوى والعروض', icon: FileText, allowed: userPermissions.canManageContent !== false },
    { id: 'settings', label: 'الإعدادات العامة والهوية', icon: Settings, allowed: userPermissions.canManageSettings !== false },
    { id: 'staff', label: 'فريق العمل والصلاحيات', icon: ShieldCheck, allowed: userPermissions.canManageStaff !== false },
  ].filter(tab => tab.allowed);

  useEffect(() => {
    if (allowedNavTabs.length > 0 && !allowedNavTabs.some(t => t.id === activeTab)) {
      setActiveTab(allowedNavTabs[0].id as any);
    }
  }, [currentStaffUser]);

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section id="admin" className="py-24 bg-brand-black border-t border-white/5 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-between items-center gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-display font-black italic mb-2">لوحة تحكم <span className="text-brand-red">المركز والعمليات</span></h2>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>إدارة الخدمات وفريق العمل</span>
              <span className="w-1 h-1 bg-gray-700 rounded-full" />
              <span>{records.length} حجز إجمالي</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Logged-in Staff Badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white/5 border border-white/10 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red font-bold text-xs">
                {currentStaffUser?.fullName?.charAt(0) || 'D'}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white line-clamp-1">
                  {currentStaffUser?.fullName || 'المدير العام'}
                </div>
                <div className="text-[10px] text-brand-red font-semibold">
                  {currentStaffUser?.roleTitleAr || (currentStaffUser?.role === 'super_admin' ? 'مدير عام' : 'موظف')}
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-xs sm:text-sm hover:bg-white/10 transition-all text-gray-300"
            >
              <ArrowRight className="w-4 h-4" />
              الموقع
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
                "p-2.5 sm:p-3 border rounded-xl transition-all cursor-pointer",
                settingsForm.enableSoundAlerts !== false 
                  ? "bg-brand-red/10 border-brand-red/30 text-brand-red" 
                  : "bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10"
              )}
              title={settingsForm.enableSoundAlerts !== false ? "الصوت مفعل للحجوزات الجديدة (اضغط للتعطيل)" : "تفعيل الصوت التنبيهي"}
            >
              {settingsForm.enableSoundAlerts !== false ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* PWA Install Button */}
            <button
              onClick={handleInstallPWA}
              className={cn(
                "hidden sm:flex items-center gap-2 px-4 py-2.5 border rounded-xl font-bold text-xs transition-all cursor-pointer",
                isPWAInstalled 
                  ? "bg-green-500/10 border-green-500/20 text-green-400" 
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              )}
              title="تثبيت لوحة التحكم كتطبيق مستقل على جوالك أو جهازك"
            >
              <Download className="w-4 h-4 text-brand-red" />
              <span>{isPWAInstalled ? "التطبيق مثبت ✓" : "تثبيت كتطبيق (PWA)"}</span>
            </button>

            {typeof Notification !== 'undefined' && (
              <button 
                onClick={() => {
                  if (notificationPermission === 'default') {
                    Notification.requestPermission().then(setNotificationPermission);
                  } else if (notificationPermission === 'granted') {
                    new Notification("تنبيه تجريبي 🚗", {
                      body: "التنبيهات تعمل بنجاح في متصفحك!",
                      icon: settings.logoUrl || "/favicon.ico"
                    });
                  } else {
                    alert("التنبيهات محظورة في متصفحك. يرجى تفعيلها من إعدادات المتصفح.");
                  }
                }}
                className={cn(
                  "p-2.5 sm:p-3 border rounded-xl transition-all cursor-pointer",
                  notificationPermission === 'granted' ? "bg-green-500/10 border-green-500/20 text-green-500" : 
                  notificationPermission === 'denied' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                  "bg-white/5 border-white/10 text-yellow-500 hover:bg-white/10"
                )}
                title={notificationPermission === 'granted' ? "التنبيهات مفعلة (اضغط للتجربة)" : "تفعيل التنبيهات"}
              >
                {notificationPermission === 'granted' ? <Bell className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </button>
            )}

            {userPermissions.canManageBookings !== false && (
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-red rounded-xl font-bold italic hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 cursor-pointer text-white text-xs sm:text-sm"
              >
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                إضافة حجز
              </button>
            )}

            <button 
              onClick={onLogout}
              className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-gray-400 cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-8 bg-white/5 p-2 rounded-2xl border border-white/5 no-scrollbar">
          {allowedNavTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shrink-0 text-xs sm:text-sm whitespace-nowrap cursor-pointer",
                activeTab === tab.id 
                  ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => setIsAdding(true)} className="p-4 glass-card border-brand-red/20 flex flex-col items-center justify-center gap-2 hover:bg-brand-red/5 transition-all group text-center">
                  <PlusCircle className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">حجز جديد</span>
                </button>
                <button onClick={() => { setActiveTab('content'); setContentTab('offers'); }} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center">
                  <Tag className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة العروض الخاصة</span>
                </button>
                <button onClick={() => { setActiveTab('content'); setContentTab('services'); }} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center">
                  <Wrench className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة الخدمات</span>
                </button>
                <button onClick={() => { setActiveTab('content'); setContentTab('gallery'); }} className="p-4 glass-card border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group text-center">
                  <Camera className="w-6 h-6 text-brand-red group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold italic">إدارة المعرض</span>
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
                <div className="text-gray-500 text-sm mb-2">إجمالي الإيرادات</div>
                <div className="text-4xl font-display font-black text-brand-red">
                  {records.reduce((acc, curr) => acc + (curr.cost || 0), 0).toLocaleString()} <span className="text-sm">ريال</span>
                </div>
                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-red" style={{ width: '85%' }} />
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
                  {offers.length + STATIC_OFFERS.filter(so => !offers.some(o => o.title === so.title)).length}
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
                        <div className="text-sm font-bold">{record.cost} ريال</div>
                        <div className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                          record.status === 'completed' ? "text-green-500 bg-green-500/10" :
                          record.status === 'in-progress' ? "text-blue-500 bg-blue-500/10" :
                          "text-yellow-500 bg-yellow-500/10"
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
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Status Filter Badges */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'الكل', count: records.length },
                      { id: 'new', label: 'جديد', count: records.filter(r => r.status === 'new').length },
                      { id: 'accepted', label: 'تم القبول', count: records.filter(r => r.status === 'accepted').length },
                      { id: 'on_the_way', label: 'الفني بالطريق', count: records.filter(r => r.status === 'on_the_way').length },
                      { id: 'in-progress', label: 'قيد العمل', count: records.filter(r => r.status === 'in-progress').length },
                      { id: 'completed', label: 'مكتمل', count: records.filter(r => r.status === 'completed').length },
                      { id: 'cancelled', label: 'ملغي', count: records.filter(r => r.status === 'cancelled').length },
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
                          totalRevenue: records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0),
                          avgTicket: Math.round(records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0) / (records.length || 1)),
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
                    placeholder="ابحث برقم الجوال، نوع السيارة، الخدمة، أو رقم الحجز..."
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

              {/* Bookings Table (Desktop) / Cards (Mobile) */}
              <div className="glass-card overflow-hidden border-white/5">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">السيارة والتاريخ</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">العميل والموقع</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">الخدمة والملاحظات</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">الحالة</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">التكلفة</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {records
                        .filter(r => bookingStatusFilter === 'all' || r.status === bookingStatusFilter)
                        .filter(r => {
                          if (!bookingSearch.trim()) return true;
                          const q = bookingSearch.toLowerCase().trim();
                          return (
                            (r.bookingId || '').toLowerCase().includes(q) ||
                            (r.customerPhone || '').toLowerCase().includes(q) ||
                            (r.carModel || '').toLowerCase().includes(q) ||
                            (r.serviceType || '').toLowerCase().includes(q) ||
                            (r.location || '').toLowerCase().includes(q) ||
                            (r.notes || '').toLowerCase().includes(q)
                          );
                        })
                        .map((record) => {
                          const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
                          const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
                          const waCustomer = (record.customerName || record.name || '').trim();
                          const waMsg = encodeURIComponent(`🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n${waCustomer ? `هلا ${waCustomer} 👋\n` : 'هلا بك 👋\n'}بخصوص حجزك (${record.bookingId || ''}) لسيارة (${record.carModel}) لخدمة (${record.serviceType || 'صيانة متنقلة'})\n\nكيف نقدر نخدمك؟ 🔧⚡`);
                          const rDate = getRecordDate(record.serviceDate);

                          return (
                            <tr key={record.id} className="hover:bg-white/5 transition-colors">
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
                                    href={`https://wa.me/${waPhone}?text=${waMsg}`}
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
                                <div className="text-sm font-bold text-white">{record.serviceType}</div>
                                {record.notes && (
                                  <div className="text-xs text-gray-400 italic line-clamp-1 max-w-xs mt-0.5" title={record.notes}>
                                    "{record.notes}"
                                  </div>
                                )}
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
                                      "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                                    )}
                                  >
                                    <option value="new" className="bg-brand-dark text-purple-400">جديد</option>
                                    <option value="pending" className="bg-brand-dark text-yellow-400">قيد الانتظار</option>
                                    <option value="accepted" className="bg-brand-dark text-emerald-400">تم القبول</option>
                                    <option value="on_the_way" className="bg-brand-dark text-indigo-400">الفني بالطريق</option>
                                    <option value="in-progress" className="bg-brand-dark text-blue-400">قيد العمل</option>
                                    <option value="completed" className="bg-brand-dark text-green-400">مكتمل</option>
                                    <option value="cancelled" className="bg-brand-dark text-red-400">ملغي</option>
                                  </select>

                                  {/* Fast Direct WhatsApp Trigger Pills */}
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
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-display font-black text-brand-red text-base">
                                  {record.cost ? `${record.cost} ريال` : 'غير محدد'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-1">
                                  <a
                                    href={getWhatsAppStatusUrl(record, record.status)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                    title="إرسال إشعار الحالة للعميل عبر الواتساب"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </a>
                                  <button 
                                    onClick={() => setSelectedBookingDetails(record)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleEdit('booking', record)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                    title="تعديل الحجز"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete('maintenance', record.id)}
                                    className="p-2 text-gray-400 hover:text-brand-red hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                    title="حذف الحجز"
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
                <div className="md:hidden divide-y divide-white/5">
                  {records
                    .filter(r => bookingStatusFilter === 'all' || r.status === bookingStatusFilter)
                    .filter(r => {
                      if (!bookingSearch.trim()) return true;
                      const q = bookingSearch.toLowerCase().trim();
                      return (
                        (r.bookingId || '').toLowerCase().includes(q) ||
                        (r.customerPhone || '').toLowerCase().includes(q) ||
                        (r.carModel || '').toLowerCase().includes(q) ||
                        (r.serviceType || '').toLowerCase().includes(q) ||
                        (r.notes || '').toLowerCase().includes(q)
                      );
                    })
                    .map((record) => {
                      const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
                      const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
                      const waCustomer = (record.customerName || record.name || '').trim();
                      const waMsg = encodeURIComponent(`🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n${waCustomer ? `هلا ${waCustomer} 👋\n` : 'هلا بك 👋\n'}بخصوص حجزك (${record.bookingId || ''}) لسيارة (${record.carModel})\n\nكيف نقدر نخدمك؟ 🔧⚡`);
                      const rDate = getRecordDate(record.serviceDate);

                      return (
                        <div key={record.id} className="p-4 space-y-3 bg-black/20">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-white text-base flex items-center gap-1.5">
                                <span>{record.carModel}</span>
                                {record.bookingId && (
                                  <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                                    {record.bookingId}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-gray-500" />
                                {rDate.toLocaleDateString('ar-SA')}
                              </div>
                            </div>
                            <select 
                              value={record.status}
                              onChange={(e) => handleUpdateStatus(record.id, e.target.value as any)}
                              className={cn(
                                "text-xs font-bold px-3 py-1 rounded-full bg-black/60 border outline-none cursor-pointer",
                                record.status === 'completed' ? "text-green-500 border-green-500/30 bg-green-500/10" :
                                record.status === 'accepted' ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                record.status === 'on_the_way' ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" :
                                record.status === 'in-progress' ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                                record.status === 'cancelled' ? "text-red-400 border-red-500/30 bg-red-500/10" :
                                record.status === 'new' ? "text-purple-400 border-purple-500/30 bg-purple-500/10" :
                                "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                              )}
                            >
                              <option value="new" className="bg-brand-dark text-purple-400">جديد</option>
                              <option value="pending" className="bg-brand-dark text-yellow-400">قيد الانتظار</option>
                              <option value="accepted" className="bg-brand-dark text-emerald-400">تم القبول</option>
                              <option value="on_the_way" className="bg-brand-dark text-indigo-400">الفني بالطريق</option>
                              <option value="in-progress" className="bg-brand-dark text-blue-400">قيد العمل</option>
                              <option value="completed" className="bg-brand-dark text-green-400">مكتمل</option>
                              <option value="cancelled" className="bg-brand-dark text-red-400">ملغي</option>
                            </select>
                          </div>

                          <div className="bg-white/5 p-3 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between text-gray-300">
                              <span className="text-gray-500">الخدمة:</span>
                              <span className="font-bold text-white">{record.serviceType}</span>
                            </div>
                            {record.cost && (
                              <div className="flex justify-between text-gray-300">
                                <span className="text-gray-500">التكلفة:</span>
                                <span className="font-bold text-brand-red">{record.cost} ريال</span>
                              </div>
                            )}
                            {record.notes && (
                              <div className="text-gray-400 italic pt-1 border-t border-white/5">
                                "{record.notes}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <a
                                href={getWhatsAppStatusUrl(record, 'on_the_way')}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleUpdateStatus(record.id, 'on_the_way')}
                                className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                                title="الفني بالطريق وإرسال واتساب"
                              >
                                🚗 بالطريق
                              </a>
                              <a
                                href={getWhatsAppStatusUrl(record, 'accepted')}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleUpdateStatus(record.id, 'accepted')}
                                className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                                title="قبول الحجز وإرسال واتساب"
                              >
                                ✅ قبول
                              </a>
                              <a 
                                href={`https://wa.me/${waPhone}?text=${waMsg}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                واتساب
                              </a>
                              <a 
                                href={`tel:${record.customerPhone}`}
                                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                اتصال
                              </a>
                              {record.coordinates?.latitude && record.coordinates?.longitude && (
                                <a 
                                  href={`https://www.google.com/maps?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  GPS
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <a
                                href={getWhatsAppStatusUrl(record, record.status)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-emerald-400 hover:text-white bg-emerald-500/10 border border-emerald-500/20 rounded-xl cursor-pointer"
                                title="إرسال إشعار الحالة للعميل عبر الواتساب"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                              <button 
                                onClick={() => setSelectedBookingDetails(record)}
                                className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl cursor-pointer"
                                title="عرض التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEdit('booking', record)}
                                className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-xl cursor-pointer"
                                title="تعديل الحجز"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete('maintenance', record.id)}
                                className="p-2 text-gray-400 hover:text-brand-red bg-white/5 rounded-xl cursor-pointer"
                                title="حذف الحجز"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {records.length === 0 && (
                  <div className="py-16 text-center text-gray-500 space-y-3">
                    <Calendar className="w-12 h-12 text-gray-700 mx-auto" />
                    <p className="font-bold">لا توجد أي حجوزات مسجلة حتى الآن</p>
                    <button 
                      onClick={() => {
                        setFormData({ customerPhone: '', carModel: '', serviceType: '', notes: '', cost: '', status: 'pending' });
                        setEditingItem(null);
                        setIsAdding(true);
                      }}
                      className="px-6 py-2.5 bg-brand-red rounded-xl text-xs font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-brand-red/20 cursor-pointer"
                    >
                      إضافة أول حجز
                    </button>
                  </div>
                )}
              </div>
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
                      {records.filter(r => {
                        const d = getRecordDate(r.serviceDate);
                        return d.getFullYear() === calendarMonth.getFullYear() && d.getMonth() === calendarMonth.getMonth();
                      }).length}
                    </span>
                    <span className="text-xs text-gray-500 mr-2">حجز مسجل</span>
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
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const dayBookings = records.filter(r => {
                          const d = getRecordDate(r.serviceDate);
                          return d.toISOString().split('T')[0] === dateStr;
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
                        {records.filter(r => getRecordDate(r.serviceDate).toDateString() === selectedCalendarDate.toDateString()).length} مواعيد مجدولة
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({
                          customerPhone: '',
                          carModel: '',
                          serviceType: '',
                          notes: '',
                          cost: '',
                          status: 'pending'
                        });
                        setIsAdding(true);
                      }}
                      className="p-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-xl transition-all cursor-pointer"
                      title="حجز موعد جديد في هذا اليوم"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                    {records
                      .filter(r => getRecordDate(r.serviceDate).toDateString() === selectedCalendarDate.toDateString())
                      .map((record) => {
                        const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
                        const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
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
                                "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
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
                                onClick={() => setSelectedBookingDetails(record)}
                                className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-white/5 rounded-lg"
                              >
                                عرض التفاصيل
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {records.filter(r => getRecordDate(r.serviceDate).toDateString() === selectedCalendarDate.toDateString()).length === 0 && (
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
          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Financial & Performance KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(() => {
                  const totalRevenue = records.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
                  const completedBookings = records.filter(r => r.status === 'completed').length;
                  const completionRate = records.length > 0 ? Math.round((completedBookings / records.length) * 100) : 100;
                  const avgTicket = completedBookings > 0 ? Math.round(totalRevenue / completedBookings) : (totalRevenue > 0 ? Math.round(totalRevenue / records.length) : 0);

                  return (
                    <>
                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">إجمالي الإيرادات</div>
                        <div className="text-3xl font-black font-display text-white">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-brand-red">ريال</span></div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-green-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>إيرادات كل العمليات المنجزة</span>
                        </div>
                      </div>

                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">متوسط قيمة الحجز</div>
                        <div className="text-3xl font-black font-display text-white">{avgTicket} <span className="text-sm font-normal text-brand-red">ريال</span></div>
                        <div className="mt-3 text-xs text-gray-400">لكل عملية صيانة</div>
                      </div>

                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">نسبة إنجاز الحجوزات</div>
                        <div className="text-3xl font-black font-display text-green-400">{completionRate}%</div>
                        <div className="mt-3 text-xs text-gray-400">{completedBookings} حجز مكتمل من {records.length}</div>
                      </div>

                      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
                        <div className="text-xs text-gray-400 mb-1">إجمالي الحجوزات</div>
                        <div className="text-3xl font-black font-display text-white">{records.length} <span className="text-sm font-normal text-gray-400">طلب</span></div>
                        <div className="mt-3 text-xs text-blue-400">طلبات الصيانة المتنقلة بجدة</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 7-Day Revenue & Volume Trend Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">منحنى الإيرادات الأسبوعية (آخر 7 أيام)</h3>
                      <p className="text-xs text-gray-400">تتبع يومي للمبيعات وعدد الحجوزات</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-brand-red" />
                      <span className="text-xs text-gray-400">الإيراد (ريال)</span>
                    </div>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getChartData()}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E31837" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#E31837" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="name" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                          formatter={(val: any, name: string) => [
                            name === 'revenue' ? `${val} ريال` : `${val} حجز`,
                            name === 'revenue' ? 'الإيراد' : 'عدد الحجوزات'
                          ]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#E31837" strokeWidth={3} fillOpacity={1} fill="url(#revenueGrad)" />
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

          {activeTab === 'payments' && (
            <motion.div 
              key="payments"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <ManualPaymentsManager />
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <ReportsView records={records} />
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Content Sub-tabs */}
              <div className="flex gap-4 border-b border-white/5 pb-4">
                {[
                  { id: 'services', label: 'الخدمات' },
                  { id: 'offers', label: 'العروض الخاصة' },
                  { id: 'gallery', label: 'المعرض' },
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...offers, ...STATIC_OFFERS.filter(so => !offers.some(o => o.title === so.title)).map(so => ({ ...so, id: 'static-' + so.id, isStatic: true }))].map((o) => (
                    <div key={o.id} className="glass-card p-6 border-white/5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="font-display font-black text-brand-red text-xl">{o.price}</div>
                          <button 
                            onClick={() => ! (o as any).isStatic && handleToggleOfferStatus(o.id, o.active !== false)}
                            disabled={(o as any).isStatic}
                            className={cn(
                              "text-[10px] px-2 py-1 rounded-full font-bold",
                              o.active !== false ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-gray-500/10 text-gray-500 border border-gray-500/20",
                              (o as any).isStatic && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {o.active !== false ? 'نشط' : 'متوقف'}
                          </button>
                          {(o as any).isStatic && (
                            <span className="text-[10px] bg-brand-red/20 text-brand-red px-2 py-1 rounded-full font-bold">افتراضي</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit('offer', o)} className="text-gray-600 hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </button>
                          {! (o as any).isStatic && (
                            <button onClick={() => handleDelete('offers', o.id)} className="text-gray-600 hover:text-brand-red transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="font-bold mb-2">{o.title}</h4>
                      <div className="text-xs text-gray-500">{o.features.length} مميزات</div>
                    </div>
                  ))}
                  {offers.length === 0 && STATIC_OFFERS.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 py-12 text-center glass-card border-dashed border-white/10">
                      <Tag className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 mb-6">لا توجد عروض مضافة حالياً</p>
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-2 bg-brand-red/10 text-brand-red border border-brand-red/20 rounded-lg font-bold text-sm hover:bg-brand-red hover:text-white transition-all"
                      >
                        إضافة أول عرض
                      </button>
                    </div>
                  )}
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
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div 
              key="customers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="glass-card p-8 border-white/5">
                <h3 className="text-xl font-bold mb-6">البحث عن سجل عميل</h3>
                <div className="flex gap-4">
                  <input 
                    type="tel"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    placeholder="أدخل رقم الجوال..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-6 py-4 outline-none focus:border-brand-red transition-all"
                  />
                  <button 
                    className="px-8 bg-brand-red rounded-xl font-bold flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    بحث
                  </button>
                </div>
              </div>

              {/* Customer History List */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-500">
                  {searchPhone.trim() ? `نتائج البحث (${records.filter(r => r.customerPhone.includes(searchPhone.trim())).length})` : `جميع السجلات (${records.length})`}
                </h4>
                {(searchPhone.trim() ? records.filter(r => r.customerPhone.includes(searchPhone.trim())) : records).map((record) => (
                  <div key={record.id} className="glass-card p-6 border-white/5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">{record.carModel}</div>
                        <div className="text-sm text-gray-500">
                          {record.customerPhone} • {getRecordDate(record.serviceDate || record.createdAt).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                      <div className="text-brand-red font-display font-black text-xl">{record.cost} ريال</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/5 p-3 rounded-lg">
                        <div className="text-gray-500 text-xs mb-1">الخدمة</div>
                        <div className="font-bold">{record.serviceType}</div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg">
                        <div className="text-gray-500 text-xs mb-1">الحالة</div>
                        <div className={cn(
                          "font-bold",
                          record.status === 'completed' ? "text-green-500" : "text-yellow-500"
                        )}>
                          {record.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                        </div>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="bg-white/5 p-3 rounded-lg">
                        <div className="text-gray-500 text-xs mb-1">ملاحظات الفني</div>
                        <p className="text-gray-400 italic text-xs">{record.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
                {(searchPhone.trim() ? records.filter(r => r.customerPhone.includes(searchPhone.trim())) : records).length === 0 && (
                  <div className="text-center py-12 glass-card border-white/5 text-gray-500 italic">
                    لا توجد سجلات مطابقة
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'testimonials' && (
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
                      جميع التقييمات ({testimonials.length + STATIC_TESTIMONIALS.length})
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
                        <Star className="w-3 h-3 fill-current text-yellow-400 inline" />
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
                {[...testimonials, ...STATIC_TESTIMONIALS.map(st => ({ ...st, id: 'static-' + st.name, isStatic: true }))]
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
                  .map((t) => {
                    const displayName = t.name && t.name.trim() ? t.name.trim() : 'زائر';
                    const initialChar = displayName.charAt(0).toUpperCase();
                    const starRating = typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5 ? t.rating : 5;

                    return (
                      <div key={t.id || displayName} className="glass-card p-6 border-white/5 space-y-4 hover:border-white/10 transition-colors">
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

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
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
                    <button
                      onClick={handleInstallPWA}
                      className="px-6 py-3.5 bg-gradient-to-r from-brand-red to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-red/25 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      {isPWAInstalled ? "التطبيق مثبت على جهازك ✓" : "تثبيت تطبيق الإدارة على هاتفك (PWA)"}
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
                        : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
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
                        <span>معرف المحادثة أو القناة (Telegram Chat ID)</span>
                        <span className="text-[11px] text-sky-400 font-normal">من @userinfobot</span>
                      </label>
                      <input 
                        type="text"
                        value={settingsForm.telegramChatId}
                        onChange={e => setSettingsForm({ ...settingsForm, telegramChatId: e.target.value })}
                        placeholder="مثال: 987654321 أو -100123456789"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-red font-mono text-gray-200"
                        dir="ltr"
                      />
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
                          <h4 className="text-lg font-bold text-white">التنبيهات الصوتية الحية</h4>
                          <p className="text-xs text-gray-400">تشغيل نغمة عند وصول حجز جديد وأنت داخل اللوحة</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !(settingsForm.enableSoundAlerts ?? true);
                          setSettingsForm(prev => ({ ...prev, enableSoundAlerts: nextVal }));
                          if (nextVal) playNotificationSound();
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

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-400">
                        {settingsForm.enableSoundAlerts !== false ? "الصوت مفعل - ستسمع رنة تنبيه فورية عند إضافة حجز جديد." : "الصوت معطل حالياً."}
                      </span>
                      <button
                        type="button"
                        onClick={() => playNotificationSound()}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-brand-red" />
                        تجربة النغمة
                      </button>
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

                      <button
                        type="button"
                        onClick={handleInstallPWA}
                        className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-brand-red" />
                        {isPWAInstalled ? "فتح / إعادة تثبيت التطبيق" : "تثبيت تطبيق دكتور فيكس على الشاشة الرئيسية الآن"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col lg:flex-row gap-8"
            >
              {/* Settings Sidebar */}
              <div className="lg:w-64 flex-shrink-0">
                <div className="glass-card p-4 border-white/5 space-y-2">
                  {[
                    { id: 'general', label: 'الإعدادات العامة', icon: Globe },
                    { id: 'notifications', label: 'إشعارات تيليجرام والتطبيق', icon: Bell },
                    { id: 'branding', label: 'الهوية والثيمات', icon: Palette },
                    { id: 'hero', label: 'الواجهة الرئيسية', icon: Layout },
                    { id: 'contact', label: 'التواصل والاجتماعي', icon: Share2 },
                    { id: 'sections', label: 'الأقسام والظهور', icon: Eye },
                    { id: 'seo', label: 'الأرشفة (SEO)', icon: Search },
                    { id: 'footer', label: 'تذييل الصفحة', icon: AlignLeft },
                    { id: 'maintenance', label: 'وضع الصيانة', icon: ShieldAlert },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSettingsSubTab(tab.id as any)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                        settingsSubTab === tab.id 
                          ? "bg-brand-red text-white shadow-lg shadow-brand-red/20" 
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-1">
                <div className="glass-card p-8 border-white/5">
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
                              <div className="w-24 h-24 rounded-full bg-black border-2 border-white/20 flex items-center justify-center overflow-hidden shadow-xl relative group">
                                {settingsForm.logoUrl ? (
                                  <img 
                                    src={settingsForm.logoUrl} 
                                    alt="Logo Preview" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <span className="text-brand-red font-display font-black text-xl italic tracking-tighter">
                                    Dr.Fix
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">معاينة الشعار في الهيدر</span>
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
                                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
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
                              <label className="text-xs font-bold text-gray-400 uppercase">معرف المحادثة (Chat ID)</label>
                              <input 
                                type="text"
                                value={settingsForm.telegramChatId}
                                onChange={e => setSettingsForm({ ...settingsForm, telegramChatId: e.target.value })}
                                placeholder="مثال: 987654321"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-brand-red font-mono"
                                dir="ltr"
                              />
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
                                التنبيهات الصوتية الحية
                              </h4>
                              <p className="text-xs text-gray-400">إصدار صوت رنة عند وصول حجز جديد أثناء فتح اللوحة</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = !(settingsForm.enableSoundAlerts ?? true);
                                setSettingsForm(prev => ({ ...prev, enableSoundAlerts: nextVal }));
                                if (nextVal) playNotificationSound();
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

                        {/* Logo in Branding tab as well */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                              <Camera className="w-4 h-4 text-brand-red" />
                              شعار وهوية الموقع (Logo)
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
                            <div className="w-20 h-20 rounded-full bg-black border-2 border-white/20 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
                              {settingsForm.logoUrl ? (
                                <img src={settingsForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-brand-red font-display font-black text-lg italic tracking-tighter">
                                  Dr.Fix
                                </span>
                              )}
                            </div>
                            <div className="flex-1 w-full space-y-2">
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'settings')}
                                className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-red file:text-white hover:file:bg-red-700 cursor-pointer bg-black/40 border border-white/10 rounded-xl p-1.5"
                              />
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
                                  src={settingsForm.heroImageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000"} 
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
                                    title: 'محرك سيارة حديث (الافتراضية)',
                                    url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000',
                                    badge: 'محرك رياضي'
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
                                  const isSelected = (settingsForm.heroImageUrl || 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000') === preset.url;
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
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Instagram className="w-3 h-3" /> انستقرام
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.instagram}
                              onChange={e => setSettingsForm({...settingsForm, instagram: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Twitter className="w-3 h-3" /> تويتر (X)
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.twitter}
                              onChange={e => setSettingsForm({...settingsForm, twitter: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Facebook className="w-3 h-3" /> فيسبوك
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.facebook}
                              onChange={e => setSettingsForm({...settingsForm, facebook: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Share2 className="w-3 h-3" /> سناب شات
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.snapchat}
                              onChange={e => setSettingsForm({...settingsForm, snapchat: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                              <Share2 className="w-3 h-3" /> تيك توك
                            </label>
                            <input 
                              type="text"
                              value={settingsForm.tiktok}
                              onChange={e => setSettingsForm({...settingsForm, tiktok: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { id: 'showStats', label: 'إحصائيات الأرقام', icon: BarChart },
                            { id: 'showOffers', label: 'قسم العروض', icon: Tag },
                            { id: 'showGallery', label: 'معرض الصور', icon: Camera },
                            { id: 'showTestimonials', label: 'آراء العملاء', icon: Star },
                            { id: 'showServices', label: 'قسم الخدمات', icon: Wrench },
                            { id: 'showContact', label: 'قسم تواصل معنا', icon: Phone },
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

                    <div className="pt-6 border-t border-white/5 flex justify-end">
                      <button 
                        type="submit"
                        disabled={loading}
                        className="px-10 py-4 bg-brand-red rounded-xl font-display font-black italic uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 disabled:opacity-50 flex items-center gap-2"
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
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && (
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
        </AnimatePresence>

        {/* Add New Modal */}
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-brand-dark border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-display font-black italic">
                    {editingItem ? 'تعديل' : 'إضافة'} {activeTab === 'dashboard' || activeTab === 'bookings' ? 'حجز' : 
                          activeTab === 'content' ? (contentTab === 'services' ? 'خدمة' : contentTab === 'offers' ? 'عرض' : 'صورة') : 'جديد'}
                  </h3>
                  <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {(activeTab === 'dashboard' || activeTab === 'bookings') && (
                  <form onSubmit={handleAddRecord} className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">رقم الجوال</label>
                      <input 
                        required
                        value={formData.customerPhone}
                        onChange={e => setFormData({...formData, customerPhone: e.target.value})}
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
                      <label className="text-xs font-bold text-gray-500 uppercase">التكلفة</label>
                      <input 
                        type="number"
                        value={formData.cost}
                        onChange={e => setFormData({...formData, cost: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
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
                              onClick={() => setGalleryForm({ ...galleryForm, imageUrl: '' })}
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Full Booking Details Modal */}
        <AnimatePresence>
          {selectedBookingDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card max-w-lg w-full p-8 border-brand-red/30 relative space-y-6"
              >
                <button 
                  onClick={() => setSelectedBookingDetails(null)}
                  className="absolute top-6 left-6 text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedBookingDetails.carModel}</h3>
                    <p className="text-xs text-gray-400">تفاصيل الحجز المسجل</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">رقم جوال العميل</div>
                      <div className="font-bold text-white text-base" dir="ltr">{selectedBookingDetails.customerPhone}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">التكلفة التقديرية</div>
                      <div className="font-bold text-brand-red text-base">{selectedBookingDetails.cost ? `${selectedBookingDetails.cost} ريال` : 'غير محدد'}</div>
                    </div>
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
                        "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      )}>
                        {selectedBookingDetails.status === 'completed' ? 'مكتمل 🏁' :
                         selectedBookingDetails.status === 'accepted' ? 'تم القبول ✅' :
                         selectedBookingDetails.status === 'on_the_way' ? 'الفني بالطريق 🚗' :
                         selectedBookingDetails.status === 'in-progress' ? 'قيد العمل 🔧' :
                         selectedBookingDetails.status === 'cancelled' ? 'ملغي ❌' :
                         selectedBookingDetails.status === 'new' ? 'جديد 🆕' : 'قيد الانتظار ⏳'}
                      </span>
                    </div>

                    {/* Quick Status Changers with WhatsApp Trigger */}
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
                  </div>
                </div>

                {/* Quick actions in modal */}
                <div className="space-y-2 pt-2">
                  <a 
                    href={getWhatsAppStatusUrl(selectedBookingDetails, selectedBookingDetails.status)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>إرسال تحديث الحالة للعميل عبر الواتساب 📲</span>
                  </a>

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
                    <a 
                      href={`https://wa.me/${(selectedBookingDetails.customerPhone || '').replace(/\D/g, '').replace(/^0/, '966')}?text=${encodeURIComponent(`🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n${(selectedBookingDetails.customerName || selectedBookingDetails.name || '').trim() ? `هلا ${(selectedBookingDetails.customerName || selectedBookingDetails.name || '').trim()} 👋\n` : 'هلا بك 👋\n'}بخصوص حجزك (${selectedBookingDetails.carModel || 'السيارة'}) رقم #${selectedBookingDetails.bookingId || selectedBookingDetails.id || ''}\n\nكيف نقدر نخدمك؟ 🔧⚡`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      محادثة عامة
                    </a>
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
      </div>
    </section>
  );
};

const MaintenanceHistory = () => {
  const [phone, setPhone] = useState('');
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const savedPhone = localStorage.getItem('drfix_customer_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      performSearch(savedPhone);
    }
  }, []);

  const performSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    setHasSearched(true);
    try {
      let results: MaintenanceRecord[] = [];
      
      // 1. Search by customerPhone
      try {
        const qPhone = query(
          collection(db, 'maintenance'),
          where('customerPhone', '==', term)
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as MaintenanceRecord);
        });
      } catch (err) {
        console.warn("Error querying by phone:", err);
      }

      // 2. Also search by bookingId if results are empty or term looks like booking id
      if (results.length === 0 || term.toUpperCase().startsWith('DRF-')) {
        try {
          const qId = query(
            collection(db, 'maintenance'),
            where('bookingId', '==', term.toUpperCase())
          );
          const snapId = await getDocs(qId);
          snapId.forEach((doc) => {
            if (!results.some(r => r.id === doc.id)) {
              results.push({ id: doc.id, ...(doc.data() as any) } as MaintenanceRecord);
            }
          });
        } catch (err) {
          console.warn("Error querying by bookingId:", err);
        }
      }

      // Sort results by date descending
      results.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || (a.serviceDate as any)?.toMillis?.() || (a.serviceDate ? new Date(a.serviceDate as any).getTime() : 0);
        const timeB = (b.createdAt as any)?.toMillis?.() || (b.serviceDate as any)?.toMillis?.() || (b.serviceDate ? new Date(b.serviceDate as any).getTime() : 0);
        return timeB - timeA;
      });

      setRecords(results);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(phone);
  };

  return (
    <section id="history" className="py-24 bg-black relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold uppercase tracking-widest mb-6"
          >
            <History className="w-3 h-3" />
            {t.history.badge}
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-display font-black mb-6 italic tracking-tighter">
            {t.history.title} <span className="text-brand-red">{t.history.titleAccent}</span> {t.history.titleSuffix}
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t.history.description}
          </p>
        </div>

        <div className="glass-card p-8 md:p-12 border-white/5 shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-12">
            <div className="flex-1 relative">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500", lang === 'ar' ? "right-4" : "left-4")} />
              <input 
                type="tel" 
                placeholder={t.history.placeholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={cn(
                  "w-full bg-black/50 border border-white/10 rounded-xl py-4 text-white focus:border-brand-red outline-none transition-all font-mono",
                  lang === 'ar' ? "pr-12 pl-4" : "pl-12 pr-4"
                )}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-brand-red hover:bg-red-700 text-white font-display font-black italic px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-red/20"
            >
              {loading ? t.history.searching : t.history.search}
            </button>
          </form>

          {loading ? (
            <div className="flex flex-col items-center py-12">
              <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">{t.history.loading}</p>
            </div>
          ) : hasSearched ? (
            records.length > 0 ? (
              <div className="space-y-6">
                {records.map((record) => (
                  <motion.div 
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-red/30 transition-all"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-brand-red font-display font-black italic text-xl mb-1">
                          <Wrench className="w-5 h-5" />
                          {record.serviceType}
                        </div>
                        <div className="text-gray-400 flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {safeFormatDate(record.serviceDate || record.createdAt, lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          {record.bookingId && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold">
                              #{record.bookingId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <div className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border",
                          record.status === 'on_the_way' ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-lg shadow-indigo-500/10 animate-pulse" :
                          record.status === 'accepted' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10" :
                          record.status === 'in-progress' || record.status === 'in_progress' ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
                          record.status === 'completed' ? "bg-green-500/20 text-green-400 border-green-500/40" :
                          record.status === 'cancelled' ? "bg-red-500/20 text-red-400 border-red-500/40" :
                          "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                        )}>
                          {record.status === 'on_the_way' ? '🚗 الفني بالطريق إليك' :
                           record.status === 'accepted' ? '✅ تم تأكيد الحجز' :
                           record.status === 'in-progress' || record.status === 'in_progress' ? '🔧 قيد العمل' :
                           record.status === 'completed' ? '🏁 تم الإنجاز' :
                           record.status === 'cancelled' ? '❌ تم الإلغاء' :
                           '⏳ قيد المراجعة'}
                        </div>

                        {record.cost ? (
                          <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-white text-xs font-bold font-mono">
                            {record.cost} {t.common.currency}
                          </div>
                        ) : null}
                        <div className="px-3 py-1.5 bg-brand-red/10 rounded-lg border border-brand-red/20 text-brand-red font-bold text-xs">
                          {record.carModel}
                        </div>
                        <button
                          onClick={() => exportSingleBookingWord(record as any)}
                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="تحميل سند الصيانة والفاتورة ملف Word"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>سند الصيانة (.doc)</span>
                        </button>
                      </div>
                    </div>
                    {record.notes && (
                      <div className="text-gray-500 text-sm leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5">
                        <FileText className="w-4 h-4 inline-block ml-2 text-gray-600" />
                        {record.notes}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-gray-500 mb-2">{t.history.noRecords}</p>
                <p className="text-xs text-gray-600">{t.history.checkPhone}</p>
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-white/5 mx-auto mb-4" />
              <p className="text-gray-600">{t.history.enterPhone}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

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
    <section id="faq" className="py-24 bg-brand-black">
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
  const [visitors, setVisitors] = useState<number | null>(null);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const updateVisitors = async () => {
      const statsRef = doc(db, 'stats', 'global');
      
      try {
        const statsDoc = await getDoc(statsRef);
        
        if (!statsDoc.exists()) {
          // Create initial doc
          await setDoc(statsRef, { visitorCount: 1 });
          setVisitors(1);
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
            setVisitors(doc.data().visitorCount);
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, 'stats/global'));
        
        return unsubscribe;
      } catch (error) {
        console.error("Error updating visitor count:", error);
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
    <footer className="bg-brand-black border-t border-white/5 pt-12 pb-32 md:pb-12">
      <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12", lang === 'ar' ? "text-right" : "text-left")}>
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center border border-white/10 shadow-xl overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
              ) : (
                <span className="text-brand-red font-display font-black text-xl italic tracking-tighter leading-none">
                  Dr.Fix
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-500 max-w-sm leading-relaxed">
            {lang === 'ar' ? (settings.footerDescription || t.footer.description) : t.footer.description}
          </p>
          
          {visitors !== null && (
            <div className="mt-8 flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>{t.footer.visitors}: {visitors.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        <div>
          <h4 className="font-display font-black mb-6 uppercase tracking-widest text-sm text-brand-red">{t.footer.quickLinks}</h4>
          <ul className="space-y-4 text-gray-500 font-bold">
            <li><Link to="/" className="hover:text-brand-red transition-colors">{t.nav.home}</Link></li>
            <li><Link to="/services" className="hover:text-brand-red transition-colors">{t.nav.services}</Link></li>
            <li><Link to="/offers" className="hover:text-brand-red transition-colors">{t.nav.offers}</Link></li>
            <li><Link to="/booking" className="hover:text-brand-red transition-colors">{t.nav.bookNow}</Link></li>
          </ul>
        </div>

      <div>
        <h4 className="font-display font-black mb-6 uppercase tracking-widest text-sm text-brand-red">{t.footer.followUs}</h4>
        <div className="flex gap-4">
          {settings.snapchat && (
            <motion.a 
              whileHover={{ y: -5, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={settings.snapchat} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-[#FFFC00] hover:text-black transition-all border border-white/10"
              title="Snapchat"
            >
              <Smartphone className="w-6 h-6" />
            </motion.a>
          )}
          {settings.instagram && (
            <motion.a 
              whileHover={{ y: -5, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={settings.instagram} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white transition-all border border-white/10"
              title="Instagram"
            >
              <Instagram className="w-6 h-6" />
            </motion.a>
          )}
          {settings.twitter && (
            <motion.a 
              whileHover={{ y: -5, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={settings.twitter} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all border border-white/10"
              title="Twitter"
            >
              <Twitter className="w-6 h-6" />
            </motion.a>
          )}
          {settings.facebook && (
            <motion.a 
              whileHover={{ y: -5, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={settings.facebook} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-all border border-white/10"
              title="Facebook"
            >
              <Facebook className="w-6 h-6" />
            </motion.a>
          )}
          {settings.tiktok && (
            <motion.a 
              whileHover={{ y: -5, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              href={settings.tiktok} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all border border-white/10"
              title="TikTok"
            >
              <Monitor className="w-6 h-6" />
            </motion.a>
          )}
        </div>
        <div className="mt-8 flex justify-start">
          <ScrollToTopButton />
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm font-mono">
      <div className="text-center md:text-start">{settings.copyrightText || `© ${new Date().getFullYear()} DR. FIX AUTO SERVICES. ${t.footer.rights}`}</div>
      <Link 
        to={isAdmin ? "/admin" : "/login"}
        className="text-xs text-gray-300 hover:text-white transition-all uppercase tracking-wider py-2.5 px-5 bg-white/5 hover:bg-brand-red/20 border border-white/10 hover:border-brand-red/40 rounded-xl flex items-center gap-2 min-h-[44px] cursor-pointer active:scale-98"
      >
        {isAdmin ? <Shield className="w-3.5 h-3.5 text-brand-red" /> : <LogIn className="w-3.5 h-3.5 text-brand-red" />}
        <span>{isAdmin ? (lang === 'ar' ? 'لوحة تحكم الإدارة (Admin)' : 'Admin Dashboard') : (lang === 'ar' ? 'تسجيل دخول الإدارة (Admin Login)' : 'Admin Login')}</span>
      </Link>
    </div>
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
    <section id="process" className="py-24 bg-brand-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className={cn("text-center mb-16", lang === 'en' && "md:text-left")}>
          <h2 className="text-2xl md:text-4xl font-display font-black mb-4 italic uppercase">
            {t.process.title} <span className="text-brand-red">{t.process.titleAccent}</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t.process.description}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8" style={{ perspective: '2000px' }}>
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
    <section className="py-12 bg-brand-black border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="text-3xl md:text-4xl font-display font-black text-brand-red mb-2">+5000</div>
            <div className="text-gray-400 font-bold uppercase tracking-wider text-sm">{t.stats.cars}</div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="text-3xl md:text-4xl font-display font-black text-brand-red mb-2">100%</div>
            <div className="text-gray-400 font-bold uppercase tracking-wider text-sm">{t.stats.wash}</div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-3xl md:text-4xl font-display font-black text-brand-red mb-2">+10</div>
            <div className="text-gray-400 font-bold uppercase tracking-wider text-sm">{t.stats.experience}</div>
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

const MaintenancePage = ({ message }: { message?: string }) => {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <div className="w-20 h-20 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-10 h-10 text-brand-red" />
        </div>
        <h1 className="text-3xl font-display font-black mb-4 uppercase italic">الموقع تحت الصيانة</h1>
        <p className="text-gray-400 leading-relaxed">
          {message || 'نحن نقوم ببعض التحديثات لتحسين تجربتكم. سنعود قريباً!'}
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <div className="w-2 h-2 rounded-full bg-brand-red animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-brand-red animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-brand-red animate-bounce" style={{ animationDelay: '0.4s' }} />
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
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    setSent(true);
    setName('');
    setEmailOrPhone('');
    setMessage('');
    setTimeout(() => setSent(false), 5000);
  };
  
  return (
    <section id="contact" className="py-24 relative overflow-hidden">
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
                  <p className="text-gray-400">{settings.email || 'info@drfix.repair'}</p>
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

const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Language>('ar');
  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

const LanguageToggle = () => {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
    >
      <Globe className="w-3.5 h-3.5" />
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
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
  const [settings, setSettings] = useState<AppSettings>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t } = useLanguage();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
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
        setSettings(doc.data() as AppSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'stats/global'));

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
    if (location.pathname === '/') {
      const element = document.getElementById('booking');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/booking');
    }
  };

  if (settings.maintenanceMode && !isAdminLoggedIn && location.pathname !== '/login') {
    return <MaintenancePage message={settings.maintenanceMessage} />;
  }

  return (
    <div className="min-h-screen bg-brand-black text-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <DynamicStyles settings={settings} />
      <Ticker settings={settings} />
      <Navbar settings={settings} isAdmin={isAdminLoggedIn} />
      
      <main className="pt-20 sm:pt-24 md:pt-28 pb-24 md:pb-0">
        <Routes>
          <Route path="/" element={
            <>
              <Hero settings={settings} />
              {(settings.showStats !== false) && <Stats />}
              {(settings.showServices !== false) && <Services onServiceSelect={handleServiceSelect} />}
              {(settings.showOffers !== false) && <Offers />}
              {(settings.showGallery !== false) && <Gallery />}
              <Process />
              <BookingForm selectedService={selectedService} settings={settings} />
              {(settings.showTestimonials !== false) && <Testimonials />}
              <FAQ />
            </>
          } />
          <Route path="/services" element={<Services onServiceSelect={handleServiceSelect} />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/booking" element={<BookingForm selectedService={selectedService} settings={settings} />} />
          <Route path="/history" element={<MaintenanceHistory />} />
          <Route path="/admin" element={<AdminDashboard isAdmin={isAdminLoggedIn} onLogout={handleAdminLogout} settings={settings} currentStaffUser={currentStaffUser} />} />
          <Route path="/admin/*" element={<AdminDashboard isAdmin={isAdminLoggedIn} onLogout={handleAdminLogout} settings={settings} currentStaffUser={currentStaffUser} />} />
          <Route path="/login" element={<LoginPage onLogin={handleAdminLoginSuccess} isAdmin={isAdminLoggedIn} />} />
          <Route path="/login/*" element={<LoginPage onLogin={handleAdminLoginSuccess} isAdmin={isAdminLoggedIn} />} />
        </Routes>
      </main>

      <Footer settings={settings} isAdmin={isAdminLoggedIn} />
      
      {location.pathname !== '/admin' && location.pathname !== '/login' && (
        <MobileQuickBar settings={settings} />
      )}
      
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
          <LanguageProvider>
            <MainContent />
          </LanguageProvider>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

