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

function buildWhatsAppMessage(record: any, newStatus: string): string {
  const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('966') 
    ? cleanPhone 
    : cleanPhone.startsWith('05') 
    ? '966' + cleanPhone.slice(1) 
    : cleanPhone.startsWith('5') 
    ? '966' + cleanPhone 
    : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);

  const bId = record.bookingId || record.id || '';
  const customerName = record.customerName && record.customerName !== record.customerPhone 
    ? record.customerName 
    : (record.name && record.name !== record.customerPhone ? record.name : '');
  
  const greeting = customerName ? `مرحباً بك أستاذ/ة ${customerName} 🚗⚡` : `مرحباً بك أستاذنا العزيز 🚗⚡`;
  const car = record.carModel || (record.carMake ? `${record.carMake} ${record.carModel || ''} ${record.carYear || ''}`.trim() : 'سيارتك');
  const service = record.serviceType || 'صيانة متنقلة';
  const location = record.location || 'جدة';
  const notes = record.notes ? record.notes.trim() : '';

  let msg = '';
  switch (newStatus) {
    case 'accepted':
      msg = `${greeting}\nتم تأكيد وقبول موعد حجزك لدى DR.FIX - ميكانيكي متنقل في جدة ✅\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n📍 الموقع: ${location}\n${notes ? `📝 الملاحظات: ${notes}\n` : ''}\nفريقنا يجهز المعدات اللازمة لخدمتكم بأعلى سرعة وجودة! نتشرف بكم دائماً.`;
      break;
    case 'on_the_way':
    case 'onway':
      msg = `${greeting}\nنود إعلامك بأن فني DR.FIX المتنقل في الطريق إليك الآن لمباشرة صيانة سيارتك 🚗💨\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n📍 الموقع: ${location}\n${notes ? `📝 تفاصيل الطلب: ${notes}\n` : ''}\nيرجى إبقاء الهاتف متاحاً للتنسيق عند الوصول. نتشرف بخدمتك!`;
      break;
    case 'in-progress':
    case 'in_progress':
      msg = `${greeting}\nبدأ فني DR.FIX العمل على فحص وصيانة سيارتك الآن 🔧\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n\nسنوافيكم بكافة المستجدات فور الانتهاء بإذن الله!`;
      break;
    case 'completed':
    case 'done':
      msg = `${greeting}\nتم الانتهاء من صيانة وفحص سيارتك بنجاح والحمد لله 🏁✨\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n\nشكراً لثقتكم واختياركم DR.FIX - ميكانيكي متنقل في جدة 🚗\nيسعدنا ويشرفنا تقييمكم لتجربتكم معنا عبر الرابط:\nhttps://www.drfix.repair/#reviews`;
      break;
    case 'cancelled':
    case 'reject':
      msg = `${greeting}\nنحيطك علماً بأنه تم إلغاء / رفض حجز الصيانة لسيارة (${car}) رقم الحجز: #${bId}.\n\nإذا كان لديك أي استفسار أو ترغب في إعادة جدولة الموعد، يسعدنا تواصلك معنا دائماً!`;
      break;
    default:
      msg = `${greeting}\nتحديث بخصوص حجزك لسيارة (${car}) رقم الحجز: #${bId}\n🔧 الخدمة: ${service}`;
      break;
  }

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
}

export default async function handler(req: any, res: any) {
  const bookingIdOrDocId = req.query.id || req.body?.id;
  let newStatus = req.query.status || req.body?.status || 'on_the_way';

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

    const waUrl = buildWhatsAppMessage(targetData, newStatus);

    // If client requested JSON
    if (req.headers.accept?.includes('application/json') && !req.query.redirect) {
      return res.status(200).json({
        ok: true,
        updatedStatus: newStatus,
        whatsAppUrl: waUrl
      });
    }

    // Otherwise render instant auto-redirecting HTML with fallback button
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
  <title>جاري تحويلك إلى الواتساب - DR.FIX</title>
  <meta http-equiv="refresh" content="0;url=${waUrl}">
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
      background: #10b981;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 14px;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(16,185,129,0.4);
      transition: background 0.2s;
    }
    .btn:hover {
      background: #059669;
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
    window.location.replace("${waUrl}");
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">💬⚡</div>
    <div class="status-badge">تم تحديث الحالة: ${statusLabel}</div>
    <h2>جاري تحويلك إلى الواتساب...</h2>
    <p>تم تحديث الحجز رقم <b>#${targetData.bookingId || targetData.id}</b> بنجاح، جاري فتح محادثة العميل الآن.</p>
    <a href="${waUrl}" class="btn">اضغط هنا إذا لم يتم نقلك تلقائياً ↗️</a>
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
