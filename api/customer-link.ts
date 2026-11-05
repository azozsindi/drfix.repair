import { Request, Response } from 'express';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

const DEFAULT_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
const DEFAULT_ADMIN_ID = '867105778';

const FIREBASE_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hr-system-2026',
  appId: '1:262129832067:web:dc1ddee9ef7ef29befcbb6',
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyCSHgY3CAhV7ZLDZL2GkIOZhmbD2pK0J7g',
  authDomain: 'hr-system-2026.firebaseapp.com',
  firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixremixdrfix-e1e9871e-7d4a-4013-91c4-cbaa38ac0601',
  storageBucket: 'hr-system-2026.firebasestorage.app',
  messagingSenderId: '262129832067'
};

function getDb() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
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

export default async function customerLinkHandler(req: Request, res: Response) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Role, X-Admin-Name, X-Admin-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.path.replace(/^\/api\/customer-link\/?/, '') || (req.query.action as string) || '';
  const db = getDb();

  try {
    // -------------------------------------------------------------
    // ACTION: REQUEST LINK (طلب توثيق وربط الحساب برقم هاتف مسجل)
    // -------------------------------------------------------------
    if (action === 'request' || action === '/request') {
      const { phone, googleUid, email, name, photoURL } = req.body || {};
      const cleanPhone = unifySaudiPhone(phone);

      if (!cleanPhone || !cleanPhone.startsWith('05') || cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05' });
      }

      if (!googleUid) {
        return res.status(400).json({ success: false, error: 'بيانات حساب Google غير متوفرة' });
      }

      // Check if existing customer exists by direct ID or phone field
      let targetDocId = cleanPhone;
      let existingData: any = null;

      const directDoc = await getDoc(doc(db, 'customers', cleanPhone));
      if (directDoc.exists()) {
        targetDocId = directDoc.id;
        existingData = directDoc.data();
      } else {
        const qPhone = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
        const snap = await getDocs(qPhone);
        if (!snap.empty) {
          targetDocId = snap.docs[0].id;
          existingData = snap.docs[0].data();
        }
      }

      // Case A: No existing record found -> New customer
      if (!existingData) {
        return res.json({ success: true, exists: false });
      }

      // Case B: Already linked to a DIFFERENT Google account
      if (existingData.googleUid && existingData.googleUid !== googleUid) {
        return res.status(409).json({
          success: false,
          error: 'رقم الجوال هذا موثق ومرتبط مسبقاً بحساب Google آخر. لحماية الحسابات لا يمكن ربط نفس الرقم بحسابين مختلفين. يرجى تسجيل الدخول بحسابك الأصلي أو التواصل مع الإدارة.'
        });
      }

      // Case C: Already linked to THIS Google account
      if (existingData.googleUid === googleUid) {
        return res.json({ success: true, exists: true, alreadyLinked: true, customerId: targetDocId });
      }

      // Case D: Check if temporarily locked out (Max failed attempts protection)
      if (existingData.blockedUntil && Date.now() < existingData.blockedUntil) {
        const remainingMinutes = Math.max(1, Math.ceil((existingData.blockedUntil - Date.now()) / 60000));
        return res.status(429).json({
          success: false,
          blocked: true,
          error: `الرقم مجمد مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة أو التواصل مع الإدارة عبر الواتساب.`
        });
      }

      // Case E: Check 60-second cooldown timer between requests
      if (existingData.lastOtpRequestAt && Date.now() - existingData.lastOtpRequestAt < 60000) {
        const remainingSeconds = Math.max(1, Math.ceil((60000 - (Date.now() - existingData.lastOtpRequestAt)) / 1000));
        return res.status(429).json({
          success: false,
          cooldown: true,
          remainingSeconds,
          error: `يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة إرسال طلب جديد.`
        });
      }

      // Generate Cryptographically Secure 4-digit OTP using crypto.randomInt
      const secureOtp = crypto.randomInt(1000, 10000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

      // Hash OTP with SHA-256 and Google UID salt so OTP is NEVER stored in plaintext in Firestore
      const codeHash = crypto.createHash('sha256').update(secureOtp + ':' + googleUid).digest('hex');

      // Update Firestore document with security metadata ONLY (never plaintext code)
      await updateDoc(doc(db, 'customers', targetDocId), {
        linkVerificationCodeHash: codeHash,
        linkVerificationExpiresAt: expiresAt,
        linkVerificationStatus: 'pending',
        failedOtpAttempts: 0,
        lastOtpRequestAt: Date.now(),
        pendingLinkGoogleUid: googleUid,
        pendingLinkEmail: email || '',
        pendingLinkName: name || '',
        pendingLinkPhoto: photoURL || null,
        updatedAt: new Date().toISOString()
      });

      // Send Instant Alert to Admin Telegram Bot (Admin sees the code directly for support/WhatsApp verification)
      await sendTelegramAlert(
        `🔔 <b>طلب ربط وتوثيق حساب Google برقم عميل مسجل</b> 🚗⚡\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>اسم العميل المسجل:</b> ${escapeTelegramHtml(existingData.name || 'عميل كريم')}\n` +
        `📱 <b>الجوال:</b> <code>${cleanPhone}</code>\n` +
        `📧 <b>حساب Google المطلوب ربطه:</b> ${escapeTelegramHtml(email || 'غير متوفر')}\n` +
        `🔑 <b>كود التحقق الآمن (OTP):</b> <code>${secureOtp}</code>\n` +
        `⏱️ <b>مدة الصلاحية:</b> 15 دقيقة\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `يمكن للمدير العام (Super Admin) اعتماد الربط فوراً بنقرة واحدة من لوحة إدارة العملاء ✅`
      );

      // Return response to client: NOTICE that secureOtp IS NEVER SENT TO THE CLIENT!
      return res.json({
        success: true,
        exists: true,
        requiresVerification: true,
        customerId: targetDocId,
        customerName: existingData.name || 'عميل كريم',
        phone: cleanPhone,
        expiresAt
      });
    }

    // -------------------------------------------------------------
    // ACTION: VERIFY OTP (التحقق من كود الـ OTP أو الاعتماد)
    // -------------------------------------------------------------
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

      const existingData = snap.data();

      // If already approved by admin
      if (existingData.linkVerificationStatus === 'verified' && existingData.googleUid === googleUid) {
        return res.json({ success: true, adminApproved: true });
      }

      // Check if blocked
      if (existingData.blockedUntil && Date.now() < existingData.blockedUntil) {
        const remainingMinutes = Math.max(1, Math.ceil((existingData.blockedUntil - Date.now()) / 60000));
        return res.status(429).json({
          success: false,
          blocked: true,
          error: `الرقم مجمد مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMinutes} دقيقة أو التواصل مع الإدارة.`
        });
      }

      // Check expired
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

      // Hash input and compare with stored SHA-256 hash
      const inputHash = crypto.createHash('sha256').update(cleanInput + ':' + googleUid).digest('hex');
      const isMatch = inputHash === existingData.linkVerificationCodeHash;

      if (!isMatch) {
        const newFailed = (existingData.failedOtpAttempts || 0) + 1;
        if (newFailed >= 3) {
          // Lock out for 15 minutes
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

      // Verification Succeeded!
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

      // Cleanup any dummy placeholder document under googleUid
      if (googleUid && googleUid !== customerId) {
        try {
          const dummyRef = doc(db, 'customers', googleUid);
          const dummySnap = await getDoc(dummyRef);
          if (dummySnap.exists()) {
            const dData = dummySnap.data();
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

      return res.json({ success: true });
    }

    // -------------------------------------------------------------
    // ACTION: APPROVE LINK (اعتماد المدير العام Super Admin حصرياً)
    // -------------------------------------------------------------
    if (action === 'approve' || action === '/approve') {
      const { customerId, adminId, adminName, adminRole, isSuperAdmin: bodyIsSuperAdmin } = req.body || {};

      // Check Super Admin Authority
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

      const existingData = snap.data();

      if (!existingData.pendingLinkGoogleUid) {
        return res.status(400).json({ success: false, error: 'لا يوجد حساب Google معلق بانتظار الاعتماد لهذا العميل' });
      }

      // Reject expired requests
      if (existingData.linkVerificationExpiresAt && Date.now() > existingData.linkVerificationExpiresAt) {
        return res.status(400).json({
          success: false,
          error: 'لا يمكن اعتماد هذا الطلب لأنه منتهي الصلاحية (أكثر من 15 دقيقة). يرجى إبلاغ العميل بطلب ربط جديد.'
        });
      }

      // Perform secure approval
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

      // Cleanup any dummy placeholder document under googleUid
      if (existingData.pendingLinkGoogleUid && existingData.pendingLinkGoogleUid !== customerId) {
        try {
          const dummyRef = doc(db, 'customers', existingData.pendingLinkGoogleUid);
          const dummySnap = await getDoc(dummyRef);
          if (dummySnap.exists()) {
            const dData = dummySnap.data();
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

      return res.json({
        success: true,
        approvedBy: approverTitle,
        approvedAt
      });
    }

    // -------------------------------------------------------------
    // ACTION: REJECT LINK (رفض طلب الربط)
    // -------------------------------------------------------------
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
