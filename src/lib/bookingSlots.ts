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
    periodAr: 'فترة الصباح الأولى'
  },
  {
    id: 'slot_11_13',
    labelAr: '11:00 ص - 01:00 م',
    labelEn: '11:00 AM - 01:00 PM',
    startHour: 11,
    endHour: 13,
    periodAr: 'فترة الصباح الثانية'
  },
  {
    id: 'slot_13_15',
    labelAr: '01:00 م - 03:00 م',
    labelEn: '01:00 PM - 03:00 PM',
    startHour: 13,
    endHour: 15,
    periodAr: 'فترة الظهيرة'
  },
  {
    id: 'slot_15_17',
    labelAr: '03:00 م - 05:00 م',
    labelEn: '03:00 PM - 05:00 PM',
    startHour: 15,
    endHour: 17,
    periodAr: 'فترة العصر'
  },
  {
    id: 'slot_17_19',
    labelAr: '05:00 م - 07:00 م',
    labelEn: '05:00 PM - 07:00 PM',
    startHour: 17,
    endHour: 19,
    periodAr: 'فترة المغرب'
  },
  {
    id: 'slot_19_21',
    labelAr: '07:00 م - 09:00 م',
    labelEn: '07:00 PM - 09:00 PM',
    startHour: 19,
    endHour: 21,
    periodAr: 'فترة المساء الأولى'
  },
  {
    id: 'slot_21_23',
    labelAr: '09:00 م - 11:00 م',
    labelEn: '09:00 PM - 11:00 PM',
    startHour: 21,
    endHour: 23,
    periodAr: 'فترة المساء المتأخر'
  }
];

// Maximum simultaneous bookings per time slot across Jeddah service fleet
export const MAX_CAPACITY_PER_SLOT = 3;

/**
 * Normalizes any date to YYYY-MM-DD
 */
export function formatSlotDateKey(date: Date | string | any): string {
  if (!date) return new Date().toISOString().split('T')[0];
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
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculates real-time availability for all time slots on a given date
 */
export function calculateSlotAvailabilities(
  selectedDateStr: string,
  existingBookings: any[],
  maxCapacity = MAX_CAPACITY_PER_SLOT
): SlotAvailability[] {
  const targetDateKey = selectedDateStr || formatSlotDateKey(new Date());
  
  // Current time in Saudi Arabia
  const now = new Date();
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
        badgeText: 'انتهى الوقت اليوم',
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
        badgeText: 'محجوز بالكامل',
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
        badgeText: 'متبقي موعد أخير ⚡',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        isSelectable: true
      };
    }

    return {
      slot,
      status: 'available',
      bookedCount,
      remainingCount,
      badgeText: `متاح (${remainingCount} فنيين متاحين)`,
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      isSelectable: true
    };
  });
}

/**
 * Returns date presets for the next 7 days
 */
export function getUpcomingDatePresets() {
  const presets = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = formatSlotDateKey(d);

    let label = '';
    let sublabel = d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });

    if (i === 0) {
      label = 'اليوم (فوري ومجدول)';
    } else if (i === 1) {
      label = 'غداً';
    } else if (i === 2) {
      label = 'بعد غد';
    } else {
      label = d.toLocaleDateString('ar-SA', { weekday: 'long' });
    }

    presets.push({
      dateStr,
      label,
      sublabel,
      isToday: i === 0
    });
  }

  return presets;
}
