// Unified Notification Engine for DR.FIX
// Consolidates: notify-booking, notify-review, notify-visit, notify-customer-registration, fcm-notify
import firebaseConfig from '../firebase-applet-config.json';

const DEFAULT_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
const DEFAULT_ADMIN_ID = '867105778';
const PROJECT_ID = firebaseConfig.projectId || 'hr-system-2026';

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

// -------------------------------------------------------------
// FCM DISPATCH HELPER
// -------------------------------------------------------------
async function getGcpAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data: any = await res.json();
      return data.access_token || null;
    }
  } catch (e) {
    // metadata unreachable
  }
  return null;
}

async function fetchActiveFcmTokens(apiKey: string): Promise<{ id: string; token: string }[]> {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbId}/documents/fcm_tokens?key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];

    const data: any = await res.json();
    if (!data.documents) return [];

    const tokens: { id: string; token: string }[] = [];
    for (const doc of data.documents) {
      const fields = doc.fields || {};
      const token = fields.token?.stringValue;
      const isActive = fields.isActive?.booleanValue ?? true;
      if (token && isActive) {
        const nameParts = doc.name.split('/');
        const id = nameParts[nameParts.length - 1];
        tokens.push({ id, token });
      }
    }
    return tokens;
  } catch (e) {
    console.warn('Error fetching tokens from Firestore REST:', e);
    return [];
  }
}

async function deactivateToken(docId: string, apiKey: string) {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbId}/documents/fcm_tokens/${docId}?updateMask.fieldPaths=isActive&updateMask.fieldPaths=deactivatedAt&key=${apiKey}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          isActive: { booleanValue: false },
          deactivatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });
  } catch (e) {
    console.warn('Error deactivating invalid FCM token:', e);
  }
}

export async function sendFcmNotification(payload: any) {
  const title = (payload.title || '').trim();
  const body = (payload.body || '').trim();
  if (!title && !body) return { ok: false, message: 'Notification title or body must not be empty' };

  const {
    url = '/admin',
    targetTokens = [],
    bookingId,
    serverKey = process.env.FIREBASE_SERVER_KEY || ''
  } = payload;

  const apiKey = firebaseConfig.apiKey;
  let tokensToSend: { id: string; token: string }[] = [];

  if (Array.isArray(targetTokens) && targetTokens.length > 0) {
    tokensToSend = targetTokens.map((t: string, idx: number) => ({ id: `manual_${idx}`, token: t }));
  } else {
    tokensToSend = await fetchActiveFcmTokens(apiKey);
  }

  if (tokensToSend.length === 0) {
    return { ok: true, sent: 0, message: 'No registered devices' };
  }

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  // Strategy 1: Legacy Server Key
  if (serverKey && serverKey.trim()) {
    const legacyPayload = {
      registration_ids: tokensToSend.map(t => t.token),
      notification: { title, body, icon: '/logo-custom.png', badge: '/favicon-96x96.png', click_action: url },
      data: { title, body, url, bookingId: bookingId || '', timestamp: String(Date.now()) },
      priority: 'high'
    };
    try {
      const legacyRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: { 'Authorization': `key=${serverKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(legacyPayload)
      });
      if (legacyRes.ok) {
        const legacyData: any = await legacyRes.json();
        return { ok: true, sent: legacyData.success || 0, failed: legacyData.failure || 0 };
      }
    } catch (err: any) {
      errors.push(err.message);
    }
  }

  // Strategy 2: FCM v1 API with GCP Access Token
  const gcpAccessToken = await getGcpAccessToken();
  if (gcpAccessToken) {
    for (const item of tokensToSend) {
      try {
        const fcmV1Payload = {
          message: {
            token: item.token,
            notification: { title, body },
            data: { url, bookingId: bookingId ? String(bookingId) : '', timestamp: String(Date.now()) },
            webpush: {
              headers: { Urgency: 'high' },
              notification: { icon: '/logo-custom.png', badge: '/favicon-96x96.png', dir: 'rtl', lang: 'ar', renotify: true, requireInteraction: true },
              fcm_options: { link: url }
            }
          }
        };
        const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gcpAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(fcmV1Payload)
        });
        if (fcmRes.ok) {
          successCount++;
        } else {
          failCount++;
          const errData: any = await fcmRes.json();
          const errStr = errData.error?.message || 'FCM error';
          errors.push(errStr);
          if (errStr.includes('UNREGISTERED') || errStr.includes('registration-token-not-registered') || errData.error?.status === 'NOT_FOUND') {
            await deactivateToken(item.id, apiKey);
          }
        }
      } catch (err: any) {
        failCount++;
        errors.push(err.message);
      }
    }
    return { ok: successCount > 0 || failCount === 0, sent: successCount, failed: failCount, errors: errors.slice(0, 5) };
  }

  return { ok: false, sent: 0, failed: tokensToSend.length, message: 'Server Key or Service Account not configured' };
}

// -------------------------------------------------------------
// NOTIFICATION SUB-HANDLERS
// -------------------------------------------------------------

async function handleBookingNotification(booking: any, req: any) {
  const internationalPhone = formatSaudiPhone(booking.customerPhone || booking.phone);
  const bId = booking.bookingId || '';
  const customerName = booking.customerName && booking.customerName !== booking.customerPhone 
    ? booking.customerName 
    : (booking.name && booking.name !== booking.customerPhone ? booking.name : '');
  const car = booking.carModel || 'السيارة';
  const service = booking.serviceType || 'صيانة متنقلة';
  const notes = booking.notes ? booking.notes.trim() : '';

  const waGeneralUrl = internationalPhone ? `https://wa.me/${internationalPhone}` : null;
  
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

  const defaultPublicUrl = 'https://ais-dev-67s7t2ibowkgamyonguwv5-138630195296.europe-west2.run.app';
  const hostHeader = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
  const protoHeader = req.headers?.['x-forwarded-proto'] || 'https';
  
  let baseUrl = defaultPublicUrl;
  if (hostHeader && !hostHeader.includes('localhost') && !hostHeader.includes('127.0.0.1') && !hostHeader.includes('0.0.0.0')) {
    baseUrl = `${protoHeader}://${hostHeader}`;
  }

  const inline_keyboard: any[][] = [];
  const actionRow: any[] = [];
  if (mapsUrl && !mapsUrl.includes('localhost')) actionRow.push({ text: '📍 موقع العميل (GPS)', url: mapsUrl });
  if (waGeneralUrl) actionRow.push({ text: '💬 فتح واتساب العميل الآن', url: waGeneralUrl });
  if (actionRow.length > 0) inline_keyboard.push(actionRow);

  inline_keyboard.push([
    { text: '✅ قبول الطلب', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=accepted` },
    { text: '❌ رفض الطلب', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=cancelled` }
  ]);
  inline_keyboard.push([
    { text: '🚗 الفني بالطريق', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=on_the_way` },
    { text: '🏁 تم الإنجاز', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(bId)}&status=completed` }
  ]);

  const sanitizedKeyboard: any[][] = [];
  for (const row of inline_keyboard) {
    const validRow = row.filter((btn: any) => {
      if (!btn || !btn.url || typeof btn.url !== 'string') return false;
      const u = btn.url.trim();
      return (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('tg://')) &&
             !u.includes('localhost') && !u.includes('127.0.0.1') && !u.startsWith('tel:');
    });
    if (validRow.length > 0) sanitizedKeyboard.push(validRow);
  }

  const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

  let tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: adminChatId,
      text: messageText,
      parse_mode: 'HTML',
      ...(sanitizedKeyboard.length > 0 ? { reply_markup: { inline_keyboard: sanitizedKeyboard } } : {})
    })
  });

  let result = await tgRes.json();

  if (!result || !result.ok) {
    const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: messageText.replace(/<[^>]*>/g, '')
      })
    });
    result = await fallbackRes.json();
  }

  // Trigger FCM in background
  sendFcmNotification({
    title: 'حجز صيانة جديد 🚗',
    body: `وصل طلب صيانة جديد #${bId} (${car}). اضغط لعرض تفاصيل الحجز.`,
    url: `/admin`,
    bookingId: bId,
    eventType: 'new_booking'
  }).catch(err => console.warn('[FCM dispatch error]:', err));

  return { ok: true, result };
}

async function handleReviewNotification(review: any) {
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
    body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML' })
  });

  const result = await tgRes.json();

  sendFcmNotification({
    title: 'تقييم جديد في DR.FIX ⭐',
    body: `وصل تقييم جديد (${review?.rating || 5}/5 نجوم). اضغط لمشاهدة التقييم.`,
    url: '/admin',
    eventType: 'review'
  }).catch(err => console.warn('[FCM review dispatch error]:', err));

  return { ok: true, result };
}

async function handleVisitNotification(visit: any) {
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
    body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard } })
  });

  const result = await tgRes.json();
  return { ok: true, result };
}

async function handleCustomerRegistrationNotification(payload: any) {
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
          { text: '💬 محادثة واتساب العميل', url: `https://wa.me/${intPhone}` }
        ]
      ]
    };
  }

  const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

  let response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: adminChatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    })
  });

  let result = await response.json();
  if (!result || !result.ok) {
    const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: text.replace(/<[^>]*>/g, '')
      })
    });
    result = await fallbackRes.json();
  }

  return { ok: true, result };
}

// -------------------------------------------------------------
// MAIN NOTIFY ROUTER
// -------------------------------------------------------------
export default async function notifyHandler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    const fullUrl = req.originalUrl || req.url || '';
    const queryChannel = req.query?.channel || '';

    // Route determination: channel query param OR URL path OR payload signature
    let channel = String(queryChannel).toLowerCase();

    if (!channel) {
      if (fullUrl.includes('notify-booking') || fullUrl.includes('booking')) channel = 'booking';
      else if (fullUrl.includes('notify-review') || fullUrl.includes('review')) channel = 'review';
      else if (fullUrl.includes('notify-visit') || fullUrl.includes('visit')) channel = 'visit';
      else if (fullUrl.includes('customer-registration') || fullUrl.includes('registration')) channel = 'customer-registration';
      else if (fullUrl.includes('fcm-notify') || fullUrl.includes('fcm')) channel = 'fcm';
      // Inferred by body
      else if (payload?.rating !== undefined) channel = 'review';
      else if (payload?.source !== undefined || (payload?.email && payload?.car)) channel = 'customer-registration';
      else if (payload?.bookingId) channel = 'booking';
      else if (payload?.serviceType) channel = 'visit';
      else if (payload?.title && payload?.body) channel = 'fcm';
      else channel = 'booking';
    }

    if (channel === 'booking') {
      if (!payload || !payload.bookingId) {
        return res.status(400).json({ ok: false, message: 'Missing booking ID' });
      }
      const outcome = await handleBookingNotification(payload, req);
      return res.status(200).json(outcome);
    }

    if (channel === 'review') {
      const outcome = await handleReviewNotification(payload);
      return res.status(200).json(outcome);
    }

    if (channel === 'visit') {
      const outcome = await handleVisitNotification(payload);
      return res.status(200).json(outcome);
    }

    if (channel === 'customer-registration' || channel === 'registration') {
      const outcome = await handleCustomerRegistrationNotification(payload);
      return res.status(200).json(outcome);
    }

    if (channel === 'fcm') {
      const outcome = await sendFcmNotification(payload);
      return res.status(200).json(outcome);
    }

    return res.status(400).json({ ok: false, message: 'Unknown notification channel' });
  } catch (error: any) {
    console.error('[Notify Router Error]:', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
