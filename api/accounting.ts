import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  AccountingServiceInvoice,
  AccountingVoucher,
  AccountingPurchase,
  AccountingExpense,
  CustomerFinancialAccount,
  AccountingAuditLog,
  FinancialSummaryReport,
  PurchaseCategory,
  ExpenseCategory,
  AccountingPaymentMethod
} from '../src/types/accounting';
import { hashPasswordScrypt, verifyPasswordScrypt } from '../src/lib/passwordSecurity';

// ==========================================================
// Firebase Client Initialization for Server-side Operations
// ==========================================================
const FIREBASE_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hr-system-2026',
  appId: '1:262129832067:web:dc1ddee9ef7ef29befcbb6',
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyCSHgY3CAhV7ZLDZL2GkIOZhmbD2pK0J7g',
  authDomain: 'hr-system-2026.firebaseapp.com',
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixremixdrfix-e1e9871e-7d4a-4013-91c4-cbaa38ac0601',
  storageBucket: 'hr-system-2026.firebasestorage.app',
  messagingSenderId: '262129832067'
};

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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
          console.error('[Accounting Engine Worker Auth Error]:', err.message);
        });
    }
    await authPromise;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
  return dbInstance;
}

// ==========================================================
// Security & Cryptographic Session Engine
// ==========================================================
const SESSION_SECRET = process.env.ACCOUNTING_SESSION_SECRET || 'drfix-internal-accounting-secret-key-2026-production';
const SESSION_COOKIE_NAME = 'drfix_acc_sess';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// In-memory brute force protection: IP -> { attempts, lockedUntil }
const loginAttemptsMap = new Map<string, { attempts: number; lockedUntil: number }>();

// In-memory idempotency cache: key -> { timestamp, response }
const idempotencyCache = new Map<string, { timestamp: number; response: any }>();

function createSignedSessionToken(user: { id: string; username: string; fullName: string; role: string; accounting_admin: boolean }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    ...user,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifySignedSessionToken(token: string): any | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check Cookie header
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

// Phone normalizer matching project standards
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

// Private attachments folder (strictly outside public directory)
function getSafeAccountingUploadDir(): string {
  const primaryDir = path.join(process.cwd(), 'storage', 'accounting_private');
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    return primaryDir;
  } catch {
    const fallbackDir = path.join('/tmp', 'drfix_storage', 'accounting_private');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getSafeAccountingUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `acc_${uniqueSuffix}${cleanExt.toLowerCase()}`);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('الملف غير مدعوم. المسموح فقط صور (JPG, PNG) ومستندات PDF'));
    }
  }
}).single('file');

// Helper to record immutable audit log in Firestore
async function recordAuditLog(log: Omit<AccountingAuditLog, 'id' | 'timestamp'>) {
  try {
    const db = await getDb();
    const id = `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const fullLog: AccountingAuditLog = {
      ...log,
      id,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'accounting_audit_logs', id), fullLog);
  } catch (err) {
    console.error('[Accounting Audit Log Error]:', err);
  }
}

// ==========================================================
// Main Request Handler
// ==========================================================
export default async function accountingHandler(req: Request, res: Response) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawPath = req.path || req.url;
  const pathPart = rawPath.replace(/^\/api\/accounting\/?/, '');
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

  // ---------------------------------------------------------
  // 1. PUBLIC AUTH ROUTE: POST /api/accounting/auth/login
  // ---------------------------------------------------------
  if (pathPart === 'auth/login' && req.method === 'POST') {
    // Brute force check
    const attemptInfo = loginAttemptsMap.get(clientIp);
    if (attemptInfo && attemptInfo.lockedUntil > Date.now()) {
      const waitMinutes = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار ${waitMinutes} دقيقة.`
      });
    }

    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();

    try {
      const db = await getDb();
      const staffQuery = query(collection(db, 'staff'), where('username', '==', cleanUser));
      const snap = await getDocs(staffQuery);

      if (snap.empty) {
        // Record failed attempt
        const curAttempts = (attemptInfo?.attempts || 0) + 1;
        loginAttemptsMap.set(clientIp, {
          attempts: curAttempts,
          lockedUntil: curAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0
        });
        return res.status(401).json({ error: 'Auth Failed', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }

      const userDoc = snap.docs[0];
      // Check password using scrypt with transparent legacy auto-upgrade
      const { valid, needsUpgrade } = verifyPasswordScrypt(cleanPass, userData.password);

      if (!valid) {
        const curAttempts = (attemptInfo?.attempts || 0) + 1;
        loginAttemptsMap.set(clientIp, {
          attempts: curAttempts,
          lockedUntil: curAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0
        });
        return res.status(401).json({ error: 'Auth Failed', message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }

      // Auto-upgrade legacy plaintext password to salted scrypt hash
      if (needsUpgrade) {
        try {
          const scryptHash = hashPasswordScrypt(cleanPass);
          await updateDoc(doc(db, 'staff', userDoc.id), {
            password: scryptHash,
            passwordUpgradedAt: new Date().toISOString()
          });
        } catch (upgradeErr) {
          console.error('[Accounting Auth] Failed to auto-upgrade password hash:', upgradeErr);
        }
      }

      // Check if account active
      if (userData.isActive === false) {
        return res.status(403).json({ error: 'Inactive', message: 'هذا الحساب معطل حالياً من قِبل إدارة النظام.' });
      }

      // Check technician block
      if (userData.role === 'technician') {
        return res.status(403).json({
          error: 'Technician Forbidden',
          message: 'عذراً، هذا الحساب مخصص للمهام الفنية والميدانية فقط ولا يملك صلاحية دخول المحاسبة.'
        });
      }

      // STRICT PERMISSION CHECK: Must have accounting_admin === true
      const hasAccountingAdmin = userData.permissions?.accounting_admin === true;
      if (!hasAccountingAdmin) {
        return res.status(403).json({
          error: 'Permission Denied',
          message: 'تم رفض الدخول: هذا الحساب لا يملك صلاحية مدير الحسابات المعتمد (accounting_admin). لا يتم التوريث التلقائي حتى للمدير العام.'
        });
      }

      // Clear failed attempts on success
      loginAttemptsMap.delete(clientIp);

      const sessionUser = {
        id: userDoc.id,
        username: userData.username || cleanUser,
        fullName: userData.fullName || 'مدير الحسابات',
        role: userData.role || 'staff',
        accounting_admin: true
      };

      const token = createSignedSessionToken(sessionUser);

      // Set HttpOnly, Secure, SameSite=Strict cookie
      res.setHeader('Set-Cookie', [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; HttpOnly; SameSite=Strict; Secure`
      ]);

      await recordAuditLog({
        action: 'LOGIN',
        targetType: 'auth',
        targetId: userDoc.id,
        performedBy: { id: userDoc.id, name: sessionUser.fullName, username: sessionUser.username },
        reason: 'تسجيل دخول ناجح لبوابة الحسابات'
      });

      return res.status(200).json({
        success: true,
        token,
        user: sessionUser
      });
    } catch (err: any) {
      console.error('[Accounting Login Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'حدث خطأ أثناء فحص بيانات الدخول' });
    }
  }

  // ---------------------------------------------------------
  // 2. LOGOUT ROUTE: POST /api/accounting/auth/logout
  // ---------------------------------------------------------
  if (pathPart === 'auth/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', [
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure`
    ]);
    return res.status(200).json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  }

  // ---------------------------------------------------------
  // 3. ATTACHMENT STREAMING PROXY: GET /api/accounting/attachments/:filename
  // ---------------------------------------------------------
  if (pathPart.startsWith('attachments/') && req.method === 'GET') {
    const token = extractToken(req);
    const session = verifySignedSessionToken(token || '');
    if (!session || !session.accounting_admin) {
      return res.status(403).json({ error: 'Forbidden', message: 'غير مصرح بعرض المرفقات المالية' });
    }

    const filename = pathPart.replace(/^attachments\//, '').replace(/[^a-zA-Z0-9._-]/g, '');
    const safeDir = getSafeAccountingUploadDir();
    const filePath = path.join(safeDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not Found', message: 'الملف غير موجود' });
    }

    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return res.sendFile(filePath);
  }

  // =========================================================
  // STRICT SESSION ENFORCEMENT FOR ALL OTHER ACCOUNTING ROUTES
  // =========================================================
  const token = extractToken(req);
  const session = verifySignedSessionToken(token || '');

  if (!session || !session.accounting_admin) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'جلسة الحسابات غير صالحة أو منتهية. يرجى تسجيل الدخول بحساب يحمل صلاحية accounting_admin.'
    });
  }

  // Current authenticated accounting user
  const currentUser = {
    id: session.id,
    fullName: session.fullName,
    username: session.username,
    role: session.role
  };

  // ---------------------------------------------------------
  // 4. GET /api/accounting/auth/me
  // ---------------------------------------------------------
  if (pathPart === 'auth/me' && req.method === 'GET') {
    return res.status(200).json({ success: true, user: session });
  }

  // ---------------------------------------------------------
  // 5. FILE UPLOAD: POST /api/accounting/upload
  // ---------------------------------------------------------
  if (pathPart === 'upload' && req.method === 'POST') {
    return uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: 'Upload Error', message: err.message || 'فشل رفع الملف' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No File', message: 'لم يتم اختيار ملف' });
      }
      const safeFilename = path.basename(req.file.path);
      const accessUrl = `/api/accounting/attachments/${safeFilename}`;
      return res.status(200).json({
        success: true,
        filename: safeFilename,
        url: accessUrl
      });
    });
  }

  // ---------------------------------------------------------
  // 6. CUSTOMER SEARCH: GET /api/accounting/customers/search?q=...
  // ---------------------------------------------------------
  if (pathPart.startsWith('customers/search') && req.method === 'GET') {
    const qParam = String(req.query.q || '').trim();
    if (!qParam) {
      return res.status(200).json({ success: true, customers: [] });
    }

    try {
      const db = await getDb();
      const cleanPhone = unifySaudiPhone(qParam);

      // Search in customers collection
      const snap = await getDocs(query(collection(db, 'customers'), limit(150)));
      const results: any[] = [];

      for (const d of snap.docs) {
        const cData = d.data();
        const p1 = unifySaudiPhone(cData.phone || '');
        const p2 = unifySaudiPhone(cData.customerPhone || '');
        const name = (cData.name || '').toLowerCase();
        const qLower = qParam.toLowerCase();

        const matchPhone = cleanPhone && (p1.includes(cleanPhone) || p2.includes(cleanPhone));
        const matchName = name.includes(qLower);

        if (matchPhone || matchName) {
          // Fetch financial account if exists
          let balance = 0;
          try {
            const fDoc = await getDoc(doc(db, 'customer_financial_accounts', `cfa_${d.id}`));
            if (fDoc.exists()) {
              balance = fDoc.data().currentBalance || 0;
            }
          } catch {}

          results.push({
            id: d.id,
            name: cData.name || 'عميل غير مسجل الاسم',
            phone: cData.phone || cData.customerPhone || '',
            cars: cData.cars || [],
            currentBalance: balance
          });

          if (results.length >= 20) break;
        }
      }

      return res.status(200).json({ success: true, customers: results });
    } catch (err: any) {
      console.error('[Accounting Customer Search Error]:', err);
      return res.status(500).json({ error: 'Search Error', message: 'فشل البحث عن العميل' });
    }
  }

  // ---------------------------------------------------------
  // 7. GET CUSTOMER FINANCIAL FILE: GET /api/accounting/customers/:id
  // ---------------------------------------------------------
  if (pathPart.startsWith('customers/') && !pathPart.includes('/') && req.method === 'GET') {
    const customerId = pathPart.replace('customers/', '');
    try {
      const db = await getDb();
      const custDoc = await getDoc(doc(db, 'customers', customerId));
      if (!custDoc.exists()) {
        return res.status(404).json({ error: 'Not Found', message: 'العميل غير موجود' });
      }

      const cData = custDoc.data();
      const financialAccRef = doc(db, 'customer_financial_accounts', `cfa_${customerId}`);
      const fSnap = await getDoc(financialAccRef);

      let financialAccount: CustomerFinancialAccount;
      if (fSnap.exists()) {
        financialAccount = fSnap.data() as CustomerFinancialAccount;
      } else {
        // Initialize clean record
        financialAccount = {
          id: `cfa_${customerId}`,
          customerId,
          customerName: cData.name || 'عميل',
          primaryPhone: unifySaudiPhone(cData.phone || cData.customerPhone || ''),
          phoneHistory: [unifySaudiPhone(cData.phone || cData.customerPhone || '')].filter(Boolean),
          currentBalance: 0,
          totalBilled: 0,
          totalPaid: 0,
          linkedBookingIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(financialAccRef, financialAccount);
      }

      // Fetch customer's service invoices
      const invQuery = query(
        collection(db, 'accounting_services'),
        where('customerId', '==', customerId)
      );
      const invSnap = await getDocs(invQuery);
      const invoices = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch customer's vouchers
      const vchQuery = query(
        collection(db, 'accounting_vouchers'),
        where('customerId', '==', customerId)
      );
      const vchSnap = await getDocs(vchQuery);
      const vouchers = vchSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      return res.status(200).json({
        success: true,
        customer: { id: custDoc.id, ...cData },
        financialAccount,
        invoices,
        vouchers
      });
    } catch (err: any) {
      console.error('[Customer Financial Account Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل استرجاع الملف المالي للعميل' });
    }
  }

  // ---------------------------------------------------------
  // 8. CREATE SERVICE INVOICE: POST /api/accounting/services/create
  // ---------------------------------------------------------
  if (pathPart === 'services/create' && req.method === 'POST') {
    const {
      customerId,
      customerName,
      customerPhone,
      maintenanceId,
      carInfo,
      items,
      discountAmount,
      discountReason,
      vatRate = 0.15,
      initialVoucher // optional immediate payment voucher { amount, paymentMethod, bankReference }
    } = req.body || {};

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'بيانات العميل وقائمة بنود الخدمة مطلوبة' });
    }

    const discountVal = Number(discountAmount) || 0;
    // MANDATORY DISCOUNT REASON ENFORCEMENT
    if (discountVal > 0) {
      if (!discountReason || typeof discountReason !== 'string' || discountReason.trim().length < 3) {
        return res.status(400).json({
          error: 'Discount Reason Required',
          message: 'سبب الخصم إلزامي عند إدخال أي مبلغ خصم. يجب توثيق سبب واضح في السجل الرقابي.'
        });
      }
    }

    try {
      const db = await getDb();

      // Calculate items
      let subtotal = 0;
      const formattedItems = items.map((it: any, idx: number) => {
        const q = Math.max(1, Number(it.quantity) || 1);
        const p = Math.max(0, Number(it.unitPrice) || 0);
        const lineTot = Number((q * p).toFixed(2));
        subtotal += lineTot;
        return {
          id: it.id || `item_${idx + 1}`,
          description: String(it.description || '').trim() || 'خدمة صيانة',
          quantity: q,
          unitPrice: p,
          totalPrice: lineTot
        };
      });

      subtotal = Number(subtotal.toFixed(2));
      const cleanDiscount = Math.min(discountVal, subtotal);
      const taxableAmount = Number(Math.max(0, subtotal - cleanDiscount).toFixed(2));
      const rate = Number(vatRate) >= 0 ? Number(vatRate) : 0.15;
      const vatAmount = Number((taxableAmount * rate).toFixed(2));
      const grandTotal = Number((taxableAmount + vatAmount).toFixed(2));

      const invoiceId = `srv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const invoiceNumber = `DRF-INV-${Math.floor(1000 + Math.random() * 9000)}`;

      // Handle optional immediate payment
      let initialPaid = 0;
      let initialVoucherDoc: AccountingVoucher | null = null;
      if (initialVoucher && Number(initialVoucher.amount) > 0) {
        const payAmount = Math.min(Number(initialVoucher.amount), grandTotal);
        initialPaid = Number(payAmount.toFixed(2));

        const validMethods: AccountingPaymentMethod[] = ['cash', 'card', 'bank_transfer'];
        const method: AccountingPaymentMethod = validMethods.includes(initialVoucher.paymentMethod)
          ? initialVoucher.paymentMethod
          : 'cash';

        const voucherId = `vch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        initialVoucherDoc = {
          id: voucherId,
          voucherNumber: `DRF-RCT-${Math.floor(1000 + Math.random() * 9000)}`,
          voucherType: 'receipt',
          serviceInvoiceId: invoiceId,
          financialAccountId: `cfa_${customerId}`,
          customerId,
          customerName: String(customerName || '').trim(),
          customerPhone: unifySaudiPhone(customerPhone || ''),
          amount: initialPaid,
          paymentMethod: method,
          bankReference: initialVoucher.bankReference || '',
          notes: 'دفعة مبدئية عند إصدار الفاتورة',
          status: 'active',
          recordedByStaffId: currentUser.id,
          recordedByStaffName: currentUser.fullName,
          createdAt: new Date().toISOString()
        };
      }

      const remainingBalance = Number((grandTotal - initialPaid).toFixed(2));
      const status = remainingBalance <= 0 ? 'paid' : (initialPaid > 0 ? 'partially_paid' : 'issued');

      const invoice: AccountingServiceInvoice = {
        id: invoiceId,
        invoiceNumber,
        financialAccountId: `cfa_${customerId}`,
        customerId,
        customerName: String(customerName || '').trim(),
        customerPhone: unifySaudiPhone(customerPhone || ''),
        maintenanceId: maintenanceId || undefined,
        carInfo: carInfo || undefined,
        items: formattedItems,
        subtotal,
        discountAmount: cleanDiscount,
        discountReason: cleanDiscount > 0 ? discountReason.trim() : undefined,
        amountAfterDiscount: taxableAmount,
        vatRate: rate,
        vatAmount,
        grandTotal,
        paidAmount: initialPaid,
        remainingBalance,
        status,
        createdByStaffId: currentUser.id,
        createdByStaffName: currentUser.fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save invoice
      await setDoc(doc(db, 'accounting_services', invoiceId), invoice);

      // Save voucher if created
      if (initialVoucherDoc) {
        await setDoc(doc(db, 'accounting_vouchers', initialVoucherDoc.id), initialVoucherDoc);
      }

      // Update customer financial account
      const cfaRef = doc(db, 'customer_financial_accounts', `cfa_${customerId}`);
      const cfaSnap = await getDoc(cfaRef);
      if (cfaSnap.exists()) {
        const curCfa = cfaSnap.data();
        const newBalance = Number(((curCfa.currentBalance || 0) + remainingBalance).toFixed(2));
        const newBilled = Number(((curCfa.totalBilled || 0) + grandTotal).toFixed(2));
        const newPaid = Number(((curCfa.totalPaid || 0) + initialPaid).toFixed(2));
        const bookingIds = curCfa.linkedBookingIds || [];
        if (maintenanceId && !bookingIds.includes(maintenanceId)) {
          bookingIds.push(maintenanceId);
        }

        await updateDoc(cfaRef, {
          currentBalance: newBalance,
          totalBilled: newBilled,
          totalPaid: newPaid,
          linkedBookingIds: bookingIds,
          updatedAt: new Date().toISOString()
        });
      }

      // Audit log
      await recordAuditLog({
        action: 'CREATE_INVOICE',
        targetType: 'service',
        targetId: invoiceId,
        performedBy: { id: currentUser.id, name: currentUser.fullName, username: currentUser.username },
        reason: cleanDiscount > 0 ? `إصدار فاتورة بخفض: ${discountReason.trim()}` : 'إصدار فاتورة صيانة جديدة',
        newValue: { invoiceNumber, grandTotal, initialPaid, remainingBalance }
      });

      return res.status(200).json({ success: true, invoice, voucher: initialVoucherDoc });
    } catch (err: any) {
      console.error('[Create Service Invoice Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل حفظ فاتورة الخدمة' });
    }
  }

  // ---------------------------------------------------------
  // 9. RECORD VOUCHER / PAYMENT / REFUND: POST /api/accounting/vouchers/create
  // ---------------------------------------------------------
  if (pathPart === 'vouchers/create' && req.method === 'POST') {
    const {
      serviceInvoiceId,
      customerId,
      voucherType = 'receipt', // 'receipt' or 'refund'
      amount,
      paymentMethod = 'cash',
      bankReference,
      notes,
      reason
    } = req.body || {};

    const rawAmount = Number(amount) || 0;
    if (!customerId || rawAmount <= 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'العميل والمبلغ مطلوبان ويجب أن يكون أكبر من صفر' });
    }

    if (voucherType === 'refund' && (!reason || reason.trim().length < 3)) {
      return res.status(400).json({ error: 'Reason Required', message: 'سبب الاسترجاع إلزامي ومطلوب لتوثيقه في السجل الرقابي' });
    }

    const validMethods: AccountingPaymentMethod[] = ['cash', 'card', 'bank_transfer'];
    const method: AccountingPaymentMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

    try {
      const db = await getDb();
      let invoiceData: AccountingServiceInvoice | null = null;
      let invoiceRef: any = null;

      if (serviceInvoiceId) {
        invoiceRef = doc(db, 'accounting_services', serviceInvoiceId);
        const invSnap = await getDoc(invoiceRef);
        if (invSnap.exists()) {
          invoiceData = invSnap.data() as AccountingServiceInvoice;
        }
      }

      const voucherId = `vch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const prefix = voucherType === 'refund' ? 'DRF-RFD' : 'DRF-RCT';
      const voucherNumber = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const voucherDoc: AccountingVoucher = {
        id: voucherId,
        voucherNumber,
        voucherType: voucherType === 'refund' ? 'refund' : 'receipt',
        serviceInvoiceId: serviceInvoiceId || undefined,
        financialAccountId: `cfa_${customerId}`,
        customerId,
        customerName: invoiceData?.customerName || 'عميل',
        customerPhone: invoiceData?.customerPhone || '',
        amount: Number(rawAmount.toFixed(2)),
        paymentMethod: method,
        bankReference: bankReference || undefined,
        notes: notes || (voucherType === 'refund' ? `استرجاع: ${reason}` : 'دفعة سداد'),
        status: 'active',
        recordedByStaffId: currentUser.id,
        recordedByStaffName: currentUser.fullName,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'accounting_vouchers', voucherId), voucherDoc);

      // Update invoice if linked
      if (invoiceData && invoiceRef) {
        let newPaid = invoiceData.paidAmount || 0;
        if (voucherType === 'receipt') {
          newPaid += rawAmount;
        } else if (voucherType === 'refund') {
          newPaid = Math.max(0, newPaid - rawAmount);
        }
        newPaid = Number(newPaid.toFixed(2));
        const newRemaining = Number(Math.max(0, (invoiceData.grandTotal || 0) - newPaid).toFixed(2));
        const newStatus = newRemaining <= 0 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'issued');

        await updateDoc(invoiceRef, {
          paidAmount: newPaid,
          remainingBalance: newRemaining,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      }

      // Update customer financial account
      const cfaRef = doc(db, 'customer_financial_accounts', `cfa_${customerId}`);
      const cfaSnap = await getDoc(cfaRef);
      if (cfaSnap.exists()) {
        const cur = cfaSnap.data();
        let balanceDelta = 0;
        let paidDelta = 0;

        if (voucherType === 'receipt') {
          balanceDelta = -rawAmount; // Reduces debt
          paidDelta = rawAmount;
        } else if (voucherType === 'refund') {
          balanceDelta = rawAmount; // Increases debt / reduces credit
          paidDelta = -rawAmount;
        }

        const updatedBalance = Number(((cur.currentBalance || 0) + balanceDelta).toFixed(2));
        const updatedPaid = Number(Math.max(0, (cur.totalPaid || 0) + paidDelta).toFixed(2));

        await updateDoc(cfaRef, {
          currentBalance: updatedBalance,
          totalPaid: updatedPaid,
          updatedAt: new Date().toISOString()
        });
      }

      await recordAuditLog({
        action: voucherType === 'refund' ? 'RECORD_REFUND' : 'RECORD_PAYMENT',
        targetType: 'voucher',
        targetId: voucherId,
        performedBy: { id: currentUser.id, name: currentUser.fullName, username: currentUser.username },
        reason: reason || (voucherType === 'refund' ? 'استرجاع دفعة' : 'تسجيل سند قبض'),
        newValue: { voucherNumber, amount: rawAmount, paymentMethod: method, serviceInvoiceId }
      });

      return res.status(200).json({ success: true, voucher: voucherDoc });
    } catch (err: any) {
      console.error('[Create Voucher Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل تسجيل السند المالي' });
    }
  }

  // ---------------------------------------------------------
  // 10. CANCEL SERVICE INVOICE: POST /api/accounting/services/:id/cancel
  // ---------------------------------------------------------
  if (pathPart.startsWith('services/') && pathPart.endsWith('/cancel') && req.method === 'POST') {
    const invoiceId = pathPart.replace('services/', '').replace('/cancel', '');
    const { reason } = req.body || {};
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Reason Required', message: 'سبب إلغاء الفاتورة إلزامي لتوثيقه في السجل الرقابي' });
    }

    try {
      const db = await getDb();
      const invRef = doc(db, 'accounting_services', invoiceId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) {
        return res.status(404).json({ error: 'Not Found', message: 'الفاتورة غير موجودة' });
      }

      const inv = invSnap.data() as AccountingServiceInvoice;
      if (inv.status === 'cancelled') {
        return res.status(400).json({ error: 'Already Cancelled', message: 'الفاتورة ملغاة مسبقاً' });
      }

      // Reverse invoice effect on customer financial account
      const cfaRef = doc(db, 'customer_financial_accounts', inv.financialAccountId);
      const cfaSnap = await getDoc(cfaRef);
      if (cfaSnap.exists()) {
        const cur = cfaSnap.data();
        const unbilledBalance = Number(((cur.currentBalance || 0) - (inv.remainingBalance || 0)).toFixed(2));
        const unbilledTotal = Number(((cur.totalBilled || 0) - (inv.grandTotal || 0)).toFixed(2));
        await updateDoc(cfaRef, {
          currentBalance: unbilledBalance,
          totalBilled: unbilledTotal,
          updatedAt: new Date().toISOString()
        });
      }

      await updateDoc(invRef, {
        status: 'cancelled',
        cancellationReason: reason.trim(),
        updatedAt: new Date().toISOString()
      });

      await recordAuditLog({
        action: 'CANCEL_INVOICE',
        targetType: 'service',
        targetId: invoiceId,
        performedBy: { id: currentUser.id, name: currentUser.fullName, username: currentUser.username },
        reason: reason.trim(),
        oldValue: { status: inv.status },
        newValue: { status: 'cancelled' }
      });

      return res.status(200).json({ success: true, message: 'تم إلغاء الفاتورة وتوثيق السبب في السجل الرقابي' });
    } catch (err: any) {
      console.error('[Cancel Invoice Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل إلغاء الفاتورة' });
    }
  }

  // ---------------------------------------------------------
  // 11. PURCHASES LIST & CREATE: GET/POST /api/accounting/purchases
  // ---------------------------------------------------------
  if (pathPart === 'purchases' && req.method === 'GET') {
    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'accounting_purchases'), limit(150)));
      const purchases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ success: true, purchases });
    } catch (err: any) {
      console.error('[Purchases List Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل جلب قائمة المشتريات' });
    }
  }

  if (pathPart === 'purchases/create' && req.method === 'POST') {
    const {
      category = 'spare_parts',
      itemName,
      itemDescription,
      quantity = 1,
      unitPrice,
      isTaxable = true,
      vatRate = 0.15,
      supplierName,
      supplierInvoiceNumber,
      paymentMethod = 'card',
      receiptAttachmentUrl,
      maintenanceId,
      notes,
      purchaseDate = new Date().toISOString().split('T')[0]
    } = req.body || {};

    if (!itemName || Number(unitPrice) < 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'اسم المادة أو القطعة وسعر الوحدة مطلوبان' });
    }

    const q = Math.max(1, Number(quantity) || 1);
    const p = Math.max(0, Number(unitPrice) || 0);
    const subtotal = Number((q * p).toFixed(2));
    const rate = isTaxable ? Number(vatRate || 0.15) : 0;
    const vatAmount = isTaxable ? Number((subtotal * rate).toFixed(2)) : 0;
    const finalTotal = Number((subtotal + vatAmount).toFixed(2));

    const validCategories: PurchaseCategory[] = ['spare_parts', 'oils_fluids', 'tools_equipment', 'operating_supplies', 'other'];
    const cat: PurchaseCategory = validCategories.includes(category) ? category : 'other';

    const validMethods: AccountingPaymentMethod[] = ['cash', 'card', 'bank_transfer'];
    const method: AccountingPaymentMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'card';

    const purchaseId = `pur_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const purchaseNumber = `DRF-PUR-${Math.floor(1000 + Math.random() * 9000)}`;

    const purchaseDoc: AccountingPurchase = {
      id: purchaseId,
      purchaseNumber,
      category: cat,
      itemName: String(itemName).trim(),
      itemDescription: itemDescription ? String(itemDescription).trim() : undefined,
      quantity: q,
      unitPrice: p,
      subtotal,
      isTaxable: Boolean(isTaxable),
      vatRate: rate,
      vatAmount,
      finalTotal,
      supplierName: String(supplierName || 'مورد عام').trim(),
      supplierInvoiceNumber: String(supplierInvoiceNumber || 'بدون رقم').trim(),
      paymentMethod: method,
      receiptAttachmentUrl: receiptAttachmentUrl || undefined,
      maintenanceId: maintenanceId || undefined,
      notes: notes || undefined,
      paymentStatus: 'paid',
      status: 'active',
      recordedByStaffId: currentUser.id,
      recordedByStaffName: currentUser.fullName,
      purchaseDate,
      createdAt: new Date().toISOString()
    };

    try {
      const db = await getDb();
      await setDoc(doc(db, 'accounting_purchases', purchaseId), purchaseDoc);

      await recordAuditLog({
        action: 'CREATE_PURCHASE',
        targetType: 'purchase',
        targetId: purchaseId,
        performedBy: { id: currentUser.id, name: currentUser.fullName, username: currentUser.username },
        newValue: { purchaseNumber, itemName, finalTotal, category: cat, supplierName }
      });

      return res.status(200).json({ success: true, purchase: purchaseDoc });
    } catch (err: any) {
      console.error('[Create Purchase Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل حفظ عملية الشراء' });
    }
  }

  // ---------------------------------------------------------
  // 12. EXPENSES LIST & CREATE: GET/POST /api/accounting/expenses
  // ---------------------------------------------------------
  if (pathPart === 'expenses' && req.method === 'GET') {
    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'accounting_expenses'), limit(150)));
      const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ success: true, expenses });
    } catch (err: any) {
      console.error('[Expenses List Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل جلب قائمة المصروفات' });
    }
  }

  if (pathPart === 'expenses/create' && req.method === 'POST') {
    const {
      category = 'other',
      title,
      amountBeforeVat,
      isTaxable = false,
      vatRate = 0.15,
      paymentMethod = 'cash',
      payeeOrVendor,
      receiptAttachmentUrl,
      notes,
      expenseDate = new Date().toISOString().split('T')[0]
    } = req.body || {};

    const rawSubtotal = Math.max(0, Number(amountBeforeVat) || 0);
    if (!title || rawSubtotal <= 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'عنوان المصروف والمبلغ مطلوبان' });
    }

    const rate = isTaxable ? Number(vatRate || 0.15) : 0;
    const vatAmount = isTaxable ? Number((rawSubtotal * rate).toFixed(2)) : 0;
    const totalAmount = Number((rawSubtotal + vatAmount).toFixed(2));

    const validCategories: ExpenseCategory[] = [
      'salaries', 'rent', 'fuel_transportation', 'maintenance', 'telecom',
      'marketing', 'government_fees', 'software_subscriptions', 'admin_expenses', 'other'
    ];
    const cat: ExpenseCategory = validCategories.includes(category) ? category : 'other';

    const validMethods: AccountingPaymentMethod[] = ['cash', 'card', 'bank_transfer'];
    const method: AccountingPaymentMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';

    const expenseId = `exp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const expenseNumber = `DRF-EXP-${Math.floor(1000 + Math.random() * 9000)}`;

    const expenseDoc: AccountingExpense = {
      id: expenseId,
      expenseNumber,
      category: cat,
      title: String(title).trim(),
      amountBeforeVat: rawSubtotal,
      isTaxable: Boolean(isTaxable),
      vatRate: rate,
      vatAmount,
      totalAmount,
      paymentMethod: method,
      payeeOrVendor: String(payeeOrVendor || 'جهة الصرف').trim(),
      receiptAttachmentUrl: receiptAttachmentUrl || undefined,
      notes: notes || undefined,
      expenseDate,
      paymentStatus: 'paid',
      status: 'active',
      approvedByStaffId: currentUser.id,
      approvedByStaffName: currentUser.fullName,
      createdAt: new Date().toISOString()
    };

    try {
      const db = await getDb();
      await setDoc(doc(db, 'accounting_expenses', expenseId), expenseDoc);

      await recordAuditLog({
        action: 'CREATE_EXPENSE',
        targetType: 'expense',
        targetId: expenseId,
        performedBy: { id: currentUser.id, name: currentUser.fullName, username: currentUser.username },
        newValue: { expenseNumber, title, totalAmount, category: cat }
      });

      return res.status(200).json({ success: true, expense: expenseDoc });
    } catch (err: any) {
      console.error('[Create Expense Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل حفظ المصروف' });
    }
  }

  // ---------------------------------------------------------
  // 13. COMPREHENSIVE FINANCIAL REPORTS & CASH FLOW: GET /api/accounting/reports/summary
  // ---------------------------------------------------------
  if (pathPart.startsWith('reports/summary') && req.method === 'GET') {
    const fromDate = String(req.query.from || '');
    const toDate = String(req.query.to || '');

    try {
      const db = await getDb();

      // Fetch active services
      const srvSnap = await getDocs(query(collection(db, 'accounting_services'), limit(300)));
      let services = srvSnap.docs.map(d => d.data() as AccountingServiceInvoice);
      // Exclude cancelled invoices
      services = services.filter(s => s.status !== 'cancelled');

      // Fetch active vouchers
      const vchSnap = await getDocs(query(collection(db, 'accounting_vouchers'), limit(500)));
      let vouchers = vchSnap.docs.map(d => d.data() as AccountingVoucher);
      vouchers = vouchers.filter(v => v.status !== 'cancelled');

      // Fetch active purchases
      const purSnap = await getDocs(query(collection(db, 'accounting_purchases'), limit(300)));
      let purchases = purSnap.docs.map(d => d.data() as AccountingPurchase);
      purchases = purchases.filter(p => p.status !== 'cancelled');

      // Fetch active expenses
      const expSnap = await getDocs(query(collection(db, 'accounting_expenses'), limit(300)));
      let expenses = expSnap.docs.map(d => d.data() as AccountingExpense);
      expenses = expenses.filter(e => e.status !== 'cancelled');

      // Apply date filters if provided (based on ISO date prefix YYYY-MM-DD)
      if (fromDate) {
        services = services.filter(s => s.createdAt.substring(0, 10) >= fromDate);
        vouchers = vouchers.filter(v => v.createdAt.substring(0, 10) >= fromDate);
        purchases = purchases.filter(p => (p.purchaseDate || p.createdAt.substring(0, 10)) >= fromDate);
        expenses = expenses.filter(e => (e.expenseDate || e.createdAt.substring(0, 10)) >= fromDate);
      }
      if (toDate) {
        services = services.filter(s => s.createdAt.substring(0, 10) <= toDate);
        vouchers = vouchers.filter(v => v.createdAt.substring(0, 10) <= toDate);
        purchases = purchases.filter(p => (p.purchaseDate || p.createdAt.substring(0, 10)) <= toDate);
        expenses = expenses.filter(e => (e.expenseDate || e.createdAt.substring(0, 10)) <= toDate);
      }

      // Calculations
      let totalSubtotal = 0;
      let totalDiscounts = 0;
      let totalVat = 0;
      let totalInvoiced = 0;
      let totalOutstanding = 0;

      for (const s of services) {
        totalSubtotal += s.subtotal || 0;
        totalDiscounts += s.discountAmount || 0;
        totalVat += s.vatAmount || 0;
        totalInvoiced += s.grandTotal || 0;
        totalOutstanding += s.remainingBalance || 0;
      }

      let cashAmount = 0;
      let cardAmount = 0;
      let bankTransferAmount = 0;
      let refundsAmount = 0;

      for (const v of vouchers) {
        if (v.voucherType === 'refund') {
          refundsAmount += v.amount || 0;
          if (v.paymentMethod === 'cash') cashAmount -= v.amount || 0;
          else if (v.paymentMethod === 'card') cardAmount -= v.amount || 0;
          else if (v.paymentMethod === 'bank_transfer') bankTransferAmount -= v.amount || 0;
        } else {
          if (v.paymentMethod === 'cash') cashAmount += v.amount || 0;
          else if (v.paymentMethod === 'card') cardAmount += v.amount || 0;
          else if (v.paymentMethod === 'bank_transfer') bankTransferAmount += v.amount || 0;
        }
      }

      const totalCollected = Number((cashAmount + cardAmount + bankTransferAmount).toFixed(2));

      // Purchases calculations
      let totalPurchases = 0;
      const purchasesByCategory: Record<PurchaseCategory, number> = {
        spare_parts: 0,
        oils_fluids: 0,
        tools_equipment: 0,
        operating_supplies: 0,
        other: 0
      };

      for (const p of purchases) {
        const amt = p.finalTotal || 0;
        totalPurchases += amt;
        if (purchasesByCategory[p.category] !== undefined) {
          purchasesByCategory[p.category] += amt;
        } else {
          purchasesByCategory.other += amt;
        }
      }

      // Expenses calculations
      let totalExpenses = 0;
      const expensesByCategory: Record<ExpenseCategory, number> = {
        salaries: 0,
        rent: 0,
        fuel_transportation: 0,
        maintenance: 0,
        telecom: 0,
        marketing: 0,
        government_fees: 0,
        software_subscriptions: 0,
        admin_expenses: 0,
        other: 0
      };

      for (const e of expenses) {
        const amt = e.totalAmount || 0;
        totalExpenses += amt;
        if (expensesByCategory[e.category] !== undefined) {
          expensesByCategory[e.category] += amt;
        } else {
          expensesByCategory.other += amt;
        }
      }

      const netCashMovement = Number((totalCollected - totalPurchases - totalExpenses).toFixed(2));

      const report: FinancialSummaryReport = {
        period: {
          from: fromDate || 'بداية السجلات',
          to: toDate || 'اليوم',
          label: fromDate && toDate ? `${fromDate} إلى ${toDate}` : 'كامل الفترة'
        },
        services: {
          totalSubtotal: Number(totalSubtotal.toFixed(2)),
          totalDiscounts: Number(totalDiscounts.toFixed(2)),
          totalVat: Number(totalVat.toFixed(2)),
          totalInvoiced: Number(totalInvoiced.toFixed(2)),
          invoiceCount: services.length
        },
        collections: {
          totalCollected,
          cashAmount: Number(cashAmount.toFixed(2)),
          cardAmount: Number(cardAmount.toFixed(2)),
          bankTransferAmount: Number(bankTransferAmount.toFixed(2)),
          refundsAmount: Number(refundsAmount.toFixed(2)),
          vouchersCount: vouchers.length
        },
        receivables: {
          totalOutstanding: Number(totalOutstanding.toFixed(2))
        },
        purchases: {
          totalPurchases: Number(totalPurchases.toFixed(2)),
          byCategory: purchasesByCategory,
          purchasesCount: purchases.length
        },
        expenses: {
          totalExpenses: Number(totalExpenses.toFixed(2)),
          byCategory: expensesByCategory,
          expensesCount: expenses.length
        },
        cashFlow: {
          netCashMovement
        }
      };

      return res.status(200).json({ success: true, report });
    } catch (err: any) {
      console.error('[Accounting Reports Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل استخراج التقرير المالي' });
    }
  }

  // ---------------------------------------------------------
  // 14. AUDIT LOGS LIST: GET /api/accounting/audit-logs
  // ---------------------------------------------------------
  if (pathPart === 'audit-logs' && req.method === 'GET') {
    try {
      const db = await getDb();
      const snap = await getDocs(query(collection(db, 'accounting_audit_logs'), limit(100)));
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort newest first
      logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return res.status(200).json({ success: true, logs });
    } catch (err: any) {
      console.error('[Audit Logs List Error]:', err);
      return res.status(500).json({ error: 'Server Error', message: 'فشل جلب سجل الرقابة' });
    }
  }

  // ---------------------------------------------------------
  // 15. DEFAULT STATUS ROUTE
  // ---------------------------------------------------------
  return res.status(200).json({
    status: 'ok',
    service: 'DR.FIX Internal Accounting & RBAC Engine',
    authenticatedAs: currentUser.username,
    timestamp: new Date().toISOString()
  });
}
