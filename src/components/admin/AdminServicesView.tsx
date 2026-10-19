import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Wrench, 
  FileText, 
  Check, 
  X, 
  DollarSign, 
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminServicesViewProps {
  services: any[];
  lang: 'ar' | 'en';
  onAddService: () => void;
  onEditService: (service: any) => void;
  onDeleteService: (id: string) => void;
}

export const AdminServicesView: React.FC<AdminServicesViewProps> = ({
  services,
  lang,
  onAddService,
  onEditService,
  onDeleteService
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.title && s.title.toLowerCase().includes(q)) || 
           (s.description && s.description.toLowerCase().includes(q));
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#F52B35]" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {lang === 'ar' ? 'إدارة كتالوج الخدمات' : 'Services Management'}
            </h2>
          </div>
          <p className="text-xs text-[#A1A6B2] mt-1">
            {lang === 'ar' 
              ? `إدارة باقات وخدمات الصيانة المعروضة لعملاء DR.FIX (${services.length} خدمة مسجلة)`
              : `Configure mechanic packages and services displayed to clients (${services.length} total)`}
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
              placeholder={lang === 'ar' ? 'بحث في الخدمات...' : 'Search services...'}
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#090A0C] border border-white/[0.08] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F52B35]/50"
            />
          </div>

          <button
            type="button"
            onClick={onAddService}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all shadow-lg shadow-[#F52B35]/25 hover:shadow-xl hover:shadow-[#F52B35]/35 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة خدمة جديدة' : 'Add Service'}</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <div
              key={service.id}
              className="p-5 rounded-2xl bg-[#141720] border border-white/[0.06] hover:border-[#F52B35]/30 transition-all duration-200 group flex flex-col justify-between shadow-sm hover:shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F52B35]/15 text-[#F52B35] flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditService(service)}
                      className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'تعديل الخدمة' : 'Edit Service'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(service.id)}
                      className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'حذف الخدمة' : 'Delete Service'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-white text-base mb-1.5 group-hover:text-[#FF414A] transition-colors">
                  {service.title}
                </h3>
                <p className="text-xs text-[#A1A6B2] line-clamp-3 leading-relaxed">
                  {service.description || (lang === 'ar' ? 'خدمة صيانة وإصلاح متنقلة متكاملة من دكتور فيكس' : 'Professional on-site mechanic service')}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                {service.price ? (
                  <span className="font-display font-black text-[#FF414A] text-sm">
                    {service.price} {lang === 'ar' ? 'ريال' : 'SAR'}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400 italic">
                    {lang === 'ar' ? 'السعر يحدد بعد الفحص' : 'Price on inspection'}
                  </span>
                )}

                <span className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{service.duration || (lang === 'ar' ? 'فوري عند الموقع' : 'Instant on-site')}</span>
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl bg-[#141720] border border-dashed border-white/10 p-6 space-y-3">
            <Wrench className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'لا توجد خدمات مطابقة' : 'No matching services'}
            </h4>
            <p className="text-xs text-[#A1A6B2] max-w-sm mx-auto">
              {lang === 'ar' ? 'يمكنك إضافة خدمات صيانة جديدة لعرضها على موقع DR.FIX' : 'Add new services to make them available on the booking page'}
            </p>
            <button
              type="button"
              onClick={onAddService}
              className="px-4 py-2 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة خدمة جديدة الآن' : 'Add Service Now'}</span>
            </button>
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
              {lang === 'ar' ? 'تأكيد حذف الخدمة' : 'Confirm Service Deletion'}
            </h4>
            <p className="text-xs text-[#A1A6B2] leading-relaxed">
              {lang === 'ar' 
                ? 'هل أنت متأكد من حذف هذه الخدمة؟ لن تظهر للعملاء في الصفحة الرئيسية.'
                : 'Are you sure you want to delete this service? It will be removed from the public website.'}
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
                  onDeleteService(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                {lang === 'ar' ? 'نعم، حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
