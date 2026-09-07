import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  XCircle, 
  UserX, 
  Clock, 
  CheckCircle2, 
  X, 
  Send,
  MessageSquare
} from 'lucide-react';
import { MaintenanceRecord, BookingStatus, StaffUser } from '../types';

interface StatusChangeModalProps {
  record: MaintenanceRecord;
  targetStatus: BookingStatus;
  currentStaffUser: StaffUser | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmStatusChange: (
    newStatus: BookingStatus, 
    details: {
      cancellationReason?: string;
      rescheduledDate?: string;
      rescheduleReason?: string;
      noShowNotes?: string;
    }
  ) => Promise<void>;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  record,
  targetStatus,
  currentStaffUser,
  isOpen,
  onClose,
  onConfirmStatusChange
}) => {
  if (!isOpen) return null;

  // Cancellation State
  const [cancellationReasonPreset, setCancellationReasonPreset] = useState<string>('طلب العميل الإلغاء');
  const [customCancellationNotes, setCustomCancellationNotes] = useState<string>('');

  // Reschedule State
  const initialDateStr = new Date(Date.now() + 86400000).toISOString().slice(0, 16); // Tomorrow
  const [rescheduledDate, setRescheduledDate] = useState<string>(initialDateStr);
  const [rescheduleReason, setRescheduleReason] = useState<string>('بناءً على طلب العميل لتعديل الموعد');

  // No Show State
  const [noShowNotes, setNoShowNotes] = useState<string>('حضر الفني لموقع العميل وتم الاتصال به 3 مرات وتعذر الرد أو التواصل.');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (targetStatus === 'cancelled') {
        const finalReason = customCancellationNotes.trim()
          ? `${cancellationReasonPreset}: ${customCancellationNotes.trim()}`
          : cancellationReasonPreset;
        await onConfirmStatusChange('cancelled', { cancellationReason: finalReason });
      } else if (targetStatus === 'rescheduled') {
        await onConfirmStatusChange('rescheduled', {
          rescheduledDate,
          rescheduleReason: rescheduleReason.trim()
        });
      } else if (targetStatus === 'no_show') {
        await onConfirmStatusChange('no_show', {
          noShowNotes: noShowNotes.trim()
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121418] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto text-white flex flex-col">
        {/* Header */}
        <div className={`px-5 py-4 border-b border-white/10 flex items-center justify-between ${
          targetStatus === 'cancelled'
            ? 'bg-gradient-to-r from-red-900/30 via-black/40 to-black/20'
            : targetStatus === 'rescheduled'
            ? 'bg-gradient-to-r from-amber-900/30 via-black/40 to-black/20'
            : 'bg-gradient-to-r from-purple-900/30 via-black/40 to-black/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              targetStatus === 'cancelled'
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : targetStatus === 'rescheduled'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
            }`}>
              {targetStatus === 'cancelled' && <XCircle className="w-5 h-5" />}
              {targetStatus === 'rescheduled' && <Calendar className="w-5 h-5" />}
              {targetStatus === 'no_show' && <UserX className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {targetStatus === 'cancelled' && 'إلغاء الطلب مع توثيق السبب'}
                {targetStatus === 'rescheduled' && 'تأجيل الطلب وتحديد الموعد الجديد'}
                {targetStatus === 'no_show' && 'توثيق حالة (لم يحضر العميل)'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                سند #{record.bookingId || record.id} • {record.carModel} • العميل: {record.customerName || record.name || record.customerPhone}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Cancelled View */}
          {targetStatus === 'cancelled' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">سبب الإلغاء الرئيسي *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'طلب العميل الإلغاء',
                    'السيارة تحركت لمكان آخر',
                    'تم إصلاح العطل ذاتياً',
                    'خارج نطاق التغطية الميدانية',
                    'عدم الاتفاق على السعر',
                    'أخرى (توضيح بالملاحظات)'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancellationReasonPreset(reason)}
                      className={`p-2.5 rounded-xl text-xs font-medium border text-right transition-all cursor-pointer ${
                        cancellationReasonPreset === reason
                          ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">تفاصيل وملاحظات إضافية</label>
                <textarea 
                  value={customCancellationNotes}
                  onChange={e => setCustomCancellationNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-red-500/60 resize-none"
                  placeholder="أدخل أي ملاحظات من محادثة العميل أو الفني..."
                />
              </div>
            </div>
          )}

          {/* Rescheduled View */}
          {targetStatus === 'rescheduled' && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">الموعد الجديد المقترح *</label>
                <div className="relative">
                  <input 
                    type="datetime-local"
                    value={rescheduledDate}
                    onChange={e => setRescheduledDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">سبب التأجيل أو إعادة الجدولة</label>
                <input 
                  type="text"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500/60"
                  placeholder="مثال: انشغال العميل، انتظار وصول قطعة غيار من الوكالة"
                  required
                />
              </div>
            </div>
          )}

          {/* No Show View */}
          {targetStatus === 'no_show' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-2xl text-xs text-purple-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  تُسجل هذه الحالة عند وصول الفني الميداني لموقع العميل المحدد في الموعد دون استجابة أو حضور العميل.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">توثيق محاولات التواصل والانتظار *</label>
                <textarea 
                  value={noShowNotes}
                  onChange={e => setNoShowNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500/60 resize-none leading-relaxed"
                  placeholder="عدد محاولات الاتصال، مدة انتظار الفني، إلخ..."
                  required
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-xl cursor-pointer transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                targetStatus === 'cancelled'
                  ? 'bg-red-600 hover:bg-red-700'
                  : targetStatus === 'rescheduled'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {targetStatus === 'cancelled' && 'تأكيد الإلغاء وتحديث السند'}
                {targetStatus === 'rescheduled' && 'تثبيت الموعد الجديد'}
                {targetStatus === 'no_show' && 'توثيق حالة عدم الحضور'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
