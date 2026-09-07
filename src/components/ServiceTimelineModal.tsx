import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Upload, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  MessageSquare, 
  Share2, 
  Navigation, 
  ExternalLink,
  Plus,
  Image as ImageIcon,
  Check,
  Send,
  Sparkles,
  ChevronDown,
  Wrench,
  ShieldCheck,
  Download,
  ZoomIn
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceRecord, ServiceStepLog, ServiceStepPhoto, ServiceStepKey, StaffUser } from '../types';

interface ServiceTimelineModalProps {
  record: MaintenanceRecord;
  staffList: StaffUser[];
  currentStaffUser?: StaffUser | null;
  onClose: () => void;
  onUpdateRecord: (updatedRecord: MaintenanceRecord) => void;
}

// Browser Canvas Image Compressor (compresses to max 1000px, JPEG ~60KB)
export const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const STEP_PRESETS: { 
  key: ServiceStepKey; 
  title: string; 
  badge: string; 
  icon: string; 
  defaultStatus?: MaintenanceRecord['status'];
  description: string;
}[] = [
  {
    key: 'on_the_way',
    title: 'في الطريق إلى العميل',
    badge: 'انطلاق',
    icon: '🚗',
    defaultStatus: 'on_the_way',
    description: 'توثيق تحرك الفني باتجاه موقع السيارة'
  },
  {
    key: 'arrived_inspection',
    title: 'الوصول والمعاينة والفحص المبدئي',
    badge: 'معاينة قبل البدء',
    icon: '🔍',
    defaultStatus: 'in-progress',
    description: 'تصوير حالة السيارة والقطع المتضررة قبل بدء الصيانة'
  },
  {
    key: 'in_progress',
    title: 'جاري العمل واستبدال القطع',
    badge: 'أثناء الصيانة',
    icon: '🔧',
    defaultStatus: 'in-progress',
    description: 'تصوير مراحل الشغل والقطع الجديدة أثناء التركيب'
  },
  {
    key: 'completed',
    title: 'اكتمال الصيانة والفحص النهائي',
    badge: 'تم الإنجاز',
    icon: '🏁',
    defaultStatus: 'completed',
    description: 'تصوير النتيجة النهائية للسيارة بعد انتهاء العمل بنجاح'
  },
  {
    key: 'custom',
    title: 'توثيق أو ملاحظة ميدانية إضافية',
    badge: 'ملاحظة',
    icon: '📝',
    description: 'إضافة توثيق مخصص أو فاتورة أو ملاحظة فنية'
  }
];

export const ServiceTimelineModal: React.FC<ServiceTimelineModalProps> = ({
  record,
  staffList,
  currentStaffUser,
  onClose,
  onUpdateRecord
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'add_step' | 'assign'>('timeline');
  const [selectedPreset, setSelectedPreset] = useState<typeof STEP_PRESETS[0]>(STEP_PRESETS[1]);
  const [stepNote, setStepNote] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<{ url: string; caption: string; isInternalOnly: boolean }[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string; title?: string } | null>(null);
  
  // Technician Assignment State
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(record.assignedStaffId || '');
  const [isAssigning, setIsAssigning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps: ServiceStepLog[] = record.serviceSteps || [];

  // Active technicians from staff list
  const technicians = staffList.filter(s => s.isActive && (s.role === 'technician' || s.role === 'dispatcher' || s.role === 'super_admin'));

  // Clean phone numbers for whatsapp
  const cleanCustomerPhone = (record.customerPhone || '').replace(/\D/g, '');
  const customerWaPhone = cleanCustomerPhone.startsWith('966') 
    ? cleanCustomerPhone 
    : cleanCustomerPhone.startsWith('0') 
      ? '966' + cleanCustomerPhone.slice(1) 
      : '966' + cleanCustomerPhone;

  // Handle Photo selection & compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    try {
      const newPhotos: { url: string; caption: string; isInternalOnly: boolean }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedBase64 = await compressImage(file, 900, 900, 0.75);
        newPhotos.push({
          url: compressedBase64,
          caption: '',
          isInternalOnly: false
        });
      }
      setSelectedPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Error compressing images:', err);
      alert('حدث خطأ أثناء معالجة الصور، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveSelectedPhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleTogglePhotoVisibility = (index: number) => {
    setSelectedPhotos(prev => prev.map((p, i) => i === index ? { ...p, isInternalOnly: !p.isInternalOnly } : p));
  };

  const handleUpdatePhotoCaption = (index: number, caption: string) => {
    setSelectedPhotos(prev => prev.map((p, i) => i === index ? { ...p, caption } : p));
  };

  // Submit new step with photos
  const handleSaveStep = async () => {
    if (!selectedPreset) return;
    setIsSaving(true);

    try {
      const authorName = currentStaffUser?.fullName || 'الفني المسؤول';
      const authorId = currentStaffUser?.id || '';

      const photosPayload: ServiceStepPhoto[] = selectedPhotos.map(p => ({
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        url: p.url,
        caption: p.caption.trim() || undefined,
        isInternalOnly: p.isInternalOnly,
        uploadedAt: new Date().toISOString(),
        uploadedBy: authorName
      }));

      const newStep: ServiceStepLog = {
        id: `step_${Date.now()}`,
        stepKey: selectedPreset.key,
        title: selectedPreset.title,
        note: stepNote.trim() || undefined,
        photos: photosPayload,
        recordedBy: authorName,
        recordedByStaffId: authorId,
        recordedAt: new Date().toISOString(),
        statusChangeTo: selectedPreset.defaultStatus
      };

      const updatedSteps = [...steps, newStep];
      const newStatus = selectedPreset.defaultStatus || record.status;

      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps,
        status: newStatus
      };

      onUpdateRecord(updatedRecord);

      // Reset form
      setStepNote('');
      setSelectedPhotos([]);
      setActiveTab('timeline');
    } catch (err) {
      console.error('Error saving step:', err);
      alert('تعذر حفظ المرحلة، يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setIsSaving(false);
    }
  };

  // Assign Technician
  const handleSaveTechnician = async () => {
    if (!selectedTechnicianId) return;
    setIsAssigning(true);

    try {
      const tech = staffList.find(s => s.id === selectedTechnicianId);
      if (!tech) return;

      const docRef = doc(db, 'maintenance', record.id);
      const payload = {
        assignedStaffId: tech.id,
        assignedStaffName: tech.fullName,
        assignedStaffPhone: tech.phone || '',
        assignedAt: new Date().toISOString(),
        status: record.status === 'new' ? 'accepted' : record.status,
        updatedAt: serverTimestamp()
      };

      await updateDoc(docRef, payload);

      const updatedRecord: MaintenanceRecord = {
        ...record,
        ...payload
      };

      onUpdateRecord(updatedRecord);
      setActiveTab('timeline');
    } catch (err) {
      console.error('Error assigning technician:', err);
      alert('تعذر إسناد الفني، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Delete a step
  const handleDeleteStep = async (stepId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخطوة والصور التابعة لها؟')) return;

    try {
      const updatedSteps = steps.filter(s => s.id !== stepId);
      const docRef = doc(db, 'maintenance', record.id);
      await updateDoc(docRef, {
        serviceSteps: updatedSteps,
        updatedAt: serverTimestamp()
      });

      const updatedRecord: MaintenanceRecord = {
        ...record,
        serviceSteps: updatedSteps
      };
      onUpdateRecord(updatedRecord);
    } catch (err) {
      console.error('Error deleting step:', err);
      alert('تعذر الحذف.');
    }
  };

  // WhatsApp text to send task details to technician
  const getTechnicianWhatsAppUrl = () => {
    const tech = staffList.find(s => s.id === (record.assignedStaffId || selectedTechnicianId));
    const techPhone = (tech?.phone || '').replace(/\D/g, '').replace(/^0/, '966');
    if (!techPhone) return '#';

    const customerName = (record.customerName || record.name || 'عميل').trim();
    const gpsLink = record.coordinates?.latitude && record.coordinates?.longitude
      ? `https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`
      : record.location || 'غير محدد';

    const text = encodeURIComponent(
      `🚗🔧 *مهمة صيانة ميدانية جديدة - DR.FIX*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *العميل:* ${customerName}\n` +
      `📱 *جوال العميل:* ${record.customerPhone}\n` +
      `🚘 *السيارة:* ${record.carModel}\n` +
      `🛠️ *الخدمة:* ${record.serviceType}\n` +
      `🔢 *رقم الحجز:* #${record.bookingId || record.id.slice(0, 6)}\n` +
      `📍 *الموقع:* ${gpsLink}\n` +
      `${record.notes ? `📝 *ملاحظات:* ${record.notes}\n` : ''}` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `يرجى فتح لوحة التحكم لتوثيق الصور وخطوات العمل خطوة بخطوة 📸`
    );

    return `https://wa.me/${techPhone}?text=${text}`;
  };

  // WhatsApp text to send progress update to customer
  const getCustomerProgressWhatsAppUrl = () => {
    const customerName = (record.customerName || record.name || 'عميلنا العزيز').trim();
    const photosCount = steps.reduce((sum, s) => sum + s.photos.filter(p => !p.isInternalOnly).length, 0);

    const text = encodeURIComponent(
      `🚗⚡ *مستجدات صيانة سيارتك - DR.FIX*\n\n` +
      `أهلاً ${customerName} 👋\n` +
      `تم توثيق مراحل صيانة سيارتك (${record.carModel}) رقم الحجز: #${record.bookingId || record.id.slice(0, 6)}.\n\n` +
      `📸 تم رفع (${photosCount}) صور للمعاينة وقطع الغيار والتنفيذ.\n` +
      `يمكنك متابعة التقرير وسجل الصيانة المصور في أي وقت عبر موقعنا أو التواصل معنا مباشرة 🔧⚡\n\n` +
      `شكراً لثقتكم بمركز Dr. Fix!`
    );

    return `https://wa.me/${customerWaPhone}?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="glass-card max-w-2xl w-full max-h-[92vh] flex flex-col border-brand-red/30 rounded-3xl overflow-hidden shadow-2xl relative my-auto bg-brand-dark/95"
      >
        {/* Modal Top Bar */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 bg-black/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/25 flex items-center justify-center text-brand-red shrink-0 shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">{record.carModel}</h3>
                {record.bookingId && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-brand-red font-bold">
                    #{record.bookingId}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">سجل مراحل الصيانة وإرفاق الصور الميدانية</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Info Strip */}
        <div className="px-5 sm:px-6 py-3 bg-white/5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">الفني المسؤول:</span>
            {record.assignedStaffName ? (
              <span className="font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <Wrench className="w-3 h-3" />
                {record.assignedStaffName}
              </span>
            ) : (
              <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
                لم يتم الإسناد بعد
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a 
              href={`tel:${record.customerPhone}`}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 flex items-center gap-1 transition-colors"
              title="اتصال بالعميل"
            >
              <Phone className="w-3 h-3 text-brand-red" />
              <span>{record.customerPhone}</span>
            </a>

            {record.coordinates?.latitude && record.coordinates?.longitude && (
              <a 
                href={`https://maps.google.com/?q=${record.coordinates.latitude},${record.coordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/25 flex items-center gap-1 transition-colors"
                title="موقع العميل على الخريطة"
              >
                <Navigation className="w-3 h-3" />
                <span>الموقع GPS</span>
              </a>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 border-b border-white/5 flex gap-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'timeline' 
                ? 'text-brand-red border-brand-red' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>سجل الخطوات والصور ({steps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add_step')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add_step' 
                ? 'text-brand-red border-brand-red' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة خطوة وصور جديدة 📸</span>
          </button>

          <button
            onClick={() => setActiveTab('assign')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'assign' 
                ? 'text-brand-red border-brand-red' 
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>إسناد الفني</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {steps.length === 0 ? (
                <div className="text-center py-10 px-4 bg-white/5 rounded-2xl border border-dashed border-white/10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto text-brand-red">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">لا توجد صور أو مراحل مسجلة بعد</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    يمكن للفني الآن البدء بتوثيق مراحل العمل خطوة بخطوة وإرفاق صور المعاينة وقطع الغيار والانتهاء.
                  </p>
                  <button
                    onClick={() => setActiveTab('add_step')}
                    className="mt-2 px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-brand-red/20 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول خطوة الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 pb-1">
                    <span>خط سير العمل الميداني ({steps.length} مراحل مسجلة):</span>
                    <a
                      href={getCustomerProgressWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                      title="إرسال تقرير بالصور للعميل عبر الواتساب"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>مشاركة التقرير مع العميل</span>
                    </a>
                  </div>

                  <div className="relative border-r-2 border-white/10 pr-4 sm:pr-6 space-y-6 mr-2 sm:mr-3">
                    {steps.map((step, sIdx) => {
                      const preset = STEP_PRESETS.find(p => p.key === step.stepKey) || STEP_PRESETS[4];
                      const stepDate = step.recordedAt ? new Date(step.recordedAt) : new Date();

                      return (
                        <div key={step.id || sIdx} className="relative space-y-2.5">
                          {/* Dot on timeline */}
                          <div className="absolute -right-[23px] sm:-right-[31px] top-1.5 w-4 h-4 rounded-full bg-brand-red border-2 border-brand-dark flex items-center justify-center text-[8px] text-white shadow-md">
                            {sIdx + 1}
                          </div>

                          {/* Step Header */}
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-white text-sm flex items-center gap-2">
                                  <span>{preset.icon}</span>
                                  <span>{step.title}</span>
                                </div>
                                <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    {stepDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} • {stepDate.toLocaleDateString('ar-SA')}
                                  </span>
                                  {step.recordedBy && (
                                    <span className="text-gray-300 font-medium">
                                      بواسطة: {step.recordedBy}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteStep(step.id)}
                                  className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-white/5 rounded-lg transition-colors"
                                  title="حذف هذه الخطوة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Step Note */}
                            {step.note && (
                              <p className="text-xs text-gray-300 bg-black/30 p-2.5 rounded-xl border border-white/5 whitespace-pre-line leading-relaxed">
                                {step.note}
                              </p>
                            )}

                            {/* Photos Grid */}
                            {step.photos && step.photos.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="text-[11px] text-gray-400 font-medium">
                                  الصور المرفقة ({step.photos.length}):
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {step.photos.map((photo, pIdx) => (
                                    <div 
                                      key={photo.id || pIdx}
                                      onClick={() => setLightboxImage({ url: photo.url, caption: photo.caption, title: step.title })}
                                      className="group relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 cursor-pointer shadow-sm hover:border-brand-red/50 transition-all"
                                    >
                                      <img 
                                        src={photo.url} 
                                        alt={photo.caption || step.title} 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                                        <span className="text-[10px] text-white truncate max-w-[80%]">
                                          {photo.caption || 'تكبير الصورة'}
                                        </span>
                                        <ZoomIn className="w-3.5 h-3.5 text-white shrink-0" />
                                      </div>
                                      {/* Visibility Badge */}
                                      <div className="absolute top-1.5 right-1.5">
                                        {photo.isInternalOnly ? (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/80 text-black backdrop-blur-sm shadow flex items-center gap-0.5" title="خاص بالإدارة فقط - لا يظهر للعميل">
                                            <EyeOff className="w-2.5 h-2.5" />
                                            خاص
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/80 text-white backdrop-blur-sm shadow flex items-center gap-0.5" title="يظهر للعميل في التقرير">
                                            <Eye className="w-2.5 h-2.5" />
                                            للعميل
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD STEP & PHOTOS */}
          {activeTab === 'add_step' && (
            <div className="space-y-5">
              {/* Step Preset Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  اختر مرحلة الصيانة الحالية:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STEP_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setSelectedPreset(preset)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                        selectedPreset.key === preset.key
                          ? 'bg-brand-red/15 border-brand-red text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{preset.title}</span>
                          {selectedPreset.key === preset.key && (
                            <Check className="w-3.5 h-3.5 text-brand-red shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{preset.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 block">
                  ملاحظات الفني حول هذه المرحلة (اختياري):
                </label>
                <textarea
                  value={stepNote}
                  onChange={(e) => setStepNote(e.target.value)}
                  placeholder="مثال: تم فحص الفرامل الأمامية وتبين تآكل الفحمات، تم استبدالها بقطع أصلية وتجربة السيارة بنجاح..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-colors resize-none"
                />
              </div>

              {/* Photo Upload Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">
                    إرفاق صور المرحلة (كاميرا أو ألبوم):
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {selectedPhotos.length} صور محددة
                  </span>
                </div>

                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-brand-red/60 bg-white/5 hover:bg-white/10 rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-red/10 group-hover:bg-brand-red/20 border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red transition-all">
                    {isProcessingImages ? (
                      <div className="w-5 h-5 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">
                      {isProcessingImages ? 'جاري ضغط ومعالجة الصور...' : 'انقر لالتقاط صورة أو اختيار صور من الجوال'}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      يدعم رفع صور متعددة، ويتم ضغطها تلقائياً لتكون خفيفة وسريعة الرفع
                    </p>
                  </div>
                </div>

                {/* Previews of selected photos */}
                {selectedPhotos.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-gray-400 font-medium">الصور المختارة قبل الحفظ:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedPhotos.map((photo, idx) => (
                        <div key={idx} className="bg-white/5 p-2.5 rounded-2xl border border-white/10 space-y-2">
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                            <img src={photo.url} alt="Selected" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedPhoto(idx)}
                              className="absolute top-1.5 left-1.5 p-1 bg-red-600/80 hover:bg-red-700 text-white rounded-lg backdrop-blur-sm transition-colors cursor-pointer"
                              title="حذف الصورة"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <input 
                              type="text"
                              value={photo.caption}
                              onChange={(e) => handleUpdatePhotoCaption(idx, e.target.value)}
                              placeholder="وصف مختصر (مثال: الفحمات القديمة)..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-brand-red"
                            />

                            <label className="flex items-center justify-between text-[10px] text-gray-300 cursor-pointer pt-0.5">
                              <span>مرئية للعميل في التقرير:</span>
                              <input 
                                type="checkbox"
                                checked={!photo.isInternalOnly}
                                onChange={() => handleTogglePhotoVisibility(idx)}
                                className="rounded text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSaveStep}
                  disabled={isSaving || isProcessingImages}
                  className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ وتوثيق المرحلة 📸</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ASSIGN TECHNICIAN */}
          {activeTab === 'assign' && (
            <div className="space-y-5">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-red" />
                  <span>إسناد الطلب إلى فني صيانة ميداني</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  عند إسناد الطلب للفني، سيظهر في حسابه الخاص ليتمكن من متابعة العميل وتوثيق الصور والخطوات مباشرة من جواله.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">
                  اختر الفني المسؤول من القائمة:
                </label>
                {technicians.length === 0 ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-xs text-yellow-300">
                    لم تقم بإضافة فنيين في تبويب "إدارة الموظفين" بعد. يمكنك إضافة فني من تبويب الموظفين أولاً.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {technicians.map((tech) => (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => setSelectedTechnicianId(tech.id)}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                          selectedTechnicianId === tech.id
                            ? 'bg-brand-red/15 border-brand-red text-white shadow-md'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white">{tech.fullName}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{tech.roleTitleAr} {tech.phone ? `• ${tech.phone}` : ''}</div>
                        </div>
                        {selectedTechnicianId === tech.id && (
                          <Check className="w-4 h-4 text-brand-red shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                {selectedTechnicianId && (
                  <a
                    href={getTechnicianWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all"
                    title="إرسال بيانات الطلب واللوكيشن للفني على الواتساب"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>إرسال تفاصيل المهمة للفني عبر واتساب ↗</span>
                  </a>
                )}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTechnician}
                    disabled={isAssigning || !selectedTechnicianId}
                    className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-red/25 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isAssigning ? 'جاري الإسناد...' : 'تأكيد إسناد الفني'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Lightbox Modal for Full Size Photo Viewing */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 left-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.caption || 'صورة الصيانة'} 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/15 shadow-2xl"
              />

              {(lightboxImage.title || lightboxImage.caption) && (
                <div className="mt-3 text-center space-y-0.5">
                  {lightboxImage.title && <div className="text-white text-sm font-bold">{lightboxImage.title}</div>}
                  {lightboxImage.caption && <div className="text-gray-400 text-xs">{lightboxImage.caption}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
