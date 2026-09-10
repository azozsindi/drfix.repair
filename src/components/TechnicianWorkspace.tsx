import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Car, 
  Clock, 
  Phone, 
  MessageCircle, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  Camera, 
  Search, 
  X, 
  FileText, 
  Compass, 
  Check,
  ChevronLeft,
  Calendar,
  Sparkles,
  AlertCircle,
  Video,
  Play,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { MaintenanceRecord, StaffUser } from '../types';
import { cn } from '../lib/utils';

interface TechnicianWorkspaceProps {
  records: MaintenanceRecord[];
  currentStaffUser?: StaffUser | null;
  onUpdateStatus: (id: string, newStatus: MaintenanceRecord['status']) => void;
  onOpenTimeline: (record: MaintenanceRecord, tab?: 'timeline' | 'add_step') => void;
  onSelectDetails: (record: MaintenanceRecord) => void;
  onOpenWorkflowGuide?: () => void;
  lang: 'ar' | 'en';
}

type FilterStatus = 'all' | 'active' | 'on_the_way' | 'in-progress' | 'completed';

export const TechnicianWorkspace: React.FC<TechnicianWorkspaceProps> = ({
  records,
  currentStaffUser,
  onUpdateStatus,
  onOpenTimeline,
  onSelectDetails,
  onOpenWorkflowGuide,
  lang = 'ar'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [justUpdatedId, setJustUpdatedId] = useState<string | null>(null);

  // Helper to format booking date safely
  const getRecordDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (typeof dateVal?.toDate === 'function') return dateVal.toDate();
    if (dateVal instanceof Date) return dateVal;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const cleanPhoneNumber = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const getWaPhone = (phone?: string) => {
    const raw = cleanPhoneNumber(phone);
    if (!raw) return '';
    if (raw.startsWith('966')) return raw;
    if (raw.startsWith('0')) return '966' + raw.slice(1);
    return '966' + raw;
  };

  const getWhatsAppMessage = (record: MaintenanceRecord) => {
    const techName = currentStaffUser?.fullName || 'فني صيانة DR.FIX';
    const car = record.carModel || 'سيارتكم';
    const text = `السلام عليكم ورحمة الله وبركاته 👋\nمعك الفني (${techName}) من فريق DR.FIX للصيانة المتنقلة بجدة.\nبخصوص طلب الصيانة المسجل لسيارتكم (${car}) 🚗🔧.\nأنا في خدمتك لمتابعة الخدمة والوصول إلى موقعكم.`;
    return encodeURIComponent(text);
  };

  // Identify the single most relevant "Active / Current Job"
  const activeSpotlightJob = useMemo(() => {
    // 1. Ongoing work first
    const inProgress = records.find(r => r.status === 'in-progress');
    if (inProgress) return inProgress;
    // 2. On the way
    const onWay = records.find(r => r.status === 'on_the_way');
    if (onWay) return onWay;
    // 3. Accepted / Ready to dispatch
    const accepted = records.find(r => r.status === 'accepted');
    if (accepted) return accepted;
    // 4. New task
    const newTask = records.find(r => r.status === 'new');
    if (newTask) return newTask;
    return null;
  }, [records]);

  // Counts for top KPI chips
  const counts = useMemo(() => {
    const total = records.length;
    const onTheWay = records.filter(r => r.status === 'on_the_way').length;
    const inProgress = records.filter(r => r.status === 'in-progress').length;
    const completed = records.filter(r => r.status === 'completed').length;
    const active = records.filter(r => r.status === 'accepted' || r.status === 'on_the_way' || r.status === 'in-progress' || r.status === 'new').length;
    return { total, onTheWay, inProgress, completed, active };
  }, [records]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') {
          return r.status === 'accepted' || r.status === 'on_the_way' || r.status === 'in-progress' || r.status === 'new';
        }
        return r.status === statusFilter;
      })
      .filter(r => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          (r.carModel || '').toLowerCase().includes(q) ||
          (r.customerPhone || '').includes(q) ||
          (r.customerName || '').toLowerCase().includes(q) ||
          (r.serviceType || '').toLowerCase().includes(q) ||
          (r.bookingId || '').toLowerCase().includes(q) ||
          (r.location || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Active tasks first, then sorted by service date
        const priorityScore = (status: string) => {
          if (status === 'in-progress') return 4;
          if (status === 'on_the_way') return 3;
          if (status === 'accepted') return 2;
          if (status === 'new') return 1;
          return 0;
        };
        const scoreDiff = priorityScore(b.status) - priorityScore(a.status);
        if (scoreDiff !== 0) return scoreDiff;
        return getRecordDate(b.serviceDate).getTime() - getRecordDate(a.serviceDate).getTime();
      });
  }, [records, statusFilter, searchQuery]);

  const handleQuickStatusTransition = (record: MaintenanceRecord, newStatus: MaintenanceRecord['status']) => {
    onUpdateStatus(record.id, newStatus);
    setJustUpdatedId(record.id);
    setTimeout(() => setJustUpdatedId(null), 2500);
  };

  const getStatusBadge = (status: MaintenanceRecord['status']) => {
    switch (status) {
      case 'on_the_way':
        return { label: 'الفني بالطريق 🚗', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'in-progress':
        return { label: 'قيد العمل 🔧', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'completed':
        return { label: 'مكتمل بنجاح ✅', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'accepted':
        return { label: 'تم القبول ✅', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
      case 'new':
        return { label: 'مهمة جديدة 🆕', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'cancelled':
        return { label: 'ملغي ❌', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
      default:
        return { label: 'قيد الانتظار ⏳', color: 'bg-white/10 text-gray-300 border-white/20' };
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* 1. Welcoming Strip & Quick Stats (Streamlined, uncluttered) */}
      <div className="bg-gradient-to-r from-brand-dark via-brand-dark/95 to-brand-black border border-brand-red/25 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-bold text-xs">وضع العمل الميداني المباشر</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>أهلاً بك، {currentStaffUser?.fullName || 'فني DR.FIX'}</span>
              <span className="text-lg">👷‍♂️</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              واجهة تحكم مبسطة ومباشرة لإدارة مهامك الميدانية وتوثيق خطوات الصيانة.
            </p>
          </div>

          {/* Quick Stat Chips & Workflow Guide Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenWorkflowGuide && (
              <button
                type="button"
                onClick={onOpenWorkflowGuide}
                className="bg-brand-red/20 hover:bg-brand-red/30 border border-brand-red/40 text-white px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <BookOpen className="w-4 h-4 text-brand-red" />
                <span>دليل خطوات الفني والعميل 📖</span>
              </button>
            )}
            <div className="bg-black/50 border border-white/10 px-3.5 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-gray-400">إجمالي مهامك:</span>
              <span className="text-sm font-black text-white font-mono">{counts.total}</span>
            </div>
            <div className="bg-blue-500/15 border border-blue-500/30 px-3.5 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-blue-300">قيد التنفيذ:</span>
              <span className="text-sm font-black text-blue-400 font-mono">{counts.inProgress + counts.onTheWay}</span>
            </div>
            <div className="bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 rounded-2xl flex items-center gap-2">
              <span className="text-xs text-emerald-300">أُنجزت:</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{counts.completed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spotlight Hero Card: Active / Immediate Task */}
      {activeSpotlightJob && (
        <div className="bg-gradient-to-b from-brand-red/15 via-black/60 to-black/80 border-2 border-brand-red/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-brand-red text-white flex items-center justify-center shadow-lg shadow-brand-red/30 shrink-0">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="text-[11px] font-black text-brand-red uppercase tracking-wider block">
                  المهمة الحالية ذات الأولوية
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {activeSpotlightJob.carModel}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusBadge(activeSpotlightJob.status).color)}>
                {getStatusBadge(activeSpotlightJob.status).label}
              </span>
              {activeSpotlightJob.bookingId && (
                <span className="text-xs font-mono bg-white/10 text-gray-300 px-2.5 py-1 rounded-full">
                  #{activeSpotlightJob.bookingId}
                </span>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4 text-xs">
            {/* Service & Notes */}
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-gray-400 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-brand-red" />
                <span>الخدمة المطلوبة:</span>
              </div>
              <div className="text-white font-bold text-sm">{activeSpotlightJob.serviceType}</div>
              {activeSpotlightJob.notes && (
                <div className="text-gray-300 italic pt-1 border-t border-white/5 mt-1 line-clamp-2" title={activeSpotlightJob.notes}>
                  "{activeSpotlightJob.notes}"
                </div>
              )}
            </div>

            {/* Customer & Location */}
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <div className="text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-red" />
                <span>موقع العميل:</span>
              </div>
              <div className="text-white font-bold text-sm">
                {activeSpotlightJob.location || 'جدة (الموقع محدد بالسند)'}
              </div>
              <div className="text-gray-400 text-[11px] pt-1 border-t border-white/5 mt-1 font-mono" dir="ltr">
                {activeSpotlightJob.customerPhone}
              </div>
            </div>

            {/* Scheduled Date */}
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1 sm:col-span-2 lg:col-span-1">
              <div className="text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-red" />
                <span>موعد الزيارة:</span>
              </div>
              <div className="text-white font-bold text-sm">
                {getRecordDate(activeSpotlightJob.serviceDate).toLocaleDateString('ar-SA', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              <div className="text-emerald-400 text-[11px] pt-1 border-t border-white/5 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>مسندة إليك للمتابعة والتنفيذ</span>
              </div>
            </div>
          </div>

          {/* Quick Contact & Navigation Bar (Large 46px touch targets) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
            {/* 1. Phone Call */}
            <a
              href={`tel:${activeSpotlightJob.customerPhone}`}
              className="flex-1 min-w-[130px] py-3 px-4 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-98"
            >
              <Phone className="w-4 h-4" />
              <span>اتصال مباشر</span>
            </a>

            {/* 2. Google Maps Navigation */}
            {activeSpotlightJob.coordinates?.latitude && activeSpotlightJob.coordinates?.longitude ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeSpotlightJob.coordinates.latitude},${activeSpotlightJob.coordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[130px] py-3 px-4 bg-blue-600/90 hover:bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer active:scale-98"
              >
                <Navigation className="w-4 h-4" />
                <span>ملاحة GPS 🗺️</span>
              </a>
            ) : activeSpotlightJob.location ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeSpotlightJob.location + ' جدة')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[130px] py-3 px-4 bg-blue-600/90 hover:bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer active:scale-98"
              >
                <Navigation className="w-4 h-4" />
                <span>فتح الخريطة 🗺️</span>
              </a>
            ) : null}

            {/* 3. WhatsApp Direct */}
            {activeSpotlightJob.customerPhone && (
              <a
                href={`https://api.whatsapp.com/send?phone=${getWaPhone(activeSpotlightJob.customerPhone)}&text=${getWhatsAppMessage(activeSpotlightJob)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[130px] py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واتساب العميل</span>
              </a>
            )}

            {/* 4. Arrival Video Inspection 1-Tap */}
            <button
              type="button"
              onClick={() => {
                if (activeSpotlightJob.status !== 'in-progress') {
                  handleQuickStatusTransition(activeSpotlightJob, 'in-progress');
                }
                onOpenTimeline(activeSpotlightJob, 'timeline');
              }}
              className="flex-1 min-w-[170px] py-3 px-4 bg-gradient-to-r from-brand-red via-red-600 to-brand-red hover:brightness-110 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30 transition-all cursor-pointer active:scale-98 border border-red-400/40 ring-1 ring-white/10"
            >
              <Video className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>🎥 تصوير فيديو فحص الوصول</span>
            </button>

            {/* 5. Timeline Documentation & Photos */}
            <button
              type="button"
              onClick={() => onOpenTimeline(activeSpotlightJob, 'timeline')}
              className="flex-1 min-w-[140px] py-3 px-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer active:scale-98"
            >
              <Camera className="w-4 h-4 text-brand-red" />
              <span>مراحل وسند الصيانة ({activeSpotlightJob.serviceSteps?.length || 0})</span>
            </button>
          </div>

          {/* Primary 1-Tap Workflow Transition Action */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-xs text-gray-300 font-bold mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>الإجراء التالي السريع للمهمة:</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-2">
              {/* Option A: On the way */}
              <button
                type="button"
                onClick={() => handleQuickStatusTransition(activeSpotlightJob, 'on_the_way')}
                className={cn(
                  "py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeSpotlightJob.status === 'on_the_way'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                )}
              >
                <span>🚗 أنا في الطريق للعميل</span>
                {activeSpotlightJob.status === 'on_the_way' && <Check className="w-4 h-4" />}
              </button>

              {/* Option B: In Progress */}
              <button
                type="button"
                onClick={() => handleQuickStatusTransition(activeSpotlightJob, 'in-progress')}
                className={cn(
                  "py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeSpotlightJob.status === 'in-progress'
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                )}
              >
                <span>🔧 بدأت الفحص والصيانة</span>
                {activeSpotlightJob.status === 'in-progress' && <Check className="w-4 h-4" />}
              </button>

              {/* Option C: Completed */}
              <button
                type="button"
                onClick={() => {
                  handleQuickStatusTransition(activeSpotlightJob, 'completed');
                  onOpenTimeline(activeSpotlightJob, 'timeline');
                }}
                className={cn(
                  "py-3 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeSpotlightJob.status === 'completed'
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                )}
              >
                <span>✅ إتمام العمل وتوثيقه</span>
                {activeSpotlightJob.status === 'completed' && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Bar & Search for Technician */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filter Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-tabs-scrollbar no-scrollbar">
            {[
              { id: 'all', label: 'جميع مهامي', count: counts.total },
              { id: 'active', label: 'النشطة والجديدة', count: counts.active },
              { id: 'on_the_way', label: 'في الطريق', count: counts.onTheWay },
              { id: 'in-progress', label: 'قيد الصيانة', count: counts.inProgress },
              { id: 'completed', label: 'المكتملة', count: counts.completed },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as FilterStatus)}
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer",
                  statusFilter === tab.id
                    ? "bg-brand-red text-white shadow-lg shadow-brand-red/20 scale-[1.02]"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-mono",
                  statusFilter === tab.id ? "bg-black/40 text-white" : "bg-white/10 text-gray-300"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-xs text-gray-400">
            المعروض: <b className="text-white">{filteredRecords.length}</b> مهمة
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بنوع السيارة، جوال العميل، رقم الحجز أو الحي..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl pr-11 pl-10 py-3 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:border-brand-red outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Task Cards Feed (Simple, large touch controls, zero admin clutter) */}
      <div className="space-y-4">
        {filteredRecords.map((record) => {
          const isJustUpdated = justUpdatedId === record.id;
          const statusInfo = getStatusBadge(record.status);
          const rDate = getRecordDate(record.serviceDate);
          const photosCount = record.serviceSteps?.length || 0;

          return (
            <div
              key={record.id}
              className={cn(
                "bg-black/30 border rounded-3xl p-4 sm:p-5 transition-all space-y-4",
                isJustUpdated ? "border-emerald-500/60 bg-emerald-500/5 ring-2 ring-emerald-500/20" : "border-white/10 hover:border-white/20"
              )}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-red shrink-0 mt-0.5">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white text-base sm:text-lg">
                        {record.carModel}
                      </h4>
                      {record.bookingId && (
                        <span className="text-[10px] font-mono bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">
                          #{record.bookingId}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span>{rDate.toLocaleDateString('ar-SA')}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-300 font-bold">{record.serviceType}</span>
                    </div>
                  </div>
                </div>

                {/* Status Pill & Fast Transition Selector */}
                <div className="flex items-center gap-2">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Service Details & Notes */}
              {(record.location || record.notes) && (
                <div className="bg-white/5 p-3.5 rounded-2xl space-y-1.5 text-xs">
                  {record.location && (
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <MapPin className="w-3.5 h-3.5 text-brand-red shrink-0" />
                      <span>الموقع: <b className="text-white">{record.location}</b></span>
                    </div>
                  )}
                  {record.notes && (
                    <div className="text-gray-400 italic pt-1 border-t border-white/5">
                      ملاحظة: "{record.notes}"
                    </div>
                  )}
                </div>
              )}

              {/* Fast 1-Tap Workflow Transition Buttons for Each Card */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400 font-bold ml-1">تحديث الحالة:</span>
                  
                  <button
                    type="button"
                    onClick={() => handleQuickStatusTransition(record, 'on_the_way')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      record.status === 'on_the_way'
                        ? "bg-indigo-600 text-white"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                    )}
                  >
                    🚗 بالطريق
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusTransition(record, 'in-progress')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      record.status === 'in-progress'
                        ? "bg-blue-600 text-white"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                    )}
                  >
                    🔧 قيد الصيانة
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickStatusTransition(record, 'completed')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      record.status === 'completed'
                        ? "bg-emerald-600 text-white"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                    )}
                  >
                    ✅ اكتمل
                  </button>
                </div>

                {/* Direct Action Icons */}
                <div className="flex items-center gap-1.5">
                  {/* Phone */}
                  <a
                    href={`tel:${record.customerPhone}`}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 transition-colors cursor-pointer"
                    title="اتصال هاتفي بالعميل"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  {/* WhatsApp */}
                  {record.customerPhone && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=${getWaPhone(record.customerPhone)}&text=${getWhatsAppMessage(record)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                      title="محادثة واتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  {/* GPS Map */}
                  {record.coordinates?.latitude && record.coordinates?.longitude ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${record.coordinates.latitude},${record.coordinates.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-blue-400 transition-colors cursor-pointer"
                      title="ملاحة GPS على خرائط جوجل"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  ) : record.location ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.location + ' جدة')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-blue-400 transition-colors cursor-pointer"
                      title="فتح موقع العميل على الخريطة"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  ) : null}

                  {/* Quick Arrival Video Action */}
                  <button
                    type="button"
                    onClick={() => {
                      if (record.status !== 'in-progress') {
                        handleQuickStatusTransition(record, 'in-progress');
                      }
                      onOpenTimeline(record, 'timeline');
                    }}
                    className="p-2.5 rounded-xl bg-brand-red/15 hover:bg-brand-red/30 text-amber-300 border border-brand-red/30 transition-all cursor-pointer"
                    title="فيديو فحص واستلام السيارة عند الوصول"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  {/* Timeline & Photos */}
                  <button
                    type="button"
                    onClick={() => onOpenTimeline(record, 'timeline')}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      photosCount > 0
                        ? "bg-brand-red/20 text-white border border-brand-red/40 hover:bg-brand-red/30"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                    )}
                    title="توثيق الصور ومراحل الصيانة"
                  >
                    <Camera className="w-4 h-4 text-brand-red" />
                    <span>توثيق ({photosCount})</span>
                  </button>

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => onSelectDetails(record)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    title="عرض تفاصيل السند"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRecords.length === 0 && (
          <div className="bg-black/30 border border-white/5 rounded-3xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 text-gray-500 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-white font-bold text-base">لا توجد مهام مطابقة</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? 'لا توجد نتائج تطابق بحثك الحالي، جرب إزالة كلمات البحث أو تغيير الفلتر.'
                : 'لا توجد مهام مسندة إليك حالياً في هذه الفئة. سيظهر أي حجز جديد مسند إليك هنا مباشرة.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
