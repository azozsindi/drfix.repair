import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Car, 
  Wrench, 
  ZoomIn, 
  X, 
  Share2, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MaintenanceRecord, ServiceStepLog, ServiceStepPhoto } from '../types';

interface CustomerVisualReportProps {
  record: MaintenanceRecord;
  className?: string;
}

export const CustomerVisualReport: React.FC<CustomerVisualReportProps> = ({
  record,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption?: string; title?: string } | null>(null);

  const steps: ServiceStepLog[] = record.serviceSteps || [];
  
  // Filter only customer-visible steps (internal/private steps are hidden)
  const visibleSteps = steps.filter(step => step.isInternalOnly !== true && step.isCustomerVisible !== false);

  // Filter only customer-visible photos
  const customerVisiblePhotos: { photo: ServiceStepPhoto; stepTitle: string; stepKey: string; time: string }[] = [];
  
  visibleSteps.forEach(step => {
    (step.photos || []).forEach(photo => {
      if (photo.isInternalOnly !== true && photo.isCustomerVisible !== false) {
        customerVisiblePhotos.push({
          photo,
          stepTitle: step.title,
          stepKey: step.stepKey,
          time: step.recordedAt ? new Date(step.recordedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''
        });
      }
    });
  });

  if (visibleSteps.length === 0 && customerVisiblePhotos.length === 0) {
    return null; // Don't clutter if no steps are logged yet
  }

  // Calculate progress percent
  const getProgressPercent = () => {
    if (record.status === 'completed') return 100;
    if (record.status === 'in-progress') return 75;
    if (record.status === 'on_the_way') return 45;
    if (record.status === 'accepted') return 25;
    return 10;
  };

  return (
    <div className={`mt-4 pt-4 border-t border-white/10 ${className}`}>
      {/* Header Accordion Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-brand-red/15 via-white/5 to-white/5 border border-brand-red/25 hover:border-brand-red/40 transition-all text-right cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>تقرير الصيانة المصور ومراحل العمل الميدانية</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand-red text-white">
                {customerVisiblePhotos.length} صور
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              توثيق شفاف لكل خطوة وقطعة غيار تم فحصها أو استبدالها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-[11px] font-bold text-brand-red hidden sm:inline">
            {isOpen ? 'إخفاء التفاصيل' : 'عرض التقرير والصور'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-4 pt-4"
          >
            {/* Progress Bar */}
            <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-300">مرحلة التنفيذ الحالية:</span>
                <span className="text-emerald-400">
                  {record.status === 'completed' ? 'تم اكتمال الصيانة بنجاح 🏁' :
                   record.status === 'in-progress' ? 'جاري العمل والصيانة 🔧' :
                   record.status === 'on_the_way' ? 'الفني في الطريق إليك 🚗' :
                   'تم اعتماد الحجز وجاري التجهيز ✅'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-red to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${getProgressPercent()}%` }}
                />
              </div>
              {record.assignedStaffName && (
                <div className="text-[11px] text-gray-400 flex items-center gap-1 pt-1">
                  <Wrench className="w-3 h-3 text-brand-red" />
                  <span>الفني المعتمد والمشرف: <b className="text-gray-200">{record.assignedStaffName}</b></span>
                </div>
              )}
            </div>

            {/* Photos Gallery */}
            {customerVisiblePhotos.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-red" />
                  <span>صور مراحل الصيانة والفحص الميداني:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {customerVisiblePhotos.map((item, idx) => (
                    <div
                      key={item.photo.id || idx}
                      onClick={() => setLightboxPhoto({ url: item.photo.url, caption: item.photo.caption, title: item.stepTitle })}
                      className="group relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 cursor-pointer shadow-sm hover:border-brand-red/50 transition-all"
                    >
                      <img 
                        src={item.photo.url} 
                        alt={item.photo.caption || item.stepTitle} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 justify-between">
                        <span className="text-[10px] text-white truncate max-w-[80%]">
                          {item.photo.caption || item.stepTitle}
                        </span>
                        <ZoomIn className="w-3.5 h-3.5 text-white shrink-0" />
                      </div>
                      <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-gray-200 font-medium">
                        {item.time || item.stepTitle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps Timeline Details */}
            {visibleSteps.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-gray-300">سجل الخطوات والملاحظات:</div>
                <div className="space-y-2">
                  {visibleSteps.map((step, idx) => {
                    const stepTime = step.recordedAt ? new Date(step.recordedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div key={step.id || idx} className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>{step.title}</span>
                          <span className="text-[10px] text-gray-400 font-normal font-mono">{stepTime}</span>
                        </div>
                        {step.estimatedArrival && (
                          <div className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                            <span>⏱️ المدة المتوقعة للوصول:</span>
                            <span>{step.estimatedArrival}</span>
                          </div>
                        )}
                        {step.note && (
                          <p className="text-[11px] text-gray-300 leading-relaxed pt-0.5 whitespace-pre-line">
                            {step.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full screen photo modal */}
      <AnimatePresence>
        {lightboxPhoto && (
          <div 
            onClick={() => setLightboxPhoto(null)}
            className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-12 left-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <img 
                src={lightboxPhoto.url} 
                alt={lightboxPhoto.caption || 'صورة الصيانة'} 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/15 shadow-2xl"
              />

              {(lightboxPhoto.title || lightboxPhoto.caption) && (
                <div className="mt-3 text-center space-y-0.5">
                  {lightboxPhoto.title && <div className="text-white text-sm font-bold">{lightboxPhoto.title}</div>}
                  {lightboxPhoto.caption && <div className="text-gray-400 text-xs">{lightboxPhoto.caption}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
