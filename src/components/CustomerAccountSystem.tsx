import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, Car, Calendar, FileText, LogOut, Plus, Trash2, CheckCircle2, 
  Clock, AlertCircle, X, Shield, Phone, MapPin, ChevronLeft, ChevronRight,
  ExternalLink, Lock, UserCheck, Wrench, Sparkles, Eye, EyeOff,
  MessageCircle, Check
} from 'lucide-react';
import { 
  doc, setDoc, getDoc, updateDoc, collection, query, where, onSnapshot, serverTimestamp, getDocs
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth, firebaseConfig } from '../firebase';
import { CustomerProfile, CustomerCar, MaintenanceRecord } from '../types';

// Helper to normalize Saudi phone numbers for consistent indexing
export const cleanSaudiPhone = (raw: string): string => {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('9665') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
};

interface CustomerContextType {
  customer: CustomerProfile | null;
  loading: boolean;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  isPortalOpen: boolean;
  setIsPortalOpen: (open: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  login: (phone: string, pass?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (name: string, phone: string, pass?: string, initialCar?: Partial<CustomerCar>) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addCar: (car: Omit<CustomerCar, 'id' | 'addedAt'>) => Promise<boolean>;
  removeCar: (carId: string) => Promise<boolean>;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<boolean>;
  prefillBookingWithCar: (car: CustomerCar) => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('drfix_customer_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Real-time synchronization of customer document if logged in
  useEffect(() => {
    if (!customer?.id) return;
    const ref = doc(db, 'customers', customer.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CustomerProfile;
        const updated = { ...data, id: snap.id };
        setCustomer(updated);
        try {
          localStorage.setItem('drfix_customer_session', JSON.stringify(updated));
        } catch {}
      }
    }, (err) => {
      console.error('Customer sync error:', err);
    });

    return () => unsub();
  }, [customer?.id]);

  const login = async (rawPhone: string, pass?: string): Promise<{ success: boolean; error?: string }> => {
    const phone = cleanSaudiPhone(rawPhone);
    if (!phone || phone.length < 10) {
      return { success: false, error: 'يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx)' };
    }
    setLoading(true);
    try {
      let customerRef = doc(db, 'customers', phone);
      let snap = await getDoc(customerRef);

      // If document was not found directly by phone ID, query by phone field (e.g. registered with Google)
      if (!snap.exists()) {
        const qPhone = query(collection(db, 'customers'), where('phone', '==', phone));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          snap = phoneSnap.docs[0];
          customerRef = doc(db, 'customers', snap.id);
        }
      }

      if (!snap.exists()) {
        setLoading(false);
        return { 
          success: false, 
          error: 'لم يتم العثور على حساب بهذا الرقم. يمكنك الضغط على "إنشاء حساب جديد" أو تسجيل الدخول بجوجل للتسجيل بسهولة.' 
        };
      }

      const data = snap.data() as CustomerProfile;
      // If customer set a password and input is checked
      if (data.password && pass && data.password !== pass) {
        setLoading(false);
        return { success: false, error: 'كلمة المرور غير صحيحة.' };
      }

      const loggedUser: CustomerProfile = {
        ...data,
        id: snap.id,
        phone: data.phone || phone,
        cars: data.cars || []
      };

      // Update lastLoginAt
      await updateDoc(customerRef, { lastLoginAt: serverTimestamp() }).catch(() => {});

      setCustomer(loggedUser);
      localStorage.setItem('drfix_customer_session', JSON.stringify(loggedUser));
      setIsAuthOpen(false);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      setLoading(false);
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
    }
  };

  const handleGoogleUserSuccess = async (user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    phoneNumber?: string | null;
  }): Promise<{ success: boolean; error?: string }> => {
    // 1. Check if user already exists by uid
    const uidRef = doc(db, 'customers', user.uid);
    let snap = await getDoc(uidRef);
    let customerRef = uidRef;

    // 2. If not found by UID, check if one exists with matching email
    if (!snap.exists() && user.email) {
      const qEmail = query(collection(db, 'customers'), where('email', '==', user.email));
      const emailSnap = await getDocs(qEmail);
      if (!emailSnap.empty) {
        snap = emailSnap.docs[0];
        customerRef = doc(db, 'customers', snap.id);
      }
    }

    let profile: CustomerProfile;

    if (snap.exists()) {
      const existingData = snap.data() as CustomerProfile;
      profile = {
        ...existingData,
        id: snap.id,
        name: existingData.name || user.displayName || 'عميل كريم',
        email: user.email || existingData.email || '',
        photoURL: user.photoURL || existingData.photoURL,
        googleUid: user.uid,
        cars: existingData.cars || []
      };
      await updateDoc(customerRef, {
        lastLoginAt: serverTimestamp(),
        googleUid: user.uid,
        photoURL: user.photoURL || existingData.photoURL || null,
        email: user.email || existingData.email || ''
      }).catch((err) => console.warn('Non-critical customer update:', err));
    } else {
      profile = {
        id: user.uid,
        name: user.displayName || 'عميل كريم',
        email: user.email || '',
        phone: user.phoneNumber ? cleanSaudiPhone(user.phoneNumber) : '',
        photoURL: user.photoURL || undefined,
        googleUid: user.uid,
        cars: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(customerRef, profile);
    }

    setCustomer(profile);
    localStorage.setItem('drfix_customer_session', JSON.stringify(profile));
    setIsAuthOpen(false);
    setLoading(false);
    return { success: true };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('openid');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        return await handleGoogleUserSuccess(result.user);
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return { success: false, error: 'تم إغلاق نافذة تسجيل الدخول.' };
      }
      if (err?.code === 'auth/popup-blocked' || (err?.message && /popup/i.test(err.message))) {
        setLoading(false);
        return { 
          success: false, 
          error: 'تم حظر النوافذ المنبثقة بواسطة المتصفح. يمكنك الدخول فوراً وبكل سهولة بإدخال رقم جوالك أدناه دون الحاجة لكلمة مرور!' 
        };
      }

      setLoading(false);
      return { 
        success: false, 
        error: 'لتسجيل الدخول السريع، يمكنك إدخال رقم جوالك السعودي أدناه بدون كلمة مرور لفتح حسابك وسجل صياناتك مباشرة.' 
      };
    }

    setLoading(false);
    return { success: false, error: 'تعذر إتمام الدخول. يمكنك استخدام رقم جوالك مباشرة.' };
  };

  const register = async (
    name: string, 
    rawPhone: string, 
    pass?: string, 
    initialCar?: Partial<CustomerCar>
  ): Promise<{ success: boolean; error?: string }> => {
    const phone = cleanSaudiPhone(rawPhone);
    if (!name.trim()) {
      return { success: false, error: 'يرجى إدخال اسمك الكريم' };
    }
    if (!phone || phone.length < 10) {
      return { success: false, error: 'يرجى إدخال رقم جوال صحيح يبدأ بـ 05' };
    }

    setLoading(true);
    try {
      const customerRef = doc(db, 'customers', phone);
      const snap = await getDoc(customerRef);

      const carsList: CustomerCar[] = [];
      if (initialCar && initialCar.make && initialCar.model) {
        carsList.push({
          id: 'car_' + Date.now(),
          make: initialCar.make.trim(),
          model: initialCar.model.trim(),
          year: initialCar.year?.trim() || new Date().getFullYear().toString(),
          plateNumber: initialCar.plateNumber?.trim() || '',
          color: initialCar.color?.trim() || '',
          addedAt: new Date().toISOString()
        });
      }

      if (snap.exists()) {
        // Account exists, let's update profile smoothly
        const existingData = snap.data() as CustomerProfile;
        const mergedCars = existingData.cars && existingData.cars.length > 0 
          ? [...existingData.cars, ...carsList] 
          : carsList;

        const updatedProfile: CustomerProfile = {
          ...existingData,
          name: name.trim() || existingData.name,
          phone,
          password: pass || existingData.password || '',
          cars: mergedCars,
          updatedAt: serverTimestamp()
        };

        await setDoc(customerRef, updatedProfile, { merge: true });
        setCustomer({ ...updatedProfile, id: phone });
        localStorage.setItem('drfix_customer_session', JSON.stringify({ ...updatedProfile, id: phone }));
      } else {
        const newProfile: CustomerProfile = {
          id: phone,
          name: name.trim(),
          phone,
          password: pass || '',
          cars: carsList,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(customerRef, newProfile);
        setCustomer(newProfile);
        localStorage.setItem('drfix_customer_session', JSON.stringify(newProfile));
      }

      setIsAuthOpen(false);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Register error:', err);
      setLoading(false);
      return { success: false, error: 'تعذر إنشاء الحساب. يرجى المحاولة لاحقاً.' };
    }
  };

  const logout = () => {
    setCustomer(null);
    try {
      localStorage.removeItem('drfix_customer_session');
      auth.signOut().catch(() => {});
    } catch {}
    setIsPortalOpen(false);
  };

  const addCar = async (car: Omit<CustomerCar, 'id' | 'addedAt'>): Promise<boolean> => {
    if (!customer?.id) return false;
    try {
      const newCar: CustomerCar = {
        ...car,
        id: 'car_' + Date.now(),
        addedAt: new Date().toISOString()
      };
      const updatedCars = [...(customer.cars || []), newCar];
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        cars: updatedCars,
        updatedAt: serverTimestamp()
      });
      setCustomer(prev => prev ? { ...prev, cars: updatedCars } : null);
      return true;
    } catch (err) {
      console.error('Error adding car:', err);
      return false;
    }
  };

  const removeCar = async (carId: string): Promise<boolean> => {
    if (!customer?.id) return false;
    try {
      const updatedCars = (customer.cars || []).filter(c => c.id !== carId);
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        cars: updatedCars,
        updatedAt: serverTimestamp()
      });
      setCustomer(prev => prev ? { ...prev, cars: updatedCars } : null);
      return true;
    } catch (err) {
      console.error('Error removing car:', err);
      return false;
    }
  };

  const updateProfile = async (data: Partial<CustomerProfile>): Promise<boolean> => {
    if (!customer?.id) return false;
    try {
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      setCustomer(prev => prev ? { ...prev, ...data } : null);
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  const prefillBookingWithCar = (car: CustomerCar) => {
    setIsPortalOpen(false);
    // Find booking inputs or trigger custom event
    const event = new CustomEvent('drfix_prefill_booking', {
      detail: {
        carMake: car.make,
        carModel: car.model,
        carYear: car.year,
        plateNumber: car.plateNumber || '',
        customerName: customer?.name || '',
        customerPhone: customer?.phone || ''
      }
    });
    window.dispatchEvent(event);

    // Scroll smoothly to booking section
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <CustomerContext.Provider value={{
      customer,
      loading,
      isAuthOpen,
      setIsAuthOpen,
      isPortalOpen,
      setIsPortalOpen,
      authMode,
      setAuthMode,
      login,
      loginWithGoogle,
      register,
      logout,
      addCar,
      removeCar,
      updateProfile,
      prefillBookingWithCar
    }}>
      {children}
      <CustomerAuthModal />
      <CustomerPortalModal />
    </CustomerContext.Provider>
  );
};

// =========================================================================
// Modal: Customer Auth (Login & Register)
// =========================================================================
export const CustomerAuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, authMode, setAuthMode, login, loginWithGoogle, register, loading } = useCustomer();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optional quick car fields for registration
  const [showCarFields, setShowCarFields] = useState(true);
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('2022');
  const [plateNumber, setPlateNumber] = useState('');

  if (!isAuthOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const res = await loginWithGoogle();
    if (!res.success) {
      setErrorMsg(res.error || 'تعذر تسجيل الدخول بحساب Google');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (authMode === 'login') {
      const res = await login(phone, password);
      if (!res.success) {
        setErrorMsg(res.error || 'فشل تسجيل الدخول');
      }
    } else {
      const carData = (carMake.trim() && carModel.trim()) ? {
        make: carMake,
        model: carModel,
        year: carYear,
        plateNumber
      } : undefined;

      const res = await register(name, phone, password, carData);
      if (!res.success) {
        setErrorMsg(res.error || 'فشل إنشاء الحساب');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-red/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-red/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Close button */}
        <button 
          onClick={() => setIsAuthOpen(false)}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with DR.FIX Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-black border border-white/10 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg overflow-hidden">
            <img src="/logo-custom.png" alt="DR.FIX" className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-display font-black text-white">
            {authMode === 'login' ? 'تسجيل دخول العملاء' : 'إنشاء حساب عميل جديد'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {authMode === 'login' 
              ? 'سجل دخولك بحساب Google أو برقم جوالك للوصول لسياراتك وسجل صيانتك' 
              : 'سجل حسابك لحفظ سياراتك وتتبع الصيانة بضغطة زر'}
          </p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authMode === 'login' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authMode === 'register' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-neutral-800/90 border border-brand-red/30 text-xs flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-start gap-2.5 text-gray-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-brand-red" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                phoneInputRef.current?.focus();
                phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="self-start text-[11px] font-bold text-white bg-brand-red hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>المتابعة برقم الجوال أدناه</span>
            </button>
          </div>
        )}

        {/* Google Fast Authentication Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-neutral-100 text-gray-900 font-bold rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md disabled:opacity-50 group border border-gray-200"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-black">
              {authMode === 'login' ? 'المتابعة والدخول بحساب Google' : 'التسجيل السريع بحساب Google'}
            </span>
          </button>

          {typeof window !== 'undefined' && window.self !== window.top && (
            <p className="text-[11px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
              <span>إذا تم حظر النافذة بالمعاينة، يمكنك</span>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-brand-red underline hover:text-red-400 font-bold inline-flex items-center gap-0.5"
              >
                فتح الموقع بنافذة مستقلة
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-neutral-900 px-3 text-gray-400 font-medium">أو من خلال رقم الجوال</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">الاسم الكريم</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: عبدالعزيز السندي"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-brand-red transition-colors"
                />
                <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">رقم الجوال</label>
            <div className="relative">
              <input
                ref={phoneInputRef}
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-brand-red transition-colors text-right"
              />
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5">
              كلمة المرور / الرمز السري <span className="text-[10px] text-gray-500 font-normal">(اختياري لتأمين الحساب)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-brand-red transition-colors text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick car input on signup */}
          {authMode === 'register' && (
            <div className="pt-2 border-t border-white/10">
              <div 
                onClick={() => setShowCarFields(!showCarFields)} 
                className="flex items-center justify-between text-xs font-bold text-gray-300 cursor-pointer py-1 select-none"
              >
                <span className="flex items-center gap-1.5 text-brand-red">
                  <Car className="w-4 h-4" />
                  إضافة سيارتك الآن (لتسريع الحجز لاحقاً)
                </span>
                <span className="text-[10px] text-gray-400">{showCarFields ? 'إخفاء' : 'إظهار'}</span>
              </div>

              {showCarFields && (
                <div className="grid grid-cols-2 gap-2.5 mt-2 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">الشركة المصنعة</label>
                    <input
                      type="text"
                      value={carMake}
                      onChange={e => setCarMake(e.target.value)}
                      placeholder="تويوتا، فورد..."
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">الموديل</label>
                    <input
                      type="text"
                      value={carModel}
                      onChange={e => setCarModel(e.target.value)}
                      placeholder="كامري، تورس..."
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">سنة الصنع</label>
                    <input
                      type="text"
                      value={carYear}
                      onChange={e => setCarYear(e.target.value)}
                      placeholder="2022"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-red"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">رقم اللوحة (اختياري)</label>
                    <input
                      type="text"
                      value={plateNumber}
                      onChange={e => setPlateNumber(e.target.value)}
                      placeholder="أ ب ج 1234"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-brand-red"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-brand-red/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : authMode === 'login' ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span>دخول لحسابي</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>تأكيد وإنشاء الحساب</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setErrorMsg(null);
            }}
            className="text-xs text-gray-400 hover:text-brand-red transition-colors cursor-pointer"
          >
            {authMode === 'login' 
              ? 'ليس لديك حساب بعد؟ اضغط هنا للتسجيل' 
              : 'لديك حساب بالفعل؟ اضغط هنا لتسجيل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// Modal: Customer Portal (لوحة العميل / حسابي)
// =========================================================================
export const CustomerPortalModal: React.FC = () => {
  const { 
    customer, isPortalOpen, setIsPortalOpen, logout, addCar, removeCar, 
    updateProfile, prefillBookingWithCar 
  } = useCustomer();

  const [activeTab, setActiveTab] = useState<'bookings' | 'cars' | 'profile'>('bookings');
  const [showAddCarForm, setShowAddCarForm] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newPlate, setNewPlate] = useState('');
  const [newColor, setNewColor] = useState('');
  const [addingCar, setAddingCar] = useState(false);

  // Customer bookings listener
  const [myBookings, setMyBookings] = useState<MaintenanceRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Profile edit
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (customer) {
      setEditName(customer.name || '');
      setEditEmail(customer.email || '');
      setEditAddress(customer.address || '');
      setEditPhone(customer.phone || '');
    }
  }, [customer]);

  useEffect(() => {
    if (!isPortalOpen || !customer) return;
    setLoadingBookings(true);

    const cleaned = customer.phone ? cleanSaudiPhone(customer.phone) : '';
    const phoneVariants = Array.from(new Set([
      customer.phone,
      cleaned,
      cleaned && cleaned.length >= 9 ? `0${cleaned.slice(-9)}` : '',
      cleaned && cleaned.length >= 9 ? `+966${cleaned.slice(-9)}` : '',
      cleaned && cleaned.length >= 9 ? `966${cleaned.slice(-9)}` : '',
      customer.phone?.replace(/\+/g, ''),
      customer.phone?.replace(/\s+/g, '')
    ].filter(Boolean))) as string[];

    const unsubscribers: (() => void)[] = [];
    const resultMap = new Map<string, MaintenanceRecord>();

    const updateAndSort = () => {
      const list = Array.from(resultMap.values());
      list.sort((a, b) => {
        const timeA = (a as any).createdAt?.toMillis ? (a as any).createdAt.toMillis() : new Date(a.serviceDate || 0).getTime();
        const timeB = (b as any).createdAt?.toMillis ? (b as any).createdAt.toMillis() : new Date(b.serviceDate || 0).getTime();
        return timeB - timeA;
      });
      setMyBookings(list);
      setLoadingBookings(false);
    };

    if (phoneVariants.length > 0) {
      const qPhone = query(
        collection(db, 'maintenance'),
        where('customerPhone', 'in', phoneVariants.slice(0, 10))
      );
      unsubscribers.push(onSnapshot(qPhone, (snap) => {
        snap.forEach(d => {
          resultMap.set(d.id, { id: d.id, ...d.data() } as MaintenanceRecord);
        });
        updateAndSort();
      }, (err) => {
        console.warn('Customer phone bookings query warning:', err);
        setLoadingBookings(false);
      }));
    }

    if (customer.id) {
      const qId = query(
        collection(db, 'maintenance'),
        where('customerId', '==', customer.id)
      );
      unsubscribers.push(onSnapshot(qId, (snap) => {
        snap.forEach(d => {
          resultMap.set(d.id, { id: d.id, ...d.data() } as MaintenanceRecord);
        });
        updateAndSort();
      }, (err) => {
        console.warn('Customer ID bookings query warning:', err);
      }));
    }

    if (phoneVariants.length === 0 && !customer.id) {
      setLoadingBookings(false);
    }

    return () => {
      unsubscribers.forEach(u => u());
    };
  }, [isPortalOpen, customer?.phone, customer?.id]);

  if (!isPortalOpen || !customer) return null;

  const handleSaveNewCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMake.trim() || !newModel.trim()) return;
    setAddingCar(true);
    const ok = await addCar({
      make: newMake.trim(),
      model: newModel.trim(),
      year: newYear.trim() || '2022',
      plateNumber: newPlate.trim(),
      color: newColor.trim()
    });
    setAddingCar(false);
    if (ok) {
      setNewMake('');
      setNewModel('');
      setNewPlate('');
      setNewColor('');
      setShowAddCarForm(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const cleaned = editPhone.trim() ? cleanSaudiPhone(editPhone) : '';
    await updateProfile({
      name: editName.trim(),
      phone: cleaned || customer.phone || '',
      email: editEmail.trim(),
      address: editAddress.trim()
    });
    setSavingProfile(false);
    alert('تم حفظ البيانات بنجاح');
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'new':
      case 'pending':
        return {
          step: 1,
          label: 'تم استلام الطلب',
          badgeText: 'قيد المراجعة ⏳',
          badgeClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
          desc: 'تم تسجيل طلبك بنجاح في النظام وجاري مراجعته من قبل إدارة العمليات للتأكيد والتوجيه.',
          pulseColor: 'bg-yellow-400',
          isLive: true
        };
      case 'accepted':
        return {
          step: 2,
          label: 'تم القبول وتأكيد الموعد',
          badgeText: 'تم القبول وتأكيد الموعد ✅',
          badgeClass: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
          desc: 'تم قبول طلبك واعتماد موعد الصيانة وتجهيز الفريق والورشة المتنقلة للانطلاق في الوقت المحدد.',
          pulseColor: 'bg-blue-400',
          isLive: true
        };
      case 'on_the_way':
        return {
          step: 3,
          label: 'الفني في الطريق لموقعك',
          badgeText: 'الفني في الطريق 🚗💨',
          badgeClass: 'bg-purple-500/25 border-purple-500/50 text-purple-300',
          desc: 'الفني الميكانيكي المتنقل في طريقه الآن إلى موقعك في جدة! يرجى إبقاء الهاتف متاحاً للتنسيق.',
          pulseColor: 'bg-purple-400',
          isLive: true
        };
      case 'in-progress':
        return {
          step: 4,
          label: 'جاري الفحص والصيانة',
          badgeText: 'جاري العمل والصيانة 🔧',
          badgeClass: 'bg-orange-500/25 border-orange-500/50 text-orange-400',
          desc: 'يقوم الفني الآن بأعمال الفحص والإصلاح المباشر لسيارتك بأحدث المعدات والأجهزة المتطورة.',
          pulseColor: 'bg-orange-400',
          isLive: true
        };
      case 'completed':
        return {
          step: 5,
          label: 'اكتملت الصيانة بنجاح',
          badgeText: 'تم الإنجاز بنجاح 🏁',
          badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
          desc: 'تم الانتهاء من كافة أعمال الصيانة بنجاح. نتمنى لك قيادة آمنة ويسري ضمان DR.FIX الذهبي المعتمد.',
          pulseColor: 'bg-emerald-400',
          isLive: false
        };
      case 'cancelled':
        return {
          step: 0,
          label: 'طلب ملغي',
          badgeText: 'ملغي ❌',
          badgeClass: 'bg-red-500/15 border-red-500/30 text-red-400',
          desc: 'تم إلغاء هذا الطلب. يمكنك حجز موعد صيانة جديد في أي وقت يناسبك.',
          pulseColor: 'bg-red-400',
          isLive: false
        };
      default:
        return {
          step: 1,
          label: status,
          badgeText: status,
          badgeClass: 'bg-gray-700 text-gray-300',
          desc: 'حالة الطلب قيد التحديث المستمر.',
          pulseColor: 'bg-gray-400',
          isLive: false
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {customer.photoURL ? (
              <img 
                src={customer.photoURL} 
                alt={customer.name} 
                className="w-11 h-11 rounded-full object-cover border-2 border-brand-red/50 shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-brand-red/20 border-2 border-brand-red/40 flex items-center justify-center text-brand-red font-black text-lg shrink-0">
                {customer.name?.charAt(0) || <User className="w-5 h-5" />}
              </div>
            )}
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {customer.name}
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-red/15 text-brand-red border border-brand-red/30 font-bold">
                  عميل DR.FIX المعتمد
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5" dir="ltr">
                {customer.phone || customer.email || 'حساب مفعل'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              title="تسجيل الخروج"
              className="p-2 text-gray-400 hover:text-red-400 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
            <button
              onClick={() => setIsPortalOpen(false)}
              className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice for Google users who haven't saved a phone number yet */}
        {(!customer.phone || customer.phone.length < 9) && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white mb-1">خطوة مهمة: يرجى إضافة رقم جوالك السعودي</h4>
                <p className="text-[11px] text-gray-300 mb-2.5">
                  لربط كرت الصيانة التلقائي وتسهيل اتصال الفني بك عند التوجه لموقعك في جدة.
                </p>
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400 text-right font-mono"
                  />
                  <button
                    type="button"
                    disabled={savingPhone || !editPhone.trim()}
                    onClick={async () => {
                      const cleaned = cleanSaudiPhone(editPhone);
                      if (!cleaned || cleaned.length < 10) {
                        alert('يرجى كتابة رقم جوال سعودي صحيح يبدأ بـ 05');
                        return;
                      }
                      setSavingPhone(true);
                      await updateProfile({ phone: cleaned });
                      setSavingPhone(false);
                      alert('تم حفظ رقم الجوال بنجاح وتحديث ملفك!');
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {savingPhone ? 'جاري الحفظ...' : 'حفظ الرقم'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portal Tabs */}
        <div className="grid grid-cols-3 border-b border-white/10 bg-black/30 text-xs font-bold">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-3 sm:py-3.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'bookings' 
                ? 'border-brand-red text-white bg-brand-red/10' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-brand-red" />
            <span>كرت الصيانة والتتبع ({myBookings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cars')}
            className={`py-3 sm:py-3.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'cars' 
                ? 'border-brand-red text-white bg-brand-red/10' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4 text-brand-red" />
            <span>سياراتي ({customer.cars?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 sm:py-3.5 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile' 
                ? 'border-brand-red text-white bg-brand-red/10' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-brand-red" />
            <span>بياناتي الشخصية</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MY CARS */}
          {activeTab === 'cars' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">السيارات المسجلة في حسابك</h4>
                  <p className="text-xs text-gray-400">احجز بضغطة زر واحدة لأي سيارة مسجلة</p>
                </div>
                {!showAddCarForm && (
                  <button
                    onClick={() => setShowAddCarForm(true)}
                    className="px-3 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سيارة</span>
                  </button>
                )}
              </div>

              {/* Add Car Form */}
              {showAddCarForm && (
                <form onSubmit={handleSaveNewCar} className="p-4 rounded-2xl bg-black/60 border border-brand-red/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-red flex items-center gap-1.5">
                      <Car className="w-4 h-4" />
                      إضافة سيارة جديدة
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddCarForm(false)}
                      className="text-gray-400 hover:text-white text-xs cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">الشركة المصنعة *</label>
                      <input
                        type="text"
                        required
                        value={newMake}
                        onChange={e => setNewMake(e.target.value)}
                        placeholder="تويوتا، مازدا، نيسان..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">الموديل *</label>
                      <input
                        type="text"
                        required
                        value={newModel}
                        onChange={e => setNewModel(e.target.value)}
                        placeholder="كامري، CX9، باترول..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">سنة الصنع</label>
                      <input
                        type="text"
                        value={newYear}
                        onChange={e => setNewYear(e.target.value)}
                        placeholder="2023"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">رقم اللوحة</label>
                      <input
                        type="text"
                        value={newPlate}
                        onChange={e => setNewPlate(e.target.value)}
                        placeholder="أ ب ج 1234"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={addingCar}
                    className="w-full py-2.5 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {addingCar ? 'جاري الحفظ...' : 'حفظ السيارة في حسابي'}
                  </button>
                </form>
              )}

              {/* Cars List */}
              {(!customer.cars || customer.cars.length === 0) ? (
                <div className="text-center py-8 bg-black/30 border border-white/5 rounded-2xl p-6">
                  <Car className="w-12 h-12 text-gray-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-gray-400">لم تقم بإضافة أي سيارة حتى الآن.</p>
                  <button
                    onClick={() => setShowAddCarForm(true)}
                    className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة سيارتك الأولى الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customer.cars.map(car => (
                    <div 
                      key={car.id} 
                      className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-brand-red/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red">
                              <Car className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-sm text-white">{car.make} {car.model}</h5>
                              <span className="text-[11px] text-gray-400">موديل {car.year}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف ${car.make} ${car.model}؟`)) {
                                removeCar(car.id);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            title="حذف السيارة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {car.plateNumber && (
                          <div className="mt-3 inline-block px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-gray-300">
                            🚘 اللوحة: {car.plateNumber}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5">
                        <button
                          onClick={() => prefillBookingWithCar(car)}
                          className="w-full py-2 bg-brand-red/20 hover:bg-brand-red text-brand-red hover:text-white border border-brand-red/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>احجز صيانة لهذه السيارة الآن</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1 (PRIMARY): MAINTENANCE CARDS & LIVE TRACKING */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>كروت الصيانة والتتبع المباشر</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h4>
                  <p className="text-xs text-gray-400">متابعة مراحل الصيانة وتحديثات الفني لحظة بلحظة</p>
                </div>
                <button
                  onClick={() => {
                    setIsPortalOpen(false);
                    const el = document.getElementById('booking');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>حجز صيانة جديدة</span>
                </button>
              </div>

              {loadingBookings ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-gray-400">جاري تحميل كروت الصيانة والتحديثات المباشرة...</p>
                </div>
              ) : myBookings.length === 0 ? (
                <div className="text-center py-10 bg-black/30 border border-white/5 rounded-2xl p-6 space-y-3">
                  <FileText className="w-12 h-12 text-brand-red/60 mx-auto opacity-70" />
                  <h5 className="font-bold text-sm text-white">أهلاً بك يا {customer.name}!</h5>
                  <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                    كرت الصيانة الإلكتروني سيظهر هنا فور حجزك لمتابعة كل مرحلة لحظة بلحظة (تم القبول، الفني بالطريق، جاري الفحص والإصلاح).
                  </p>
                  <button
                    onClick={() => {
                      setIsPortalOpen(false);
                      const el = document.getElementById('booking');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="mt-2 px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand-red/20 transition-all"
                  >
                    <Wrench className="w-4 h-4" />
                    احجز أول كرت صيانة لسيارتك الآن
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBookings.map((b) => {
                    const statusInfo = getStatusDetails(b.status);
                    const bookingCode = b.bookingId || `#${b.id.slice(0, 7).toUpperCase()}`;

                    return (
                      <div 
                        key={b.id} 
                        className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-neutral-900 to-black/80 border ${
                          statusInfo.isLive ? 'border-brand-red/40 shadow-xl shadow-brand-red/5' : 'border-white/10'
                        } transition-all space-y-4`}
                      >
                        {/* Card Header Ribbon */}
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-brand-red text-white text-[10px] font-black uppercase tracking-wider">
                                كرت صيانة
                              </span>
                              <span className="text-xs font-mono font-bold text-gray-300">
                                {bookingCode}
                              </span>
                            </div>
                            <h5 className="font-bold text-base text-white mt-1">
                              {b.carMake || ''} {b.carModel || 'صيانة سيارة'} {b.carYear ? `(${b.carYear})` : ''}
                            </h5>
                          </div>

                          <div className="text-left">
                            <span className={`px-3 py-1 rounded-full border text-xs font-bold inline-flex items-center gap-1.5 ${statusInfo.badgeClass}`}>
                              {statusInfo.isLive && (
                                <span className="relative flex h-2 w-2">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.pulseColor} opacity-75`}></span>
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${statusInfo.pulseColor}`}></span>
                                </span>
                              )}
                              {statusInfo.badgeText}
                            </span>
                          </div>
                        </div>

                        {/* Interactive 5-Step Pipeline Progress Tracker */}
                        <div className="bg-black/60 p-3 sm:p-4 rounded-xl border border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-400">مراحل إنجاز الصيانة:</span>
                            <span className="text-white font-medium">{statusInfo.label}</span>
                          </div>

                          {/* 5-Step Visual Stepper */}
                          <div className="relative flex items-center justify-between pt-1 pb-1">
                            {/* Track Line */}
                            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-white/10 -z-0" />
                            <div 
                              className="absolute top-1/2 right-4 -translate-y-1/2 h-1 bg-gradient-to-l from-brand-red to-emerald-500 transition-all duration-700 -z-0"
                              style={{
                                width: b.status === 'cancelled' ? '0%' :
                                       b.status === 'completed' ? 'calc(100% - 32px)' :
                                       b.status === 'in-progress' ? '75%' :
                                       b.status === 'on_the_way' ? '50%' :
                                       b.status === 'accepted' ? '25%' : '5%'
                              }}
                            />

                            {[
                              { step: 1, title: 'الاستلام', icon: FileText },
                              { step: 2, title: 'تم القبول', icon: CheckCircle2 },
                              { step: 3, title: 'بالطريق', icon: Car },
                              { step: 4, title: 'فحص وصيانة', icon: Wrench },
                              { step: 5, title: 'جاهزة', icon: Sparkles }
                            ].map(st => {
                              const isDone = (statusInfo.step > st.step) || (b.status === 'completed');
                              const isCurrent = (statusInfo.step === st.step) && (b.status !== 'completed');
                              const Icon = st.icon;

                              return (
                                <div key={st.step} className="relative z-10 flex flex-col items-center gap-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isDone 
                                      ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20' 
                                      : isCurrent
                                      ? 'bg-brand-red text-white ring-4 ring-brand-red/30 shadow-lg shadow-brand-red/40 animate-pulse'
                                      : 'bg-neutral-800 text-gray-400 border border-white/10'
                                  }`}>
                                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                                  </div>
                                  <span className={`text-[10px] font-bold ${
                                    isCurrent ? 'text-brand-red font-black' : isDone ? 'text-emerald-400' : 'text-gray-400'
                                  }`}>
                                    {st.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Live Technician Status Alert Box */}
                          <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                            b.status === 'on_the_way' 
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                              : b.status === 'accepted'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                              : b.status === 'in-progress'
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                              : b.status === 'completed'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                              : 'bg-white/5 border-white/10 text-gray-300'
                          }`}>
                            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-brand-red" />
                            <div className="flex-1">
                              <p className="font-bold text-[11px] mb-0.5">تحديث مباشر من فني DR.FIX:</p>
                              <p className="text-[11px] opacity-90">{statusInfo.desc}</p>
                            </div>
                          </div>
                        </div>

                        {/* Card Specifications Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-black/30 p-3 rounded-xl border border-white/5 text-[11px]">
                          <div>
                            <span className="text-gray-400 block text-[10px]">نوع الخدمة:</span>
                            <span className="font-bold text-brand-red">{b.serviceType || 'صيانة متنقلة'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">الموقع / الحي:</span>
                            <span className="font-bold text-white flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-brand-red shrink-0" />
                              {b.location || 'جدة'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">موعد الصيانة:</span>
                            <span className="font-bold text-gray-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                              {b.serviceDate ? (typeof b.serviceDate === 'string' ? b.serviceDate : new Date(b.serviceDate?.toMillis ? b.serviceDate.toMillis() : b.serviceDate).toLocaleDateString('ar-SA')) : 'موعد فوري'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">هاتف التواصل:</span>
                            <span className="font-bold text-gray-300 font-mono" dir="ltr">{b.customerPhone}</span>
                          </div>
                          {b.notes && (
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-gray-400 block text-[10px]">ملاحظات الفحص:</span>
                              <span className="text-gray-300 truncate block" title={b.notes}>{b.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Interactive Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Direct WhatsApp with Card Info */}
                          <a
                            href={`https://wa.me/966546870807?text=${encodeURIComponent(
                              `السلام عليكم DR.FIX، أستفسر عن حالة كرت الصيانة رقم (${bookingCode}) للسيارة (${b.carModel || 'السيارة'}) - الحالة الحالية: ${statusInfo.label}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>مراسلة العمليات والفني</span>
                          </a>

                          {/* Direct Call */}
                          <a
                            href="tel:0546870807"
                            className="py-2 px-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            title="اتصال هاتفي مباشر"
                          >
                            <Phone className="w-3.5 h-3.5 text-brand-red" />
                            <span className="hidden sm:inline">اتصال مباشر</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE & SETTINGS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">البيانات الشخصية</h4>
                <p className="text-xs text-gray-400 mb-3">تحديث بيانات الاتصال والعنوان لتسهيل وصول الفني</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">الاسم الكريم</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">رقم الجوال السعودي</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  dir="ltr"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-brand-red text-right font-mono"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">يُستخدم لتأكيد مواعيد الصيانة ومطابقة سجل حجوزاتك</span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  dir="ltr"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-brand-red text-right"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">العنوان الافتراضي في جدة (اختياري)</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder="مثال: حي الروضة، شارع الكيال"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-brand-red"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  تسجيل الخروج من هذا الجهاز
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// Header Action Button for Public Navbar
// =========================================================================
export const CustomerNavButton: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { customer, setIsAuthOpen, setIsPortalOpen } = useCustomer();

  if (customer) {
    return (
      <button
        onClick={() => setIsPortalOpen(true)}
        className={
          isMobile
            ? "w-full py-2.5 px-4 rounded-xl bg-brand-red/10 border border-brand-red/30 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
            : "flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer group"
        }
        title="حسابي وسياراتي"
      >
        <div className="flex items-center gap-1.5">
          {customer.photoURL ? (
            <img 
              src={customer.photoURL} 
              alt={customer.name} 
              className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center text-[10px] text-white shrink-0">
              {customer.name?.charAt(0) || <User className="w-3 h-3" />}
            </div>
          )}
          <span className="max-w-[90px] truncate">{customer.name}</span>
        </div>
        <span className="text-[10px] text-brand-red font-normal group-hover:underline">حسابي ▾</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsAuthOpen(true)}
      className={
        isMobile
          ? "w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10"
          : "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white text-xs font-bold transition-all cursor-pointer"
      }
    >
      <User className="w-3.5 h-3.5 text-brand-red" />
      <span>تسجيل الدخول</span>
    </button>
  );
};
