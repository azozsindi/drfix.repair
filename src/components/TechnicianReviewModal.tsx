import React, { useState } from 'react';
import { 
  Star, 
  UserCheck, 
  Sparkles, 
  Clock, 
  Wrench, 
  Smile, 
  CheckCircle2, 
  X,
  Share2
} from 'lucide-react';
import { MaintenanceRecord, TechnicianDetailedReview, StaffUser } from '../types';

interface TechnicianReviewModalProps {
  record: MaintenanceRecord;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (review: TechnicianDetailedReview) => Promise<void>;
}

export const TechnicianReviewModal: React.FC<TechnicianReviewModalProps> = ({
  record,
  isOpen,
  onClose,
  onSaveReview
}) => {
  if (!isOpen) return null;

  const existing = record.techDetailedReview;

  const [workQuality, setWorkQuality] = useState<number>(existing?.workQualityRating || 5);
  const [punctuality, setPunctuality] = useState<number>(existing?.punctualityRating || 5);
  const [manner, setManner] = useState<number>(existing?.mannerRating || 5);
  const [cleanliness, setCleanliness] = useState<number>(existing?.cleanlinessRating || 5);
  const [feedbackNotes, setFeedbackNotes] = useState<string>(existing?.feedbackNotes || '');
  const [reviewerName, setReviewerName] = useState<string>(existing?.submittedByCustomerName || record.customerName || record.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const overallAvg = Number(((workQuality + punctuality + manner + cleanliness) / 4).toFixed(1));

  const renderStars = (currentVal: number, setVal: (val: number) => void) => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => setVal(star)}
          className="p-1 text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
        >
          <Star className={`w-5 h-5 ${star <= currentVal ? 'text-brand-red fill-brand-red' : 'text-gray-600'}`} />
        </button>
      ))}
      <span className="font-mono text-xs font-bold text-white mr-2">{currentVal} / 5</span>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const reviewData: TechnicianDetailedReview = {
        workQualityRating: workQuality,
        punctualityRating: punctuality,
        mannerRating: manner,
        cleanlinessRating: cleanliness,
        overallRating: overallAvg,
        feedbackNotes: feedbackNotes.trim(),
        submittedAt: new Date().toISOString(),
        submittedByCustomerName: reviewerName.trim() || 'عميل المركز'
      };
      await onSaveReview(reviewData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareReviewWhatsApp = () => {
    const cleanPhone = (record.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('966') ? cleanPhone : (cleanPhone.startsWith('0') ? '966' + cleanPhone.slice(1) : '966' + cleanPhone);

    const msg = `⭐✨ DR.FIX | تقييم خدمة الفني الميداني\n\n` +
      `عزيزنا العميل: ${(record.customerName || 'المحترم')}\n` +
      `سعدنا بخدمتك اليوم لسيارة ${record.carModel}.\n` +
      `الفني المكلف: ${record.assignedStaffName || 'فني DR.FIX'}\n\n` +
      `رأيك يهمنا جداً لتطوير خدماتنا:\n` +
      `🔧 جودة العمل وإتقان الصيانة (من 1 إلى 5):\n` +
      `⏱️ الالتزام بالموعد والوصول السريع (من 1 إلى 5):\n` +
      `🤝 أسلوب الفني والتعامل (من 1 إلى 5):\n` +
      `✨ نظافة الموقع والسيارة بعد الإصلاح (من 1 إلى 5):\n\n` +
      `يسعدنا إرسال أي ملاحظات إضافية 🤍`;

    const url = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121418] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto text-white flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-brand-red/25 via-black/40 to-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
              <Star className="w-5 h-5 fill-brand-red" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">تقييم الفني التفصيلي</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                الفني: <strong className="text-white">{record.assignedStaffName || 'فني غير محدد'}</strong> • {record.carModel}
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

        {/* Overall Score Badge */}
        <div className="p-4 bg-brand-red/10 border-b border-brand-red/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-red" />
            <span className="text-xs font-bold text-red-200">المتوسط الإجمالي للتقييم:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black font-mono text-brand-red">{overallAvg}</span>
            <span className="text-xs text-gray-400">/ 5.0</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* 4 Pillars */}
          <div className="space-y-3.5 bg-black/40 p-4 rounded-2xl border border-white/5">
            {/* 1. Work Quality */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-brand-red" />
                <span className="font-semibold text-gray-200 text-xs">1. جودة العمل والإتقان</span>
              </div>
              {renderStars(workQuality, setWorkQuality)}
            </div>

            {/* 2. Punctuality */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-gray-200 text-xs">2. الالتزام بالموعد والوصول</span>
              </div>
              {renderStars(punctuality, setPunctuality)}
            </div>

            {/* 3. Manner */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-gray-200 text-xs">3. أسلوب الفني واللباقة</span>
              </div>
              {renderStars(manner, setManner)}
            </div>

            {/* 4. Cleanliness */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-gray-200 text-xs">4. نظافة الموقع والسيارة بعد الإنجاز</span>
              </div>
              {renderStars(cleanliness, setCleanliness)}
            </div>
          </div>

          {/* Feedback comments */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">ملاحظات وشهادة العميل</label>
            <textarea 
              value={feedbackNotes}
              onChange={e => setFeedbackNotes(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-brand-red/60 resize-none"
              placeholder="مثال: الفني ممتاز جداً وحل المشكلة بسرعة ونظف مكان العمل بدقة."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleShareReviewWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>طلب التقييم من العميل واتساب 📲</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>حفظ التقييم</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
