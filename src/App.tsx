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
} from 'lucide-react';
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
  Cell 
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

// --- Components ---

const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      onLogin();
      setError('');
      navigate('/admin');
    } else {
      setError(t.login.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 w-full max-w-md border-brand-red/20 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display font-black italic uppercase">
            {t.login.title} <span className="text-brand-red">{t.login.titleAccent}</span>
          </h2>
          <p className="text-gray-400 text-sm mt-2">{t.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.login.username}</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-red transition-all"
              placeholder={t.login.usernamePlaceholder || "Username"}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.login.password}</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-red transition-all"
              placeholder={t.login.passwordPlaceholder || "Password"}
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-brand-red rounded-xl font-display font-black italic uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20 text-white cursor-pointer"
          >
            {t.login.login}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

interface AppSettings {
  logoUrl?: string;
  siteName?: string;
  heroImageUrl?: string;
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
}

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
  const tickerContent = (lang === 'ar' && settings.tickerText) 
    ? settings.tickerText 
    : `${t.hero.badge} • ${t.stats.wash} • ${t.footer.available} • DR. FIX AUTO SERVICES`;

  return (
    <div className="bg-brand-red py-2 fixed top-0 left-0 right-0 z-[60] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <span className="text-white font-bold text-[10px] md:text-xs italic uppercase tracking-widest whitespace-nowrap">
          {tickerContent}
        </span>
      </div>
    </div>
  );
};

const Navbar = ({ settings }: { settings: AppSettings }) => {
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

  const handleBookNow = () => {
    if (location.pathname === '/') {
      const element = document.getElementById('booking');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setIsOpen(false);
      }
    } else {
      navigate('/booking');
      setIsOpen(false);
    }
  };

  return (
    <nav className="fixed top-7 md:top-8 left-0 right-0 z-50 bg-brand-black/80 backdrop-blur-lg border-b border-white/5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border border-white/10 shadow-lg overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
              ) : (
                <span className="text-brand-red font-display font-black text-lg italic tracking-tighter leading-none">
                  Dr.Fix
                </span>
              )}
            </div>
          </div>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={cn("transition-colors hover:text-brand-red", location.pathname === link.path ? "text-brand-red" : "text-white")}
            >
              {link.name}
            </Link>
          ))}
          <div className="h-6 w-px bg-white/10" />
          <LanguageToggle />
          <button onClick={handleBookNow} className="px-4 py-2 bg-brand-red rounded-full text-white font-display font-bold red-glow-hover transition-all">{t.nav.bookNow}</button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <LanguageToggle />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-white hover:text-brand-red transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            className="md:hidden bg-brand-dark border-b border-white/5 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-6 text-lg font-bold">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  onClick={() => setIsOpen(false)}
                  className={cn("transition-colors hover:text-brand-red", location.pathname === link.path ? "text-brand-red" : "text-white")}
                >
                  {link.name}
                </Link>
              ))}
              <button onClick={handleBookNow} className="bg-brand-red px-6 py-3 rounded-xl text-center font-display text-white font-bold">{t.nav.bookNow}</button>
              <Link 
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-gray-700 uppercase tracking-widest mt-4 self-center"
              >
                Admin Access
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
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
    <section className="relative min-h-screen flex items-center pt-24 md:pt-20 overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 z-0 opacity-10 md:opacity-20 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-red/20 via-transparent to-transparent" />
      
      <div className="grid grid-cols-6 md:grid-cols-12 h-full w-full border-x border-white/5">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="border-r border-white/5 h-full" />
        ))}
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={cn("text-center lg:text-right", lang === 'en' && "lg:text-left")}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs sm:text-sm md:text-base font-bold mb-4 md:mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
            {lang === 'ar' ? (settings.heroBadge || t.hero.badge) : t.hero.badge}
          </motion.div>
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black leading-tight md:leading-[1.1] mb-4 md:mb-6 italic uppercase tracking-tighter">
            {lang === 'ar' ? (settings.heroTitle || t.hero.title) : t.hero.title} <br />
            <span className="text-brand-red relative inline-block">
              {lang === 'ar' ? (settings.heroSubtitle || t.hero.titleAccent) : t.hero.titleAccent}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1, duration: 0.8 }}
                className="absolute -bottom-1 left-0 h-1.5 bg-white/10 rounded-full"
              />
            </span>
          </h1>
          <p className="text-sm md:text-base text-gray-400 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            {t.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
            <button onClick={handleBookNow} className="px-8 py-4 bg-brand-red text-white font-display font-black rounded-xl red-glow-hover transition-all flex items-center justify-center gap-3 text-base">
              {t.hero.ctaBook}
              <Car className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              <a href={`tel:${settings.phone || '0546870807'}`} className="flex-1 px-6 py-4 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-white/5 transition-all cursor-pointer" title="اتصال هاتفي">
                {t.hero.ctaServices}
                <Phone className="w-5 h-5" />
              </a>
              <a href={`https://wa.me/${(settings.whatsapp || '966546870807').replace(/\+/g, '')}`} target="_blank" rel="noopener noreferrer" className="px-6 py-4 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-[#128C7E] transition-all cursor-pointer shadow-lg shadow-green-500/20" title="واتساب">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12 text-[10px] md:text-xs text-gray-600 italic font-medium"
          >
            {t.hero.prayer}
          </motion.p>
        </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: [0, -15, 0]
        }}
        transition={{ 
          duration: 1.2, 
          delay: 0.2,
          y: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        className="relative px-4 md:px-0"
      >
        <div className="relative z-10 rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 red-glow shadow-2xl">
          <img 
            src={settings.heroImageUrl || "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1000"} 
            alt="Car Maintenance" 
            className="w-full h-[180px] sm:h-[250px] md:h-[350px] object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-transparent opacity-40" />
        </div>
        
        <div className="absolute -top-5 -right-5 md:-top-10 md:-right-10 w-24 h-24 md:w-40 md:h-40 bg-brand-red/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-5 -left-5 md:-bottom-10 md:-left-10 w-32 h-32 md:w-60 md:h-60 bg-brand-red/10 blur-3xl rounded-full" />
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
  const { t, lang } = useLanguage();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BookingFormData>();

  React.useEffect(() => {
    if (selectedService) {
      setValue('serviceType', selectedService);
    }
  }, [selectedService, setValue]);

  const onSubmit = (data: BookingFormData) => {
    setIsLoading(true);

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

    const messageText = lang === 'ar' ? (
      `*طلب حجز جديد من Dr. Fix*\n\n` +
      `*ماركة السيارة:* ${data.carMake}\n` +
      `*موديل السيارة:* ${data.carModel}\n` +
      `*سنة الصنع:* ${data.carYear}\n` +
      `*نوع الخدمة:* ${serviceLabels[data.serviceType] || data.serviceType}\n` +
      `*وصف المشكلة:* ${data.description}\n` +
      `*رقم الجوال:* ${data.phone}`
    ) : (
      `*New Booking Request from Dr. Fix*\n\n` +
      `*Car Make:* ${data.carMake}\n` +
      `*Car Model:* ${data.carModel}\n` +
      `*Year:* ${data.carYear}\n` +
      `*Service Required:* ${serviceLabels[data.serviceType] || data.serviceType}\n` +
      `*Issue Description:* ${data.description}\n` +
      `*Phone Number:* ${data.phone}`
    );

    // Create automatic maintenance record
    const createRecord = async () => {
      try {
        await addDoc(collection(db, 'maintenance'), {
          customerPhone: data.phone.trim(),
          carModel: `${data.carMake} ${data.carModel} ${data.carYear}`,
          serviceType: `حجز: ${serviceLabels[data.serviceType] || data.serviceType}`,
          notes: `طلب حجز: ${data.description}`,
          cost: 0,
          serviceDate: serverTimestamp()
        });
        // Save phone to localStorage for auto-search in history
        localStorage.setItem('drfix_customer_phone', data.phone.trim());
      } catch (error) {
        console.error("Error creating auto record:", error);
      }
    };

    createRecord();

    // Simulate a loading process for the tire animation
    setTimeout(() => {
      setIsLoading(false);
      
      const targetPhone = (settings?.whatsapp || '966546870807').replace(/[^0-9]/g, '');
      const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank');
      
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        reset();
      }, 5000);
    }, 2000);
  };

  return (
    <section id="booking" className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
        <motion.div 
          whileHover={{ rotateX: 2, rotateY: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-6 md:p-12 border-brand-red/20 shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className={cn("text-center mb-10 md:mb-12", lang === 'en' && "md:text-left")}>
            <h2 className="text-2xl md:text-3xl font-display font-black mb-4 italic">
              {t.booking.title} <span className="text-brand-red">{t.booking.titleAccent}</span>
            </h2>
            <p className="text-gray-400">{t.booking.description}</p>
          </div>

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
                rows={4}
                placeholder={t.booking.problemDescPlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-red focus:outline-none transition-all resize-none text-sm md:text-base text-white"
              />
            </div>

            <div className="p-4 rounded-xl bg-brand-red/5 border border-brand-red/20 flex items-start gap-3">
              <Camera className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                <strong className="text-brand-red block mb-1">{t.booking.cameraNoteBold}</strong>
                {t.booking.cameraNoteText}
              </p>
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

            <button 
              type="submit"
              className="w-full py-4 bg-brand-red text-white font-display font-black rounded-xl red-glow-hover transition-all text-lg md:text-xl flex items-center justify-center gap-3 cursor-pointer"
            >
              {t.booking.confirm}
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
                <h3 className="text-3xl font-black mb-4 italic">{t.booking.successTitle}</h3>
                <p className="text-gray-400 text-lg">{t.booking.successDesc}</p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="mt-8 text-brand-red font-bold hover:underline cursor-pointer"
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
  customerPhone: string;
  carModel: string;
  serviceDate: Timestamp;
  serviceType: string;
  notes?: string;
  cost?: number;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
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

const AdminDashboard = ({ isAdmin, onLogout, settings }: { isAdmin: boolean, onLogout: () => void, settings: AppSettings }) => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'service' | 'offer' | 'gallery' | 'booking' | 'testimonial' } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'content' | 'customers' | 'testimonials' | 'settings'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branding' | 'hero' | 'contact' | 'sections' | 'seo' | 'footer' | 'maintenance'>('general');
  const [contentTab, setContentTab] = useState<'services' | 'offers' | 'gallery'>('services');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<MaintenanceRecord | null>(null);
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>('all');
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [testimonialRatingFilter, setTestimonialRatingFilter] = useState<number | 'all'>('all');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // Form States
  const [formData, setFormData] = useState({
    customerPhone: '',
    carModel: '',
    serviceType: '',
    notes: '',
    cost: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed' | 'cancelled'
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
    heroImageUrl: settings.heroImageUrl || '',
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
    maintenanceMessage: settings.maintenanceMessage || 'الموقع قيد الصيانة حالياً، سنعود قريباً.'
  });

  useEffect(() => {
    setSettingsForm({
      logoUrl: settings.logoUrl || '',
      siteName: settings.siteName || 'Dr.Fix',
      heroImageUrl: settings.heroImageUrl || '',
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
      maintenanceMessage: settings.maintenanceMessage || 'الموقع قيد الصيانة حالياً، سنعود قريباً.'
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

      return () => {
        unsubM();
        unsubT();
        unsubO();
        unsubS();
        unsubG();
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

  const handleUpdateStatus = async (id: string, newStatus: MaintenanceRecord['status']) => {
    try {
      await updateDoc(doc(db, 'maintenance', id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status:", error);
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
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('ar-SA', { weekday: 'short' });
    }).reverse();

    const data = last7Days.map(day => {
      const count = records.filter(r => {
        const rDate = r.serviceDate?.toDate().toLocaleDateString('ar-SA', { weekday: 'short' });
        return rDate === day;
      }).length;
      return { name: day, bookings: count };
    });

    return data;
  };

  const getServiceStats = () => {
    const stats: Record<string, number> = {};
    records.forEach(r => {
      stats[r.serviceType] = (stats[r.serviceType] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#FF0000', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section id="admin" className="py-24 bg-brand-black border-t border-white/5 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap justify-between items-center gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-display font-black italic mb-2">لوحة تحكم <span className="text-brand-red">المدير</span></h2>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>إدارة المركز والخدمات</span>
              <span className="w-1 h-1 bg-gray-700 rounded-full" />
              <span>{records.length} حجز إجمالي</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-all text-gray-300"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للموقع
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
                  "p-3 border rounded-xl transition-all",
                  notificationPermission === 'granted' ? "bg-green-500/10 border-green-500/20 text-green-500" : 
                  notificationPermission === 'denied' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                  "bg-white/5 border-white/10 text-yellow-500 hover:bg-white/10"
                )}
                title={notificationPermission === 'granted' ? "التنبيهات مفعلة (اضغط للتجربة)" : "تفعيل التنبيهات"}
              >
                {notificationPermission === 'granted' ? <Bell className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </button>
            )}

            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-red rounded-xl font-bold italic hover:bg-red-700 transition-all shadow-lg shadow-brand-red/20"
            >
              <PlusCircle className="w-5 h-5" />
              إضافة جديد
            </button>
            <button 
              onClick={onLogout}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-gray-400"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-8 bg-white/5 p-2 rounded-2xl border border-white/5 no-scrollbar">
          {[
            { id: 'dashboard', label: 'الإحصائيات', icon: BarChart },
            { id: 'bookings', label: 'الحجوزات', icon: Calendar },
            { id: 'content', label: 'المحتوى', icon: FileText },
            { id: 'customers', label: 'العملاء', icon: User },
            { id: 'testimonials', label: 'التعليقات', icon: MessageSquare },
            { id: 'settings', label: 'الإعدادات', icon: Settings },
          ].map((tab) => (
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
              {/* Filter & Search Bar */}
              <div className="glass-card p-6 border-white/5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Status Filter Badges */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'الكل', count: records.length },
                      { id: 'pending', label: 'قيد الانتظار', count: records.filter(r => r.status === 'pending').length },
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

                {/* Search Field */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={bookingSearch}
                    onChange={e => setBookingSearch(e.target.value)}
                    placeholder="ابحث برقم الجوال، نوع السيارة، أو الخدمة..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pr-11 pl-4 py-3 text-xs outline-none focus:border-brand-red transition-all"
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

              {/* Bookings Table / Cards */}
              <div className="glass-card overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">السيارة والتاريخ</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">العميل والتواصل</th>
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
                            (r.customerPhone || '').toLowerCase().includes(q) ||
                            (r.carModel || '').toLowerCase().includes(q) ||
                            (r.serviceType || '').toLowerCase().includes(q) ||
                            (r.notes || '').toLowerCase().includes(q)
                          );
                        })
                        .map((record) => {
                          const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
                          const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
                          const waMsg = encodeURIComponent(`مرحباً بك من مركز دكتور فيكس لصيانة السيارات 🚗 بخصوص حجزك لسيارة (${record.carModel}) لخدمة (${record.serviceType})`);
                          
                          return (
                            <tr key={record.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-white text-sm">{record.carModel}</div>
                                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  {record.serviceDate?.toDate ? record.serviceDate.toDate().toLocaleDateString('ar-SA') : 'تاريخ الحجز'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-sm text-gray-200" dir="ltr">{record.customerPhone}</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <a 
                                    href={`https://wa.me/${waPhone}?text=${waMsg}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                                    title="محادثة واتساب مباشرة"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    واتساب
                                  </a>
                                  <a 
                                    href={`tel:${record.customerPhone}`}
                                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                                    title="اتصال هاتفي"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                    اتصال
                                  </a>
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
                                <select 
                                  value={record.status}
                                  onChange={(e) => handleUpdateStatus(record.id, e.target.value as any)}
                                  className={cn(
                                    "text-xs font-bold px-3 py-1.5 rounded-full bg-black/50 border outline-none cursor-pointer",
                                    record.status === 'completed' ? "text-green-500 border-green-500/30 bg-green-500/10" :
                                    record.status === 'in-progress' ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                                    record.status === 'cancelled' ? "text-red-400 border-red-500/30 bg-red-500/10" :
                                    "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                                  )}
                                >
                                  <option value="pending" className="bg-brand-dark text-yellow-400">قيد الانتظار</option>
                                  <option value="in-progress" className="bg-brand-dark text-blue-400">قيد العمل</option>
                                  <option value="completed" className="bg-brand-dark text-green-400">مكتمل</option>
                                  <option value="cancelled" className="bg-brand-dark text-red-400">ملغي</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-display font-black text-brand-red text-base">
                                  {record.cost ? `${record.cost} ريال` : 'غير محدد'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => setSelectedBookingDetails(record)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleEdit('booking', record)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="تعديل الحجز"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete('maintenance', record.id)}
                                    className="p-2 text-gray-400 hover:text-brand-red hover:bg-white/10 rounded-lg transition-colors"
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
              </div>
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
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      contentTab === sub.id ? "bg-brand-red/10 text-brand-red border border-brand-red/20" : "text-gray-500 hover:text-white"
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
                          {record.customerPhone} • {record.serviceDate?.toDate().toLocaleDateString('ar-SA')}
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
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">اللوجو</label>
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                              {settingsForm.logoUrl ? (
                                <img src={settingsForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                              ) : (
                                <Camera className="w-8 h-8 text-gray-700" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, 'settings')}
                                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700"
                              />
                              <input 
                                type="text"
                                value={settingsForm.logoUrl}
                                onChange={e => setSettingsForm({...settingsForm, logoUrl: e.target.value})}
                                placeholder="أو أدخل رابط الصورة مباشرة..."
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-brand-red"
                              />
                            </div>
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
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <Layout className="w-5 h-5 text-brand-red" />
                          الواجهة الرئيسية (Hero)
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">العنوان الرئيسي</label>
                            <input 
                              type="text"
                              value={settingsForm.heroTitle}
                              onChange={e => setSettingsForm({...settingsForm, heroTitle: e.target.value})}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">العنوان الفرعي</label>
                            <textarea 
                              value={settingsForm.heroSubtitle}
                              onChange={e => setSettingsForm({...settingsForm, heroSubtitle: e.target.value})}
                              rows={2}
                              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red resize-none"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">نص الشارة (Badge Text)</label>
                              <input 
                                type="text"
                                value={settingsForm.heroBadge}
                                onChange={e => setSettingsForm({...settingsForm, heroBadge: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">نص زر الاتصال</label>
                              <input 
                                type="text"
                                value={settingsForm.heroButtonText}
                                onChange={e => setSettingsForm({...settingsForm, heroButtonText: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-red"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">صورة الواجهة</label>
                            <div className="flex items-center gap-4">
                              <div className="w-32 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {settingsForm.heroImageUrl ? (
                                  <img src={settingsForm.heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                                ) : (
                                  <Camera className="w-8 h-8 text-gray-700" />
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'hero')}
                                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-red file:text-white hover:file:bg-red-700"
                                />
                                <input 
                                  type="text"
                                  value={settingsForm.heroImageUrl}
                                  onChange={e => setSettingsForm({...settingsForm, heroImageUrl: e.target.value})}
                                  placeholder="أو رابط الصورة..."
                                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-brand-red"
                                />
                              </div>
                            </div>
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
                      {selectedBookingDetails.serviceDate?.toDate ? selectedBookingDetails.serviceDate.toDate().toLocaleString('ar-SA') : 'غير متوفر'}
                    </div>
                  </div>

                  {selectedBookingDetails.notes && (
                    <div className="bg-white/5 p-4 rounded-xl space-y-1">
                      <div className="text-xs text-gray-400">ملاحظات العميل / الفني</div>
                      <p className="text-gray-200 italic whitespace-pre-line text-xs leading-relaxed">{selectedBookingDetails.notes}</p>
                    </div>
                  )}

                  <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="text-xs text-gray-400">حالة الحجز</div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      selectedBookingDetails.status === 'completed' ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      selectedBookingDetails.status === 'in-progress' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                      selectedBookingDetails.status === 'cancelled' ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    )}>
                      {selectedBookingDetails.status === 'completed' ? 'مكتمل' :
                       selectedBookingDetails.status === 'in-progress' ? 'قيد العمل' :
                       selectedBookingDetails.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                    </span>
                  </div>
                </div>

                {/* Quick actions in modal */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {(() => {
                    const cleanPhone = (selectedBookingDetails.customerPhone || '').replace(/\D/g, '');
                    const waPhone = cleanPhone.startsWith('966') ? cleanPhone : cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone;
                    const waMsg = encodeURIComponent(`مرحباً بك من مركز دكتور فيكس لصيانة السيارات 🚗 بخصوص حجزك (${selectedBookingDetails.carModel})`);
                    return (
                      <>
                        <a 
                          href={`https://wa.me/${waPhone}?text=${waMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/20"
                        >
                          <MessageCircle className="w-4 h-4" />
                          محادثة واتساب
                        </a>
                        <a 
                          href={`tel:${selectedBookingDetails.customerPhone}`}
                          className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <PhoneCall className="w-4 h-4" />
                          اتصال هاتفي
                        </a>
                      </>
                    );
                  })()}
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

  const performSearch = async (phoneNumber: string) => {
    if (!phoneNumber.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      // Try with orderBy first, if it fails (likely missing index), fallback to simple query
      let q;
      try {
        q = query(
          collection(db, 'maintenance'),
          where('customerPhone', '==', phoneNumber.trim()),
          orderBy('serviceDate', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const results: MaintenanceRecord[] = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as MaintenanceRecord);
        });
        setRecords(results);
      } catch (indexError) {
        console.warn("Composite index might be missing, falling back to simple query:", indexError);
        q = query(
          collection(db, 'maintenance'),
          where('customerPhone', '==', phoneNumber.trim())
        );
        const querySnapshot = await getDocs(q);
        const results: MaintenanceRecord[] = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...(doc.data() as any) } as MaintenanceRecord);
        });
        // Sort manually if index is missing
        results.sort((a, b) => {
          const dateA = a.serviceDate?.toMillis?.() || 0;
          const dateB = b.serviceDate?.toMillis?.() || 0;
          return dateB - dateA;
        });
        setRecords(results);
      }
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
                        <div className="text-gray-400 flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4" />
                          {record.serviceDate?.toDate ? record.serviceDate.toDate().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.cost ? (
                          <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-white text-xs font-bold font-mono">
                            {record.cost} {t.common.currency}
                          </div>
                        ) : null}
                        <div className="px-4 py-2 bg-brand-red/10 rounded-lg border border-brand-red/20 text-brand-red font-bold">
                          {record.carModel}
                        </div>
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

const Footer = React.memo(({ settings }: { settings: AppSettings }) => {
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
    <footer className="bg-brand-black border-t border-white/5 py-12">
      <div className={cn("max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12", lang === 'ar' ? "text-right" : "text-left")}>
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
    <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-sm font-mono">
      <div>{settings.copyrightText || `© ${new Date().getFullYear()} DR. FIX AUTO SERVICES. ${t.footer.rights}`}</div>
      <Link 
        to="/admin"
        className="text-[10px] md:text-xs opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest py-2 px-4 border border-white/5 rounded-lg"
      >
        Admin Portal
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
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
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

  useEffect(() => {
    const savedAdmin = sessionStorage.getItem('drfix_admin_logged_in');
    if (savedAdmin === 'true') {
      setIsAdminLoggedIn(true);
    }
  }, []);

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('drfix_admin_logged_in', 'true');
    navigate('/admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('drfix_admin_logged_in');
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
      <Navbar settings={settings} />
      
      <main className="pt-28 md:pt-32">
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
          <Route path="/admin" element={<AdminDashboard isAdmin={isAdminLoggedIn} onLogout={handleAdminLogout} settings={settings} />} />
          <Route path="/login" element={<LoginPage onLogin={handleAdminLoginSuccess} />} />
        </Routes>
      </main>

      <Footer settings={settings} />
      
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

