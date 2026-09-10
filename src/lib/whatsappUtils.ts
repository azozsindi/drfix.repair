import { MaintenanceRecord } from '../types';
import { formatSaudiPhoneForWhatsApp } from './phoneUtils';

/**
 * Builds the Arabic dispatch message text for the technician with all order details.
 */
export const getTechnicianAssignmentMessage = (
  record: MaintenanceRecord,
  techName?: string
): string => {
  const bookingNo = record.bookingId || (record as any).bookingNumber || record.id?.slice(0, 8).toUpperCase() || 'DRF-NEW';
  const customerName = record.customerName || record.name || 'عميل كرام';
  const customerPhone = record.customerPhone || 'غير مسجل';
  const carMake = record.carMake || '';
  const carModel = record.carModel || 'سيارة العميل';
  const carPlate = record.plateNumber || record.carPlate || '';
  const car = `${carMake} ${carModel}${carPlate ? ` (لوحة: ${carPlate})` : ''}`.trim();
  const service = record.serviceType || 'صيانة سيارات متنقلة';

  let dateStr = 'اليوم';
  if (record.serviceDate) {
    if (typeof record.serviceDate === 'string') {
      dateStr = record.serviceDate;
    } else if (typeof record.serviceDate?.toDate === 'function') {
      dateStr = record.serviceDate.toDate().toLocaleDateString('ar-SA');
    } else {
      dateStr = new Date(record.serviceDate).toLocaleDateString('ar-SA');
    }
  }

  const slot = record.serviceTimeSlot ? ` (${record.serviceTimeSlot})` : (record.isImmediate ? ' ⚡ (طلب فوري عاجل)' : '');
  const price = record.cost ? `${record.cost} ريال` : 'حسب الفحص والاتفاق';

  // Location handling (Google maps link, GPS coords, or written address)
  let locationInfo = '';
  const anyRec = record as any;
  if (anyRec.googleMapsUrl) {
    locationInfo = `📍 *موقع العميل (خرائط قوقل):*\n${anyRec.googleMapsUrl}`;
  } else if (record.coordinates?.latitude && record.coordinates?.longitude) {
    locationInfo = `📍 *موقع العميل (GPS):*\nhttps://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`;
  } else if (anyRec.coordinates?.lat && anyRec.coordinates?.lng) {
    locationInfo = `📍 *موقع العميل (GPS):*\nhttps://maps.google.com/?q=${anyRec.coordinates.lat},${anyRec.coordinates.lng}`;
  } else if (record.location) {
    if (record.location.startsWith('http')) {
      locationInfo = `📍 *موقع العميل:*\n${record.location}`;
    } else {
      locationInfo = `📍 *موقع/عنوان العميل:*\n${record.location}`;
    }
  }

  // Tracking link
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://www.drfix.repair';
  const portalUrl = `${origin}?track=${bookingNo}`;

  return `🔧 *تكليف بمهمة صيانة جديدة | DR.FIX* 🚗\n` +
    `السلام عليكم يا كابتن ${techName || 'المحترم'}، تم إسناد طلب صيانة جديد إليك، يرجى الاطلاع وتحديث المراحل:\n\n` +
    `📋 *رقم الطلب / السند:* #${bookingNo}\n` +
    `👤 *العميل:* ${customerName}\n` +
    `📞 *جوال العميل:* ${customerPhone}\n` +
    `🚘 *السيارة:* ${car}\n` +
    `🛠️ *نوع الخدمة:* ${service}\n` +
    `📅 *الموعد:* ${dateStr}${slot}\n` +
    `💰 *القيمة:* ${price}\n` +
    (locationInfo ? `\n${locationInfo}\n` : '') +
    (record.notes ? `\n📝 *ملاحظات الطلب:* ${record.notes}\n` : '') +
    `\n🔗 *رابط السند وتوثيق المراحل:* \n${portalUrl}\n\n` +
    `⚡ *سير المراحل المطلوب في النظام:* \n` +
    `1. تم القبول ⬅️ 2. بالطريق 🚗 ⬅️ 3. قيد العمل 🔄 ⬅️ 4. مكتمل 🏁\n` +
    `_بالتوفيق!_ 🌟`;
};

/**
 * Returns the direct WhatsApp wa.me click-to-chat URL with the pre-filled dispatch message.
 */
export const generateTechnicianAssignmentWhatsAppUrl = (
  record: MaintenanceRecord,
  techPhone: string,
  techName?: string
): string => {
  const cleanPhone = formatSaudiPhoneForWhatsApp(techPhone);
  if (!cleanPhone) return '';
  const message = getTechnicianAssignmentMessage(record, techName);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
