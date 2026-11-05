import { Request, Response } from 'express';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { hashPasswordScrypt, verifyPasswordScrypt, maskPassword } from '../src/lib/passwordSecurity';

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
          console.error('[Staff Auth Worker Auth Error]:', err.message);
        });
    }
    await authPromise;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
  return dbInstance;
}

// Master super admin credentials check
const MASTER_ADMIN = {
  username: 'DRFIX',
  password: process.env.MASTER_ADMIN_PASSWORD || '123123'
};

// Rate limiting for staff logins: IP -> { attempts, lockedUntil }
const staffLoginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

export default async function staffAuthHandler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawPath = req.path || req.url;
  const pathPart = rawPath.replace(/^\/api\/staff\/?/, '');
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

  // -------------------------------------------------------------
  // 1. POST /api/staff/login
  // -------------------------------------------------------------
  if (pathPart === 'login' && req.method === 'POST') {
    const attemptInfo = staffLoginAttempts.get(clientIp);
    if (attemptInfo && attemptInfo.lockedUntil > Date.now()) {
      const waitMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `تم قفل محاولات الدخول مؤقتاً. يرجى الانتظار ${waitMinutes} دقيقة.`
      });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();

    // Check Master Super Admin
    if (cleanUser.toUpperCase() === MASTER_ADMIN.username && cleanPass === MASTER_ADMIN.password) {
      staffLoginAttempts.delete(clientIp);
      return res.status(200).json({
        success: true,
        user: {
          id: 'master-super-admin',
          username: 'DRFIX',
          fullName: 'المدير العام (Master Admin)',
          role: 'super_admin',
          roleTitleAr: 'المدير العام',
          permissions: {
            canManageStaff: true,
            canEditRoles: true,
            canViewStaffNotes: true,
            canExportReports: true,
            canManageInventory: true,
            canViewFinancials: true,
            canDeleteRecords: true,
            canManageCoupons: true,
            accounting_admin: false // Super admin does NOT automatically get accounting_admin
          },
          isActive: true
        },
        staffPortalAuth: {
          email: 'staff-portal@drfix.repair',
          pass: 'DRFixStaffPortalSecure2026!#'
        }
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
      const userData = userDoc.data();

      // Verify password with scrypt and legacy support
      const { valid, needsUpgrade } = verifyPasswordScrypt(cleanPass, userData.password);

      if (!valid) {
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

      // Transparent upgrade of legacy plaintext to scrypt hash!
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

      // Update last login
      updateDoc(doc(db, 'staff', userDoc.id), {
        lastLogin: new Date().toISOString()
      }).catch(console.error);

      staffLoginAttempts.delete(clientIp);

      const safeUser = {
        id: userDoc.id,
        username: userData.username,
        fullName: userData.fullName || userData.username,
        phone: userData.phone || '',
        role: userData.role || 'staff',
        roleTitleAr: userData.roleTitleAr || '',
        permissions: userData.permissions || {},
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

  // -------------------------------------------------------------
  // 2. POST /api/staff/save (Create or update staff with secure scrypt)
  // -------------------------------------------------------------
  if (pathPart === 'save' && req.method === 'POST') {
    const { staffId, fullName, username, password, phone, role, roleTitleAr, permissions, isActive, notes, currentAdminRole } = req.body || {};

    if (!fullName || !username) {
      return res.status(400).json({ error: 'Validation Error', message: 'الاسم واسم المستخدم مطلوبان' });
    }

    // STRICT PRIVILEGE ESCALATION GUARD:
    // Only super_admin can assign or change accounting_admin
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

      // Hash password if provided
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

  // -------------------------------------------------------------
  // 3. GET /api/staff/list (Strictly sanitized: NO passwords, NO hashes, NO secrets)
  // -------------------------------------------------------------
  if ((pathPart === 'list' || pathPart === '') && req.method === 'GET') {
    try {
      const db = await getDb();
      const staffQuery = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(staffQuery);

      const staffList = snap.docs.map(d => {
        const data = d.data();
        // OMIT password, passwordUpgradedAt, and any sensitive auth hashes completely!
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

      return res.status(200).json({ success: true, staff: staffList });
    } catch (err: any) {
      console.error('[Staff List Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء جلب قائمة الموظفين' });
    }
  }

  // -------------------------------------------------------------
  // 4. POST /api/staff/delete (Secure deletion by super_admin or admin)
  // -------------------------------------------------------------
  if (pathPart === 'delete' && req.method === 'POST') {
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

  // -------------------------------------------------------------
  // 5. POST /api/staff/toggle-active
  // -------------------------------------------------------------
  if (pathPart === 'toggle-active' && req.method === 'POST') {
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

  return res.status(404).json({ error: 'Not Found', message: 'المسار غير موجود' });
}
