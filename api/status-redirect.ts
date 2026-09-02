// Self-contained Serverless Function to Update Status and Directly Redirect to WhatsApp
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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
  return {
    msg,
    waPhone,
    appUrl: `whatsapp://send?phone=${waPhone}&text=${encodedMsg}`,
    webUrl: `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodedMsg}`,
    waMeUrl: `https://wa.me/${waPhone}?text=${encodedMsg}`
  };
}

export default async function handler(req: any, res: any) {
  const bookingIdOrDocId = req.query.id || req.body?.id;
  let newStatus = req.query.status || req.body?.status || 'accepted';

  if (newStatus === 'onway') newStatus = 'on_the_way';
  if (newStatus === 'done') newStatus = 'completed';
  if (newStatus === 'reject') newStatus = 'cancelled';

  if (!bookingIdOrDocId) {
    return res.status(400).send('Missing booking ID');
  }

  try {
    const db = getDb();
    const snap = await getDocs(collection(db, 'maintenance'));
    let targetDocId: string | null = null;
    let targetData: any = null;

    for (const d of snap.docs) {
      const data = d.data();
      if (d.id === bookingIdOrDocId || data.bookingId === bookingIdOrDocId) {
        targetDocId = d.id;
        targetData = { id: d.id, ...data };
        break;
      }
    }

    if (!targetDocId || !targetData) {
      return res.status(404).send('Booking record not found');
    }

    // Update status in Firestore
    await updateDoc(doc(db, 'maintenance', targetDocId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: 'Direct WhatsApp Action Link'
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
      newStatus === 'cancelled' ? 'ملغي ❌' : 'قيد العمل 🔧';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فتح محادثة واتساب - DR.FIX</title>
  <meta http-equiv="refresh" content="0;url=${wa.waMeUrl}">
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
  <script>
    // Automatically redirect to WhatsApp
    window.location.href = "${wa.waMeUrl}";
    setTimeout(function() {
      window.location.href = "${wa.appUrl}";
    }, 800);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">💬⚡</div>
    <div class="status-badge">تم التحديث: ${statusLabel}</div>
    <h2>جاري فتح تطبيق الواتساب...</h2>
    <p>تم تحديث الحجز رقم <b>#${targetData.bookingId || targetData.id}</b> بنجاح.</p>
    <a href="${wa.waMeUrl}" class="btn">فتح تطبيق واتساب مباشرة 💬</a>
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

