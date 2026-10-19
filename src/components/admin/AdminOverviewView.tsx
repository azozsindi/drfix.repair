import React from 'react';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  FileCheck, 
  Tag, 
  Wrench, 
  Camera, 
  Handshake, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp, 
  Users, 
  Star,
  Activity,
  Layers,
  Phone,
  Eye,
  FileText
} from 'lucide-react';
import { AdminTrendChart, AdminBarChart } from './AdminCharts';
import { MaintenanceRecord, Partner, Contract } from '../../types';
import { AdminTabId } from './types';
import { cn } from '../../lib/utils';
import { safeFormatDate } from '../../lib/dateUtils';

interface AdminOverviewViewProps {
  records: MaintenanceRecord[];
  testimonials: any[];
  offers: any[];
  services: any[];
  gallery: any[];
  partners: Partner[];
  contracts: Contract[];
  lang: 'ar' | 'en';
  onNavigateTab: (tabId: AdminTabId) => void;
  onOpenNewBookingModal: () => void;
  onSelectBookingDetails: (record: MaintenanceRecord) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  records,
  testimonials,
  offers,
  services,
  gallery,
  partners,
  contracts,
  lang,
  onNavigateTab,
  onOpenNewBookingModal,
  onSelectBookingDetails
}) => {
  const isRtl = lang === 'ar';

  // Metrics
  const totalBookings = records.length;
  const newBookings = records.filter(r => r.status === 'new' || r.status === 'pending').length;
  const completedBookings = records.filter(r => r.status === 'completed').length;
  const activeBookings = records.filter(r => r.status === 'in-progress' || r.status === 'accepted' || r.status === 'on_the_way').length;
  const newReviewsCount = testimonials.filter(t => !t.reply).length;
  const activeContractsCount = contracts.length;

  // Unique customers based on phone number
  const uniqueCustomersCount = React.useMemo(() => {
    const phones = new Set<string>();
    records.forEach(r => {
      const p = (r.customerPhone || '').trim();
      if (p) phones.add(p);
    });
    return phones.size;
  }, [records]);

  // 7-day bookings trend data
  const last7DaysData = React.useMemo(() => {
    const days: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      days[key] = 0;
    }

    records.forEach(r => {
      if (!r.createdAt) return;
      let dateObj: Date | null = null;
      if (typeof r.createdAt === 'string') dateObj = new Date(r.createdAt);
      else if ((r.createdAt as any)?.toDate) dateObj = (r.createdAt as any).toDate();

      if (dateObj) {
        const key = dateObj.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (days[key] !== undefined) {
          days[key] += 1;
        }
      }
    });

    return Object.entries(days).map(([name, count]) => ({ name, count }));
  }, [records, isRtl]);

  // Top services demand data
  const topServicesData = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    records.forEach(r => {
      const s = r.serviceType || (lang === 'ar' ? 'صيانة متنقلة' : 'Mobile Service');
      counts[s] = (counts[s] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name: name.length > 18 ? name.slice(0, 18) + '...' : name,
        full: name,
        count
      }));
  }, [records, lang]);

  // Recent 5 bookings
  const recentBookings = React.useMemo(() => {
    return [...records].slice(0, 5);
  }, [records]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{lang === 'ar' ? 'تم الإنجاز' : 'Completed'}</span>;
      case 'in-progress':
      case 'in_progress':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">{lang === 'ar' ? 'قيد العمل' : 'In Progress'}</span>;
      case 'accepted':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">{lang === 'ar' ? 'مؤكد' : 'Confirmed'}</span>;
      case 'on_the_way':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/20">{lang === 'ar' ? 'الفني بالطريق' : 'On The Way'}</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20">{lang === 'ar' ? 'ملغي' : 'Cancelled'}</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">{lang === 'ar' ? 'جديد' : 'New'}</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Executive Welcome Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {lang === 'ar' ? 'نظام التشغيل نشط ومباشر' : 'Live Operations Active'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white">
            {lang === 'ar' ? 'نظرة عامة على عمليات DR.FIX' : 'DR.FIX Operations Executive Summary'}
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A6B2] max-w-2xl">
            {lang === 'ar' 
              ? 'متابعة حية وفورية لكافة طلبات الصيانة والمواعيد المجدولة ومؤشرات الإنجاز في جدة.'
              : 'Live tracking of on-demand mechanic orders, appointments, fleet status, and performance metrics.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenNewBookingModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#F52B35]/25 hover:shadow-xl hover:shadow-[#F52B35]/35 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إنشاء حجز جديد' : 'New Booking'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-200 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#F52B35]" />
            <span>{lang === 'ar' ? 'التقارير وسندات الصيانة' : 'Reports & Invoices'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
        <button 
          type="button"
          onClick={onOpenNewBookingModal} 
          className="p-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202C] border border-[#F52B35]/30 flex flex-col items-center justify-center gap-1.5 transition-all group text-center cursor-pointer shadow-sm hover:border-[#F52B35]"
        >
          <PlusCircle className="w-5 h-5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-white">{lang === 'ar' ? 'حجز جديد' : 'New Booking'}</span>
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('contracts')} 
          className="p-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202C] border border-white/[0.08] hover:border-[#F52B35]/40 flex flex-col items-center justify-center gap-1.5 transition-all group text-center cursor-pointer shadow-sm"
        >
          <FileCheck className="w-5 h-5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-white">{lang === 'ar' ? 'إدارة العقود' : 'Contracts'}</span>
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('offers')} 
          className="p-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202C] border border-white/[0.08] hover:border-[#F52B35]/40 flex flex-col items-center justify-center gap-1.5 transition-all group text-center cursor-pointer shadow-sm"
        >
          <Tag className="w-5 h-5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-white">{lang === 'ar' ? 'العروض الخاصة' : 'Offers'}</span>
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('services')} 
          className="p-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202C] border border-white/[0.08] hover:border-[#F52B35]/40 flex flex-col items-center justify-center gap-1.5 transition-all group text-center cursor-pointer shadow-sm"
        >
          <Wrench className="w-5 h-5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-white">{lang === 'ar' ? 'إدارة الخدمات' : 'Services'}</span>
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('gallery')} 
          className="p-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202C] border border-white/[0.08] hover:border-[#F52B35]/40 flex flex-col items-center justify-center gap-1.5 transition-all group text-center cursor-pointer shadow-sm"
        >
          <Camera className="w-5 h-5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-white">{lang === 'ar' ? 'المعرض والوسائط' : 'Gallery'}</span>
        </button>
        <button 
          type="button"
          onClick={() => onNavigateTab('partners')} 
          className="p-3.5 rounded-xl bg-[#141720] hover:bg-[#1C202C] border border-white/[0.08] hover:border-[#F52B35]/40 flex flex-col items-center justify-center gap-1.5 transition-all group text-center cursor-pointer shadow-sm"
        >
          <Handshake className="w-5 h-5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-white">{lang === 'ar' ? 'شركاء النجاح' : 'Partners'}</span>
        </button>
      </div>

      {/* Primary KPI Cards (Real Data from Firestore) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Bookings */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="p-4 sm:p-5 rounded-2xl bg-[#141720] hover:bg-[#1A1E2A] border border-white/[0.06] hover:border-[#F52B35]/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-[#A1A6B2] text-xs font-medium mb-2">
            <span>{lang === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}</span>
            <Wrench className="w-4 h-4 text-[#F52B35] group-hover:rotate-45 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-white group-hover:text-[#FF414A] transition-colors">
            {totalBookings}
          </div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <span>{lang === 'ar' ? 'كافة طلبات النظام' : 'All orders'}</span>
            {isRtl ? <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
          </div>
        </div>

        {/* 2. New / Pending Bookings */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="p-4 sm:p-5 rounded-2xl bg-[#141720] hover:bg-[#1A1E2A] border border-white/[0.06] hover:border-amber-500/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-[#A1A6B2] text-xs font-medium mb-2">
            <span>{lang === 'ar' ? 'الحجوزات الجديدة' : 'New Bookings'}</span>
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-amber-400">
            {newBookings}
          </div>
          <div className="mt-2 text-[10px] text-amber-400/80">
            {lang === 'ar' ? 'بانتظار التأكيد' : 'Awaiting dispatch'}
          </div>
        </div>

        {/* 3. Completed Bookings */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="p-4 sm:p-5 rounded-2xl bg-[#141720] hover:bg-[#1A1E2A] border border-white/[0.06] hover:border-emerald-500/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-[#A1A6B2] text-xs font-medium mb-2">
            <span>{lang === 'ar' ? 'الحجوزات المكتملة' : 'Completed'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-emerald-400">
            {completedBookings}
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            {totalBookings > 0 ? `${Math.round((completedBookings / totalBookings) * 100)}% ${lang === 'ar' ? 'نسبة الإنجاز' : 'completion'}` : '0%'}
          </div>
        </div>

        {/* 4. Unique Customers */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="p-4 sm:p-5 rounded-2xl bg-[#141720] hover:bg-[#1A1E2A] border border-white/[0.06] hover:border-blue-500/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-[#A1A6B2] text-xs font-medium mb-2">
            <span>{lang === 'ar' ? 'إجمالي العملاء' : 'Total Clients'}</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-white">
            {uniqueCustomersCount}
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            {lang === 'ar' ? 'عملاء مسجلين بالهواتف' : 'Registered clients'}
          </div>
        </div>

        {/* 5. Active Contracts */}
        <div 
          onClick={() => onNavigateTab('contracts')}
          className="p-4 sm:p-5 rounded-2xl bg-[#141720] hover:bg-[#1A1E2A] border border-white/[0.06] hover:border-[#F52B35]/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-[#A1A6B2] text-xs font-medium mb-2">
            <span>{lang === 'ar' ? 'العقود والشركات' : 'Contracts'}</span>
            <FileCheck className="w-4 h-4 text-[#F52B35]" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-white">
            {activeContractsCount}
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            {lang === 'ar' ? 'عقود صيانة الشركات' : 'Fleet contracts'}
          </div>
        </div>

        {/* 6. Customer Reviews */}
        <div 
          onClick={() => onNavigateTab('reviews')}
          className="p-4 sm:p-5 rounded-2xl bg-[#141720] hover:bg-[#1A1E2A] border border-white/[0.06] hover:border-yellow-500/40 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-[#A1A6B2] text-xs font-medium mb-2">
            <span>{lang === 'ar' ? 'التقييمات والآراء' : 'Reviews'}</span>
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-white">
            {testimonials.length}
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            {newReviewsCount > 0 ? `${newReviewsCount} ${lang === 'ar' ? 'بانتظار الرد' : 'pending reply'}` : (lang === 'ar' ? 'الردود مكتملة' : 'all replied')}
          </div>
        </div>
      </div>

      {/* Visual Charts: 7-day trend & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend Chart */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {lang === 'ar' ? 'حركة الحجوزات خلال آخر 7 أيام' : 'Bookings Volume (Last 7 Days)'}
              </h3>
              <p className="text-xs text-[#A1A6B2]">
                {lang === 'ar' ? 'توزيع الطلبات المسجلة يومياً في المركز' : 'Daily incoming maintenance orders'}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-[#F52B35]" />
          </div>

          <div className="w-full">
            <AdminTrendChart 
              data={last7DaysData} 
              dataKey="count" 
              color="#F52B35" 
              unitLabel={lang === 'ar' ? 'حجز' : 'bookings'} 
            />
          </div>
        </div>

        {/* Top Requested Services */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {lang === 'ar' ? 'أكثر خدمات الصيانة طلباً' : 'Top Requested Services'}
              </h3>
              <p className="text-xs text-[#A1A6B2]">
                {lang === 'ar' ? 'الخدمات ذات الإقبال الأكبر من العملاء' : 'Services with highest customer demand'}
              </p>
            </div>
            <Layers className="w-5 h-5 text-[#F52B35]" />
          </div>

          <div className="w-full">
            {topServicesData.length > 0 ? (
              <AdminBarChart 
                data={topServicesData} 
                dataKey="count" 
                nameKey="name" 
                color="#F52B35" 
                unitLabel={lang === 'ar' ? 'طلب' : 'orders'} 
              />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-[#A1A6B2]">
                {lang === 'ar' ? 'لا توجد بيانات خدمات مسجلة بعد' : 'No service orders recorded yet'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings Quick Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {lang === 'ar' ? 'أحدث طلبات الصيانة المسجلة' : 'Recent Maintenance Requests'}
            </h3>
            <p className="text-xs text-[#A1A6B2]">
              {lang === 'ar' ? 'آخر الحجوزات الواردة للنظام للتأكيد والمتابعة الفورية' : 'Latest bookings awaiting confirmation or dispatch'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('bookings')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-gray-200 transition-colors cursor-pointer self-end sm:self-center"
          >
            <span>{lang === 'ar' ? 'عرض جميع الحجوزات' : 'View all bookings'}</span>
            {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {recentBookings.length > 0 ? (
          <div className="overflow-x-auto custom-tabs-scrollbar">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-[#A1A6B2] text-xs">
                  <th className="py-3 px-3 text-start font-semibold">{lang === 'ar' ? 'رقم الحجز' : 'ID'}</th>
                  <th className="py-3 px-3 text-start font-semibold">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-3 text-start font-semibold">{lang === 'ar' ? 'السيارة والخدمة' : 'Vehicle & Service'}</th>
                  <th className="py-3 px-3 text-start font-semibold">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-3 text-start font-semibold">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-3 text-end font-semibold">{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentBookings.map((b) => (
                  <tr 
                    key={b.id} 
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => onSelectBookingDetails(b)}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-[#FF414A] whitespace-nowrap">
                      #{b.bookingId || b.id.slice(0, 6)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      <div>{b.customerName || b.customerPhone || 'عميل'}</div>
                      <div className="text-[11px] text-[#A1A6B2] font-mono">{b.customerPhone}</div>
                    </td>
                    <td className="py-3 px-3 text-[#F5F6F8] whitespace-nowrap">
                      <div className="font-medium">{b.carModel || 'السيارة'} {b.carYear ? `(${b.carYear})` : ''}</div>
                      <div className="text-[11px] text-[#A1A6B2]">{b.serviceType || 'صيانة متنقلة'}</div>
                    </td>
                    <td className="py-3 px-3 text-[#A1A6B2] text-xs whitespace-nowrap">
                      {safeFormatDate(b.serviceDate || b.createdAt, 'ar-SA')}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="py-3 px-3 text-end whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBookingDetails(b);
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-[#F52B35]/20 text-gray-300 hover:text-[#FF414A] transition-colors"
                        title={lang === 'ar' ? 'عرض التفاصيل' : 'View details'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[#A1A6B2]">
            {lang === 'ar' ? 'لا توجد حجوزات مسجلة حالياً' : 'No bookings recorded yet'}
          </div>
        )}
      </div>
    </motion.div>
  );
};
