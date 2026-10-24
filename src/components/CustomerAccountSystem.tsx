import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, Car, Calendar, FileText, LogOut, Plus, Trash2, CheckCircle2, 
  Clock, AlertCircle, X, Shield, Phone, MapPin, ChevronLeft, ChevronRight,
  ExternalLink, Lock, UserCheck, Wrench, Sparkles, Eye, EyeOff,
  MessageCircle, Check, Bell, Moon, Sun, PlusCircle, LayoutDashboard,
  TrendingUp, Navigation, Activity
} from 'lucide-react';
import { 
  doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc, collection, query, where, onSnapshot, serverTimestamp, getDocs
} from 'firebase/firestore';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  setPersistence, 
  browserLocalPersistence, 
  indexedDBLocalPersistence,
  onAuthStateChanged
} from 'firebase/auth';
import { db, auth, firebaseConfig } from '../firebase';
import { CustomerProfile, CustomerCar, MaintenanceRecord, sortBookingsNewestFirst } from '../types';
import { CustomerVisualReport } from './CustomerVisualReport';
import { useScrollLock } from '../lib/scrollLock';
import { sendTelegramNotification, escapeTelegramHtml, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID } from '../lib/telegramUtils';

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

// Car normalization and deduplication helpers
export const normalizeCarText = (text?: string): string => {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
};

// Clean and extract 4-digit manufacturing year
export const cleanCarYear = (year?: any, fallbackText?: string): string => {
  const str = String(year || '').trim();
  const match = str.match(/\b(19\d{2}|20[0-3]\d)\b/);
  if (match) return match[1];
  if (fallbackText) {
    const fallbackMatch = String(fallbackText).match(/\b(19\d{2}|20[0-3]\d)\b/);
    if (fallbackMatch) return fallbackMatch[1];
  }
  return str;
};

// Clean make name and remove repeated words (e.g. "تويوتا تويوتا" -> "تويوتا")
export const cleanCarMake = (make?: string, model?: string): string => {
  let mk = (make || '').trim();
  if (!mk && model) {
    const firstWord = model.trim().split(/\s+/)[0];
    if (firstWord && firstWord.length >= 2) mk = firstWord;
  }
  const words = mk.split(/\s+/).filter(Boolean);
  const uniqueWords: string[] = [];
  words.forEach(w => {
    if (!uniqueWords.some(u => normalizeCarText(u) === normalizeCarText(w))) {
      uniqueWords.push(w);
    }
  });
  return uniqueWords.join(' ') || (mk || 'سيارة');
};

// Deeply clean car model: removes repeated make, repeated year, brackets, and repeated words
export const cleanCarModel = (make?: string, model?: string, year?: string): string => {
  let m = (model || '').trim();
  const mk = cleanCarMake(make, model);

  // 1. Remove bracketed years and numbers (e.g. "(1989)", "[2021]")
  m = m.replace(/\s*[\(\[\{]\s*(19\d{2}|20[0-3]\d|\d+)\s*[\)\]\}]\s*/g, ' ');
  m = m.replace(/[\(\)\[\]\{\}]/g, ' ');

  // 2. Remove all 4-digit years (e.g. 1989, 2021, 2025)
  m = m.replace(/\b(19\d{2}|20[0-3]\d)\b/g, ' ');

  // 3. Remove all occurrences of make words (e.g. "تويوتا", "Toyota") from the model
  if (mk) {
    const mkWords = mk.split(/\s+/).filter(w => w.length >= 2);
    mkWords.forEach(w => {
      const normW = normalizeCarText(w);
      const words = m.split(/\s+/);
      m = words.filter(word => normalizeCarText(word) !== normW).join(' ');
    });
  }

  // 4. Remove consecutive duplicate words (e.g. "ياريس ياريس" -> "ياريس")
  const words = m.split(/\s+/).filter(Boolean);
  const deduplicatedWords: string[] = [];
  words.forEach(w => {
    if (deduplicatedWords.length === 0 || normalizeCarText(deduplicatedWords[deduplicatedWords.length - 1]) !== normalizeCarText(w)) {
      deduplicatedWords.push(w);
    }
  });
  m = deduplicatedWords.join(' ').trim();

  // Clean double spaces
  m = m.replace(/\s+/g, ' ').trim();
  return m || 'عام';
};

export const getCarSignature = (make?: string, model?: string, plate?: string, year?: string): string => {
  const normMk = normalizeCarText(cleanCarMake(make, model));
  const cleanM = normalizeCarText(cleanCarModel(make, model, year));
  const normPl = (plate || '').replace(/\s+/g, '');
  const cleanYr = cleanCarYear(year, model);
  return `${normMk}__${cleanM}${cleanYr ? `__${cleanYr}` : ''}${normPl ? `__${normPl}` : ''}`;
};

export const areCarsEqual = (
  carA?: { make?: string; model?: string; year?: string; plateNumber?: string } | null,
  carB?: { make?: string; model?: string; year?: string; plateNumber?: string } | null
): boolean => {
  if (!carA || !carB) return false;

  // 1. Plate match (if both have plate numbers of 3+ chars)
  const plateA = (carA.plateNumber || '').replace(/\s+/g, '');
  const plateB = (carB.plateNumber || '').replace(/\s+/g, '');
  if (plateA && plateB && plateA.length >= 3 && plateB.length >= 3) {
    if (plateA === plateB) return true;
  }

  // 2. Normalize makes
  const makeA = normalizeCarText(cleanCarMake(carA.make, carA.model));
  const makeB = normalizeCarText(cleanCarMake(carB.make, carB.model));

  // 3. Clean models
  const modelA = normalizeCarText(cleanCarModel(carA.make, carA.model, carA.year));
  const modelB = normalizeCarText(cleanCarModel(carB.make, carB.model, carB.year));

  // 4. Years
  const yearA = cleanCarYear(carA.year, carA.model);
  const yearB = cleanCarYear(carB.year, carB.model);

  if (makeA && makeB && makeA === makeB) {
    if (modelA === modelB) {
      if (yearA && yearB && yearA !== yearB) {
        return false;
      }
      return true;
    }
    if (modelA && modelB && (modelA.includes(modelB) || modelB.includes(modelA))) {
      if (yearA && yearB && yearA !== yearB) {
        return false;
      }
      return true;
    }
  }

  // 5. Fallback: full normalized combined string
  const fullA = normalizeCarText(`${makeA} ${modelA}`);
  const fullB = normalizeCarText(`${makeB} ${modelB}`);
  if (fullA && fullB && fullA === fullB) {
    if (yearA && yearB && yearA !== yearB) return false;
    return true;
  }

  return false;
};

// Comprehensive deduplicator that purges duplicate cars and cleans corrupted names
export const deduplicateCarsList = (cars: CustomerCar[] = [], removedSignatures: string[] = []): CustomerCar[] => {
  if (!Array.isArray(cars)) return [];
  const result: CustomerCar[] = [];

  for (const rawCar of cars) {
    if (!rawCar) continue;
    const cleanMake = cleanCarMake(rawCar.make, rawCar.model);
    const cleanModel = cleanCarModel(rawCar.make, rawCar.model, rawCar.year);
    const cleanYear = cleanCarYear(rawCar.year, rawCar.model) || (rawCar.year || '').toString().trim();
    const cleanPlate = (rawCar.plateNumber || '').trim();

    const cleanCar: CustomerCar = {
      ...rawCar,
      id: rawCar.id || ('car_' + Math.random().toString(36).substring(2, 9)),
      make: cleanMake,
      model: cleanModel,
      year: cleanYear,
      plateNumber: cleanPlate
    };

    const sig = getCarSignature(cleanMake, cleanModel, cleanPlate, cleanYear);
    if (removedSignatures.includes(sig)) {
      continue;
    }

    const isDup = result.some(existing => areCarsEqual(existing, cleanCar));
    if (!isDup) {
      result.push(cleanCar);
    }
  }

  return result;
};

// Notification dispatcher when a customer registers or joins
export const notifyAdminNewCustomerRegistration = async (params: {
  name: string;
  phone?: string;
  email?: string;
  car?: { make?: string; model?: string; year?: string };
  source: 'google' | 'phone_register' | 'quick_booking';
}) => {
  try {
    const rawPhone = (params.phone || '').trim();
    const cleanDigits = rawPhone.replace(/\D/g, '');
    let intPhone = '';
    if (cleanDigits.startsWith('00966')) {
      intPhone = cleanDigits.slice(2);
    } else if (cleanDigits.startsWith('05')) {
      intPhone = '966' + cleanDigits.slice(1);
    } else if (cleanDigits.startsWith('5') && cleanDigits.length === 9) {
      intPhone = '966' + cleanDigits;
    } else if (cleanDigits.startsWith('0') && !cleanDigits.startsWith('966')) {
      intPhone = '966' + cleanDigits.replace(/^0+/, '');
    } else if (!cleanDigits.startsWith('966') && cleanDigits.length === 9) {
      intPhone = '966' + cleanDigits;
    }

    const saudiTime = new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Riyadh'
    }).format(new Date());

    const sourceArabic = params.source === 'google' 
      ? 'جوجل Google 🌐' 
      : params.source === 'quick_booking'
      ? 'فتح ملف تلقائي عبر حجز صيانة 🚗'
      : 'تسجيل حساب جديد 📱';

    const carText = params.car && (params.car.model || params.car.make)
      ? `${params.car.make || ''} ${params.car.model || ''} ${params.car.year ? `(${params.car.year})` : ''}`.trim()
      : '';

    // 1. Try server-side notification endpoint
    let serverSent = false;
    try {
      const res = await fetch('/api/notify-customer-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name || 'عميل كريم',
          phone: rawPhone,
          email: params.email || '',
          source: params.source,
          car: carText
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok) serverSent = true;
      }
    } catch (e) {
      console.warn('Server registration notification failed, falling back to direct:', e);
    }

    // 2. Direct fallback to Telegram bot if server-side wasn't delivered
    if (!serverSent) {
      const tgText = `🔔 <b>تسجيل عميل جديد في DR.FIX</b> 👤\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>اسم العميل:</b> ${params.name || 'عميل كريم'}\n` +
        (rawPhone ? `📱 <b>رقم الجوال:</b> <code>${rawPhone}</code>\n` : '') +
        (params.email ? `📧 <b>البريد:</b> <code>${params.email}</code>\n` : '') +
        (carText ? `🚗 <b>السيارة:</b> ${carText}\n` : '') +
        `🔑 <b>طريقة التسجيل:</b> ${sourceArabic}\n` +
        `⏰ <b>التوقيت:</b> ${saudiTime}\n` +
        `━━━━━━━━━━━━━━━━━━`;

      const token = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
      const chatId = '867105778';

      let replyMarkup: any = undefined;
      if (intPhone) {
        replyMarkup = {
          inline_keyboard: [
            [
              { text: '💬 محادثة واتساب', url: `https://wa.me/${intPhone}` },
              { text: '📞 اتصال بالعميل', url: `tel:${rawPhone || intPhone}` }
            ]
          ]
        };
      }

      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgText,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      }).catch(err => console.warn('Direct Telegram customer notification error:', err));
    }

    // 3. Record in Firestore 'notifications' collection
    await addDoc(collection(db, 'notifications'), {
      type: 'new_customer_registration',
      title: 'تسجيل عميل جديد 👤',
      body: `انضم عميل جديد: ${params.name || 'عميل'} ${rawPhone ? `(${rawPhone})` : ''}`,
      customerName: params.name || 'عميل',
      customerPhone: rawPhone,
      customerEmail: params.email || '',
      source: params.source,
      car: carText || null,
      createdAt: serverTimestamp(),
      read: false
    }).catch(err => console.warn('Firestore notification add error:', err));

    // 4. Dispatch browser custom event for active admin
    window.dispatchEvent(new CustomEvent('drfix_admin_new_customer', { detail: params }));
  } catch (err) {
    console.warn('notifyAdminNewCustomerRegistration error:', err);
  }
};

// Auto-sync customer cars from maintenance bookings and legacy vehicle files
export const syncCustomerCarsWithBookings = async (
  currentCustomer: CustomerProfile
): Promise<CustomerProfile> => {
  if (!currentCustomer?.id) return currentCustomer;

  try {
    const rawPhone = (currentCustomer.phone || '').trim();
    const cleanDigits = rawPhone.replace(/\D/g, '');
    let shortPhone = cleanDigits;
    if (cleanDigits.startsWith('966')) shortPhone = '0' + cleanDigits.slice(3);
    else if (cleanDigits.startsWith('00966')) shortPhone = '0' + cleanDigits.slice(5);
    else if (cleanDigits.startsWith('5')) shortPhone = '0' + cleanDigits;

    const phoneVariants = Array.from(new Set([
      rawPhone,
      cleanDigits,
      shortPhone,
      shortPhone ? `+966${shortPhone.slice(1)}` : '',
      shortPhone ? `966${shortPhone.slice(1)}` : '',
      rawPhone.replace(/\+/g, ''),
      rawPhone.replace(/\s+/g, '')
    ].filter(Boolean))) as string[];

    const removedSignatures: string[] = Array.isArray(currentCustomer.removedCars)
      ? currentCustomer.removedCars
      : [];

    // 0. Clean and deduplicate existing cars list
    const initialCars = Array.isArray(currentCustomer.cars) ? currentCustomer.cars : [];
    let currentCars = deduplicateCarsList(initialCars, removedSignatures);
    let hasChanges = currentCars.length !== initialCars.length;

    // 1. Sync from legacy 'vehicles' field if present on customer doc
    const legacyVehicles: any[] = Array.isArray((currentCustomer as any).vehicles)
      ? (currentCustomer as any).vehicles
      : [];

    legacyVehicles.forEach((v: any) => {
      const rawMake = (v.make || '').trim();
      const rawModel = (v.model || '').trim();
      if (!rawMake && !rawModel) return;

      const make = cleanCarMake(rawMake, rawModel);
      const year = cleanCarYear(v.year, rawModel) || (v.year || '').toString().trim() || new Date().getFullYear().toString();
      const model = cleanCarModel(make, rawModel, year);
      const plate = (v.plateNumber || '').trim();

      const candidateCar: CustomerCar = {
        id: 'car_sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        make,
        model,
        year,
        plateNumber: plate,
        addedAt: new Date().toISOString()
      };

      const sig = getCarSignature(make, model, plate, year);
      if (removedSignatures.includes(sig)) return;

      const exists = currentCars.some((c) => areCarsEqual(c, candidateCar));
      if (!exists) {
        currentCars.push(candidateCar);
        hasChanges = true;
      }
    });

    // 2. Fetch past and current bookings from 'maintenance' collection
    const fetchedBookings: any[] = [];
    if (phoneVariants.length > 0) {
      try {
        const qPhone = query(
          collection(db, 'maintenance'),
          where('customerPhone', 'in', phoneVariants.slice(0, 10))
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach(d => fetchedBookings.push({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Phone bookings query error:', err);
      }
    }

    if (currentCustomer.id) {
      try {
        const qId = query(
          collection(db, 'maintenance'),
          where('customerId', '==', currentCustomer.id)
        );
        const snapId = await getDocs(qId);
        snapId.forEach(d => fetchedBookings.push({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Customer ID bookings query error:', err);
      }
    }

    // 3. Extract and merge unique cars from bookings
    fetchedBookings.forEach((b: any) => {
      const bMake = (b.carMake || '').trim();
      const bModel = (b.carModel || '').trim();
      if (!bMake && !bModel) return;

      const make = cleanCarMake(bMake, bModel);
      const year = cleanCarYear(b.carYear, bModel) || (b.carYear || '').toString().trim() || new Date().getFullYear().toString();
      const model = cleanCarModel(make, bModel, year);
      const plate = (b.plateNumber || '').trim();

      const candidateCar: CustomerCar = {
        id: 'car_booking_' + (b.id || Date.now()) + '_' + Math.random().toString(36).substring(2, 6),
        make,
        model,
        year,
        plateNumber: plate,
        addedAt: new Date().toISOString()
      };

      const sig = getCarSignature(make, model, plate, year);
      if (removedSignatures.includes(sig)) return;

      const exists = currentCars.some((c) => areCarsEqual(c, candidateCar));
      if (!exists) {
        currentCars.push(candidateCar);
        hasChanges = true;
      }
    });

    // Run final deduplication
    const finalCleanCars = deduplicateCarsList(currentCars, removedSignatures);
    if (finalCleanCars.length !== initialCars.length || JSON.stringify(finalCleanCars) !== JSON.stringify(initialCars)) {
      hasChanges = true;
      currentCars = finalCleanCars;
    }

    if (hasChanges) {
      const customerRef = doc(db, 'customers', currentCustomer.id);
      await updateDoc(customerRef, {
        cars: currentCars,
        updatedAt: serverTimestamp()
      }).catch(err => console.warn('Could not update customer cars in Firestore:', err));

      if (currentCustomer.phone && currentCustomer.phone !== currentCustomer.id) {
        try {
          const directPhoneRef = doc(db, 'customers', currentCustomer.phone);
          const pSnap = await getDoc(directPhoneRef);
          if (pSnap.exists()) {
            await updateDoc(directPhoneRef, {
              cars: currentCars,
              updatedAt: serverTimestamp()
            });
          }
        } catch {}
      }

      const updated = { ...currentCustomer, cars: currentCars };
      try {
        localStorage.setItem('drfix_customer_session', JSON.stringify(updated));
      } catch {}
      return updated;
    }
  } catch (err) {
    console.warn('syncCustomerCarsWithBookings error:', err);
  }

  return currentCustomer;
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.cars)) {
          parsed.cars = deduplicateCarsList(parsed.cars, parsed.removedCars || []);
        }
        return parsed;
      }
      return null;
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
    // Initialize local auth persistence once on mount
    try {
      setPersistence(auth, indexedDBLocalPersistence).catch(() => {
        setPersistence(auth, browserLocalPersistence).catch(() => {});
      });
    } catch {}
  }, []);

  // Real-time synchronization of customer document if logged in
  useEffect(() => {
    if (!customer?.id) return;
    const ref = doc(db, 'customers', customer.id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CustomerProfile;
        const rawCars: CustomerCar[] = Array.isArray(data.cars) ? data.cars : [];
        const cleanCars = deduplicateCarsList(rawCars, data.removedCars || []);

        // Self-heal corrupted or duplicate entries in Firestore immediately!
        if (cleanCars.length !== rawCars.length || JSON.stringify(cleanCars) !== JSON.stringify(rawCars)) {
          updateDoc(ref, {
            cars: cleanCars,
            updatedAt: serverTimestamp()
          }).catch(err => console.warn('Could not self-heal cars in Firestore:', err));

          if (data.phone && data.phone !== snap.id) {
            try {
              updateDoc(doc(db, 'customers', data.phone), {
                cars: cleanCars,
                updatedAt: serverTimestamp()
              }).catch(() => {});
            } catch {}
          }
        }

        const updated = { ...data, id: snap.id, cars: cleanCars };
        setCustomer(updated);
        try {
          localStorage.setItem('drfix_customer_session', JSON.stringify(updated));
        } catch {}
      }
    }, (err) => {
      const errStr = err instanceof Error ? err.message : String(err);
      if (errStr.includes('Quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        console.warn('[Firestore Quota] Customer real-time sync paused, using local profile session.');
      } else {
        console.error('Customer sync error:', err);
      }
    });

    // Initial background car sync
    syncCustomerCarsWithBookings(customer).then(updated => {
      if (updated && updated.cars && updated.cars.length !== (customer.cars || []).length) {
        setCustomer(updated);
      }
    }).catch(() => {});

    return () => unsub();
  }, [customer?.id]);

  // Listen to new bookings created anywhere in app to auto-sync cars, and portal open requests
  useEffect(() => {
    const handleCarsUpdateEvent = () => {
      if (customer?.id) {
        syncCustomerCarsWithBookings(customer).then(updated => {
          if (updated) setCustomer(updated);
        }).catch(() => {});
      } else {
        try {
          const saved = localStorage.getItem('drfix_customer_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed) setCustomer(parsed);
          }
        } catch {}
      }
    };
    const handleOpenPortal = () => {
      if (customer) {
        setIsPortalOpen(true);
      } else {
        setIsAuthOpen(true);
      }
    };
    const handleOpenAuth = () => {
      setIsAuthOpen(true);
    };

    window.addEventListener('drfix_customer_cars_updated', handleCarsUpdateEvent);
    window.addEventListener('drfix_open_portal', handleOpenPortal);
    window.addEventListener('drfix_open_auth', handleOpenAuth);

    return () => {
      window.removeEventListener('drfix_customer_cars_updated', handleCarsUpdateEvent);
      window.removeEventListener('drfix_open_portal', handleOpenPortal);
      window.removeEventListener('drfix_open_auth', handleOpenAuth);
    };
  }, [customer]);

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

      const rawCars = Array.isArray(data.cars) ? data.cars : [];
      const cleanCars = deduplicateCarsList(rawCars, data.removedCars || []);

      const loggedUser: CustomerProfile = {
        ...data,
        id: snap.id,
        phone: data.phone || phone,
        cars: cleanCars
      };

      // Update lastLoginAt
      await updateDoc(customerRef, { 
        lastLoginAt: serverTimestamp(),
        cars: cleanCars
      }).catch(() => {});

      setCustomer(loggedUser);
      try {
        localStorage.setItem('drfix_customer_session', JSON.stringify(loggedUser));
        localStorage.removeItem('drfix_customer_logged_out');
      } catch {}

      // Auto-sync cars from past/current bookings into customer profile
      syncCustomerCarsWithBookings(loggedUser).then(synced => {
        if (synced && synced.cars && synced.cars.length !== loggedUser.cars.length) {
          setCustomer(synced);
        }
      }).catch(() => {});

      setIsAuthOpen(false);
      setIsPortalOpen(true);
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
    try {
      const cleanEmail = (user.email || '').trim().toLowerCase();
      const rawUserPhone = user.phoneNumber ? cleanSaudiPhone(user.phoneNumber) : '';
      let cachedPhone = '';
      try {
        cachedPhone = cleanSaudiPhone(localStorage.getItem('drfix_customer_phone') || '');
      } catch {}

      // 1. Thoroughly search existing customer across all identifiers to prevent ANY duplicate profile creation
      const candidateDocs: { id: string; ref: any; data: CustomerProfile }[] = [];
      const seenIds = new Set<string>();

      // a. Direct doc by UID
      const uidRef = doc(db, 'customers', user.uid);
      try {
        const uidSnap = await getDoc(uidRef);
        if (uidSnap.exists()) {
          seenIds.add(uidSnap.id);
          candidateDocs.push({ id: uidSnap.id, ref: uidRef, data: uidSnap.data() as CustomerProfile });
        }
      } catch (e) {
        console.warn('UID check warning:', e);
      }

      // b. Query by googleUid
      try {
        const qGoogle = query(collection(db, 'customers'), where('googleUid', '==', user.uid));
        const gSnap = await getDocs(qGoogle);
        gSnap.forEach(d => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() as CustomerProfile });
          }
        });
      } catch (e) {}

      // c. Query by email (exact match and lowercase)
      if (user.email) {
        try {
          const qEmail = query(collection(db, 'customers'), where('email', '==', user.email));
          const eSnap = await getDocs(qEmail);
          eSnap.forEach(d => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() as CustomerProfile });
            }
          });

          if (cleanEmail && cleanEmail !== user.email) {
            const qEmailLower = query(collection(db, 'customers'), where('email', '==', cleanEmail));
            const elSnap = await getDocs(qEmailLower);
            elSnap.forEach(d => {
              if (!seenIds.has(d.id)) {
                seenIds.add(d.id);
                candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() as CustomerProfile });
              }
            });
          }
        } catch (e) {}
      }

      // d. Match by phone if known (from user profile or cached phone)
      const phoneToMatch = rawUserPhone || cachedPhone;
      if (phoneToMatch && phoneToMatch.length >= 9) {
        try {
          const phoneDocRef = doc(db, 'customers', phoneToMatch);
          const pSnap = await getDoc(phoneDocRef);
          if (pSnap.exists() && !seenIds.has(pSnap.id)) {
            seenIds.add(pSnap.id);
            candidateDocs.push({ id: pSnap.id, ref: phoneDocRef, data: pSnap.data() as CustomerProfile });
          }
          const qPhone = query(collection(db, 'customers'), where('phone', '==', phoneToMatch));
          const qpSnap = await getDocs(qPhone);
          qpSnap.forEach(d => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              candidateDocs.push({ id: d.id, ref: doc(db, 'customers', d.id), data: d.data() as CustomerProfile });
            }
          });
        } catch (e) {}
      }

      let profile: CustomerProfile;

      if (candidateDocs.length > 0) {
        // Select master doc (prefer the one with id === user.uid or highest visits)
        const masterCandidate = candidateDocs.find(c => c.id === user.uid) || candidateDocs[0];

        // Merge cars, notes, and visit counters across all candidate docs
        const allCars: CustomerCar[] = [];
        const allRemovedCars: string[] = [];
        let maxVisits = 0;
        let maxSpent = 0;
        let bestName = user.displayName || '';
        let bestPhone = rawUserPhone || cachedPhone || '';
        let bestNotes = '';

        candidateDocs.forEach(c => {
          const d = c.data;
          if (Array.isArray(d.cars)) allCars.push(...d.cars);
          if (Array.isArray(d.removedCars)) allRemovedCars.push(...d.removedCars);
          maxVisits = Math.max(maxVisits, Number(d.totalVisits || 0));
          maxSpent = Math.max(maxSpent, Number(d.totalSpent || 0));
          if (d.name && d.name !== 'عميل كريم' && d.name !== 'عميل') bestName = d.name;
          if (d.phone && !bestPhone) bestPhone = d.phone;
          if (d.notes && !bestNotes.includes(d.notes)) {
            bestNotes = bestNotes ? `${bestNotes}\n${d.notes}` : d.notes;
          }
        });

        const mergedCleanCars = deduplicateCarsList(allCars, allRemovedCars);

        profile = {
          ...masterCandidate.data,
          id: masterCandidate.id,
          name: bestName || user.displayName || 'عميل كريم',
          email: user.email || masterCandidate.data.email || '',
          phone: bestPhone || masterCandidate.data.phone || '',
          photoURL: user.photoURL || masterCandidate.data.photoURL,
          googleUid: user.uid,
          cars: mergedCleanCars,
          totalVisits: maxVisits,
          totalSpent: maxSpent,
          notes: bestNotes || masterCandidate.data.notes || '',
        };

        // Update the master document
        await updateDoc(masterCandidate.ref, {
          googleUid: user.uid,
          email: user.email || masterCandidate.data.email || '',
          name: profile.name,
          phone: profile.phone,
          photoURL: user.photoURL || masterCandidate.data.photoURL || null,
          cars: mergedCleanCars as any,
          totalVisits: maxVisits,
          totalSpent: maxSpent,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).catch(err => console.warn('Customer update warning:', err));

        // Delete redundant duplicate docs so Firestore has zero duplicates
        for (const duplicate of candidateDocs) {
          if (duplicate.id !== masterCandidate.id) {
            try {
              await deleteDoc(duplicate.ref);
              console.log(`Cleaned duplicate customer doc: ${duplicate.id}`);
            } catch (delErr) {
              console.warn('Duplicate doc cleanup warning:', delErr);
            }
          }
        }
      } else {
        // Brand new customer: Create single document at customers/{user.uid}
        profile = {
          id: user.uid,
          name: user.displayName || 'عميل كريم',
          email: user.email || '',
          phone: rawUserPhone || cachedPhone || '',
          photoURL: user.photoURL || undefined,
          googleUid: user.uid,
          cars: [],
          totalVisits: 0,
          totalSpent: 0,
          status: 'new',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(uidRef, profile);

        notifyAdminNewCustomerRegistration({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          source: 'google'
        });
      }

      setCustomer(profile);
      try {
        localStorage.setItem('drfix_customer_session', JSON.stringify(profile));
        localStorage.removeItem('drfix_customer_logged_out');
        if (profile.phone) {
          localStorage.setItem('drfix_customer_phone', profile.phone);
        }
      } catch {}

      // Auto-sync cars from maintenance bookings
      syncCustomerCarsWithBookings(profile).then(synced => {
        if (synced && synced.cars && synced.cars.length !== profile.cars.length) {
          setCustomer(synced);
        }
      }).catch(() => {});

      setIsAuthOpen(false);
      setIsPortalOpen(true);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Google user process error:', err);
      setLoading(false);
      return { 
        success: false, 
        error: 'حدث خطأ أثناء مزامنة بيانات حساب Google. يرجى المحاولة مجدداً.' 
      };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('openid');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Call popup directly without prior await to preserve user activation gesture in mobile Safari
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        return await handleGoogleUserSuccess(result.user);
      }
      setLoading(false);
      return { success: false, error: 'تعذر إتمام الدخول بحساب Google. يرجى المحاولة مجدداً.' };
    } catch (err: any) {
      console.warn("Google Auth error:", err);
      setLoading(false);

      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'تم إغلاق نافذة تسجيل الدخول بحساب Google. يمكنك النقر لإعادة المحاولة.' };
      }
      if (err?.code === 'auth/popup-blocked' || (err?.message && /popup/i.test(err.message))) {
        return { 
          success: false, 
          error: 'قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة (Pop-ups) لموقع drfix.repair في إعدادات Safari أو المتصفح، ثم المحاولة مجدداً.' 
        };
      }
      if (err?.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: 'النطاق الحالي غير مضاف في قائمة النطاقات المصرح بها في Firebase. يرجى التواصل مع إدارة النظام.'
        };
      }
      if (err?.code === 'auth/network-request-failed') {
        return {
          success: false,
          error: 'حدث انقطاع في الاتصال بالإنترنت أثناء الاتصال بـ Google. يرجى التحقق من اتصالك والمحاولة مجدداً.'
        };
      }

      return { 
        success: false, 
        error: err?.message || 'تعذر إتمام الدخول بحساب Google. يرجى المحاولة مجدداً.' 
      };
    }
  };

  // 1. Automatic Firebase Auth State Listener (onAuthStateChanged):
  // Ensures Google-authenticated customers stay logged in seamlessly across browser restarts, tabs, and sleep
  useEffect(() => {
    let isMounted = true;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      if (firebaseUser) {
        // If no customer session is loaded OR if current session doesn't match the Google user ID
        const isAlreadyMatching = customer?.googleUid === firebaseUser.uid || customer?.id === firebaseUser.uid;
        if (!isAlreadyMatching) {
          try {
            await handleGoogleUserSuccess({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              phoneNumber: firebaseUser.phoneNumber
            });
          } catch (err) {
            console.warn('onAuthStateChanged customer auto-sync error:', err);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [customer?.id, customer?.googleUid]);

  // 2. Secondary Silent Auto-Resume: If customer session in localStorage was cleared (e.g. In-App browser restart),
  // but customer phone is verified on this device and user didn't explicitly log out, restore their profile from Firestore
  useEffect(() => {
    if (customer) return;
    try {
      const isExplicitlyLoggedOut = localStorage.getItem('drfix_customer_logged_out') === 'true';
      if (isExplicitlyLoggedOut) return;

      const savedPhone = cleanSaudiPhone(localStorage.getItem('drfix_customer_phone') || '');
      if (savedPhone && savedPhone.length >= 9) {
        getDoc(doc(db, 'customers', savedPhone)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data() as CustomerProfile;
            const cleanCars = deduplicateCarsList(Array.isArray(data.cars) ? data.cars : [], data.removedCars || []);
            const updated = { ...data, id: snap.id, cars: cleanCars };
            setCustomer(updated);
            try {
              localStorage.setItem('drfix_customer_session', JSON.stringify(updated));
            } catch {}
          }
        }).catch(() => {});
      }
    } catch {}
  }, [customer?.id]);

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

      // Check if user already exists
      let alreadyExists = snap.exists();
      if (!alreadyExists) {
        const qPhone = query(collection(db, 'customers'), where('phone', '==', phone));
        const qSnap = await getDocs(qPhone);
        if (!qSnap.empty) {
          alreadyExists = true;
        }
      }

      // If user is already registered, notify them clearly
      if (alreadyExists) {
        setLoading(false);
        return { 
          success: false, 
          error: 'لديك حساب بالفعل برقم الجوال هذا. يرجى تسجيل الدخول بدلاً من ذلك.' 
        };
      }

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
      const localProfile: CustomerProfile = {
        ...newProfile,
        createdAt: new Date().toISOString() as any,
        updatedAt: new Date().toISOString() as any
      };
      setCustomer(localProfile);
      try {
        localStorage.setItem('drfix_customer_session', JSON.stringify(localProfile));
        localStorage.removeItem('drfix_customer_logged_out');
        localStorage.setItem('drfix_customer_phone', phone);
      } catch {}

      // 1. Notify Admin on Telegram & Firestore
      notifyAdminNewCustomerRegistration({
        name: newProfile.name,
        phone: newProfile.phone,
        car: initialCar && initialCar.make && initialCar.model ? {
          make: initialCar.make,
          model: initialCar.model,
          year: initialCar.year
        } : undefined,
        source: 'phone_register'
      });

      // 2. Auto-sync any past bookings made with this phone into customer cars
      syncCustomerCarsWithBookings(newProfile).then(synced => {
        if (synced && synced.cars && synced.cars.length > newProfile.cars.length) {
          setCustomer(synced);
        }
      }).catch(() => {});

      setIsAuthOpen(false);
      setIsPortalOpen(true);
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
      localStorage.setItem('drfix_customer_logged_out', 'true');
      auth.signOut().catch(() => {});
    } catch {}
    setIsPortalOpen(false);
  };

  const addCar = async (car: Omit<CustomerCar, 'id' | 'addedAt'>): Promise<boolean> => {
    if (!customer?.id) return false;
    try {
      const cleanMake = cleanCarMake(car.make, car.model);
      const cleanYear = cleanCarYear(car.year, car.model) || (car.year || '').toString().trim() || new Date().getFullYear().toString();
      const cleanModel = cleanCarModel(cleanMake, car.model, cleanYear);
      const cleanPlate = (car.plateNumber || '').trim();

      const newCar: CustomerCar = {
        ...car,
        make: cleanMake,
        model: cleanModel,
        year: cleanYear,
        plateNumber: cleanPlate,
        id: 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        addedAt: new Date().toISOString()
      };

      const existingCars = Array.isArray(customer.cars) ? customer.cars : [];
      const updatedCars = deduplicateCarsList([...existingCars, newCar], customer.removedCars || []);

      // Remove car signature from removedCars if it was previously deleted
      const currentRemoved: string[] = Array.isArray(customer.removedCars) ? customer.removedCars : [];
      const carSig = getCarSignature(newCar.make, newCar.model, newCar.plateNumber, newCar.year);
      const updatedRemoved = currentRemoved.filter(s => s !== carSig);

      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        cars: updatedCars,
        removedCars: updatedRemoved,
        updatedAt: serverTimestamp()
      });

      if (customer.phone && customer.phone !== customer.id) {
        try {
          const directPhoneRef = doc(db, 'customers', customer.phone);
          const pSnap = await getDoc(directPhoneRef);
          if (pSnap.exists()) {
            await updateDoc(directPhoneRef, {
              cars: updatedCars,
              removedCars: updatedRemoved,
              updatedAt: serverTimestamp()
            });
          }
        } catch {}
      }

      const updatedCustomer = {
        ...customer,
        cars: updatedCars,
        removedCars: updatedRemoved
      };
      setCustomer(updatedCustomer);
      try {
        localStorage.setItem('drfix_customer_session', JSON.stringify(updatedCustomer));
      } catch {}
      return true;
    } catch (err) {
      console.error('Error adding car:', err);
      return false;
    }
  };

  const removeCar = async (carId: string): Promise<boolean> => {
    if (!customer?.id) return false;
    try {
      const existingCars = Array.isArray(customer.cars) ? customer.cars : [];
      const carToRemove = existingCars.find(c => c.id === carId);
      const updatedCars = existingCars.filter(c => c.id !== carId);

      // Record signature in removedCars so auto-sync never resurrects it
      const currentRemoved: string[] = Array.isArray(customer.removedCars) ? customer.removedCars : [];
      let updatedRemoved = [...currentRemoved];
      if (carToRemove) {
        const sig = getCarSignature(carToRemove.make, carToRemove.model, carToRemove.plateNumber, carToRemove.year);
        if (!updatedRemoved.includes(sig)) {
          updatedRemoved.push(sig);
        }
      }

      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        cars: updatedCars,
        removedCars: updatedRemoved,
        updatedAt: serverTimestamp()
      });

      if (customer.phone && customer.phone !== customer.id) {
        try {
          const directPhoneRef = doc(db, 'customers', customer.phone);
          const pSnap = await getDoc(directPhoneRef);
          if (pSnap.exists()) {
            await updateDoc(directPhoneRef, {
              cars: updatedCars,
              removedCars: updatedRemoved,
              updatedAt: serverTimestamp()
            });
          }
        } catch {}
      }

      const updatedCustomer = {
        ...customer,
        cars: updatedCars,
        removedCars: updatedRemoved
      };
      setCustomer(updatedCustomer);
      try {
        localStorage.setItem('drfix_customer_session', JSON.stringify(updatedCustomer));
      } catch {}
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
// Modal: Customer Auth (Google Account Only)
// =========================================================================
export const CustomerAuthModal: React.FC = () => {
  const { isAuthOpen, setIsAuthOpen, loginWithGoogle, loading } = useCustomer();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prevent background scroll when auth modal is open
  useScrollLock(isAuthOpen);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthOpen) {
        setIsAuthOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthOpen, setIsAuthOpen]);

  if (!isAuthOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const res = await loginWithGoogle();
    if (!res.success) {
      setErrorMsg(res.error || 'تعذر تسجيل الدخول بحساب Google');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain" 
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsAuthOpen(false);
      }}
    >
      <div className="relative w-full max-w-md bg-neutral-900 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden animate-fadeIn max-h-[94dvh] sm:max-h-[90vh]">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-red/15 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Sticky Header with Title and Close Button */}
        <div className="px-5 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-black border border-white/15 rounded-2xl p-1.5 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              <img src="/logo-custom.png" alt="DR.FIX" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-display font-black text-white leading-tight">
                بوابة عملاء دكتور فيكس
              </h3>
              <p className="text-[11px] text-gray-400">
                تسجيل الدخول الموحد بحساب Google
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsAuthOpen(false)}
            className="p-2.5 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer shrink-0 border border-white/10"
            title="إغلاق النافذة"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Account Benefits List */}
          <div className="space-y-2.5 bg-black/40 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 text-xs text-gray-200">
              <div className="w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/30 flex items-center justify-center shrink-0">
                <Car className="w-3.5 h-3.5 text-brand-red" />
              </div>
              <span className="font-medium">ملف وكرت موحد لجميع سياراتك بدون تكرار</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-medium">تتبع حي ومباشر لموقع ومسار الفني الميداني</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-200">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="font-medium">حفظ فواتير الصيانة وسجل الضمانات المعتمدة</span>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-neutral-800/95 border border-brand-red/40 text-xs flex flex-col gap-2.5 shadow-lg animate-fadeIn">
              <div className="flex items-start gap-2.5 text-white">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-brand-red" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="self-start text-[11px] font-bold text-white bg-brand-red hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>إعادة المحاولة الآن</span>
              </button>
            </div>
          )}

          {/* Google Fast Authentication Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 text-gray-900 font-bold rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl disabled:opacity-60 group border border-gray-200"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-gray-400 border-t-brand-red rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="text-sm font-bold text-gray-900 group-hover:text-black">
                    المتابعة والدخول بحساب Google
                  </span>
                </>
              )}
            </button>
          </div>

          {typeof window !== 'undefined' && window.self !== window.top && (
            <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
              <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5 flex-wrap">
                <span>إذا حظر المتصفح النافذة المنبثقة:</span>
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-red underline hover:text-red-400 font-bold inline-flex items-center gap-1"
                >
                  افتح الموقع بنافذة مستقلة
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-500 text-center leading-relaxed pt-1">
            يتم توحيد حسابك وسياراتك تلقائياً بحساب Google المعتمد لضمان بطاقة عميل واحدة دائمة.
          </p>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// Modal: Fazaa Customer Portal (بوابة العميل - فزعة لصيانة السيارات)
// =========================================================================
export const CustomerPortalModal: React.FC = () => {
  const { 
    customer, isPortalOpen, setIsPortalOpen, logout, addCar, removeCar, 
    updateProfile, prefillBookingWithCar 
  } = useCustomer();

  // Prevent background scroll when portal modal is open
  useScrollLock(isPortalOpen);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPortalOpen) {
        setIsPortalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPortalOpen, setIsPortalOpen]);

  // Main Tabs: الرئيسية | طلباتي | طلب جديد | الإشعارات | حسابي
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'new_booking' | 'notifications' | 'profile'>('overview');
  
  // Theme Toggle: داكن (Dark) / فاتح (Light)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('drfix_portal_theme') !== 'light';
    } catch {
      return true;
    }
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('drfix_portal_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  const [showAddCarForm, setShowAddCarForm] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newPlate, setNewPlate] = useState('');
  const [newColor, setNewColor] = useState('');
  const [addingCar, setAddingCar] = useState(false);
  const [confirmDeleteCarId, setConfirmDeleteCarId] = useState<string | null>(null);
  const [deletingCar, setDeletingCar] = useState(false);
  const [carActionMsg, setCarActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Customer bookings listener
  const [myBookings, setMyBookings] = useState<MaintenanceRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // New Request Form State (طلب صيانة جديد)
  const [newReqCarModel, setNewReqCarModel] = useState('');
  const [newReqServiceType, setNewReqServiceType] = useState('فحص وبرمجة كمبيوتر شامل');
  const [newReqLocation, setNewReqLocation] = useState('جدة');
  const [newReqNotes, setNewReqNotes] = useState('');
  const [newReqDate, setNewReqDate] = useState('');
  const [submittingNewReq, setSubmittingNewReq] = useState(false);
  const [newReqSuccess, setNewReqSuccess] = useState(false);

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
      if (customer.cars && customer.cars.length > 0 && !newReqCarModel) {
        setNewReqCarModel(`${customer.cars[0].make} ${customer.cars[0].model} (${customer.cars[0].year})`);
      }
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
      const sorted = sortBookingsNewestFirst(list);
      setMyBookings(sorted);
      setLoadingBookings(false);

      if (customer) {
        syncCustomerCarsWithBookings(customer).then(updated => {
          if (updated && updated.cars && updated.cars.length !== (customer.cars || []).length) {
            // Updated in context via snapshot
          }
        }).catch(() => {});
      }
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

  // Computed Metrics
  const activeBookings = myBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
  const completedBookings = myBookings.filter(b => b.status === 'completed');
  const totalServices = myBookings.length;
  const latestActiveBooking = activeBookings[0] || null;

  const handleSaveNewCar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMake.trim() || !newModel.trim()) return;
    setAddingCar(true);
    const ok = await addCar({
      make: newMake.trim(),
      model: newModel.trim(),
      year: newYear.trim() || '2024',
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
      setCarActionMsg({ text: 'تمت إضافة سيارتك بنجاح ✅', type: 'success' });
      setTimeout(() => setCarActionMsg(null), 3500);
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
    setCarActionMsg({ text: 'تم حفظ وتحديث بيانات حسابك بنجاح ✅', type: 'success' });
    setTimeout(() => setCarActionMsg(null), 3500);
  };

  // Submit direct new maintenance request
  const handleCreateNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqCarModel.trim()) {
      alert('يرجى تحديد أو إدخال سيارتك');
      return;
    }
    setSubmittingNewReq(true);
    try {
      const cleanPhone = customer.phone ? cleanSaudiPhone(customer.phone) : editPhone ? cleanSaudiPhone(editPhone) : '';
      const uniqueBookingId = 'FIX-' + Math.floor(1000 + Math.random() * 9000);

      const bookingDoc = {
        bookingId: uniqueBookingId,
        carModel: newReqCarModel.trim(),
        serviceType: newReqServiceType,
        customerName: customer.name || 'عميل كريم',
        customerPhone: cleanPhone || '0500000000',
        customerId: customer.id || '',
        customerEmail: customer.email || '',
        location: newReqLocation.trim() || 'جدة',
        notes: newReqNotes.trim(),
        status: 'new',
        cost: 0,
        serviceDate: newReqDate ? new Date(newReqDate).toISOString() : new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'maintenance'), bookingDoc);
      
      // Auto register car if it's new
      if (newReqCarModel.trim() && (!customer.cars || !customer.cars.some(c => `${c.make} ${c.model}`.toLowerCase().includes(newReqCarModel.toLowerCase())))) {
        addCar({
          make: newReqCarModel.split(' ')[0] || 'سيارة',
          model: newReqCarModel.split(' ').slice(1).join(' ') || newReqCarModel,
          year: '2024'
        }).catch(() => {});
      }

      // 1. Dispatch Server-side Telegram Notification
      let serverNotified = false;
      try {
        const notifyRes = await fetch('/api/notify-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: uniqueBookingId,
            customerPhone: cleanPhone,
            customerName: customer.name || 'عميل DR.FIX',
            carModel: newReqCarModel.trim(),
            serviceType: newReqServiceType,
            notes: newReqNotes.trim(),
            location: newReqLocation.trim() || 'جدة',
            serviceDate: newReqDate ? new Date(newReqDate).toLocaleDateString('ar-SA') : 'موعد فوري',
            isImmediate: true
          })
        });
        if (notifyRes.ok) {
          const resJson = await notifyRes.json();
          if (resJson && resJson.ok && resJson.result && resJson.result.ok) {
            serverNotified = true;
          }
        }
      } catch (notifyErr) {
        console.warn('API notification error (fallback to direct):', notifyErr);
      }

      // 2. Direct Fallback to Telegram Bot if server notification wasn't acknowledged
      if (!serverNotified) {
        const intPhone = cleanPhone.startsWith('05') ? '966' + cleanPhone.slice(1) : cleanPhone.replace(/^0+/, '');
        const waLink = intPhone ? `https://wa.me/${intPhone}` : null;
        const tgText = `🔔 <b>طلب صيانة جديد من بوابة العميل في DR.FIX</b> 🚗⚡\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `🔖 <b>رقم الحجز:</b> <code>${uniqueBookingId}</code>\n` +
          `👤 <b>العميل:</b> ${escapeTelegramHtml(customer.name || 'عميل كريم')}\n` +
          `📱 <b>الجوال:</b> <code>${cleanPhone}</code>\n` +
          `🚘 <b>السيارة:</b> ${escapeTelegramHtml(newReqCarModel.trim())}\n` +
          `🔧 <b>الخدمة:</b> ${escapeTelegramHtml(newReqServiceType)}\n` +
          `📍 <b>الموقع:</b> ${escapeTelegramHtml(newReqLocation.trim() || 'جدة')}\n` +
          (newReqNotes.trim() ? `📝 <b>الملاحظات:</b> ${escapeTelegramHtml(newReqNotes.trim())}\n` : '') +
          `⏰ <b>الوقت:</b> ${new Date().toLocaleTimeString('ar-SA')}\n` +
          `━━━━━━━━━━━━━━━━━━`;

        const publicBaseUrl = 'https://ais-dev-67s7t2ibowkgamyonguwv5-138630195296.europe-west2.run.app';
        const inline_keyboard: any[][] = [];
        if (waLink) {
          inline_keyboard.push([{ text: '💬 فتح واتساب العميل', url: waLink }]);
        }
        inline_keyboard.push([
          { text: '✅ قبول الطلب', url: `${publicBaseUrl}/api/status-redirect?id=${encodeURIComponent(uniqueBookingId)}&status=accepted` },
          { text: '❌ رفض الطلب', url: `${publicBaseUrl}/api/status-redirect?id=${encodeURIComponent(uniqueBookingId)}&status=cancelled` }
        ]);

        sendTelegramNotification(tgText, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID, { inline_keyboard }).catch(() => {});
      }

      // 3. Save to in-app Notifications collection
      addDoc(collection(db, 'notifications'), {
        type: 'new_booking',
        title: 'طلب صيانة جديد 🚗',
        body: `طلب صيانة جديد #${uniqueBookingId} للسيارة ${newReqCarModel.trim()} من ${customer.name || cleanPhone}`,
        bookingId: uniqueBookingId,
        customerName: customer.name || 'عميل',
        customerPhone: cleanPhone,
        carModel: newReqCarModel.trim(),
        serviceType: newReqServiceType,
        createdAt: serverTimestamp()
      }).catch(() => {});

      setSubmittingNewReq(false);
      setNewReqSuccess(true);
      setTimeout(() => {
        setNewReqSuccess(false);
        setActiveTab('bookings');
      }, 1400);
    } catch (err) {
      console.error('Create request error:', err);
      setSubmittingNewReq(false);
      alert('حدث خطأ أثناء إرسال طلب الصيانة، يرجى المحاولة مرة أخرى.');
    }
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'new':
      case 'pending':
        return {
          step: 1,
          label: 'تم استلام الطلب',
          badgeText: 'قيد المراجعة ⏳',
          badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          desc: 'تم تسجيل طلبك بنجاح في النظام وجاري مراجعته من قبل إدارة العمليات للتأكيد والتوجيه.',
          pulseColor: 'bg-brand-red',
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
          desc: 'تم الانتهاء من كافة أعمال الصيانة بنجاح. نتمنى لك قيادة آمنة ويسري ضمان DR.FIX المعتمد.',
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overscroll-contain select-none" dir="rtl">
      <div className={`relative w-full max-w-2xl ${
        isDarkMode 
          ? 'bg-[#0D1015] text-[#F5F6F8] border border-white/15' 
          : 'bg-[#F9FAFB] text-[#111827] border border-gray-300'
      } rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] transition-colors duration-200`}>
        
        {/* ========================================================================= */}
        {/* 1. Header: فزعة لصيانة السيارات | بوابة العميل | خدماتك ومتابعتك مباشر     */}
        {/* ========================================================================= */}
        <div className={`p-3.5 sm:p-4.5 border-b ${
          isDarkMode ? 'border-white/10 bg-[#090B0E]/80' : 'border-gray-200 bg-white/90'
        } backdrop-blur-md flex items-center justify-between gap-3 shrink-0`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F52B35] to-[#B3121B] flex items-center justify-center text-white shadow-lg shadow-[#F52B35]/25 shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-sm sm:text-base tracking-tight truncate">
                  dr.fix لصيانة السيارات
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-[#F52B35]/15 text-[#FF414A] border border-[#F52B35]/30">
                  بوابة العميل
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>خدماتك ومتابعتك</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">مباشر</span>
              </div>
            </div>
          </div>

          {/* Action Controls: Theme Toggle (داكن/فاتح) + Logout + Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isDarkMode 
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10' 
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
              title={isDarkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
            >
              {isDarkMode ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              <span className="text-[11px] font-bold">{isDarkMode ? 'داكن' : 'فاتح'}</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              title="تسجيل الخروج"
              className={`p-2 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                isDarkMode ? 'text-gray-400 hover:text-red-400 bg-white/5 hover:bg-white/10' : 'text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">خروج</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsPortalOpen(false)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200'
              }`}
              title="إغلاق البوابة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice for Google users who haven't saved a phone number yet */}
        {(!customer.phone || customer.phone.length < 9) && (
          <div className="mx-3.5 sm:mx-5 mt-3 p-3.5 rounded-2xl bg-[#F52B35]/10 border border-[#F52B35]/30 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#F52B35] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white mb-0.5">خطوة مهمة: يرجى إضافة رقم جوالك</h4>
                <p className="text-[11px] text-gray-300 mb-2">
                  لربط كرت الصيانة التلقائي وتسهيل اتصال الفني بك عند التوجه لموقعك في جدة.
                </p>
                <div className="flex items-center gap-2 max-w-sm">
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#F52B35] text-right font-mono"
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
                      setCarActionMsg({ text: 'تم حفظ رقم الجوال بنجاح!', type: 'success' });
                      setTimeout(() => setCarActionMsg(null), 3000);
                    }}
                    className="px-3.5 py-2 bg-[#F52B35] hover:bg-[#D11C25] text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {savingPhone ? 'جاري الحفظ...' : 'حفظ الرقم'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Message Banner */}
        {carActionMsg && (
          <div className={`mx-3.5 sm:mx-5 mt-2 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            carActionMsg.type === 'success' 
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border border-red-500/30 text-red-300"
          }`}>
            {carActionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{carActionMsg.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab Body View                                                             */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain flex-1 space-y-4 pb-20">
          
          {/* ========================================================================= */}
          {/* TAB 1: الرئيسية (Overview)                                                */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Hero Welcome Card: فزعة معك + مرحبًا ABDULAZIZ Sindi 👋 */}
              <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border relative overflow-hidden ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-[#141820] via-[#0E1117] to-[#0A0C10] border-white/10 shadow-xl' 
                  : 'bg-gradient-to-br from-white via-red-50/30 to-white border-gray-200 shadow-md'
              }`}>
                {/* Background red ambient glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-[#F52B35]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F52B35]/15 border border-[#F52B35]/30 text-[#FF414A] text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>dr.fix معك</span>
                  </div>

                  <div>
                    <h2 className="text-lg sm:text-2xl font-display font-black tracking-tight flex items-center gap-2 flex-wrap">
                      <span>مرحبًا {customer.name || 'ABDULAZIZ Sindi'} 👋</span>
                    </h2>
                    <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      متابعة تلقائية وآمنة لطلباتك، مع إشعارات مباشرة وفواتير ومكافآت في حساب واحد.
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('new_booking')}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#F52B35] to-[#D11C25] hover:from-[#FF414A] hover:to-[#E0242E] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#F52B35]/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>طلب صيانة جديد</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Grid: طلبات نشطة | طلبات مكتملة | إجمالي الخدمات */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                {/* 1. طلبات نشطة */}
                <div 
                  onClick={() => setActiveTab('bookings')}
                  className={`p-3 sm:p-4 rounded-2xl border text-center transition-all cursor-pointer group hover:scale-[1.02] ${
                    isDarkMode ? 'bg-black/40 border-white/10 hover:border-[#F52B35]/40' : 'bg-white border-gray-200 hover:border-[#F52B35]/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-gray-400 mb-1">
                    <span>طلبات نشطة</span>
                    {activeBookings.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-xl sm:text-3xl font-black text-[#F52B35] font-mono">
                    {activeBookings.length}
                  </div>
                </div>

                {/* 2. طلبات مكتملة */}
                <div 
                  onClick={() => setActiveTab('bookings')}
                  className={`p-3 sm:p-4 rounded-2xl border text-center transition-all cursor-pointer group hover:scale-[1.02] ${
                    isDarkMode ? 'bg-black/40 border-white/10 hover:border-emerald-500/40' : 'bg-white border-gray-200 hover:border-emerald-500/40 shadow-sm'
                  }`}
                >
                  <div className="text-xs font-bold text-gray-400 mb-1">
                    طلبات مكتملة
                  </div>
                  <div className="text-xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {completedBookings.length}
                  </div>
                </div>

                {/* 3. إجمالي الخدمات */}
                <div 
                  onClick={() => setActiveTab('bookings')}
                  className={`p-3 sm:p-4 rounded-2xl border text-center transition-all cursor-pointer group hover:scale-[1.02] ${
                    isDarkMode ? 'bg-black/40 border-white/10 hover:border-blue-500/40' : 'bg-white border-gray-200 hover:border-blue-500/40 shadow-sm'
                  }`}
                >
                  <div className="text-xs font-bold text-gray-400 mb-1">
                    إجمالي الخدمات
                  </div>
                  <div className="text-xl sm:text-3xl font-black text-blue-400 font-mono">
                    {totalServices}
                  </div>
                </div>
              </div>

              {/* Active Request Live Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Activity className="w-4 h-4 text-[#F52B35]" />
                    <span>متابعة الطلب المباشر</span>
                  </span>
                  {activeBookings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('bookings')}
                      className="text-[#F52B35] hover:underline cursor-pointer"
                    >
                      عرض الكل ({activeBookings.length})
                    </button>
                  )}
                </div>

                {/* Condition: No active request VS Active request exists */}
                {!latestActiveBooking ? (
                  <div className={`p-6 sm:p-8 rounded-2xl border text-center space-y-3 ${
                    isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-sm'
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mx-auto">
                      <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm sm:text-base">
                        لا يوجد طلب نشط الآن
                      </h4>
                      <p className={`text-xs mt-1 max-w-md mx-auto leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        عند حاجتك للصيانة، أرسل طلبًا جديدًا وسنحفظه تلقائيًا في حسابك.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('new_booking')}
                      className="px-5 py-2.5 rounded-xl bg-[#F52B35] hover:bg-[#D11C25] text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>طلب صيانة</span>
                    </button>
                  </div>
                ) : (
                  // Active Request Live Tracking Card
                  <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                    isDarkMode ? 'bg-black/50 border-[#F52B35]/40 shadow-lg shadow-[#F52B35]/5' : 'bg-white border-[#F52B35]/40 shadow-md'
                  }`}>
                    {(() => {
                      const stInfo = getStatusDetails(latestActiveBooking.status);
                      const bookingCode = latestActiveBooking.bookingId || `#${latestActiveBooking.id.slice(0, 7).toUpperCase()}`;

                      return (
                        <>
                          <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#F52B35] text-white text-[10px] font-black uppercase">
                                  طلب مباشر
                                </span>
                                <span className="text-xs font-mono font-bold text-gray-300">
                                  {bookingCode}
                                </span>
                              </div>
                              <h5 className="font-bold text-sm sm:text-base text-white mt-1">
                                {latestActiveBooking.carModel || 'صيانة سيارة'}
                              </h5>
                              <span className="text-xs text-[#F52B35] font-semibold">
                                {latestActiveBooking.serviceType}
                              </span>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full border text-xs font-bold inline-flex items-center gap-1.5 ${stInfo.badgeClass}`}>
                              {stInfo.badgeText}
                            </span>
                          </div>

                          {/* 5-Step Progress */}
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-gray-400">مرحلة العمل:</span>
                              <span className="text-white font-medium">{stInfo.label}</span>
                            </div>

                            <div className="relative flex items-center justify-between pt-1 pb-1">
                              <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-white/10 -z-0" />
                              <div 
                                className="absolute top-1/2 right-4 -translate-y-1/2 h-1 bg-gradient-to-l from-[#F52B35] to-emerald-500 transition-all duration-700 -z-0"
                                style={{
                                  width: latestActiveBooking.status === 'in-progress' ? '75%' :
                                         latestActiveBooking.status === 'on_the_way' ? '50%' :
                                         latestActiveBooking.status === 'accepted' ? '25%' : '8%'
                                }}
                              />

                              {[
                                { step: 1, title: 'الاستلام' },
                                { step: 2, title: 'تم القبول' },
                                { step: 3, title: 'بالطريق' },
                                { step: 4, title: 'صيانة' },
                                { step: 5, title: 'جاهزة' }
                              ].map(st => {
                                const isDone = stInfo.step > st.step;
                                const isCurrent = stInfo.step === st.step;

                                return (
                                  <div key={st.step} className="relative z-10 flex flex-col items-center gap-1">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                      isDone ? 'bg-emerald-500 text-black' : isCurrent ? 'bg-[#F52B35] text-white ring-2 ring-[#F52B35]/40 animate-pulse' : 'bg-neutral-800 text-gray-500'
                                    }`}>
                                      {isDone ? '✓' : st.step}
                                    </div>
                                    <span className={`text-[9px] font-bold ${isCurrent ? 'text-[#F52B35]' : 'text-gray-400'}`}>
                                      {st.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveTab('bookings')}
                              className="text-xs text-gray-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>تفاصيل كرت الصيانة</span>
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={`https://api.whatsapp.com/send?phone=966546870807&text=${encodeURIComponent(
                                `السلام عليكم، أستفسر عن حالة طلبي رقم (${bookingCode}) للسيارة (${latestActiveBooking.carModel})`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>مراسلة العمليات</span>
                            </a>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Registered Cars Quick Card */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-[#F52B35]" />
                    <span>سياراتي المسجلة ({customer.cars?.length || 0})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="text-xs text-[#F52B35] hover:underline font-bold cursor-pointer"
                  >
                    إدارة السيارات
                  </button>
                </div>

                {(!customer.cars || customer.cars.length === 0) ? (
                  <p className="text-xs text-gray-400 py-1">
                    لم تقم بإضافة سيارة بعد. يمكنك إضافتها لحجز الصيانة بنقرة واحدة!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customer.cars.slice(0, 2).map(c => (
                      <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{c.make} {c.model}</div>
                          <div className="text-[10px] text-gray-400">{c.year} {c.plateNumber ? `• ${c.plateNumber}` : ''}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewReqCarModel(`${c.make} ${c.model} (${c.year})`);
                            setActiveTab('new_booking');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#F52B35]/20 hover:bg-[#F52B35] text-[#FF414A] hover:text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          طلب صيانة
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: طلباتي (My Requests)                                               */}
          {/* ========================================================================= */}
          {activeTab === 'bookings' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>طلبات الصيانة وكروت المتابعة</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h4>
                  <p className="text-xs text-gray-400">متابعة مراحل الصيانة وتقارير الفحص المعتمدة</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('new_booking')}
                  className="px-3 py-1.5 bg-[#F52B35] hover:bg-[#D11C25] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>طلب جديد</span>
                </button>
              </div>

              {loadingBookings ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-[#F52B35] border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-gray-400">جاري تحميل طلبات الصيانة وتحديثات الفني...</p>
                </div>
              ) : myBookings.length === 0 ? (
                <div className="text-center py-10 bg-black/30 border border-white/5 rounded-2xl p-6 space-y-3">
                  <FileText className="w-12 h-12 text-[#F52B35]/60 mx-auto opacity-70" />
                  <h5 className="font-bold text-sm text-white">لا توجد طلبات سابقة في حسابك</h5>
                  <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                    عند إرسال طلب صيانة جديد سيظهر هنا كرت الصيانة الإلكتروني لمتابعة كافة المراحل لحظة بلحظة.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_booking')}
                    className="mt-2 px-5 py-2.5 bg-[#F52B35] hover:bg-[#D11C25] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#F52B35]/20 transition-all active:scale-95"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>إرسال أول طلب صيانة لسيارتك الآن</span>
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
                        className={`p-4 sm:p-5 rounded-2xl border ${
                          statusInfo.isLive ? 'border-[#F52B35]/40 shadow-xl shadow-[#F52B35]/5 bg-black/50' : 'border-white/10 bg-black/30'
                        } transition-all space-y-4`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#F52B35] text-white text-[10px] font-black uppercase tracking-wider">
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

                        {/* Visual 5-Step Pipeline Progress Tracker */}
                        <div className="bg-black/60 p-3 sm:p-4 rounded-xl border border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-400">مراحل إنجاز الصيانة:</span>
                            <span className="text-white font-medium">{statusInfo.label}</span>
                          </div>

                          <div className="relative flex items-center justify-between pt-1 pb-1">
                            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-white/10 -z-0" />
                            <div 
                              className="absolute top-1/2 right-4 -translate-y-1/2 h-1 bg-gradient-to-l from-[#F52B35] to-emerald-500 transition-all duration-700 -z-0"
                              style={{
                                width: b.status === 'cancelled' ? '0%' :
                                       b.status === 'completed' ? 'calc(100% - 32px)' :
                                       b.status === 'in-progress' ? '75%' :
                                       b.status === 'on_the_way' ? '50%' :
                                       b.status === 'accepted' ? '25%' : '8%'
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
                                      ? 'bg-[#F52B35] text-white ring-4 ring-[#F52B35]/30 shadow-lg shadow-[#F52B35]/40 animate-pulse'
                                      : 'bg-neutral-800 text-gray-400 border border-white/10'
                                  }`}>
                                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                                  </div>
                                  <span className={`text-[10px] font-bold ${
                                    isCurrent ? 'text-[#F52B35] font-black' : isDone ? 'text-emerald-400' : 'text-gray-400'
                                  }`}>
                                    {st.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 bg-white/5 border-white/10 text-gray-300">
                            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#F52B35]" />
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
                            <span className="font-bold text-[#F52B35]">{b.serviceType || 'صيانة متنقلة'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">الموقع / الحي:</span>
                            <span className="font-bold text-white flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#F52B35] shrink-0" />
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

                        {/* Customer Visual Inspection & Progress Report */}
                        <CustomerVisualReport record={b} />

                        {/* Interactive Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <a
                            href={`https://api.whatsapp.com/send?phone=966546870807&text=${encodeURIComponent(
                              `السلام عليكم DR.FIX، أستفسر عن حالة كرت الصيانة رقم (${bookingCode}) للسيارة (${b.carModel || 'السيارة'}) - الحالة الحالية: ${statusInfo.label}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>مراسلة العمليات والفني</span>
                          </a>

                          <a
                            href="tel:0546870807"
                            className="py-2 px-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                            title="اتصال هاتفي مباشر"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#F52B35]" />
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

          {/* ========================================================================= */}
          {/* TAB 3: طلب جديد (New Request)                                             */}
          {/* ========================================================================= */}
          {activeTab === 'new_booking' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#F52B35]" />
                  <span>طلب صيانة جديد ومباشر</span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  أرسل طلبك وسنحفظه تلقائياً في حسابك ونربطك فوراً بالفني الميداني في جدة
                </p>
              </div>

              {newReqSuccess ? (
                <div className="p-8 text-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-white">تم إرسال طلب الصيانة بنجاح!</h4>
                  <p className="text-xs text-emerald-300">
                    تم إنشاء كرت الصيانة الإلكتروني وحفظه في حسابك. جاري تحويلك إلى قائمة الطلبات...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateNewRequest} className="space-y-4">
                  {/* Select Registered Car or Custom Car */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 block">
                      السيارة المطلوبة للصيانة *
                    </label>

                    {customer.cars && customer.cars.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {customer.cars.map(c => {
                          const label = `${c.make} ${c.model} (${c.year})`;
                          const isSel = newReqCarModel === label;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setNewReqCarModel(label)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                isSel 
                                  ? 'bg-[#F52B35] text-white border-[#F52B35] shadow-md shadow-[#F52B35]/25' 
                                  : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30'
                              }`}
                            >
                              🚘 {c.make} {c.model}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="text"
                      required
                      value={newReqCarModel}
                      onChange={e => setNewReqCarModel(e.target.value)}
                      placeholder="مثال: تويوتا كامري 2023 أو مازدا CX9"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35]"
                    />
                  </div>

                  {/* Service Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 block">
                      نوع خدمة الصيانة *
                    </label>
                    <select
                      value={newReqServiceType}
                      onChange={e => setNewReqServiceType(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35] cursor-pointer"
                    >
                      <option value="فحص وبرمجة كمبيوتر شامل">🔍 فحص وبرمجة كمبيوتر شامل وكشف الأعطال</option>
                      <option value="صيانة ميكانيكية متنقلة">🔧 صيانة ميكانيكية متنقلة عند موقعك</option>
                      <option value="فحص بطارية وكهرباء ودينمو">⚡ فحص وشحن بطارية ودينمو وكهرباء السيارة</option>
                      <option value="فحص شامل قبل الشراء">📋 فحص شامل ودقيق للسيارة قبل الشراء</option>
                      <option value="صيانة الفرامل ونظام التعليق">🛑 صيانة الفرامل (الأقمشة والهوبات) والتعليق</option>
                      <option value="صيانة دورية وتغيير زيوت وفلاتر">🛢️ صيانة دورية وسريعة وتغيير زيوت وفلاتر</option>
                      <option value="فحص حرارة وتهريب سوائل ورديتر">🌡️ فحص حرارة المحرك والرديتر ونظام التبريد</option>
                    </select>
                  </div>

                  {/* Location in Jeddah */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 block">
                      الحي أو الموقع بجدة *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newReqLocation}
                        onChange={e => setNewReqLocation(e.target.value)}
                        placeholder="مثال: حي الروضة، حي الصفا، حي الزهراء..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35]"
                      />
                      <MapPin className="w-4 h-4 text-[#F52B35] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Notes / Problem Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 block">
                      وصف المشكلة أو ملاحظات إضافية (اختياري)
                    </label>
                    <textarea
                      rows={3}
                      value={newReqNotes}
                      onChange={e => setNewReqNotes(e.target.value)}
                      placeholder="اشرح أي صوت أو لمبة تحذير ظهرت في الطبلون..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingNewReq}
                    className="w-full py-3 bg-gradient-to-r from-[#F52B35] to-[#D11C25] hover:from-[#FF414A] hover:to-[#E0242E] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-[#F52B35]/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {submittingNewReq ? (
                      <span>جاري إرسال الطلب وحفظه...</span>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        <span>إرسال طلب الصيانة الآن وحفظه في حسابي</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: الإشعارات (Notifications)                                          */}
          {/* ========================================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#F52B35]" />
                  <span>مركز الإشعارات والتنبيهات المباشرة</span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  تحديثات حالة طلباتك، المواعيد المعتمدة، والمكافآت الحصرية
                </p>
              </div>

              <div className="space-y-2.5">
                {/* 1. Welcome Notification */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F52B35]/15 text-[#F52B35] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>أهلاً بك في dr.fix لصيانة السيارات!</span>
                      <span className="text-[10px] text-gray-400 font-mono">الآن</span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                      حسابك مفعل بنجاح. سنقوم بإرسال إشعارات فورية عن حالة الفني عند التوجه لموقعك، ومراحل الصيانة أولاً بأول.
                    </p>
                  </div>
                </div>

                {/* 2. Dynamic Notifications from customer's bookings */}
                {myBookings.map((b) => {
                  const isDone = b.status === 'completed';
                  const isOnWay = b.status === 'on_the_way';
                  const isInProg = b.status === 'in-progress';
                  const isAccepted = b.status === 'accepted';

                  return (
                    <div 
                      key={b.id} 
                      onClick={() => setActiveTab('bookings')}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 hover:border-[#F52B35]/40 transition-all cursor-pointer flex items-start gap-3 group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isDone ? 'bg-emerald-500/20 text-emerald-400' :
                        isOnWay ? 'bg-purple-500/20 text-purple-400' :
                        isInProg ? 'bg-orange-500/20 text-orange-400' :
                        isAccepted ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-300'
                      }`}>
                        {isDone ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span className="truncate">طلب الصيانة: {b.carModel}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {b.bookingId || `#${b.id.slice(0, 6)}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                          {isDone ? 'اكتملت الصيانة بنجاح وتم توثيق تقرير الفحص والضمان الذهبي.' :
                           isOnWay ? 'الفني في الطريق الآن لموقعك في جدة! يرجى إبقاء الهاتف متاحاً.' :
                           isInProg ? 'يقوم الفني الآن بأعمال الفحص والصيانة الميدانية.' :
                           isAccepted ? 'تم قبول طلبك واعتماد موعد الصيانة من إدارة العمليات.' :
                           'تم استلام طلبك وهو قيد المراجعة السريعة.'}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Loyalty Reward Notification */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                      <span>مكافأة عميل dr.fix المعتمد</span>
                      <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.2 rounded">نشط</span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                      يسري لحسابك ضمان الصيانة الذهبي المعتمد وخصم 15% على الفحص الشامل القادم.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: حسابي (My Account / Profile & Cars)                                */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">بيانات الحساب الشخصي</h4>
                  <p className="text-xs text-gray-400">تحديث الاسم وبيانات الاتصال لتسهيل وصول الفني</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">الاسم الكريم</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35] text-right font-mono"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">يُستخدم لتأكيد مواعيد الصيانة وربط كروت الصيانة</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    dir="ltr"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35] text-right"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">العنوان الافتراضي في جدة</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="مثال: حي الروضة، شارع الكيال"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#F52B35]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 bg-[#F52B35] hover:bg-[#D11C25] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                </div>
              </form>

              {/* Cars Management Section */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">إدارة سياراتي</h4>
                    <p className="text-xs text-gray-400">السيارات المحفوظة في ملفك للصيانة السريعة</p>
                  </div>
                  {!showAddCarForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddCarForm(true)}
                      className="px-3 py-1.5 bg-[#F52B35] hover:bg-[#D11C25] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة سيارة</span>
                    </button>
                  )}
                </div>

                {/* Add Car Form */}
                {showAddCarForm && (
                  <form onSubmit={handleSaveNewCar} className="p-4 rounded-2xl bg-black/60 border border-[#F52B35]/30 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#FF414A] flex items-center gap-1.5">
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
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#F52B35]"
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
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#F52B35]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">سنة الصنع</label>
                        <input
                          type="text"
                          value={newYear}
                          onChange={e => setNewYear(e.target.value)}
                          placeholder="2024"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#F52B35]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">رقم اللوحة</label>
                        <input
                          type="text"
                          value={newPlate}
                          onChange={e => setNewPlate(e.target.value)}
                          placeholder="أ ب ج 1234"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#F52B35]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingCar}
                      className="w-full py-2.5 bg-[#F52B35] hover:bg-[#D11C25] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {addingCar ? 'جاري الحفظ...' : 'حفظ السيارة في حسابي'}
                    </button>
                  </form>
                )}

                {/* Cars List */}
                {(!customer.cars || customer.cars.length === 0) ? (
                  <div className="text-center py-6 bg-black/30 border border-white/5 rounded-2xl p-4">
                    <Car className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-gray-400">لم تقم بإضافة أي سيارة حتى الآن.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {customer.cars.map(car => (
                      <div 
                        key={car.id} 
                        className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-2 rounded-xl bg-[#F52B35]/10 border border-[#F52B35]/20 text-[#F52B35] shrink-0">
                              <Car className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-xs text-white truncate">{car.make} {car.model}</h5>
                              <span className="text-[10px] text-gray-400">موديل {car.year} {car.plateNumber ? `• ${car.plateNumber}` : ''}</span>
                            </div>
                          </div>

                          {confirmDeleteCarId === car.id ? (
                            <div className="flex items-center gap-1 shrink-0 animate-fadeIn">
                              <button
                                type="button"
                                disabled={deletingCar}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setDeletingCar(true);
                                  await removeCar(car.id);
                                  setDeletingCar(false);
                                  setConfirmDeleteCarId(null);
                                }}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold"
                              >
                                {deletingCar ? '...' : 'تأكيد'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCarId(null)}
                                className="px-1.5 py-0.5 bg-white/10 text-gray-300 rounded text-[10px]"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCarId(car.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg cursor-pointer shrink-0"
                              title="حذف السيارة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج من الحساب</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* Bottom Dock Navigation: الرئيسية | طلباتي | طلب جديد | الإشعارات | حسابي | داكن */}
        {/* ========================================================================= */}
        <div className={`absolute bottom-0 inset-x-0 border-t ${
          isDarkMode ? 'bg-[#090B0E]/95 border-white/10' : 'bg-white/95 border-gray-200'
        } backdrop-blur-xl px-2 py-1.5 pb-safe z-30 shadow-2xl`}>
          <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
            {/* 1. الرئيسية */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] active:scale-95 ${
                activeTab === 'overview'
                  ? 'bg-[#F52B35]/15 text-[#FF414A] font-bold border border-[#F52B35]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] truncate">الرئيسية</span>
            </button>

            {/* 2. طلباتي */}
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] relative active:scale-95 ${
                activeTab === 'bookings'
                  ? 'bg-[#F52B35]/15 text-[#FF414A] font-bold border border-[#F52B35]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <FileText className="w-4 h-4 mb-0.5" />
                {myBookings.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 bg-[#F52B35] text-white text-[8px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                    {myBookings.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] truncate">طلباتي</span>
            </button>

            {/* 3. طلب جديد (Center Highlighted Button) */}
            <button
              type="button"
              onClick={() => setActiveTab('new_booking')}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] active:scale-95 ${
                activeTab === 'new_booking'
                  ? 'bg-[#F52B35] text-white shadow-lg shadow-[#F52B35]/30 font-bold'
                  : 'bg-[#F52B35]/20 text-[#FF414A] hover:bg-[#F52B35] hover:text-white font-bold'
              }`}
            >
              <PlusCircle className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] truncate">طلب جديد</span>
            </button>

            {/* 4. الإشعارات */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] relative active:scale-95 ${
                activeTab === 'notifications'
                  ? 'bg-[#F52B35]/15 text-[#FF414A] font-bold border border-[#F52B35]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Bell className="w-4 h-4 mb-0.5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#F52B35] animate-ping" />
              </div>
              <span className="text-[10px] truncate">الإشعارات</span>
            </button>

            {/* 5. حسابي */}
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] active:scale-95 ${
                activeTab === 'profile'
                  ? 'bg-[#F52B35]/15 text-[#FF414A] font-bold border border-[#F52B35]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] truncate">حسابي</span>
            </button>

            {/* 6. داكن / فاتح (Theme Button) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[46px] active:scale-95 ${
                isDarkMode ? 'text-amber-300 hover:bg-white/5' : 'text-amber-500 hover:bg-gray-100'
              }`}
              title={isDarkMode ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
            >
              {isDarkMode ? <Moon className="w-4 h-4 mb-0.5" /> : <Sun className="w-4 h-4 mb-0.5" />}
              <span className="text-[10px] truncate">{isDarkMode ? 'داكن' : 'فاتح'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// =========================================================================
// Header Action Button for Public Navbar
// =========================================================================
export const CustomerNavButton: React.FC<{ isMobile?: boolean; onAction?: () => void }> = ({ isMobile, onAction }) => {
  const { customer, setIsAuthOpen, setIsPortalOpen } = useCustomer();
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

  const handleOpen = () => {
    if (onAction) onAction();
    if (customer) {
      setIsPortalOpen(true);
    } else {
      setIsAuthOpen(true);
    }
  };

  if (customer) {
    return (
      <button
        onClick={handleOpen}
        className={
          isMobile
            ? "w-full py-2.5 px-4 rounded-xl bg-brand-red/10 border border-brand-red/30 text-white font-bold text-xs flex items-center justify-between cursor-pointer"
            : "flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-brand-red/40 hover:border-brand-red text-white text-xs font-bold transition-all cursor-pointer group shadow-sm shadow-brand-red/10 whitespace-nowrap shrink-0"
        }
        title={isEn ? "My Profile & Maintenance Card" : "ملفي الشخصي وسياراتي وكرت الصيانة"}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative shrink-0">
            {customer.photoURL ? (
              <img 
                src={customer.photoURL} 
                alt={customer.name} 
                className="w-5 h-5 rounded-full object-cover border border-brand-red/50" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center text-[10px] text-white shrink-0 font-black shadow-inner">
                {customer.name?.charAt(0) || <User className="w-3 h-3" />}
              </div>
            )}
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="max-w-[80px] xl:max-w-[110px] truncate text-gray-200 group-hover:text-white leading-tight">
            {customer.name}
          </span>
        </div>
        <span className="text-[10px] text-brand-red font-bold flex items-center gap-0.5 group-hover:underline shrink-0">
          <FileText className="w-3 h-3" />
          <span>{isEn ? "Card" : "كرت الصيانة"}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleOpen}
      className={
        isMobile
          ? "w-full py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10"
          : "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
      }
    >
      <User className="w-3.5 h-3.5 text-brand-red shrink-0" />
      <span>{isEn ? "Sign In" : "تسجيل دخول"}</span>
    </button>
  );
};
