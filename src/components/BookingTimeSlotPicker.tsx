import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { 
  getUpcomingDatePresets, 
  calculateSlotAvailabilities, 
  formatSlotDateKey,
  SlotAvailability
} from '../lib/bookingSlots';
import { MaintenanceRecord } from '../types';

interface BookingTimeSlotPickerProps {
  selectedDate: string;
  selectedTimeSlot: string;
  isImmediate: boolean;
  onDateChange: (dateStr: string) => void;
  onTimeSlotChange: (slotLabel: string) => void;
  onImmediateChange: (immediate: boolean) => void;
  existingBookings?: MaintenanceRecord[];
  lang?: 'ar' | 'en';
}

export const BookingTimeSlotPicker: React.FC<BookingTimeSlotPickerProps> = ({
  selectedDate,
  selectedTimeSlot,
  isImmediate,
  onDateChange,
  onTimeSlotChange,
  onImmediateChange,
  existingBookings = [],
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const datePresets = useMemo(() => getUpcomingDatePresets(), []);
  
  // Active selected date fallback to today
  const activeDate = selectedDate || datePresets[0].dateStr;

  // Real-time slot availability for active date
  const slotAvailabilities = useMemo(() => {
    return calculateSlotAvailabilities(activeDate, existingBookings);
  }, [activeDate, existingBookings]);

  // Overall counts for summary
  const availableSlotsCount = slotAvailabilities.filter(s => s.isSelectable).length;

  return (
    <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-right" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{isAr ? 'موعد تقديم الخدمة والأوقات المتاحة' : 'Service Appointment & Available Slots'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {isAr ? `${availableSlotsCount} فترات متاحة` : `${availableSlotsCount} Slots Available`}
              </span>
            </h4>
            <p className="text-[11px] text-gray-400">
              {isAr ? 'اختر اليوم والوقت المناسب لزيارة الفني لموقعك في جدة' : 'Choose day and time for technician arrival'}
            </p>
          </div>
        </div>

        {/* Dispatch Type Switch: Immediate vs Scheduled */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              onImmediateChange(true);
              onTimeSlotChange('فوري خلال 45 دقيقة ⚡');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isImmediate
                ? 'bg-brand-red text-white shadow-md shadow-brand-red/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'خدمة فورية عاجلة (45 دقيقة)' : 'Express (45 min)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onImmediateChange(false);
              // if timeSlot was immediate, default to first selectable slot
              if (selectedTimeSlot.includes('فوري')) {
                const firstAvailable = slotAvailabilities.find(s => s.isSelectable);
                if (firstAvailable) onTimeSlotChange(firstAvailable.slot.labelAr);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isImmediate
                ? 'bg-white/15 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAr ? 'حجز موعد محدد' : 'Scheduled Slot'}</span>
          </button>
        </div>
      </div>

      {/* Immediate Banner */}
      {isImmediate ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-brand-red/10 to-transparent border border-amber-500/30 flex items-start gap-3 animate-fadeIn">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Zap className="w-4 h-4 animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
              <span>{isAr ? 'تم اختيار الخدمة الفورية العاجلة ⚡' : 'Express Emergency Dispatch Selected'}</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] text-amber-200 border border-amber-500/30 font-mono">
                {isAr ? 'وصول متوقع: 30 - 45 دقيقة' : 'ETA: 30 - 45 min'}
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              {isAr 
                ? 'سيتم توجيه أقرب فني ميكانيكي / كهربائي متنقل إلى موقعك في جدة فور تأكيد الطلب مباشرة.'
                : 'The nearest mobile mechanic will be dispatched to your location immediately.'}
            </p>
          </div>
        </div>
      ) : (
        /* Scheduled Time Slots Flow */
        <div className="space-y-4 animate-fadeIn">
          {/* 1. Date Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-brand-red" />
                <span>{isAr ? '1. اختر يوم الصيانة:' : '1. Select Service Date:'}</span>
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                {activeDate}
              </span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {datePresets.map((preset) => {
                const isSelected = activeDate === preset.dateStr;
                return (
                  <button
                    key={preset.dateStr}
                    type="button"
                    onClick={() => onDateChange(preset.dateStr)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/30 scale-[1.02]'
                        : 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold truncate max-w-full">
                      {preset.label}
                    </span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                      {preset.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Time Slots Grid with Live Availability Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-red" />
                <span>{isAr ? '2. الأوقات المتاحة لهذا اليوم:' : '2. Available Time Slots for this day:'}</span>
              </label>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{isAr ? 'متاح' : 'Available'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>{isAr ? 'محجوز' : 'Full'}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {slotAvailabilities.map((avail) => {
                const isSelected = !isImmediate && selectedTimeSlot === avail.slot.labelAr;
                const isSelectable = avail.isSelectable;

                return (
                  <button
                    key={avail.slot.id}
                    type="button"
                    disabled={!isSelectable}
                    onClick={() => {
                      onTimeSlotChange(avail.slot.labelAr);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden ${
                      !isSelectable
                        ? 'opacity-45 bg-black/20 border-white/5 cursor-not-allowed'
                        : isSelected
                          ? 'bg-brand-red/20 border-brand-red text-white shadow-lg shadow-brand-red/20 ring-1 ring-brand-red'
                          : 'bg-black/30 border-white/10 hover:bg-white/5 hover:border-white/20 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-brand-red shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {isAr ? avail.slot.labelAr : avail.slot.labelEn}
                        </span>
                      </div>

                      {/* Availability Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${avail.badgeColor}`}>
                        {avail.badgeText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                      <span>{avail.slot.periodAr}</span>
                      {isSelected && (
                        <span className="text-brand-red font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>تم الاختيار</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Summary Pill */}
          {selectedTimeSlot && (
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-300">
                {isAr ? 'الموعد المختار:' : 'Selected Appointment:'}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg">
                  📅 {activeDate}
                </span>
                <span className="font-bold text-brand-red bg-brand-red/15 border border-brand-red/30 px-2.5 py-1 rounded-lg">
                  ⏰ {selectedTimeSlot}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
