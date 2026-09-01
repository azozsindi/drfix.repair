// DR.FIX - Telegram Webhook & Interactive Bot Handler
// Self-contained for Vercel & Node.js Serverless Execution

const DEFAULT_BOT_TOKEN = '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
const DEFAULT_ADMIN_ID = '867105778';

const FIREBASE_CONFIG = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'hr-system-2026',
  databaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixremixdrfix-e1e9871e-7d4a-4013-91c4-cbaa38ac0601',
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyCSHgY3CAhV7ZLDZL2GkIOZhmbD2pK0J7g'
};

function escapeHtml(text: any): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function callTelegramApi(method: string, payload: Record<string, any>) {
  try {
    const token = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    const url = `https://api.telegram.org/bot${token}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    // If HTML parsing failed, retry plain text
    if (!result.ok && payload.parse_mode && payload.text) {
      console.warn(`Telegram API call with ${payload.parse_mode} failed, retrying plain text:`, result.description);
      const plainPayload = { ...payload };
      delete plainPayload.parse_mode;
      plainPayload.text = String(payload.text).replace(/<[^>]*>/g, '');
      const retryResponse = await fetch(url, {
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

function isAuthorizedAdmin(userId: string | number | undefined | null): boolean {
  if (!userId) return false;
  const adminId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();
  if (!adminId) return true;
  const userStr = String(userId).trim();
  const adminList = adminId.split(',').map(s => s.trim());
  return adminList.includes(userStr);
}

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

async function getFirestoreDocuments(collectionName: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/${collectionName}?key=${FIREBASE_CONFIG.apiKey}&pageSize=100`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.documents || !Array.isArray(json.documents)) return [];
    return json.documents.map(parseFirestoreDocument);
  } catch (err) {
    console.error('Error fetching Firestore documents:', err);
    return [];
  }
}

async function updateFirestoreDocumentField(collectionName: string, docId: string, fieldsToUpdate: Record<string, string>) {
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

async function sendMainMenu(chatId: string | number, fromId?: string | number, firstName?: string) {
  const isAuth = isAuthorizedAdmin(fromId);
  const name = escapeHtml(firstName || 'بك');

  const menuText = `🚗⚡ <b>أهلاً ${name} في بوت DR.FIX - ميكانيكي متنقل في جدة</b>\n` +
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
      { text: '🌐 فتح الموقع الرسمي', url: 'https://www.drfix.repair' }
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
        `👤 <b>العميل:</b> ${escapeHtml(b.customerName || b.customerPhone || 'عميل')}\n` +
        `📱 <b>الجوال:</b> <code>${escapeHtml(b.customerPhone || 'غير متوفر')}</code>\n` +
        `🚘 <b>السيارة:</b> ${escapeHtml(b.carModel || 'غير محدد')}\n` +
        `🔧 <b>الخدمة:</b> ${escapeHtml(b.serviceType || 'صيانة')}\n` +
        `📅 <b>الموعد:</b> ${escapeHtml(b.serviceDate || 'اليوم')}\n` +
        `📊 <b>الحالة:</b> ${statusLabel}\n` +
        `━━━━━━━━━━━━━━━━━━\n`;
    });

    const inline_keyboard: any[][] = [];

    if (currentBookings.length > 0) {
      const topB = currentBookings[0];
      const topId = topB.bookingId || topB.id;
      inline_keyboard.push([
        { text: `✅ قبول #${topId.slice(-4)}`, callback_data: `act_accept_${topId}` },
        { text: `🚗 بالطريق #${topId.slice(-4)}`, callback_data: `act_onway_${topId}` },
        { text: `🏁 إنجاز #${topId.slice(-4)}`, callback_data: `act_done_${topId}` }
      ]);
    }

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
    console.error('Error in sendBookingsList:', error);
    await callTelegramApi('sendMessage', {
      chat_id: chatId,
      text: '⚠️ حدث خطأ أثناء جلب قائمة الحجوزات.',
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
    console.error('Error in sendStatsReport:', error);
  }
}

async function sendRecentNotifications(chatId: string | number) {
  const text = `🔔 <b>مركز الإشعارات المباشرة DR.FIX</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `✅ يتم إرسال إشعارات فورية لكل من:\n` +
    `• الحجوزات الجديدة فور تقديمها\n` +
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
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-telegram-bot-api-secret-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Health / Status / Setup Trigger
  if (req.method === 'GET') {
    const isSetup = req.query && (req.query.setup === '1' || req.query.setup === 'true' || req.query.action === 'setup');
    if (isSetup) {
      try {
        const botToken = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
        const webhookUrl = 'https://www.drfix.repair/api/telegram';
        const setRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl, drop_pending_updates: false })
        });
        const telegramSetResult = await setRes.json();
        return res.status(200).json({ ok: true, webhookUrl, telegramSetResult });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err?.message || String(err) });
      }
    }

    return res.status(200).json({
      ok: true,
      service: 'DR.FIX Telegram Inbound Webhook',
      status: 'active',
      method: req.method,
      adminId: DEFAULT_ADMIN_ID,
      timestamp: new Date().toISOString()
    });
  }

  // POST: Telegram Webhook Update Handler
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    let update = req.body;
    if (typeof update === 'string') {
      try { update = JSON.parse(update); } catch { update = null; }
    }

    if (!update) {
      return res.status(200).json({ ok: true, note: 'empty payload ignored' });
    }

    const adminChatId = (process.env.TELEGRAM_ADMIN_ID || DEFAULT_ADMIN_ID).trim();

    // 1. Handle Inline Keyboard Clicks (Callback Queries)
    if (update.callback_query) {
      const cb = update.callback_query;
      const fromId = cb.from?.id;
      const data = cb.data || '';
      const targetChat = cb.message?.chat?.id || fromId || adminChatId;
      const isAuth = isAuthorizedAdmin(fromId);

      if (data === 'menu_start' || data === 'menu_main') {
        await sendMainMenu(targetChat, fromId, cb.from?.first_name);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return res.status(200).json({ ok: true });
      }

      if (data === 'menu_bookings') {
        await sendBookingsList(targetChat, 1);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return res.status(200).json({ ok: true });
      }

      if (data === 'menu_stats') {
        await sendStatsReport(targetChat);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return res.status(200).json({ ok: true });
      }

      if (data === 'menu_notifications') {
        await sendRecentNotifications(targetChat);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return res.status(200).json({ ok: true });
      }

      if (data.startsWith('page_bookings_')) {
        const page = parseInt(data.replace('page_bookings_', ''), 10) || 1;
        await sendBookingsList(targetChat, page);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return res.status(200).json({ ok: true });
      }

      // Status updates
      if (data.startsWith('act_')) {
        if (!isAuth) {
          await callTelegramApi('answerCallbackQuery', {
            callback_query_id: cb.id,
            text: '⛔ غير مصرح لك بتعديل حالة الحجز.',
            show_alert: true
          });
          return res.status(200).json({ ok: true });
        }

        const parts = data.split('_');
        const action = parts[1];
        const bookingId = parts.slice(2).join('_');

        let newStatus = 'new';
        let statusArabic = 'مقبول ✅';
        let statusIcon = '✅';

        if (action === 'accept') {
          newStatus = 'accepted';
          statusArabic = 'مقبول ✅';
          statusIcon = '✅';
        } else if (action === 'reject') {
          newStatus = 'cancelled';
          statusArabic = 'مرفوض / ملغى ❌';
          statusIcon = '❌';
        } else if (action === 'onway') {
          newStatus = 'on_the_way';
          statusArabic = 'الفني بالطريق 🚗';
          statusIcon = '🚗';
        } else if (action === 'done') {
          newStatus = 'completed';
          statusArabic = 'تم الإنجاز بنجاح 🏁';
          statusIcon = '🏁';
        }

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
              updatedBy: `Telegram (${fromId})`
            });
          }
        } catch (e) {
          console.error('Error updating status:', e);
        }

        const answerText = updateSuccess
          ? `${statusIcon} تم تحديث حالة الحجز (${bookingId}) إلى: ${statusArabic}`
          : `⚠️ تم تسجيل التحديث: ${statusArabic}`;

        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: answerText,
          show_alert: true
        });

        if (cb.message?.text) {
          const updatedText = cb.message.text.replace(/📊 (الحالة:|<b>الحالة:<\/b>|\*الحالة:\*) .*/, `📊 <b>الحالة:</b> ${statusArabic} (تم التحديث)`);
          await callTelegramApi('editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: updatedText,
            parse_mode: 'HTML',
            reply_markup: cb.message.reply_markup
          });
        }

        return res.status(200).json({ ok: true });
      }

      await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
      return res.status(200).json({ ok: true });
    }

    // 2. Handle Text Messages & /start Commands
    if (update.message && (update.message.text || update.message.caption)) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const fromId = msg.from?.id;
      const firstName = msg.from?.first_name || 'عزيزي';
      const rawText = (msg.text || msg.caption || '').trim();
      const command = rawText.split(' ')[0].toLowerCase().replace(/@.+$/, '');

      if (command === '/start' || command === 'start' || command === '/menu' || command === 'menu' || rawText === 'مرحبا' || rawText === 'هلا' || rawText === 'السلام عليكم') {
        await sendMainMenu(chatId, fromId, firstName);
        return res.status(200).json({ ok: true });
      }

      if (command === '/bookings' || command === 'حجوزات' || command === 'الحجوزات') {
        await sendBookingsList(chatId, 1);
        return res.status(200).json({ ok: true });
      }

      if (command === '/stats' || command === 'احصائيات' || command === 'تقرير') {
        await sendStatsReport(chatId);
        return res.status(200).json({ ok: true });
      }

      if (command === '/notifications' || command === 'اشعارات') {
        await sendRecentNotifications(chatId);
        return res.status(200).json({ ok: true });
      }

      if (command === '/id' || command === 'معرفي') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: `🆔 <b>معلومات حسابك في تيليجرام:</b>\n\n` +
            `• <b>Telegram ID:</b> <code>${escapeHtml(fromId)}</code>\n` +
            `• <b>الاسم:</b> ${escapeHtml(firstName)}\n` +
            `• <b>حالة الإدارة:</b> ${isAuthorizedAdmin(fromId) ? '✅ مشرف معتمد' : '👤 مستخدم عادي'}`,
          parse_mode: 'HTML'
        });
        return res.status(200).json({ ok: true });
      }

      // Default: reply with main menu
      await sendMainMenu(chatId, fromId, firstName);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook handler exception:', err);
    return res.status(200).json({ ok: true, error: err?.message || String(err) });
  }
}
