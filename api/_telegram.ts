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

export async function callTelegramApi(method: string, payload: Record<string, any>) {
  try {
    const token = (process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN).trim();
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
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
  processedBookingIds.add(booking.bookingId);

  const cleanPhone = (booking.customerPhone || '').replace(/\D/g, '');
  const internationalPhone = cleanPhone ? (cleanPhone.startsWith('966') ? cleanPhone : '966' + cleanPhone.replace(/^0/, '')) : '';
  const waLink = internationalPhone ? `https://wa.me/${internationalPhone}` : null;
  
  let mapsUrl = '';
  if (booking.coordinates?.latitude && booking.coordinates?.longitude) {
    mapsUrl = `https://www.google.com/maps?q=${booking.coordinates.latitude},${booking.coordinates.longitude}`;
  } else if (booking.location) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location + ' جدة')}`;
  } else {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('جدة المملكة العربية السعودية')}`;
  }

  const messageText = `🔔 *حجز جديد في DR.FIX* 🚗⚡\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔖 *رقم الحجز:* \`${booking.bookingId}\`\n` +
    `👤 *العميل:* ${booking.customerName || 'عميل DR.FIX'}\n` +
    `📱 *الجوال:* \`${booking.customerPhone || 'غير متوفر'}\`\n` +
    `🚘 *السيارة:* ${booking.carModel || 'غير محدد'}\n` +
    `🔧 *الخدمة:* ${booking.serviceType || 'صيانة عامة'}\n` +
    `📅 *التاريخ:* ${booking.serviceDate || new Date().toLocaleDateString('ar-SA')}\n` +
    `📍 *الموقع:* ${booking.location || (booking.coordinates ? 'إحداثيات GPS مرفقة' : 'جدة')}\n` +
    (booking.notes ? `📝 *ملاحظات العميل:* ${booking.notes}\n` : '') +
    `⏱️ *وقت الحجز:* ${new Date().toLocaleTimeString('ar-SA')}\n` +
    `📊 *الحالة:* 🆕 جديد\n` +
    `━━━━━━━━━━━━━━━━━━`;

  const inline_keyboard: any[][] = [];

  // Row 1: Action Links (Maps & WhatsApp)
  const actionRow: any[] = [];
  if (mapsUrl) {
    actionRow.push({ text: '📍 موقع العميل', url: mapsUrl });
  }
  if (waLink) {
    actionRow.push({ text: '💬 واتساب العميل', url: waLink });
  }
  if (actionRow.length > 0) inline_keyboard.push(actionRow);

  // Row 2: Status Controls (Accept & Reject)
  inline_keyboard.push([
    { text: '✅ قبول الحجز', callback_data: `act_accept_${booking.bookingId}` },
    { text: '❌ رفض الحجز', callback_data: `act_reject_${booking.bookingId}` }
  ]);

  // Row 3: Progress Controls
  inline_keyboard.push([
    { text: '🚗 الفني بالطريق', callback_data: `act_onway_${booking.bookingId}` },
    { text: '🏁 تم الإنجاز', callback_data: `act_done_${booking.bookingId}` }
  ]);

  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();

  return await callTelegramApi('sendMessage', {
    chat_id: adminChatId,
    text: messageText,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard }
  });
}

export async function sendReviewNotification(review: { name: string; rating: number; comment: string; phone?: string }) {
  const stars = '⭐'.repeat(Math.min(5, Math.max(1, review.rating || 5)));
  const text = `🌟 *تقييم جديد في DR.FIX*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 *العميل:* ${review.name || 'زائر'}\n` +
    `⭐ *التقييم:* ${stars} (${review.rating || 5}/5)\n` +
    `💬 *التعليق:* ${review.comment || 'لا يوجد نص'}\n` +
    (review.phone ? `📱 *الجوال:* \`${review.phone}\`\n` : '') +
    `⏱️ *الوقت:* ${new Date().toLocaleString('ar-SA')}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  const adminChatId = (process.env.TELEGRAM_ADMIN_ID || TELEGRAM_ADMIN_ID).trim();

  return await callTelegramApi('sendMessage', {
    chat_id: adminChatId,
    text,
    parse_mode: 'Markdown'
  });
}

export async function sendVisitNotification(visit: { customerName?: string; customerPhone: string; serviceType?: string; location?: string; notes?: string }) {
  const text = `🚨 *طلب زيارة / طوارئ جديد في DR.FIX*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 *العميل:* ${visit.customerName || 'عميل'}\n` +
    `📱 *الجوال:* \`${visit.customerPhone}\`\n` +
    `🔧 *نوع الخدمة:* ${visit.serviceType || 'فحص سريع'}\n` +
    `📍 *الموقع:* ${visit.location || 'جدة'}\n` +
    (visit.notes ? `📝 *الملاحظات:* ${visit.notes}\n` : '') +
    `⏱️ *الوقت:* ${new Date().toLocaleString('ar-SA')}\n` +
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
    parse_mode: 'Markdown',
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
            statusArabic = 'تم الإنجاز بنجاح 🏁';
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
          ? `${statusIcon} تم تحديث حالة الحجز (${bookingId}) إلى: ${statusArabic}`
          : `⚠️ تم تسجيل التحديث: ${statusArabic}`;

        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: answerText,
          show_alert: true
        });

        // Edit original message text if possible to reflect new status
        if (cb.message?.text) {
          const updatedText = cb.message.text.replace(/📊 \*الحالة:\* .*/, `📊 *الحالة:* ${statusArabic} (تم التحديث)`);
          await callTelegramApi('editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: updatedText,
            parse_mode: 'Markdown',
            reply_markup: cb.message.reply_markup
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
          text: `🆔 *معلومات حسابك في تيليجرام:*\n\n` +
            `• *Telegram ID:* \`${fromId}\`\n` +
            `• *الاسم:* ${firstName}\n` +
            `• *حالة الإدارة:* ${isAuthorizedAdmin(fromId) ? '✅ مشرف معتمد' : '👤 مستخدم عادي'}\n\n` +
            `إذا كنت صاحب الموقع، تأكد من تعيين هذا المعرف في \`TELEGRAM_ADMIN_ID\`.`,
          parse_mode: 'Markdown'
        });
        return { ok: true };
      }

      if (command === '/help' || command === 'مساعدة') {
        const isAuth = isAuthorizedAdmin(fromId);
        const helpText = `🛠️ *أوامر بوت DR.FIX:*\n\n` +
          `• /start أو /menu - فتح القائمة الرئيسية والأزرار التفاعلية\n` +
          `• /bookings - عرض الحجوزات وإدارتها\n` +
          `• /stats - إحصائيات وتقارير الحجوزات والتقييمات\n` +
          `• /notifications - مركز التنبيهات\n` +
          `• /id - معرفة رقم الـ Telegram ID الخاص بك\n\n` +
          `🔒 *صلاحية الإدارة:* ${isAuth ? 'مفعلة لحسابك ✅' : 'غير مفعلة (معرفك: ' + fromId + ')'}\n` +
          `🌐 *الموقع الرسمي:* https://www.drfix.repair`;
        await callTelegramApi('sendMessage', { chat_id: chatId, text: helpText, parse_mode: 'Markdown' });
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
  const name = firstName || 'بك';

  const menuText = `🚗⚡ *أهلاً ${name} في DR.FIX - ميكانيكي متنقل في جدة*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `خدمة صيانة وفحص وبرمجة السيارات على مدار 24 ساعة في أي مكان بجدة.\n\n` +
    `📱 *معرفك في تيليجرام:* \`${fromId || chatId}\`\n` +
    `🔒 *حالة الصلاحية:* ${isAuth ? '✅ لوحة المشرف مفعلة' : '👤 وضع العميل / المشرف'}\n\n` +
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
    parse_mode: 'Markdown',
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
        text: '📋 *لا توجد حجوزات مسجلة حالياً في قاعدة البيانات.*',
        parse_mode: 'Markdown',
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

    let text = `📋 *قائمة الحجوزات (صفحة ${currentPage} من ${totalPages}):*\n━━━━━━━━━━━━━━━━━━\n\n`;

    currentBookings.forEach((b, idx) => {
      const bId = b.bookingId || b.id;
      let statusLabel = '🆕 جديد';
      if (b.status === 'accepted') statusLabel = '✅ مقبول';
      if (b.status === 'on_the_way') statusLabel = '🚗 الفني بالطريق';
      if (b.status === 'completed') statusLabel = '🏁 تم الإنجاز';
      if (b.status === 'cancelled') statusLabel = '❌ ملغى';

      text += `*${startIndex + idx + 1}. حجز:* \`${bId}\`\n` +
        `👤 *العميل:* ${b.customerName || 'عميل'}\n` +
        `📱 *الجوال:* \`${b.customerPhone || 'غير متوفر'}\`\n` +
        `🚘 *السيارة:* ${b.carModel || 'غير محدد'}\n` +
        `🔧 *الخدمة:* ${b.serviceType || 'صيانة'}\n` +
        `📅 *الموعد:* ${b.serviceDate || 'غير محدد'}\n` +
        `📊 *الحالة:* ${statusLabel}\n` +
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
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text: '⚠️ حدث خطأ أثناء جلب الحجوزات من قاعدة البيانات.',
      parse_mode: 'Markdown'
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

    const text = `📊 *تقرير إحصائيات DR.FIX* 🚗⚡\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 *حجوزات اليوم:* ${todayTotal}\n` +
      `📈 *إجمالي الحجوزات المسجلة:* ${total}\n\n` +
      `📌 *تفاصيل الحالات:*\n` +
      `• 🆕 جديدة بانتظار الإجراء: ${newCount}\n` +
      `• ✅ مقبولة: ${accepted}\n` +
      `• 🚗 الفني بالطريق: ${onTheWay}\n` +
      `• 🏁 مكتملة بنجاح: ${completed}\n` +
      `• ❌ ملغاة / مرفوضة: ${cancelled}\n\n` +
      `⭐ *التقييمات:* ${avgRating} / 5 (${reviewsCount} تقييم)\n` +
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
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
  } catch (error) {
    console.error('Error computing stats:', error);
    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text: '⚠️ تعذر حساب الإحصائيات في الوقت الحالي.',
      parse_mode: 'Markdown'
    });
  }
}

async function sendRecentNotifications(chatId: string | number) {
  try {
    const text = `🔔 *مركز الإشعارات المباشرة DR.FIX*\n` +
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
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
  } catch (error) {
    console.error('Error sending notifications feed:', error);
  }
}
