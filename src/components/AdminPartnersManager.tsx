import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Handshake,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  ExternalLink,
  Phone,
  MessageCircle,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Check,
  X,
  Search,
  Tag,
  Clock,
  Sparkles,
  AlertTriangle,
  Building2,
  Navigation
} from 'lucide-react';
import { Partner } from '../types';
import { cn } from '../lib/utils';
import { useScrollLock } from '../lib/scrollLock';

interface AdminPartnersManagerProps {
  partners: Partner[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => Promise<void>;
  onUpdatePartner: (id: string, partner: Partial<Partner>) => Promise<void>;
  onDeletePartner: (id: string) => Promise<void>;
  isSectionVisible?: boolean;
  onToggleSectionVisibility?: () => Promise<void> | void;
}

const CATEGORY_OPTIONS = [
  'ميكانيكا وتوضيب',
  'سمكرة ودهان',
  'كهرباء وتكييف',
  'قطع غيار وزيوت',
  'فحص وبرمجة كمبيوتر',
  'تلميع وحماية ونانو سيراميك',
  'ميزان وترصيص وإطارات',
  'زجاج وتنجيد سيارات',
  'صيانة عامة'
];

const PRESET_IMAGES = [
  { label: 'ورشة ميكانيكا حديثة', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop' },
  { label: 'فرن سمكرة ودهان', url: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?q=80&w=800&auto=format&fit=crop' },
  { label: 'صيانة كهرباء وتكييف', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop' },
  { label: 'محل قطع غيار أصلية', url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop' },
  { label: 'رفع وفحص سيارات', url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop' },
  { label: 'مركز تلميع وعناية', url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=800&auto=format&fit=crop' }
];

export const AdminPartnersManager: React.FC<AdminPartnersManagerProps> = ({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  isSectionVisible,
  onToggleSectionVisibility,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<Partner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock background scrolling when modal or delete confirmation is open
  useScrollLock(isModalOpen || !!deleteConfirmPartner);

  // Form State
  const [formData, setFormData] = useState<Omit<Partner, 'id'>>({
    name: '',
    category: 'ميكانيكا وتوضيب',
    description: '',
    imageUrl: PRESET_IMAGES[0].url,
    locationUrl: '',
    address: '',
    phone: '',
    whatsapp: '',
    discountRate: '',
    workingHours: '8:00 ص - 10:00 م',
    isActive: true,
    rating: 4.9,
    order: 1
  });

  const handleOpenAddModal = () => {
    setEditingPartner(null);
    setFormData({
      name: '',
      category: 'ميكانيكا وتوضيب',
      description: '',
      imageUrl: PRESET_IMAGES[0].url,
      locationUrl: '',
      address: 'جدة - ',
      phone: '05',
      whatsapp: '9665',
      discountRate: 'خصم خاص لعملاء Dr.Fix',
      workingHours: '8:00 ص - 10:00 م',
      isActive: true,
      rating: 4.9,
      order: partners.length + 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      category: partner.category || 'ميكانيكا وتوضيب',
      description: partner.description || '',
      imageUrl: partner.imageUrl || PRESET_IMAGES[0].url,
      locationUrl: partner.locationUrl || '',
      address: partner.address || '',
      phone: partner.phone || '',
      whatsapp: partner.whatsapp || '',
      discountRate: partner.discountRate || '',
      workingHours: partner.workingHours || '8:00 ص - 10:00 م',
      isActive: partner.isActive !== false,
      rating: partner.rating || 4.9,
      order: partner.order || 1
    });
    setIsModalOpen(true);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميغابايت');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('يرجى كتابة اسم الورشة أو المحل');
      return;
    }
    if (!formData.locationUrl.trim()) {
      alert('يرجى وضع رابط موقع الورشة في خرائط جوجل');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPartner && editingPartner.id) {
        await onUpdatePartner(editingPartner.id, formData);
      } else {
        await onAddPartner(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving partner:', err);
      alert('حدث خطأ أثناء حفظ بيانات الشريك');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    if (!partner.id) return;
    try {
      await onUpdatePartner(partner.id, { isActive: !partner.isActive });
    } catch (err) {
      console.error('Error toggling partner status:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmPartner || !deleteConfirmPartner.id) return;
    setIsSubmitting(true);
    try {
      await onDeletePartner(deleteConfirmPartner.id);
      setDeleteConfirmPartner(null);
    } catch (err) {
      console.error('Error deleting partner:', err);
      alert('تعذر حذف الشريك');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter partners
  const filtered = partners.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red">
            <Handshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <span>شركاء النجاح</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-red/20 text-brand-red font-mono font-black">
                {partners.length} ورشة ومحل
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              إدارة الورش والمحلات الشريكة ومواقعها على خرائط جوجل وعروضها لعملاء Dr.Fix
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onToggleSectionVisibility && (
            <button
              onClick={onToggleSectionVisibility}
              className={cn(
                "px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm",
                isSectionVisible !== false
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25"
              )}
              title={isSectionVisible !== false ? "القسم معروض حالياً في الموقع - اضغط لإخفائه" : "القسم مخفي حالياً عن الزوار - اضغط لإظهاره"}
            >
              {isSectionVisible !== false ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>القسم في الموقع: معروض</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-red-400" />
                  <span>القسم في الموقع: مخفي</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-brand-red hover:bg-brand-red/90 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-red/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شريك جديد</span>
          </button>
        </div>
      </div>

      {/* Warning banner when section is completely hidden from public */}
      {isSectionVisible === false && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-200">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">
                قسم شركاء النجاح مخفي بالكامل عن زوار الموقع حالياً
              </div>
              <p className="text-xs text-red-300/80 mt-0.5">
                تم إخفاء رابط الصفحة من القائمة العلوية والفوتر، ويتم تحويل الزوار للصفحة الرئيسية تلقائياً.
              </p>
            </div>
          </div>
          {onToggleSectionVisibility && (
            <button
              onClick={onToggleSectionVisibility}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>إظهار وتفعيل القسم الآن</span>
            </button>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الورشة، التخصص، أو الحي..."
          className="w-full bg-black/40 border border-white/10 rounded-xl pr-11 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-red"
        />
      </div>

      {/* Partners List / Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-300">لا توجد ورش مضافة بعد</h4>
          <p className="text-xs text-gray-500 mt-1">
            اضغط على "إضافة شريك جديد" لإضافة ورشة أو محل شريك إلى الصفحة العامة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(partner => (
            <div
              key={partner.id}
              className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 transition-all ${
                partner.isActive !== false
                  ? 'bg-neutral-900/90 border-white/10 hover:border-white/20'
                  : 'bg-neutral-950/80 border-white/5 opacity-60'
              }`}
            >
              {/* Partner Card Header */}
              <div className="flex items-start gap-3">
                <img
                  src={partner.imageUrl || PRESET_IMAGES[0].url}
                  alt={partner.name}
                  className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 bg-black/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PRESET_IMAGES[0].url;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20">
                      {partner.category}
                    </span>
                    {partner.isActive !== false ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        مفعل
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        معطل
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white truncate mt-1" title={partner.name}>
                    {partner.name}
                  </h4>
                  {partner.address && (
                    <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-brand-red shrink-0" />
                      <span>{partner.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Perks & Notes */}
              {partner.discountRate && (
                <div className="text-[11px] font-bold text-brand-red bg-brand-red/10 px-2.5 py-1 rounded-lg border border-brand-red/20 flex items-center gap-1.5">
                  <Tag className="w-3 h-3 shrink-0" />
                  <span className="truncate">{partner.discountRate}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1 text-xs">
                {/* Location Map Link */}
                {partner.locationUrl && (
                  <a
                    href={partner.locationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center gap-1 text-[11px] font-bold transition-all"
                    title="فتح في خرائط جوجل"
                  >
                    <Navigation className="w-3.5 h-3.5 text-brand-red" />
                    <span>الخريطة</span>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                )}

                <div className="flex items-center gap-1">
                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(partner)}
                    className={`p-2 rounded-lg transition-all ${
                      partner.isActive !== false
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-white/5 text-gray-500 hover:bg-white/10'
                    }`}
                    title={partner.isActive !== false ? 'تعطيل الظهور' : 'تفعيل الظهور'}
                  >
                    {partner.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEditModal(partner)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirmPartner(partner)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Partner Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-neutral-900 border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto max-h-[94dvh] sm:max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-brand-red" />
                  <h3 className="font-bold text-white text-base sm:text-lg">
                    {editingPartner ? 'تعديل بيانات الشريك' : 'إضافة ورشة أو محل شريك جديد'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 custom-tabs-scrollbar">
                {/* Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      اسم الورشة أو المحل <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: ورشة النخبة لصيانة المحركات"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      التخصص / النشاط <span className="text-brand-red">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red"
                    >
                      {CATEGORY_OPTIONS.map(cat => (
                        <option key={cat} value={cat} className="bg-neutral-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location Google Maps URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-red" />
                      <span>رابط الموقع على خرائط جوجل (Google Maps URL) <span className="text-brand-red">*</span></span>
                    </span>
                    {formData.locationUrl && (
                      <a
                        href={formData.locationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-brand-red hover:underline flex items-center gap-0.5"
                      >
                        تجربة الرابط <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="مثال: https://maps.google.com/?q=... أو https://goo.gl/maps/..."
                    value={formData.locationUrl}
                    onChange={e => setFormData({ ...formData, locationUrl: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red font-mono dir-ltr text-left"
                  />
                  <p className="text-[10px] text-gray-500">
                    افتح موقع الورشة في خرائط جوجل، ثم اضغط "مشاركة" وانسخ الرابط والصقه هنا.
                  </p>
                </div>

                {/* Address Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    العنوان المكتوب (المدينة - الحي - الشارع)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: جدة - حي بني مالك، شارع فلسطين"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                {/* Workshop Image Upload & URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                    <span>صورة أو واجهة الورشة / المحل</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-brand-red hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>رفع صورة من الجهاز</span>
                    </button>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex gap-3 items-center">
                    <img
                      src={formData.imageUrl || PRESET_IMAGES[0].url}
                      alt="معاينة"
                      className="w-20 h-14 rounded-xl object-cover border border-white/10 bg-black/40 shrink-0"
                    />
                    <input
                      type="text"
                      placeholder="رابط الصورة المباشر أو اختر من النماذج أدناه..."
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-mono dir-ltr text-left"
                    />
                  </div>

                  {/* Preset Quick Images */}
                  <div className="pt-1">
                    <p className="text-[10px] text-gray-500 mb-1.5">أو اختر صورة توضيحية سريعة:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PRESET_IMAGES.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                          className={`relative aspect-[16/10] rounded-lg overflow-hidden border transition-all ${
                            formData.imageUrl === preset.url
                              ? 'border-brand-red ring-2 ring-brand-red/30'
                              : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact Phone & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-brand-red" />
                      <span>رقم الهاتف للاتصال</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>رقم الواتساب</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="9665xxxxxxxx"
                      value={formData.whatsapp}
                      onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red font-mono"
                    />
                  </div>
                </div>

                {/* Discount & Working Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-brand-red" />
                      <span>ميزة أو خصم عملاء Dr.Fix</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: خصم 15% لعملاء Dr.Fix أو فحص كمبيوتر مجاني"
                      value={formData.discountRate}
                      onChange={e => setFormData({ ...formData, discountRate: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>ساعات وأوقات العمل</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 8:00 ص - 10:00 م"
                      value={formData.workingHours}
                      onChange={e => setFormData({ ...formData, workingHours: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    نبذة وتفاصيل خدمات الورشة
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب نبذة مختصرة عن الورشة، التجهيزات، والخدمات المميزة التي تقدمها..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-red resize-none"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-black/30 border border-white/5 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block">تفعيل الظهور في الموقع</span>
                    <span className="text-[11px] text-gray-400">إذا تم التعطيل، ستختفي الورشة من صفحة شركاء النجاح العامة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.isActive ? 'bg-brand-red' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-1' : 'translate-x-7'
                      }`}
                    />
                  </button>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red/90 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-brand-red/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>جاري الحفظ...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingPartner ? 'حفظ التعديلات' : 'إضافة الشريك الآن'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm overscroll-contain">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-white/15 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-5 shadow-2xl max-h-[94dvh] overflow-y-auto overscroll-contain"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  تأكيد حذف الشريك
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف <span className="font-bold text-white">"{deleteConfirmPartner.name}"</span> من قائمة الشركاء؟ لا يمكن التراجع عن هذه العملية.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPartner(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20"
                >
                  {isSubmitting ? 'جاري الحذف...' : 'نعم، حذف نهائي'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPartnersManager;
