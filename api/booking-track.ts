import { Request, Response } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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
          console.error('[Booking Track Worker Auth Error]:', err.message);
        });
    }
    await authPromise;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
  return dbInstance;
}

// Masking helpers to prevent identity leak in public tracking
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

// Rate limiting by client IP
const trackAttempts = new Map<string, { count: number; resetAt: number }>();

export default async function bookingTrackHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

  // Rate limit: Max 30 lookups per 5 minutes per IP
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

  const code = String(req.query.code || '').trim();
  if (!code || code.length < 3 || code.length > 60) {
    return res.status(400).json({
      error: 'Invalid Code',
      message: 'يرجى تزويد رمز حجز صحيح للبحث عن حالة الصيانة.'
    });
  }

  try {
    const db = await getDb();
    const maintenanceCol = collection(db, 'maintenance');

    // 1. Search by bookingId (exact case or uppercase)
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
        // Try direct document ID lookup
        try {
          const directRef = doc(db, 'maintenance', code);
          const directSnap = await getDoc(directRef);
          if (directSnap.exists()) {
            matchedDoc = directSnap.data();
            docId = directSnap.id;
          }
        } catch {
          // ignore invalid doc path
        }
      }
    }

    if (!matchedDoc) {
      return res.status(404).json({
        error: 'Not Found',
        message: `عذراً، لم يتم العثور على طلب صيانة برقم السند (#${code}). يرجى التأكد من صحة الرمز.`
      });
    }

    // SANITIZATION: Never leak phone numbers, full addresses, customer ID, or internal cost financials to public viewers
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

    return res.status(200).json({
      success: true,
      booking: sanitizedRecord
    });
  } catch (err: any) {
    console.error('[Booking Track Error]:', err);
    return res.status(500).json({
      error: 'Server Error',
      message: 'حدث خطأ أثناء البحث عن حالة الطلب. يرجى المحاولة لاحقاً.'
    });
  }
}
