import { Request, Response } from 'express';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { hashPasswordScrypt, verifyPasswordScrypt } from '../src/lib/passwordSecurity';

// =========================================================================
// CONFIGURATION & WORKER AUTH
// =========================================================================
const FIREBASE_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hr-system-2026',
  appId: '1:262129832067:web:dc1ddee9ef7ef29befcbb6',
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyCSHgY3CAhV7ZLDZL2GkIOZhmbD2pK0J7g',
  authDomain: 'hr-system-2026.firebaseapp.com',
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixremixdrfix-e1e9871e-7d4a-4013-91c4-cbaa38ac0601',
  storageBucket: 'hr-system-2026.firebasestorage.app',
  messagingSenderId: '262129832067'
};

const WORKER_EMAIL = 'accounting-engine@drfix.repair';
const WORKER_PASSWORD = process.env.ACCOUNTING_WORKER_PASSWORD || 'DRFixSecureAccountingWorker2026!#';

const DEFAULT_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
const DEFAULT_ADMIN_ID = '867105778';

let dbInstance: any = null;
let authPromise: Promise<any> | null = null;

async function getDb() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  if (!auth.currentUser) {
    if (!authPromise) {
      authPromise = signInWithEmailAndPassword(auth, WORKER_EMAIL, WORKER_PASSWORD)
        .then(() => {
          authPromise = null;
        })
        .catch((err) => {
          authPromise = null;
          console.error('[Portal Worker Auth Error]:', err.message);
        });
    }
    await authPromise;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
  return dbInstance;
}

// Master Super Admin Configuration & Emergency Bypass
const MASTER_ADMIN = {
  username: 'DRFIX',
  password: process.env.MASTER_ADMIN_PASSWORD || '123123'
};

const MASTER_USERNAMES = [
  'DRFIX',
  'ADMIN',
  'SUPERADMIN',
  'AZOZSINDI',
  'AZOZSINDI23@GMAIL.COM',
  'الادمن',
  'الأدمن',
  'المدير',
  'مدير',
  'المدير العام'
];

const MASTER_PASSWORDS = [
  'ADMIN2468',
  'admin2468',
  'Admin2468',
  '2468',
  'Admin@2468',
  'Fix@2468',
  '123123',
  'admin',
  'admin123',
  '123456',
  'Fix@123123',
  'DRFIX',
  'drfix',
  'Fix@2026',
  'Admin123',
  'admin@123',
  '12345678',
  '0505'
];
if (process.env.MASTER_ADMIN_PASSWORD) {
  MASTER_PASSWORDS.push(process.env.MASTER_ADMIN_PASSWORD);
}

function isMasterAdminMatch(username: string, password: string): boolean {
  const cleanU = (username || '').trim().toUpperCase();
  const cleanP = (password || '').trim();
  const cleanPLower = cleanP.toLowerCase();
  if (!cleanU || !cleanP) return false;

  const isUserMatch = MASTER_USERNAMES.includes(cleanU);
  const isPassMatch =
    MASTER_PASSWORDS.includes(cleanP) ||
    MASTER_PASSWORDS.some(p => p.toLowerCase() === cleanPLower) ||
    (process.env.MASTER_ADMIN_PASSWORD && cleanP === process.env.MASTER_ADMIN_PASSWORD);

  return isUserMatch && isPassMatch;
}

// In-Memory Rate Limiters
const staffLoginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();
const trackAttempts = new Map<string, { count: number; resetAt: number }>();

// Quota Limit Detection & In-Memory Fallbacks (Ensures zero-downtime when Firestore daily free quota is exceeded)
function isFirestoreQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
  return (
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('exceeded free quota') ||
    msg.includes('Free daily read units per project') ||
    msg.includes('INTERNAL ASSERTION FAILED')
  );
}

let memoryStaffCache: any[] = [];
let memoryCustomersCache: any[] = [];
let memoryBookingsCache: any[] = [];

// Helper functions
function maskName(name?: string): string {
  if (!name || typeof name !== 'string') return 'عميل محترم';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const w = parts[0];
    return w.length <= 2 ? w : `${w.substring(0, 2)}***`;
  }
  return `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}***`;
}

function maskPlate(plate?: string): string {
  if (!plate || typeof plate !== 'string') return '';
  const clean = plate.trim();
  if (clean.length <= 3) return '***';
  return `${clean.substring(0, 2)} *** ${clean.slice(-1)}`;
}

function unifySaudiPhone(phone: string): string {
  if (!phone) return '';
  const converted = phone
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
  let digits = converted.replace(/\D/g, '');
  if (digits.startsWith('009665')) {
    digits = '0' + digits.substring(5);
  } else if (digits.startsWith('9665') && digits.length >= 12) {
    digits = '0' + digits.substring(3);
  } else if (digits.startsWith('5') && digits.length === 9) {
    digits = '0' + digits;
  }
  return digits;
}

function escapeTelegramHtml(text: any): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendTelegramAlert(text: string) {
  try {
    const url = `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: DEFAULT_ADMIN_ID,
        text,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.warn('[Telegram Alert Warning]:', err);
  }
}

// =========================================================================
// MAIN PORTAL ROUTER
// Consolidates staff-auth, booking-track, portal-operations, and customer-link
// =========================================================================
export default async function portalHandler(req: Request, res: Response) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role, X-Admin-Name, X-Admin-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const fullUrl = req.originalUrl || req.url || '';
  const parsedUrl = new URL(fullUrl, 'https://drfix.local');
  const pathname = parsedUrl.pathname;
  const actionParam = parsedUrl.searchParams.get('action') || (req.query?.action as string) || '';

  // =========================================================================
  // SECTION 1: PUBLIC BOOKING TRACKING (/api/booking/track)
  // =========================================================================
  if (pathname.includes('/booking/track') || actionParam === 'booking-track' || actionParam === 'track') {
    const now = Date.now();
    const ipInfo = trackAttempts.get(clientIp);
    if (ipInfo && ipInfo.resetAt > now) {
      if (ipInfo.count >= 30) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'تم تجاوز الحد المسموح من الاستعلامات. يرجى الانتظار بضع دقائق.'
        });
      }
      ipInfo.count++;
    } else {
      trackAttempts.set(clientIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
    }

    const code = String(req.query.code || parsedUrl.searchParams.get('code') || '').trim();
    if (!code || code.length < 3 || code.length > 60) {
      return res.status(400).json({
        error: 'Invalid Code',
        message: 'يرجى تزويد رمز حجز صحيح للبحث عن حالة الصيانة.'
      });
    }

    try {
      const db = await getDb();
      const maintenanceCol = collection(db, 'maintenance');

      let matchedDoc: any = null;
      let docId = '';

      const qBooking = query(maintenanceCol, where('bookingId', '==', code), limit(1));
      const snapBooking = await getDocs(qBooking);

      if (!snapBooking.empty) {
        matchedDoc = snapBooking.docs[0].data();
        docId = snapBooking.docs[0].id;
      } else {
        const qUpper = query(maintenanceCol, where('bookingId', '==', code.toUpperCase()), limit(1));
        const snapUpper = await getDocs(qUpper);
        if (!snapUpper.empty) {
          matchedDoc = snapUpper.docs[0].data();
          docId = snapUpper.docs[0].id;
        } else {
          try {
            const directRef = doc(db, 'maintenance', code);
            const directSnap = await getDoc(directRef);
            if (directSnap.exists()) {
              matchedDoc = directSnap.data();
              docId = directSnap.id;
            }
          } catch {}
        }
      }

      if (!matchedDoc) {
        return res.status(404).json({
          error: 'Not Found',
          message: `عذراً، لم يتم العثور على طلب صيانة برقم السند (#${code}). يرجى التأكد من صحة الرمز.`
        });
      }

      const sanitizedRecord = {
        id: docId,
        bookingId: matchedDoc.bookingId || code,
        serviceType: matchedDoc.serviceType || 'صيانة عامة',
        serviceDate: matchedDoc.serviceDate || '',
        preferredTime: matchedDoc.preferredTime || '',
        status: matchedDoc.status || 'pending',
        carMake: matchedDoc.carMake || '',
        carModel: matchedDoc.carModel || '',
        carYear: matchedDoc.carYear || '',
        plateNumber: maskPlate(matchedDoc.plateNumber),
        customerName: maskName(matchedDoc.customerName || matchedDoc.name),
        inspectionStatus: matchedDoc.inspectionStatus || '',
        estimatedCompletion: matchedDoc.estimatedCompletion || '',
        notes: matchedDoc.publicNotes || matchedDoc.customerNotes || '',
        stage: matchedDoc.stage || 'received',
        updatedAt: matchedDoc.updatedAt || matchedDoc.createdAt || ''
      };

      return res.status(200).json({ success: true, booking: sanitizedRecord });
    } catch (err: any) {
      console.error('[Booking Track Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء البحث عن حالة الطلب' });
    }
  }

  // =========================================================================
  // SECTION 1.5: CUSTOMER PHONE LOGIN / AUTO-ONBOARDING (/api/customer/login)
  // =========================================================================
  if ((pathname.includes('/customer/login') || pathname.includes('/customer/phone-login') || actionParam === 'customer-login') && req.method === 'POST') {
    const { phone: rawPhone, password: pass } = req.body || {};
    const rawClean = String(rawPhone || '').trim();
    if (!rawClean) {
      return res.status(400).json({ error: 'Validation Error', message: 'رقم الجوال مطلوب' });
    }

    // Convert Arabic digits
    const converted = rawClean
      .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
      .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
    let digits = converted.replace(/\D/g, '');
    if (digits.startsWith('009665')) {
      digits = '0' + digits.substring(5);
    } else if (digits.startsWith('9665') && digits.length >= 12) {
      digits = '0' + digits.substring(3);
    } else if (digits.startsWith('5') && digits.length === 9) {
      digits = '0' + digits;
    }

    if (digits.length < 10) {
      return res.status(400).json({ error: 'Validation Error', message: 'يرجى إدخال رقم جوال صحيح (مثال: 05xxxxxxxx)' });
    }

    try {
      const db = await getDb();
      let customerDocId = digits;
      let customerData: any = null;

      // 1. Direct document check by normalized phone ID
      const directRef = doc(db, 'customers', digits);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        customerData = directSnap.data();
        customerDocId = directSnap.id;
      } else {
        // 2. Query by phone field
        const qCust = query(collection(db, 'customers'), where('phone', '==', digits), limit(1));
        const custSnap = await getDocs(qCust);
        if (!custSnap.empty) {
          customerData = custSnap.docs[0].data();
          customerDocId = custSnap.docs[0].id;
        }
      }

      // 3. If customer profile exists, check password if one was set
      if (customerData) {
        if (customerData.password && pass && String(customerData.password).trim() !== String(pass).trim()) {
          return res.status(401).json({ error: 'Auth Failed', message: 'كلمة المرور غير صحيحة.' });
        }

        // Update lastLoginAt
        updateDoc(doc(db, 'customers', customerDocId), {
          lastLoginAt: new Date().toISOString()
        }).catch(() => {});

        return res.status(200).json({
          success: true,
          customer: {
            ...customerData,
            id: customerDocId,
            phone: customerData.phone || digits
          }
        });
      }

      // 4. Customer profile does not exist in 'customers' collection yet:
      // Search 'maintenance' collection to see if admin added bookings for this phone number!
      const qMaint = query(collection(db, 'maintenance'), where('customerPhone', '==', digits), limit(20));
      const maintSnap = await getDocs(qMaint);

      let detectedName = 'عميل كريم';
      const extractedCars: any[] = [];

      if (!maintSnap.empty) {
        maintSnap.forEach(d => {
          const mData = d.data() as Record<string, any>;
          if (mData.customerName && detectedName === 'عميل كريم') {
            detectedName = String(mData.customerName).trim();
          }
          if (mData.vehicleType || mData.carModel) {
            extractedCars.push({
              id: `car_booking_${d.id}`,
              make: mData.vehicleType || 'سيارة',
              model: mData.carModel || '',
              year: mData.carYear || new Date().getFullYear().toString(),
              plateNumber: mData.carPlate || mData.plateNumber || '',
              addedAt: new Date().toISOString()
            });
          }
        });
      }

      // 5. Create new customer profile automatically so the page opens seamlessly!
      const newProfile = {
        id: digits,
        name: detectedName,
        phone: digits,
        customerPhone: digits,
        email: '',
        status: 'regular',
        cars: extractedCars,
        totalSpent: 0,
        totalVisits: maintSnap.size,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'customers', digits), newProfile);

      return res.status(200).json({
        success: true,
        customer: newProfile,
        isNewProfile: true
      });
    } catch (err: any) {
      console.error('[Customer Phone Login Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ في الخادم أثناء تسجيل الدخول' });
    }
  }

  // =========================================================================
  // SECTION 2: CUSTOMER MY-BOOKINGS (/api/customer/my-bookings)
  // =========================================================================
  if (pathname.includes('/customer/my-bookings') || actionParam === 'my-bookings') {
    const phone = String(req.query.phone || parsedUrl.searchParams.get('phone') || '').trim();
    const googleUid = String(req.query.googleUid || parsedUrl.searchParams.get('googleUid') || '').trim();
    const customerId = String(req.query.customerId || parsedUrl.searchParams.get('customerId') || '').trim();

    if (!phone && !googleUid && !customerId) {
      return res.status(400).json({ error: 'Validation Error', message: 'يرجى تقديم رقم الهاتف أو حساب Google للبحث' });
    }

    try {
      const db = await getDb();
      let verifiedPhone = '';
      let verifiedCustomerId = customerId;

      if (googleUid) {
        const qCust = query(collection(db, 'customers'), where('googleUid', '==', googleUid), limit(1));
        const custSnap = await getDocs(qCust);
        if (!custSnap.empty) {
          const cData = custSnap.docs[0].data() as Record<string, any>;
          verifiedPhone = cData.phone || '';
          verifiedCustomerId = custSnap.docs[0].id;
        }
      }

      if (!verifiedPhone && phone) {
        const qPhone = query(collection(db, 'customers'), where('phone', '==', phone), limit(1));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          const cData = phoneSnap.docs[0].data() as Record<string, any>;
          if (googleUid && cData.googleUid && cData.googleUid !== googleUid) {
            return res.status(403).json({ error: 'Forbidden', message: 'غير مصرح بعرض سجلات هذا الرقم' });
          }
          verifiedPhone = cData.phone || phone;
          verifiedCustomerId = phoneSnap.docs[0].id;
        }
      }

      const bookingsMap = new Map<string, any>();

      if (verifiedPhone) {
        const qMaintPhone = query(collection(db, 'maintenance'), where('customerPhone', '==', verifiedPhone), limit(100));
        const snapM = await getDocs(qMaintPhone);
        snapM.forEach(d => bookingsMap.set(d.id, { id: d.id, ...(d.data() as Record<string, any>) }));

        const rawDigits = verifiedPhone.replace(/\D/g, '');
        if (rawDigits !== verifiedPhone) {
          const qMaintRaw = query(collection(db, 'maintenance'), where('customerPhone', '==', rawDigits), limit(100));
          const snapRaw = await getDocs(qMaintRaw);
          snapRaw.forEach(d => bookingsMap.set(d.id, { id: d.id, ...(d.data() as Record<string, any>) }));
        }
      }

      if (verifiedCustomerId) {
        const qMaintCust = query(collection(db, 'maintenance'), where('customerId', '==', verifiedCustomerId), limit(100));
        const snapCust = await getDocs(qMaintCust);
        snapCust.forEach(d => bookingsMap.set(d.id, { id: d.id, ...(d.data() as Record<string, any>) }));

        const qMaintPrefix = query(collection(db, 'maintenance'), where('customerId', '==', `cust_${verifiedCustomerId}`), limit(100));
        const snapPrefix = await getDocs(qMaintPrefix);
        snapPrefix.forEach(d => bookingsMap.set(d.id, { id: d.id, ...(d.data() as Record<string, any>) }));
      }

      if (googleUid) {
        const qMaintGoogle = query(collection(db, 'maintenance'), where('googleUid', '==', googleUid), limit(100));
        const snapDirect = await getDocs(qMaintGoogle);
        snapDirect.forEach(d => bookingsMap.set(d.id, { id: d.id, ...(d.data() as Record<string, any>) }));
      }

      const list = Array.from(bookingsMap.values());
      list.sort((a, b) => {
        const timeA = new Date(a.serviceDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.serviceDate || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      if (list.length > 0) {
        memoryBookingsCache = list;
      }

      return res.status(200).json({ success: true, bookings: list });
    } catch (err: any) {
      if (isFirestoreQuotaError(err)) {
        console.warn('[Customer Bookings]: Operating in offline quota-exceeded mode.');
        return res.status(200).json({ success: true, bookings: memoryBookingsCache, isOffline: true });
      }
      console.error('[Customer Bookings Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب سجلات الحجوزات' });
    }
  }

  // =========================================================================
  // SECTION 3: STAFF AUTH & MANAGEMENT (/api/staff/*)
  // =========================================================================
  const isStaffRoute = pathname.includes('/staff/') || pathname.endsWith('/staff') || actionParam === 'staff';

  if (isStaffRoute) {
    const subAction = pathname.replace(/^.*\/staff\/?/, '') || (req.query?.subaction as string) || '';

    // POST /api/staff/login
    if ((subAction === 'login' || actionParam === 'staff-login') && req.method === 'POST') {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Validation Error', message: 'اسم المستخدم وكلمة المرور مطلوبان' });
      }

      const cleanUser = String(username).trim();
      const cleanPass = String(password).trim();

      // Master Super Admin check (bypasses rate limit and unlocks any previous lockout)
      if (isMasterAdminMatch(cleanUser, cleanPass)) {
        staffLoginAttempts.delete(clientIp);
        const resolvedUsername = cleanUser.toLowerCase() === 'admin' ? 'admin' : (cleanUser.toLowerCase() === 'drfix' ? 'drfix' : cleanUser.toLowerCase());
        return res.status(200).json({
          success: true,
          user: {
            id: 'master-super-admin',
            username: resolvedUsername,
            fullName: 'المدير العام (Master Admin)',
            role: 'super_admin',
            roleTitleAr: 'المدير العام',
            permissions: {
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
              canEditRoles: true,
              canViewStaffNotes: true,
              canExportReports: true,
              canManageInventory: true,
              canViewFinancials: true,
              canDeleteRecords: true,
              canManageCoupons: true,
              canManageContracts: true,
              canDeleteBookings: true,
              accounting_admin: true
            },
            isActive: true
          },
          staffPortalAuth: {
            email: 'staff-portal@drfix.repair',
            pass: 'DRFixStaffPortalSecure2026!#'
          }
        });
      }

      // Check Rate Limiting for non-master login attempts
      const attemptInfo = staffLoginAttempts.get(clientIp);
      if (attemptInfo && attemptInfo.lockedUntil > Date.now()) {
        const waitMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `تم قفل محاولات الدخول مؤقتاً. يرجى الانتظار ${waitMinutes} دقيقة.`
        });
      }

      try {
        const db = await getDb();
        const staffQuery = query(collection(db, 'staff'), where('username', '==', cleanUser.toLowerCase()));
        const snap = await getDocs(staffQuery);

        if (snap.empty) {
          const curAttempts = (attemptInfo?.attempts || 0) + 1;
          staffLoginAttempts.set(clientIp, {
            attempts: curAttempts,
            lockedUntil: curAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0
          });
          return res.status(401).json({ error: 'Auth Failed', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        const userDoc = snap.docs[0];
        const userData = userDoc.data() as Record<string, any>;

        const { valid, needsUpgrade } = verifyPasswordScrypt(cleanPass, userData.password);
        const isMasterPass = MASTER_PASSWORDS.includes(cleanPass) || MASTER_PASSWORDS.some(p => p.toLowerCase() === cleanPass.toLowerCase());
        const isSuperAdmin = userData.role === 'super_admin';

        if (!valid && !(isSuperAdmin && isMasterPass)) {
          const curAttempts = (attemptInfo?.attempts || 0) + 1;
          staffLoginAttempts.set(clientIp, {
            attempts: curAttempts,
            lockedUntil: curAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0
          });
          return res.status(401).json({ error: 'Auth Failed', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        if (userData.isActive === false) {
          return res.status(403).json({ error: 'Inactive', message: 'عذراً، هذا الحساب معطل حالياً من قِبل الإدارة.' });
        }

        if (needsUpgrade) {
          try {
            const scryptHash = hashPasswordScrypt(cleanPass);
            await updateDoc(doc(db, 'staff', userDoc.id), {
              password: scryptHash,
              passwordUpgradedAt: new Date().toISOString()
            });
          } catch (upgradeErr) {
            console.error('[Staff Auth] Failed to auto-upgrade password hash:', upgradeErr);
          }
        }

        updateDoc(doc(db, 'staff', userDoc.id), {
          lastLogin: new Date().toISOString()
        }).catch(console.error);

        staffLoginAttempts.delete(clientIp);

        const permissions = userData.permissions || {};
        if (isSuperAdmin) {
          permissions.accounting_admin = true;
          permissions.canManageStaff = true;
          permissions.canEditRoles = true;
          permissions.canDeleteRecords = true;
          permissions.canViewFinancials = true;
          permissions.canViewDashboard = true;
          permissions.canManageBookings = true;
        }

        const safeUser = {
          id: userDoc.id,
          username: userData.username,
          fullName: userData.fullName || userData.username,
          phone: userData.phone || '',
          role: userData.role || 'staff',
          roleTitleAr: userData.roleTitleAr || '',
          permissions,
          isActive: userData.isActive !== false,
          notes: userData.notes || ''
        };

        return res.status(200).json({
          success: true,
          user: safeUser,
          staffPortalAuth: {
            email: 'staff-portal@drfix.repair',
            pass: 'DRFixStaffPortalSecure2026!#'
          }
        });
      } catch (err: any) {
        console.error('[Staff Login Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء فحص بيانات الدخول' });
      }
    }

    // POST /api/staff/save
    if ((subAction === 'save' || actionParam === 'staff-save') && req.method === 'POST') {
      const { staffId, fullName, username, password, phone, role, roleTitleAr, permissions, isActive, notes, currentAdminRole } = req.body || {};

      if (!fullName || !username) {
        return res.status(400).json({ error: 'Validation Error', message: 'الاسم واسم المستخدم مطلوبان' });
      }

      const cleanPermissions = { ...(permissions || {}) };
      if (cleanPermissions.accounting_admin === true && currentAdminRole !== 'super_admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'لا يمكن منح صلاحية مدير الحسابات (accounting_admin) إلا بواسطة المدير العام حصراً.'
        });
      }

      try {
        const db = await getDb();
        const staffPayload: any = {
          fullName: String(fullName).trim(),
          username: String(username).trim().toLowerCase(),
          phone: String(phone || '').trim(),
          role: role || 'staff',
          roleTitleAr: roleTitleAr || '',
          permissions: cleanPermissions,
          isActive: isActive !== false,
          notes: String(notes || '').trim(),
          updatedAt: new Date().toISOString()
        };

        if (password && String(password).trim().length > 0) {
          staffPayload.password = hashPasswordScrypt(String(password).trim());
        }

        if (staffId) {
          await updateDoc(doc(db, 'staff', staffId), staffPayload);
          return res.status(200).json({ success: true, message: 'تم تحديث حساب الموظف بنجاح' });
        } else {
          if (!password) {
            return res.status(400).json({ error: 'Validation Error', message: 'كلمة المرور مطلوبة للموظف الجديد' });
          }
          staffPayload.createdAt = new Date().toISOString();
          staffPayload.lastLogin = null;
          const newRef = await addDoc(collection(db, 'staff'), staffPayload);
          return res.status(200).json({ success: true, id: newRef.id, message: 'تم إنشاء حساب الموظف بنجاح' });
        }
      } catch (err: any) {
        console.error('[Staff Save Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء حفظ بيانات الموظف' });
      }
    }

    // GET /api/staff/list
    if ((subAction === 'list' || subAction === '' || actionParam === 'staff-list') && req.method === 'GET') {
      try {
        const db = await getDb();
        const staffQuery = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(staffQuery);

        const staffList = snap.docs.map(d => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            username: data.username || '',
            fullName: data.fullName || data.username || '',
            phone: data.phone || '',
            role: data.role || 'staff',
            roleTitleAr: data.roleTitleAr || '',
            permissions: data.permissions || {},
            isActive: data.isActive !== false,
            notes: data.notes || '',
            createdAt: data.createdAt || null,
            lastLogin: data.lastLogin || null
          };
        });

        if (staffList.length > 0) {
          memoryStaffCache = staffList;
        }

        return res.status(200).json({ success: true, staff: staffList });
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) {
          console.warn('[Staff List]: Operating in offline quota-exceeded mode.');
          const fallbackStaff = memoryStaffCache.length > 0 ? memoryStaffCache : [
            {
              id: 'master-admin-fallback',
              username: MASTER_ADMIN.username,
              fullName: 'الإدارة العامة - المشرف العام',
              phone: '0546870807',
              role: 'super_admin',
              roleTitleAr: 'المدير العام',
              permissions: {
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
                canDeleteBookings: true
              },
              isActive: true,
              notes: 'Master Administrator fallback during quota limit',
              createdAt: new Date().toISOString(),
              lastLogin: null
            }
          ];
          return res.status(200).json({ success: true, staff: fallbackStaff, isOffline: true });
        }
        console.error('[Staff List Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب قائمة الموظفين' });
      }
    }

    // POST /api/staff/delete
    if ((subAction === 'delete' || actionParam === 'staff-delete') && req.method === 'POST') {
      const { staffId, currentAdminRole } = req.body || {};
      if (!staffId) {
        return res.status(400).json({ error: 'Validation Error', message: 'معرف الموظف مطلوب' });
      }

      if (currentAdminRole !== 'super_admin' && currentAdminRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'غير مصرح بحذف حسابات الموظفين' });
      }

      try {
        const db = await getDb();
        await deleteDoc(doc(db, 'staff', staffId));
        return res.status(200).json({ success: true, message: 'تم حذف حساب الموظف بنجاح' });
      } catch (err: any) {
        console.error('[Staff Delete Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء حذف حساب الموظف' });
      }
    }

    // POST /api/staff/toggle-active
    if ((subAction === 'toggle-active' || actionParam === 'staff-toggle') && req.method === 'POST') {
      const { staffId, isActive } = req.body || {};
      if (!staffId) {
        return res.status(400).json({ error: 'Validation Error', message: 'معرف الموظف مطلوب' });
      }

      try {
        const db = await getDb();
        await updateDoc(doc(db, 'staff', staffId), {
          isActive: !isActive,
          updatedAt: new Date().toISOString()
        });
        return res.status(200).json({ success: true, message: 'تم تحديث حالة الحساب بنجاح' });
      } catch (err: any) {
        console.error('[Staff Toggle Active Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء تعديل حالة الموظف' });
      }
    }
  }

  // =========================================================================
  // SECTION 4: WORKSHOP PORTAL OPERATIONS (/api/portal/staff/*)
  // =========================================================================
  const isPortalStaffRoute = pathname.includes('/portal/staff') || pathname.includes('/staff/bookings') || pathname.includes('/staff/customers');

  if (isPortalStaffRoute) {
    // GET /api/portal/staff/bookings
    if (pathname.includes('bookings') && !pathname.includes('update') && req.method === 'GET') {
      const role = String(req.query.role || '').toLowerCase();
      const staffId = String(req.query.staffId || '').trim();

      try {
        const db = await getDb();
        let qBookings;

        if (role === 'technician' && staffId) {
          qBookings = query(
            collection(db, 'maintenance'),
            where('assignedStaffId', '==', staffId),
            limit(100)
          );
        } else {
          qBookings = query(
            collection(db, 'maintenance'),
            orderBy('serviceDate', 'desc'),
            limit(120)
          );
        }

        const snap = await getDocs(qBookings);
        const bookings = snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));

        return res.status(200).json({ success: true, bookings });
      } catch (err: any) {
        console.error('[Staff Bookings Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب قائمة الحجوزات' });
      }
    }

    // POST /api/portal/staff/bookings/update
    if (pathname.includes('update') && req.method === 'POST') {
      const { bookingDocId, status, stage, inspectionNotes, technicianNotes, carMilage, assignedStaffId, cost, isPaid } = req.body || {};

      if (!bookingDocId) {
        return res.status(400).json({ error: 'Validation Error', message: 'معرف طلب الصيانة مطلوب' });
      }

      try {
        const db = await getDb();
        const docRef = doc(db, 'maintenance', bookingDocId);
        const existingSnap = await getDoc(docRef);

        if (!existingSnap.exists()) {
          return res.status(404).json({ error: 'Not Found', message: 'طلب الصيانة غير موجود' });
        }

        const updates: any = {
          updatedAt: new Date().toISOString()
        };

        if (status !== undefined) updates.status = status;
        if (stage !== undefined) updates.stage = stage;
        if (inspectionNotes !== undefined) updates.inspectionNotes = inspectionNotes;
        if (technicianNotes !== undefined) updates.technicianNotes = technicianNotes;
        if (carMilage !== undefined) updates.carMilage = carMilage;
        if (assignedStaffId !== undefined) updates.assignedStaffId = assignedStaffId;
        if (cost !== undefined) updates.cost = cost;
        if (isPaid !== undefined) updates.isPaid = isPaid;

        await updateDoc(docRef, updates);

        return res.status(200).json({
          success: true,
          message: 'تم تحديث بيانات الحجز بنجاح',
          updates
        });
      } catch (err: any) {
        console.error('[Staff Booking Update Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء تحديث طلب الصيانة' });
      }
    }

    // GET /api/portal/staff/customers
    if (pathname.includes('customers') && req.method === 'GET') {
      const search = String(req.query.search || '').trim().toLowerCase();

      try {
        const db = await getDb();
        const snap = await getDocs(query(collection(db, 'customers'), limit(150)));

        let customers = snap.docs.map(d => {
          const data = d.data() as Record<string, any>;
          const { password, linkVerificationCodeHash, ...cleanData } = data;
          return {
            id: d.id,
            ...cleanData
          };
        });

        if (search) {
          customers = customers.filter((c: any) =>
            (c.name && c.name.toLowerCase().includes(search)) ||
            (c.phone && c.phone.includes(search)) ||
            (c.email && c.email.toLowerCase().includes(search))
          );
        }

        if (customers.length > 0) {
          memoryCustomersCache = customers;
        }

        return res.status(200).json({ success: true, customers });
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) {
          console.warn('[Staff Customers]: Operating in offline quota-exceeded mode.');
          return res.status(200).json({ success: true, customers: memoryCustomersCache, isOffline: true });
        }
        console.error('[Staff Customers Error]:', err);
        return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب سجلات العملاء' });
      }
    }
  }

  // =========================================================================
  // SECTION 5: CUSTOMER GOOGLE ACCOUNT LINKING (/api/customer-link/*)
  // =========================================================================
  const isCustomerLinkRoute = pathname.includes('/customer-link') || actionParam === 'customer-link';

  if (isCustomerLinkRoute) {
    let action = '';
    if (pathname.includes('/customer-link/')) {
      const sub = pathname.split('/customer-link/')[1] || '';
      action = sub.split('/')[0].split('?')[0].trim();
    }
    if (!action) {
      const qPath = (req.query?.path as string) || (req.query?.subaction as string) || '';
      if (qPath) {
        action = qPath.split('/')[0].split('?')[0].trim();
      }
    }
    if (!action && req.query?.action && req.query.action !== 'customer-link') {
      action = String(req.query.action).trim();
    }
    if (!action && req.body && req.body.action) {
      action = String(req.body.action).trim();
    }

    const db = await getDb();

    try {
      // 1. REQUEST OTP / AUTO-LINK / REGISTER
      if (action === 'request' || action === '/request') {
        const { phone, googleUid, email, name, photoURL } = req.body || {};
        const cleanPhone = unifySaudiPhone(phone);

        if (!cleanPhone || !cleanPhone.startsWith('05') || cleanPhone.length !== 10) {
          return res.status(400).json({ success: false, error: 'يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام (مثال: 05XXXXXXXX)' });
        }

        if (!googleUid) {
          return res.status(400).json({ success: false, error: 'بيانات حساب Google غير متوفرة. يرجى تسجيل الدخول بحساب Google أولاً.' });
        }

        let targetDocId = cleanPhone;
        let existingData: any = null;

        // Check 1: direct doc by phone ID
        const directDoc = await getDoc(doc(db, 'customers', cleanPhone));
        if (directDoc.exists()) {
          targetDocId = directDoc.id;
          existingData = directDoc.data();
        } else {
          // Check 2: query by phone field
          const qPhone = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
          const snap = await getDocs(qPhone);
          if (!snap.empty) {
            targetDocId = snap.docs[0].id;
            existingData = snap.docs[0].data();
          } else {
            // Check 3: check if customer doc already exists under googleUid
            const directGoogleDoc = await getDoc(doc(db, 'customers', googleUid));
            if (directGoogleDoc.exists()) {
              const gData = directGoogleDoc.data();
              if (gData.phone === cleanPhone || !gData.phone) {
                targetDocId = directGoogleDoc.id;
                existingData = gData;
              }
            }
          }
        }

        // Scenario 1: Customer record already exists in customers collection (الصفحة التي أنشأها المركز للعميل مسبقاً)
        if (existingData) {
          // Merge cars from existingData.cars, existingData.vehicles, and past maintenance
          let mergedCars: any[] = Array.isArray(existingData.cars) ? [...existingData.cars] : [];

          if (Array.isArray(existingData.vehicles)) {
            existingData.vehicles.forEach((v: any) => {
              const modelStr = typeof v === 'string' ? v : (v.model || v.name || '');
              const makeStr = typeof v === 'object' ? (v.make || '') : '';
              const yearStr = typeof v === 'object' ? (v.year || '') : '';
              const plateStr = typeof v === 'object' ? (v.plateNumber || '') : '';
              if (modelStr || makeStr) {
                const exists = mergedCars.some(c => 
                  (c.model && modelStr && c.model.includes(modelStr)) || 
                  (c.make && makeStr && c.make === makeStr && c.model === modelStr)
                );
                if (!exists) {
                  mergedCars.push({
                    id: 'car_veh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    make: makeStr || 'عام',
                    model: modelStr || 'عام',
                    year: yearStr || '',
                    plateNumber: plateStr || '',
                    addedAt: new Date().toISOString()
                  });
                }
              }
            });
          }

          // Also pull cars from maintenance collection
          try {
            const qMaint = query(collection(db, 'maintenance'), where('customerPhone', '==', cleanPhone), limit(50));
            const maintSnap = await getDocs(qMaint);
            maintSnap.docs.forEach((mDoc) => {
              const m = mDoc.data();
              if (m.carMake || m.carModel) {
                const candidateMake = (m.carMake || 'عام').trim();
                const candidateModel = (m.carModel || 'عام').trim();
                const candidateYear = (m.carYear || '').toString().trim();
                const candidatePlate = (m.plateNumber || '').trim();
                const already = mergedCars.some(c => 
                  (c.make === candidateMake || candidateMake === 'عام') && 
                  (c.model === candidateModel || (c.model && c.model.includes(candidateModel)))
                );
                if (!already) {
                  mergedCars.push({
                    id: 'car_maint_' + mDoc.id,
                    make: candidateMake,
                    model: candidateModel,
                    year: candidateYear,
                    plateNumber: candidatePlate,
                    addedAt: new Date().toISOString()
                  });
                }
              }
            });
          } catch (mErr) {
            console.warn('[Maint Sync Warning]:', mErr);
          }

          const mergedName = (existingData.name && existingData.name !== 'عميل كريم')
            ? existingData.name
            : (name || existingData.name || 'عميل كريم');

          const updatedCustomerProfile = {
            ...existingData,
            id: targetDocId,
            phone: cleanPhone,
            googleUid: googleUid,
            email: email || existingData.email || '',
            photoURL: photoURL || existingData.photoURL || null,
            name: mergedName,
            cars: mergedCars,
            isPendingPhone: false,
            updatedAt: new Date().toISOString()
          };

          // Update customer record in Firestore with server worker permissions
          await updateDoc(doc(db, 'customers', targetDocId), {
            googleUid: googleUid,
            email: email || existingData.email || '',
            photoURL: photoURL || existingData.photoURL || null,
            phone: cleanPhone,
            name: mergedName,
            cars: mergedCars,
            isPendingPhone: false,
            updatedAt: new Date().toISOString()
          });

          // Non-blocking notification to Telegram
          sendTelegramAlert(
            `✅ <b>تسجيل دخول عميل وفتح صفحته المسجلة مسبقاً</b> 🚗⚡\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>اسم العميل:</b> ${escapeTelegramHtml(mergedName)}\n` +
            `📱 <b>الجوال:</b> <code>${cleanPhone}</code>\n` +
            `📧 <b>البريد:</b> ${escapeTelegramHtml(email || 'غير متوفر')}\n` +
            `🚘 <b>عدد السيارات:</b> ${mergedCars.length}\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `تمت مطابقة رقم الجوال وفتح الصفحة المسجلة له فوراً.`
          ).catch(err => console.warn('[Telegram Alert Warning]:', err));

          return res.status(200).json({
            success: true,
            exists: true,
            alreadyLinked: true,
            customerId: targetDocId,
            profile: updatedCustomerProfile
          });
        }

        // Scenario 2: No doc in customers yet, but customer has past maintenance bookings
        let pastCars: any[] = [];
        let pastVisits = 0;
        let pastName = '';
        try {
          const qMaint = query(collection(db, 'maintenance'), where('customerPhone', '==', cleanPhone), limit(50));
          const maintSnap = await getDocs(qMaint);
          if (!maintSnap.empty) {
            pastVisits = maintSnap.size;
            maintSnap.docs.forEach((mDoc) => {
              const m = mDoc.data();
              if (!pastName && m.customerName && m.customerName !== 'عميل كريم') {
                pastName = m.customerName;
              }
              if (m.carMake || m.carModel) {
                const candidateMake = (m.carMake || 'عام').trim();
                const candidateModel = (m.carModel || 'عام').trim();
                const candidateYear = (m.carYear || '').toString().trim();
                const candidatePlate = (m.plateNumber || '').trim();
                const already = pastCars.some(c => c.make === candidateMake && c.model === candidateModel && c.year === candidateYear);
                if (!already) {
                  pastCars.push({
                    id: 'car_maint_' + mDoc.id,
                    make: candidateMake,
                    model: candidateModel,
                    year: candidateYear,
                    plateNumber: candidatePlate,
                    addedAt: new Date().toISOString()
                  });
                }
              }
            });
          }
        } catch (mErr) {
          console.warn('[Maint Sync Warning]:', mErr);
        }

        // Scenario 3: Brand new customer or new customer with past bookings
        const finalName = pastName || name || 'عميل كريم';
        const newCustomerProfile = {
          id: googleUid,
          name: finalName,
          email: email || '',
          phone: cleanPhone,
          photoURL: photoURL || null,
          googleUid: googleUid,
          cars: pastCars,
          totalVisits: pastVisits,
          totalSpent: 0,
          status: pastVisits >= 3 ? 'vip' : 'new',
          isPendingPhone: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save customer document safely on server
        await setDoc(doc(db, 'customers', googleUid), newCustomerProfile, { merge: true });

        sendTelegramAlert(
          `✨ <b>تسجيل عميل جديد وفتح صفحة خاصة به</b> 🚗⚡\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>اسم العميل:</b> ${escapeTelegramHtml(finalName)}\n` +
          `📱 <b>الجوال:</b> <code>${cleanPhone}</code>\n` +
          `📧 <b>البريد:</b> ${escapeTelegramHtml(email || 'غير متوفر')}\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `تم إنشاء صفحة العميل بنجاح.`
        ).catch(err => console.warn('[Telegram Alert Warning]:', err));

        return res.status(200).json({
          success: true,
          exists: pastVisits > 0,
          created: true,
          customerId: googleUid,
          profile: newCustomerProfile
        });
      }

      // 2. VERIFY OTP
      if (action === 'verify' || action === '/verify') {
        const { customerId, inputCode, googleUid, email, name, photoURL } = req.body || {};

        if (!customerId || !googleUid) {
          return res.status(400).json({ success: false, error: 'بيانات الطلب غير مكتملة' });
        }

        const custRef = doc(db, 'customers', customerId);
        const snap = await getDoc(custRef);
        if (!snap.exists()) {
          return res.status(404).json({ success: false, error: 'تعذر العثور على ملف العميل' });
        }

        const existingData = snap.data() as Record<string, any>;

        if (existingData.linkVerificationStatus === 'verified' && existingData.googleUid === googleUid) {
          return res.json({ success: true, adminApproved: true });
        }

        if (existingData.blockedUntil && Date.now() < existingData.blockedUntil) {
          const remainingMinutes = Math.max(1, Math.ceil((existingData.blockedUntil - Date.now()) / 60000));
          return res.status(429).json({
            success: false,
            blocked: true,
            error: `الرقم مجمد مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة أو التواصل مع الإدارة.`
          });
        }

        if (existingData.linkVerificationExpiresAt && Date.now() > existingData.linkVerificationExpiresAt) {
          return res.status(400).json({
            success: false,
            expired: true,
            error: 'انتهت صلاحية رمز التحقق (15 دقيقة). يرجى إعادة طلب رمز جديد.'
          });
        }

        const cleanInput = String(inputCode || '').trim();
        if (!cleanInput) {
          return res.status(400).json({ success: false, error: 'يرجى إدخال رمز التحقق' });
        }

        const inputHash = crypto.createHash('sha256').update(cleanInput + ':' + googleUid).digest('hex');
        const isMatch = inputHash === existingData.linkVerificationCodeHash;

        if (!isMatch) {
          const newFailed = (existingData.failedOtpAttempts || 0) + 1;
          if (newFailed >= 3) {
            const blockUntil = Date.now() + 15 * 60 * 1000;
            await updateDoc(custRef, {
              failedOtpAttempts: newFailed,
              blockedUntil: blockUntil,
              linkVerificationStatus: 'rejected',
              linkVerificationCodeHash: null,
              updatedAt: new Date().toISOString()
            });
            return res.status(429).json({
              success: false,
              blocked: true,
              error: 'تم استنفاد الحد الأقصى للمحاولات (3 محاولات خاطئة). تم إلغاء الطلب وتجميد المحاولات لمدة 15 دقيقة لحماية الحساب.'
            });
          } else {
            await updateDoc(custRef, {
              failedOtpAttempts: newFailed,
              updatedAt: new Date().toISOString()
            });
            return res.status(400).json({
              success: false,
              remainingAttempts: 3 - newFailed,
              error: `رمز التحقق غير صحيح. يرجى التأكد من الرمز (متبقي ${3 - newFailed} محاولات).`
            });
          }
        }

        const mergedName = (existingData.name && existingData.name !== 'عميل كريم')
          ? existingData.name
          : (name || existingData.name || 'عميل كريم');

        await updateDoc(custRef, {
          googleUid,
          email: email || existingData.email || '',
          name: mergedName,
          photoURL: photoURL || existingData.photoURL || null,
          linkVerificationStatus: 'verified',
          linkVerificationCodeHash: null,
          linkVerificationExpiresAt: null,
          failedOtpAttempts: 0,
          blockedUntil: null,
          approvedBy: 'OTP Code (توثيق رمز التحقق)',
          approvedAt: new Date().toISOString(),
          pendingLinkGoogleUid: null,
          pendingLinkEmail: null,
          pendingLinkName: null,
          pendingLinkPhoto: null,
          updatedAt: new Date().toISOString()
        });

        if (googleUid && googleUid !== customerId) {
          try {
            const dummyRef = doc(db, 'customers', googleUid);
            const dummySnap = await getDoc(dummyRef);
            if (dummySnap.exists()) {
              const dData = dummySnap.data() as Record<string, any>;
              const hasNoCars = !Array.isArray(dData.cars) || dData.cars.length === 0;
              const hasNoVisits = !dData.totalVisits || dData.totalVisits === 0;
              if (hasNoCars && hasNoVisits) {
                await deleteDoc(dummyRef);
              }
            }
          } catch (delErr) {
            console.warn('Dummy cleanup warning:', delErr);
          }
        }

        const updatedSnap = await getDoc(custRef);
        const updatedProfile = updatedSnap.exists() ? { id: custRef.id, ...updatedSnap.data() } : null;

        return res.json({ success: true, profile: updatedProfile });
      }

      // 3. APPROVE LINK (SUPER ADMIN)
      if (action === 'approve' || action === '/approve') {
        const { customerId, adminId, adminName, adminRole, isSuperAdmin: bodyIsSuperAdmin } = req.body || {};

        const isSuperAdmin = bodyIsSuperAdmin === true || adminRole === 'super_admin' || req.headers['x-admin-role'] === 'super_admin';
        if (!isSuperAdmin) {
          return res.status(403).json({
            success: false,
            error: 'غير مصرح: اعتماد ربط الحسابات محصور على المدير العام (Super Admin) فقط.'
          });
        }

        if (!customerId) {
          return res.status(400).json({ success: false, error: 'معرف العميل مطلوب' });
        }

        const custRef = doc(db, 'customers', customerId);
        const snap = await getDoc(custRef);
        if (!snap.exists()) {
          return res.status(404).json({ success: false, error: 'تعذر العثور على ملف العميل' });
        }

        const existingData = snap.data() as Record<string, any>;

        if (!existingData.pendingLinkGoogleUid) {
          return res.status(400).json({ success: false, error: 'لا يوجد حساب Google معلق بانتظار الاعتماد لهذا العميل' });
        }

        if (existingData.linkVerificationExpiresAt && Date.now() > existingData.linkVerificationExpiresAt) {
          return res.status(400).json({
            success: false,
            error: 'لا يمكن اعتماد هذا الطلب لأنه منتهي الصلاحية (أكثر من 15 دقيقة). يرجى إبلاغ العميل بطلب ربط جديد.'
          });
        }

        const approverTitle = adminName ? `${adminName} (Super Admin)` : 'المدير العام (Super Admin)';
        const approvedAt = new Date().toISOString();

        await updateDoc(custRef, {
          googleUid: existingData.pendingLinkGoogleUid,
          email: existingData.pendingLinkEmail || existingData.email || '',
          name: (existingData.name && existingData.name !== 'عميل كريم') ? existingData.name : (existingData.pendingLinkName || existingData.name || 'عميل كريم'),
          linkVerificationStatus: 'verified',
          approvedBy: approverTitle,
          approvedAt,
          linkVerificationCodeHash: null,
          linkVerificationExpiresAt: null,
          failedOtpAttempts: 0,
          blockedUntil: null,
          pendingLinkGoogleUid: null,
          pendingLinkEmail: null,
          pendingLinkName: null,
          pendingLinkPhoto: null,
          updatedAt: approvedAt
        });

        if (existingData.pendingLinkGoogleUid && existingData.pendingLinkGoogleUid !== customerId) {
          try {
            const dummyRef = doc(db, 'customers', existingData.pendingLinkGoogleUid);
            const dummySnap = await getDoc(dummyRef);
            if (dummySnap.exists()) {
              const dData = dummySnap.data() as Record<string, any>;
              const hasNoCars = !Array.isArray(dData.cars) || dData.cars.length === 0;
              const hasNoVisits = !dData.totalVisits || dData.totalVisits === 0;
              if (hasNoCars && hasNoVisits) {
                await deleteDoc(dummyRef);
              }
            }
          } catch (delErr) {
            console.warn('Dummy cleanup ignore:', delErr);
          }
        }

        return res.json({ success: true, approvedBy: approverTitle, approvedAt });
      }

      // 4. REJECT LINK (SUPER ADMIN)
      if (action === 'reject' || action === '/reject') {
        const { customerId, adminRole, isSuperAdmin: bodyIsSuperAdmin } = req.body || {};

        const isSuperAdmin = bodyIsSuperAdmin === true || adminRole === 'super_admin' || req.headers['x-admin-role'] === 'super_admin';
        if (!isSuperAdmin) {
          return res.status(403).json({
            success: false,
            error: 'غير مصرح: رفض طلبات الربط محصور على المدير العام (Super Admin) فقط.'
          });
        }

        const custRef = doc(db, 'customers', customerId);
        await updateDoc(custRef, {
          linkVerificationStatus: 'rejected',
          linkVerificationCodeHash: null,
          linkVerificationExpiresAt: null,
          pendingLinkGoogleUid: null,
          pendingLinkEmail: null,
          pendingLinkName: null,
          pendingLinkPhoto: null,
          updatedAt: new Date().toISOString()
        });

        return res.json({ success: true });
      }

      return res.status(404).json({ success: false, error: 'الإجراء غير مدعوم' });
    } catch (err: any) {
      console.error('Customer Link API Error:', err);
      return res.status(500).json({ success: false, error: err.message || 'حدث خطأ في الخادم أثناء معالجة الطلب' });
    }
  }

  return res.status(404).json({ error: 'Not Found', message: 'المسار غير موجود في بوابة DR.FIX' });
}
