// Self-contained Serverless Function to Update Status and Directly Redirect to WhatsApp
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, limit, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

const WORKER_EMAIL = 'accounting-engine@drfix.repair';
const WORKER_PASSWORD = process.env.ACCOUNTING_WORKER_PASSWORD || 'DRFixSecureAccountingWorker2026!#';

let dbInstance: any = null;
let authPromise: Promise<any> | null = null;

async function getDb() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  if (!auth.currentUser || auth.currentUser.email !== WORKER_EMAIL) {
    if (!authPromise) {
      authPromise = signInWithEmailAndPassword(auth, WORKER_EMAIL, WORKER_PASSWORD)
        .then(() => {
          authPromise = null;
        })
        .catch((err) => {
          authPromise = null;
          console.error('[Status-Redirect Worker Auth Error]:', err.message);
          throw err;
        });
    }
    await authPromise;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  }
  return dbInstance;
}

function formatSaudiPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00966')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('05')) {
    digits = '966' + digits.slice(1);
  } else if (digits.startsWith('5') && digits.length === 9) {
    digits = '966' + digits;
  } else if (digits.startsWith('0') && !digits.startsWith('966')) {
    digits = '966' + digits.replace(/^0+/, '');
  } else if (!digits.startsWith('966') && digits.length === 9) {
    digits = '966' + digits;
  }
  return digits;
}

function buildWhatsAppMessage(record: any, newStatus: string): { msg: string, waPhone: string, appUrl: string, webUrl: string, waMeUrl: string } {
  const waPhone = formatSaudiPhone(record.customerPhone || record.phone);

  const bId = record.bookingId || record.id || '';
  const car = record.carModel ? (record.carYear ? `${record.carModel} (${record.carYear})` : record.carModel) : 'سيارتك';
  const service = record.serviceType || 'صيانة متنقلة';
  const customer = (record.customerName || record.name || '').trim();
  const customerGreeting = customer ? `هلا ${customer}` : 'هلا بك';
  const customerIntro = customer ? `${customer}، ` : '';

  let msg = '';
  switch (newStatus) {
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
    case 'onway':
      msg = `🚗💨 DR.FIX | الفني تحرّك!\n\n` +
        `${customerIntro}فني DR.FIX في الطريق إليك الآن 🔧\n\n` +
        `📍 توجه الفني إلى موقعك بدأ\n` +
        `🚘 ${car}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `جهّز السيارة... والباقي علينا ⚡`;
      break;
    case 'in-progress':
    case 'in_progress':
      msg = `🔧⚡ DR.FIX | وصلنا!\n\n` +
        `الفني وصل وبدأ فحص سيارتك الآن ✅\n\n` +
        `🚘 ${car}\n` +
        `🛠️ ${service}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `خلّ الباقي علينا 😎`;
      break;
    case 'completed':
    case 'done':
      msg = `🏁✨ DR.FIX | تمت المهمة!\n\n` +
        `${customerIntro}تم الانتهاء من خدمتك بنجاح ✅\n\n` +
        `🚘 ${car}\n` +
        `🔧 ${service}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `شكراً لاختيارك DR.FIX 🤍\n\n` +
        `عطل سيارتك؟ إحنا نجيك. 🚗⚡`;
      break;
    case 'cancelled':
    case 'reject':
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

  const encodedMsg = encodeURIComponent(msg);
  const directApiUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodedMsg}`;
  return {
    msg,
    waPhone,
    appUrl: `whatsapp://send?phone=${waPhone}&text=${encodedMsg}`,
    webUrl: directApiUrl,
    waMeUrl: directApiUrl
  };
}

export default async function handler(req: any, res: any) {
  const rawId = req.query.id || req.body?.id;
  const bookingIdOrDocId = rawId ? String(rawId).trim().replace(/^#/, '') : '';
  let newStatus = String(req.query.status || req.body?.status || 'accepted').trim().toLowerCase();

  if (newStatus === 'accept') newStatus = 'accepted';
  if (newStatus === 'onway') newStatus = 'on_the_way';
  if (newStatus === 'done') newStatus = 'completed';
  if (newStatus === 'reject' || newStatus === 'rejected') newStatus = 'cancelled';

  if (!bookingIdOrDocId) {
    return res.status(400).send('Missing booking ID');
  }

  try {
    const db = await getDb();
    let targetDocId: string | null = null;
    let targetData: any = null;

    // 1. Fast indexed query by bookingId
    const qSnap = await getDocs(
      query(collection(db, 'maintenance'), where('bookingId', '==', bookingIdOrDocId), limit(1))
    );
    if (!qSnap.empty) {
      const d = qSnap.docs[0];
      targetDocId = d.id;
      targetData = { id: d.id, ...d.data() };
    }

    // 2. Direct lookup by document ID
    if (!targetDocId) {
      const directSnap = await getDoc(doc(db, 'maintenance', bookingIdOrDocId));
      if (directSnap.exists()) {
        targetDocId = directSnap.id;
        targetData = { id: directSnap.id, ...directSnap.data() };
      }
    }

    // 3. Fallback case-insensitive match within recent maintenance records
    if (!targetDocId) {
      const snap = await getDocs(query(collection(db, 'maintenance'), limit(200)));
      const lowerId = bookingIdOrDocId.toLowerCase();
      for (const d of snap.docs) {
        const data = d.data();
        if (
          d.id.toLowerCase() === lowerId ||
          String(data.bookingId || '').trim().toLowerCase() === lowerId
        ) {
          targetDocId = d.id;
          targetData = { id: d.id, ...data };
          break;
        }
      }
    }

    if (!targetDocId || !targetData) {
      if (req.headers.accept?.includes('application/json') && !req.query.redirect) {
        return res.status(404).json({ ok: false, error: 'Booking record not found' });
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>لم يتم العثور على الحجز - DR.FIX</title></head><body style="background:#0b0f19;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center;"><div style="background:#111827;border:1px solid #ef4444;padding:30px;border-radius:20px;max-width:420px;width:100%;"><div style="font-size:42px;margin-bottom:12px;">⚠️</div><h2 style="margin:0 0 10px;color:#f87171;">لم يتم العثور على الحجز</h2><p style="color:#9ca3af;font-size:14px;">رقم الحجز <b>#${bookingIdOrDocId}</b> غير موجود أو تم حذفه.</p></div></body></html>`);
    }

    // Update status in Firestore
    await updateDoc(doc(db, 'maintenance', targetDocId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: 'Telegram Action Link'
    });

    const wa = buildWhatsAppMessage(targetData, newStatus);

    // Optional Telegram message update if mid/cid provided
    const cid = req.query.cid;
    const mid = req.query.mid;
    if (cid && mid) {
      try {
        const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
        const statusArabic = 
          newStatus === 'accepted' ? 'مقبول ✅' :
          newStatus === 'on_the_way' ? 'الفني بالطريق 🚗' :
          newStatus === 'completed' ? 'تم الإنجاز 🏁' :
          newStatus === 'cancelled' ? 'مرفوض / ملغى ❌' : 'قيد العمل 🔧';
        
        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cid,
            message_id: mid,
            text: `📊 <b>تم تحديث الحالة:</b> ${statusArabic}\n\nالحجز رقم <code>${targetData.bookingId || targetData.id}</code> لسيارة ${targetData.carModel || ''}`,
            parse_mode: 'HTML'
          })
        });
      } catch (tgErr) {
        console.warn('Error updating telegram message from redirect handler:', tgErr);
      }
    }

    // Trigger FCM Web Push Notification for status update
    try {
      const { sendFcmNotification } = await import('./notify');
      sendFcmNotification({
        title: 'تحديث حالة الطلب 🔧',
        body: `تم تحديث حالة طلب الصيانة #${targetData.bookingId || targetData.id}. اضغط لمتابعة التفاصيل.`,
        url: `/admin`,
        bookingId: targetData.bookingId || targetData.id,
        eventType: 'status_update'
      }).catch((err: any) => console.warn('FCM status update trigger error:', err));
    } catch (fcmErr) {
      console.warn('FCM dispatch failed in status-redirect:', fcmErr);
    }

    // If client requested JSON
    if (req.headers.accept?.includes('application/json') && !req.query.redirect) {
      return res.status(200).json({
        ok: true,
        updatedStatus: newStatus,
        whatsAppUrl: wa.waMeUrl,
        whatsAppAppUrl: wa.appUrl
      });
    }

    // Render instant auto-redirecting HTML to WhatsApp
    const statusLabel = 
      newStatus === 'on_the_way' ? 'الفني بالطريق 🚗' :
      newStatus === 'accepted' ? 'تم القبول ✅' :
      newStatus === 'completed' ? 'تم الإنجاز 🏁' :
      (newStatus === 'cancelled' || newStatus === 'reject' || newStatus === 'rejected') ? 'تم رفض / إلغاء الطلب ❌' : 'قيد العمل 🔧';

    const hasPhone = Boolean(wa.waPhone);
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${hasPhone ? 'فتح محادثة واتساب' : 'تم تحديث الحالة'} - DR.FIX</title>
  ${hasPhone ? `<meta http-equiv="refresh" content="0;url=${wa.waMeUrl}">` : ''}
  <style>
    body {
      background-color: #0b0f19;
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: #111827;
      border: 1px solid #10b981;
      padding: 30px;
      border-radius: 20px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 20px;
      color: #10b981;
    }
    p {
      color: #9ca3af;
      font-size: 14px;
      margin: 0 0 25px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      background: #25D366;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 14px;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(37,211,102,0.4);
      transition: all 0.2s;
    }
    .btn:hover {
      background: #1eb956;
      transform: scale(1.02);
    }
    .status-badge {
      display: inline-block;
      background: rgba(16,185,129,0.15);
      color: #34d399;
      border: 1px solid rgba(16,185,129,0.3);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      margin-bottom: 15px;
    }
  </style>
  ${hasPhone ? `<script>
    // Automatically redirect to WhatsApp
    window.location.href = ${JSON.stringify(wa.waMeUrl)};
    setTimeout(function() {
      window.location.href = ${JSON.stringify(wa.appUrl)};
    }, 800);
  </script>` : ''}
</head>
<body>
  <div class="card">
    <div class="icon">${hasPhone ? '💬⚡' : '✅'}</div>
    <div class="status-badge">تم التحديث: ${statusLabel}</div>
    <h2>${hasPhone ? 'جاري فتح تطبيق الواتساب...' : 'تم تحديث حالة الطلب بنجاح'}</h2>
    <p>تم تحديث الحجز رقم <b>#${targetData.bookingId || targetData.id}</b> بنجاح.</p>
    ${hasPhone
      ? `<a href="${wa.waMeUrl}" class="btn">فتح تطبيق واتساب مباشرة 💬</a>`
      : `<p style="color:#f59e0b;font-size:13px;">تنبيه: لا يوجد رقم جوال مسجل لهذا الحجز لفتح واتساب.</p>`
    }
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err: any) {
    console.error('Error in status-redirect handler:', err);
    return res.status(500).send('Error updating status: ' + err.message);
  }
}

