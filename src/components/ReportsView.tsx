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
  X,
  UserCheck,
  Star,
  Award,
  ShieldCheck,
  Wrench,
  Percent,
  Receipt,
  PieChart,
  BarChart3,
  ArrowUpRight
} from 'lucide-react';
import { MaintenanceRecord, sortBookingsNewestFirst } from '../types';
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
  const [activeReportTab, setActiveReportTab] = useState<'operations' | 'technicians'>('operations');
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

    const filtered = records.filter(item => {
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
        const tech = (item.assignedStaffName || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();

        return bId.includes(q) || name.includes(q) || phone.includes(q) || car.includes(q) || service.includes(q) || tech.includes(q) || notes.includes(q);
      }

      return true;
    });

    return sortBookingsNewestFirst(filtered);
  }, [records, period, statusFilter, searchQuery]);

  // Operational Metrics calculation
  const operationalMetrics = useMemo(() => {
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

  // Technician Performance Metrics (Operational & Quality only - no financial metrics)
  const technicianMetrics = useMemo(() => {
    const map = new Map<string, {
      staffName: string;
      totalJobs: number;
      completedJobs: number;
      inProgressJobs: number;
      ratingSum: number;
      ratingCount: number;
      punctualitySum: number;
    }>();

    filteredRecords.forEach(r => {
      const techName = (r.assignedStaffName || 'فني غير محدد').trim();
      if (!map.has(techName)) {
        map.set(techName, {
          staffName: techName,
          totalJobs: 0,
          completedJobs: 0,
          inProgressJobs: 0,
          ratingSum: 0,
          ratingCount: 0,
          punctualitySum: 0
        });
      }

      const stat = map.get(techName)!;
      stat.totalJobs++;
      if (r.status === 'completed') stat.completedJobs++;
      if (r.status === 'in-progress' || r.status === 'on_the_way') stat.inProgressJobs++;

      // Ratings
      if (r.techDetailedReview?.overallRating) {
        stat.ratingSum += r.techDetailedReview.overallRating;
        stat.ratingCount++;
        stat.punctualitySum += (r.techDetailedReview.punctualityRating || 5);
      } else if (r.rating) {
        stat.ratingSum += r.rating;
        stat.ratingCount++;
        stat.punctualitySum += 5;
      }
    });

    return Array.from(map.values()).map(tech => {
      const avgRating = tech.ratingCount > 0 ? (tech.ratingSum / tech.ratingCount).toFixed(1) : '5.0';
      const completionRate = tech.totalJobs > 0 ? Math.round((tech.completedJobs / tech.totalJobs) * 100) : 0;
      return {
        ...tech,
        avgRating,
        completionRate
      };
    }).sort((a, b) => b.completedJobs - a.completedJobs);
  }, [filteredRecords]);

  // Export full table to Word .doc/.docx
  const handleExportWord = () => {
    const periodLabel = period === 'today' ? 'اليوم' : period === 'week' ? 'آخر 7 أيام' : period === 'month' ? 'آخر 30 يوم' : 'جميع الفترات';
    const summary: ReportSummary = {
      title: activeReportTab === 'financial' ? 'التقرير المالي وإيرادات DR.FIX' : 'تقرير حجوزات وعمليات DR.FIX المتنقلة - جدة',
      periodLabel,
      generatedAt: new Date().toLocaleString('ar-SA'),
      totalBookings: operationalMetrics.totalBookings,
      completedBookings: operationalMetrics.completedBookings,
      activeBookings: operationalMetrics.activeBookings,
      uniqueCustomers: operationalMetrics.uniqueCustomers,
      items: filteredRecords
    };
    exportBookingsToWord(summary);
  };

  // Browser Print / Save PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tab Switcher (Hidden in Print) */}
      <div className="glass-card p-5 sm:p-6 border-white/5 space-y-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-brand-red" />
              <span>التقارير وسندات الصيانة والمالية</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              استخراج التقارير التشغيلية والمالية الشاملة، أداء الفنيين، وسندات الفحص بصيغة Word DOCX والطباعة المباشرة A4 / PDF
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

        {/* Sub-Tabs: Operations vs Financial vs Technicians */}
        <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/10 rounded-2xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveReportTab('operations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'operations'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>التقرير التشغيلي والحجوزات</span>
            <span className="bg-black/30 text-[10px] px-1.5 py-0.5 rounded-full">{filteredRecords.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('financial')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'financial'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-300" />
            <span>التقرير المالي والأرباح (VAT)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReportTab('technicians')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeReportTab === 'technicians'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4 text-purple-300" />
            <span>مؤشرات أداء الفنيين</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-white/5">
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
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand-red cursor-pointer"
            >
              <option value="all">جميع الحالات ({records.length})</option>
              <option value="new">🆕 جديد</option>
              <option value="accepted">✅ مقبول</option>
              <option value="on_the_way">🚗 الفني بالطريق</option>
              <option value="in-progress">🔧 قيد العمل</option>
              <option value="completed">🏁 مكتمل</option>
              <option value="cancelled">❌ ملغي</option>
              <option value="rescheduled">📅 مؤجل</option>
              <option value="no_show">🚫 لم يحضر العميل</option>
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
                placeholder="رقم الحجز، العميل، الجوال، الفني أو السيارة..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pr-10 pl-3.5 py-2 text-xs text-white outline-none focus:border-brand-red placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: OPERATIONAL REPORTS */}
      {activeReportTab === 'operations' && (
        <div className="space-y-6">
          {/* KPI Stats Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="glass-card p-5 border-white/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>إجمالي الحجوزات</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-white">
                {operationalMetrics.totalBookings} <span className="text-xs font-normal text-gray-400">حجز</span>
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
                {operationalMetrics.completedBookings} <span className="text-xs font-normal text-gray-400">عملية</span>
              </div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>نسبة إنجاز {operationalMetrics.completionRate}%</span>
              </div>
            </div>

            <div className="glass-card p-5 border-white/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>العمليات الجارية والميدانية</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-amber-400">
                {operationalMetrics.activeBookings} <span className="text-xs font-normal text-gray-400">طلب</span>
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
                {operationalMetrics.uniqueCustomers} <span className="text-xs font-normal text-gray-400">عميل</span>
              </div>
              <div className="text-[11px] text-purple-400 mt-2">
                تغطية متنقلة في جدة
              </div>
            </div>
          </div>

          {/* Printable Report Container */}
          <div className="printable-report glass-card overflow-hidden border-white/5 bg-brand-black/60 p-5 sm:p-6 rounded-2xl">
            {/* Printable Official Header */}
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
                    <th className="px-4 py-3 font-bold">الفني المكلف</th>
                    <th className="px-4 py-3 font-bold">الحالة</th>
                    <th className="px-4 py-3 font-bold">التكلفة</th>
                    <th className="px-4 py-3 font-bold no-print">سند</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.map((item, index) => {
                    const bId = item.bookingId || item.id || `DRF-${index + 1}`;
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-gray-500 font-mono">{index + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-white font-mono">{bId}</td>
                        <td className="px-4 py-3.5 font-medium text-gray-200">{item.customerName || item.name || 'عميل نقدي'}</td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono" dir="ltr">{item.customerPhone}</td>
                        <td className="px-4 py-3.5 text-gray-300">{item.carModel}</td>
                        <td className="px-4 py-3.5 text-gray-300">{item.serviceType}</td>
                        <td className="px-4 py-3.5 text-gray-300">
                          {item.assignedStaffName ? (
                            <span className="text-emerald-400 font-bold">{item.assignedStaffName}</span>
                          ) : (
                            <span className="text-gray-500">غير مسند</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-emerald-400">
                          {item.pricing?.grandTotal || item.cost || 0} ر.س
                        </td>
                        <td className="px-4 py-3.5 no-print">
                          <button
                            onClick={() => setSelectedBookingForPrint(item)}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            عرض السند
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL REPORTS (REVENUE, PARTS, VAT, PROFITS) */}
      {activeReportTab === 'financial' && (
        <div className="space-y-6">
          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>إجمالي الإيرادات الشاملة</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-emerald-400">
                {financialMetrics.grossRevenue.toLocaleString('ar-SA')} <span className="text-xs font-normal text-gray-400">ر.س</span>
              </div>
              <div className="text-[11px] text-emerald-300 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>إجمالي عمليات الفترة المحددة</span>
              </div>
            </div>

            <div className="glass-card p-5 border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>أجور اليد والفحص الميداني</span>
                <Wrench className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-blue-300">
                {financialMetrics.totalLabor.toLocaleString('ar-SA')} <span className="text-xs font-normal text-gray-400">ر.س</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                دخل خدمات الفحص والصيانة الميدانية
              </div>
            </div>

            <div className="glass-card p-5 border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>مبيعات وتكلفة قطع الغيار</span>
                <Receipt className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-amber-400">
                {financialMetrics.totalParts.toLocaleString('ar-SA')} <span className="text-xs font-normal text-gray-400">ر.س</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                تكلفة الشراء التقديرية: ~{financialMetrics.estimatedPartsCost.toLocaleString('ar-SA')} ر.س
              </div>
            </div>

            <div className="glass-card p-5 border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
              <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>صافي الربح التقديري</span>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-display text-white">
                +{financialMetrics.estimatedNetProfit.toLocaleString('ar-SA')} <span className="text-xs font-normal text-purple-400">ر.س</span>
              </div>
              <div className="text-[11px] text-purple-300 mt-2 font-bold">
                هامش ربح تقديري: {financialMetrics.profitMargin}%
              </div>
            </div>
          </div>

          {/* Detailed Financial Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-4 border-white/5 space-y-2">
              <div className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                <Car className="w-4 h-4 text-indigo-400" />
                <span>رسوم الانتقال والتوصيل الميداني:</span>
              </div>
              <div className="text-xl font-bold text-white">
                {financialMetrics.totalTravelFees.toLocaleString('ar-SA')} ر.س
              </div>
              <p className="text-[11px] text-gray-400">محصلة من طلبات النطاق الممتد وخارج وسط جدة</p>
            </div>

            <div className="glass-card p-4 border-white/5 space-y-2">
              <div className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-red-400" />
                <span>إجمالي الخصومات الممنوحة:</span>
              </div>
              <div className="text-xl font-bold text-red-400">
                -{financialMetrics.totalDiscounts.toLocaleString('ar-SA')} ر.س
              </div>
              <p className="text-[11px] text-gray-400">عروض ترويجية وكوبونات الخصم المقدمة للعملاء</p>
            </div>

            <div className="glass-card p-4 border-white/5 space-y-2">
              <div className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ضريبة القيمة المضافة (15% VAT):</span>
              </div>
              <div className="text-xl font-bold text-white">
                {financialMetrics.totalVat.toLocaleString('ar-SA')} ر.س
              </div>
              <p className="text-[11px] text-gray-400">مخصصة للإقرار الضريبي لهيئة الزكاة والضريبة والجمارك</p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="glass-card overflow-hidden border-white/5 bg-brand-black/60 p-5 sm:p-6 rounded-2xl">
            <div className="border-b border-white/10 pb-4 mb-4 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>جدول القيود المالية وتفاصيل فواتير العمليات</span>
              </h3>
              <span className="text-xs text-gray-400">الضريبة محسوبة وفق النظام السعودي 15%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                    <th className="px-4 py-3 font-bold">رقم الحجز</th>
                    <th className="px-4 py-3 font-bold">العميل والسيارة</th>
                    <th className="px-4 py-3 font-bold">أجور اليد</th>
                    <th className="px-4 py-3 font-bold">قطع الغيار</th>
                    <th className="px-4 py-3 font-bold">رسوم الانتقال</th>
                    <th className="px-4 py-3 font-bold">الخصم</th>
                    <th className="px-4 py-3 font-bold">الضريبة (15%)</th>
                    <th className="px-4 py-3 font-bold text-emerald-400">الإجمالي النهائي</th>
                    <th className="px-4 py-3 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.map(item => {
                    const p = item.pricing;
                    const labor = p ? p.laborCost : Math.round((Number(item.cost) || 0) * 0.7);
                    const parts = p ? p.partsCost : 0;
                    const travel = p ? p.travelFee : (item.travelFee || 0);
                    const discount = p ? p.discount : 0;
                    const vat = p ? p.taxAmount : Math.round((Number(item.cost) || 0) * 0.15);
                    const grand = p ? p.grandTotal : (Number(item.cost) || 0);

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono font-bold text-white">#{item.bookingId || item.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{item.customerName || 'عميل'}</div>
                          <div className="text-[10px] text-gray-400">{item.carModel}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono">{labor} ر.س</td>
                        <td className="px-4 py-3 text-gray-300 font-mono">{parts} ر.س</td>
                        <td className="px-4 py-3 text-gray-300 font-mono">{travel} ر.س</td>
                        <td className="px-4 py-3 text-red-400 font-mono">{discount > 0 ? `-${discount} ر.س` : '0'}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono">{vat} ر.س</td>
                        <td className="px-4 py-3 font-black text-emerald-400 text-sm font-mono">{grand} ر.س</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-400'
                          }`}>
                            {item.status === 'completed' ? 'تم السداد 🏁' : item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TECHNICIAN PERFORMANCE & METRICS */}
      {activeReportTab === 'technicians' && (
        <div className="space-y-6">
          <div className="glass-card p-5 border-white/5 rounded-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">لوحة تقييم وأداء الفنيين الميدانيين</h3>
                  <p className="text-xs text-gray-400">متابعة إنجاز المهام، الإيرادات المحققة، تقييم العملاء، ومؤشرات الالتزام بالوقت</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full">
                {technicianMetrics.length} فني مسجل
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
              {technicianMetrics.map(tech => (
                <div key={tech.staffName} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-white font-black text-sm">
                        {tech.staffName.slice(0, 1)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{tech.staffName}</h4>
                        <div className="flex items-center gap-1 text-[11px] text-yellow-400">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          <span>{tech.avgRating} / 5</span>
                          <span className="text-gray-500">({tech.ratingCount} تقييم)</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        نسبة إنجاز {tech.completionRate}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                    <div className="bg-black/30 p-2 rounded-xl">
                      <div className="text-[10px] text-gray-400">المهام المكتملة:</div>
                      <div className="font-bold text-white text-sm mt-0.5">
                        {tech.completedJobs} / {tech.totalJobs} <span className="text-[10px] text-gray-500">مهمة</span>
                      </div>
                    </div>

                    <div className="bg-black/30 p-2 rounded-xl">
                      <div className="text-[10px] text-gray-400">الإيراد المحقق:</div>
                      <div className="font-bold text-emerald-400 text-sm mt-0.5">
                        {tech.totalRevenue.toLocaleString('ar-SA')} ر.س
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>معدل الالتزام وإغلاق الطلبات</span>
                      <span className="font-mono text-white">{tech.completionRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, tech.completionRate))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Print Modal */}
      {selectedBookingForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card max-w-2xl w-full p-6 border-brand-red/30 rounded-3xl bg-[#0f0f12] shadow-2xl space-y-6 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/20 text-brand-red flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">سند استلام ومعاينة صيانة</h3>
                  <p className="text-xs text-gray-400">رقم الحجز: #{selectedBookingForPrint.bookingId || selectedBookingForPrint.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBookingForPrint(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-xl">
                <div>
                  <span className="text-gray-400 block">اسم العميل:</span>
                  <span className="text-white font-bold text-sm">{selectedBookingForPrint.customerName || selectedBookingForPrint.name || 'عميل نقدي'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">رقم الجوال:</span>
                  <span className="text-white font-bold text-sm" dir="ltr">{selectedBookingForPrint.customerPhone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">السيارة:</span>
                  <span className="text-white font-bold">{selectedBookingForPrint.carModel}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">نوع الخدمة:</span>
                  <span className="text-white font-bold">{selectedBookingForPrint.serviceType}</span>
                </div>
              </div>

              {selectedBookingForPrint.pricing && (
                <div className="bg-white/5 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-xs border-b border-white/10 pb-2">تفاصيل الفاتورة الرسمية:</h4>
                  <div className="flex justify-between">
                    <span className="text-gray-400">أجور اليد والفحص:</span>
                    <span className="text-white font-mono">{selectedBookingForPrint.pricing.laborCost} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">قطع الغيار:</span>
                    <span className="text-white font-mono">{selectedBookingForPrint.pricing.partsCost} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">رسوم الانتقال:</span>
                    <span className="text-white font-mono">{selectedBookingForPrint.pricing.travelFee} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ضريبة 15%:</span>
                    <span className="text-white font-mono">{selectedBookingForPrint.pricing.taxAmount} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-white/10 text-emerald-400">
                    <span>الإجمالي النهائي:</span>
                    <span>{selectedBookingForPrint.pricing.grandTotal} ر.س</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
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
