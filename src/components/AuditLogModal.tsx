import React, { useState } from 'react';
import { 
  History, 
  User, 
  Clock, 
  X, 
  ArrowRight, 
  Tag, 
  DollarSign, 
  ShieldCheck, 
  FileCheck, 
  AlertCircle,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { MaintenanceRecord, AuditLogEntry } from '../types';
import { useScrollLock } from '../lib/scrollLock';

interface AuditLogModalProps {
  record: MaintenanceRecord;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  record,
  isOpen,
  onClose
}) => {
  // Prevent background scroll when modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const logs = record.auditLogs || [];

  // Provide realistic initial log entry if none exists yet
  const displayLogs: AuditLogEntry[] = logs.length > 0 ? logs : [
    {
      id: 'init-1',
      recordId: record.id,
      bookingId: record.bookingId || record.id,
      actionType: 'status_change',
      actionTitle: 'إنشاء الحجز الأولي وتوثيقه',
      oldValue: '---',
      newValue: record.status,
      performedByStaffName: 'نظام الحجوزات الآلي (العميل)',
      performedByRole: 'النظام',
      timestamp: record.createdAt || new Date().toISOString()
    }
  ];

  const filteredLogs = displayLogs
    .filter(log => {
      if (filterType !== 'all' && log.actionType !== filterType) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        log.actionTitle.toLowerCase().includes(s) ||
        (log.performedByStaffName && log.performedByStaffName.toLowerCase().includes(s)) ||
        (log.details && log.details.toLowerCase().includes(s))
      );
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getActionBadge = (type: AuditLogEntry['actionType']) => {
    switch (type) {
      case 'status_change':
        return { label: 'تغيير حالة', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'price_update':
        return { label: 'تعديل السعر', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'repair_approved':
        return { label: 'موافقة إصلاح', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'technician_assigned':
        return { label: 'إسناد فني', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'complaint_logged':
      case 'complaint_updated':
        return { label: 'شكاوى وضمان', color: 'bg-brand-red/20 text-white border-brand-red/30' };
      case 'warranty_issued':
        return { label: 'إصدار ضمان', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' };
      case 'rescheduled':
        return { label: 'تأجيل موعد', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      case 'cancelled':
        return { label: 'إلغاء حجز', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default:
        return { label: 'إجراء عام', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto overscroll-contain">
      <div className="bg-[#121418] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto text-white flex flex-col max-h-[94dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/20 via-black/40 to-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">سجل حركات النظام والتدقيق</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                سند #{record.bookingId || record.id} • {record.carModel} • إجمالي {filteredLogs.length} عملية موثقة
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

        {/* Filter Bar */}
        <div className="p-4 border-b border-white/5 bg-black/20 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث في العمليات أو أسماء الموظفين..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
          >
            <option value="all">كافة العمليات</option>
            <option value="status_change">تغيير الحالة</option>
            <option value="price_update">تعديل الأسعار</option>
            <option value="repair_approved">موافقة العميل</option>
            <option value="technician_assigned">إسناد الفني</option>
            <option value="warranty_issued">الضمان</option>
            <option value="complaint_logged">الشكاوى</option>
          </select>
        </div>

        {/* Audit Log Timeline */}
        <div className="p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-sm">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              لا توجد عمليات تطابق البحث المحدد.
            </div>
          ) : (
            <div className="relative pl-2 pr-4 space-y-5 before:absolute before:right-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {filteredLogs.map(log => {
                const badge = getActionBadge(log.actionType);
                const dateObj = new Date(log.timestamp);
                const timeStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('ar-SA', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'تاريخ غير محدد';

                return (
                  <div key={log.id} className="relative pr-8">
                    {/* Node Dot */}
                    <div className="absolute right-0 top-1 w-3.5 h-3.5 rounded-full bg-[#121418] border-2 border-purple-400 z-10" />

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <h4 className="font-bold text-white text-xs sm:text-sm">{log.actionTitle}</h4>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {timeStr}
                        </span>
                      </div>

                      {/* Details & Old/New Values */}
                      {log.details && (
                        <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-2 rounded-xl border border-white/5">
                          {log.details}
                        </p>
                      )}

                      {(log.oldValue || log.newValue) && (
                        <div className="flex items-center gap-2 text-xs pt-1">
                          {log.oldValue && (
                            <span className="bg-red-500/10 text-red-300 px-2 py-0.5 rounded-lg border border-red-500/20 font-mono">
                              السابق: {log.oldValue}
                            </span>
                          )}
                          <ArrowRight className="w-3 h-3 text-gray-500 rotate-180" />
                          {log.newValue && (
                            <span className="bg-green-500/10 text-green-300 px-2 py-0.5 rounded-lg border border-green-500/20 font-mono font-bold">
                              الجديد: {log.newValue}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Performed By Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-purple-400" />
                          <span>القائم بالإجراء:</span>
                          <strong className="text-white">{log.performedByStaffName}</strong>
                          {log.performedByRole && (
                            <span className="text-gray-500">({log.performedByRole})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-black/40 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-300 text-xs rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
