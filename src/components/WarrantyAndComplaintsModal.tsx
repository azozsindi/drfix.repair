import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  X, 
  Plus, 
  Calendar, 
  UserCheck, 
  MessageSquare, 
  Share2, 
  FileText,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { MaintenanceRecord, WarrantyDetails, ServiceComplaint, StaffUser } from '../types';

interface WarrantyAndComplaintsModalProps {
  record: MaintenanceRecord;
  currentStaffUser: StaffUser | null;
  staffList?: StaffUser[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateWarranty: (warranty: WarrantyDetails) => Promise<void>;
  onAddComplaint: (complaint: ServiceComplaint) => Promise<void>;
  onUpdateComplaint: (complaintId: string, updates: Partial<ServiceComplaint>) => Promise<void>;
}

export const WarrantyAndComplaintsModal: React.FC<WarrantyAndComplaintsModalProps> = ({
  record,
  currentStaffUser,
  staffList = [],
  isOpen,
  onClose,
  onUpdateWarranty,
  onAddComplaint,
  onUpdateComplaint
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'warranty' | 'complaints'>('warranty');
  const [isSaving, setIsSaving] = useState(false);

  // Warranty State
  const existingWarranty = record.warranty;
  const [hasWarranty, setHasWarranty] = useState<boolean>(existingWarranty?.hasWarranty ?? true);
  const [durationDays, setDurationDays] = useState<number>(existingWarranty?.durationDays ?? 90);
  const [warrantyPeriodLabel, setWarrantyPeriodLabel] = useState<string>(existingWarranty?.warrantyPeriodLabel ?? '3 أشهر (90 يوماً)');
  const [coverageNotes, setCoverageNotes] = useState<string>(
    existingWarranty?.coverageNotes ?? 'يشمل الضمان سلامة التركيب وأجور اليد الميدانية وقطع الغيار المعتمدة بالسند ضد عيوب المصنعية.'
  );

  // Helper to compute warranty status
  const computeWarrantyStatus = (endDateVal: any): 'active' | 'expired' => {
    if (!endDateVal) return 'active';
    const endMs = new Date(endDateVal).getTime();
    return endMs >= Date.now() ? 'active' : 'expired';
  };

  const calculatedEndDate = new Date();
  calculatedEndDate.setDate(calculatedEndDate.getDate() + durationDays);

  // New Complaint Form State
  const [isAddingComplaint, setIsAddingComplaint] = useState(false);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintPriority, setComplaintPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [assignedStaffId, setAssignedStaffId] = useState('');

  // Resolution state
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleSaveWarranty = async () => {
    setIsSaving(true);
    try {
      const startDate = existingWarranty?.startDate || new Date().toISOString();
      const endDate = new Date(new Date(startDate).getTime() + durationDays * 86400000).toISOString();
      const status = computeWarrantyStatus(endDate);

      const warrantyData: WarrantyDetails = {
        hasWarranty,
        durationDays,
        warrantyPeriodLabel,
        startDate,
        endDate,
        coverageNotes,
        status,
        issuedByStaffName: currentStaffUser?.fullName || 'إدارة DR.FIX',
        issuedAt: new Date().toISOString()
      };

      await onUpdateWarranty(warrantyData);
      alert('تم تحديث وثيقة الضمان بنجاح ✅');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareWarrantyWhatsApp = () => {
    const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('966') ? cleanPhone : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);
    const endFormatted = calculatedEndDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const msg = `🛡️✨ DR.FIX | وثيقة الضمان المعتمدة\n\n` +
      `عزيزنا العميل: ${(record.customerName || 'المحترم')}\n` +
      `سند صيانة رقم: #${record.bookingId || record.id}\n` +
      `السيارة: ${record.carModel}\n\n` +
      `📜 مدة الضمان: ${warrantyPeriodLabel}\n` +
      `📅 ساري حتى تاريخ: ${endFormatted}\n\n` +
      `🔍 تفاصيل التغطية:\n${coverageNotes}\n\n` +
      `شكرًا لثقتكم في DR.FIX 🚗⚡ في حال وجود أي ملاحظة خلال فترة الضمان، يسعدنا تواصلكم فوراً.`;

    const url = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintTitle.trim() || !complaintDescription.trim()) {
      alert('يرجى ملء عنوان وتفاصيل الشكوى');
      return;
    }

    const assignedStaff = staffList.find(s => s.id === assignedStaffId);

    const newComplaint: ServiceComplaint = {
      id: `cmp-${Date.now()}`,
      recordId: record.id,
      bookingId: record.bookingId || record.id,
      customerName: record.customerName || record.name || 'عميل المركز',
      customerPhone: record.customerPhone,
      carModel: record.carModel,
      complaintTitle: complaintTitle.trim(),
      description: complaintDescription.trim(),
      priority: complaintPriority,
      status: 'open',
      assignedStaffId: assignedStaff?.id,
      assignedStaffName: assignedStaff?.fullName || 'فريق إدارة الجودة',
      createdAt: new Date().toISOString(),
      createdBy: currentStaffUser?.fullName || 'الإدارة'
    };

    setIsSaving(true);
    try {
      await onAddComplaint(newComplaint);
      setIsAddingComplaint(false);
      setComplaintTitle('');
      setComplaintDescription('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveComplaintSubmit = async (complaintId: string) => {
    if (!resolutionNotes.trim()) {
      alert('يرجى كتابة خطوات الحل والإجراء المتخذ');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateComplaint(complaintId, {
        status: 'resolved',
        resolutionNotes: resolutionNotes.trim(),
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentStaffUser?.fullName || 'الإدارة'
      });
      setResolvingComplaintId(null);
      setResolutionNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  const complaintsList = record.complaints || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121418] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-brand-red/20 via-black/40 to-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">إدارة الضمان ونظام الشكاوى</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                سند #{record.bookingId || record.id} • {record.carModel} • {record.customerPhone}
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/10 bg-black/30">
          <button
            type="button"
            onClick={() => setActiveTab('warranty')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'warranty'
                ? 'text-brand-red border-brand-red'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>وثيقة الضمان {existingWarranty?.hasWarranty && '(ساري 🛡️)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'complaints'
                ? 'text-brand-red border-brand-red'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>سجل الشكاوى والمتابعة ({complaintsList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
          {activeTab === 'warranty' && (
            <div className="space-y-4">
              {/* Current Warranty Status Card */}
              <div className={`p-4 rounded-2xl border ${
                hasWarranty 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${hasWarranty ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <span className="font-bold text-white text-sm">
                      {hasWarranty ? 'الضمان مفعل ومعتمد لهذا السند' : 'لا يوجد ضمان مسجل'}
                    </span>
                  </div>
                  {hasWarranty && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                      ساري حتى {calculatedEndDate.toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </div>
              </div>

              {/* Warranty Toggle & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">تفعيل الضمان للسند</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHasWarranty(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        hasWarranty 
                          ? 'bg-brand-red text-white border-brand-red' 
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      ضمان مفعل
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasWarranty(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        !hasWarranty 
                          ? 'bg-white/20 text-white border-white/30' 
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      بدون ضمان
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">فترة الضمان</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { days: 30, label: '30 يوم' },
                      { days: 90, label: '3 أشهر' },
                      { days: 180, label: '6 أشهر' },
                      { days: 365, label: 'سنة كاملة' }
                    ].map(p => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => {
                          setDurationDays(p.days);
                          setWarrantyPeriodLabel(p.label);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          durationDays === p.days
                            ? 'bg-white/10 text-white border-white/20'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coverage Details */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">شروط ونطاق التغطية</label>
                <textarea 
                  value={coverageNotes}
                  onChange={e => setCoverageNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-brand-red/60 resize-none leading-relaxed"
                  placeholder="حدد ما يشمله الضمان من قطع غيار وأجور يد وفحص دوري..."
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleShareWarrantyWhatsApp}
                  disabled={!hasWarranty}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>مشاركة وثيقة الضمان للعميل واتساب 📲</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveWarranty}
                  disabled={isSaving}
                  className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>حفظ وتحديث بيانات الضمان</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="space-y-4">
              {/* Complaints Header / New Complaint Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">قائمة الشكاوى والملاحظات المسجلة</span>
                {!isAddingComplaint && (
                  <button
                    type="button"
                    onClick={() => setIsAddingComplaint(true)}
                    className="px-3 py-1.5 bg-brand-red/20 hover:bg-brand-red/30 border border-brand-red/40 text-brand-red hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل شكوى جديدة</span>
                  </button>
                )}
              </div>

              {/* New Complaint Form */}
              {isAddingComplaint && (
                <form onSubmit={handleCreateComplaint} className="p-4 rounded-2xl bg-white/5 border border-brand-red/30 space-y-3">
                  <h4 className="text-xs font-bold text-brand-red flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>تسجيل بلاغ أو شكوى جديدة من العميل</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">عنوان المشكلة أو الشكوى *</label>
                      <input 
                        type="text"
                        value={complaintTitle}
                        onChange={e => setComplaintTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                        placeholder="مثال: صوت طقطقة مستمر بعد استبدال الفحمات"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">المسؤول عن متابعة الحل</label>
                      <select
                        value={assignedStaffId}
                        onChange={e => setAssignedStaffId(e.target.value)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="">فريق الجودة والمتابعة العامة</option>
                        {staffList.map(s => (
                          <option key={s.id} value={s.id}>{s.fullName} ({s.roleTitleAr})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">درجة الأهمية</label>
                      <select
                        value={complaintPriority}
                        onChange={e => setComplaintPriority(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="urgent">🚨 عاجل جداً (خلل يوقف السيارة)</option>
                        <option value="high">⚠️ مرتفع (ملاحظة على أداء الصيانة)</option>
                        <option value="medium">⏱️ متوسط (استفسار أو موعد تأخر)</option>
                        <option value="low">💬 منخفض (ملاحظة عامة)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">تفاصيل الشكوى وأقوال العميل *</label>
                    <textarea 
                      value={complaintDescription}
                      onChange={e => setComplaintDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white resize-none"
                      placeholder="اذكر بالتفصيل ما ذكره العميل وتاريخ حدوث الملاحظة..."
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingComplaint(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>حفظ الشكوى وتكليف المسؤول</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Complaints List */}
              {complaintsList.length === 0 ? (
                <div className="p-8 text-center bg-white/5 border border-white/5 rounded-2xl text-gray-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-white">لا توجد أي شكاوى مسجلة على هذا السند</p>
                  <p className="text-gray-500 mt-0.5">سجل العميل نظيف وجميع الأعمال منفذة برضا تام.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {complaintsList.map(comp => (
                    <div key={comp.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">{comp.complaintTitle}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              comp.status === 'resolved' 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {comp.status === 'resolved' ? 'تم الحل والإغلاق ✅' : 'مفتوحة وقيد المتابعة ⏳'}
                            </span>
                            <span className="bg-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
                              الأولوية: {comp.priority === 'urgent' ? 'عاجل' : comp.priority === 'high' ? 'مرتفع' : 'عادي'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{comp.description}</p>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono shrink-0">
                          {new Date(comp.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400 flex flex-wrap items-center gap-4 pt-2 border-t border-white/5">
                        <span>المسؤول عن الحل: <strong className="text-gray-200">{comp.assignedStaffName || 'فريق الجودة'}</strong></span>
                        <span>محرر البلاغ: <strong className="text-gray-200">{comp.createdBy}</strong></span>
                      </div>

                      {/* Resolution details if resolved */}
                      {comp.status === 'resolved' && comp.resolutionNotes && (
                        <div className="p-2.5 rounded-xl bg-green-950/30 border border-green-500/20 text-xs text-green-300">
                          <strong>الإجراء المتخذ: </strong>
                          <span>{comp.resolutionNotes}</span>
                          <div className="text-[10px] text-green-400/70 mt-1 font-mono">
                            تم بواسطة: {comp.resolvedBy} • {new Date(comp.resolvedAt).toLocaleString('ar-SA')}
                          </div>
                        </div>
                      )}

                      {/* Resolve Action Form */}
                      {comp.status !== 'resolved' && (
                        <div>
                          {resolvingComplaintId === comp.id ? (
                            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 mt-2">
                              <label className="block text-[11px] text-gray-300">خطوات الحل والتسوية مع العميل</label>
                              <textarea
                                value={resolutionNotes}
                                onChange={e => setResolutionNotes(e.target.value)}
                                rows={2}
                                className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none"
                                placeholder="مثال: تم إرسال فني مجدداً لإعادة فحص الفحمات والتأكد من اختفاء الصوت وإرضاء العميل."
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setResolvingComplaintId(null)}
                                  className="px-2.5 py-1 text-xs text-gray-400 hover:text-white"
                                >
                                  إلغاء
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveComplaintSubmit(comp.id)}
                                  disabled={isSaving}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold"
                                >
                                  اعتماد الحل وإغلاق الشكوى
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingComplaintId(comp.id);
                                setResolutionNotes('');
                              }}
                              className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تسجيل حل وإغلاق الشكوى</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
