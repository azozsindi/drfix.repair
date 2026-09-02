// Pure lightweight Firestore REST helper (Zero npm dependency issues on Vercel Serverless)
const FIREBASE_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hr-system-2026',
  databaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixremixdrfix-e1e9871e-7d4a-4013-91c4-cbaa38ac0601',
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyCSHgY3CAhV7ZLDZL2GkIOZhmbD2pK0J7g'
};

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE').trim();
const TELEGRAM_ADMIN_ID = (process.env.TELEGRAM_ADMIN_ID || '867105778').trim();

// Track sent booking IDs in memory to avoid duplicate alerts
const processedBookingIds = new Set<string>();

export function escapeHtml(text: any): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatSaudiPhone(phone: string | undefined | null): string {
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

export async function callTelegramApi(method: string, payload: Record<string, any>) {
  try {
    const token = (process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN).trim();
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    
    // If HTML parsing failed for some reason, retry as plain text without parse_mode
    if (!result.ok && payload.parse_mode && payload.text) {
      console.warn(`Telegram API call with ${payload.parse_mode} failed, retrying plain text:`, result.description);
      const plainPayload = { ...payload };
      delete plainPayload.parse_mode;
      plainPayload.text = String(payload.text).replace(/<[^>]*>/g, '');
      const retryResponse = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plainPayload)
      });
      return await retryResponse.json();
    }

    return result;
  } catch (error) {
    console.error(`Telegram API Error (${method}):`, error);
    return { ok: false, description: String(error) };
  }
}

export function isAuthorizedAdmin(userId: string | number | undefined | null): boolean {
  if (!userId) return false;
  const adminId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();
  if (!adminId) return true; // If not configured, allow all
  const userStr = String(userId).trim();
  // Support comma-separated admin IDs if multiple
  const adminList = adminId.split(',').map(s => s.trim());
  return adminList.includes(userStr);
}

// Convert Firestore document format to clean JS object
function parseFirestoreDocument(doc: any) {
  if (!doc || !doc.fields) return { id: doc?.name?.split('/').pop() || '' };
  const data: Record<string, any> = { id: doc.name?.split('/').pop() || '' };
  for (const [key, val] of Object.entries(doc.fields as Record<string, any>)) {
    if (val.stringValue !== undefined) data[key] = val.stringValue;
    else if (val.integerValue !== undefined) data[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) data[key] = Number(val.doubleValue);
    else if (val.booleanValue !== undefined) data[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) data[key] = val.timestampValue;
    else if (val.nullValue !== undefined) data[key] = null;
    else if (val.mapValue !== undefined) data[key] = val.mapValue.fields;
    else data[key] = val;
  }
  return data;
}

// Fetch documents from Firestore using REST API
export async function getFirestoreDocuments(collectionName: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/${collectionName}?key=${FIREBASE_CONFIG.apiKey}&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Firestore REST fetch failed (${res.status}):`, await res.text());
      return [];
    }
    const json = await res.json();
    if (!json.documents || !Array.isArray(json.documents)) return [];
    return json.documents.map(parseFirestoreDocument);
  } catch (err) {
    console.error('Error fetching Firestore documents:', err);
    return [];
  }
}

// Update single document field via Firestore REST API
export async function updateFirestoreDocumentField(collectionName: string, docId: string, fieldsToUpdate: Record<string, string>) {
  try {
    const updateMask = Object.keys(fieldsToUpdate).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/${collectionName}/${encodeURIComponent(docId)}?key=${FIREBASE_CONFIG.apiKey}&${updateMask}`;
    
    const formattedFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(fieldsToUpdate)) {
      formattedFields[k] = { stringValue: String(v) };
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: formattedFields })
    });
    return res.ok;
  } catch (err) {
    console.error('Error patching Firestore document:', err);
    return false;
  }
}

export interface BookingPayload {
  bookingId: string;
  customerName?: string;
  customerPhone: string;
  carModel: string;
  serviceType: string;
  notes?: string;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  serviceDate?: string;
  status?: string;
  createdAt?: string;
  cost?: number | string;
}

export async function sendBookingNotification(booking: BookingPayload) {
  if (!booking || !booking.bookingId) {
    return { ok: false, description: 'Missing booking ID' };
  }

  // Prevent duplicate Telegram notifications for the same bookingId
  if (processedBookingIds.has(booking.bookingId)) {
    console.log(`Notification for booking ${booking.bookingId} already sent. Skipping duplicate.`);
    return { ok: true, duplicate: true };
  }

  const internationalPhone = formatSaudiPhone(booking.customerPhone);
  const waLink = internationalPhone ? `https://wa.me/${internationalPhone}` : null;
  
  let mapsUrl = '';
  if (booking.coordinates?.latitude && booking.coordinates?.longitude) {
    mapsUrl = `https://www.google.com/maps?q=${booking.coordinates.latitude},${booking.coordinates.longitude}`;
  } else if (booking.location) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location + ' جدة')}`;
  } else {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('جدة المملكة العربية السعودية')}`;
  }

  const safeBookingId = escapeHtml(booking.bookingId);
  const safeCustomerName = escapeHtml(booking.customerName || 'عميل DR.FIX');
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

  const host = process.env.APP_URL || 'ais-dev-67s7t2ibowkgamyonguwv5-138630195296.europe-west2.run.app';
  const baseUrl = host.startsWith('http') ? host : `https://${host}`;

  const inline_keyboard: any[][] = [];

  // Row 1: Action Links (Maps & WhatsApp)
  const actionRow: any[] = [];
  if (mapsUrl) {
    actionRow.push({ text: '📍 موقع العميل', url: mapsUrl });
  }
  if (waLink) {
    actionRow.push({ text: '💬 فتح واتساب العميل الآن', url: waLink });
  }
  if (actionRow.length > 0) inline_keyboard.push(actionRow);

  // Row 2: Status Controls (Accept & Reject)
  inline_keyboard.push([
    { text: '✅ قبول الطلب', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(booking.bookingId)}&status=accepted` },
    { text: '❌ رفض الطلب', callback_data: `act_reject_${booking.bookingId}` }
  ]);

  // Row 3: Progress Controls
  inline_keyboard.push([
    { text: '🚗 الفني بالطريق', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(booking.bookingId)}&status=on_the_way` },
    { text: '🏁 تم الإنجاز', url: `${baseUrl}/api/status-redirect?id=${encodeURIComponent(booking.bookingId)}&status=completed` }
  ]);

  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();

  const sendResult = await callTelegramApi('sendMessage', {
    chat_id: adminChatId,
    text: messageText,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard }
  });

  if (sendResult && sendResult.ok) {
    processedBookingIds.add(booking.bookingId);
  }

  return sendResult;
}

export async function sendReviewNotification(review: { name: string; rating: number; comment: string; phone?: string }) {
  const stars = '⭐'.repeat(Math.min(5, Math.max(1, review.rating || 5)));
  const safeName = escapeHtml(review.name || 'زائر');
  const safeComment = escapeHtml(review.comment || 'لا يوجد نص');
  const safePhone = review.phone ? escapeHtml(review.phone) : '';
  const safeTime = escapeHtml(new Date().toLocaleString('ar-SA'));

  const text = `🌟 <b>تقييم جديد في DR.FIX</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>العميل:</b> ${safeName}\n` +
    `⭐ <b>التقييم:</b> ${stars} (${review.rating || 5}/5)\n` +
    `💬 <b>التعليق:</b> ${safeComment}\n` +
    (safePhone ? `📱 <b>الجوال:</b> <code>${safePhone}</code>\n` : '') +
    `⏱️ <b>الوقت:</b> ${safeTime}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();

  return await callTelegramApi('sendMessage', {
    chat_id: adminChatId,
    text,
    parse_mode: 'HTML'
  });
}

export async function sendVisitNotification(visit: { customerName?: string; customerPhone: string; serviceType?: string; location?: string; notes?: string }) {
  const safeName = escapeHtml(visit.customerName || 'عميل');
  const safePhone = escapeHtml(visit.customerPhone || 'غير متوفر');
  const safeServiceType = escapeHtml(visit.serviceType || 'فحص سريع');
  const safeLocation = escapeHtml(visit.location || 'جدة');
  const safeNotes = visit.notes ? escapeHtml(visit.notes) : '';
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

  const cleanPhone = (visit.customerPhone || '').replace(/\D/g, '');
  const internationalPhone = cleanPhone ? (cleanPhone.startsWith('966') ? cleanPhone : '966' + cleanPhone.replace(/^0/, '')) : '';
  const waLink = internationalPhone ? `https://wa.me/${internationalPhone}` : null;

  const inline_keyboard: any[][] = [
    [
      { text: '📍 موقع البلاغ', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((visit.location || '') + ' جدة')}` }
    ]
  ];
  if (waLink) {
    inline_keyboard[0].unshift({ text: '💬 تواصل واتساب', url: waLink });
  }

  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();

  return await callTelegramApi('sendMessage', {
    chat_id: adminChatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard }
  });
}

export async function handleTelegramWebhook(update: any) {
  try {
    const adminChatId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();

    // 1. Handle Callback Queries (Buttons)
    if (update.callback_query) {
      const cb = update.callback_query;
      const fromId = cb.from?.id;
      const data = cb.data || '';
      const targetChat = cb.message?.chat?.id || fromId || adminChatId;

      // Check admin permissions for action buttons
      const isAuth = isAuthorizedAdmin(fromId);

      // Handle Quick Menu Navigation
      if (data === 'menu_start' || data === 'menu_main') {
        await sendMainMenu(targetChat, fromId, cb.from?.first_name);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data === 'menu_bookings') {
        await sendBookingsList(targetChat, 1);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data === 'menu_stats') {
        await sendStatsReport(targetChat);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data === 'menu_notifications') {
        await sendRecentNotifications(targetChat);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data.startsWith('page_bookings_')) {
        const page = parseInt(data.replace('page_bookings_', ''), 10) || 1;
        await sendBookingsList(targetChat, page);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      // Handle Booking Status Updates (Requires Admin)
      if (data.startsWith('act_')) {
        if (!isAuth) {
          await callTelegramApi('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '⛔ غير مصرح لك بتعديل حالة الحجز.',
            show_alert: true
          });
          return { ok: true };
        }

        const parts = data.split('_');
        const action = parts[1]; // accept, reject, onway, done
        const bookingId = parts.slice(2).join('_');

        let newStatus = '';
        let statusArabic = '';
        let statusIcon = '';

        switch (action) {
          case 'accept':
            newStatus = 'accepted';
            statusArabic = 'مقبول ✅';
            statusIcon = '✅';
            break;
          case 'reject':
            newStatus = 'cancelled';
            statusArabic = 'مرفوض / ملغى ❌';
            statusIcon = '❌';
            break;
          case 'onway':
            newStatus = 'on_the_way';
            statusArabic = 'الفني بالطريق 🚗';
            statusIcon = '🚗';
            break;
          case 'done':
            newStatus = 'completed';
            statusArabic = 'تم الإنجاز 🏁';
            statusIcon = '🏁';
            break;
          default:
            newStatus = action;
            statusArabic = action;
        }

        // Update in Firestore
        let updateSuccess = false;
        try {
          const docs = await getFirestoreDocuments('maintenance');
          let targetDocId = null;
          for (const d of docs) {
            if (d.bookingId === bookingId || d.id === bookingId) {
              targetDocId = d.id;
              break;
            }
          }
          if (targetDocId) {
            updateSuccess = await updateFirestoreDocumentField('maintenance', targetDocId, {
              status: newStatus,
              updatedAt: new Date().toISOString(),
              updatedBy: `Telegram Admin (${fromId})`
            });
          }
        } catch (e) {
          console.error('Error updating status in Firestore:', e);
        }

        const answerText = updateSuccess
          ? `${statusIcon} تم تحديث حالة الحجز إلى: ${statusArabic}`
          : `⚠️ تم تسجيل التحديث: ${statusArabic}`;

        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: answerText,
          show_alert: false
        });

        // Edit original message text directly to reflect updated status
        if (cb.message?.text) {
          let customerPhone = '';
          const phoneMatch = cb.message.text.match(/(?:الجوال:|📱)\s*(?:<b>)?(?:<code>)?([0-9+\s]+)(?:<\/code>)?/);
          if (phoneMatch) {
            customerPhone = phoneMatch[1].trim();
          }

          const cleanPhone = formatSaudiPhone(customerPhone);
          const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

          let mapsUrl = '';
          if (cb.message?.reply_markup?.inline_keyboard) {
            for (const row of cb.message.reply_markup.inline_keyboard) {
              for (const btn of row) {
                if (btn.text && (btn.text.includes('موقع') || btn.text.includes('GPS')) && btn.url) {
                  mapsUrl = btn.url;
                  break;
                }
              }
            }
          }

          const inline_keyboard: any[][] = [];
          const actionRow: any[] = [];
          if (mapsUrl) actionRow.push({ text: '📍 موقع العميل', url: mapsUrl });
          if (waUrl) actionRow.push({ text: '💬 فتح واتساب العميل الآن', url: waUrl });
          if (actionRow.length > 0) inline_keyboard.push(actionRow);

          inline_keyboard.push([
            { text: '✅ قبول الطلب', callback_data: `act_accept_${bookingId}` },
            { text: '❌ رفض الطلب', callback_data: `act_reject_${bookingId}` }
          ]);
          inline_keyboard.push([
            { text: '🚗 الفني بالطريق', callback_data: `act_onway_${bookingId}` },
            { text: '🏁 تم الإنجاز', callback_data: `act_done_${bookingId}` }
          ]);

          let updatedText = cb.message.text;
          if (/📊\s*(?:<b>)?الحالة:(?:<\/b>)?/.test(updatedText)) {
            updatedText = updatedText.replace(/📊\s*(?:<b>)?الحالة:(?:<\/b>)?\s*.*/, `📊 <b>الحالة:</b> ${statusArabic}`);
          } else if (/الحالة:/.test(updatedText)) {
            updatedText = updatedText.replace(/الحالة:\s*.*/, `الحالة: ${statusArabic}`);
          } else {
            updatedText += `\n📊 <b>الحالة:</b> ${statusArabic}`;
          }

          await callTelegramApi('editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: updatedText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard }
          });
        }

        return { ok: true };
      }

      await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
      return { ok: true };
    }

    // 2. Handle Text Messages and Commands
    if (update.message && (update.message.text || update.message.caption)) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const fromId = msg.from?.id;
      const firstName = msg.from?.first_name || 'عزيزي العميل';
      const rawText = (msg.text || msg.caption || '').trim();
      const command = rawText.split(' ')[0].toLowerCase().replace(/@.+$/, ''); // strip bot username

      // Commands accessible to everyone or admin
      if (command === '/start' || command === 'start' || command === '/menu' || command === 'menu' || rawText === 'مرحبا' || rawText === 'هلا' || rawText === 'السلام عليكم') {
        await sendMainMenu(chatId, fromId, firstName);
        return { ok: true };
      }

      if (command === '/bookings' || command === 'حجوزات' || command === 'الحجوزات') {
        await sendBookingsList(chatId, 1);
        return { ok: true };
      }

      if (command === '/stats' || command === 'احصائيات' || command === 'تقرير') {
        await sendStatsReport(chatId);
        return { ok: true };
      }

      if (command === '/notifications' || command === 'اشعارات') {
        await sendRecentNotifications(chatId);
        return { ok: true };
      }

      if (command === '/id' || command === 'معرفي') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: `🆔 <b>معلومات حسابك في تيليجرام:</b>\n\n` +
            `• <b>Telegram ID:</b> <code>${escapeHtml(fromId)}</code>\n` +
            `• <b>الاسم:</b> ${escapeHtml(firstName)}\n` +
            `• <b>حالة الإدارة:</b> ${isAuthorizedAdmin(fromId) ? '✅ مشرف معتمد' : '👤 مستخدم عادي'}\n\n` +
            `إذا كنت صاحب الموقع، تأكد من تعيين هذا المعرف في <code>TELEGRAM_ADMIN_ID</code>.`,
          parse_mode: 'HTML'
        });
        return { ok: true };
      }

      if (command === '/help' || command === 'مساعدة') {
        const isAuth = isAuthorizedAdmin(fromId);
        const helpText = `🛠️ <b>أوامر بوت DR.FIX:</b>\n\n` +
          `• /start أو /menu - فتح القائمة الرئيسية والأزرار التفاعلية\n` +
          `• /bookings - عرض الحجوزات وإدارتها\n` +
          `• /stats - إحصائيات وتقارير الحجوزات والتقييمات\n` +
          `• /notifications - مركز التنبيهات\n` +
          `• /id - معرفة رقم الـ Telegram ID الخاص بك\n\n` +
          `🔒 <b>صلاحية الإدارة:</b> ${isAuth ? 'مفعلة لحسابك ✅' : 'غير مفعلة (معرفك: ' + escapeHtml(fromId) + ')'}\n` +
          `🌐 <b>الموقع الرسمي:</b> https://www.drfix.repair`;
        await callTelegramApi('sendMessage', { chat_id: chatId, text: helpText, parse_mode: 'HTML' });
        return { ok: true };
      }

      // Default fallback: Always reply with the interactive menu
      await sendMainMenu(chatId, fromId, firstName);
      return { ok: true };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error in handleTelegramWebhook:', error);
    return { ok: false, error: String(error) };
  }
}

async function sendMainMenu(chatId: string | number, fromId?: string | number, firstName?: string) {
  const isAuth = isAuthorizedAdmin(fromId);
  const name = escapeHtml(firstName || 'بك');

  const menuText = `🚗⚡ <b>أهلاً ${name} في DR.FIX - ميكانيكي متنقل في جدة</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `خدمة صيانة وفحص وبرمجة السيارات على مدار 24 ساعة في أي مكان بجدة.\n\n` +
    `📱 <b>معرفك في تيليجرام:</b> <code>${escapeHtml(fromId || chatId)}</code>\n` +
    `🔒 <b>حالة الصلاحية:</b> ${isAuth ? '✅ لوحة المشرف مفعلة' : '👤 وضع العميل / المشرف'}\n\n` +
    `اختر الإجراء المطلوب من الأزرار أدناه:`;

  const inline_keyboard: any[][] = [];

  if (isAuth) {
    inline_keyboard.push([
      { text: '📋 الحجوزات الحالية', callback_data: 'menu_bookings' },
      { text: '📊 الإحصائيات والتقارير', callback_data: 'menu_stats' }
    ]);
    inline_keyboard.push([
      { text: '🔔 مركز الإشعارات', callback_data: 'menu_notifications' },
      { text: '🌐 فتح لوحة الموقع', url: 'https://www.drfix.repair' }
    ]);
  } else {
    inline_keyboard.push([
      { text: '📋 استعراض الحجوزات', callback_data: 'menu_bookings' },
      { text: '📊 الإحصائيات العامة', callback_data: 'menu_stats' }
    ]);
    inline_keyboard.push([
      { text: '🌐 زيارة الموقع الرسمي', url: 'https://www.drfix.repair' },
      { text: '💬 تواصل فوري واتساب', url: 'https://wa.me/966548545802' }
    ]);
  }

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: menuText,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard }
  });
}

async function sendBookingsList(chatId: string | number, page = 1) {
  try {
    const allBookings = await getFirestoreDocuments('maintenance');

    // Sort by createdAt / date descending
    allBookings.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.serviceDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.serviceDate || 0).getTime();
      return timeB - timeA;
    });

    if (allBookings.length === 0) {
      await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: '📋 <b>لا توجد حجوزات مسجلة حالياً في قاعدة البيانات.</b>',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 القائمة الرئيسية', callback_data: 'menu_start' }]]
        }
      });
      return;
    }

    const pageSize = 5;
    const totalPages = Math.ceil(allBookings.length / pageSize);
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const currentBookings = allBookings.slice(startIndex, startIndex + pageSize);

    let text = `📋 <b>قائمة الحجوزات (صفحة ${currentPage} من ${totalPages}):</b>\n━━━━━━━━━━━━━━━━━━\n\n`;

    currentBookings.forEach((b, idx) => {
      const bId = escapeHtml(b.bookingId || b.id);
      let statusLabel = '🆕 جديد';
      if (b.status === 'accepted') statusLabel = '✅ مقبول';
      if (b.status === 'on_the_way') statusLabel = '🚗 الفني بالطريق';
      if (b.status === 'completed') statusLabel = '🏁 تم الإنجاز';
      if (b.status === 'cancelled') statusLabel = '❌ ملغى';

      text += `<b>${startIndex + idx + 1}. حجز:</b> <code>${bId}</code>\n` +
        `👤 <b>العميل:</b> ${escapeHtml(b.customerName || 'عميل')}\n` +
        `📱 <b>الجوال:</b> <code>${escapeHtml(b.customerPhone || 'غير متوفر')}</code>\n` +
        `🚘 <b>السيارة:</b> ${escapeHtml(b.carModel || 'غير محدد')}\n` +
        `🔧 <b>الخدمة:</b> ${escapeHtml(b.serviceType || 'صيانة')}\n` +
        `📅 <b>الموعد:</b> ${escapeHtml(b.serviceDate || 'غير محدد')}\n` +
        `📊 <b>الحالة:</b> ${statusLabel}\n` +
        `━━━━━━━━━━━━━━━━━━\n`;
    });

    const inline_keyboard: any[][] = [];

    // Quick action buttons for the top booking
    if (currentBookings.length > 0) {
      const topB = currentBookings[0];
      const topId = topB.bookingId || topB.id;
      inline_keyboard.push([
        { text: `✅ قبول #${topId.slice(-4)}`, callback_data: `act_accept_${topId}` },
        { text: `🚗 بالطريق #${topId.slice(-4)}`, callback_data: `act_onway_${topId}` },
        { text: `🏁 إنجاز #${topId.slice(-4)}`, callback_data: `act_done_${topId}` }
      ]);
    }

    // Pagination Row
    const navRow: any[] = [];
    if (currentPage > 1) {
      navRow.push({ text: '⬅️ السابق', callback_data: `page_bookings_${currentPage - 1}` });
    }
    if (currentPage < totalPages) {
      navRow.push({ text: 'التالي ➡️', callback_data: `page_bookings_${currentPage + 1}` });
    }
    if (navRow.length > 0) inline_keyboard.push(navRow);

    inline_keyboard.push([
      { text: '🔙 القائمة الرئيسية', callback_data: 'menu_start' }
    ]);

    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text: '⚠️ حدث خطأ أثناء جلب الحجوزات من قاعدة البيانات.',
      parse_mode: 'HTML'
    });
  }
}

async function sendStatsReport(chatId: string | number) {
  try {
    const allBookings = await getFirestoreDocuments('maintenance');
    
    let total = 0;
    let newCount = 0;
    let accepted = 0;
    let onTheWay = 0;
    let completed = 0;
    let cancelled = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    let todayTotal = 0;

    allBookings.forEach(docData => {
      total++;
      const s = docData.status || 'new';
      if (s === 'new') newCount++;
      else if (s === 'accepted') accepted++;
      else if (s === 'on_the_way') onTheWay++;
      else if (s === 'completed') completed++;
      else if (s === 'cancelled') cancelled++;

      if (docData.serviceDate && String(docData.serviceDate).startsWith(todayStr)) {
        todayTotal++;
      } else if (docData.createdAt && String(docData.createdAt).startsWith(todayStr)) {
        todayTotal++;
      }
    });

    // Get reviews count
    let reviewsCount = 0;
    let totalStars = 0;
    try {
      const testimonials = await getFirestoreDocuments('testimonials');
      testimonials.forEach(d => {
        reviewsCount++;
        totalStars += Number(d.rating || 5);
      });
    } catch {}

    const avgRating = reviewsCount > 0 ? (totalStars / reviewsCount).toFixed(1) : '5.0';

    const text = `📊 <b>تقرير إحصائيات DR.FIX</b> 🚗⚡\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>حجوزات اليوم:</b> ${todayTotal}\n` +
      `📈 <b>إجمالي الحجوزات المسجلة:</b> ${total}\n\n` +
      `📌 <b>تفاصيل الحالات:</b>\n` +
      `• 🆕 جديدة بانتظار الإجراء: ${newCount}\n` +
      `• ✅ مقبولة: ${accepted}\n` +
      `• 🚗 الفني بالطريق: ${onTheWay}\n` +
      `• 🏁 مكتملة بنجاح: ${completed}\n` +
      `• ❌ ملغاة / مرفوضة: ${cancelled}\n\n` +
      `⭐ <b>التقييمات:</b> ${avgRating} / 5 (${reviewsCount} تقييم)\n` +
      `━━━━━━━━━━━━━━━━━━`;

    const inline_keyboard = [
      [
        { text: '📋 عرض الحجوزات', callback_data: 'menu_bookings' },
        { text: '🔙 القائمة الرئيسية', callback_data: 'menu_start' }
      ]
    ];

    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard }
    });
  } catch (error) {
    console.error('Error computing stats:', error);
    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text: '⚠️ تعذر حساب الإحصائيات في الوقت الحالي.',
      parse_mode: 'HTML'
    });
  }
}

async function sendRecentNotifications(chatId: string | number) {
  try {
    const text = `🔔 <b>مركز الإشعارات المباشرة DR.FIX</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `✅ يتم إرسال إشعارات فورية لكل من:\n` +
      `• الحجوزات الجديدة فور حفظها في Firebase\n` +
      `• تقييمات وآراء العملاء الجديدة\n` +
      `• طلبات الزيارة وفحص الطوارئ\n\n` +
      `📱 يتم تحديث حالة الحجز في الموقع فور النقر على أزرار البوت.\n` +
      `━━━━━━━━━━━━━━━━━━`;

    const inline_keyboard = [
      [
        { text: '📋 الحجوزات', callback_data: 'menu_bookings' },
        { text: '📊 الإحصائيات', callback_data: 'menu_stats' }
      ],
      [
        { text: '🔙 القائمة الرئيسية', callback_data: 'menu_start' }
      ]
    ];

    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard }
    });
  } catch (error) {
    console.error('Error sending notifications feed:', error);
  }
}
