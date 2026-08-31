import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, orderBy, limit, getDoc, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8172576765:AAHhOYxpOlaX-Ly0FlN4dHtbHx9t4QYNLQE';
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || '867105778';

// Track sent booking IDs to strictly prevent duplicate notifications
const processedBookingIds = new Set<string>();

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function callTelegramApi(method: string, payload: Record<string, any>) {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling Telegram API ${method}:`, error);
    return { ok: false, description: String(error) };
  }
}

export function isAuthorizedAdmin(userId: string | number): boolean {
  if (!TELEGRAM_ADMIN_ID) return true;
  return String(userId).trim() === String(TELEGRAM_ADMIN_ID).trim();
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
  const telLink = cleanPhone ? `tel:+${cleanPhone.startsWith('966') ? cleanPhone : '966' + cleanPhone.replace(/^0/, '')}` : null;
  
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

  // Row 1: Action Links (Maps & Call)
  const actionRow: any[] = [];
  if (mapsUrl) {
    actionRow.push({ text: '📍 فتح موقع العميل', url: mapsUrl });
  }
  if (telLink) {
    actionRow.push({ text: '📞 اتصال بالعميل', url: telLink });
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

  return await callTelegramApi('sendMessage', {
    chat_id: TELEGRAM_ADMIN_ID,
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

  return await callTelegramApi('sendMessage', {
    chat_id: TELEGRAM_ADMIN_ID,
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

  const inline_keyboard = [
    [
      { text: '📞 اتصال سريع', url: `tel:${visit.customerPhone}` },
      { text: '📍 فتح الخريطة', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((visit.location || '') + ' جدة')}` }
    ]
  ];

  return await callTelegramApi('sendMessage', {
    chat_id: TELEGRAM_ADMIN_ID,
    text,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard }
  });
}

export async function handleTelegramWebhook(update: any) {
  try {
    // 1. Handle Callback Queries (Button Clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const fromId = cb.from?.id;
      const data = cb.data || '';

      if (!isAuthorizedAdmin(fromId)) {
        await callTelegramApi('answerCallbackQuery', {
          callback_query_id: cb.id,
          text: '⛔ غير مصرح لك باستخدام لوحة تحكم DR.FIX.',
          show_alert: true
        });
        return { ok: true };
      }

      // Handle Quick Menu Navigation
      if (data === 'menu_bookings') {
        await sendBookingsList(cb.message?.chat?.id || TELEGRAM_ADMIN_ID, 1);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data === 'menu_stats') {
        await sendStatsReport(cb.message?.chat?.id || TELEGRAM_ADMIN_ID);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data === 'menu_notifications') {
        await sendRecentNotifications(cb.message?.chat?.id || TELEGRAM_ADMIN_ID);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      if (data.startsWith('page_bookings_')) {
        const page = parseInt(data.replace('page_bookings_', ''), 10) || 1;
        await sendBookingsList(cb.message?.chat?.id || TELEGRAM_ADMIN_ID, page);
        await callTelegramApi('answerCallbackQuery', { callback_query_id: cb.id });
        return { ok: true };
      }

      // Handle Booking Status Updates
      if (data.startsWith('act_')) {
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
          // Search for doc by bookingId field or doc ID
          const maintenanceRef = collection(db, 'maintenance');
          const snapshot = await getDocs(maintenanceRef);
          let targetDocId = null;

          snapshot.forEach(d => {
            const data = d.data();
            if (data.bookingId === bookingId || d.id === bookingId) {
              targetDocId = d.id;
            }
          });

          if (targetDocId) {
            await updateDoc(doc(db, 'maintenance', targetDocId), {
              status: newStatus,
              updatedAt: new Date().toISOString(),
              updatedBy: `Telegram Admin (${fromId})`
            });
            updateSuccess = true;
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
    if (update.message && update.message.text) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      if (!isAuthorizedAdmin(msg.from?.id)) {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: '⛔ *غير مصرح لك باستخدام لوحة تحكم DR.FIX.*',
          parse_mode: 'Markdown'
        });
        return { ok: true };
      }

      if (text === '/start' || text === '/menu') {
        await sendMainMenu(chatId);
        return { ok: true };
      }

      if (text === '/bookings') {
        await sendBookingsList(chatId, 1);
        return { ok: true };
      }

      if (text === '/stats') {
        await sendStatsReport(chatId);
        return { ok: true };
      }

      if (text === '/notifications') {
        await sendRecentNotifications(chatId);
        return { ok: true };
      }

      if (text === '/help') {
        const helpText = `🛠️ *أوامر لوحة تحكم DR.FIX:*\n\n` +
          `• /start أو /menu - عرض القائمة الرئيسية والأزرار\n` +
          `• /bookings - عرض الحجوزات مع إمكانية القبول والرفض وتغيير الحالة\n` +
          `• /stats - إحصائيات الحجوزات اليومية والشهرية\n` +
          `• /notifications - آخر التنبيهات والتقييمات\n\n` +
          `🌐 *الموقع:* https://drfix.repair`;
        await callTelegramApi('sendMessage', { chat_id: chatId, text: helpText, parse_mode: 'Markdown' });
        return { ok: true };
      }

      // Default fallback
      await sendMainMenu(chatId);
      return { ok: true };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error handling Telegram Webhook:', error);
    return { ok: false, error: String(error) };
  }
}

async function sendMainMenu(chatId: string | number) {
  const menuText = `🚗 *لوحة تحكم إدارة DR.FIX - ميكانيكي متنقل في جدة*\n\n` +
    `مرحباً بك في نظام الإدارة المباشر. يمكنك متابعة الحجوزات، تغيير حالات الطلبات، استعراض الإحصائيات والإشعارات.\n\n` +
    `اختر ما ترغب به من الأزرار أدناه:`;

  const inline_keyboard = [
    [
      { text: '📋 الحجوزات الحالية', callback_data: 'menu_bookings' },
      { text: '📊 الإحصائيات والتقارير', callback_data: 'menu_stats' }
    ],
    [
      { text: '🔔 الإشعارات والتقييمات', callback_data: 'menu_notifications' },
      { text: '🌐 زيارة الموقع', url: 'https://drfix.repair' }
    ]
  ];

  await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: menuText,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard }
  });
}

async function sendBookingsList(chatId: string | number, page = 1) {
  try {
    const maintenanceRef = collection(db, 'maintenance');
    const snapshot = await getDocs(maintenanceRef);
    const allBookings: any[] = [];

    snapshot.forEach(d => {
      allBookings.push({ id: d.id, ...d.data() });
    });

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
        parse_mode: 'Markdown'
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

    // Quick action buttons for the first item on page
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
    const maintenanceRef = collection(db, 'maintenance');
    const snapshot = await getDocs(maintenanceRef);
    
    let total = 0;
    let newCount = 0;
    let accepted = 0;
    let onTheWay = 0;
    let completed = 0;
    let cancelled = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    let todayTotal = 0;

    snapshot.forEach(d => {
      const data = d.data();
      total++;
      const s = data.status || 'new';
      if (s === 'new') newCount++;
      else if (s === 'accepted') accepted++;
      else if (s === 'on_the_way') onTheWay++;
      else if (s === 'completed') completed++;
      else if (s === 'cancelled') cancelled++;

      if (data.serviceDate && String(data.serviceDate).startsWith(todayStr)) {
        todayTotal++;
      } else if (data.createdAt && String(data.createdAt).startsWith(todayStr)) {
        todayTotal++;
      }
    });

    // Get reviews count
    let reviewsCount = 0;
    let totalStars = 0;
    try {
      const revSnap = await getDocs(collection(db, 'testimonials'));
      revSnap.forEach(d => {
        reviewsCount++;
        totalStars += Number(d.data().rating || 5);
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
