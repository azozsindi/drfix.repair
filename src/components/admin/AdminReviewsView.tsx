import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Trash2, 
  MessageSquare, 
  CheckCircle2, 
  X, 
  Search, 
  Send, 
  User, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { safeFormatDate } from '../../lib/dateUtils';

interface AdminReviewsViewProps {
  testimonials: any[];
  lang: 'ar' | 'en';
  onReplyToReview: (id: string, replyText: string) => Promise<void>;
  onDeleteReview: (id: string) => Promise<void>;
  onToggleApproval?: (id: string, isApproved: boolean) => Promise<void>;
}

export const AdminReviewsView: React.FC<AdminReviewsViewProps> = ({
  testimonials,
  lang,
  onReplyToReview,
  onDeleteReview,
  onToggleApproval
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredReviews = testimonials.filter((t) => {
    if (filterRating !== 'all' && (t.rating || 5) !== filterRating) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (t.name && t.name.toLowerCase().includes(q)) || 
           (t.comment && t.comment.toLowerCase().includes(q)) ||
           (t.carModel && t.carModel.toLowerCase().includes(q));
  });

  const handleSendReply = async (id: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await onReplyToReview(id, replyText.trim());
      setReplyingReviewId(null);
      setReplyText('');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {lang === 'ar' ? 'التقييمات وآراء العملاء' : 'Customer Reviews & Ratings'}
            </h2>
          </div>
          <p className="text-xs text-[#A1A6B2] mt-1">
            {lang === 'ar' 
              ? `مراجعة تقييمات عملاء DR.FIX والرد عليها رسمياً (${testimonials.length} تقييم)`
              : `Monitor customer feedback, ratings, and publish official responses (${testimonials.length} reviews)`}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 rtl:right-3 rtl:left-auto left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث بالاسم أو التعليق...' : 'Search feedback...'}
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#090A0C] border border-white/[0.08] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F52B35]/50"
            />
          </div>

          {/* Star Filter */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="py-2 px-3 rounded-xl bg-[#090A0C] border border-white/[0.08] text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">{lang === 'ar' ? 'جميع النجوم' : 'All Stars'}</option>
            <option value="5">⭐⭐⭐⭐⭐ (5)</option>
            <option value="4">⭐⭐⭐⭐ (4)</option>
            <option value="3">⭐⭐⭐ (3)</option>
            <option value="2">⭐⭐ (2)</option>
            <option value="1">⭐ (1)</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#141720] border border-white/[0.06] hover:border-white/15 transition-all space-y-4 shadow-sm"
            >
              {/* Customer Info & Stars */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center font-bold text-white text-sm">
                    {review.name ? review.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">
                      {review.name || (lang === 'ar' ? 'عميل DR.FIX' : 'DR.FIX Customer')}
                    </h4>
                    <div className="text-[11px] text-[#A1A6B2] flex items-center gap-2">
                      <span>{review.carModel || 'سيارة'}</span>
                      <span>•</span>
                      <span>{safeFormatDate(review.createdAt, 'ar-SA')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Star Rating */}
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3.5 h-3.5",
                          i < (review.rating || 5) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                        )}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(review.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'حذف التقييم' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Review Text */}
              <div className="p-3.5 rounded-xl bg-[#090A0C]/60 border border-white/[0.04] text-xs sm:text-sm text-gray-200 leading-relaxed italic">
                "{review.comment}"
              </div>

              {/* Official Reply Section */}
              {review.reply ? (
                <div className="p-3 rounded-xl bg-[#F52B35]/10 border border-[#F52B35]/20 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#FF414A] font-bold">
                    <span>{lang === 'ar' ? 'رد إدارة DR.FIX الرسمي:' : 'DR.FIX Official Response:'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(review.id);
                        setReplyText(review.reply);
                      }}
                      className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      {lang === 'ar' ? 'تعديل الرد' : 'Edit'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {review.reply}
                  </p>
                </div>
              ) : replyingReviewId === review.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب رد المركز الرسمي على العميل...' : 'Write an official response...'}
                    className="w-full p-2.5 rounded-xl bg-[#090A0C] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F52B35]/50 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyingReviewId(null)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingReply || !replyText.trim()}
                      onClick={() => handleSendReply(review.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#F52B35] hover:bg-[#FF414A] disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReply ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'نشر الرد' : 'Publish Reply')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingReviewId(review.id);
                      setReplyText('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#F52B35]" />
                    <span>{lang === 'ar' ? 'الرد على التقييم' : 'Reply to review'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl bg-[#141720] border border-dashed border-white/10 p-6 space-y-3">
            <Star className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'لا توجد تقييمات مطابقة' : 'No matching reviews'}
            </h4>
            <p className="text-xs text-[#A1A6B2] max-w-sm mx-auto">
              {lang === 'ar' ? 'التقييمات التي يرسلها العملاء بعد إنجاز الخدمة تظهر هنا' : 'Customer feedback submitted after service completion will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تأكيد حذف التقييم' : 'Confirm Review Deletion'}
            </h4>
            <p className="text-xs text-[#A1A6B2] leading-relaxed">
              {lang === 'ar' 
                ? 'هل أنت متأكد من حذف هذا التقييم نهائياً من النظام؟'
                : 'Are you sure you want to permanently delete this customer review?'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeleteReview(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
