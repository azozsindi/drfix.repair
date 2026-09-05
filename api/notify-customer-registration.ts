// Self-contained Serverless Function for Customer Registration Notification
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
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }

    const safeName = escapeHtml(payload?.name || 'عميل جديد');
    const safePhone = payload?.phone ? escapeHtml(payload.phone) : '';
    const safeEmail = payload?.email ? escapeHtml(payload.email) : '';
    const intPhone = formatSaudiPhone(payload?.phone);
    const sourceArabic = payload?.source === 'google' 
      ? 'جوجل Google 🌐' 
      : payload?.source === 'quick_booking'
      ? 'حجز موعد صيانة 🚗'
      : 'تسجيل حساب جديد 📱';
    const carText = payload?.car ? escapeHtml(payload.car) : '';

    const saudiTime = new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Riyadh'
    }).format(new Date());

    const text = `🔔 <b>تسجيل عميل جديد في DR.FIX</b> 👤\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>اسم العميل:</b> ${safeName}\n` +
      (safePhone ? `📱 <b>رقم الجوال:</b> <code>${safePhone}</code>\n` : '') +
      (safeEmail ? `📧 <b>البريد:</b> <code>${safeEmail}</code>\n` : '') +
      (carText ? `🚗 <b>السيارة:</b> ${carText}\n` : '') +
      `🔑 <b>طريقة التسجيل:</b> ${sourceArabic}\n` +
      `⏰ <b>التوقيت:</b> ${saudiTime}\n` +
      `━━━━━━━━━━━━━━━━━━`;

    let replyMarkup: any = undefined;
    if (intPhone) {
      replyMarkup = {
        inline_keyboard: [
          [
            { text: '💬 محادثة واتساب', url: `https://wa.me/${intPhone}` },
            { text: '📞 اتصال بالعميل', url: `tel:${safePhone || intPhone}` }
          ]
        ]
      };
    }

    const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });

    const result = await response.json();
    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('Error sending registration notification:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
}
