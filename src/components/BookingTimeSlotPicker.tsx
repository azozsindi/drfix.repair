import React, { useMemo } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  CalendarDays,
  CalendarCheck
} from 'lucide-react';
import { 
  getUpcomingDatePresets, 
  formatArabicDateFriendly
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

  // Active values
  const activeDate = selectedDate || datePresets[0]?.dateStr || '';

  // Formatted Arabic date for display
  const friendlyDate = useMemo(() => {
    return formatArabicDateFriendly(activeDate);
  }, [activeDate]);

  return (
    <div className="space-y-4 bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 text-right shadow-xl" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0 shadow-inner">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-white">
                {isAr ? 'موعد تقديم الخدمة' : 'Service Appointment Date'}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                {isAr ? 'متاح طوال الأسبوع' : 'Available All Week'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAr ? 'اختر اليوم المناسب لزيارة الفني لموقع سيارتك في جدة' : 'Choose visit day for mobile mechanic arrival in Jeddah'}
            </p>
          </div>
        </div>
      </div>

      {/* Date Selector Tabs */}
      <div className="space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-brand-red" />
            <span>{isAr ? 'اختر يوم الزيارة:' : 'Select Visit Date:'}</span>
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

        {/* Selected Summary Card: Clean, high-contrast, official confirmation format */}
        <div className="mt-2 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-brand-red/15 via-black/80 to-black/90 border border-brand-red/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0">
              <CalendarCheck className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <div className="text-[11px] text-gray-400 font-medium">
                {isAr ? 'الموعد المعتمد للزيارة والفحص:' : 'Confirmed Appointment Date:'}
              </div>
              <div className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap mt-0.5">
                <span className="text-white">{friendlyDate || activeDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0 self-stretch sm:self-auto justify-center">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'يوم الزيارة محدد ومؤكد' : 'Confirmed Visit Date'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
