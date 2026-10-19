import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Calendar, 
  Percent, 
  AlertTriangle,
  Sparkles,
  Flame
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminOffersViewProps {
  offers: any[];
  lang: 'ar' | 'en';
  onAddOffer: () => void;
  onEditOffer: (offer: any) => void;
  onDeleteOffer: (id: string) => void;
  onDeleteAllOffers: () => void;
}

export const AdminOffersView: React.FC<AdminOffersViewProps> = ({
  offers,
  lang,
  onAddOffer,
  onEditOffer,
  onDeleteOffer,
  onDeleteAllOffers
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

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
            <Tag className="w-5 h-5 text-[#F52B35]" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {lang === 'ar' ? 'إدارة العروض والباقات الخاصة' : 'Offers & Promotions'}
            </h2>
          </div>
          <p className="text-xs text-[#A1A6B2] mt-1">
            {lang === 'ar' 
              ? `إدارة باقات وخصومات DR.FIX الحصرية المعروضة على الموقع (${offers.length} عرض نشط)`
              : `Configure special promotional packages shown to clients (${offers.length} active)`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {offers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              {lang === 'ar' ? 'حذف جميع العروض' : 'Delete All'}
            </button>
          )}

          <button
            type="button"
            onClick={onAddOffer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all shadow-lg shadow-[#F52B35]/25 hover:shadow-xl hover:shadow-[#F52B35]/35 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة عرض جديد' : 'New Offer'}</span>
          </button>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {offers.length > 0 ? (
          offers.map((offer) => {
            const features = Array.isArray(offer.features)
              ? offer.features
              : (typeof offer.features === 'string' ? offer.features.split('\n').filter(Boolean) : []);

            return (
              <div
                key={offer.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#141720] border border-white/[0.06] hover:border-[#F52B35]/30 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-lg relative overflow-hidden group"
              >
                {/* Accent Tag */}
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#F52B35] to-amber-500" />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5 text-[#F52B35]" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditOffer(offer)}
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-gray-300 hover:text-white transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تعديل العرض' : 'Edit Offer'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(offer.id)}
                        className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'حذف العرض' : 'Delete Offer'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-base sm:text-lg mb-1 group-hover:text-[#FF414A] transition-colors">
                    {offer.title}
                  </h3>
                  {offer.subtitle && (
                    <p className="text-xs text-[#A1A6B2] mb-3">{offer.subtitle}</p>
                  )}

                  <div className="my-3 py-2 px-3 rounded-xl bg-[#090A0C] border border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-[#A1A6B2]">{lang === 'ar' ? 'سعر الباقة:' : 'Package Price:'}</span>
                    <span className="font-display font-black text-lg text-[#FF414A]">
                      {offer.price} {lang === 'ar' ? 'ريال' : 'SAR'}
                    </span>
                  </div>

                  {features.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      {features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#A1A6B2]">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{offer.validUntil || (lang === 'ar' ? 'عرض مستمر' : 'Ongoing')}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {lang === 'ar' ? 'مفعل على الموقع' : 'Active'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl bg-[#141720] border border-dashed border-white/10 p-6 space-y-3">
            <Tag className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'لا توجد عروض خاصة نشطة حالياً' : 'No active promotions'}
            </h4>
            <p className="text-xs text-[#A1A6B2] max-w-sm mx-auto">
              {lang === 'ar' ? 'أضف باقات صيانة موسمية أو خصومات لجذب المزيد من الحجوزات' : 'Create promotional offers and discounts to boost bookings'}
            </p>
            <button
              type="button"
              onClick={onAddOffer}
              className="px-4 py-2 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إنشاء أول عرض' : 'Create First Offer'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Single Offer Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تأكيد حذف العرض' : 'Confirm Offer Deletion'}
            </h4>
            <p className="text-xs text-[#A1A6B2] leading-relaxed">
              {lang === 'ar' 
                ? 'هل أنت متأكد من حذف هذا العرض؟ سيتم إزالته من قسم العروض في الصفحة الرئيسية.'
                : 'Are you sure you want to delete this offer? It will be removed from the public website.'}
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
                onClick={() => {
                  onDeleteOffer(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                {lang === 'ar' ? 'حذف العرض' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Offers Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تأكيد حذف جميع العروض' : 'Delete All Offers'}
            </h4>
            <p className="text-xs text-[#A1A6B2] leading-relaxed">
              {lang === 'ar' 
                ? 'تحذير: سيتم حذف جميع باقات العروض المسجلة دفعة واحدة. هذا الإجراء لا يمكن التراجع عنه.'
                : 'Warning: This will permanently delete all existing promotional packages.'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAllOffers();
                  setShowDeleteAllConfirm(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                {lang === 'ar' ? 'حذف الكل' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
