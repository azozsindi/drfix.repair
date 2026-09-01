// Self-contained Serverless Function for New Booking Notification
const DEFAULT_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
const DEFAULT_ADMIN_ID = '867105778';

function escapeHtml(text: any): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    let booking = req.body;
    if (typeof booking === 'string') {
      try { booking = JSON.parse(booking); } catch {}
    }

    if (!booking || !booking.bookingId) {
      return res.status(400).json({ ok: false, message: 'Missing booking ID' });
    }

    const cleanPhone = (booking.customerPhone || '').replace(/\D/g, '');
    const internationalPhone = cleanPhone ? (cleanPhone.startsWith('966') ? cleanPhone : '966' + cleanPhone.replace(/^0/, '')) : '';
    const bId = booking.bookingId || '';
    const customerName = booking.customerName && booking.customerName !== booking.customerPhone 
      ? booking.customerName 
      : (booking.name && booking.name !== booking.customerPhone ? booking.name : '');
    
    const greeting = customerName ? `مرحباً بك أستاذ/ة ${customerName} 🚗⚡` : `مرحباً بك أستاذنا العزيز 🚗⚡`;
    const car = booking.carModel || (booking.carMake ? `${booking.carMake} ${booking.carModel || ''} ${booking.carYear || ''}`.trim() : 'السيارة');
    const service = booking.serviceType || 'صيانة متنقلة';
    const location = booking.location || 'جدة';
    const notes = booking.notes ? booking.notes.trim() : '';

    const waGeneralUrl = internationalPhone ? `https://wa.me/${internationalPhone}` : null;
    const waAcceptUrl = internationalPhone 
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`${greeting}\nتم تأكيد وقبول موعد حجزك لدى DR.FIX - ميكانيكي متنقل في جدة ✅\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n📍 الموقع: ${location}\n${notes ? `📝 الملاحظات: ${notes}\n` : ''}\nفريقنا يجهز المعدات اللازمة لخدمتكم بأعلى سرعة وجودة! نتشرف بكم دائماً.`)}`
      : null;
    const waOnWayUrl = internationalPhone 
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`${greeting}\nنود إعلامك بأن فني DR.FIX المتنقل في الطريق إليك الآن لمباشرة صيانة سيارتك 🚗💨\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n📍 الموقع: ${location}\n${notes ? `📝 تفاصيل الطلب: ${notes}\n` : ''}\nيرجى إبقاء الهاتف متاحاً للتنسيق عند الوصول. نتشرف بخدمتك!`)}`
      : null;
    const waDoneUrl = internationalPhone 
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`${greeting}\nتم الانتهاء من صيانة وفحص سيارتك بنجاح والحمد لله 🏁✨\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n\nشكراً لثقتكم واختياركم DR.FIX - ميكانيكي متنقل في جدة 🚗\nيسعدنا ويشرفنا تقييمكم لتجربتكم معنا عبر الرابط:\nhttps://www.drfix.repair/#reviews`)}`
      : null;
    const waRejectUrl = internationalPhone
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`${greeting}\nنحيطك علماً بأنه تم إلغاء / رفض حجز الصيانة لسيارة (${car}) رقم الحجز: #${bId}.\n\nإذا كان لديك أي استفسار أو ترغب في إعادة جدولة الموعد، يسعدنا تواصلك معنا دائماً!`)}`
      : null;
    
    let mapsUrl = '';
    if (booking.coordinates?.latitude && booking.coordinates?.longitude) {
      mapsUrl = `https://www.google.com/maps?q=${booking.coordinates.latitude},${booking.coordinates.longitude}`;
    } else if (booking.location) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location + ' جدة')}`;
    } else {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('جدة المملكة العربية السعودية')}`;
    }

    const safeBookingId = escapeHtml(booking.bookingId);
    const safeCustomerName = escapeHtml(customerName || booking.customerPhone || 'عميل DR.FIX');
    const safePhone = escapeHtml(booking.customerPhone || 'غير متوفر');
    const safeCarModel = escapeHtml(car);
    const safeServiceType = escapeHtml(service);
    const safeDate = escapeHtml(booking.serviceDate || new Date().toLocaleDateString('ar-SA'));
    const safeLocation = escapeHtml(booking.location || (booking.coordinates ? 'إحداثيات GPS مرفقة' : 'جدة'));
    const safeNotes = notes ? escapeHtml(notes) : '';
    const safeTime = escapeHtml(new Date().toLocaleTimeString('ar-SA'));

    const messageText = `🔔 <b>حجز جديد في DR.FIX</b> 🚗⚡\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔖 <b>رقم الحجز:</b> <code>${safeBookingId}</code>\n` +
      `👤 <b>العميل:</b> ${safeCustomerName}\n` +
      `📱 <b>الجوال:</b> <code>${safePhone}</code>\n` +
      `🚘 <b>السيارة:</b> ${safeCarModel}\n` +
      `🔧 <b>الخدمة:</b> ${safeServiceType}\n` +
      `📅 <b>التاريخ:</b> ${safeDate}\n` +
      `📍 <b>الموقع:</b> ${safeLocation}\n` +
      (safeNotes ? `📝 <b>ملاحظات العميل:</b> ${safeNotes}\n` : '') +
      `⏱️ <b>وقت الحجز:</b> ${safeTime}\n` +
      `📊 <b>الحالة:</b> 🆕 جديد\n` +
      `━━━━━━━━━━━━━━━━━━`;

    const host = req.headers?.host || 'ais-dev-67s7t2ibowkgamyonguwv5-138630195296.europe-west2.run.app';
    const proto = req.headers?.['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;

    const acceptDirectUrl = waAcceptUrl ? `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=accepted` : null;
    const onWayDirectUrl = waOnWayUrl ? `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=on_the_way` : null;
    const doneDirectUrl = waDoneUrl ? `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=completed` : null;
    const rejectDirectUrl = waRejectUrl ? `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=cancelled` : null;

    const inline_keyboard: any[][] = [];

    const actionRow: any[] = [];
    if (mapsUrl) actionRow.push({ text: '📍 موقع العميل (GPS)', url: mapsUrl });
    if (waGeneralUrl) actionRow.push({ text: '💬 واتساب العميل', url: waGeneralUrl });
    if (actionRow.length > 0) inline_keyboard.push(actionRow);

    if (acceptDirectUrl && onWayDirectUrl) {
      inline_keyboard.push([
        { text: '✅ قبول الحجز (تحديث + واتساب ↗️)', url: acceptDirectUrl },
        { text: '🚗 الفني بالطريق (تحديث + واتساب ↗️)', url: onWayDirectUrl }
      ]);
    }

    if (doneDirectUrl && rejectDirectUrl) {
      inline_keyboard.push([
        { text: '🏁 تم الإنجاز (تحديث + واتساب ↗️)', url: doneDirectUrl },
        { text: '❌ رفض / إلغاء (تحديث + واتساب ↗️)', url: rejectDirectUrl }
      ]);
    } else {
      inline_keyboard.push([
        { text: '✅ قبول الحجز', callback_data: `act_accept_${bId}` },
        { text: '❌ رفض الحجز', callback_data: `act_reject_${bId}` }
      ]);
      inline_keyboard.push([
        { text: '🚗 الفني بالطريق', callback_data: `act_onway_${bId}` },
        { text: '🏁 تم الإنجاز', callback_data: `act_done_${bId}` }
      ]);
    }

    const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: messageText,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard }
      })
    });

    const result = await tgRes.json();
    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('Error in notify-booking handler:', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
