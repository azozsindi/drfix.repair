import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  CalendarDays,
  CalendarCheck,
  Sparkles,
  Edit3,
  Check,
  ChevronDown
} from 'lucide-react';
import { 
  getUpcomingDatePresets, 
  calculateSlotAvailabilities, 
  formatSlotDateKey,
  formatArabicDateFriendly,
  SlotAvailability,
  getSaudiNow
} from '../lib/bookingSlots';
import { MaintenanceRecord } from '../types';

export interface BookingTimeSlotPickerProps {
  selectedDate?: string;
  selectedTimeSlot?: string;
  selectedSlot?: string;
  isImmediate?: boolean;
  onDateChange?: (dateStr: string) => void;
  onSelectDate?: (dateStr: string) => void;
  onTimeSlotChange?: (slotLabel: string) => void;
  onSelectSlot?: (slotLabel: string) => void;
  onImmediateChange?: (immediate: boolean) => void;
  onToggleImmediate?: (immediate: boolean) => void;
  existingBookings?: MaintenanceRecord[];
  lang?: 'ar' | 'en';
}

export const BookingTimeSlotPicker: React.FC<BookingTimeSlotPickerProps> = ({
  selectedDate,
  selectedTimeSlot,
  selectedSlot,
  isImmediate = false,
  onDateChange,
  onSelectDate,
  onTimeSlotChange,
  onSelectSlot,
  onImmediateChange,
  onToggleImmediate,
  existingBookings = [],
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const datePresets = useMemo(() => getUpcomingDatePresets(), []);

  // Safe unified handlers
  const handleDateChange = (dateStr: string) => {
    onDateChange?.(dateStr);
    onSelectDate?.(dateStr);
  };

  const handleTimeSlotChange = (slotLabel: string) => {
    onTimeSlotChange?.(slotLabel);
    onSelectSlot?.(slotLabel);
  };

  const handleImmediateChange = (immediate: boolean) => {
    onImmediateChange?.(immediate);
    onToggleImmediate?.(immediate);
  };

  // Active values
  const activeDate = selectedDate || datePresets[0].dateStr;
  const activeTimeSlot = selectedTimeSlot || selectedSlot || '';
  const activeImmediate = Boolean(isImmediate);

  // Custom time input state
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');

  // Real-time slot availability for active date
  const slotAvailabilities = useMemo(() => {
    return calculateSlotAvailabilities(activeDate, existingBookings);
  }, [activeDate, existingBookings]);

  // Overall counts for summary
  const availableSlotsCount = slotAvailabilities.filter(s => s.isSelectable).length;

  // Auto-select first available slot if nothing is selected or if current slot has passed
  useEffect(() => {
    if (activeImmediate) return;

    // Check if the current slot is selectable for this date
    const currentAvailable = slotAvailabilities.find(
      s => s.slot.labelAr === activeTimeSlot || s.slot.labelEn === activeTimeSlot
    );

    // If current slot is invalid/passed/empty, pick the first selectable one
    if (!activeTimeSlot || (currentAvailable && !currentAvailable.isSelectable)) {
      const firstAvailable = slotAvailabilities.find(s => s.isSelectable);
      if (firstAvailable) {
        handleTimeSlotChange(isAr ? firstAvailable.slot.labelAr : firstAvailable.slot.labelEn);
      }
    }
  }, [activeDate, activeImmediate, slotAvailabilities]);

  const handleApplyCustomTime = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customTimeInput.trim()) return;
    const formatted = `${customTimeInput.trim()} (وقت مخصص)`;
    handleTimeSlotChange(formatted);
    setShowCustomTime(false);
  };

  // Formatted Arabic date for display
  const friendlyDate = useMemo(() => {
    return formatArabicDateFriendly(activeDate);
  }, [activeDate]);

  return (
    <div className="space-y-4 bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 text-right shadow-xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header with Service Type Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0 shadow-inner">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-white">
                {isAr ? 'موعد تقديم الخدمة والأوقات المتاحة' : 'Service Appointment & Time Slots'}
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                availableSlotsCount > 0 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}>
                {availableSlotsCount > 0 
                  ? (isAr ? `${availableSlotsCount} فترات متاحة` : `${availableSlotsCount} Slots Available`)
                  : (isAr ? 'لا توجد فترات متاحة اليوم' : 'No Slots Today')}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAr ? 'اختر اليوم والوقت المناسب لزيارة الفني لموقع سيارتك في جدة' : 'Choose day and time for mobile mechanic arrival in Jeddah'}
            </p>
          </div>
        </div>

        {/* Dispatch Type Switch: Immediate vs Scheduled */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              handleImmediateChange(true);
              handleTimeSlotChange('فوري خلال 45 دقيقة ⚡');
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeImmediate
                ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{isAr ? 'خدمة فورية عاجلة (45 دقيقة)' : 'Express (45 min)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleImmediateChange(false);
              // if timeSlot was immediate, default to first selectable slot
              if (activeTimeSlot.includes('فوري')) {
                const firstAvailable = slotAvailabilities.find(s => s.isSelectable);
                if (firstAvailable) {
                  handleTimeSlotChange(isAr ? firstAvailable.slot.labelAr : firstAvailable.slot.labelEn);
                }
              }
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !activeImmediate
                ? 'bg-white/20 text-white shadow-md font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{isAr ? 'حجز موعد محدد' : 'Scheduled Slot'}</span>
          </button>
        </div>
      </div>

      {/* Immediate Mode Banner */}
      {activeImmediate ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-brand-red/10 to-transparent border border-amber-500/30 flex items-start gap-3.5 animate-fadeIn">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Zap className="w-4 h-4 animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2 flex-wrap">
              <span>{isAr ? 'تم تفعيل خيار الخدمة الفورية العاجلة ⚡' : 'Express Emergency Dispatch Selected'}</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[11px] text-amber-200 border border-amber-500/30 font-mono font-bold">
                {isAr ? 'الوصول: 30 - 45 دقيقة' : 'ETA: 30 - 45 min'}
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {isAr 
                ? 'سيتم توجيه أقرب ورشة متنقلة وفني ميكانيكي / كهربائي إلى موقع سيارتك في جدة مباشرة بعد إتمام الطلب.'
                : 'The nearest mobile mechanic workshop will be dispatched to your vehicle in Jeddah immediately.'}
            </p>
          </div>
        </div>
      ) : (
        /* Scheduled Time Slots Flow */
        <div className="space-y-4 animate-fadeIn">
          {/* 1. Date Selector Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-brand-red" />
                <span>{isAr ? '1. اختر يوم الزيارة:' : '1. Select Visit Date:'}</span>
              </label>
              <span className="text-[11px] text-gray-300 font-mono bg-black/50 px-2.5 py-1 rounded-lg border border-white/10">
                {friendlyDate || activeDate}
              </span>
            </div>

            {/* Clean Date Cards Grid / Slider */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {datePresets.map((preset) => {
                const isSelected = activeDate === preset.dateStr;
                return (
                  <button
                    key={preset.dateStr}
                    type="button"
                    onClick={() => handleDateChange(preset.dateStr)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[64px] ${
                      isSelected
                        ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/30 scale-[1.02] ring-1 ring-white/30'
                        : 'bg-black/40 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      {preset.label}
                    </span>
                    <span className={`text-[11px] font-mono leading-none ${isSelected ? 'text-white/90 font-bold' : 'text-gray-400'}`}>
                      {preset.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert if today has no available slots left */}
          {availableSlotsCount === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  {isAr 
                    ? 'انتهت فترات الصيانة المتاحة لهذا اليوم. يمكنك اختيار موعد غداً أو طلب الخدمة الفورية.' 
                    : 'All slots for this day have ended. You can book tomorrow or request express dispatch.'}
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {datePresets[1] && (
                  <button
                    type="button"
                    onClick={() => handleDateChange(datePresets[1].dateStr)}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    📅 {isAr ? 'مواعيد غداً' : 'Book Tomorrow'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleImmediateChange(true);
                    handleTimeSlotChange('فوري خلال 45 دقيقة ⚡');
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-brand-red hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isAr ? 'خدمة فورية الآن' : 'Express Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Time Slots Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-red" />
                <span>{isAr ? '2. اختر الوقت المناسب لك:' : '2. Select Preferred Time Slot:'}</span>
              </label>
              <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  <span>{isAr ? 'متاح' : 'Available'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
                  <span>{isAr ? 'منتهي' : 'Ended'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {slotAvailabilities.map((avail) => {
                const label = isAr ? avail.slot.labelAr : avail.slot.labelEn;
                const isSelected = !activeImmediate && (activeTimeSlot === label || activeTimeSlot === avail.slot.labelAr || activeTimeSlot === avail.slot.labelEn);
                const isSelectable = avail.isSelectable;

                return (
                  <button
                    key={avail.slot.id}
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => {
                      handleTimeSlotChange(label);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer relative overflow-hidden ${
                      !isSelectable
                        ? 'opacity-40 bg-black/20 border-white/5 cursor-not-allowed'
                        : isSelected
                          ? 'bg-brand-red/15 border-brand-red text-white shadow-lg shadow-brand-red/20 ring-1 ring-brand-red scale-[1.01]'
                          : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/20 text-gray-300'
                    }`}
                  >
                    {/* Time & Selection state */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-brand-red flex items-center justify-center text-white shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-bold text-white font-mono tracking-tight">
                          {label}
                        </span>
                      </div>

                      {/* Selected Pill */}
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-red text-white">
                          {isAr ? 'تم التحديد' : 'Selected'}
                        </span>
                      )}
                    </div>

                    {/* Period & Availability status */}
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5 text-gray-400">
                      <span className="font-medium text-gray-300">{avail.slot.periodAr}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${avail.badgeColor}`}>
                        {avail.badgeText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time Selector Accordion */}
          <div className="pt-1">
            {!showCustomTime ? (
              <button
                type="button"
                onClick={() => setShowCustomTime(true)}
                className="text-xs text-gray-400 hover:text-brand-red flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-brand-red" />
                <span className="underline underline-offset-4 decoration-white/20 hover:decoration-brand-red">
                  {isAr ? 'هل تفضل وقتاً محدداً آخر أو بعد الصلاة؟ (انقر هنا للتحديد)' : 'Prefer a custom exact time? Click here'}
                </span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-black/50 border border-brand-red/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-red" />
                    <span>{isAr ? 'حدد وقتاً مخصصاً يناسب جدولك:' : 'Specify Custom Time:'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomTime(false)}
                    className="text-[11px] text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTimeInput}
                    onChange={(e) => setCustomTimeInput(e.target.value)}
                    placeholder={isAr ? 'مثال: الساعة 04:30 عصراً أو بعد صلاة العشاء' : 'e.g. 04:30 PM or after Asr'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-brand-red focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCustomTime()}
                    className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تأكيد' : 'Confirm'}</span>
                  </button>
                </div>

                {/* Quick pre-set common prayer / clock options */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'بعد صلاة الظهر مباشرة',
                    'بعد صلاة العصر (04:30 م)',
                    'بعد صلاة المغرب (06:45 م)',
                    'بعد صلاة العشاء (08:30 م)',
                    'الساعة 10:00 صباحاً',
                    'الساعة 02:00 ظهراً'
                  ].map((quickText) => (
                    <button
                      key={quickText}
                      type="button"
                      onClick={() => {
                        handleTimeSlotChange(`${quickText} (مخصص)`);
                        setShowCustomTime(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-gray-300 hover:text-white cursor-pointer transition-colors"
                    >
                      {quickText}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Summary Card: Clean, high-contrast, official confirmation format */}
          {activeTimeSlot && (
            <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-brand-red/15 via-black/80 to-black/90 border border-brand-red/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0">
                  <CalendarCheck className="w-5 h-5 text-brand-red" />
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 font-medium">
                    {isAr ? 'الموعد المعتمد للزيارة والفحص:' : 'Confirmed Appointment Slot:'}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-white">{friendlyDate || activeDate}</span>
                    <span className="text-brand-red">•</span>
                    <span className="text-brand-red font-mono">{activeTimeSlot}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0 self-stretch sm:self-auto justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'موعد متاح ومؤكد' : 'Confirmed Slot'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

