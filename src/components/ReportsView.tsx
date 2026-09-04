import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Search, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Car, 
  TrendingUp,
  X
} from 'lucide-react';
import { MaintenanceRecord } from '../types';
import { exportBookingsToWord, exportSingleBookingWord, ReportSummary } from '../lib/reportUtils';

function formatDisplayDate(val: any, fallback = 'اليوم'): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate().toLocaleDateString('ar-SA');
    } catch {
      return fallback;
    }
  }
  if (val?.seconds) {
    try {
      return new Date(val.seconds * 1000).toLocaleDateString('ar-SA');
    } catch {
      return fallback;
    }
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val.toLocaleDateString('ar-SA');
  }
  if (typeof val === 'object') {
    return fallback;
  }
  return String(val);
}

interface ReportsViewProps {
  records: MaintenanceRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ records }) => {
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookingForPrint, setSelectedBookingForPrint] = useState<MaintenanceRecord | null>(null);

  // Filter records based on period, status, and search
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return records.filter(item => {
      // 1. Status Filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // 2. Period Filter
      let itemDate = new Date();
      if (item.createdAt && typeof item.createdAt.toDate === 'function') {
        itemDate = item.createdAt.toDate();
      } else if (item.createdAt && item.createdAt.seconds) {
        itemDate = new Date(item.createdAt.seconds * 1000);
      } else if (item.serviceDate && typeof item.serviceDate.toDate === 'function') {
        itemDate = item.serviceDate.toDate();
      } else if (item.serviceDate) {
        const parsed = new Date(item.serviceDate);
        if (!isNaN(parsed.getTime())) itemDate = parsed;
      }

      if (period === 'today') {
        const isToday = itemDate.toISOString().split('T')[0] === todayStr ||
          (item.serviceDate && String(item.serviceDate).includes(todayStr));
        if (!isToday) return false;
      } else if (period === 'week') {
        if (itemDate < sevenDaysAgo) return false;
      } else if (period === 'month') {
        if (itemDate < thirtyDaysAgo) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bId = (item.bookingId || item.id || '').toLowerCase();
        const name = (item.customerName || '').toLowerCase();
        const phone = (item.customerPhone || '').toLowerCase();
        const car = (item.carModel || '').toLowerCase();
        const service = (item.serviceType || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();

        return bId.includes(q) || name.includes(q) || phone.includes(q) || car.includes(q) || service.includes(q) || notes.includes(q);
      }

      return true;
    });
  }, [records, period, statusFilter, searchQuery]);

  // Operational Metrics calculation
  const metrics = useMemo(() => {
    const totalBookings = filteredRecords.length;
    const completedBookings = filteredRecords.filter(r => r.status === 'completed').length;
    const activeBookings = filteredRecords.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length;
    const uniqueCustomers = new Set(filteredRecords.map(r => r.customerPhone).filter(Boolean)).size;
    const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

    return {
      totalBookings,
      completedBookings,
      activeBookings,
      completionRate,
      uniqueCustomers
    };
  }, [filteredRecords]);

  // Export full table to Word .doc/.docx
  const handleExportWord = () => {
    const periodLabel = period === 'today' ? 'اليوم' : period === 'week' ? 'آخر 7 أيام' : period === 'month' ? 'آخر 30 يوم' : 'جميع الفترات';
    const summary: ReportSummary = {
      title: 'تقرير حجوزات وعمليات DR.FIX المتنقلة - جدة',
      periodLabel,
      generatedAt: new Date().toLocaleString('ar-SA'),
      totalBookings: metrics.totalBookings,
      completedBookings: metrics.completedBookings,
      activeBookings: metrics.activeBookings,
      uniqueCustomers: metrics.uniqueCustomers,
      items: filteredRecords
    };
    exportBookingsToWord(summary);
  };

  // Browser Print / Save PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Action Header & Filter Controls (Hidden in Print) */}
      <div className="glass-card p-6 border-white/5 space-y-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-brand-red" />
              <span>التقارير وسندات الصيانة والمالية</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              استخراج تقارير الحجوزات، الإيرادات، وسندات الفحص بصيغة Word DOCX والطباعة المباشرة A4 / PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportWord}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير ملف Word (.doc)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-red/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير / PDF</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-white/5">
          {/* Period Selector */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">الفترة الزمنية:</label>
            <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'أسبوع' },
                { id: 'month', label: 'شهر' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id as any)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    period === p.id 
                      ? 'bg-brand-red text-white shadow-md' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">حالة الحجز:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-red"
            >
              <option value="all">جميع الحالات ({records.length})</option>
              <option value="new">🆕 جديد</option>
              <option value="accepted">✅ مقبول</option>
              <option value="on_the_way">🚗 الفني بالطريق</option>
              <option value="in-progress">🔧 قيد العمل</option>
              <option value="completed">🏁 مكتمل</option>
              <option value="cancelled">❌ ملغي</option>
            </select>
          </div>

          {/* Search Field */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">بحث في التقرير:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="رقم الحجز، العميل، الجوال، أو السيارة..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pr-10 pl-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-red placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="glass-card p-5 border-white/5 relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
            <span>إجمالي الحجوزات</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-white">
            {metrics.totalBookings} <span className="text-xs font-normal text-gray-400">حجز</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            ضمن الفترة المحددة
          </div>
        </div>

        <div className="glass-card p-5 border-white/5 relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
            <span>الصيانات المنجزة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-emerald-400">
            {metrics.completedBookings} <span className="text-xs font-normal text-gray-400">عملية</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>نسبة إنجاز {metrics.completionRate}%</span>
          </div>
        </div>

        <div className="glass-card p-5 border-white/5 relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
            <span>العمليات الجارية والميدانية</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-amber-400">
            {metrics.activeBookings} <span className="text-xs font-normal text-gray-400">طلب</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            قيد المتابعة والتنفيذ الميداني
          </div>
        </div>

        <div className="glass-card p-5 border-white/5 relative overflow-hidden">
          <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
            <span>العملاء المستفيدين</span>
            <Car className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-white">
            {metrics.uniqueCustomers} <span className="text-xs font-normal text-gray-400">عميل</span>
          </div>
          <div className="text-[11px] text-purple-400 mt-2">
            تغطية متنقلة في جدة
          </div>
        </div>
      </div>

      {/* Printable Report Container (Styled for both on-screen and @media print A4) */}
      <div className="printable-report glass-card overflow-hidden border-white/5 bg-brand-black/60 p-6">
        {/* Printable Official Header (Visible on print & on-screen) */}
        <div className="border-b-2 border-brand-red pb-4 mb-6 flex items-start justify-between">
          <div className="text-right">
            <div className="text-2xl font-black text-white flex items-center gap-2">
              <span className="brand-red-text text-brand-red">DR.FIX</span>
              <span>| دكتور فيكس</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              المركز المتخصص للصيانة والميكانيكا المتنقلة في جدة 🚗⚡
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              جوال: 0546870807 | الموقع: www.drfix.repair
            </p>
          </div>
          <div className="text-left text-xs text-gray-400 space-y-1">
            <div className="font-bold text-white text-sm">تقرير العمليات والحجوزات</div>
            <div>تاريخ التقرير: <span className="text-white font-mono">{new Date().toLocaleDateString('ar-SA')}</span></div>
            <div>الفترة: <span className="text-brand-red font-bold">{period === 'today' ? 'اليوم' : period === 'week' ? 'آخر 7 أيام' : period === 'month' ? 'آخر شهر' : 'جميع الفترات'}</span></div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                <th className="px-4 py-3 font-bold">#</th>
                <th className="px-4 py-3 font-bold">رقم الحجز</th>
                <th className="px-4 py-3 font-bold">العميل</th>
                <th className="px-4 py-3 font-bold">الجوال</th>
                <th className="px-4 py-3 font-bold">السيارة</th>
                <th className="px-4 py-3 font-bold">الخدمة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">حالة الفحص والضمان</th>
                <th className="px-4 py-3 font-bold no-print">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((item, index) => {
                const bId = item.bookingId || item.id || `DRF-${index + 1}`;
                let statusBadge = (
                  <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold">جديد</span>
                );
                if (item.status === 'accepted') {
                  statusBadge = <span className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">مقبول</span>;
                } else if (item.status === 'on_the_way') {
                  statusBadge = <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold">الفني بالطريق</span>;
                } else if (item.status === 'in-progress') {
                  statusBadge = <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">قيد العمل</span>;
                } else if (item.status === 'completed') {
                  statusBadge = <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">مكتمل</span>;
                } else if (item.status === 'cancelled') {
                  statusBadge = <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold">ملغي</span>;
                }

                return (
                  <tr key={item.id || index} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-brand-red">{bId}</td>
                    <td className="px-4 py-3 font-bold text-white">{item.customerName || item.customerPhone || 'عميل'}</td>
                    <td className="px-4 py-3 font-mono text-gray-300" style={{ direction: 'ltr', textAlign: 'right' }}>{item.customerPhone || '-'}</td>
                    <td className="px-4 py-3 text-gray-200">{item.carModel || 'غير محدد'}</td>
                    <td className="px-4 py-3 text-gray-300">{item.serviceType || 'صيانة'}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDisplayDate(item.serviceDate || item.createdAt)}</td>
                    <td className="px-4 py-3">{statusBadge}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        معتمد بضمان المركز
                      </span>
                    </td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => exportSingleBookingWord(item as any)}
                          title="تصدير سند صيانة Word"
                          className="p-1.5 bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedBookingForPrint(item)}
                          title="معاينة وطباعة سند الصيانة"
                          className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500 text-xs">
                    لا توجد بيانات مطابقة لخيارات الفلترة المحددة.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr className="bg-white/5 border-t-2 border-white/20 font-bold text-white">
                  <td colSpan={8} className="px-4 py-3 text-left">
                    إجمالي العمليات المكتملة والموثقة:
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-emerald-400 font-black text-sm">
                    {metrics.completedBookings} من أصل {metrics.totalBookings} عملية
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Official Printable Signatures & Terms */}
        <div className="mt-10 pt-6 border-t border-gray-200/20 grid grid-cols-2 gap-8 text-xs text-gray-400">
          <div>
            <div className="font-bold text-white mb-2">ملاحظات واعتمادات الجودة:</div>
            <p className="leading-relaxed text-[11px]">
              • كافة خدمات DR.FIX مقدمة بواسطة مهندسين وفنيين معتمدين بأحدث أجهزة الفحص الميداني.<br />
              • يسري ضمان الصيانة على كافة أعمال الإصلاح وقطع الغيار المعتمدة.
            </p>
          </div>
          <div className="text-center">
            <div className="font-bold text-white mb-10">ختم واعتماد إدارة DR.FIX</div>
            <div className="border-t border-dashed border-gray-400 inline-block min-w-[160px] pt-1 text-[10px]">
              التوقيع المعتمد
            </div>
          </div>
        </div>
      </div>

      {/* Single Booking Invoice Modal for Print / PDF */}
      {selectedBookingForPrint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 no-print">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-red" />
                <span>سند فحص واعتماد صيانة ميدانية #{selectedBookingForPrint.bookingId || selectedBookingForPrint.id}</span>
              </h3>
              <button
                onClick={() => setSelectedBookingForPrint(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Single Order Body */}
            <div className="printable-report p-4 bg-white text-black rounded-xl space-y-4">
              <div className="border-b-2 border-[#E31837] pb-3 flex justify-between items-center">
                <div>
                  <div className="text-xl font-black text-[#E31837]">DR.FIX | دكتور فيكس</div>
                  <div className="text-xs text-gray-600">سند فحص واعتماد صيانة متنقلة - جدة</div>
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-black">رقم السند: #{selectedBookingForPrint.bookingId || selectedBookingForPrint.id}</div>
                  <div className="text-gray-500">التاريخ: {formatDisplayDate(selectedBookingForPrint.serviceDate || selectedBookingForPrint.createdAt)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div><b>اسم العميل:</b> {selectedBookingForPrint.customerName || selectedBookingForPrint.customerPhone || 'عميل'}</div>
                <div><b>الجوال:</b> <span dir="ltr">{selectedBookingForPrint.customerPhone || '-'}</span></div>
                <div><b>طراز السيارة:</b> {selectedBookingForPrint.carModel || 'غير محدد'}</div>
                <div><b>الموقع:</b> {selectedBookingForPrint.location || 'جدة'}</div>
                <div className="col-span-2"><b>نوع الخدمة:</b> {selectedBookingForPrint.serviceType || 'صيانة متنقلة'}</div>
                {selectedBookingForPrint.notes && (
                  <div className="col-span-2"><b>ملاحظات:</b> {selectedBookingForPrint.notes}</div>
                )}
              </div>

              <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl text-center">
                <div className="text-xs text-emerald-900 font-bold">حالة الاعتماد الفني والضمان:</div>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  صيانة معتمدة بضمان المركز | دكتور فيكس
                </div>
                <div className="text-[11px] text-gray-500 mt-1">خضعت السيارة للفحص الدقيق وفق المعايير المعتمدة للمركز المتنقل</div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4 text-xs text-center border-t border-gray-200">
                <div>
                  <div className="font-bold mb-8">توقيع المستلم / العميل</div>
                  <div className="border-t border-dashed border-gray-400 inline-block min-w-[120px] pt-1">التوقيع</div>
                </div>
                <div>
                  <div className="font-bold mb-8">ختم واعتماد DR.FIX</div>
                  <div className="border-t border-dashed border-gray-400 inline-block min-w-[120px] pt-1">الاعتماد</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 no-print">
              <button
                onClick={() => exportSingleBookingWord(selectedBookingForPrint as any)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Word (.doc)</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند / PDF</span>
              </button>
              <button
                onClick={() => setSelectedBookingForPrint(null)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
