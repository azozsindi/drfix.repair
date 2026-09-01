// Self-contained Serverless Function for Review Notification
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
    let review = req.body;
    if (typeof review === 'string') {
      try { review = JSON.parse(review); } catch {}
    }

    const stars = '⭐'.repeat(Math.min(5, Math.max(1, review?.rating || 5)));
    const safeName = escapeHtml(review?.name || 'زائر');
    const safeComment = escapeHtml(review?.comment || 'لا يوجد نص');
    const safePhone = review?.phone ? escapeHtml(review.phone) : '';
    const safeTime = escapeHtml(new Date().toLocaleString('ar-SA'));

    const text = `🌟 <b>تقييم جديد في DR.FIX</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>العميل:</b> ${safeName}\n` +
      `⭐ <b>التقييم:</b> ${stars} (${review?.rating || 5}/5)\n` +
      `💬 <b>التعليق:</b> ${safeComment}\n` +
      (safePhone ? `📱 <b>الجوال:</b> <code>${safePhone}</code>\n` : '') +
      `⏱️ <b>الوقت:</b> ${safeTime}\n` +
      `━━━━━━━━━━━━━━━━━━`;

    const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text,
        parse_mode: 'HTML'
      })
    });

    const result = await tgRes.json();
    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    console.error('Error in notify-review handler:', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
