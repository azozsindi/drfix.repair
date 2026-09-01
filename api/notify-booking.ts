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
    const car = booking.carModel || 'السيارة';
    const service = booking.serviceType || 'صيانة متنقلة';

    const waGeneralUrl = internationalPhone ? `https://wa.me/${internationalPhone}` : null;
    const waAcceptUrl = internationalPhone 
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`مرحباً بك أستاذنا العزيز 🚗⚡\nتم تأكيد وقبول موعد حجزك لدى DR.FIX ميكانيكي متنقل في جدة.\n\n📌 رقم الحجز: #${bId}\n🚘 السيارة: ${car}\n🔧 الخدمة: ${service}\n\nفريقنا يجهز المعدات اللازمة لخدمتكم بأعلى جودة وسرعة!`)}`
      : null;
    const waOnWayUrl = internationalPhone 
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`مرحباً بك أستاذنا العزيز 🚗⚡\nنود إعلامك بأن فني DR.FIX المتنقل في الطريق إليك الآن لمباشرة صيانة سيارتك (${car}).\n\n📌 رقم الحجز: #${bId}\n🔧 الخدمة: ${service}\n\nنتشرف بخدمتك دائماً!`)}`
      : null;
    const waDoneUrl = internationalPhone 
      ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(`مرحباً بك أستاذنا العزيز 🚗⚡\nتم الانتهاء من صيانة سيارتك (${car}) بنجاح والحمد لله.\n\n📌 رقم الحجز: #${bId}\n🔧 الخدمة: ${service}\n\nشكراً لثقتكم بمركز DR.FIX - ميكانيكي متنقل في جدة 🚗✨\nيسعدنا تقييمكم لخدمتنا عبر موقعنا:\nhttps://www.drfix.repair/#reviews`)}`
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
    const safeCustomerName = escapeHtml(booking.customerName || booking.customerPhone || 'عميل DR.FIX');
    const safePhone = escapeHtml(booking.customerPhone || 'غير متوفر');
    const safeCarModel = escapeHtml(booking.carModel || 'غير محدد');
    const safeServiceType = escapeHtml(booking.serviceType || 'صيانة عامة');
    const safeDate = escapeHtml(booking.serviceDate || new Date().toLocaleDateString('ar-SA'));
    const safeLocation = escapeHtml(booking.location || (booking.coordinates ? 'إحداثيات GPS مرفقة' : 'جدة'));
    const safeNotes = booking.notes ? escapeHtml(booking.notes) : '';
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

    const inline_keyboard: any[][] = [];

    const actionRow: any[] = [];
    if (mapsUrl) actionRow.push({ text: '📍 موقع العميل', url: mapsUrl });
    if (waGeneralUrl) actionRow.push({ text: '💬 واتساب العميل', url: waGeneralUrl });
    if (actionRow.length > 0) inline_keyboard.push(actionRow);

    if (waOnWayUrl && waAcceptUrl) {
      inline_keyboard.push([
        { text: '🚗 الفني بالطريق (واتساب) ↗️', url: waOnWayUrl },
        { text: '✅ قبول الحجز (واتساب) ↗️', url: waAcceptUrl }
      ]);
    }

    if (waDoneUrl) {
      inline_keyboard.push([
        { text: '🏁 تم الإنجاز (واتساب) ↗️', url: waDoneUrl },
        { text: '❌ رفض / إلغاء', callback_data: `act_reject_${booking.bookingId}` }
      ]);
    } else {
      inline_keyboard.push([
        { text: '✅ قبول الحجز', callback_data: `act_accept_${booking.bookingId}` },
        { text: '❌ رفض الحجز', callback_data: `act_reject_${booking.bookingId}` }
      ]);
      inline_keyboard.push([
        { text: '🚗 الفني بالطريق', callback_data: `act_onway_${booking.bookingId}` },
        { text: '🏁 تم الإنجاز', callback_data: `act_done_${booking.bookingId}` }
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
