// DR.FIX - Telegram Webhook & Interactive Bot Handler
// Self-contained with real-time Firebase Firestore SDK

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';

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

function getWhatsAppStatusUrlForTelegram(record: any, newStatus: string): string {
  const waPhone = formatSaudiPhone(record.customerPhone || record.phone);

  const bId = record.bookingId || record.id || '';
  const car = record.carModel ? (record.carYear ? `${record.carModel} (${record.carYear})` : record.carModel) : 'سيارتك';
  const service = record.serviceType || 'صيانة متنقلة';
  const customer = (record.customerName || record.name || '').trim();
  const customerGreeting = customer ? `هلا ${customer}` : 'هلا بك';
  const customerIntro = customer ? `${customer}، ` : '';

  let msg = '';
  switch (newStatus) {
    case 'accepted':
      msg = `🚗⚡ DR.FIX | تم تأكيد طلبك\n\n` +
        `${customerGreeting} 👋\n` +
        `طلبك صار مقبول ✅ وفريق DR.FIX بدأ تجهيز خدمتك.\n\n` +
        `🔧 ${service}\n` +
        `🚘 ${car}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `خلك جاهز... DR.FIX جايك 🚗💨`;
      break;
    case 'on_the_way':
    case 'onway':
      msg = `🚗💨 DR.FIX | الفني تحرّك!\n\n` +
        `${customerIntro}فني DR.FIX في الطريق إليك الآن 🔧\n\n` +
        `📍 توجه الفني إلى موقعك بدأ\n` +
        `🚘 ${car}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `جهّز السيارة... والباقي علينا ⚡`;
      break;
    case 'in-progress':
    case 'in_progress':
      msg = `🔧⚡ DR.FIX | وصلنا!\n\n` +
        `الفني وصل وبدأ فحص سيارتك الآن ✅\n\n` +
        `🚘 ${car}\n` +
        `🛠️ ${service}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `خلّ الباقي علينا 😎`;
      break;
    case 'completed':
    case 'done':
      msg = `🏁✨ DR.FIX | تمت المهمة!\n\n` +
        `${customerIntro}تم الانتهاء من خدمتك بنجاح ✅\n\n` +
        `🚘 ${car}\n` +
        `🔧 ${service}\n` +
        `🎫 رقم الحجز: #${bId}\n\n` +
        `شكراً لاختيارك DR.FIX 🤍\n\n` +
        `عطل سيارتك؟ إحنا نجيك. 🚗⚡`;
      break;
    case 'cancelled':
    case 'reject':
      msg = `❌ DR.FIX | تم إلغاء الحجز\n\n` +
        `${customerGreeting} 👋\n` +
        `نحيطك علماً بأنه تم إلغاء حجز الصيانة رقم #${bId} لسيارة (${car}).\n\n` +
        `إذا كان لديك أي استفسار أو ترغب في إعادة الجدولة، يسعدنا تواصلكم دائماً 🚗⚡`;
      break;
    default:
      msg = `🚗⚡ DR.FIX | خدمة ميكانيكي متنقل\n\n` +
        `${customerGreeting} 👋\n` +
        `بخصوص حجزك لسيارة (${car}) رقم الحجز #${bId}\n\n` +
        `كيف نقدر نخدمك؟ 🔧⚡`;
      break;
  }

  return `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
}

async function fetchAllMaintenanceRecords() {
  try {
    const db = getDb();
    const snap = await getDocs(collection(db, 'maintenance'));
    const records: any[] = [];
    snap.forEach(d => {
      records.push({ id: d.id, ...d.data() });
    });
    return records;
  } catch (err) {
    console.error('Error fetching maintenance from Firestore SDK:', err);
    return [];
  }
}

async function updateBookingStatus(bookingIdOrDocId: string, newStatus: string, updatedByInfo: string) {
  try {
    const db = getDb();
    const snap = await getDocs(collection(db, 'maintenance'));
    let targetDocId: string | null = null;
    let targetDocData: any = null;
    
    for (const d of snap.docs) {
      const data = d.data();
      if (d.id === bookingIdOrDocId || data.bookingId === bookingIdOrDocId) {
        targetDocId = d.id;
        targetDocData = { id: d.id, ...data };
        break;
      }
    }

    if (!targetDocId) {
      console.warn('Booking not found for update:', bookingIdOrDocId);
      return { success: false, record: null };
    }

    await updateDoc(doc(db, 'maintenance', targetDocId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: updatedByInfo
    });

    targetDocData.status = newStatus;
    return { success: true, record: targetDocData };
  } catch (err) {
    console.error('Error updating booking in Firestore SDK:', err);
    return { success: false, record: null };
  }
}

async function sendMainMenu(chatId: string | number, fromId?: string | number, firstName?: string) {
  const isAuth = isAuthorizedAdmin(fromId);
  const name = escapeHtml(firstName || 'بك');

  const menuText = `🚗⚡ <b>أهلاً ${name} في بوت إدارة DR.FIX</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `نظام إدارة الحجوزات والمتابعة المباشرة لميكانيكي متنقل في جدة.\n\n` +
    `📱 <b>معرف التيليجرام:</b> <code>${escapeHtml(fromId || chatId)}</code>\n` +
    `🔒 <b>الصلاحية:</b> ${isAuth ? '✅ لوحة المشرف مفعلة' : '👤 مستخدم مصرح'}\n\n` +
    `اختر الإجراء المطلوب من الأزرار أدناه:`;

  const inline_keyboard: any[][] = [];

  inline_keyboard.push([
    { text: '📋 الحجوزات المسجلة', callback_data: 'menu_bookings' },
    { text: '📊 الإحصائيات الدقيقة', callback_data: 'menu_stats' }
  ]);
  inline_keyboard.push([
    { text: '🔔 مركز التنبيهات', callback_data: 'menu_notifications' },
    { text: '🌐 فتح لوحة التحكم', url: 'https://www.drfix.repair/admin' }
  ]);

  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: menuText,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard }
  });
}

async function sendBookingsList(chatId: string | number, page = 1) {
  try {
    const allBookings = await fetchAllMaintenanceRecords();

    allBookings.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.serviceDate || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.serviceDate || 0).getTime();
      return timeB - timeA;
    });

    if (allBookings.length === 0) {
      await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: '📋 <b>لا توجد حجوزات مسجلة حالياً في النظام.</b>',
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

    let text = `📋 <b>قائمة الحجوزات الفعلية (${allBookings.length} حجز)</b>\n` +
      `<i>صفحة ${currentPage} من ${totalPages}</i>\n━━━━━━━━━━━━━━━━━━\n\n`;

    currentBookings.forEach((b, idx) => {
      const bId = escapeHtml(b.bookingId || b.id);
      let statusLabel = '🆕 جديد';
      if (b.status === 'accepted') statusLabel = '✅ مقبول';
      if (b.status === 'on_the_way') statusLabel = '🚗 الفني بالطريق';
      if (b.status === 'in-progress' || b.status === 'in_progress') statusLabel = '🔧 قيد العمل';
      if (b.status === 'completed') statusLabel = '🏁 تم الإنجاز';
      if (b.status === 'cancelled') statusLabel = '❌ ملغى';

      const dateDisplay = b.createdAt?.toDate 
        ? b.createdAt.toDate().toLocaleDateString('ar-SA')
        : (b.serviceDate || 'اليوم');

      text += `<b>${startIndex + idx + 1}. حجز:</b> <code>${bId}</code>\n` +
        `👤 <b>العميل:</b> ${escapeHtml(b.customerName || b.customerPhone || 'عميل')}\n` +
        `📱 <b>الجوال:</b> <code>${escapeHtml(b.customerPhone || 'غير متوفر')}</code>\n` +
        `🚘 <b>السيارة:</b> ${escapeHtml(b.carModel || 'غير محدد')}\n` +
        `🔧 <b>الخدمة:</b> ${escapeHtml(b.serviceType || 'صيانة')}\n` +
        `📅 <b>التاريخ:</b> ${escapeHtml(dateDisplay)}\n` +
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
    const allBookings = await fetchAllMaintenanceRecords();
    
    let total = 0;
    let newCount = 0;
    let accepted = 0;
    let onTheWay = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayLocale = now.toLocaleDateString('ar-SA');
    let todayTotal = 0;

    allBookings.forEach(docData => {
      total++;
      const s = docData.status || 'new';
      if (s === 'new' || s === 'pending') newCount++;
      else if (s === 'accepted') accepted++;
      else if (s === 'on_the_way') onTheWay++;
      else if (s === 'in-progress' || s === 'in_progress') inProgress++;
      else if (s === 'completed') completed++;
      else if (s === 'cancelled') cancelled++;

      // Check if created or booked today
      let isToday = false;
      if (docData.createdAt?.toDate) {
        if (docData.createdAt.toDate().toDateString() === now.toDateString()) isToday = true;
      } else if (docData.serviceDate) {
        if (String(docData.serviceDate).includes(todayStr) || String(docData.serviceDate).includes(todayLocale)) {
          isToday = true;
        }
      }
      if (isToday) todayTotal++;
    });

    let reviewsCount = 0;
    let totalStars = 0;
    try {
      const db = getDb();
      const testSnap = await getDocs(collection(db, 'testimonials'));
      testSnap.forEach(d => {
        reviewsCount++;
        totalStars += Number(d.data().rating || 5);
      });
    } catch {}

    const avgRating = reviewsCount > 0 ? (totalStars / reviewsCount).toFixed(1) : '5.0';

    const text = `📊 <b>تقرير إحصائيات DR.FIX الدقيقة</b> 🚗⚡\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>حجوزات اليوم (${now.toLocaleDateString('ar-SA')}):</b> ${todayTotal} حجز\n` +
      `📈 <b>إجمالي الحجوزات في النظام:</b> ${total} حجز\n\n` +
      `📌 <b>توزيع الحالات الحالية:</b>\n` +
      `• 🆕 بانتظار المراجعة (جديد): <b>${newCount}</b>\n` +
      `• ✅ حجوزات مقبولة: <b>${accepted}</b>\n` +
      `• 🚗 الفني في الطريق: <b>${onTheWay}</b>\n` +
      `• 🔧 قيد العمل والصيانة: <b>${inProgress}</b>\n` +
      `• 🏁 تم الإنجاز بنجاح: <b>${completed}</b>\n` +
      `• ❌ ملغاة / مرفوضة: <b>${cancelled}</b>\n\n` +
      `⭐ <b>تقييمات وآراء العملاء:</b> ${avgRating} / 5 (${reviewsCount} تقييم)\n` +
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
  const text = `🔔 <b>مركز إشعارات ومزامنة DR.FIX</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `✅ <b>المزامنة الحية مفعلة:</b>\n` +
    `1. <b>عند الحجز:</b> يصلك إشعار فوري يحتوي موقع العميل بالـ GPS ورقم الجوال والسيارة.\n` +
    `2. <b>عند النقر على [🚗 الفني بالطريق]:</b> تتغير الحالة فوراً في قاعدة البيانات، وتظهر للعميل في شاشة المتابعة، وتتحدث في لوحة التحكم.\n` +
    `3. <b>عند إنجاز الخدمة:</b> يكتمل السجل ويتم توثيقه.\n` +
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
          statusArabic = 'تم الإنجاز 🏁';
          statusIcon = '🏁';
        }

        const updateRes = await updateBookingStatus(
          bookingId, 
          newStatus, 
          `Telegram Bot (${fromId || 'Admin'})`
        );

        let answerText = updateRes.success
          ? `${statusIcon} تم تحديث حالة الحجز إلى: ${statusArabic}`
          : `⚠️ تم حفظ التحديث: ${statusArabic}`;

        let showAlert = false;
        if (action === 'accept') {
          answerText = `✅ تم قبول الطلب بنجاح!\n\nاضغط الآن على زر:\n[💬 فتح واتساب العميل الآن]\nفي الرسالة لبدء المحادثة مباشرة 🚗⚡`;
          showAlert = true;
        }

        // Answer callback query
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: answerText,
          show_alert: showAlert
        });

        // Resolve customer phone & maps URL to guarantee active WhatsApp & GPS buttons
        let customerPhone = updateRes.record?.customerPhone || updateRes.record?.phone || '';
        if (!customerPhone && cb.message?.text) {
          const phoneMatch = cb.message.text.match(/(?:الجوال:|📱)\s*(?:<b>)?(?:<code>)?([0-9+\s]+)(?:<\/code>)?/);
          if (phoneMatch) {
            customerPhone = phoneMatch[1].trim();
          }
        }

        const cleanPhone = formatSaudiPhone(customerPhone);
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

        let mapsUrl = '';
        if (updateRes.record?.coordinates?.latitude && updateRes.record?.coordinates?.longitude) {
          mapsUrl = `https://www.google.com/maps?q=${updateRes.record.coordinates.latitude},${updateRes.record.coordinates.longitude}`;
        } else if (updateRes.record?.location) {
          mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(updateRes.record.location + ' جدة')}`;
        } else if (cb.message?.reply_markup?.inline_keyboard) {
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
        if (mapsUrl) actionRow.push({ text: '📍 موقع العميل (GPS)', url: mapsUrl });
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

        // Edit the original booking message directly in Telegram
        if (cb.message?.text) {
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

      if (command === '/stats' || command === 'احصائيات' || command === 'تقرير' || command === 'الإحصائيات') {
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
