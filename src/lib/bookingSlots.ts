// Service Booking Time Slots and Live Availability Calculator for DR.FIX

export interface TimeSlotConfig {
  id: string;
  labelAr: string;
  labelEn: string;
  startHour: number; // 24h format (e.g. 9 for 09:00)
  endHour: number;   // 24h format (e.g. 11 for 11:00)
  periodAr: string;
}

export interface SlotAvailability {
  slot: TimeSlotConfig;
  status: 'available' | 'limited' | 'full' | 'passed';
  bookedCount: number;
  remainingCount: number;
  badgeText: string;
  badgeColor: string;
  isSelectable: boolean;
}

// DR.FIX Operating Hours & Time Windows in Jeddah
export const STANDARD_TIME_SLOTS: TimeSlotConfig[] = [
  {
    id: 'slot_09_11',
    labelAr: '09:00 ص - 11:00 ص',
    labelEn: '09:00 AM - 11:00 AM',
    startHour: 9,
    endHour: 11,
    periodAr: 'الصباح'
  },
  {
    id: 'slot_11_13',
    labelAr: '11:00 ص - 01:00 م',
    labelEn: '11:00 AM - 01:00 PM',
    startHour: 11,
    endHour: 13,
    periodAr: 'قبل الظهر'
  },
  {
    id: 'slot_13_15',
    labelAr: '01:00 م - 03:00 م',
    labelEn: '01:00 PM - 03:00 PM',
    startHour: 13,
    endHour: 15,
    periodAr: 'الظهيرة'
  },
  {
    id: 'slot_15_17',
    labelAr: '03:00 م - 05:00 م',
    labelEn: '03:00 PM - 05:00 PM',
    startHour: 15,
    endHour: 17,
    periodAr: 'العصر'
  },
  {
    id: 'slot_17_19',
    labelAr: '05:00 م - 07:00 م',
    labelEn: '05:00 PM - 07:00 PM',
    startHour: 17,
    endHour: 19,
    periodAr: 'المغرب'
  },
  {
    id: 'slot_19_21',
    labelAr: '07:00 م - 09:00 م',
    labelEn: '07:00 PM - 09:00 PM',
    startHour: 19,
    endHour: 21,
    periodAr: 'المساء'
  },
  {
    id: 'slot_21_23',
    labelAr: '09:00 م - 11:00 م',
    labelEn: '09:00 PM - 11:00 PM',
    startHour: 21,
    endHour: 23,
    periodAr: 'المساء المتأخر'
  },
  {
    id: 'slot_23_01',
    labelAr: '11:00 م - 01:00 ص',
    labelEn: '11:00 PM - 01:00 AM',
    startHour: 23,
    endHour: 25,
    periodAr: 'طوارئ ليلية'
  }
];

// Maximum simultaneous bookings per time slot across Jeddah service fleet
export const MAX_CAPACITY_PER_SLOT = 4;

/**
 * Gets current Date in Saudi Arabia timezone (Asia/Riyadh - UTC+3)
 */
export function getSaudiNow(): Date {
  try {
    const s = new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' });
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    // fallback to local date
  }
  return new Date();
}

/**
 * Normalizes any date to YYYY-MM-DD
 */
export function formatSlotDateKey(date: Date | string | any): string {
  if (!date) return getSaudiNow().toISOString().split('T')[0];
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (date?.toDate && typeof date.toDate === 'function') {
    return formatSlotDateKey(date.toDate());
  }
  if (date?.seconds) {
    return formatSlotDateKey(new Date(date.seconds * 1000));
  }
  return getSaudiNow().toISOString().split('T')[0];
}

/**
 * Calculates real-time availability for all time slots on a given date
 */
export function calculateSlotAvailabilities(
  selectedDateStr: string,
  existingBookings: any[],
  maxCapacity = MAX_CAPACITY_PER_SLOT
): SlotAvailability[] {
  const targetDateKey = selectedDateStr || formatSlotDateKey(getSaudiNow());
  
  // Current time in Saudi Arabia
  const now = getSaudiNow();
  const todayKey = formatSlotDateKey(now);
  const isToday = targetDateKey === todayKey;
  const currentHour = now.getHours();

  // Filter bookings matching this date that are not cancelled
  const dayBookings = (existingBookings || []).filter(b => {
    if (b.status === 'cancelled') return false;
    const bDateKey = formatSlotDateKey(b.serviceDate || b.createdAt);
    return bDateKey === targetDateKey;
  });

  return STANDARD_TIME_SLOTS.map(slot => {
    // Check if slot has already passed today
    const hasPassed = isToday && currentHour >= slot.endHour;

    // Count existing bookings matched to this slot
    const slotBookings = dayBookings.filter(b => {
      const bSlot = b.serviceTimeSlot || '';
      return bSlot === slot.labelAr || bSlot.includes(slot.id) || (b.notes && b.notes.includes(slot.labelAr));
    });

    const bookedCount = slotBookings.length;
    const remainingCount = Math.max(0, maxCapacity - bookedCount);

    if (hasPassed) {
      return {
        slot,
        status: 'passed',
        bookedCount,
        remainingCount: 0,
        badgeText: 'انتهى الوقت',
        badgeColor: 'bg-white/5 text-gray-500 border-white/10',
        isSelectable: false
      };
    }

    if (remainingCount <= 0) {
      return {
        slot,
        status: 'full',
        bookedCount,
        remainingCount: 0,
        badgeText: 'مكتمل',
        badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
        isSelectable: false
      };
    }

    if (remainingCount === 1) {
      return {
        slot,
        status: 'limited',
        bookedCount,
        remainingCount,
        badgeText: 'متبقي فني 1 ⚡',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        isSelectable: true
      };
    }

    return {
      slot,
      status: 'available',
      bookedCount,
      remainingCount,
      badgeText: `متاح (${remainingCount} فنيين)`,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      isSelectable: true
    };
  });
}

/**
 * Arabic months list
 */
export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Returns date presets for the next 7 days in a clean, consistent format
 */
export function getUpcomingDatePresets() {
  const presets = [];
  const today = getSaudiNow();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatSlotDateKey(d);
    const dayNum = d.getDate();
    const monthName = ARABIC_MONTHS[d.getMonth()] || '';
    const dayOfWeek = d.toLocaleDateString('ar-SA', { weekday: 'long' });

    let label = '';
    if (i === 0) {
      label = 'اليوم';
    } else if (i === 1) {
      label = 'غداً';
    } else if (i === 2) {
      label = 'بعد غد';
    } else {
      label = dayOfWeek;
    }

    presets.push({
      dateStr,
      label,
      sublabel: `${dayNum} ${monthName}`,
      dayOfWeek,
      isToday: i === 0
    });
  }

  return presets;
}

/**
 * Formats YYYY-MM-DD to a high-end, human-readable Arabic string
 * e.g. "2026-09-11" -> "الجمعة، 11 سبتمبر 2026"
 */
export function formatArabicDateFriendly(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString('ar-SA', { weekday: 'long' });
      const monthName = ARABIC_MONTHS[m - 1] || '';
      return `${dayName}، ${d} ${monthName} ${y}`;
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}
