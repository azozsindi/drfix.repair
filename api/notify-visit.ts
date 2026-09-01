// Self-contained Serverless Function for Emergency/Visit Notification
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
    let visit = req.body;
    if (typeof visit === 'string') {
      try { visit = JSON.parse(visit); } catch {}
    }

    const safeName = escapeHtml(visit?.customerName || 'عميل');
    const safePhone = escapeHtml(visit?.customerPhone || 'غير متوفر');
    const safeServiceType = escapeHtml(visit?.serviceType || 'فحص سريع / طوارئ');
    const safeLocation = escapeHtml(visit?.location || 'جدة');
    const safeNotes = visit?.notes ? escapeHtml(visit.notes) : '';
    const safeTime = escapeHtml(new Date().toLocaleString('ar-SA'));

    const text = `🚨 <b>طلب زيارة / طوارئ جديد في DR.FIX</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>العميل:</b> ${safeName}\n` +
      `📱 <b>الجوال:</b> <code>${safePhone}</code>\n` +
      `🔧 <b>نوع الخدمة:</b> ${safeServiceType}\n` +
      `📍 <b>الموقع:</b> ${safeLocation}\n` +
      (safeNotes ? `📝 <b>الملاحظات:</b> ${safeNotes}\n` : '') +
      `⏱️ <b>الوقت:</b> ${safeTime}\n` +
      `━━━━━━━━━━━━━━━━━━`;

    const cleanPhone = (visit?.customerPhone || '').replace(/\D/g, '');
    const internationalPhone = cleanPhone ? (cleanPhone.startsWith('966') ? cleanPhone : '966' + cleanPhone.replace(/^0/, '')) : '';
    const waLink = internationalPhone ? `https://wa.me/${internationalPhone}` : null;

    const inline_keyboard: any[][] = [
      [
        { text: '📍 موقع البلاغ', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((visit?.location || '') + ' جدة')}` }
      ]
    ];
    if (waLink) {
      inline_keyboard[0].unshift({ text: '💬 تواصل واتساب', url: waLink });
    }

    const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard }
      })
    });

    const result = await tgRes.json();
    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('Error in notify-visit handler:', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
