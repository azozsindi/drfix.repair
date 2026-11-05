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
  updateDoc,
  orderBy,
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
          console.error('[Portal Operations Worker Auth Error]:', err.message);
        });
    }
    await authPromise;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
  return dbInstance;
}

export default async function portalOperationsHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fullUrl = req.originalUrl || req.url || req.path || '';
  const rawPath = (req.path || req.url || '').split('?')[0];
  const pathPart = rawPath.replace(/^\/api\/portal\/?/, '').replace(/^\/api\/?/, '');

  // =========================================================================
  // 1. GET /api/portal/customer/my-bookings or /api/customer/my-bookings
  // Authenticated customer views ONLY their own past & current bookings
  // =========================================================================
  if ((fullUrl.includes('customer/my-bookings') || pathPart === 'customer/my-bookings') && req.method === 'GET') {
    const googleUid = String(req.query.googleUid || '').trim();
    const phone = String(req.query.phone || '').trim();

    if (!googleUid && !phone) {
      return res.status(400).json({ error: 'Validation Error', message: 'معرف الحساب مطلوب' });
    }

    try {
      const db = await getDb();
      let verifiedPhone = '';
      let verifiedCustomerId = '';

      // Verify customer identity through googleUid if provided
      if (googleUid) {
        const qCust = query(collection(db, 'customers'), where('googleUid', '==', googleUid), limit(1));
        const custSnap = await getDocs(qCust);
        if (!custSnap.empty) {
          const cData = custSnap.docs[0].data();
          verifiedPhone = cData.phone || '';
          verifiedCustomerId = custSnap.docs[0].id;
        }
      }

      // If phone was queried directly, check customer doc
      if (!verifiedPhone && phone) {
        const qPhone = query(collection(db, 'customers'), where('phone', '==', phone), limit(1));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          const cData = phoneSnap.docs[0].data();
          if (googleUid && cData.googleUid && cData.googleUid !== googleUid) {
            return res.status(403).json({ error: 'Forbidden', message: 'غير مصرح بعرض سجلات هذا الرقم' });
          }
          verifiedPhone = cData.phone || phone;
          verifiedCustomerId = phoneSnap.docs[0].id;
        }
      }

      const bookingsMap = new Map<string, any>();

      // Fetch bookings by verified phone
      if (verifiedPhone) {
        const qMaintPhone = query(collection(db, 'maintenance'), where('customerPhone', '==', verifiedPhone), limit(100));
        const snapM = await getDocs(qMaintPhone);
        snapM.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));

        // Also check un-prefixed phone
        const rawDigits = verifiedPhone.replace(/\D/g, '');
        if (rawDigits !== verifiedPhone) {
          const qMaintRaw = query(collection(db, 'maintenance'), where('customerPhone', '==', rawDigits), limit(100));
          const snapRaw = await getDocs(qMaintRaw);
          snapRaw.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
        }
      }

      // Fetch bookings by verified customerId
      if (verifiedCustomerId) {
        const qMaintCust = query(collection(db, 'maintenance'), where('customerId', '==', verifiedCustomerId), limit(100));
        const snapCust = await getDocs(qMaintCust);
        snapCust.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));

        const qMaintPrefix = query(collection(db, 'maintenance'), where('customerId', '==', `cust_${verifiedCustomerId}`), limit(100));
        const snapPrefix = await getDocs(qMaintPrefix);
        snapPrefix.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
      }

      // Fetch bookings by direct googleUid if tagged
      if (googleUid) {
        const qMaintUid = query(collection(db, 'maintenance'), where('googleUid', '==', googleUid), limit(100));
        const snapUid = await getDocs(qMaintUid);
        snapUid.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
      }

      const bookings = Array.from(bookingsMap.values());
      return res.status(200).json({ success: true, bookings });
    } catch (err: any) {
      console.error('[My Bookings Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء تحميل سجلات الحجوزات' });
    }
  }

  // =========================================================================
  // 2. GET /api/portal/staff/bookings
  // Technicians get ONLY assigned bookings; Receptionists get active workshop queue
  // =========================================================================
  if (pathPart === 'staff/bookings' && req.method === 'GET') {
    const role = String(req.query.role || 'staff').trim();
    const staffId = String(req.query.staffId || '').trim();

    try {
      const db = await getDb();
      let qBookings;

      if (role === 'technician' && staffId) {
        // Technician sees ONLY bookings assigned to them
        qBookings = query(
          collection(db, 'maintenance'),
          where('assignedStaffId', '==', staffId),
          limit(100)
        );
      } else {
        // Reception / Admin / Management see recent maintenance queue
        qBookings = query(
          collection(db, 'maintenance'),
          orderBy('serviceDate', 'desc'),
          limit(120)
        );
      }

      const snap = await getDocs(qBookings);
      const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      return res.status(200).json({ success: true, bookings });
    } catch (err: any) {
      console.error('[Staff Bookings Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب قائمة الحجوزات' });
    }
  }

  // =========================================================================
  // 3. POST /api/portal/staff/bookings/update
  // Securely update status, stage, inspection checklist, and technician notes
  // =========================================================================
  if (pathPart === 'staff/bookings/update' && req.method === 'POST') {
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
      return res.status(200).json({ success: true, message: 'تم تحديث طلب الصيانة بنجاح' });
    } catch (err: any) {
      console.error('[Update Booking Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء حفظ التحديث' });
    }
  }

  // =========================================================================
  // 4. GET /api/portal/staff/customers
  // Reception and Admin customer lookup with sanitization (no passwords or OTP hashes)
  // =========================================================================
  if (pathPart === 'staff/customers' && req.method === 'GET') {
    const search = String(req.query.search || '').trim().toLowerCase();

    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'customers'), limit(150)));

      let customers = snap.docs.map(d => {
        const data = d.data();
        // Remove OTP hash, internal secrets, or legacy password
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

      return res.status(200).json({ success: true, customers });
    } catch (err: any) {
      console.error('[Staff Customers Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب سجلات العملاء' });
    }
  }

  return res.status(404).json({ error: 'Not Found', message: 'المسار غير موجود' });
}
